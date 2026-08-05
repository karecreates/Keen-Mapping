/** Focus market retail / district locations plotted on the Colorado map. */

export interface FocusMarket {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const FOCUS_MARKETS: FocusMarket[] = [
  {
    id: "briargate",
    name: "Briargate",
    lat: 38.9635296,
    lng: -104.7942922,
  },
  {
    id: "park-meadows",
    name: "Park Meadows",
    lat: 39.562641,
    lng: -104.876604,
  },
  {
    id: "cherry-creek",
    name: "Cherry Creek",
    lat: 39.7166735,
    lng: -104.9529928,
  },
  {
    id: "larimer-sq",
    name: "Larimer Sq",
    lat: 39.7477084,
    lng: -104.999113,
  },
  {
    id: "rino",
    name: "Rino",
    lat: 39.7591972,
    lng: -104.9857545,
  },
  {
    id: "tennyson",
    name: "Tennyson",
    lat: 39.7727206,
    lng: -105.0443717,
  },
  {
    id: "boulder-29th",
    name: "Boulder 29th St",
    lat: 40.0170531,
    lng: -105.2552024,
  },
  {
    id: "boulder-pearl",
    name: "Boulder Pearl St",
    lat: 40.0180891,
    lng: -105.2803224,
  },
  {
    id: "broomfield-center",
    name: "Broomfield Center St",
    lat: 39.998333,
    lng: -104.999564,
  },
  {
    id: "loveland-avenue-south",
    name: "Loveland Avenue South",
    lat: 40.406635,
    lng: -105.000977,
  },
];
