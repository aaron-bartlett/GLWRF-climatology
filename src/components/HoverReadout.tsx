import type { Variable } from "../data/catalog";

export interface Readout {
  x: number; // px within the map
  y: number;
  value: number | null; // null = no data at this point
  lon: number;
  lat: number;
}

const fmt = (v: number, digits: number) => (v < 0 ? `−${(-v).toFixed(digits)}` : v.toFixed(digits));
const fmtLon = (v: number) => `${Math.abs(v).toFixed(2)}°${v < 0 ? "W" : "E"}`;
const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}°${v < 0 ? "S" : "N"}`;

/** Value and units under the cursor, or "No data"; the category name for categorical variables. */
export default function HoverReadout({ readout, variable }: { readout: Readout; variable: Variable }) {
  const { value } = readout;
  const text = variable.categories
    ? (value !== null && variable.categories[Math.round(value) - 1]) || "Outside the Great Lakes basin"
    : value === null ? "No data" : `${fmt(value, 1)} ${variable.units}`;
  return (
    <div className="readout" style={{ transform: `translate(${readout.x + 14}px, ${readout.y + 14}px)` }}>
      <span className="readout-value">{text}</span>
      <span className="readout-coords">{fmtLat(readout.lat)} {fmtLon(readout.lon)}</span>
    </div>
  );
}
