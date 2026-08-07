import type { GeometryDiagnostics, ProductDataset } from "../types/mapData";
import type { StateKey } from "../config/states";
import { STATES } from "../config/states";

export function validateDataset(
  dataset: ProductDataset,
  stateKey: StateKey = "CO"
): string[] {
  const warnings: string[] = [];
  const { diagnostics } = dataset;
  const spendLabel = STATES[stateKey].spendShareLabel;

  if (Math.abs(diagnostics.coSpendShareSum - 1) > 0.02) {
    warnings.push(
      `${dataset.label}: sum of supplied ${spendLabel} is ${diagnostics.coSpendShareSum.toFixed(6)} (expected ~1.0). Values were not normalized.`
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
