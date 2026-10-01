import { describe, expect, it } from "vitest";
import { cellAt } from "./projection";

const bounds = { west: -96, south: 38, east: -71, north: 52 };

describe("cellAt", () => {
  it("maps the corners to the corner cells", () => {
    expect(cellAt(-95.999, 51.999, bounds, 196, 152)).toEqual({ row: 0, col: 0 });
    expect(cellAt(-71.001, 38.001, bounds, 196, 152)).toEqual({ row: 151, col: 195 });
  });

  it("uses Mercator spacing in y, not linear latitude", () => {
    // The latitude midpoint (45°) lies south of the Mercator midpoint, so its row is past half.
    expect(cellAt(-83.5, 45, bounds, 196, 152)!.row).toBeGreaterThan(76);
  });

  it("returns null outside the grid", () => {
    expect(cellAt(-100, 45, bounds, 196, 152)).toBeNull();
    expect(cellAt(-80, 52.5, bounds, 196, 152)).toBeNull();
    expect(cellAt(-71, 45, bounds, 196, 152)).toBeNull(); // east edge is exclusive
  });
});
