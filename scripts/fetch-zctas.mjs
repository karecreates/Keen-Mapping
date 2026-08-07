#!/usr/bin/env node
/**
 * Fetch ZCTA polygons from U.S. Census TIGERweb for ZIPs in each state's
 * outdoor.json / utility.json. Caches GeoJSON locally — not fetched at runtime.
 *
 * Usage:
 *   node scripts/fetch-zctas.mjs                 # all states
 *   node scripts/fetch-zctas.mjs --state=CA
 *   node scripts/fetch-zctas.mjs --state=CA --force
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STATES, parseStateArgs } from "./state-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const TIGER_ENDPOINT =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/4/query";

const BATCH_SIZE = 80;
/** Degrees (~100m) — keeps choropleth readable while shrinking GeoJSON for GitHub. */
const MAX_ALLOWABLE_OFFSET = 0.001;

function loadZipSet(stateDir) {
  const outdoorPath = path.join(stateDir, "outdoor.json");
  const utilityPath = path.join(stateDir, "utility.json");

  if (!fs.existsSync(outdoorPath) || !fs.existsSync(utilityPath)) {
    console.error(
      `ERROR: ${outdoorPath} / utility.json missing. Run \`npm run prepare-data\` first.`
    );
    process.exit(1);
  }

  const outdoor = JSON.parse(fs.readFileSync(outdoorPath, "utf8"));
  const utility = JSON.parse(fs.readFileSync(utilityPath, "utf8"));

  const zips = new Set();
  for (const r of outdoor.records) {
    if (r.zip) zips.add(String(r.zip).padStart(5, "0"));
  }
  for (const r of utility.records) {
    if (r.zip) zips.add(String(r.zip).padStart(5, "0"));
  }
  return [...zips].sort();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Round coordinates to ~1.1m precision to shrink payload further. */
function quantizeCoords(coords) {
  if (typeof coords[0] === "number") {
    return [Math.round(coords[0] * 1e5) / 1e5, Math.round(coords[1] * 1e5) / 1e5];
  }
  return coords.map(quantizeCoords);
}

function simplifyFeature(feature) {
  if (!feature.geometry) return feature;
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: quantizeCoords(feature.geometry.coordinates),
    },
  };
}

async function fetchBatch(zips) {
  const quoted = zips.map((z) => `'${z}'`).join(",");
  const where = `ZCTA5 IN (${quoted})`;

  const params = new URLSearchParams({
    where,
    outFields: "ZCTA5,GEOID,NAME",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    maxAllowableOffset: String(MAX_ALLOWABLE_OFFSET),
  });

  const url = `${TIGER_ENDPOINT}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TIGERweb request failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(`TIGERweb error: ${JSON.stringify(json.error)}`);
  }
  return json.features ?? [];
}

async function fetchState(code, force) {
  const state = STATES[code];
  const stateDir = path.join(DATA_DIR, state.slug);
  const geojsonPath = path.join(stateDir, "zctas.geojson");
  const diagnosticsPath = path.join(stateDir, "geometry-diagnostics.json");

  fs.mkdirSync(stateDir, { recursive: true });

  if (fs.existsSync(geojsonPath) && !force) {
    const existing = JSON.parse(fs.readFileSync(geojsonPath, "utf8"));
    const count = existing.features?.length ?? 0;
    if (count > 0) {
      console.log(
        `[${code}] Cached GeoJSON exists at ${geojsonPath} (${count} features). Pass --force to refresh.`
      );
      if (fs.existsSync(diagnosticsPath)) return;
      console.log(`[${code}] Diagnostics missing — regenerating from cache…`);
    }
  }

  const zips = loadZipSet(stateDir);
  console.log(`\n######## ${state.name} (${state.code}) ########`);
  console.log(`Unique spreadsheet ZIPs: ${zips.length}`);

  let features = [];

  if (force || !fs.existsSync(geojsonPath)) {
    const batches = chunk(zips, BATCH_SIZE);
    console.log(`Fetching geometry in ${batches.length} batches of ~${BATCH_SIZE}…`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} ZIPs)… `);
      try {
        const batchFeatures = await fetchBatch(batch);
        console.log(`got ${batchFeatures.length} features`);
        features.push(...batchFeatures);
      } catch (err) {
        console.error("\nERROR fetching Census geometry:", err.message);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    for (const feature of features) {
      const props = feature.properties ?? {};
      const zip = String(props.ZCTA5 ?? props.GEOID ?? props.NAME ?? "")
        .trim()
        .padStart(5, "0");
      feature.properties = { ...props, zip };
    }

    const byZip = new Map();
    for (const f of features) {
      byZip.set(f.properties.zip, simplifyFeature(f));
    }
    features = [...byZip.values()];

    fs.writeFileSync(
      geojsonPath,
      JSON.stringify({ type: "FeatureCollection", features })
    );
    const mb = (fs.statSync(geojsonPath).size / (1024 * 1024)).toFixed(1);
    console.log(`Wrote ${geojsonPath} (${features.length} features, ${mb} MB)`);
  } else {
    features = JSON.parse(fs.readFileSync(geojsonPath, "utf8")).features ?? [];
  }

  const geometryZips = new Set(features.map((f) => f.properties.zip));
  const spreadsheetZips = new Set(zips);
  const matched = zips.filter((z) => geometryZips.has(z));
  const unmatchedSpreadsheet = zips.filter((z) => !geometryZips.has(z));
  const geometryOnly = [...geometryZips]
    .filter((z) => !spreadsheetZips.has(z))
    .sort();

  const diagnostics = {
    generatedAt: new Date().toISOString(),
    state: state.code,
    spreadsheetZipCount: zips.length,
    geometryZipCount: geometryZips.size,
    matchedZipCount: matched.length,
    unmatchedSpreadsheetZips: unmatchedSpreadsheet,
    geometryZipsWithoutSpreadsheetData: geometryOnly,
    note:
      "Some postal ZIP codes may not have a matching Census ZCTA polygon. No polygons were invented for unmatched ZIPs.",
  };

  fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnostics, null, 2));
  console.log(`Wrote ${diagnosticsPath}`);
  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched spreadsheet ZIPs: ${unmatchedSpreadsheet.length}`);
  if (unmatchedSpreadsheet.length) {
    console.log(`  ${unmatchedSpreadsheet.join(", ")}`);
  }
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const { codes, force } = parseStateArgs();
  for (const code of codes) {
    await fetchState(code, force);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
