import type {
  ClassificationStrategy,
  MetricKey,
  ProductKey,
} from "../types/mapData";
import type { StateKey } from "./states";
import { STATES } from "./states";
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

export function getMetricsForState(stateKey: StateKey): MetricConfig[] {
  const state = STATES[stateKey];
  return [
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
      label: state.spendShareLabel,
      description: `Supplied share of ${state.name} spend (Column H). Not recalculated.`,
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
      key: "statePenetration",
      field: "statePenetration",
      label: "State Penetration",
      description: "Supplied state penetration rate (Column K). Not recalculated.",
      format: formatPercent4,
      classification: "quantile",
      legendValueDigits: 4,
    },
  ];
}

/** @deprecated Prefer getMetricsForState(stateKey) */
export const METRICS: MetricConfig[] = getMetricsForState("CO");

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  outdoor: "Outdoor / Performance",
  utility: "Utility",
};

export function getMetricConfig(
  key: MetricKey,
  stateKey: StateKey = "CO"
): MetricConfig {
  const found = getMetricsForState(stateKey).find((m) => m.key === key);
  if (!found) throw new Error(`Unknown metric: ${key}`);
  return found;
}
