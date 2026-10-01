import { describe, expect, it } from "vitest";
import type { Catalog } from "./catalog";
import { variableGroups } from "./variableGroups";

const v = (group?: string) => ({ label: "", units: "", colormap: "", range: [0, 1], month: true, group });

describe("variableGroups", () => {
  it("groups adjacent variables by section in catalog order", () => {
    const catalog = { variables: { a: v("Temperature"), b: v("Temperature"), c: v("Snowfall"), d: v() } } as unknown as Catalog;
    expect(variableGroups(catalog)).toEqual([
      { label: "Temperature", keys: ["a", "b"] },
      { label: "Snowfall", keys: ["c"] },
      { label: "", keys: ["d"] },
    ]);
  });
});
