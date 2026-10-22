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
const PIN_RADIUS = 10; // px; also the click/hover target for removing the pin

export interface Pin {
  lng: number;
  lat: number;
}

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
  probe: boolean; // probe mode: a click pins a point (one per map, shared by both maps)
  pin: Pin | null;
  onPin: (pin: Pin | null) => void;
}

export default function MapView({ id, bounds, imageUrl, loading, opacity, labels, outlines, slice, variable, probe, pin, onPin }: Props) {
  const { west: w, south: s, east: e, north: n } = bounds;
  const mapRef = useRef<MapRef>(null);
  const [beforeId, setBeforeId] = useState<string>();
  const [labelLayers, setLabelLayers] = useState<string[]>([]);
  const [styleReady, setStyleReady] = useState(false);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [overPin, setOverPin] = useState(false);

  // Value under a point, or null where there's no data.
  const valueAt = (lng: number, lat: number) => {
    const cell = slice && cellAt(lng, lat, bounds, slice.width, slice.height);
    const v = cell ? slice.values[cell.row * slice.width + cell.col] : NaN;
    return Number.isNaN(v) ? null : v;
  };
  const isOverPin = (point: { x: number; y: number }) => {
    const p = pin && mapRef.current?.project([pin.lng, pin.lat]);
    return !!p && Math.hypot(point.x - p.x, point.y - p.y) <= PIN_RADIUS;
  };

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
      cursor={overPin ? "pointer" : probe ? "crosshair" : undefined}
      doubleClickZoom={!probe} // a double click would pin and then unpin
      onMouseMove={(ev) => {
        setOverPin(isOverPin(ev.point));
        if (!slice) return setReadout(null);
        const { lng, lat } = ev.lngLat;
        setReadout({ x: ev.point.x, y: ev.point.y, value: valueAt(lng, lat), lon: lng, lat });
      }}
      onMouseOut={() => {
        setReadout(null);
        setOverPin(false);
      }}
      // Clicking the pin removes it in either mode; in probe mode a click elsewhere moves it there.
      onClick={(ev) => {
        if (isOverPin(ev.point)) {
          onPin(null);
          setOverPin(false);
        } else if (probe) {
          onPin({ lng: ev.lngLat.lng, lat: ev.lngLat.lat });
          setOverPin(true);
        }
      }}
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
      {pin && (
        <Marker longitude={pin.lng} latitude={pin.lat} anchor="center">
          <div className="pin">
            <svg width={2 * PIN_RADIUS} height={2 * PIN_RADIUS} viewBox="0 0 20 20" aria-hidden="true">
              <circle className="pin-halo" cx="10" cy="10" r="8" />
              <circle className="pin-ring" cx="10" cy="10" r="8" />
              {overPin && <path className="pin-x" d="M7 7l6 6M13 7l-6 6" />}
            </svg>
            {/* Offsets are from the pin's top-left corner, so this sits where the hover readout would */}
            {slice && (
              <HoverReadout
                readout={{ x: PIN_RADIUS, y: PIN_RADIUS, value: valueAt(pin.lng, pin.lat), lon: pin.lng, lat: pin.lat }}
                variable={variable}
              />
            )}
          </div>
        </Marker>
      )}
      {readout && !overPin && <HoverReadout readout={readout} variable={variable} />}
    </Map>
  );
}
