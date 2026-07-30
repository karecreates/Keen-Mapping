# Colorado ZIP Code E-Commerce Insights

Interactive Colorado ZIP-code choropleth maps for **Outdoor / Performance** and **Utility** product lines, built from the KOL Geographic Insights Excel workbook.

The application **never recalculates** Columns H–K (`% of Total CO Spend`, `Local Penetration`, `Top 10 Penetration`, `State Penetration`). Those values are used exactly as supplied in the workbook. Outdoor and Utility are always separate — figures are never combined.

## Requirements

- **Node.js 20+** (recommended)
- A Google Cloud project with the **Maps JavaScript API** enabled
- A browser API key and a **cloud-based Map ID** (map styling is controlled by the Map ID)

## Installation

```bash
npm install
```

## Excel workbook

Place the workbook at:

```text
public/data/Colorado Filtered - KOL Geographic Insights (2025)(1).xlsx
```

The prepare script also accepts the file at the project root or under `src/data`, and will copy it into `public/data`.

If the workbook is missing, data preparation fails with a clear path error (no mock data is substituted).

## Google Maps environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Maps JavaScript API key |
| `VITE_GOOGLE_MAP_ID` | Cloud Map ID (owns white-land / blue-water / label styling) |

Do **not** add a local Google Maps `styles` array — the Map ID controls styling.

**Security recommendation:** Restrict the browser API key by HTTP referrer (your website domain) and limit it to the Maps JavaScript API only.

## Data preparation

Parse the Excel workbook into JSON (filters `State === "CO"` explicitly):

```bash
npm run prepare-data
```

Outputs:

- `public/data/outdoor.json`
- `public/data/utility.json`

## Census ZCTA geometry

Fetch official U.S. Census Bureau ZCTA polygons for ZIPs present in the spreadsheet:

```bash
npm run fetch-geometry
```

Force a refresh (ignores the local cache):

```bash
npm run fetch-geometry:force
```

Outputs:

- `public/data/colorado-zctas.geojson`
- `public/data/geometry-diagnostics.json`

Geometry is **not** re-fetched on every production build when a valid cached GeoJSON already exists. Run `fetch-geometry:force` when you need an update.

Prepare both data and geometry:

```bash
npm run prepare-map
```

### Postal ZIP vs Census ZCTA

Some postal ZIP codes do not have a matching Census ZIP Code Tabulation Area (ZCTA) polygon. The app reports unmatched ZIPs in the data-status panel and diagnostics file. Unmatched ZIPs are **not** invented as points or polygons.

## Development

```bash
npm run prepare-map   # first time, or after workbook changes
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Production build

```bash
npm run build
```

This runs `prepare-data` automatically, then type-checks and builds with Vite. Cached GeoJSON is reused unless you refresh it separately.

Preview the production build:

```bash
npm run preview
```

## Product lines & map layers

| Product tab | Source worksheet | Spend / customers columns |
|---|---|---|
| Outdoor / Performance | `data` | `FanGroup1Fans`, `FanGroup1Units`, `FanGroup1Dollars` |
| Utility | `Utility Data` | `FanGroup2Fans`, `FanGroup2Units`, `FanGroup2Dollars` |

Map layers (metrics):

1. E-commerce Spend
2. % of Total CO Spend
3. Local Penetration
4. Top 10 Penetration
5. State Penetration

Spend uses fixed product-specific buckets. Percentage metrics use quantile classification of the **supplied** positive values for the active product only.

## Project scripts

| Script | Description |
|---|---|
| `npm run prepare-data` | Excel → outdoor/utility JSON |
| `npm run fetch-geometry` | Census ZCTAs (uses cache if present) |
| `npm run fetch-geometry:force` | Refresh Census geometry |
| `npm run prepare-map` | prepare-data + fetch-geometry |
| `npm run dev` | Vite dev server |
| `npm run build` | prepare-data + production build |
| `npm run preview` | Preview production build |
