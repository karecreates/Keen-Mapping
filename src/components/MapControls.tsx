import type { MetricKey, ProductKey } from "../types/mapData";
import type { StateKey } from "../config/states";
import { STATE_ORDER, STATES } from "../config/states";
import { getMetricsForState, PRODUCT_LABELS } from "../config/metrics";
import "./MapControls.css";

interface MapControlsProps {
  stateKey: StateKey;
  product: ProductKey;
  metric: MetricKey;
  onStateChange: (state: StateKey) => void;
  onProductChange: (product: ProductKey) => void;
  onMetricChange: (metric: MetricKey) => void;
  onResetView: () => void;
}

export function MapControls({
  stateKey,
  product,
  metric,
  onStateChange,
  onProductChange,
  onMetricChange,
  onResetView,
}: MapControlsProps) {
  const metrics = getMetricsForState(stateKey);

  return (
    <div className="map-controls">
      <div>
        <p className="control-label">State</p>
        <div className="segmented segmented--states" role="tablist" aria-label="State">
          {STATE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={stateKey === key}
              className={
                stateKey === key ? "segmented__btn is-active" : "segmented__btn"
              }
              onClick={() => onStateChange(key)}
            >
              {STATES[key].name}
            </button>
          ))}
        </div>
      </div>

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
          {metrics.map((m) => (
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
