import type { Catalog } from "../data/catalog";

export interface Selection {
  var: string;
  scn: string;
  m: number; // 0-based month; kept while a month-less variable is shown so it can be restored
}

/** Read ?var&scn&m, falling back to catalog defaults for anything unknown or unavailable. */
export function parseSelection(search: string, catalog: Catalog): Selection {
  const q = new URLSearchParams(search);
  const d = catalog.defaults;
  const v = q.get("var") ?? "";
  const s = q.get("scn") ?? "";
  const m = Number(q.get("m"));
  return {
    var: v in catalog.variables ? v : d.var,
    scn: catalog.scenarios[s]?.store ? s : d.scn,
    m: q.has("m") && Number.isInteger(m) && m >= 0 && m < catalog.months.length ? m : d.m,
  };
}

/** Query string for a selection; `m` only when the variable has a month dimension. */
export function serializeSelection(sel: Selection, catalog: Catalog): string {
  const q = new URLSearchParams({ var: sel.var, scn: sel.scn });
  if (catalog.variables[sel.var]?.month) q.set("m", String(sel.m));
  return `?${q}`;
}
