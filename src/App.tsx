import { useEffect, useRef, useState } from "react";
import { fetchCatalog, type Catalog } from "./data/catalog";
import { readSlice, type Slice } from "./data/zarrClient";
import { sliceToImageUrl } from "./map/dataOverlay";
import { localRange } from "./map/range";
import MapView from "./map/MapView";
import MapSync from "./map/MapSync";
import Caption from "./components/Caption";
import { MapProvider } from "react-map-gl/maplibre";
import MapToolbar from "./components/MapToolbar";
import MapNav from "./components/MapNav";
import Controls from "./components/Controls";
import ScenarioBar from "./components/ScenarioBar";
import Disclaimer from "./components/Disclaimer";
import { parseSelection, serializeSelection, type Selection } from "./state/urlState";
import "./index.css";

interface View {
  var: string;
  range: [number, number]; // effective colormap range (catalog or local)
  panes: { url: string; slice: Slice }[]; // left (and right) map
}

const icon = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true } as const;

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const [labels, setLabels] = useState(true);
  const [outlines, setOutlines] = useState(true);
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
    const scenarios = sel.scn2 ? [sel.scn, sel.scn2] : [sel.scn];
    setLoading(true);
    setError(null);
    Promise.all(scenarios.map((s) => readSlice(catalog.scenarios[s].store!, sel.var, variable.month ? sel.m : null)))
      .then(async (slices) => {
        // A local range pools both maps so they share one colorbar.
        const range = (sel.local && !variable.categories && localRange(slices.map((s) => s.values))) || variable.range;
        const urls = await Promise.all(slices.map((s) => sliceToImageUrl(s, variable, range)));
        return { var: sel.var, range, panes: slices.map((slice, i) => ({ slice, url: urls[i] })) };
      })
      .then(
        (next) => {
          if (id !== requestId.current) return next.panes.forEach((p) => URL.revokeObjectURL(p.url)); // a newer selection won
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

  useEffect(() => () => view?.panes.forEach((p) => URL.revokeObjectURL(p.url)), [view]);

  if (!catalog || !sel) {
    return (
      <main className="boot">
        <p>{error ? `Couldn't load the dataset catalog (${error}). Reload the page to try again.` : "Loading dataset…"}</p>
      </main>
    );
  }

  const variable = catalog.variables[sel.var];
  const split = sel.scn2 !== null;
  const panes = split ? [sel.scn, sel.scn2!] : [sel.scn];
  const openSplit = () => {
    const other = Object.keys(catalog.scenarios).find((k) => k !== sel.scn && catalog.scenarios[k].store);
    if (other) setSel({ ...sel, scn2: other });
  };
  const toolbar = (
    <MapToolbar
      variable={variable}
      range={view?.var === sel.var ? view.range : variable.range}
      local={sel.local}
      onLocal={(local) => setSel({ ...sel, local })}
      opacity={opacity}
      onOpacity={setOpacity}
      labels={labels}
      onLabels={setLabels}
      outlines={outlines}
      onOutlines={setOutlines}
    />
  );

  return (
    <div className={`app${split ? " is-split" : ""}`}>
      <aside className="panel">
        <h1 className="nameplate">GL-WRF Climatology Explorer</h1>
        <Caption catalog={catalog} sel={sel} error={error} />
        <Controls catalog={catalog} sel={sel} onChange={setSel} split={split} />
      </aside>
      <MapProvider>
        <main className={`map${split ? " is-split" : ""}`} aria-label="Map">
          {split && <div className="map-strip">{toolbar}</div>}
          {panes.map((scn, i) => {
            const id = i ? "compare" : "main";
            return (
              <section key={id} className="map-pane" aria-label={split ? (i ? "Right map" : "Left map") : undefined}>
                <MapView
                  id={id}
                  bounds={catalog.bounds}
                  imageUrl={view?.panes[i]?.url ?? null}
                  slice={view?.panes[i]?.slice ?? null}
                  variable={variable}
                  loading={loading}
                  opacity={opacity}
                  labels={labels}
                  outlines={outlines}
                />
                <div className="map-top">
                  <MapNav mapId={id} bounds={catalog.bounds} />
                  {!split && toolbar}
                  {!split && (
                    <button
                      type="button"
                      className="nav-button split-button"
                      aria-label="Compare scenarios side by side"
                      title="Compare scenarios side by side"
                      onClick={openSplit}
                    >
                      <svg {...icon}><rect x="2.5" y="3.5" width="11" height="9" rx="1" /><path d="M8 3.5v9" /></svg>
                    </button>
                  )}
                  {i === 1 && (
                    <button
                      type="button"
                      className="nav-button split-button"
                      aria-label="Close side-by-side view"
                      title="Close side-by-side view"
                      onClick={() => setSel({ ...sel, scn2: null })}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                    </button>
                  )}
                </div>
                {split && (
                  <ScenarioBar
                    catalog={catalog}
                    value={scn}
                    label={i ? "Right map scenario" : "Left map scenario"}
                    onChange={(s) => setSel(i ? { ...sel, scn2: s } : { ...sel, scn: s })}
                  />
                )}
              </section>
            );
          })}
          <Disclaimer />
          <MapSync />
        </main>
      </MapProvider>
    </div>
  );
}
