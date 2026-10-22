import { describe, expect, it } from "vitest";
import { localRange } from "./range";

const ramp = (from: number, to: number) => Float32Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("localRange", () => {
  it("takes the 2nd–98th percentile", () => {
    expect(localRange([ramp(0, 100)])).toEqual([2, 98]); // numpy.percentile(range(101), [2, 98])
  });

  it("interpolates between values and rounds outward to 2 significant digits", () => {
    // numpy.percentile(range(1001), [2, 98]) = [20, 980]; step 10
    expect(localRange([ramp(0, 1000)])).toEqual([20, 980]);
    // 0..10: p2 = 0.2, p98 = 9.8; step 0.1
    expect(localRange([ramp(0, 10)])).toEqual([0.2, 9.8]);
  });

  it("ignores NaN and pools fields", () => {
    expect(localRange([new Float32Array([NaN, ...ramp(0, 50)]), ramp(51, 100)])).toEqual([2, 98]);
  });

  it("is null without spread", () => {
    expect(localRange([new Float32Array([3, 3, 3])])).toBeNull();
    expect(localRange([new Float32Array([NaN, NaN])])).toBeNull();
    expect(localRange([])).toBeNull();
  });
});
