import { useMap } from "react-map-gl/maplibre";
import type { Bounds } from "../data/catalog";
import { fitDomain } from "../map/fitDomain";

const icon = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true } as const;

/** Home (reset to the domain view) and zoom in/out. */
export default function MapNav({ bounds }: { bounds: Bounds }) {
  const { main: map } = useMap();
  if (!map) return null;
  return (
    <div className="map-nav" role="group" aria-label="Map view">
      <button type="button" className="nav-button" aria-label="Reset view" title="Reset view" onClick={() => fitDomain(map.getMap(), bounds, true)}>
        <svg {...icon}><path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3V9.5h2V13h3V6.5" /></svg>
      </button>
      <button type="button" className="nav-button" aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}>
        <svg {...icon}><path d="M8 3v10M3 8h10" /></svg>
      </button>
      <button type="button" className="nav-button" aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}>
        <svg {...icon}><path d="M3 8h10" /></svg>
      </button>
    </div>
  );
}
