/** int16 → physical values: raw * scale + offset, fill → NaN. */
export function decode(raw: Int16Array, scale: number, offset: number, fill: number | null): Float32Array {
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw[i] === fill ? NaN : raw[i] * scale + offset;
  return out;
}
