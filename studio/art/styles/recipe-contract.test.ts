import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STYLES } from "./registry";
import contract from "./recipe-contract.json";

// The gate (scripts/assert-recipe-headings.mjs) cannot import registry.ts, so it
// parses the tier out of the source with a regex. This pins that parse to the
// real registry: if a row's shape changes, this reds before the gate silently
// reads zero rows - which it also refuses, but a red here names the cause.
describe("recipe contract", () => {
  it("has nine headings, Sample last", () => {
    expect(contract.headings).toHaveLength(9);
    expect(contract.headings[0]).toBe("Look");
    expect(contract.headings.at(-1)).toBe("Sample");
  });
  it("the gate's regex reads every registry row's id and tier", () => {
    const src = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
    const parsed = new Map<string, string>();
    for (const m of src.matchAll(/\{\s*id:\s*"([a-z0-9]+)"[^}]*?tier:\s*"(full|card)"/g)) parsed.set(m[1], m[2]);
    expect([...parsed.entries()].sort()).toEqual(STYLES.map((s) => [s.id, s.tier] as [string, string]).sort());
  });
});
