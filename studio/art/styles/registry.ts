// The single list of styles. Everything that enumerates styles - the
// gallery, the exporter, the recipe gate, the render-smoke gate - reads this
// and nothing else, so a style added here is in scope everywhere at once.
//
// Order is the gallery order: the four the operator picked first.
//
// Seven styles were deleted for good on 2026-09-05 by beetle notes on the
// gallery (mosaic first, then voxel, nes, watercolor, sticker, hibit, crt).
// They are `rejected mood` rows in the taste ledger; do not re-propose them.

import type { Style } from "./types";
import { render as snes16 } from "./snes16/render";
import { render as flat } from "./flat/render";
import { render as paper } from "./paper/render";
import { render as crayon } from "./crayon/render";
import { render as gameboy } from "./gameboy/render";
import { render as clay } from "./clay/render";
import { render as onebit } from "./onebit/render";
import { render as pico8 } from "./pico8/render";
import { render as c64 } from "./c64/render";
import { render as spectrum } from "./spectrum/render";
import { render as ega16 } from "./ega16/render";
import { render as vga256 } from "./vga256/render";
import { render as neogeo } from "./neogeo/render";
import { render as isopixel } from "./isopixel/render";
import { render as chunky32 } from "./chunky32/render";
import { render as prerender } from "./prerender/render";
import { render as rotoscope } from "./rotoscope/render";
import { render as hd2d } from "./hd2d/render";
import { render as brawler80 } from "./brawler80/render";

export const STYLES: Style[] = [
  { id: "snes16", name: "SNES 16-bit", tier: "full", family: "pixel", tagline: "5px cells, a dark outline, flat fills - the classic 16-bit sprite", render: snes16 },
  { id: "flat", name: "Flat vector + long shadow", tier: "full", family: "vector", tagline: "crisp flat shapes casting a stepped 45-degree shadow", render: flat },
  { id: "paper", name: "Paper cut-out", tier: "full", family: "craft", tagline: "card-stock pieces glued down a degree off true, with a soft shadow", render: paper },
  { id: "crayon", name: "Crayon doodle", tier: "full", family: "paint", tagline: "wobbly crayon fills and dark strokes on lined notebook paper", render: crayon },
  { id: "gameboy", name: "Game Boy", tier: "card", family: "pixel", tagline: "four green shades; the cast takes the dark two", render: gameboy },
  { id: "clay", name: "Clay / soft 3D", tier: "card", family: "craft", tagline: "soft shadows, rim light, rounded plasticine forms", render: clay },
  // The pixel family, rendered 2026-09-05 from the ledger's backlog; cards until the operator keeps them.
  { id: "onebit", name: "1-bit", tier: "card", family: "pixel", tagline: "ink or paper, every mid-tone a checkerboard", render: onebit },
  { id: "pico8", name: "Fantasy-console 16 colours", tier: "card", family: "pixel", tagline: "the fixed sixteen, snapped, lightly dithered", render: pico8 },
  { id: "c64", name: "C64 multicolour", tier: "card", family: "pixel", tagline: "double-wide pixels in the sixteen Commodore colours", render: c64 },
  { id: "spectrum", name: "Attribute-clash 8x8", tier: "card", family: "pixel", tagline: "two colours per 8x8 block, and the spill at every border", render: spectrum },
  { id: "ega16", name: "EGA 16-colour", tier: "card", family: "pixel", tagline: "sixteen RGBI primaries with a crosshatch between them", render: ega16 },
  { id: "vga256", name: "VGA painterly", tier: "card", family: "pixel", tagline: "shaded ramps in a 216-colour cube, no outline", render: vga256 },
  { id: "neogeo", name: "Arcade hand-drawn", tier: "card", family: "pixel", tagline: "banded ramps, a rim, a black contour, big sprites", render: neogeo },
  { id: "isopixel", name: "Isometric pixel", tier: "card", family: "pixel", tagline: "the cast sheared onto a diamond-grid ground", render: isopixel },
  { id: "chunky32", name: "Chunky 32x32", tier: "card", family: "pixel", tagline: "10px cells; a figure is nine cells tall", render: chunky32 },
  { id: "prerender", name: "Pre-rendered to pixel", tier: "card", family: "pixel", tagline: "plastic shading quantised to a sprite, no outline", render: prerender },
  { id: "rotoscope", name: "Rotoscoped pixel", tier: "card", family: "pixel", tagline: "eight muted tones, no outline, traced-film proportions", render: rotoscope },
  { id: "hd2d", name: "Pixel sprites in a lit scene", tier: "card", family: "pixel", tagline: "a blurred lit diorama behind a crisp outlined cast", render: hd2d },
  { id: "brawler80", name: "80px brawler", tier: "card", family: "pixel", tagline: "a four-tone outlined cast on a dimmer painted street", render: brawler80 },
];

export const STYLE_IDS = STYLES.map((s) => s.id);
export const styleById = (id: string): Style | undefined => STYLES.find((s) => s.id === id);
export const FULL_STYLES = STYLES.filter((s) => s.tier === "full");
