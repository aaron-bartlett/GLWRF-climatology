import { useEffect, useRef, useState } from "react";
import { fetchCatalog, type Catalog } from "./data/catalog";
import { readSlice, type Slice } from "./data/zarrClient";
import { sliceToImageUrl } from "./map/dataOverlay";
import MapView from "./map/MapView";
import Caption from "./components/Caption";
import { MapProvider } from "react-map-gl/maplibre";
import MapToolbar from "./components/MapToolbar";
import MapNav from "./components/MapNav";
import Controls from "./components/Controls";
import { parseSelection, serializeSelection, type Selection } from "./state/urlState";
import "./index.css";

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [view, setView] = useState<{ url: string; slice: Slice } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const [labels, setLabels] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    fetchCatalog().then(
      (c) => {
        setCatalog(c);
        setSel(parseSelection(window.location.search, c));
      },
      (e: Error) => setError(e.message),
    );
  }, []);

  // Keep the URL in step with the selection (normalizes invalid params on load).
  useEffect(() => {
    if (catalog && sel) history.replaceState(null, "", serializeSelection(sel, catalog) + window.location.hash);
  }, [catalog, sel]);

  useEffect(() => {
    if (!catalog || !sel) return;
    const id = ++requestId.current;
    const variable = catalog.variables[sel.var];
    setLoading(true);
    setError(null);
    readSlice(catalog.scenarios[sel.scn].store!, sel.var, variable.month ? sel.m : null)
      .then(async (slice) => ({ slice, url: await sliceToImageUrl(slice, variable.colormap, variable.range) }))
      .then(
        (next) => {
          if (id !== requestId.current) return URL.revokeObjectURL(next.url); // a newer selection won
          setView(next);
          setLoading(false);
        },
        (e: Error) => {
          if (id !== requestId.current) return;
          setError(`Couldn't load this field (${e.message}). Try another selection or reload the page.`);
          setLoading(false);
        },
      );
  }, [catalog, sel]);

  useEffect(() => () => void (view && URL.revokeObjectURL(view.url)), [view]);

  if (!catalog || !sel) {
    return (
      <main className="boot">
        <p>{error ? `Couldn't load the dataset catalog (${error}). Reload the page to try again.` : "Loading dataset…"}</p>
      </main>
    );
  }

  return (
    <div className="app">
      <aside className="panel">
        <h1 className="nameplate">GL-WRF Climatology Explorer</h1>
        <Caption catalog={catalog} sel={sel} error={error} />
        <Controls catalog={catalog} sel={sel} onChange={setSel} />
      </aside>
      <MapProvider>
        <main className="map" aria-label="Map">
          <MapView
            bounds={catalog.bounds}
            imageUrl={view?.url ?? null}
            slice={view?.slice ?? null}
            units={catalog.variables[sel.var].units}
            loading={loading}
            opacity={opacity}
            labels={labels}
          />
          <div className="map-top">
            <MapNav bounds={catalog.bounds} />
            <MapToolbar
              variable={catalog.variables[sel.var]}
              opacity={opacity}
              onOpacity={setOpacity}
              labels={labels}
              onLabels={setLabels}
            />
          </div>
        </main>
      </MapProvider>
    </div>
  );
}
