import type { MetricKey, ProductKey } from "../types/mapData";
import { METRICS, PRODUCT_LABELS } from "../config/metrics";
import "./MapControls.css";

interface MapControlsProps {
  product: ProductKey;
  metric: MetricKey;
  onProductChange: (product: ProductKey) => void;
  onMetricChange: (metric: MetricKey) => void;
  onResetView: () => void;
}

export function MapControls({
  product,
  metric,
  onProductChange,
  onMetricChange,
  onResetView,
}: MapControlsProps) {
  return (
    <div className="map-controls">
      <div
        className="segmented"
        role="tablist"
        aria-label="Product line"
      >
        {(["outdoor", "utility"] as ProductKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={product === key}
            className={product === key ? "segmented__btn is-active" : "segmented__btn"}
            onClick={() => onProductChange(key)}
          >
            {PRODUCT_LABELS[key]}
          </button>
        ))}
      </div>

      <fieldset className="metric-fieldset">
        <legend className="control-label">Map layer</legend>
        <div className="metric-list" role="radiogroup" aria-label="Metric">
          {METRICS.map((m) => (
            <label key={m.key} className="metric-option">
              <input
                type="radio"
                name="metric"
                value={m.key}
                checked={metric === m.key}
                onChange={() => onMetricChange(m.key)}
              />
              <span>
                <strong>{m.label}</strong>
                <small>{m.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" className="btn btn-secondary" onClick={onResetView}>
        Reset map view
      </button>
    </div>
  );
}
