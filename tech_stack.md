# GL-WRF Website — Tech Stack

This document defines the architecture and tech stack for the GL-WRF climate data visualization website. Use it as the source of truth when planning or implementing any part of the project. Each section describes one layer: what it does, how it works, and the conventions to follow.

---

## 0. Goals and hard constraints

**Purpose:** an interactive web map that displays gridded climate data (aggregated WRF statistics, dimensions `month × y × x` or `y × x`) and lets users choose:
- the **variable**, from the list in `data/variables.md` (for example mean 2 m temperature or snow cover days)
- the **month**, only when the variable has a `month` dimension
- the **scenario**: historical, ssp245 midcentury, ssp245 latecentury, ssp585 midcentury, or ssp585 latecentury. Each scenario is its own data store.
- the **map view**, by panning and zooming (a bonus feature, see PRODUCT.md)

**Hard constraints:**
1. **$0/month to run.** No paid services and no always-on servers.
2. **No backend.** The site is fully static. All data access happens in the browser through HTTP range requests to object storage.
3. **Shareable links.** The full UI selection must round-trip through the URL.
4. **Source data are NetCDF files of roughly 10–100s MB each.** They are never served directly to the browser. They are preprocessed offline into Zarr.

**Rules for implementers:**
- Do not add a server, serverless functions, a database, or an API layer. If a feature seems to need one, precompute it in the preprocessing layer instead.
- Keep the app a single route (`/`). All state lives in query params and the hash, so no SPA 404 fallback is needed on GitHub Pages.
- Keep the data contract (Section 3, "Store layout and catalog") stable. The frontend and the preprocessing scripts both depend on it.

---

## 1. Architecture overview

```
 OFFLINE (developer machine)                     ONLINE ($0)
 ───────────────────────────                     ──────────────────────────────────────────

 Raw WRF NetCDF files                            GitHub Pages
        │                                        (static Vite + React build)
        ▼                                                 │  serves HTML/JS/CSS
 Python preprocessing                                     ▼
  • merge files per scenario                     User's browser
  • regrid → Web Mercator grid                    ├─ React UI (controls, colorbar, readout)
  • quantize → int16 + scale/offset               ├─ URL state  (?var=…&scn=…&m=…  #zoom/lat/lon)
  • chunk + compress (zstd)                       ├─ zarrita ── HTTP GET + Range ──┐
  • write Zarr + catalog.json                     │   (fetches only needed chunks) │
        │                                         └─ MapLibre GL JS                │
        ▼  rclone sync                                • open basemap tiles          │
 Cloudflare R2 bucket  ◄──────────────────────────────• data overlay (canvas→image) │
  (Zarr stores + catalog.json, public, CORS) ◄─────────────────────────────────────┘
```

**Request flow when a user changes a selection:**
1. The UI updates the URL query params.
2. The app resolves which Zarr store (scenario), variable and month index to read, using `catalog.json`.
3. zarrita fetches the store metadata (cached after the first request) and then only the chunk covering that month (or the whole 2D field).
4. The raw int16 values are decoded to physical values (`raw * scale_factor + add_offset`, with fill values mapped to `NaN`).
5. Values are colormapped into an RGBA image and drawn as an overlay on the MapLibre map.
6. The decoded slice is cached in memory, so switching back is instant.

---

## 2. Data preprocessing layer (Python, offline)

**Function:** turns raw WRF NetCDF output into browser-friendly Zarr stores and a `catalog.json`. This is the only place heavy computation happens. The source files are already aggregated statistics (10-year climatologies), so preprocessing only reshapes, regrids, encodes and writes them. Anything expensive is done here once, never in the browser.

### 2.1 Environment
- Python 3.11+, managed with `conda`/`mamba` (recommended, because `xesmf` and `esmpy` are easiest to install from conda-forge) or `uv`.
- Core packages: `xarray`, `netCDF4`, `zarr`, `numcodecs`, `dask`, `numpy`, `pyproj`.
- Regridding: `xesmf` (preferred) or `pyresample`/`rioxarray` as alternatives.
- Upload: the `rclone` CLI (or `aws` CLI configured for R2).

