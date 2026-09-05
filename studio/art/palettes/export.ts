// Palette exports: GIMP .gpl (Aseprite, GIMP, Krita, Pixelorama read it) and
// Lospec .hex (one rrggbb per line, no hash). Pure string functions, tested
// in node; export-all.mjs writes them to dist-export/palettes/.

import { ROLES, type Palette, type PaletteColor } from "./types";

const HEX = /^#[0-9A-F]{6}$/;

/** Every reason a palette is malformed; empty = valid. */
export function validatePalette(p: Palette): string[] {
  const out: string[] = [];
  if (!/^[a-z0-9]+$/.test(p.id)) out.push(`palette id "${p.id}" is not a lowercase slug`);
  if (!p.name) out.push(`palette ${p.id}: no name`);
  if (!p.colors?.length) out.push(`palette ${p.id}: no colors`);
  const names = new Set<string>();
  for (const c of p.colors ?? []) {
    if (!/^[a-z][A-Za-z0-9]*$/.test(c.name)) out.push(`palette ${p.id}: colour name "${c.name}" is not camelCase`);
    if (names.has(c.name)) out.push(`palette ${p.id}: colour name "${c.name}" repeats`);
    names.add(c.name);
    if (!HEX.test(c.hex)) out.push(`palette ${p.id}: "${c.name}" hex "${c.hex}" is not #RRGGBB uppercase`);
    if (c.role !== undefined && !ROLES.includes(c.role)) out.push(`palette ${p.id}: "${c.name}" role "${c.role}" is not one of ${ROLES.join(", ")}`);
  }
  return out;
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** GIMP palette. Columns 0 = let the tool decide. One colour per line: "R G B<tab>name". */
export function toGpl(p: Palette): string {
  const lines = ["GIMP Palette", `Name: ${p.name}`, "Columns: 0", `# ${p.note}`.slice(0, 200), "#"];
  for (const c of p.colors) {
    const [r, g, b] = rgb(c.hex);
    lines.push(`${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${c.name}${c.role ? ` (${c.role})` : ""}`);
  }
  return lines.join("\n") + "\n";
}

/** Lospec .hex: lowercase rrggbb, one per line, no hash, no names. */
export function toHex(p: Palette): string {
  return p.colors.map((c) => c.hex.slice(1).toLowerCase()).join("\n") + "\n";
}

/** Parse a .gpl back (for the round-trip test and for importing a tool's edit). */
export function fromGpl(text: string): { name: string; colors: PaletteColor[] } {
  const lines = text.split("\n");
  if (lines[0] !== "GIMP Palette") throw new Error("fromGpl: not a GIMP palette (first line)");
  const name = lines.find((l) => l.startsWith("Name: "))?.slice(6) ?? "";
  const colors: PaletteColor[] = [];
  for (const l of lines) {
    const m = l.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\t([A-Za-z0-9]+)(?: \((\w+)\))?$/);
    if (!m) continue;
    const hex = "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase();
    colors.push(m[5] ? { name: m[4], hex, role: m[5] as PaletteColor["role"] } : { name: m[4], hex });
  }
  return { name, colors };
}

export function fromHex(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => "#" + l.toUpperCase());
}
