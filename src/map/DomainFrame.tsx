import { useEffect, useReducer } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Bounds } from "../data/catalog";
import { formatLat, formatLon, graticule } from "./ticks";

const TICK = 5; // px, drawn outward from the frame

/** Figure frame around the data domain with a 5° tick collar; dashed while a slice is loading. */
export default function DomainFrame({ bounds, loading }: { bounds: Bounds; loading: boolean }) {
  const { current: map } = useMap();
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!map) return;
    map.on("move", redraw);
    map.on("resize", redraw);
    return () => {
      map.off("move", redraw);
      map.off("resize", redraw);
    };
  }, [map]);

  if (!map) return null;
  const { west, south, east, north } = bounds;
  const px = (lon: number, lat: number) => map.project([lon, lat]);
  const nw = px(west, north);
  const se = px(east, south);
  const { lons, lats } = graticule(bounds);

  return (
    <svg className={`domain-frame${loading ? " is-loading" : ""}`} aria-hidden="true">
      <rect className="frame" x={nw.x} y={nw.y} width={se.x - nw.x} height={se.y - nw.y} />
      {lons.map((lon) => {
        const x = px(lon, north).x;
        return (
          <g key={`lon${lon}`}>
            <line x1={x} x2={x} y1={nw.y} y2={nw.y - TICK} />
            <line x1={x} x2={x} y1={se.y} y2={se.y + TICK} />
            <text x={x} y={se.y + TICK + 10} textAnchor="middle" dominantBaseline="middle">{formatLon(lon)}</text>
          </g>
        );
      })}
      {lats.map((lat) => {
        const y = px(west, lat).y;
        return (
          <g key={`lat${lat}`}>
            <line x1={nw.x} x2={nw.x - TICK} y1={y} y2={y} />
            <line x1={se.x} x2={se.x + TICK} y1={y} y2={y} />
            <text x={nw.x - TICK - 4} y={y} textAnchor="end" dominantBaseline="middle">{formatLat(lat)}</text>
          </g>
        );
      })}
    </svg>
  );
}