### 2.2 Scripts (in `preprocess/`)
| Script | Responsibility |
|---|---|
| `build_stores.py` | Read the statistics NetCDF files, merge them per scenario, regrid, encode, and write one Zarr store per scenario to `preprocess/out/` |
| `build_catalog.py` | (For now `build_stores.py` also writes `catalog.json`; split it out when it grows.) Generate `catalog.json` (scenarios, variables, units, colormaps, value ranges, store paths, month labels) |
| `tests/` (pytest) | Reopen the written Zarr, decode it, and compare against source NetCDF values within quantization tolerance. Replaces the planned `validate.py`. |
| `upload.sh` | `rclone sync` the output directory to R2, with correct `Cache-Control` headers |
| `VARIABLES` / `SCENARIOS` in `build_stores.py` | Declarative tables of scenarios and variables (from `data/variables.md`): source file, label, units, unit conversion, colormap. Adding a variable is one table entry. (Kept in Python rather than `config.yaml` to avoid a YAML dependency.) |

### 2.3 Processing steps (in order)
1. **Read and clean the statistics files.** See `data/variables.md` for the file-to-variable mapping and quirks.
   - All files share one 145×174 curvilinear WRF grid with 2D lat/lon (`XLAT`/`XLONG` in the monthly-mean files, `lat`/`lon` in the others). The snowfall and precipitation files need `drop_variables=["lat", "lon"]` to open in xarray.
   - Crop `BORDER` = 7 cells from every edge (to 131×160) before regridding. The WRF lateral boundary zone holds erroneous values that also stretched the display ranges.
   - Dimension names differ between files (`south_north`/`west_east` vs `lat`/`lon`). Rename them to common names, and transpose `month` (the last dim in the source) to come first.
   - Keep only the variables listed in `data/variables.md`. Convert units to display units (K → °C for T2), and cast to float64 so int16 encoding rounds exactly.
2. **Group by scenario.** Each of the 5 scenarios becomes one store (see 3.1), merging its snowfall, precipitation and monthly-mean files:
   | Scenario key | Source files | Years |
   |---|---|---|
   | `historical` | `*_historical_2005-2015.nc` | 2005–2014 |
   | `ssp245_mid` | `*_ssp245_2045-2055.nc` | 2045–2054 |
   | `ssp245_late` | `*_ssp245_2085-2095.nc` | 2085–2094 |
   | `ssp585_mid` | `*_ssp585_2045-2055.nc` | 2045–2054 |
   | `ssp585_late` | `*_ssp585_2085-2095.nc` | 2085–2094 |
   - Variables with a month dimension are stored as `(month, y, x)`. Variables without one are stored as `(y, x)`.
   - Every store must contain the same variables, so switching scenario never hits a missing variable.
3. **Regrid to a regular Web Mercator (EPSG:3857) grid.**
   - **Why:** MapLibre places an image overlay linearly between four corner coordinates in Web Mercator space. A grid that is regular in 3857 therefore lines up exactly. A regular lat/lon grid would be slightly misplaced in the north–south direction, and the native Lambert grid would be visibly wrong.
   - Choose a resolution close to the native WRF spacing (derive it from the 2D lat/lon if no `DX` attribute exists).
   - Use bilinear interpolation for continuous fields and conservative interpolation for fluxes such as precipitation if needed.
   - Store 1D `x`/`y` coordinates (meters, EPSG:3857), and record the lon/lat **bounds** of the grid in attributes for the frontend.
   - Order rows **north to south** (`y` descending), so row 0 maps directly to the top of the image.
4. **Quantize.** Store values as `int16` with CF `scale_factor`/`add_offset`:
   - Choose `scale_factor` and `add_offset` per variable from its min/max **across all scenarios** (identical in every store), so the full range fits in int16 with precision better than the display needs (for example, 0.01 °C).
   - `_FillValue = -32768` for missing or land-masked cells.
   - This halves the size compared with float32 and makes compression much more effective.
   - Avoid float16, because `Float16Array` browser support is still recent and uneven.
5. **Chunk.**
   - Use **one month per chunk**, `{month: 1, y: -1, x: -1}`, and a single chunk for 2D variables. A regridded field is only about 50 KB as int16, so each user selection costs exactly one chunk request.
   - Use spatial chunks (about 256×256) only if the grid grows past about 2 MB per field.
