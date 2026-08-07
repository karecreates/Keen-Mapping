import type { MetricKey } from "../types/mapData";

const integerFormatter = new Intl.NumberFormat("en-US");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct2 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct4 = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return integerFormatter.format(value);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return currencyFormatter.format(value);
}

/** Display only — does not mutate stored values. Multiplies by 100 via Intl percent style. */
export function formatPercent2(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return pct2.format(value);
}

export function formatPercent4(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return pct4.format(value);
}

export function formatMetricValue(
  metric: MetricKey,
  value: number | null | undefined
): string {
  switch (metric) {
    case "spend":
      return formatCurrency(value);
    case "coSpendShare":
    case "localPenetration":
      return formatPercent2(value);
    case "statePenetration":
      return formatPercent4(value);
    default:
      return "N/A";
  }
}

export function formatLegendCurrencyRange(min: number, max: number | null): string {
  if (max === null) return `${currencyFormatter.format(min)}+`;
  return `${currencyFormatter.format(min)} – ${currencyFormatter.format(max)}`;
}

export function formatLegendPercentRange(
  min: number,
  max: number | null,
  digits: 2 | 4
): string {
  const fmt = digits === 2 ? pct2 : pct4;
  if (max === null) return `${fmt.format(min)}+`;
  return `${fmt.format(min)} – ${fmt.format(max)}`;
}
