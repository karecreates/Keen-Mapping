import { useCallback, useEffect, useMemo, useState } from "react";
import { CLEAN_WHITE_BASE_STYLES } from "../config/baseMapStyles";

export interface GoogleMapConfig {
  apiKey: string;
  mapId: string;
}

export interface UseGoogleMapResult {
  map: google.maps.Map | null;
  ready: boolean;
  error: string | null;
  containerRef: (node: HTMLDivElement | null) => void;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

const MONO_MAP_TYPE_ID = "mono_grey";

let mapsScriptPromise: Promise<void> | null = null;

function loadMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-colorado-maps="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps script failed to load"))
      );
      if (window.google?.maps?.Map) resolve();
      return;
    }

    const script = document.createElement("script");
    script.dataset.coloradoMaps = "true";
    script.async = true;
    script.defer = true;

    // Pin to a stable v3 channel; weekly can default toward vector rendering
    const params = new URLSearchParams({
      key: apiKey,
      v: "3.58",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.onload = () => resolve();
    script.onerror = () => {
      mapsScriptPromise = null;
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

function applyMonochromeStyle(map: google.maps.Map) {
  // JSON styles only work on raster maps (ignored on vector / Map ID cloud styles)
  const renderingType = google.maps.RenderingType?.RASTER;
  if (renderingType) {
    // renderingType can only be set at construction; setOptions is a no-op for it.
    // We still set styles + StyledMapType for reliability.
  }

  const styled = new google.maps.StyledMapType(CLEAN_WHITE_BASE_STYLES, {
    name: "Monochrome",
  });
  map.mapTypes.set(MONO_MAP_TYPE_ID, styled);
  map.setMapTypeId(MONO_MAP_TYPE_ID);
  map.setOptions({ styles: CLEAN_WHITE_BASE_STYLES });
}

export function useGoogleMap(config: GoogleMapConfig): UseGoogleMapResult {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl((prev) => (prev === node ? prev : node));
  }, []);

  useEffect(() => {
    if (!config.apiKey) {
      setError(
        "Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY in your .env file."
      );
      setReady(false);
      setMap(null);
      return;
    }

    if (!containerEl) return;
    const mapContainer = containerEl;

    let cancelled = false;

    async function init() {
      try {
        await loadMapsScript(config.apiKey);
        if (cancelled) return;

        if (!window.google?.maps?.Map) {
          throw new Error(
            "Google Maps API loaded but Map constructor is unavailable."
          );
        }

        // Clear any previous map DOM from HMR remounts
        mapContainer.replaceChildren();

        const mapOptions: google.maps.MapOptions = {
          center: { lat: 39.0, lng: -105.5 },
          zoom: 7,
          mapTypeId: "roadmap",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          // Critical: JSON styles are ignored on vector maps
          renderingType: google.maps.RenderingType?.RASTER ?? ("RASTER" as google.maps.RenderingType),
        };

        if (config.mapId) {
          // Cloud Map ID owns styling — do not pass a local styles array
          mapOptions.mapId = config.mapId;
          delete mapOptions.renderingType;
        } else {
          mapOptions.styles = CLEAN_WHITE_BASE_STYLES;
        }

        const instance = new google.maps.Map(mapContainer, mapOptions);
        if (cancelled) return;

        if (!config.mapId) {
          applyMonochromeStyle(instance);
        }

        setMap(instance);
        setReady(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[maps] init failed", err);
        setReady(false);
        setMap(null);
        setError(
          err instanceof Error
            ? `Failed to load Google Maps: ${err.message}`
            : "Failed to load Google Maps"
        );
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [config.apiKey, config.mapId, containerEl]);

  // Re-apply local styles when the style config changes (e.g. HMR) and no Map ID is set
  useEffect(() => {
    if (!map || config.mapId) return;
    applyMonochromeStyle(map);
  }, [map, config.mapId, CLEAN_WHITE_BASE_STYLES]);

  return { map, ready, error, containerRef };
}

export function readMapsEnv(): GoogleMapConfig {
  return {
    apiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim(),
    mapId: (import.meta.env.VITE_GOOGLE_MAP_ID ?? "").trim(),
  };
}

export function useMapsEnv(): GoogleMapConfig {
  return useMemo(() => readMapsEnv(), []);
}
