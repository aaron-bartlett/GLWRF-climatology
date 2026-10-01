import { describe, expect, it } from "vitest";
import { decode } from "./decode";

describe("decode", () => {
  it("applies scale and offset", () => {
    const out = decode(new Int16Array([0, 100, -100]), 0.01, 5, -32768);
    expect(Array.from(out)).toEqual([5, 6, 4].map((v) => Math.fround(v)));
  });

  it("maps fill to NaN", () => {
    const out = decode(new Int16Array([-32768, 1]), 1, 0, -32768);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(out[1]).toBe(1);
  });

  it("keeps everything when there is no fill value", () => {
    expect(Array.from(decode(new Int16Array([-32768]), 1, 0, null))).toEqual([-32768]);
  });
});
