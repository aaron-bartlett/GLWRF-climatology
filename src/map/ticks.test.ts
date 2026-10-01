import { describe, expect, it } from "vitest";
import { formatLat, formatLon, graticule, niceTicks } from "./ticks";

describe("niceTicks", () => {
  it("picks round steps inside the range", () => {
    expect(niceTicks(-20, 25)).toEqual([-20, -10, 0, 10, 20]);
    expect(niceTicks(0, 200)).toEqual([0, 50, 100, 150, 200]);
    expect(niceTicks(0, 2.15)).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});

describe("graticule", () => {
  it("lists whole 5° lines strictly inside the domain", () => {
    expect(graticule({ west: -95.9, south: 38.04, east: -71.08, north: 51.6 })).toEqual({
      lons: [-95, -90, -85, -80, -75],
      lats: [40, 45, 50],
    });
  });
});

describe("format", () => {
  it("labels hemispheres", () => {
    expect(formatLon(-85)).toBe("85°W");
    expect(formatLat(45)).toBe("45°N");
  });
});
