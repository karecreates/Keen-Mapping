#!/usr/bin/env node
/**
 * Build-time Excel → JSON preparation for state ZIP choropleth maps.
 * Never recalculates Columns H–K; uses stored cell values only.
 *
 * Usage:
 *   node scripts/prepare-map-data.mjs            # all states
 *   node scripts/prepare-map-data.mjs --state=CA
 *   node scripts/prepare-map-data.mjs CO OR
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import { STATES, parseStateArgs } from "./state-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

function findWorkbook(state) {
  const dirs = [DATA_DIR, ROOT, path.join(ROOT, "src", "data")];
  for (const dir of dirs) {
    for (const name of state.workbooks) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function toZip(value) {
  if (value === null || value === undefined || value === "") return null;
  const asString = String(value).trim();
  if (!asString) return null;
  const numeric = Number(asString);
  if (!Number.isNaN(numeric) && Number.isFinite(numeric) && !asString.includes("-")) {
    return String(Math.trunc(numeric)).padStart(5, "0");
  }
  return asString.padStart(5, "0");
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = String(value).replace(/[$,%\s,]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Trim Excel header keys so trailing-space / typo variants resolve cleanly. */
function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[String(key).trim()] = value;
  }
  return out;
}

function firstNumber(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return toNumber(row[key]);
    }
  }
  return null;
}

function missingByField(rows) {
  const fields = [
    "state",
    "zip",
    "city",
    "population",
    "customers",
    "units",
    "spend",
    "coSpendShare",
    "localPenetration",
    "top10Penetration",
    "statePenetration",
  ];
  const result = {};
  for (const field of fields) {
    result[field] = rows.filter(
      (r) => r[field] === null || r[field] === undefined || r[field] === ""
    ).length;
  }
  return result;
}

function findDuplicates(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!row.zip) continue;
    if (!seen.has(row.zip)) seen.set(row.zip, []);
    seen.get(row.zip).push(row.sourceRow);
  }
  const duplicates = [];
  for (const [zip, sourceRows] of seen) {
    if (sourceRows.length > 1) duplicates.push({ zip, sourceRows });
  }
  return duplicates;
}

function resolveSheet(workbook, candidates, label) {
  for (const name of candidates) {
    if (workbook.Sheets[name]) return { name, sheet: workbook.Sheets[name] };
  }
  throw new Error(
    `Worksheet for ${label} not found. Tried: ${candidates.map((n) => JSON.stringify(n)).join(", ")}`
  );
}

function parseSheet(worksheet, columnMap, state) {
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    range: 3,
    raw: true,
    defval: null,
  });

  const records = [];
  let missingZips = 0;
  const code = state.code;

  for (let i = 0; i < rawRows.length; i++) {
    const row = normalizeRow(rawRows[i]);
    const sourceRow = i + 5;

    if (String(row.State ?? "").trim().toUpperCase() !== code) continue;

    const zip = toZip(row.ZIP);
    if (!zip) missingZips += 1;

    records.push({
      state: code,
      zip,
      city:
        row["City or Metropolitan Area"] == null
          ? null
          : String(row["City or Metropolitan Area"]).trim(),
      population: toNumber(row.Population),
      customers: toNumber(row[columnMap.customers]),
      units: toNumber(row[columnMap.units]),
      spend: toNumber(row[columnMap.spend]),
      // Preserve supplied G–K values — never recalculate
      coSpendShare: firstNumber(row, state.spendShareKeys),
      localPenetration: firstNumber(row, [
        "Local Penetration",
        "Local Pentration",
      ]),
      top10Penetration: firstNumber(row, ["Top 10 Penetration"]),
      statePenetration: firstNumber(row, [
        "State Penetration",
        "State Pentration",
      ]),
      sourceRow,
      product: columnMap.product,
    });
  }

  return { records, missingZips };
}

function summarize(label, records, missingZips, state) {
  const zeroSpend = records.filter((r) => r.spend === 0).length;
  const nonzeroSpend = records.filter((r) => r.spend !== null && r.spend !== 0).length;
  const duplicates = findDuplicates(records);
  const missing = missingByField(records);
  const spendShareSum = records.reduce((sum, r) => sum + (r.coSpendShare ?? 0), 0);

  if (Math.abs(spendShareSum - 1) > 0.02) {
    console.warn(
      `[warn] ${label}: sum of supplied % of Total ${state.code} Spend is ${spendShareSum.toFixed(6)} (expected ~1.0). ` +
        `Source-data observation only — values are NOT normalized.`
    );
  }

  if (records.length !== state.expectedCount) {
    console.warn(
      `[warn] ${label}: expected ~${state.expectedCount} ${state.name} records, got ${records.length}.`
    );
  }

  console.log(`\n=== ${state.code} · ${label} ===`);
  console.log(`${state.name} records: ${records.length}`);
  console.log(`Zero-spend ZIPs: ${zeroSpend}`);
  console.log(`Nonzero-spend ZIPs: ${nonzeroSpend}`);
  console.log(`Missing ZIP values: ${missingZips}`);
  console.log(`Duplicate ZIP values: ${duplicates.length}`);
  if (duplicates.length) {
    for (const d of duplicates) {
      console.error(`  ZIP ${d.zip} appears in Excel rows: ${d.sourceRows.join(", ")}`);
    }
  }
  console.log(`Sum of % of Total ${state.code} Spend: ${spendShareSum.toFixed(6)}`);

  return { zeroSpend, nonzeroSpend, duplicates, missing, spendShareSum };
}

