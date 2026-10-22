import type { Catalog } from "../data/catalog";

export interface Selection {
  var: string;
  scn: string;
  scn2: string | null; // right-hand scenario in the side-by-side view; null = single map
  m: number; // 0-based month; kept while a month-less variable is shown so it can be restored
  local: boolean; // colormap range from the field(s) on screen instead of the catalog range
}

/** Read ?var&scn&scn2&m&cmap, falling back to catalog defaults for anything unknown or unavailable. */
export function parseSelection(search: string, catalog: Catalog): Selection {
  const q = new URLSearchParams(search);
  const d = catalog.defaults;
  const v = q.get("var") ?? "";
  const s = q.get("scn") ?? "";
  const s2 = q.get("scn2") ?? "";
  const m = Number(q.get("m"));
  return {
    var: v in catalog.variables ? v : d.var,
    scn: catalog.scenarios[s]?.store ? s : d.scn,
    scn2: catalog.scenarios[s2]?.store ? s2 : null,
    m: q.has("m") && Number.isInteger(m) && m >= 0 && m < catalog.months.length ? m : d.m,
    local: q.get("cmap") === "local",
  };
}

/** Query string for a selection; `m` only when the variable has a month dimension, `scn2` and `cmap` only when set. */
export function serializeSelection(sel: Selection, catalog: Catalog): string {
  const variable = catalog.variables[sel.var];
  const q = new URLSearchParams({ var: sel.var, scn: sel.scn });
  if (sel.scn2) q.set("scn2", sel.scn2);
  if (variable?.month) q.set("m", String(sel.m));
  if (sel.local && !variable?.categories) q.set("cmap", "local");
  return `?${q}`;
}
