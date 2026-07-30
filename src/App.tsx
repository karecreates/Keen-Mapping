import { useCallback, useMemo, useState } from "react";
import { ColoradoMap } from "./components/ColoradoMap";
import { MapControls } from "./components/MapControls";
import { MapLegend } from "./components/MapLegend";
import { ZipDetails } from "./components/ZipDetails";
import { ZipSearch } from "./components/ZipSearch";
import { DataStatus } from "./components/DataStatus";
import { PasswordGate } from "./components/PasswordGate";
import { classifyMetric } from "./lib/classifications";
import { indexRecordsByZip, normalizeZip } from "./lib/mapJoin";
import { isAccessGranted } from "./lib/accessAuth";
import { useMapData } from "./hooks/useMapData";
import { readMapsEnv, useGoogleMap } from "./hooks/useGoogleMap";
import type { MetricKey, ProductKey } from "./types/mapData";
import "./App.css";

function MapApp() {
  const {
    geojson,
    diagnostics,
    loading: dataLoading,
    error: dataError,
    getDataset,
  } = useMapData();

  const mapsConfig = useMemo(() => readMapsEnv(), []);
  const { map, ready: mapReady, error: mapError, containerRef } =
    useGoogleMap(mapsConfig);

  const [product, setProduct] = useState<ProductKey>("outdoor");
  const [metric, setMetric] = useState<MetricKey>("spend");
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const [zoomRequest, setZoomRequest] = useState<{
    zip: string;
    token: number;
  } | null>(null);
  const [fitToken, setFitToken] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const dataset = getDataset(product);
  const records = dataset?.records ?? [];

  const classification = useMemo(
    () => classifyMetric(records, product, metric),
    [records, product, metric]
  );

  const byZip = useMemo(() => indexRecordsByZip(records), [records]);
  const selectedRecord = selectedZip ? (byZip.get(selectedZip) ?? null) : null;

  const geometryZips = useMemo(() => {
    const set = new Set<string>();
    for (const f of geojson?.features ?? []) {
      const zip = normalizeZip(
        (f.properties as { zip?: string } | null)?.zip ?? null
      );
      if (zip) set.add(zip);
    }
    return set;
  }, [geojson]);

  const handleSelectZip = useCallback((zip: string | null) => {
    setSelectedZip(zip);
  }, []);

  const handleSearchSelect = useCallback((zip: string) => {
    setSelectedZip(zip);
    setZoomRequest((prev) => ({
      zip,
      token: (prev?.token ?? 0) + 1,
    }));
  }, []);

  const handleProductChange = useCallback((next: ProductKey) => {
    setProduct(next);
  }, []);

  const handleResetView = useCallback(() => {
    setFitToken((t) => t + 1);
  }, []);

  const envMissing = !mapsConfig.apiKey;
  const blockingError = dataError || mapError;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__copy">
          <h1>Colorado ZIP Code E-Commerce Insights</h1>
          <p className="app-subtitle">
            Outdoor / Performance and Utility geographic performance
          </p>
        </div>
        <div className="app-header__logo">
          <img src="/beta_LOGO_main.svg" alt="KOL" />
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <MapControls
            product={product}
            metric={metric}
            onProductChange={handleProductChange}
            onMetricChange={setMetric}
            onResetView={handleResetView}
          />

          <ZipSearch
            records={records}
            geometryZips={geometryZips}
            onSelectZip={handleSearchSelect}
            onMessage={setStatusMessage}
          />

          <div className="sr-live" aria-live="polite">
            {statusMessage}
          </div>

          <DataStatus
            diagnostics={diagnostics}
            recordCount={records.length}
          />

          <div className="desktop-details">
            <ZipDetails
              open={Boolean(selectedRecord)}
              record={selectedRecord}
              product={product}
              metric={metric}
              onClose={() => setSelectedZip(null)}
            />
          </div>
        </aside>

        <main className="app-main">
          <div className="map-stage">
            <div className="colorado-map">
              <div
                ref={containerRef}
                className="colorado-map__canvas"
                role="application"
                aria-label="Interactive Colorado ZIP code choropleth map"
                aria-describedby="map-description"
              />
              <p className="colorado-map__sr-only" id="map-description">
                Choropleth map of Colorado ZIP Code Tabulation Areas. Fill
                colors represent the selected product line and metric. Click a
                ZIP for details. Use the search field to find a ZIP by code or
                city name.
              </p>
              {geojson && mapReady && map ? (
                <ColoradoMap
                  map={map}
                  geojson={geojson}
                  records={records}
                  product={product}
                  metric={metric}
                  classification={classification}
                  selectedZip={selectedZip}
                  onSelectZip={handleSelectZip}
                  fitToken={fitToken}
                  zoomRequest={zoomRequest}
                />
              ) : null}
            </div>
            {geojson && !blockingError ? (
              <div className="map-stage__legend">
                <MapLegend classification={classification} />
              </div>
            ) : null}

            {(dataLoading || (!mapReady && !blockingError && !envMissing)) && (
              <div className="state-panel state-panel--overlay" role="status">
                <div className="spinner" aria-hidden="true" />
                <p>
                  {dataLoading
                    ? "Loading Colorado map data…"
                    : "Initializing Google Maps…"}
                </p>
              </div>
            )}

            {blockingError ? (
              <div
                className="state-panel state-panel--overlay state-panel--error"
                role="alert"
              >
                <h2>Unable to load map</h2>
                <p>{blockingError}</p>
                <ul>
                  <li>
                    Workbook path:{" "}
                    <code>
                      public/data/Colorado Filtered - KOL Geographic Insights
                      (2025)(1).xlsx
                    </code>
                  </li>
                  <li>
                    Run <code>npm run prepare-map</code> to generate JSON and
                    geometry
                  </li>
                  <li>
                    Ensure <code>.env</code> has{" "}
                    <code>VITE_GOOGLE_MAPS_API_KEY</code>. Optional:{" "}
                    <code>VITE_GOOGLE_MAP_ID</code> for cloud map styling.
                  </li>
                </ul>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <div className="mobile-details">
        <ZipDetails
          open={Boolean(selectedRecord)}
          record={selectedRecord}
          product={product}
          metric={metric}
          onClose={() => setSelectedZip(null)}
        />
      </div>
    </div>
  );
}

function App() {
  const [granted, setGranted] = useState(() => isAccessGranted());

  if (!granted) {
    return <PasswordGate onSuccess={() => setGranted(true)} />;
  }

  return <MapApp />;
}

export default App;
