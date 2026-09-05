// The single list of styles. Everything that enumerates styles - the
// gallery, the exporter, the recipe gate, the render-smoke gate - reads this
// and nothing else, so a style added here is in scope everywhere at once.
//
// Order is the gallery order: the four the operator picked first.

import type { Style } from "./types";
import { render as snes16 } from "./snes16/render";
import { render as flat } from "./flat/render";
import { render as paper } from "./paper/render";
import { render as crayon } from "./crayon/render";
import { render as nes } from "./nes/render";
import { render as gameboy } from "./gameboy/render";
import { render as hibit } from "./hibit/render";
import { render as crt } from "./crt/render";
import { render as voxel } from "./voxel/render";
import { render as sticker } from "./sticker/render";
import { render as clay } from "./clay/render";
import { render as watercolor } from "./watercolor/render";

export const STYLES: Style[] = [
  { id: "snes16", name: "SNES 16-bit", tier: "full", family: "pixel", tagline: "5px cells, a dark outline, flat fills - the classic 16-bit sprite", render: snes16 },
  { id: "flat", name: "Flat vector + long shadow", tier: "full", family: "vector", tagline: "crisp flat shapes casting a stepped 45-degree shadow", render: flat },
  { id: "paper", name: "Paper cut-out", tier: "full", family: "craft", tagline: "card-stock pieces glued down a degree off true, with a soft shadow", render: paper },
  { id: "crayon", name: "Crayon doodle", tier: "full", family: "paint", tagline: "wobbly crayon fills and dark strokes on lined notebook paper", render: crayon },
  { id: "nes", name: "NES 8-bit", tier: "card", family: "pixel", tagline: "9px cells and a snapped 8-bit palette", render: nes },
  { id: "gameboy", name: "Game Boy", tier: "card", family: "pixel", tagline: "four green shades; the cast takes the dark two", render: gameboy },
  { id: "hibit", name: "Hi-bit modern pixel", tier: "card", family: "pixel", tagline: "3px cells with shaded forms and no outline", render: hibit },
  { id: "crt", name: "CRT arcade", tier: "card", family: "pixel", tagline: "16-bit through a curved tube: bloom, scanlines, vignette", render: crt },
  { id: "voxel", name: "Voxel cubes", tier: "card", family: "vector", tagline: "the cast extruded into lit cubes on flat tiles", render: voxel },
  { id: "sticker", name: "Sticker book", tier: "card", family: "vector", tagline: "die-cut white borders and a glossy highlight", render: sticker },
  { id: "clay", name: "Clay / soft 3D", tier: "card", family: "craft", tagline: "soft shadows, rim light, rounded plasticine forms", render: clay },
  { id: "watercolor", name: "Watercolor storybook", tier: "card", family: "paint", tagline: "blurred translucent washes with a darker wet edge", render: watercolor },
];

export const STYLE_IDS = STYLES.map((s) => s.id);
export const styleById = (id: string): Style | undefined => STYLES.find((s) => s.id === id);
export const FULL_STYLES = STYLES.filter((s) => s.tier === "full");
