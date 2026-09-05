import type { Palette } from "./types";
import ellaz from "./ellaz.json";
import snes16 from "./snes16.json";
import flat from "./flat.json";
import paper from "./paper.json";
import crayon from "./crayon.json";
import gameboy from "./gameboy.json";
import onebit from "./onebit.json";
import pico8 from "./pico8.json";
import ega16 from "./ega16.json";
import c64 from "./c64.json";
import spectrum from "./spectrum.json";

/** Every palette, in gallery order. The JSON files are the truth; this is the list. */
export const PALETTES: Palette[] = [ellaz, snes16, flat, paper, crayon, gameboy, onebit, pico8, ega16, c64, spectrum] as Palette[];
export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const paletteById = (id: string): Palette | undefined => PALETTES.find((p) => p.id === id);
export { toGpl, toHex, fromGpl, fromHex, validatePalette } from "./export";
export type { Palette, PaletteColor, PaletteRole } from "./types";
