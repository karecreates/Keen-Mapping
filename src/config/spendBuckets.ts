import type { ProductKey } from "../types/mapData";
import { GREEN_SEQUENCE, NO_DATA_COLOR } from "./colors";

export interface SpendBucket {
  label: string;
  /** Return true if value belongs in this positive bucket */
  test: (value: number) => boolean;
  color: string;
}

/** Outdoor / Performance spend thresholds (exact spec). */
export const OUTDOOR_SPEND_BUCKETS: SpendBucket[] = [
  { label: "$1–$999", test: (v) => v > 0 && v < 1000, color: GREEN_SEQUENCE[0] },
  { label: "$1,000–$2,499", test: (v) => v >= 1000 && v < 2500, color: GREEN_SEQUENCE[1] },
  { label: "$2,500–$4,999", test: (v) => v >= 2500 && v < 5000, color: GREEN_SEQUENCE[2] },
  { label: "$5,000–$7,999", test: (v) => v >= 5000 && v < 8000, color: GREEN_SEQUENCE[3] },
  { label: "$8,000–$11,999", test: (v) => v >= 8000 && v < 12000, color: GREEN_SEQUENCE[4] },
  { label: "$12,000–$14,999", test: (v) => v >= 12000 && v < 15000, color: GREEN_SEQUENCE[5] },
  { label: "$15,000+", test: (v) => v >= 15000, color: GREEN_SEQUENCE[6] },
];

/** Utility spend thresholds — lower scale, separate from Outdoor. */
export const UTILITY_SPEND_BUCKETS: SpendBucket[] = [
  { label: "$1–$499", test: (v) => v > 0 && v < 500, color: GREEN_SEQUENCE[0] },
  { label: "$500–$999", test: (v) => v >= 500 && v < 1000, color: GREEN_SEQUENCE[1] },
  { label: "$1,000–$1,999", test: (v) => v >= 1000 && v < 2000, color: GREEN_SEQUENCE[2] },
  { label: "$2,000–$2,999", test: (v) => v >= 2000 && v < 3000, color: GREEN_SEQUENCE[3] },
  { label: "$3,000–$3,999", test: (v) => v >= 3000 && v < 4000, color: GREEN_SEQUENCE[4] },
  { label: "$4,000–$4,999", test: (v) => v >= 4000 && v < 5000, color: GREEN_SEQUENCE[5] },
  { label: "$5,000+", test: (v) => v >= 5000, color: GREEN_SEQUENCE[6] },
];

export function getSpendBuckets(product: ProductKey): SpendBucket[] {
  return product === "outdoor" ? OUTDOOR_SPEND_BUCKETS : UTILITY_SPEND_BUCKETS;
}

export function colorForSpend(value: number | null | undefined, product: ProductKey): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return NO_DATA_COLOR;
  }
  if (value === 0) return NO_DATA_COLOR;
  const buckets = getSpendBuckets(product);
  for (const bucket of buckets) {
    if (bucket.test(value)) return bucket.color;
  }
  return NO_DATA_COLOR;
}
