import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ClassificationResult,
  MetricKey,
  ProductKey,
  ZipRecord,
} from "../types/mapData";
import {
  HOVER_STYLE,
  NORMAL_STYLE,
  SELECTED_STYLE,
} from "../config/colors";
import { getMetricConfig } from "../config/metrics";
import { mountFocusMarkets } from "../lib/focusMarketOverlay";
import { indexRecordsByZip, normalizeZip } from "../lib/mapJoin";

function boundsToPadded(
  bounds: google.maps.LatLngBounds,
  padDegrees: number
): google.maps.LatLngBounds {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const padded = new google.maps.LatLngBounds(
    { lat: sw.lat() - padDegrees, lng: sw.lng() - padDegrees },
    { lat: ne.lat() + padDegrees, lng: ne.lng() + padDegrees }
  );
  return padded;
}

interface TooltipState {
  x: number;
  y: number;
  zip: string;
  city: string;
  metricLabel: string;
  metricValue: string;
}

interface ColoradoMapProps {
  map: google.maps.Map;
  geojson: GeoJSON.FeatureCollection;
  records: ZipRecord[];
  product: ProductKey;
  metric: MetricKey;
  classification: ClassificationResult;
  selectedZip: string | null;
  onSelectZip: (zip: string | null) => void;
  fitToken: number;
  zoomRequest: { zip: string; token: number } | null;
}

/**
 * Manages the Google Maps Data layer, styling, hover tooltip, and selection.
 * The map canvas itself is owned by App so the API can initialize independently.
 */
