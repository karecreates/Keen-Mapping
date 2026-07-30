/** Sequential green palette + zero/N/A gray for choropleth fills. */

export const NO_DATA_COLOR = "#E5E7EB";

/**
 * Lightest → darkest green (7 classes for positive values).
 * Higher chroma than a classic ColorBrewer greens so ZIP shading pops on a pale base.
 */
export const GREEN_SEQUENCE = [
  "#D8F5C2",
  "#A6E86A",
  "#6ED22E",
  "#3DBA12",
  "#1F9A0E",
  "#0F780C",
  "#065208",
] as const;

export const STROKE_COLOR = "#64748B";
export const HOVER_STROKE_COLOR = "#334155";
export const SELECTED_STROKE_COLOR = "#111827";

export const NORMAL_STYLE = {
  fillOpacity: 0.8,
  strokeColor: STROKE_COLOR,
  strokeWeight: 0.55,
  strokeOpacity: 0.75,
} as const;

export const HOVER_STYLE = {
  fillOpacity: 0.9,
  strokeColor: HOVER_STROKE_COLOR,
  strokeWeight: 1.5,
  strokeOpacity: 0.95,
} as const;

export const SELECTED_STYLE = {
  fillOpacity: 0.92,
  strokeColor: SELECTED_STROKE_COLOR,
  strokeWeight: 2.5,
  strokeOpacity: 1,
} as const;
