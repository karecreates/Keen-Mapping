/**
 * Shared state workbook / output configuration for map prep scripts.
 */

export const STATES = {
  CO: {
    code: "CO",
    name: "Colorado",
    slug: "co",
    expectedCount: 527,
    spendShareKeys: ["% of Total CO Spend"],
    outdoorSheets: ["data", "Outdoor"],
    utilitySheets: ["Utility Data", "Utility"],
    workbooks: [
      "Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx",
      "Colorado Filtered - KOL Geographic Insights (2025).xlsx",
    ],
  },
  CA: {
    code: "CA",
    name: "California",
    slug: "ca",
    expectedCount: 1800,
    spendShareKeys: ["% of Total CA Spend"],
    outdoorSheets: ["Outdoor", "data"],
    utilitySheets: ["Utility", "Utility Data"],
    workbooks: [
      "California Filtered - KOL Geographic Insights (2025).xlsx",
      "California Filtered - KOL Geographic Insights (2025)(1).xlsx",
    ],
  },
  OR: {
    code: "OR",
    name: "Oregon",
    slug: "or",
    expectedCount: 427,
    spendShareKeys: ["% of Total OR Spend"],
    outdoorSheets: ["Outdoor", "data"],
    utilitySheets: ["Utility", "Utility Data"],
    workbooks: [
      "Oregon Filtered - KOL Geographic Insights (2025) - NEW.xlsx",
      "Oregon Filtered - KOL Geographic Insights (2025).xlsx",
      "Oregon Filtered - KOL Geographic Insights (2025)(1).xlsx",
    ],
  },
  WA: {
    code: "WA",
    name: "Washington",
    slug: "wa",
    expectedCount: 605,
    spendShareKeys: ["% of Total WA Spend"],
    outdoorSheets: ["Outdoor", "data"],
    utilitySheets: ["Utility", "Utility Data"],
    workbooks: [
      "Washington Filtered - KOL Geographic Insights (2025).xlsx",
      "Washington Filtered - KOL Geographic Insights (2025)(1).xlsx",
    ],
  },
};

export const STATE_CODES = Object.keys(STATES);

export function parseStateArgs(argv = process.argv.slice(2)) {
  const force = argv.includes("--force");
  const all = argv.includes("--all");
  const explicit = [];
  for (const arg of argv) {
    if (arg.startsWith("--state=")) {
      explicit.push(...arg.slice("--state=".length).split(","));
    } else if (arg !== "--force" && arg !== "--all" && !arg.startsWith("-")) {
      explicit.push(arg);
    }
  }
  const codes = (all || explicit.length === 0 ? STATE_CODES : explicit).map((c) =>
    c.trim().toUpperCase()
  );
  for (const code of codes) {
    if (!STATES[code]) {
      throw new Error(`Unknown state "${code}". Use: ${STATE_CODES.join(", ")}`);
    }
  }
  return { codes: [...new Set(codes)], force };
}
