import { GREEN_SEQUENCE, NO_DATA_COLOR } from "../config/colors";
import { getSpendBuckets } from "../config/spendBuckets";
import { getMetricConfig, PRODUCT_LABELS } from "../config/metrics";
import type { StateKey } from "../config/states";
import {
  formatCurrency,
  formatLegendPercentRange,
} from "./formatters";
import type {
  ClassificationResult,
  LegendBreak,
  MetricKey,
  ProductKey,
  ZipRecord,
} from "../types/mapData";

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Seven quantile classes from positive finite values.
 * Duplicate thresholds from ties are removed so the legend reflects distinct breaks.
 */
export function quantileBreaks(positiveValues: number[], classCount = 7): number[] {
  if (positiveValues.length === 0) return [];
  const sorted = [...positiveValues].sort((a, b) => a - b);
  const edges: number[] = [sorted[0]];
  for (let i = 1; i < classCount; i++) {
    const pos = (i / classCount) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const value =
      lo === hi
        ? sorted[lo]
        : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    edges.push(value);
  }
  edges.push(sorted[sorted.length - 1]);
  return uniqueSorted(edges);
}

function colorFromQuantileEdges(
  value: number,
  edges: number[]
): string {
  // edges has distinct ascending thresholds; classes are between consecutive edges
  // With n distinct edges we get up to n-1 intervals; map into 7 greens
  if (edges.length < 2) return GREEN_SEQUENCE[0];

  // Highest class inclusive of max
  if (value >= edges[edges.length - 1]) {
    return GREEN_SEQUENCE[Math.min(GREEN_SEQUENCE.length - 1, edges.length - 2)];
  }

  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i];
    const hi = edges[i + 1];
    if (value >= lo && value < hi) {
      const idx = Math.min(i, GREEN_SEQUENCE.length - 1);
      return GREEN_SEQUENCE[idx];
    }
  }
  return GREEN_SEQUENCE[0];
}

function buildQuantileLegend(
  edges: number[],
  digits: 2 | 4
): LegendBreak[] {
  const ranges: LegendBreak[] = [];

  if (edges.length >= 2) {
    for (let i = 0; i < edges.length - 1; i++) {
      const min = edges[i];
      const max = edges[i + 1];
      const isLast = i === edges.length - 2;
      const color = GREEN_SEQUENCE[Math.min(i, GREEN_SEQUENCE.length - 1)];
      ranges.push({
        color,
        label: isLast
          ? formatLegendPercentRange(min, null, digits)
          : formatLegendPercentRange(min, max, digits),
        min,
        max: isLast ? null : max,
        kind: "range",
      });
    }
  }

  // Descending: darkest / highest first, then 0% and N/A
  return [
    ...ranges.reverse(),
    {
      color: NO_DATA_COLOR,
      label: "0%",
      min: 0,
      max: 0,
      kind: "zero",
    },
    {
      color: NO_DATA_COLOR,
      label: "N/A",
      min: null,
      max: null,
      kind: "na",
    },
  ];
}

function buildSpendClassification(
  product: ProductKey,
  metricLabel: string
): ClassificationResult {
  const buckets = getSpendBuckets(product);
  const breaks: LegendBreak[] = [
    // Descending: darkest / highest spend first
    ...[...buckets].reverse().map((b) => ({
      color: b.color,
      label: b.label,
      min: null as number | null,
      max: null as number | null,
      kind: "range" as const,
    })),
    {
      color: NO_DATA_COLOR,
      label: "$0",
      min: 0,
      max: 0,
      kind: "zero",
    },
    {
      color: NO_DATA_COLOR,
      label: "N/A",
      min: null,
      max: null,
      kind: "na",
    },
  ];

  return {
    breaks,
    colorForValue: (value) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return NO_DATA_COLOR;
      }
      if (value === 0) return NO_DATA_COLOR;
      for (const bucket of buckets) {
        if (bucket.test(value)) return bucket.color;
      }
      return NO_DATA_COLOR;
    },
    legendTitle: `${metricLabel} · ${PRODUCT_LABELS[product]}`,
  };
}

export function classifyMetric(
  records: ZipRecord[],
  product: ProductKey,
  metric: MetricKey,
  stateKey: StateKey = "CO"
): ClassificationResult {
  const config = getMetricConfig(metric, stateKey);

  if (config.classification === "productSpend") {
    return buildSpendClassification(product, config.label);
  }

  const positive: number[] = [];
  for (const r of records) {
    const v = r[metric];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      positive.push(v);
    }
  }

  const edges = quantileBreaks(positive, 7);
  const digits = config.legendValueDigits ?? 2;
  const breaks = buildQuantileLegend(edges, digits);

  return {
    breaks,
    colorForValue: (value) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return NO_DATA_COLOR;
      }
      if (value === 0) return NO_DATA_COLOR;
      if (value < 0) return NO_DATA_COLOR;
      return colorFromQuantileEdges(value, edges);
    },
    legendTitle: `${config.label} · ${PRODUCT_LABELS[product]} quantiles`,
    legendNote: "Colors represent relative quantiles using the supplied values.",
  };
}

/** Helper for legend currency labels if needed elsewhere */
export function formatSpendEdge(value: number): string {
  return formatCurrency(value);
}
