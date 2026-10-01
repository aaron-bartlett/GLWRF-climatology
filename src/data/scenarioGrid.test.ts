import { describe, expect, it } from "vitest";
import type { Catalog } from "./catalog";
import { scenarioGrid } from "./scenarioGrid";

const scn = (ssp: string, period: string, years: string) => ({
  label: `${ssp} ${period}`, ssp, ssp_label: ssp.toUpperCase(), period, period_label: `P-${period}`, years, store: null,
});

const catalog = {
  scenarios: {
    historical: { label: "Historical", years: "2005–2014", store: "v1/historical.zarr" },
    a_mid: scn("a", "mid", "2045–2054"),
    a_late: scn("a", "late", "2085–2094"),
    b_mid: scn("b", "mid", "2045–2054"),
    b_late: scn("b", "late", "2085–2094"),
  },
} as unknown as Catalog;

describe("scenarioGrid", () => {
  const g = scenarioGrid(catalog);

  it("puts scenarios without ssp/period in the baseline column", () => {
    expect(g.baselines).toEqual(["historical"]);
  });

  it("derives columns and rows in catalog order with display labels", () => {
    expect(g.periods).toEqual([
      { key: "mid", label: "P-mid", years: "2045–2054" },
      { key: "late", label: "P-late", years: "2085–2094" },
    ]);
    expect(g.ssps).toEqual([{ key: "a", label: "A" }, { key: "b", label: "B" }]);
  });

  it("finds the scenario at each grid position", () => {
    expect(g.cell("b", "late")).toBe("b_late");
    expect(g.cell("c", "late")).toBeUndefined();
  });
});