export function ColoradoMap({
  map,
  geojson,
  records,
  product,
  metric,
  classification,
  selectedZip,
  onSelectZip,
  fitToken,
  zoomRequest,
}: ColoradoMapProps) {
  const dataLayerLoaded = useRef(false);
  const statesLayerRef = useRef<google.maps.Data | null>(null);
  const [hoveredZip, setHoveredZip] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const featureIndex = useRef<Map<string, google.maps.Data.Feature>>(new Map());

  const byZip = useMemo(() => indexRecordsByZip(records), [records]);
  const metricConfig = getMetricConfig(metric);

  const styleFeature = useCallback(
    (feature: google.maps.Data.Feature): google.maps.Data.StyleOptions => {
      const zip = String(feature.getProperty("zip") ?? "");
      const record = byZip.get(zip);
      const value = record ? (record[metric] as number | null) : null;
      const fillColor = classification.colorForValue(value);

      const isSelected = selectedZip === zip;
      const isHovered = hoveredZip === zip;

      if (isSelected) {
        return {
          fillColor,
          visible: true,
          ...SELECTED_STYLE,
          zIndex: 3,
        };
      }
      if (isHovered) {
        return {
          fillColor,
          visible: true,
          ...HOVER_STYLE,
          zIndex: 2,
        };
      }
      return {
        fillColor,
        visible: true,
        ...NORMAL_STYLE,
        zIndex: 1,
      };
    },
    [byZip, classification, metric, selectedZip, hoveredZip]
  );

  // U.S. state outlines underlay (separate Data layer so ZIP clicks stay clean)
  useEffect(() => {
    let cancelled = false;
    const statesLayer = new google.maps.Data({ map });
    statesLayerRef.current = statesLayer;

    statesLayer.setStyle((feature) => {
      const name = String(
        feature.getProperty("name") ?? feature.getProperty("NAME") ?? ""
      );
      const isColorado = name.toLowerCase() === "colorado";
      return {
        fillColor: "#ffffff",
        fillOpacity: 0,
        strokeColor: isColorado ? "#0f172a" : "#475569",
        strokeWeight: isColorado ? 2.75 : 2,
        strokeOpacity: 1,
        clickable: false,
        zIndex: isColorado ? 5 : 0,
      };
    });

    void fetch("/data/us-states.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load us-states.geojson (${res.status})`);
        return res.json();
      })
      .then((statesGeojson: GeoJSON.FeatureCollection) => {
        if (cancelled) return;
        statesLayer.addGeoJson(statesGeojson as unknown as object);
      })
      .catch((err) => {
        console.warn("[maps] Could not load U.S. state outlines underlay:", err);
      });

    return () => {
      cancelled = true;
      statesLayer.setMap(null);
      statesLayerRef.current = null;
    };
  }, [map]);

  // Focus market pins + collision-aware callout labels
  useEffect(() => {
    return mountFocusMarkets(map);
  }, [map]);

  useEffect(() => {
    // Clear any prior features (React StrictMode remounts safely)
    const prior: google.maps.Data.Feature[] = [];
    map.data.forEach((feature) => prior.push(feature));
    prior.forEach((feature) => map.data.remove(feature));

    map.data.addGeoJson(geojson as unknown as object);
    dataLayerLoaded.current = true;

    const bounds = new google.maps.LatLngBounds();
    const index = new Map<string, google.maps.Data.Feature>();

    map.data.forEach((feature) => {
      const zip = normalizeZip(String(feature.getProperty("zip") ?? ""));
      if (zip) {
        feature.setProperty("zip", zip);
        index.set(zip, feature);
      }
      feature.getGeometry()?.forEachLatLng((latLng) => {
        bounds.extend(latLng);
      });
    });

    featureIndex.current = index;
    boundsRef.current = bounds;

    // Pad the Colorado ZIP extent so neighboring U.S. state outlines stay in view
    const padded = boundsToPadded(bounds, 0.85);
    map.fitBounds(padded, 28);

    return () => {
      const features: google.maps.Data.Feature[] = [];
      map.data.forEach((feature) => features.push(feature));
      features.forEach((feature) => map.data.remove(feature));
      dataLayerLoaded.current = false;
      featureIndex.current = new Map();
    };
  }, [map, geojson]);

  useEffect(() => {
    if (!dataLayerLoaded.current) return;
    map.data.setStyle(styleFeature);
  }, [map, styleFeature, product]);

  useEffect(() => {
    if (!boundsRef.current || fitToken === 0) return;
    map.fitBounds(boundsToPadded(boundsRef.current, 0.85), 28);
  }, [map, fitToken]);

  useEffect(() => {
    if (!zoomRequest) return;
    const feature = featureIndex.current.get(zoomRequest.zip);
    if (!feature) return;
    const bounds = new google.maps.LatLngBounds();
    feature.getGeometry()?.forEachLatLng((ll) => bounds.extend(ll));
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 80);
    }
  }, [map, zoomRequest]);

  useEffect(() => {
    let suppressMapClick = false;

    const mouseMoveListener = map.data.addListener(
      "mousemove",
      (event: google.maps.Data.MouseEvent) => {
        const zip = String(event.feature.getProperty("zip") ?? "");
        setHoveredZip(zip);
        const record = byZip.get(zip);
        const value = record ? (record[metric] as number | null) : null;
        const domEvent = event.domEvent as MouseEvent | undefined;
        if (domEvent) {
          setTooltip({
            x: domEvent.clientX,
            y: domEvent.clientY,
            zip,
            city: record?.city ?? "N/A",
            metricLabel: metricConfig.label,
            metricValue: metricConfig.format(value),
          });
        }
      }
    );

    const mouseOutListener = map.data.addListener("mouseout", () => {
      setHoveredZip(null);
      setTooltip(null);
    });

    const clickListener = map.data.addListener(
      "click",
      (event: google.maps.Data.MouseEvent) => {
        const zip = String(event.feature.getProperty("zip") ?? "");
        suppressMapClick = true;
        onSelectZip(zip);
        // Allow map click (which also fires) to be ignored for this gesture
        window.setTimeout(() => {
          suppressMapClick = false;
        }, 0);
      }
    );

    const mapClickListener = map.addListener("click", () => {
      if (suppressMapClick) return;
      onSelectZip(null);
    });

    return () => {
      mouseMoveListener.remove();
      mouseOutListener.remove();
      clickListener.remove();
      mapClickListener.remove();
    };
  }, [map, byZip, metric, metricConfig, onSelectZip]);

  if (!tooltip) return null;

  return (
    <div
      className="colorado-map__tooltip"
      style={{
        left: tooltip.x + 14,
        top: tooltip.y + 14,
      }}
      role="tooltip"
    >
      <div className="colorado-map__tooltip-zip">ZIP {tooltip.zip}</div>
      <div className="colorado-map__tooltip-city">{tooltip.city}</div>
      <div className="colorado-map__tooltip-metric">
        <span>{tooltip.metricLabel}</span>
        <strong>{tooltip.metricValue}</strong>
      </div>
    </div>
  );
}
