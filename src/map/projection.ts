import type { Bounds } from "../data/catalog";

// Web Mercator (EPSG:3857) on the unit sphere; the radius cancels out of the cell fractions below.
const mercX = (lon: number) => (lon * Math.PI) / 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Grid cell (row 0 = north) under a lon/lat point, or null outside the grid. */
export function cellAt(lon: number, lat: number, bounds: Bounds, width: number, height: number) {
  const fx = (mercX(lon) - mercX(bounds.west)) / (mercX(bounds.east) - mercX(bounds.west));
  const fy = (mercY(bounds.north) - mercY(lat)) / (mercY(bounds.north) - mercY(bounds.south));
  if (!(fx >= 0 && fx < 1 && fy >= 0 && fy < 1)) return null;
  return { row: Math.floor(fy * height), col: Math.floor(fx * width) };
}
