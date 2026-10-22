import { useMap } from "react-map-gl/maplibre";
import type { Bounds } from "../data/catalog";
import { fitDomain } from "../map/fitDomain";

const icon = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true } as const;

interface Props {
  mapId: string;
  bounds: Bounds;
  probe: boolean; // probe mode: clicks pin a point instead of only panning
  onProbe: (probe: boolean) => void;
}

/** Home (reset to the domain view), zoom in/out, and the pan/probe mode switch. */
export default function MapNav({ mapId, bounds, probe, onProbe }: Props) {
  const map = useMap()[mapId];
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
      {/* Shows the mode a click switches to: crosshairs to pin a point, a hand to go back to panning */}
      <button
        type="button"
        className="nav-button mode-button"
        aria-label={probe ? "Back to pan mode" : "Pin a point to read its value"}
        title={probe ? "Back to pan mode" : "Pin a point to read its value"}
        onClick={() => onProbe(!probe)}
      >
        {probe ? (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ strokeWidth: 2 }}>
            <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83L7 15" />
          </svg>
        ) : (
          <svg {...icon}><circle cx="8" cy="8" r="4.5" /><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" /></svg>
        )}
      </button>
    </div>
  );
}
