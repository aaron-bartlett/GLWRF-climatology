import { describe, expect, it } from "vitest";
import { validateCatalog, type Catalog } from "./catalog";

const valid = (): Catalog => ({
  version: "v1",
  dataset: "GL-WRF",
  bounds: { west: -96, south: 38, east: -71, north: 52 },
  grid: { crs: "EPSG:3857", width: 2, height: 2 },
  scenarios: {
    historical: { label: "historical", years: "2005–2014", store: "v1/historical.zarr" },
    ssp245_mid: { label: "ssp245 midcentury", ssp: "ssp245", period: "midcentury", years: "2045–2054", store: null },
  },
  months: ["Jan", "Feb"],
  variables: { mean_T2: { label: "Mean T2", units: "°C", colormap: "RdBu_r", range: [-20, 25], month: true } },
  defaults: { var: "mean_T2", scn: "historical", m: 0 },
});

describe("validateCatalog", () => {
  it("accepts a valid catalog", () => {
    expect(validateCatalog(valid())).toBeTruthy();
  });

  it.each<[string, (c: Catalog) => void]>([
    ["missing bound", (c) => delete (c.bounds as Partial<Catalog["bounds"]>).north],
    ["inverted range", (c) => (c.variables.mean_T2.range = [5, 1])],
    ["unknown default var", (c) => (c.defaults.var = "nope")],
    ["default scenario without store", (c) => (c.defaults.scn = "ssp245_mid")],
    ["default month out of range", (c) => (c.defaults.m = 2)],
  ])("rejects %s", (_, mutate) => {
    const c = valid();
    mutate(c);
    expect(() => validateCatalog(c)).toThrow(/Invalid catalog/);
  });
});