6. **Compress.** Use `numcodecs.Zstd(level=5)` or `Blosc(cname="zstd", clevel=5, shuffle=Blosc.SHUFFLE)`. Both are decodable by zarrita.
7. **Write Zarr.**
   - Use `ds.to_zarr(path, mode="w", zarr_format=2, consolidated=True, encoding=…)`. With zarr-python 3 the encoding key is `compressors` (a tuple), not `compressor`.
   - **Zarr v2 with consolidated metadata** is the default for maximum client compatibility. Consolidated metadata lets the client learn the whole store layout from one `.zmetadata` request.
   - Consider Zarr v3 with sharding only if the object count becomes a problem. Verify zarrita's codec support first.
8. **Generate `catalog.json`** (see 3.2).
9. **Validate.** Decode the stores and compare against the source within tolerance. Check the bounds, the orientation (north up), and the fill values.
10. **Upload** with `upload.sh`.

### 2.4 Optional: multiscale pyramids
If grids become large (more than about 2000×2000), build zoom-level pyramids, for example with `ndpyramid`, so zoomed-out views load coarse data. This is not needed for typical regional WRF domains. Add it only if the performance measurements call for it.

---

## 3. Data format and contract (Zarr)

**Function:** a chunked, compressed array format in which every chunk is a separate object addressable by URL. The browser fetches just the chunk for the selected variable and time index, not the whole file.

### 3.1 Store layout (in R2)
```
<bucket-root>/
  v1/                          ← dataset version prefix (bump on breaking changes, for cache-busting)
    catalog.json
    historical.zarr/
      .zmetadata               ← consolidated metadata
      mean_T2/  .zarray .zattrs 0.0.0 1.0.0 … 11.0.0   ← (month, y, x): T2, D2, monthly precip
      snow_cover_days/  .zarray .zattrs 0.0            ← (y, x): snowfall, precip days
      …
      x/ y/ month/
    ssp245_mid.zarr/
    ssp245_late.zarr/
    ssp585_mid.zarr/
    ssp585_late.zarr/
```
- **One store per scenario.** Changing the scenario switches the store URL.
- **Variables are arrays inside each store**, named by their source variable names, and share the `x`/`y` (and `month`) coordinates. All five stores have the same variables, shapes and encodings.
- Each variable's `.zattrs` holds `scale_factor`, `add_offset`, `units`, and `long_name`. The fill value (`-32768`) is in `.zarray` as `fill_value` (zarrita: `arr.fillValue`), not in `.zattrs`.
- The store's root `.zattrs` holds `crs`, the lon/lat `west`/`south`/`east`/`north` bounds of the outer cell edges (the same values as `catalog.bounds`), and the store's `scenario` key and `years`.

