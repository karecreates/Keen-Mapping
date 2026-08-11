import type { StateKey } from "./states";

/** Map callout pins: focus markets (teardrop) and existing Keen stores (logo). */

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Defaults to focus-market teardrop marker */
  pinSrc?: string;
  pinWidth?: number;
  pinHeight?: number;
  /** CSS modifier, e.g. "logo" for Keen wordmark pins */
  variant?: "marker" | "logo";
}

const MARKER = "/beta_markerr.svg";
const KEEN_LOGO = "/keen-logo-bw.svg";

export const FOCUS_MARKETS_BY_STATE: Record<StateKey, MapPin[]> = {
  CO: [
    {
      id: "briargate",
      name: "Briargate",
      lat: 38.9635296,
      lng: -104.7942922,
      pinSrc: MARKER,
    },
    {
      id: "park-meadows",
      name: "Park Meadows",
      lat: 39.562641,
      lng: -104.876604,
      pinSrc: MARKER,
    },
    {
      id: "cherry-creek",
      name: "Cherry Creek",
      lat: 39.7166735,
      lng: -104.9529928,
      pinSrc: MARKER,
    },
    {
      id: "larimer-sq",
      name: "Larimer Sq",
      lat: 39.7477084,
      lng: -104.999113,
      pinSrc: MARKER,
    },
    {
      id: "rino",
      name: "Rino",
      lat: 39.7591972,
      lng: -104.9857545,
      pinSrc: MARKER,
    },
    {
      id: "tennyson",
      name: "Tennyson",
      lat: 39.7727206,
      lng: -105.0443717,
      pinSrc: MARKER,
    },
    {
      id: "boulder-29th",
      name: "Boulder 29th St",
      lat: 40.0170531,
      lng: -105.2552024,
      pinSrc: MARKER,
    },
    {
      id: "boulder-pearl",
      name: "Boulder Pearl St",
      lat: 40.0180891,
      lng: -105.2803224,
      pinSrc: MARKER,
    },
    {
      id: "broomfield-center",
      name: "Broomfield Center St",
      lat: 39.998333,
      lng: -104.999564,
      pinSrc: MARKER,
    },
    {
      id: "loveland-avenue-south",
      name: "Loveland Avenue South",
      lat: 40.406635,
      lng: -105.000977,
      pinSrc: MARKER,
    },
    {
      id: "flat-iron-crossing",
      name: "Flat Iron Crossing",
      lat: 39.93309718988535,
      lng: -105.13315022946982,
      pinSrc: MARKER,
    },
  ],
  CA: [
    {
      id: "keen-california",
      name: "Keen Store",
      lat: 37.44579430157274,
      lng: -122.16160564045991,
      pinSrc: KEEN_LOGO,
      variant: "logo",
      pinWidth: 72,
      pinHeight: 28,
    },
  ],
  OR: [
    {
      id: "keen-portland",
      name: "Keen Store",
      lat: 45.52688819927653,
      lng: -122.68430971274533,
      pinSrc: KEEN_LOGO,
      variant: "logo",
      pinWidth: 72,
      pinHeight: 28,
    },
  ],
  WA: [],
};

/** @deprecated Use FOCUS_MARKETS_BY_STATE.CO */
export const FOCUS_MARKETS = FOCUS_MARKETS_BY_STATE.CO;

export type FocusMarket = MapPin;
