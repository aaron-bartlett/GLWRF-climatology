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

/** Value and units under the cursor, or "No data". */
export default function HoverReadout({ readout, units }: { readout: Readout; units: string }) {
  return (
    <div className="readout" style={{ transform: `translate(${readout.x + 14}px, ${readout.y + 14}px)` }}>
      <span className="readout-value">{readout.value === null ? "No data" : `${fmt(readout.value, 1)} ${units}`}</span>
      <span className="readout-coords">{fmtLat(readout.lat)} {fmtLon(readout.lon)}</span>
    </div>
  );
}
