import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import type { Map as MaplibreMap } from "maplibre-gl";

/** Keeps the side-by-side maps ("main" and "compare") on the same view. Renders nothing. */
export default function MapSync() {
  const { main, compare } = useMap();

  useEffect(() => {
    if (!main || !compare) return;
    const a = main.getMap();
    const b = compare.getMap();
    let syncing = false; // jumpTo fires "move" synchronously; the flag stops the echo
    const follow = (from: MaplibreMap, to: MaplibreMap) => () => {
      if (syncing) return;
      syncing = true;
      to.jumpTo({ center: from.getCenter(), zoom: from.getZoom(), bearing: from.getBearing(), pitch: from.getPitch() });
      syncing = false;
    };
    const aToB = follow(a, b);
    const bToA = follow(b, a);
    a.on("move", aToB);
    b.on("move", bToA);
    aToB(); // the new right map starts where the left one is
    return () => {
      a.off("move", aToB);
      b.off("move", bToA);
    };
  }, [main, compare]);

  return null;
}
