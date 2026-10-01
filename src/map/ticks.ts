import type { Bounds } from "../data/catalog";

/** Round tick values inside [lo, hi] at a 1/2/5 × 10^n step giving roughly `count` ticks. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

/** Whole-degree graticule values strictly inside the bounds, every `step` degrees. */
export function graticule(bounds: Bounds, step = 5): { lons: number[]; lats: number[] } {
  const inside = (lo: number, hi: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v < hi; v += step) if (v > lo) out.push(v);
    return out;
  };
  return { lons: inside(bounds.west, bounds.east), lats: inside(bounds.south, bounds.north) };
}

export const formatLon = (v: number) => `${Math.abs(v)}°${v < 0 ? "W" : v > 0 ? "E" : ""}`;
export const formatLat = (v: number) => `${Math.abs(v)}°${v < 0 ? "S" : v > 0 ? "N" : ""}`;
