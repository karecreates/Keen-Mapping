import type {
  ClassificationStrategy,
  MetricKey,
  ProductKey,
} from "../types/mapData";
import {
  formatCurrency,
  formatPercent2,
  formatPercent4,
} from "../lib/formatters";

export interface MetricConfig {
  key: MetricKey;
  field: MetricKey;
  label: string;
  description: string;
  format: (value: number | null | undefined) => string;
  classification: ClassificationStrategy | "productSpend";
  legendValueDigits?: 2 | 4;
}

export const METRICS: MetricConfig[] = [
  {
    key: "spend",
    field: "spend",
    label: "E-commerce Spend",
    description: "Supplied e-commerce dollar spend by ZIP (Column G).",
    format: formatCurrency,
    classification: "productSpend",
  },
  {
    key: "coSpendShare",
    field: "coSpendShare",
    label: "% of Total CO Spend",
    description: "Supplied share of Colorado spend (Column H). Not recalculated.",
    format: formatPercent2,
    classification: "quantile",
    legendValueDigits: 2,
  },
  {
    key: "localPenetration",
    field: "localPenetration",
    label: "Local Penetration",
    description: "Supplied local penetration rate (Column I). Not recalculated.",
    format: formatPercent2,
    classification: "quantile",
    legendValueDigits: 2,
  },
  {
    key: "top10Penetration",
    field: "top10Penetration",
    label: "Top 10 Penetration",
    description: "Supplied top-10 penetration rate (Column J). Not recalculated.",
    format: formatPercent4,
    classification: "quantile",
    legendValueDigits: 4,
  },
  {
    key: "statePenetration",
    field: "statePenetration",
    label: "State Penetration",
    description: "Supplied state penetration rate (Column K). Not recalculated.",
    format: formatPercent4,
    classification: "quantile",
    legendValueDigits: 4,
  },
];

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  outdoor: "Outdoor / Performance",
  utility: "Utility",
};

export function getMetricConfig(key: MetricKey): MetricConfig {
  const found = METRICS.find((m) => m.key === key);
  if (!found) throw new Error(`Unknown metric: ${key}`);
  return found;
}
