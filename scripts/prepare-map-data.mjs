#!/usr/bin/env node
/**
 * Build-time Excel → JSON preparation for Colorado ZIP choropleth maps.
 * Never recalculates Columns H–K; uses stored cell values only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const WORKBOOK_CANDIDATES = [
  path.join(DATA_DIR, "Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx"),
  path.join(DATA_DIR, "Colorado Filtered - KOL Geographic Insights (2025).xlsx"),
  path.join(ROOT, "Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx"),
  path.join(ROOT, "Colorado Filtered - KOL Geographic Insights (2025).xlsx"),
  path.join(ROOT, "src", "data", "Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx"),
  path.join(ROOT, "src", "data", "Colorado Filtered - KOL Geographic Insights (2025).xlsx"),
];

const EXPECTED_CO_COUNT = 527;

function findWorkbook() {
  for (const candidate of WORKBOOK_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function toZip(value) {
  if (value === null || value === undefined || value === "") return null;
  const asString = String(value).trim();
  if (!asString) return null;
  // Handle numeric Excel ZIPs (e.g. 8051 → "08051" is wrong for CO; pad to 5)
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
    result[field] = rows.filter((r) => r[field] === null || r[field] === undefined || r[field] === "").length;
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
    if (sourceRows.length > 1) {
      duplicates.push({ zip, sourceRows });
    }
  }
  return duplicates;
}

/**
 * @param {XLSX.WorkSheet} worksheet
 * @param {{ customers: string, units: string, spend: string, product: string }} columnMap
 */
function parseSheet(worksheet, columnMap) {
  // range: 3 → header is Excel row 4 (0-based index 3)
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    range: 3,
    raw: true,
    defval: null,
  });

  const records = [];
  let missingZips = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Excel row number: header is row 4, first data is row 5 → index 0 → row 5
    const sourceRow = i + 5;

    if (String(row.State ?? "").trim().toUpperCase() !== "CO") {
      continue;
    }

    const zip = toZip(row.ZIP);
    if (!zip) missingZips += 1;

    records.push({
      state: String(row.State ?? "").trim().toUpperCase(),
      zip,
      city: row["City or Metropolitan Area"] == null ? null : String(row["City or Metropolitan Area"]).trim(),
      population: toNumber(row.Population),
      customers: toNumber(row[columnMap.customers]),
      units: toNumber(row[columnMap.units]),
      spend: toNumber(row[columnMap.spend]),
      // Preserve supplied G–K values exactly — never recalculate
      coSpendShare: toNumber(row["% of Total CO Spend"]),
      localPenetration: toNumber(row["Local Penetration"]),
      top10Penetration: toNumber(row["Top 10 Penetration"]),
      statePenetration: toNumber(row["State Penetration"]),
      sourceRow,
      product: columnMap.product,
    });
  }

  return { records, missingZips };
}

