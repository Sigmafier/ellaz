import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAMES } from "./index";
import { STYLE_IDS } from "../styles/registry";
import { PALETTE_IDS } from "../palettes";
import { TECHNIQUE_IDS } from "../techniques";
import { SCENE_IDS } from "../scenes";
import { CHARACTER_IDS } from "../characters";

describe("game bindings", () => {
  it("every JSON in the directory is in the list", () => {
    const files = readdirSync(new URL(".", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
    expect(files).toEqual(GAMES.map((g) => g.id).sort());
  });
  for (const g of GAMES) {
    it(`${g.id} points only at things that exist`, () => {
      expect(STYLE_IDS).toContain(g.style);
      for (const s of g.candidateStyles) expect(STYLE_IDS, s).toContain(s);
      expect(g.candidateStyles).toContain(g.style);
      expect(PALETTE_IDS).toContain(g.palette);
      expect(TECHNIQUE_IDS).toContain(g.technique);
      expect(SCENE_IDS).toContain(g.scene);
      for (const c of g.cast) expect(CHARACTER_IDS, c).toContain(c);
      expect(g.scale).toBeGreaterThan(0);
      expect(g.decided).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  }
});
