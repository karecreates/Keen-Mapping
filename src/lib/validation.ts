import type { GeometryDiagnostics, ProductDataset } from "../types/mapData";

export function validateDataset(dataset: ProductDataset): string[] {
  const warnings: string[] = [];
  const { diagnostics } = dataset;

  if (Math.abs(diagnostics.coSpendShareSum - 1) > 0.02) {
    warnings.push(
      `${dataset.label}: sum of supplied % of Total CO Spend is ${diagnostics.coSpendShareSum.toFixed(6)} (expected ~1.0). Values were not normalized.`
    );
  }

  return warnings;
}

export function summarizeGeometryStatus(
  diagnostics: GeometryDiagnostics | null
): { matched: number; unmatched: number; message: string } {
  if (!diagnostics) {
    return {
      matched: 0,
      unmatched: 0,
      message: "Geometry diagnostics unavailable",
    };
  }
  return {
    matched: diagnostics.matchedZipCount,
    unmatched: diagnostics.unmatchedSpreadsheetZips.length,
    message: `${diagnostics.matchedZipCount} ZIPs mapped · ${diagnostics.unmatchedSpreadsheetZips.length} unmatched`,
  };
}
