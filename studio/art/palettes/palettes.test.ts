import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTES, PALETTE_IDS, fromGpl, fromHex, paletteById, toGpl, toHex, validatePalette } from "./index";
import { FULL_STYLES } from "../styles/registry";

const HERE = new URL(".", import.meta.url).pathname;

describe("palette files", () => {
  it("every JSON in the directory is in the list, and vice versa", () => {
    const files = readdirSync(HERE).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
    expect(files).toEqual([...PALETTE_IDS].sort());
  });
  it("each file's id matches its filename and validates", () => {
    for (const p of PALETTES) expect(validatePalette(p), p.id).toEqual([]);
  });
  it("every full-tier style has a palette of its own id, and ellaz exists", () => {
    for (const s of FULL_STYLES) expect(paletteById(s.id), s.id).toBeDefined();
    expect(paletteById("ellaz")?.colors.map((c) => c.name)).toContain("raspberry");
  });
  it("the ellaz palette assigns every art-bible role at least once except disabled", () => {
    const roles = new Set(paletteById("ellaz")!.colors.map((c) => c.role).filter(Boolean));
    for (const r of ["player", "enemy", "interactable", "warning", "ground", "text"]) expect(roles.has(r as never), r).toBe(true);
  });
});

describe("validatePalette names every defect", () => {
  it("bad id, bad hex, duplicate name, bad role", () => {
    const out = validatePalette({ id: "Bad Id", name: "x", note: "", colors: [{ name: "a", hex: "#ff0000" }, { name: "a", hex: "#GG0000", role: "hero" as never }] });
    expect(out).toContainEqual(expect.stringContaining("not a lowercase slug"));
    expect(out).toContainEqual(expect.stringContaining('"#ff0000" is not #RRGGBB uppercase'));
    expect(out).toContainEqual(expect.stringContaining('"a" repeats'));
    expect(out).toContainEqual(expect.stringContaining('role "hero"'));
  });
  it("an empty palette is a defect, not a vacuous pass", () => {
    expect(validatePalette({ id: "e", name: "e", note: "", colors: [] })).toContainEqual(expect.stringContaining("no colors"));
  });
});

describe("gpl", () => {
  const p = paletteById("gameboy")!;
  it("has the GIMP header, one colour per line, tab before the name", () => {
    const g = toGpl(p);
    expect(g.startsWith("GIMP Palette\nName: Game Boy DMG\nColumns: 0\n")).toBe(true);
    expect(g).toContain(" 15  56  15\tdarkest (player)\n");
    expect(g).toContain("155 188  15\tlightest\n");
    expect(g.endsWith("\n")).toBe(true);
  });
  it("round-trips every palette byte-for-byte on hex, name and role", () => {
    for (const pal of PALETTES) {
      const back = fromGpl(toGpl(pal));
      expect(back.name).toBe(pal.name);
      expect(back.colors).toEqual(pal.colors.map((c) => (c.role ? { name: c.name, hex: c.hex, role: c.role } : { name: c.name, hex: c.hex })));
    }
  });
  it("refuses a file that is not a GIMP palette", () => expect(() => fromGpl("nope\n")).toThrow(/first line/));
});

describe("hex", () => {
  it("is lowercase rrggbb per line, no hash, trailing newline", () => {
    expect(toHex(paletteById("gameboy")!)).toBe("0f380f\n306230\n8bac0f\n9bbc0f\n");
  });
  it("round-trips the colour list of every palette", () => {
    for (const pal of PALETTES) expect(fromHex(toHex(pal))).toEqual(pal.colors.map((c) => c.hex));
  });
});