### 3.2 `catalog.json` (frontend entry point)
The frontend fetches this first and builds all controls from it. Nothing about variables, months or scenarios is hard-coded in the UI.
```json
{
  "version": "v1",
  "dataset": "GL-WRF regional simulation · 131×160 native grid (edges cropped) · 10-year climatologies",
  "bounds": { "west": -93.5, "south": 40.0, "east": -74.0, "north": 50.5 },
  "grid": { "crs": "EPSG:3857", "width": 600, "height": 450 },
  "scenarios": {
    "historical":  { "label": "historical", "years": "2005–2014", "store": "v1/historical.zarr" },
    "ssp245_mid":  { "label": "ssp245 midcentury",  "ssp": "ssp245", "period": "midcentury",  "years": "2045–2054", "store": "v1/ssp245_mid.zarr" },
    "ssp245_late": { "label": "ssp245 latecentury", "ssp": "ssp245", "period": "latecentury", "years": "2085–2094", "store": "v1/ssp245_late.zarr" },
    "ssp585_mid":  { "label": "ssp585 midcentury",  "ssp": "ssp585", "period": "midcentury",  "years": "2045–2054", "store": "v1/ssp585_mid.zarr" },
    "ssp585_late": { "label": "ssp585 latecentury", "ssp": "ssp585", "period": "latecentury", "years": "2085–2094", "store": "v1/ssp585_late.zarr" }
  },
  "months": ["January", "February", "…", "December"],
  "variables": {
    "mean_T2":         { "label": "Mean T2",         "units": "°C",        "colormap": "RdBu_r",  "range": [-20, 30], "month": true },
    "snow_cover_days": { "label": "Snow cover days", "units": "days/year", "colormap": "Blues",   "range": [0, 200],  "month": false }
  },
  "defaults": { "var": "mean_T2", "scn": "historical", "m": 0 }
}
```
(The values above are illustrative.) `colormap` is either a d3-scale-chromatic scheme name (a `_r` suffix reverses it) or a list of hex color stops from low to high. Stop lists must be perceptually linear (even CIELAB L* steps), which `preprocess/tests` checks; each family has its own: temperature light blue → violet → dark red, dew point straw → green → teal, precipitation mint → teal → navy, snow day-counts lilac → indigo (`preprocess/tests` also checks that families never share a colormap). The one exception is the user-chosen snowfall-amount ramp (white → light pink → dark pink → purple → dark blue → light blue, with the range pinned to start at 0). Each variable also has a `group` ("Temperature", "Precipitation" or "Snowfall") that sections the variable menu; a group's variables must be adjacent in the catalog. For a variable without a month dimension, the month menu stays visible but disabled and blank. Compute display `range` values in preprocessing from the 2nd and 98th percentiles across **all scenarios and months**, rounded outward to 2 significant digits, so colorbars are stable and colors are comparable when switching scenario or month.

The scenario control's layout (historical left of a 2×2 grid) is built from the `ssp` and `period` fields, and its row and column headers show `ssp_label` (e.g. "SSP2-4.5") and `period_label` (e.g. "Mid-century"). The `historical` scenario has neither field. A scenario whose store hasn't been built yet has `"store": null`, and the UI shows it disabled.

---

## 4. Data storage layer (Cloudflare R2)

**As deployed** (step-by-step in [DEPLOY.md](DEPLOY.md)): bucket `gl-wrf-data`, public through its r2.dev URL, CORS from `preprocess/r2-cors.json`, uploads with `preprocess/upload.sh` (rclone remote `r2`; chunks immutable, catalog and Zarr metadata 5 min). Data changes after launch go under a new version prefix (`VERSION` in `build_stores.py` and the `/v1/` path in `src/data/catalog.ts`).

**Function:** public object storage that serves Zarr chunks and `catalog.json` to the browser over HTTPS, supporting range requests and CORS.