function summarize(label, records, missingZips) {
  const zeroSpend = records.filter((r) => r.spend === 0).length;
  const nonzeroSpend = records.filter((r) => r.spend !== null && r.spend !== 0).length;
  const duplicates = findDuplicates(records);
  const missing = missingByField(records);

  const coSpendSum = records.reduce((sum, r) => sum + (r.coSpendShare ?? 0), 0);
  if (Math.abs(coSpendSum - 1) > 0.02) {
    console.warn(
      `[warn] ${label}: sum of supplied % of Total CO Spend is ${coSpendSum.toFixed(6)} (expected ~1.0). ` +
        `This is a source-data observation only — values are NOT normalized.`
    );
  }

  if (records.length !== EXPECTED_CO_COUNT) {
    console.warn(
      `[warn] ${label}: expected ~${EXPECTED_CO_COUNT} Colorado records, got ${records.length}.`
    );
  }

  console.log(`\n=== ${label} ===`);
  console.log(`Colorado records: ${records.length}`);
  console.log(`Zero-spend ZIPs: ${zeroSpend}`);
  console.log(`Nonzero-spend ZIPs: ${nonzeroSpend}`);
  console.log(`Missing ZIP values: ${missingZips}`);
  console.log(`Duplicate ZIP values: ${duplicates.length}`);
  if (duplicates.length) {
    console.error("Duplicate ZIP report:");
    for (const d of duplicates) {
      console.error(`  ZIP ${d.zip} appears in Excel rows: ${d.sourceRows.join(", ")}`);
    }
  }
  console.log("Missing values by field:", JSON.stringify(missing, null, 2));
  console.log(`Sum of % of Total CO Spend: ${coSpendSum.toFixed(6)}`);

  return { zeroSpend, nonzeroSpend, duplicates, missing, coSpendSum };
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const workbookPath = findWorkbook();
  if (!workbookPath) {
    console.error(
      "ERROR: Excel workbook not found.\n" +
        "Place the file at one of:\n" +
        WORKBOOK_CANDIDATES.map((p) => `  - ${p}`).join("\n")
    );
    process.exit(1);
  }

  console.log(`Reading workbook: ${workbookPath}`);

  // Prefer storing under the canonical public/data path
  const canonical = path.join(
    DATA_DIR,
    "Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx"
  );
  if (path.resolve(workbookPath) !== path.resolve(canonical)) {
    fs.copyFileSync(workbookPath, canonical);
    console.log(`Copied workbook to: ${canonical}`);
  }

  const workbook = XLSX.readFile(workbookPath, {
    cellFormula: false,
    cellHTML: false,
    raw: true,
  });

  if (!workbook.Sheets["data"]) {
    console.error('ERROR: Worksheet "data" (Outdoor / Performance) not found.');
    process.exit(1);
  }
  if (!workbook.Sheets["Utility Data"]) {
    console.error('ERROR: Worksheet "Utility Data" not found.');
    process.exit(1);
  }

  const outdoorParsed = parseSheet(workbook.Sheets["data"], {
    customers: "FanGroup1Fans",
    units: "FanGroup1Units",
    spend: "FanGroup1Dollars",
    product: "outdoor",
  });

  const utilityParsed = parseSheet(workbook.Sheets["Utility Data"], {
    customers: "FanGroup2Fans",
    units: "FanGroup2Units",
    spend: "FanGroup2Dollars",
    product: "utility",
  });

  const outdoorSummary = summarize("Outdoor / Performance", outdoorParsed.records, outdoorParsed.missingZips);
  const utilitySummary = summarize("Utility", utilityParsed.records, utilityParsed.missingZips);

  if (outdoorSummary.duplicates.length > 0 || utilitySummary.duplicates.length > 0) {
    console.error("\nFATAL: Duplicate Colorado ZIPs detected. Stopping preprocessing.");
    process.exit(1);
  }

  const outdoorOut = path.join(DATA_DIR, "outdoor.json");
  const utilityOut = path.join(DATA_DIR, "utility.json");

  const meta = {
    generatedAt: new Date().toISOString(),
    sourceWorkbook: path.basename(workbookPath),
    note: "Columns H–K are preserved as supplied. No recalculation was performed.",
  };

  fs.writeFileSync(
    outdoorOut,
    JSON.stringify(
      {
        product: "outdoor",
        label: "Outdoor / Performance",
        meta,
        diagnostics: {
          coloradoRecords: outdoorParsed.records.length,
          zeroSpend: outdoorSummary.zeroSpend,
          nonzeroSpend: outdoorSummary.nonzeroSpend,
          missingZips: outdoorParsed.missingZips,
          missingByField: outdoorSummary.missing,
          coSpendShareSum: outdoorSummary.coSpendSum,
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
          coloradoRecords: utilityParsed.records.length,
          zeroSpend: utilitySummary.zeroSpend,
          nonzeroSpend: utilitySummary.nonzeroSpend,
          missingZips: utilityParsed.missingZips,
          missingByField: utilitySummary.missing,
          coSpendShareSum: utilitySummary.coSpendSum,
        },
        records: utilityParsed.records,
      },
      null,
      2
    )
  );

  console.log(`\nWrote ${outdoorOut}`);
  console.log(`Wrote ${utilityOut}`);
}

main();
