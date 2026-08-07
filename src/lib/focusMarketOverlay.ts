import type { MapPin } from "../config/focusMarkets";

interface LabelOffset {
  x: number;
  y: number;
}

interface MarketMarker {
  market: MapPin;
  pinWidth: number;
  pinHeight: number;
  overlay: google.maps.OverlayView;
  getAnchor(): google.maps.Point | null;
  setLabelOffset(offset: LabelOffset): void;
  getLabelSize(): { width: number; height: number };
}

type MarkerCtor = new (
  market: MapPin,
  onReady: () => void
) => google.maps.OverlayView & {
  getAnchor(): google.maps.Point | null;
  setLabelOffset(offset: LabelOffset): void;
  getLabelSize(): { width: number; height: number };
  getPinSize(): { width: number; height: number };
};

let MarkerClass: MarkerCtor | null = null;

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  pad = 4
): boolean {
  return !(
    a.right + pad < b.left ||
    a.left - pad > b.right ||
    a.bottom + pad < b.top ||
    a.top - pad > b.bottom
  );
}

const OFFSET_CANDIDATES: LabelOffset[] = [
  { x: 0, y: 6 },
  { x: 42, y: -18 },
  { x: -42, y: -18 },
  { x: 0, y: -52 },
  { x: 48, y: -48 },
  { x: -48, y: -48 },
  { x: 52, y: 8 },
  { x: -52, y: 8 },
  { x: 70, y: -10 },
  { x: -70, y: -10 },
  { x: 0, y: -70 },
  { x: 64, y: -64 },
  { x: -64, y: -64 },
];

function getMarkerClass(): MarkerCtor {
  if (MarkerClass) return MarkerClass;

  if (typeof google === "undefined" || !google.maps?.OverlayView) {
    throw new Error("Google Maps API is not loaded yet.");
  }

  MarkerClass = class FocusMarketMarker extends google.maps.OverlayView {
    private position: google.maps.LatLng;
    private market: MapPin;
    private onReady: () => void;
    private root: HTMLDivElement | null = null;
    private labelEl: HTMLSpanElement | null = null;
    private offset: LabelOffset = { x: 0, y: 6 };
    private pinWidth: number;
    private pinHeight: number;

    constructor(market: MapPin, onReady: () => void) {
      super();
      this.position = new google.maps.LatLng(market.lat, market.lng);
      this.market = market;
      this.onReady = onReady;
      this.pinWidth = market.pinWidth ?? (market.variant === "logo" ? 72 : 34);
      this.pinHeight = market.pinHeight ?? (market.variant === "logo" ? 28 : 34);
    }

    onAdd() {
      const root = document.createElement("div");
      root.className =
        this.market.variant === "logo"
          ? "focus-market focus-market--logo"
          : "focus-market";
      root.title = this.market.name;

      const pin = document.createElement("img");
      pin.className = "focus-market__pin";
      pin.src = this.market.pinSrc ?? "/beta_markerr.svg";
      pin.alt = "";
      pin.width = this.pinWidth;
      pin.height = this.pinHeight;

      const label = document.createElement("span");
      label.className = "focus-market__label";
      label.textContent = this.market.name;

      root.append(pin, label);
      this.root = root;
      this.labelEl = label;
      this.applyLabelOffset();

      this.getPanes()?.floatPane.appendChild(root);
      requestAnimationFrame(() => this.onReady());
    }

    draw() {
      if (!this.root) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.root.style.left = `${point.x}px`;
      this.root.style.top = `${point.y}px`;
    }

    onRemove() {
      this.root?.remove();
      this.root = null;
      this.labelEl = null;
    }

    getAnchor(): google.maps.Point | null {
      const projection = this.getProjection();
      if (!projection) return null;
      return projection.fromLatLngToDivPixel(this.position);
    }

    getPinSize() {
      return { width: this.pinWidth, height: this.pinHeight };
    }

    setLabelOffset(offset: LabelOffset) {
      this.offset = offset;
      this.applyLabelOffset();
    }

    getLabelSize(): { width: number; height: number } {
      if (!this.labelEl) {
        return { width: this.market.name.length * 7.2 + 18, height: 22 };
      }
      const rect = this.labelEl.getBoundingClientRect();
      return {
        width: Math.max(rect.width, 40),
        height: Math.max(rect.height, 20),
      };
    }

    private applyLabelOffset() {
      if (!this.labelEl) return;
      this.labelEl.style.transform = `translate(calc(-50% + ${this.offset.x}px), ${this.offset.y}px)`;
    }
  };

  return MarkerClass;
}

type Rect = { left: number; top: number; right: number; bottom: number };

function resolveLabelOffsets(markers: MarketMarker[]) {
  const placedLabels: Rect[] = [];
  const pinRects: Rect[] = [];

  for (const marker of markers) {
    const anchor = marker.getAnchor();
    if (!anchor) continue;
    pinRects.push({
      left: anchor.x - marker.pinWidth / 2,
      top: anchor.y - marker.pinHeight,
      right: anchor.x + marker.pinWidth / 2,
      bottom: anchor.y,
    });
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const anchor = marker.getAnchor();
    if (!anchor) continue;
    const size = marker.getLabelSize();
    const ownPin = pinRects[i];

    let chosen = OFFSET_CANDIDATES[0];
    let placed = false;

    for (const candidate of OFFSET_CANDIDATES) {
      const cx = anchor.x + candidate.x;
      const top = ownPin.bottom + candidate.y;
      const labelRect: Rect = {
        left: cx - size.width / 2,
        top,
        right: cx + size.width / 2,
        bottom: top + size.height,
      };

      const hitsLabel = placedLabels.some((r) => rectsOverlap(labelRect, r));
      const hitsAnyPin = pinRects.some((r) => rectsOverlap(labelRect, r, 2));
      if (!hitsLabel && !hitsAnyPin) {
        chosen = candidate;
        placedLabels.push(labelRect);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const cx = anchor.x + chosen.x;
      const top = ownPin.bottom + chosen.y;
      placedLabels.push({
        left: cx - size.width / 2,
        top,
        right: cx + size.width / 2,
        bottom: top + size.height,
      });
    }

    marker.setLabelOffset(chosen);
  }
}

/** Mount map pins with collision-aware labels. Returns cleanup. */
export function mountFocusMarkets(
  map: google.maps.Map,
  markets: MapPin[]
): () => void {
  if (!markets.length) return () => {};

  const Ctor = getMarkerClass();
  const markers: MarketMarker[] = [];

  const relayout = () => {
    resolveLabelOffsets(markers);
  };

  for (const market of markets) {
    const overlay = new Ctor(market, relayout);
    overlay.setMap(map);
    const pinSize = overlay.getPinSize();
    markers.push({
      market,
      pinWidth: pinSize.width,
      pinHeight: pinSize.height,
      overlay,
      getAnchor: () => overlay.getAnchor(),
      setLabelOffset: (offset) => overlay.setLabelOffset(offset),
      getLabelSize: () => overlay.getLabelSize(),
    });
  }

  const idleListener = map.addListener("idle", relayout);
  const zoomListener = map.addListener("zoom_changed", relayout);
  window.setTimeout(relayout, 0);

  return () => {
    idleListener.remove();
    zoomListener.remove();
    for (const marker of markers) {
      marker.overlay.setMap(null);
    }
  };
}
