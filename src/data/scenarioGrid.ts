import type { Catalog } from "./catalog";

export interface ScenarioGrid {
  baselines: string[]; // scenarios with no ssp/period (historical), shown left of the grid
  periods: { key: string; label: string; years: string }[]; // columns
  ssps: { key: string; label: string }[]; // rows
  cell: (ssp: string, period: string) => string | undefined; // scenario key at a grid position
}

/** Lay out scenarios as baseline column(s) + an ssp × period grid, in catalog order. */
export function scenarioGrid(catalog: Catalog): ScenarioGrid {
  const baselines: string[] = [];
  const periods: ScenarioGrid["periods"] = [];
  const ssps: ScenarioGrid["ssps"] = [];
  const cells = new Map<string, string>();
  for (const [key, s] of Object.entries(catalog.scenarios)) {
    if (!s.ssp || !s.period) {
      baselines.push(key);
      continue;
    }
    if (!periods.some((p) => p.key === s.period)) {
      periods.push({ key: s.period, label: s.period_label ?? s.period, years: s.years });
    }
    if (!ssps.some((p) => p.key === s.ssp)) ssps.push({ key: s.ssp, label: s.ssp_label ?? s.ssp });
    cells.set(`${s.ssp}/${s.period}`, key);
  }
  return { baselines, periods, ssps, cell: (ssp, period) => cells.get(`${ssp}/${period}`) };
}
