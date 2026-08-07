import { useCallback, useEffect, useState } from "react";
import type {
  GeometryDiagnostics,
  ProductDataset,
  ProductKey,
} from "../types/mapData";
import type { StateKey } from "../config/states";
import { STATES, stateDataPaths } from "../config/states";
import { validateDataset } from "../lib/validation";

export interface MapDataState {
  outdoor: ProductDataset | null;
  utility: ProductDataset | null;
  geojson: GeoJSON.FeatureCollection | null;
  diagnostics: GeometryDiagnostics | null;
  loading: boolean;
  error: string | null;
}

export function useMapData(stateKey: StateKey) {
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
    const paths = stateDataPaths(stateKey);
    const stateName = STATES[stateKey].name;

    async function load() {
      setState((s) => ({
        ...s,
        outdoor: null,
        utility: null,
        geojson: null,
        diagnostics: null,
        loading: true,
        error: null,
      }));
      try {
        const [outdoorRes, utilityRes, geoRes, diagRes] = await Promise.all([
          fetch(paths.outdoor),
          fetch(paths.utility),
          fetch(paths.geojson),
          fetch(paths.diagnostics),
        ]);

        if (!outdoorRes.ok || !utilityRes.ok) {
          throw new Error(
            `Missing generated ${stateName} JSON data. Place the Excel workbook in the project root ` +
              `and run \`npm run prepare-data -- --state=${stateKey}\`.`
          );
        }

        const outdoor = (await outdoorRes.json()) as ProductDataset;
        const utility = (await utilityRes.json()) as ProductDataset;

        let geojson: GeoJSON.FeatureCollection | null = null;
        if (geoRes.ok) {
          geojson = (await geoRes.json()) as GeoJSON.FeatureCollection;
          if (!geojson.features?.length) {
            throw new Error(
              `${stateName} ZCTA GeoJSON loaded but contains no features. Run \`npm run fetch-geometry -- --state=${stateKey}\`.`
            );
          }
        } else {
          throw new Error(
            `Missing \`${paths.geojson}\`. Run \`npm run fetch-geometry -- --state=${stateKey}\` ` +
              `(or \`npm run prepare-map\`) to download Census ZCTA polygons.`
          );
        }

        let diagnostics: GeometryDiagnostics | null = null;
        if (diagRes.ok) {
          diagnostics = (await diagRes.json()) as GeometryDiagnostics;
        }

        for (const warning of [
          ...validateDataset(outdoor, stateKey),
          ...validateDataset(utility, stateKey),
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
  }, [stateKey]);

  const getDataset = useCallback(
    (product: ProductKey): ProductDataset | null => {
      return product === "outdoor" ? state.outdoor : state.utility;
    },
    [state.outdoor, state.utility]
  );

  return { ...state, getDataset };
}
