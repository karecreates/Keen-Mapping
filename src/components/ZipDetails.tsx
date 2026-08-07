import type { MetricKey, ProductKey, ZipRecord } from "../types/mapData";
import type { StateKey } from "../config/states";
import { getMetricsForState, PRODUCT_LABELS } from "../config/metrics";
import {
  formatCurrency,
  formatInteger,
  formatPercent2,
  formatPercent4,
} from "../lib/formatters";
import "./ZipDetails.css";

interface ZipDetailsProps {
  record: ZipRecord | null;
  stateKey: StateKey;
  product: ProductKey;
  metric: MetricKey;
  onClose: () => void;
  open: boolean;
}

export function ZipDetails({
  record,
  stateKey,
  product,
  metric,
  onClose,
  open,
}: ZipDetailsProps) {
  if (!open || !record) return null;

  const metrics = getMetricsForState(stateKey);
  const spendShareLabel =
    metrics.find((m) => m.key === "coSpendShare")?.label ??
    "% of Total State Spend";

  const detailRows: {
    key: MetricKey | "population" | "customers" | "units";
    label: string;
    format: (v: number | null | undefined) => string;
    highlightable?: boolean;
  }[] = [
    { key: "population", label: "Population", format: formatInteger },
    { key: "customers", label: "Customers", format: formatInteger },
    { key: "units", label: "Units", format: formatInteger },
    {
      key: "spend",
      label: "E-commerce Spend",
      format: formatCurrency,
      highlightable: true,
    },
    {
      key: "coSpendShare",
      label: spendShareLabel,
      format: formatPercent2,
      highlightable: true,
    },
    {
      key: "localPenetration",
      label: "Local Penetration",
      format: formatPercent2,
      highlightable: true,
    },
    {
      key: "statePenetration",
      label: "State Penetration",
      format: formatPercent4,
      highlightable: true,
    },
  ];

  return (
    <section className="zip-details" aria-label="Selected ZIP details">
      <header className="zip-details__header">
        <div>
          <p className="zip-details__product">{PRODUCT_LABELS[product]}</p>
          <h2 className="zip-details__title">ZIP {record.zip}</h2>
          <p className="zip-details__city">{record.city ?? "N/A"}</p>
        </div>
        <button
          type="button"
          className="zip-details__close"
          onClick={onClose}
          aria-label="Close ZIP details"
        >
          ×
        </button>
      </header>

      <dl className="zip-details__list">
        {detailRows.map((row) => {
          const value = record[row.key as keyof ZipRecord] as
            | number
            | null
            | undefined;
          const isMetric =
            row.highlightable && metrics.some((m) => m.key === row.key);
          const highlighted = isMetric && row.key === metric;
          return (
            <div
              key={row.key}
              className={
                highlighted
                  ? "zip-details__row is-highlighted"
                  : "zip-details__row"
              }
            >
              <dt>{row.label}</dt>
              <dd>{row.format(value)}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
