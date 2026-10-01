import * as chromatic from "d3-scale-chromatic";

/** Catalog colormap (d3 scheme name with optional "_r", or hex stops) → t∈[0,1] → CSS color. */
export function interpolator(name: string | string[]): (t: number) => string {
  if (Array.isArray(name)) return stopsInterpolator(name);
  const reversed = name.endsWith("_r");
  const base = reversed ? name.slice(0, -2) : name;
  const fn = (chromatic as unknown as Record<string, unknown>)[`interpolate${base}`];
  if (typeof fn !== "function") throw new Error(`Unknown colormap: ${name}`);
  const f = fn as (t: number) => string;
  return reversed ? (t) => f(1 - t) : f;
}

/** Piecewise-linear RGB between evenly spaced stops (stops are dense enough to stay perceptually even). */
function stopsInterpolator(stops: string[]): (t: number) => string {
  const rgb = stops.map(parseRgb);
  return (t) => {
    const x = Math.min(1, Math.max(0, t)) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(x));
    const f = x - i;
    const [r, g, b] = rgb[i].map((v, k) => Math.round(v + (rgb[i + 1][k] - v) * f));
    return `rgb(${r}, ${g}, ${b})`;
  };
}

const N = 256;

/** 256-entry RGB lookup table. */
export function buildLut(name: string | string[]): Uint8Array {
  const f = interpolator(name);
  const lut = new Uint8Array(N * 3);
  for (let i = 0; i < N; i++) {
    const [r, g, b] = parseRgb(f(i / (N - 1)));
    lut.set([r, g, b], i * 3);
  }
  return lut;
}

function parseRgb(css: string): number[] {
  if (css.startsWith("#")) return [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16));
  return css.match(/\d+/g)!.slice(0, 3).map(Number); // "rgb(r, g, b)"
}

/** Values → RGBA pixels, clamped to range; NaN is fully transparent. */
export function colorize(values: Float32Array, lut: Uint8Array, [lo, hi]: [number, number]): Uint8ClampedArray<ArrayBuffer> {
  const rgba = new Uint8ClampedArray(values.length * 4);
  const k = (N - 1) / (hi - lo);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v)) continue;
    const j = Math.round(Math.min(N - 1, Math.max(0, (v - lo) * k))) * 3;
    rgba[i * 4] = lut[j];
    rgba[i * 4 + 1] = lut[j + 1];
    rgba[i * 4 + 2] = lut[j + 2];
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** CSS linear-gradient for the colorbar. */
export function cssGradient(name: string | string[], stops = 16): string {
  const f = interpolator(name);
  const colors = Array.from({ length: stops }, (_, i) => f(i / (stops - 1)));
  return `linear-gradient(to right, ${colors.join(", ")})`;
}