function prepareState(code) {
  const state = STATES[code];
  const outDir = path.join(DATA_DIR, state.slug);
  fs.mkdirSync(outDir, { recursive: true });

  const workbookPath = findWorkbook(state);
  if (!workbookPath) {
    console.error(
      `ERROR: ${state.name} Excel workbook not found.\n` +
        `Looked for: ${state.workbooks.join(", ")}\n` +
        `in public/data/, project root, or src/data/.`
    );
    process.exit(1);
  }

  console.log(`\n######## ${state.name} (${state.code}) ########`);
  console.log(`Reading workbook: ${workbookPath}`);

  const canonical = path.join(DATA_DIR, state.workbooks[0]);
  if (path.resolve(workbookPath) !== path.resolve(canonical)) {
    fs.copyFileSync(workbookPath, canonical);
    console.log(`Copied workbook to: ${canonical}`);
  }

  const workbook = XLSX.readFile(workbookPath, {
    cellFormula: false,
    cellHTML: false,
    raw: true,
  });

  const outdoorSheet = resolveSheet(workbook, state.outdoorSheets, "Outdoor");
  const utilitySheet = resolveSheet(workbook, state.utilitySheets, "Utility");
  console.log(`Outdoor sheet: "${outdoorSheet.name}"`);
  console.log(`Utility sheet: "${utilitySheet.name}"`);

  const outdoorParsed = parseSheet(
    outdoorSheet.sheet,
    {
      customers: "FanGroup1Fans",
      units: "FanGroup1Units",
      spend: "FanGroup1Dollars",
      product: "outdoor",
    },
    state
  );

  const utilityParsed = parseSheet(
    utilitySheet.sheet,
    {
      customers: "FanGroup2Fans",
      units: "FanGroup2Units",
      spend: "FanGroup2Dollars",
      product: "utility",
    },
    state
  );

  const outdoorSummary = summarize(
    "Outdoor / Performance",
    outdoorParsed.records,
    outdoorParsed.missingZips,
    state
  );
  const utilitySummary = summarize(
    "Utility",
    utilityParsed.records,
    utilityParsed.missingZips,
    state
  );

  if (outdoorSummary.duplicates.length || utilitySummary.duplicates.length) {
    console.error(`\nFATAL: Duplicate ${state.name} ZIPs detected. Stopping.`);
    process.exit(1);
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    state: state.code,
    stateName: state.name,
    sourceWorkbook: path.basename(workbookPath),
    note: "Columns H–K are preserved as supplied. No recalculation was performed.",
  };

  const outdoorOut = path.join(outDir, "outdoor.json");
  const utilityOut = path.join(outDir, "utility.json");

  fs.writeFileSync(
    outdoorOut,
    JSON.stringify(
      {
        product: "outdoor",
        label: "Outdoor / Performance",
        meta,
        diagnostics: {
          stateRecords: outdoorParsed.records.length,
          coloradoRecords: outdoorParsed.records.length,
          zeroSpend: outdoorSummary.zeroSpend,
          nonzeroSpend: outdoorSummary.nonzeroSpend,
          missingZips: outdoorParsed.missingZips,
          missingByField: outdoorSummary.missing,
          coSpendShareSum: outdoorSummary.spendShareSum,
        },
        records: outdoorParsed.records,
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    utilityOut,
    JSON.stringify(
      {
        product: "utility",
        label: "Utility",
        meta,
        diagnostics: {
          stateRecords: utilityParsed.records.length,
          coloradoRecords: utilityParsed.records.length,
          zeroSpend: utilitySummary.zeroSpend,
          nonzeroSpend: utilitySummary.nonzeroSpend,
          missingZips: utilityParsed.missingZips,
          missingByField: utilitySummary.missing,
          coSpendShareSum: utilitySummary.spendShareSum,
        },
        records: utilityParsed.records,
      },
      null,
      2
    )
  );

  console.log(`Wrote ${outdoorOut}`);
  console.log(`Wrote ${utilityOut}`);
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const { codes } = parseStateArgs();
  for (const code of codes) {
    prepareState(code);
  }
}

main();
