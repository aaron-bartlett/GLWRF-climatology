import type { Map as MaplibreMap } from "maplibre-gl";
import type { Bounds } from "../data/catalog";

// Room around the domain for the frame's margins; the top clears the floating toolbar row.
const FIT_PADDING = { top: 112, bottom: 64, right: 32, left: 64 }; // bottom clears the attribution
const TOOLBAR_GAP = 24;
const COLLAR = 32; // the frame's longitude labels hang below it

export const fitOptions = { padding: FIT_PADDING };

/** Fit the data domain into the open map area of its own pane: below the top row and, in the side-by-side view,
 *  above the scenario bar (the "home" view). */
export function fitDomain(map: MaplibreMap, { west, south, east, north }: Bounds, animate = false) {
  const pane = map.getContainer().closest(".map-pane");
  const box = map.getContainer().getBoundingClientRect();
  const bar = pane?.querySelector(".map-top")?.getBoundingClientRect();
  const scenarios = pane?.querySelector(".scenario-bar")?.getBoundingClientRect();
  const top = bar ? bar.bottom - box.top + TOOLBAR_GAP : FIT_PADDING.top;
  const bottom = scenarios ? box.bottom - scenarios.top + COLLAR : FIT_PADDING.bottom;
  map.fitBounds([west, south, east, north], { padding: { ...FIT_PADDING, top, bottom }, animate });
}
