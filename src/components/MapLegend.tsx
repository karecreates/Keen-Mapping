import type { ClassificationResult } from "../types/mapData";
import "./MapLegend.css";

interface MapLegendProps {
  classification: ClassificationResult;
}

export function MapLegend({ classification }: MapLegendProps) {
  return (
    <aside className="map-legend" aria-label="Map legend">
      <h3 className="map-legend__title">{classification.legendTitle}</h3>
      {classification.legendNote ? (
        <p className="map-legend__note">{classification.legendNote}</p>
      ) : null}
      <ul className="map-legend__list">
        {classification.breaks.map((item, idx) => (
          <li key={`${item.label}-${idx}`} className="map-legend__item">
            <span
              className="map-legend__swatch"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="map-legend__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
