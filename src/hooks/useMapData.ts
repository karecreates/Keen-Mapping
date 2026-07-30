import { useCallback, useEffect, useState } from "react";
import type {
  GeometryDiagnostics,
  ProductDataset,
  ProductKey,
} from "../types/mapData";
import { validateDataset } from "../lib/validation";

export interface MapDataState {
  outdoor: ProductDataset | null;
  utility: ProductDataset | null;
  geojson: GeoJSON.FeatureCollection | null;
  diagnostics: GeometryDiagnostics | null;
  loading: boolean;
  error: string | null;
}

export function useMapData() {
  const [state, setState] = useState<MapDataState>({
    outdoor: null,
    utility: null,
    geojson: null,
    diagnostics: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [outdoorRes, utilityRes, geoRes, diagRes] = await Promise.all([
          fetch("/data/outdoor.json"),
          fetch("/data/utility.json"),
          fetch("/data/colorado-zctas.geojson"),
          fetch("/data/geometry-diagnostics.json"),
        ]);

        if (!outdoorRes.ok || !utilityRes.ok) {
          throw new Error(
            "Missing generated JSON data. Place the Excel workbook at " +
              "`public/data/Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx` " +
              "and run `npm run prepare-data`."
          );
        }

        const outdoor = (await outdoorRes.json()) as ProductDataset;
        const utility = (await utilityRes.json()) as ProductDataset;

        let geojson: GeoJSON.FeatureCollection | null = null;
        if (geoRes.ok) {
          geojson = (await geoRes.json()) as GeoJSON.FeatureCollection;
          if (!geojson.features?.length) {
            throw new Error(
              "Colorado ZCTA GeoJSON loaded but contains no features. Run `npm run fetch-geometry`."
            );
          }
        } else {
          throw new Error(
            "Missing `/data/colorado-zctas.geojson`. Run `npm run fetch-geometry` " +
              "(or `npm run prepare-map`) to download Census ZCTA polygons."
          );
        }

        let diagnostics: GeometryDiagnostics | null = null;
        if (diagRes.ok) {
          diagnostics = (await diagRes.json()) as GeometryDiagnostics;
        }

        for (const warning of [
          ...validateDataset(outdoor),
          ...validateDataset(utility),
        ]) {
          console.warn(`[data] ${warning}`);
        }

        if (!cancelled) {
          setState({
            outdoor,
            utility,
            geojson,
            diagnostics,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDataset = useCallback(
    (product: ProductKey): ProductDataset | null => {
      return product === "outdoor" ? state.outdoor : state.utility;
    },
    [state.outdoor, state.utility]
  );

  return { ...state, getDataset };
}
