export type StateKey = "CO" | "CA" | "OR";

export interface StateConfig {
  key: StateKey;
  code: StateKey;
  name: string;
  slug: "co" | "ca" | "or";
  /** GeoJSON feature name in us-states.geojson */
  outlineName: string;
  center: { lat: number; lng: number };
  zoom: number;
  spendShareLabel: string;
  title: string;
}

export const STATE_ORDER: StateKey[] = ["CO", "CA", "OR"];

export const STATES: Record<StateKey, StateConfig> = {
  CO: {
    key: "CO",
    code: "CO",
    name: "Colorado",
    slug: "co",
    outlineName: "colorado",
    center: { lat: 39.0, lng: -105.5 },
    zoom: 7,
    spendShareLabel: "% of Total CO Spend",
    title: "Colorado ZIP Code E-Commerce Insights",
  },
  CA: {
    key: "CA",
    code: "CA",
    name: "California",
    slug: "ca",
    outlineName: "california",
    center: { lat: 37.2, lng: -119.5 },
    zoom: 6,
    spendShareLabel: "% of Total CA Spend",
    title: "California ZIP Code E-Commerce Insights",
  },
  OR: {
    key: "OR",
    code: "OR",
    name: "Oregon",
    slug: "or",
    outlineName: "oregon",
    center: { lat: 44.1, lng: -120.5 },
    zoom: 7,
    spendShareLabel: "% of Total OR Spend",
    title: "Oregon ZIP Code E-Commerce Insights",
  },
};

const STORAGE_KEY = "keen-mapping-state";

export function isStateKey(value: string | null | undefined): value is StateKey {
  return value === "CO" || value === "CA" || value === "OR";
}

export function readStoredState(): StateKey {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (isStateKey(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "CO";
}

export function storeSelectedState(state: StateKey) {
  try {
    sessionStorage.setItem(STORAGE_KEY, state);
  } catch {
    /* ignore */
  }
}

export function stateDataPaths(state: StateKey) {
  const slug = STATES[state].slug;
  return {
    outdoor: `/data/${slug}/outdoor.json`,
    utility: `/data/${slug}/utility.json`,
    geojson: `/data/${slug}/zctas.geojson`,
    diagnostics: `/data/${slug}/geometry-diagnostics.json`,
  };
}
