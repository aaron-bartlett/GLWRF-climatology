/** Linear interpolation between order statistics (numpy's default percentile method). */
function percentile(sorted: Float64Array, p: number): number {
  const pos = (p / 100) * (sorted.length - 1);
  const i = Math.floor(pos);
  return i + 1 < sorted.length ? sorted[i] + (sorted[i + 1] - sorted[i]) * (pos - i) : sorted[i];
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Local colormap range: 2nd–98th percentile of every finite value in `fields`, rounded outward to 2 significant
 *  digits (the same rule as display_range in build_stores.py). Null when there's no spread to show. */
export function localRange(fields: Float32Array[]): [number, number] | null {
  const values = new Float64Array(fields.reduce((n, f) => n + f.length, 0));
  let n = 0;
  for (const f of fields) for (const v of f) if (Number.isFinite(v)) values[n++] = v;
  if (!n) return null;
  const sorted = values.subarray(0, n).sort();
  const lo = percentile(sorted, 2);
  const hi = percentile(sorted, 98);
  if (!(hi > lo)) return null;
  const step = 10 ** (Math.floor(Math.log10(hi - lo)) - 1);
  return [round6(Math.floor(lo / step) * step), round6(Math.ceil(hi / step) * step)];
}