**Why R2:** it is S3-compatible object storage with **zero egress fees**, real directory-style keys (matching Zarr's layout), configurable CORS and `Cache-Control`, native range requests, and one-command sync uploads. GitHub Releases was rejected because of its flat asset list, its roughly 1,000-asset cap per release, unreliable browser CORS on redirected downloads, and terms not meant for app data backends.

### 4.1 Free tier (verify current numbers)
- About 10 GB-month of storage, about 1 M Class A (write) and about 10 M Class B (read) operations per month, and free egress.
- **A payment method must be on file** to enable R2. Set up billing notifications so usage beyond the free tier is noticed.
- Keep total data well under 10 GB. Chunk sizing (Section 2.3) keeps read-operation counts low.

### 4.2 Configuration
1. **Create the bucket**, for example `gl-wrf-data`.
2. **Set up public access.** Either:
   - Enable the **r2.dev public URL**. This is fine for development and low traffic, but it is rate-limited and not intended for production.
   - Or connect a **custom domain** managed in Cloudflare, for example `data.example.org`. This is recommended for production and enables CDN caching.
3. **Add a CORS policy** (bucket settings):
   ```json
   [
     {
       "AllowedOrigins": ["https://<github-user>.github.io", "http://localhost:5173"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["Range", "Content-Type"],
       "ExposeHeaders": ["Content-Length", "Content-Range", "ETag"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```
   Add any custom frontend domain to `AllowedOrigins`.
4. **Set cache headers** at upload time:
   - Chunks under a versioned prefix: `Cache-Control: public, max-age=31536000, immutable`
   - `catalog.json` and `.zmetadata`: `Cache-Control: public, max-age=300`, so updates propagate quickly
5. **Upload** with `rclone` (remote type `s3`, provider `Cloudflare`, endpoint `https://<account_id>.r2.cloudflarestorage.com`):
   ```bash
   rclone sync preprocess/out/v1 r2:gl-wrf-data/v1 --header-upload "Cache-Control: public, max-age=31536000, immutable" --progress
   ```
   Upload `catalog.json` separately, with the shorter cache header.
6. **Secrets.** R2 access keys are used **only** on the developer machine for uploads. They are never committed and never shipped to the frontend. The frontend only does anonymous public GETs.

---

## 5. Data access layer (zarrita in the browser)

**Function:** reads Zarr metadata and fetches only the chunks needed for the current selection, using HTTP `GET` (with `Range` where applicable). It then decompresses the chunks and returns typed arrays.

**Library choice:**
- **`zarrita`** (primary). It is modern, written in TypeScript, modular and tree-shakable, supports Zarr v2 and v3, consolidated metadata, and Blosc/Zstd/gzip codecs.
- **`zarr-js`** (CarbonPlan) is a fallback. It is smaller but v2-focused, with a less ergonomic API.

### 5.1 How it works
```ts
import * as zarr from "zarrita";

const store = await zarr.withConsolidated(new zarr.FetchStore(`${DATA_BASE_URL}/v1/ssp245_mid.zarr`));
const group = await zarr.open(store, { kind: "group" });
const arr = await zarr.open(group.resolve("mean_T2"), { kind: "array" });

// Select one month and the full spatial extent → fetches only that chunk.
// For a variable without a month dimension, use zarr.get(arr) or [null, null].
const { data, shape } = await zarr.get(arr, [monthIndex, null, null]); // Int16Array, [ny, nx]
```
_Verify exact API names against the installed zarrita version._

### 5.2 Responsibilities (in `src/data/`)
| Module | Responsibility |
|---|---|
| `catalog.ts` | Fetch and validate `catalog.json`, and expose typed scenario and variable metadata |
| `zarrClient.ts` | Open stores and arrays (memoized per store URL) and read a 2D slice for `(scn, var, m)` |
| `decode.ts` | Convert int16 to Float32 physical values using `scale_factor`/`add_offset`, and map `_FillValue` to `NaN` |
| `cache.ts` | LRU cache of decoded slices, keyed by `scn/var/m` (cap by count or bytes) |
| `prefetch.ts` | Optional, only if needed: quietly prefetch the same variable and month for the other scenarios |

**Rules:**
- The data base URL comes from the build-time env var `VITE_DATA_BASE_URL`. Do not hard-code it. In development, `.env.development` sets it to `/data`, which a dev-only plugin in `vite.config.ts` serves from `preprocess/out/` (same origin, so no CORS).
- Cancel or ignore stale requests when the selection changes quickly, using an `AbortController` or a request-id check, so an older slice never overwrites a newer one.
- Surface load and error states to the UI.

---

## 6. Data rendering layer (MapLibre GL JS via react-map-gl)

**Function:** draws an interactive pan/zoom map with an open basemap, overlays the colormapped data field, and shows a colorbar and hover readout.

**Library choice:**
- **MapLibre GL JS** through **`react-map-gl`** (import from `react-map-gl/maplibre`) is the primary choice. It is open source, WebGL-based, renders smooth vector basemaps, and needs no API key.
- **Leaflet** (with `react-leaflet` and an `ImageOverlay`) is a simpler fallback with raster basemaps. It has the same Web Mercator alignment consideration.

### 6.1 Basemap
Use a free, keyless vector style, for example:
- OpenFreeMap: `https://tiles.openfreemap.org/styles/positron` (or `liberty`, `bright`)
- CARTO: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`

Show the required attribution.

**MapLibre 6 worker:** MapLibre locates its worker relative to its own module, which breaks under Vite bundling. `MapView.tsx` imports the worker with `?worker&url`, calls `setWorkerUrl`, and passes that same module to `<Map mapLib={…}>`. Prefer a light, low-saturation style so the data colors stand out.

### 6.2 Data overlay (initial implementation)
1. Take the decoded `Float32Array` slice (shape `[ny, nx]`, north-up).
2. Map each value to RGBA with a colormap lookup table, for example a 256-entry LUT built from `d3-scale-chromatic`, clamped to the catalog `range`. Make `NaN` fully transparent.
3. Write the result into an `ImageData` on an offscreen canvas, then convert it to a blob URL with `canvas.toBlob` and `URL.createObjectURL`. Revoke the previous URL.
4. Show it with a MapLibre **`image` source** whose `coordinates` are the four corners from `catalog.bounds`, in the order `[[W,N],[E,N],[E,S],[W,S]]`. Update it with `source.updateImage({ url, coordinates })`.
5. Add the raster layer **below the basemap's label layers** (`beforeId` set to the first symbol layer). Overlay opacity is a 0–100% slider (default 80%), and a toggle hides or shows all basemap labels (every symbol layer). Neither is stored in the URL. The same toggle shows/hides a Great Lakes shoreline outline (a bundled GeoJSON, `src/map/greatLakes.json`, extracted once from Natural Earth 10m lakes) drawn between the data and the labels.
6. Set `raster-resampling: "nearest"` to show true grid cells, or `"linear"` for a smoothed look. Make this a user toggle if useful.

### 6.3 Upgrade path (only if needed)
If redrawing becomes slow (large grids, live colormap or range changes), replace step 2–4 with a **custom WebGL layer**. Upload the raw values as a float texture and apply the colormap in a fragment shader. Alternatively, use deck.gl's `BitmapLayer` through `@deck.gl/mapbox`'s `MapboxOverlay`.

### 6.4 UI components (in `src/components/`)
| Component | Function |
|---|---|
| `MapView.tsx` | `react-map-gl` map, basemap, data overlay layer. Pan/zoom and `hash` view sync are bonus features. |
| `Controls.tsx` | Variable select; month select (shown only when the variable has `month: true`); scenario selector with historical to the left of a 2×2 grid (columns midcentury and latecentury, rows ssp245 above ssp585). All built from the catalog. |
| `MapToolbar.tsx` | Floating bar along the top of the map: colorbar, opacity slider, map-labels toggle |
| `Colorbar.tsx` | Calibrated scale for the active colormap and range: ruled ticks at round values, with units |
| `HoverReadout.tsx` | On mouse move (`map/projection.ts` `cellAt`): `lngLat` → EPSG:3857 → grid `(row, col)` → value from the cached slice. Shows the value with units, or "no data". |
| `LoadingIndicator.tsx` | Shows load and error state from the data layer |

---

## 7. Frontend application layer (Vite + React)

**Function:** the single-page app that ties together the UI, state, data access and rendering. It is built to static files.

### 7.1 Stack
- **Vite** (build tool and dev server) with **React 18+** and **TypeScript** (strict mode)
- `react-map-gl` and `maplibre-gl` for the map, `zarrita` for data, `d3-scale-chromatic` for colormaps
- Styling with plain CSS modules or Tailwind. Keep it lightweight.
- State: React hooks (`useReducer`/context) or **Zustand**, kept in sync with the URL (see 7.3)

### 7.2 Proposed project structure
```
/
├─ tech_stack.md
├─ index.html
├─ vite.config.ts           (base: '/<repo-name>/')
├─ package.json
├─ .env.example             (VITE_DATA_BASE_URL=https://…)
├─ public/
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ state/urlState.ts
│  ├─ data/  catalog.ts zarrClient.ts decode.ts cache.ts prefetch.ts
│  ├─ map/   MapView.tsx dataOverlay.ts colormap.ts projection.ts
│  └─ components/  Controls.tsx Colorbar.tsx HoverReadout.tsx LoadingIndicator.tsx
├─ preprocess/
│  ├─ build_stores.py upload.sh
│  ├─ tests/  (pytest)
│  └─ environment.yml
└─ .github/workflows/deploy.yml
```

### 7.3 URL state (shareable links)
- **Data selection** goes in **query params**, for example `?var=mean_T2&scn=ssp245_mid&m=6` (`m` is the 0-based month index).
- **Map view** goes in the **hash** using MapLibre's built-in `hash` option, for example `#6.2/45.1/-84.3` (zoom, lat, lon). With a hash present the map opens there; without one it fits the domain below the toolbar.
- On load: parse the params, **validate them against `catalog.json`** (an unknown `var` or `scn`, or an out-of-range `m`, falls back to `defaults`), and write back the normalized values.
- On change: update with `history.replaceState`, not `pushState`, so the back button isn't flooded. Use `pushState` only for deliberate, discrete changes if needed.
- When the variable changes to one without a month dimension, drop `m` from the URL. When it changes back, restore the last month or the default.
- There is a single route, so no client-side router and no 404 fallback are required.

---

## 8. Hosting layer (GitHub Pages)

**As deployed** (see [DEPLOY.md](DEPLOY.md)): repo `aaron-bartlett/GLWRF-climatology` → https://aaron-bartlett.github.io/GLWRF-climatology/. `.github/workflows/deploy.yml` runs `npm ci`, `npm test` and `npm run build` with `BASE_PATH=/<repo-name>/` and `VITE_DATA_BASE_URL` from the repository variable `DATA_BASE_URL`, then deploys `dist/`.

**Function:** serves the static build (`dist/`) over HTTPS for free.

### 8.1 Setup
- The repo must be **public** (free-plan requirement for Pages).
- **Settings → Pages → Source: GitHub Actions.**
- `vite.config.ts`: set `base: '/<repo-name>/'` for `https://<user>.github.io/<repo-name>/`, or `base: '/'` when using a custom domain.
- Workflow `.github/workflows/deploy.yml` runs on push to `main` and does the following:
  1. `actions/checkout`
  2. `actions/setup-node` (Node LTS, npm cache)
  3. `npm ci && npm run build`, with `VITE_DATA_BASE_URL` supplied from a repository **variable**. It is a public URL, not a secret.
  4. `actions/configure-pages`, then `actions/upload-pages-artifact` (path `dist`), then `actions/deploy-pages`
- Optional: a custom domain through a `CNAME`. Remember to add it to the R2 CORS `AllowedOrigins`.

### 8.2 Limits and implications
- Published site size about 1 GB, and a soft limit of about 100 GB/month bandwidth. The app bundle is small, so this is fine **because data lives on R2, not in the repo**.
- Never commit Zarr stores, NetCDF files or generated data to the repo. Add `preprocess/out/` and `*.nc` to `.gitignore`.

---

## 9. Cost summary

| Layer | Service | Cost |
|---|---|---|
| Hosting | GitHub Pages | $0 |
| Frontend | Vite + React (open source) | $0 |
| Data storage | Cloudflare R2 (within free tier) | $0 (card on file) |
| Data access | zarrita | $0 |
| Rendering | MapLibre + OpenFreeMap/CARTO basemap | $0 |
| Preprocessing | Python on the developer's machine | $0 |

---

## 10. Backup plan: pre-rendered images

If the Zarr pipeline proves impractical:
- Generate one image per `(scenario, variable, month)` with `matplotlib` + `cartopy` in preprocessing, as WebP in EPSG:3857 with fixed bounds.
- Name them `{scn}_{var}_{m}.webp`, store them in R2 under the same versioned prefix, and list them in `catalog.json`.
- The frontend sets the MapLibre `image` source URL directly. Steps 5.x and 6.2 (decode and colormap) are skipped, and pan/zoom still works.
- Lost features: the hover value readout and client-side colormap/range changes.

---

## 11. Open questions to resolve before implementation

Resolved: the grid is 145×174 curvilinear. The variables come from `data/variables.md`, with month or no time dimension. There are five scenario climatologies and no time series. Total data is a few tens of MB, far under 10 GB. Snowfall amounts are liquid-water equivalent (labeled "mm water equiv."), and D2 is stored in °C (confirmed by the data producer).

1. Whether a custom domain is available (for R2 production access and/or Pages)
2. Whether a land/water mask should be applied (for example, lake-only fields)
3. Colormaps: resolved for now. T2 and D2 use the temperature stop list, precipitation uses `YlGnBu`, snow uses `Blues`, and ranges are fixed per variable across scenarios.
