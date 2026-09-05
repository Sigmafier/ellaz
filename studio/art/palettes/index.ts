import type { Palette } from "./types";
import ellaz from "./ellaz.json";
import snes16 from "./snes16.json";
import flat from "./flat.json";
import paper from "./paper.json";
import crayon from "./crayon.json";
import gameboy from "./gameboy.json";
import nes from "./nes.json";

/** Every palette, in gallery order. The JSON files are the truth; this is the list. */
export const PALETTES: Palette[] = [ellaz, snes16, flat, paper, crayon, gameboy, nes] as Palette[];
export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const paletteById = (id: string): Palette | undefined => PALETTES.find((p) => p.id === id);
export { toGpl, toHex, fromGpl, fromHex, validatePalette } from "./export";
export type { Palette, PaletteColor, PaletteRole } from "./types";
