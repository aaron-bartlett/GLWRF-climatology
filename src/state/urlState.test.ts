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
    basin: { label: "", units: "", colormap: [""], range: [1, 1], month: false, categories: [""], centers: [[0, 0]] },
  },
  defaults: { var: "mean_T2", scn: "historical", m: 0 },
} as unknown as Catalog;

describe("parseSelection", () => {
  it("reads a valid selection", () => {
    expect(parseSelection("?var=snow_cover_days&scn=ssp245_mid&m=6", catalog)).toEqual({
      var: "snow_cover_days", scn: "ssp245_mid", scn2: null, m: 6, local: false,
    });
  });

  it("reads the side-by-side scenario and local colormap", () => {
    expect(parseSelection("?scn2=ssp245_mid&cmap=local", catalog)).toMatchObject({ scn2: "ssp245_mid", local: true });
  });

  it.each([
    ["absent", ""],
    ["unknown", "?scn2=nope"],
    ["without data", "?scn2=ssp585_late"],
  ])("drops scn2 when %s", (_, search) => {
    expect(parseSelection(search, catalog).scn2).toBeNull();
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
    expect(parseSelection(search, catalog)).toEqual({ ...catalog.defaults, scn2: null, local: false });
  });
});

describe("serializeSelection", () => {
  it("includes m for monthly variables", () => {
    expect(serializeSelection({ var: "mean_T2", scn: "historical", scn2: null, m: 6, local: false }, catalog)).toBe(
      "?var=mean_T2&scn=historical&m=6",
    );
  });

  it("drops m for variables without a month dimension", () => {
    expect(serializeSelection({ var: "snow_cover_days", scn: "historical", scn2: null, m: 6, local: false }, catalog)).toBe(
      "?var=snow_cover_days&scn=historical",
    );
  });

  it("writes scn2 and cmap only when set, and no local range for categorical variables", () => {
    const sel = { var: "mean_T2", scn: "historical", scn2: "ssp245_mid", m: 0, local: true };
    expect(serializeSelection(sel, catalog)).toBe("?var=mean_T2&scn=historical&scn2=ssp245_mid&m=0&cmap=local");
    expect(serializeSelection({ ...sel, var: "basin" }, catalog)).toBe("?var=basin&scn=historical&scn2=ssp245_mid");
  });

  it("round-trips", () => {
    const sel = { var: "mean_T2", scn: "ssp245_mid", scn2: "historical", m: 11, local: true };
    expect(parseSelection(serializeSelection(sel, catalog), catalog)).toEqual(sel);
  });
});
