import { useEffect, useRef, useState } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature } from "geojson";
import type { Bounds, Variable } from "../data/catalog";
import type { Slice } from "../data/zarrClient";
import HoverReadout, { type Readout } from "../components/HoverReadout";
import { cellAt } from "./projection";
import { fitDomain, fitOptions } from "./fitDomain";
import DomainFrame from "./DomainFrame";
// Great Lakes shoreline: Natural Earth 10m lakes, the five lakes plus Lake St. Clair and their bays, merged
import greatLakes from "./greatLakes.json";

// MapLibre 6 locates its worker relative to its own module URL, which breaks once Vite bundles it.
maplibregl.setWorkerUrl(workerUrl);


const BASEMAP = "https://tiles.openfreemap.org/styles/positron";

interface Props {
  id: "main" | "compare"; // "main" owns the URL hash; "compare" is the right map of the side-by-side view
  bounds: Bounds;
  imageUrl: string | null;
  loading: boolean;
  opacity: number; // 0–1
  labels: boolean; // basemap labels
  outlines: boolean; // Great Lakes shoreline
  slice: Slice | null; // values behind the overlay, for the hover readout
  variable: Variable;
}

export default function MapView({ id, bounds, imageUrl, loading, opacity, labels, outlines, slice, variable }: Props) {
  const { west: w, south: s, east: e, north: n } = bounds;
  const mapRef = useRef<MapRef>(null);
  const [beforeId, setBeforeId] = useState<string>();
  const [labelLayers, setLabelLayers] = useState<string[]>([]);
  const [styleReady, setStyleReady] = useState(false);
  const [readout, setReadout] = useState<Readout | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    for (const id of labelLayers) map?.setLayoutProperty(id, "visibility", labels ? "visible" : "none");
  }, [labelLayers, labels]);


  return (
    <Map
      id={id}
      ref={mapRef}
      mapLib={maplibregl}
      initialViewState={{ bounds: [w, s, e, n], fitBoundsOptions: fitOptions }}
      mapStyle={BASEMAP}
      attributionControl={{ compact: true }}
      hash={id === "main"} // view as #zoom/lat/lon; takes precedence over the initial bounds
      onMouseMove={(ev) => {
        if (!slice) return setReadout(null);
        const { lng, lat } = ev.lngLat;
        const cell = cellAt(lng, lat, bounds, slice.width, slice.height);
        const v = cell ? slice.values[cell.row * slice.width + cell.col] : NaN;
        setReadout({ x: ev.point.x, y: ev.point.y, value: Number.isNaN(v) ? null : v, lon: lng, lat });
      }}
      onMouseOut={() => setReadout(null)}
      // Add the overlay as soon as the style's layers exist. `onLoad` would also wait for every basemap tile.
      onStyleData={(ev) => {
        const layers = ev.target.getStyle()?.layers;
        if (styleReady || !layers?.length) return;
        setBeforeId(layers.find((l) => l.type === "symbol")?.id); // draw data under the basemap's labels
        setLabelLayers(layers.filter((l) => l.type === "symbol").map((l) => l.id)); // every basemap label
        setStyleReady(true);
        if (id === "main" && !window.location.hash) fitDomain(ev.target, bounds); // "compare" follows "main"
      }}
    >
      {/* Great Lakes shoreline above the data */}
      {styleReady && (
        <Source id="great-lakes" type="geojson" data={greatLakes as Feature}>
          <Layer
            id="lake-outline"
            type="line"
            beforeId={beforeId}
            layout={{ visibility: outlines ? "visible" : "none" }}
            paint={{ "line-color": "#15283f", "line-width": 0.75 }}
          />
        </Source>
      )}
      {styleReady && imageUrl && (
        <Source id="data" type="image" url={imageUrl} coordinates={[[w, n], [e, n], [e, s], [w, s]]}>
          <Layer id="data" type="raster" beforeId="lake-outline" paint={{ "raster-opacity": opacity, "raster-resampling": "nearest" }} />
        </Source>
      )}
      {/* Category names (e.g. lake basins) belong to the data, so they ignore the labels option */}
      {variable.categories?.map((name, i) => (
        <Marker key={name} longitude={variable.centers![i][0]} latitude={variable.centers![i][1]} anchor="center">
          <span className="basin-label">{name}</span>
        </Marker>
      ))}
      <DomainFrame bounds={bounds} loading={loading} />
      {readout && <HoverReadout readout={readout} variable={variable} />}
    </Map>
  );
}
