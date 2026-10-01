import type { Map as MaplibreMap } from "maplibre-gl";
import type { Bounds } from "../data/catalog";

// Room around the domain for the frame's margins; the top clears the floating toolbar row.
const FIT_PADDING = { top: 112, bottom: 64, right: 32, left: 64 }; // bottom clears the attribution
const TOOLBAR_GAP = 24;

export const fitOptions = { padding: FIT_PADDING };

/** Fit the data domain into the open map area below the toolbar row (the "home" view). */
export function fitDomain(map: MaplibreMap, { west, south, east, north }: Bounds, animate = false) {
  const bar = document.querySelector(".map-top")?.getBoundingClientRect();
  const top = bar ? bar.bottom - map.getContainer().getBoundingClientRect().top + TOOLBAR_GAP : FIT_PADDING.top;
  map.fitBounds([west, south, east, north], { padding: { ...FIT_PADDING, top }, animate });
}
