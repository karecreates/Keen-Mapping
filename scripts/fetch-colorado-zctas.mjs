#!/usr/bin/env node
/**
 * Fetch Colorado ZCTA polygons from U.S. Census TIGERweb for ZIPs present
 * in outdoor.json and utility.json. Caches GeoJSON locally — not fetched at runtime.
 *
 * Usage:
 *   node scripts/fetch-colorado-zctas.mjs
 *   node scripts/fetch-colorado-zctas.mjs --force
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const GEOJSON_PATH = path.join(DATA_DIR, "colorado-zctas.geojson");
const DIAGNOSTICS_PATH = path.join(DATA_DIR, "geometry-diagnostics.json");

const TIGER_ENDPOINT =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/4/query";

const BATCH_SIZE = 80;
const FORCE = process.argv.includes("--force");

function loadZipSet() {
  const outdoorPath = path.join(DATA_DIR, "outdoor.json");
  const utilityPath = path.join(DATA_DIR, "utility.json");

  if (!fs.existsSync(outdoorPath) || !fs.existsSync(utilityPath)) {
    console.error(
      "ERROR: outdoor.json / utility.json missing. Run `npm run prepare-data` first."
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
  return { zips: [...zips].sort(), outdoor, utility };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(GEOJSON_PATH) && !FORCE) {
    const existing = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
    const count = existing.features?.length ?? 0;
    if (count > 0) {
      console.log(
        `Cached GeoJSON already exists at ${GEOJSON_PATH} (${count} features).`
      );
      console.log("Pass --force to refresh from Census TIGERweb.");
      if (!fs.existsSync(DIAGNOSTICS_PATH)) {
        console.log("Diagnostics missing — regenerating from cache + spreadsheet…");
      } else {
        return;
      }
    }
  }

  const { zips } = loadZipSet();
  console.log(`Unique spreadsheet ZIPs: ${zips.length}`);

  let features = [];

  if (FORCE || !fs.existsSync(GEOJSON_PATH)) {
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
        console.error(
          "Geometry fetch failed. Application can still start if a previous GeoJSON cache exists."
        );
        process.exit(1);
      }
      // Be polite to the Census service
      await new Promise((r) => setTimeout(r, 200));
    }

    // Normalize join key
    for (const feature of features) {
      const props = feature.properties ?? {};
      const zip = String(props.ZCTA5 ?? props.GEOID ?? props.NAME ?? "")
        .trim()
        .padStart(5, "0");
      feature.properties = {
        ...props,
        zip,
      };
    }

    // Deduplicate by zip if any overlap across batches
    const byZip = new Map();
    for (const f of features) {
      byZip.set(f.properties.zip, f);
    }
    features = [...byZip.values()];

    const collection = {
      type: "FeatureCollection",
      features,
    };

    fs.writeFileSync(GEOJSON_PATH, JSON.stringify(collection));
    console.log(`Wrote ${GEOJSON_PATH} (${features.length} features)`);
  } else {
    features = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8")).features ?? [];
  }

  const geometryZips = new Set(features.map((f) => f.properties.zip));
  const spreadsheetZips = new Set(zips);

  const matched = zips.filter((z) => geometryZips.has(z));
  const unmatchedSpreadsheet = zips.filter((z) => !geometryZips.has(z));
  const geometryOnly = [...geometryZips].filter((z) => !spreadsheetZips.has(z)).sort();

  const diagnostics = {
    generatedAt: new Date().toISOString(),
    spreadsheetZipCount: zips.length,
    geometryZipCount: geometryZips.size,
    matchedZipCount: matched.length,
    unmatchedSpreadsheetZips: unmatchedSpreadsheet,
    geometryZipsWithoutSpreadsheetData: geometryOnly,
    note:
      "Some postal ZIP codes may not have a matching Census ZCTA polygon. No polygons were invented for unmatched ZIPs.",
  };

  fs.writeFileSync(DIAGNOSTICS_PATH, JSON.stringify(diagnostics, null, 2));
  console.log(`Wrote ${DIAGNOSTICS_PATH}`);
  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched spreadsheet ZIPs: ${unmatchedSpreadsheet.length}`);
  if (unmatchedSpreadsheet.length) {
    console.log(`  ${unmatchedSpreadsheet.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
