import { describe, expect, it } from "vitest";
import { buildLut, colorize, cssGradient, interpolator } from "./colormap";

describe("interpolator", () => {
  it("resolves d3 scheme names and reverses with _r", () => {
    expect(interpolator("RdBu_r")(0)).toBe(interpolator("RdBu")(1));
    expect(interpolator("Viridis")(0)).toBeTruthy();
  });

  it("interpolates hex stops linearly", () => {
    const f = interpolator(["#000000", "#ff0000", "#ffffff"]);
    expect(f(0)).toBe("rgb(0, 0, 0)");
    expect(f(0.25)).toBe("rgb(128, 0, 0)");
    expect(f(0.5)).toBe("rgb(255, 0, 0)");
    expect(f(1)).toBe("rgb(255, 255, 255)");
  });

  it("throws on unknown names", () => {
    expect(() => interpolator("Nope")).toThrow(/Unknown colormap/);
  });
});

describe("colorize", () => {
  const lut = buildLut("Viridis");
  const rgbAt = (i: number) => Array.from(lut.slice(i * 3, i * 3 + 3));

  it("maps range ends to LUT ends and clamps outside", () => {
    const rgba = colorize(new Float32Array([0, 10, -5, 99]), lut, [0, 10]);
    expect(Array.from(rgba.slice(0, 3))).toEqual(rgbAt(0));
    expect(Array.from(rgba.slice(4, 7))).toEqual(rgbAt(255));
    expect(Array.from(rgba.slice(8, 11))).toEqual(rgbAt(0));
    expect(Array.from(rgba.slice(12, 15))).toEqual(rgbAt(255));
    expect(rgba[3]).toBe(255);
  });

  it("makes NaN transparent", () => {
    expect(Array.from(colorize(new Float32Array([NaN]), lut, [0, 1]))).toEqual([0, 0, 0, 0]);
  });
});

describe("cssGradient", () => {
  it("builds a left-to-right gradient", () => {
    expect(cssGradient("Viridis", 2)).toMatch(/^linear-gradient\(to right, .+, .+\)$/);
  });
});
