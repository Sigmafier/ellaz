import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FULL_STYLES, STYLES, STYLE_IDS, styleById } from "./registry";

const HERE = new URL(".", import.meta.url).pathname;

describe("style registry", () => {
  it("has thirteen styles with unique ids", () => {
    expect(STYLES).toHaveLength(13);
    expect(new Set(STYLE_IDS).size).toBe(13);
  });
  it("the four picked styles are the full tier, in that order", () => {
    expect(FULL_STYLES.map((s) => s.id)).toEqual(["snes16", "flat", "paper", "crayon"]);
  });
  it("every id is a directory holding render.ts, and every such directory is registered", () => {
    // both directions: a directory without a row is invisible to every gate;
    // a row without a directory is a broken import somebody will hit later
    const dirs = readdirSync(HERE, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    expect(dirs).toEqual([...STYLE_IDS].sort());
    for (const id of STYLE_IDS) expect(existsSync(join(HERE, id, "render.ts"))).toBe(true);
  });
  it("ids are stable slugs: lowercase letters and digits only", () => {
    for (const id of STYLE_IDS) expect(id).toMatch(/^[a-z0-9]+$/);
  });
  it("lookup by id", () => {
    expect(styleById("paper")?.name).toBe("Paper cut-out");
    expect(styleById("nope")).toBeUndefined();
  });
});
