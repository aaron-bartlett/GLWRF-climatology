import { describe, expect, it } from "vitest";
import type { Catalog } from "../data/catalog";
import { parseSelection, serializeSelection } from "./urlState";

const catalog = {
  scenarios: {
    historical: { label: "Historical", years: "", store: "v1/historical.zarr" },
    ssp245_mid: { label: "", years: "", store: "v1/ssp245_mid.zarr" },
    ssp585_late: { label: "", years: "", store: null },
  },
  months: Array.from({ length: 12 }, (_, i) => `M${i}`),
  variables: {
    mean_T2: { label: "", units: "", colormap: "", range: [0, 1], month: true },
    snow_cover_days: { label: "", units: "", colormap: "", range: [0, 1], month: false },
  },
  defaults: { var: "mean_T2", scn: "historical", m: 0 },
} as unknown as Catalog;

describe("parseSelection", () => {
  it("reads a valid selection", () => {
    expect(parseSelection("?var=snow_cover_days&scn=ssp245_mid&m=6", catalog)).toEqual({
      var: "snow_cover_days", scn: "ssp245_mid", m: 6,
    });
  });

  it.each([
    ["empty", ""],
    ["unknown var and scenario", "?var=nope&scn=nope"],
    ["scenario without data", "?scn=ssp585_late"],
    ["month out of range", "?m=12"],
    ["negative month", "?m=-1"],
    ["fractional month", "?m=1.5"],
    ["non-numeric month", "?m=x"],
  ])("falls back to defaults: %s", (_, search) => {
    expect(parseSelection(search, catalog)).toEqual(catalog.defaults);
  });
});

describe("serializeSelection", () => {
  it("includes m for monthly variables", () => {
    expect(serializeSelection({ var: "mean_T2", scn: "historical", m: 6 }, catalog)).toBe(
      "?var=mean_T2&scn=historical&m=6",
    );
  });

  it("drops m for variables without a month dimension", () => {
    expect(serializeSelection({ var: "snow_cover_days", scn: "historical", m: 6 }, catalog)).toBe(
      "?var=snow_cover_days&scn=historical",
    );
  });

  it("round-trips", () => {
    const sel = { var: "mean_T2", scn: "ssp245_mid", m: 11 };
    expect(parseSelection(serializeSelection(sel, catalog), catalog)).toEqual(sel);
  });
});
