import type { Catalog } from "./catalog";

/** Variables as menu sections, in catalog order; ungrouped variables get a section with an empty label. */
export function variableGroups(catalog: Catalog): { label: string; keys: string[] }[] {
  const groups: { label: string; keys: string[] }[] = [];
  for (const [key, v] of Object.entries(catalog.variables)) {
    const label = v.group ?? "";
    const last = groups.at(-1);
    if (last?.label === label) last.keys.push(key);
    else groups.push({ label, keys: [key] });
  }
  return groups;
}
