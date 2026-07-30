export type ProductKey = "outdoor" | "utility";

export type MetricKey =
  | "spend"
  | "coSpendShare"
  | "localPenetration"
  | "top10Penetration"
  | "statePenetration";

export interface ZipRecord {
  state: string;
  zip: string | null;
  city: string | null;
  population: number | null;
  customers: number | null;
  units: number | null;
  spend: number | null;
  coSpendShare: number | null;
  localPenetration: number | null;
  top10Penetration: number | null;
  statePenetration: number | null;
  sourceRow: number;
  product: ProductKey;
}

export interface ProductDataset {
  product: ProductKey;
  label: string;
  meta: {
    generatedAt: string;
    sourceWorkbook: string;
    note: string;
  };
  diagnostics: {
    coloradoRecords: number;
    zeroSpend: number;
    nonzeroSpend: number;
    missingZips: number;
    missingByField: Record<string, number>;
    coSpendShareSum: number;
  };
  records: ZipRecord[];
}

export interface GeometryDiagnostics {
  generatedAt: string;
  spreadsheetZipCount: number;
  geometryZipCount: number;
  matchedZipCount: number;
  unmatchedSpreadsheetZips: string[];
  geometryZipsWithoutSpreadsheetData: string[];
  note: string;
}

export interface LegendBreak {
  color: string;
  label: string;
  /** Inclusive lower bound; null for N/A bucket */
  min: number | null;
  /** Exclusive upper bound (except highest); null for open-ended / N/A */
  max: number | null;
  kind: "zero" | "na" | "range";
}

export interface ClassificationResult {
  breaks: LegendBreak[];
  colorForValue: (value: number | null | undefined) => string;
  legendTitle: string;
  legendNote?: string;
}

export type ClassificationStrategy = "outdoorSpend" | "utilitySpend" | "quantile";
