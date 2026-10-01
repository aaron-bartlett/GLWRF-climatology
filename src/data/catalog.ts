// catalog.json: the frontend's single source of selectable options (tech_stack.md §3.2).

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface Scenario {
  label: string;
  years: string;
  ssp?: string;
  ssp_label?: string;
  period?: string;
  period_label?: string;
  store: string | null; // null = not built yet; shown disabled
}

export interface Variable {
  label: string;
  group?: string; // section in the variable menu, e.g. "Temperature"
  units: string;
  colormap: string | string[]; // d3 scheme name (optional "_r"), or hex color stops from low to high
  range: [number, number];
  month: boolean;
}

export interface Catalog {
  version: string;
  dataset: string;
  bounds: Bounds;
  grid: { crs: string; width: number; height: number };
  scenarios: Record<string, Scenario>;
  months: string[];
  variables: Record<string, Variable>;
  defaults: { var: string; scn: string; m: number };
}

export const DATA_BASE_URL: string = import.meta.env.VITE_DATA_BASE_URL;

/** Throws with a readable message if the catalog can't drive the UI. */
export function validateCatalog(c: Catalog): Catalog {
  const fail = (msg: string) => {
    throw new Error(`Invalid catalog.json: ${msg}`);
  };
  for (const k of ["west", "south", "east", "north"] as const) {
    if (typeof c.bounds?.[k] !== "number") fail(`bounds.${k} missing`);
  }
  if (!c.variables || !Object.keys(c.variables).length) fail("no variables");
  if (!c.scenarios || !Object.keys(c.scenarios).length) fail("no scenarios");
  for (const [k, v] of Object.entries(c.variables)) {
    if (!(v.range?.length === 2 && v.range[0] < v.range[1])) fail(`variables.${k}.range`);
  }
  const d = c.defaults;
  if (!c.variables[d?.var]) fail("defaults.var not in variables");
  if (!c.scenarios[d.scn]?.store) fail("defaults.scn has no store");
  if (!(d.m >= 0 && d.m < c.months.length)) fail("defaults.m out of range");
  return c;
}

export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch(`${DATA_BASE_URL}/v1/catalog.json`);
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`);
  return validateCatalog(await res.json());
}
