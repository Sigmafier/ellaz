// Card-only techniques: real, worth listing, not sampled in milestone 1
// because each is blocked on something outside the repo.

import type { Technique } from "./types";

export const aiCleaned: Technique = {
  id: "ai-cleaned",
  name: "AI-generated, then cleaned",
  input: "an image model prompt batch, palette-snapped and hand-culled",
  costPerAnimation: "one prompt batch per pose, plus the cull",
  summary: "Generate a batch, snap every image to the game palette, cut the ones with the wrong number of fingers, and trace the survivors into ops. Fast for concept variety, slow for consistency: two frames of one character rarely agree. Blocked on a provider and its commercial licence.",
  sample: null,
  blockedOn: "operator decision: which image provider, and its commercial licence (plan section 14)",
};

export const kidDrawings: Technique = {
  id: "kid-drawings",
  name: "Kid drawings, scanned",
  input: "real crayon drawings, photographed and cut out",
  costPerAnimation: "one drawing per frame (a child draws the walk)",
  summary: "Photograph real drawings, cut them out, and use them as parts on the rig or as whole frames. Pairs with the crayon and paper styles for free, and is the one technique that produces art nobody could fake. Blocked on photographs.",
  sample: null,
  blockedOn: "two or three real drawings to photograph (plan section 14)",
};

export const runtimeShader: Technique = {
  id: "runtime-shader",
  name: "Runtime style shader",
  input: "one neutral sprite; the style is applied at draw time",
  costPerAnimation: "zero - the engine restyles every frame live",
  summary: "Ship one flat sprite and let a shader pixelate, outline or paper-grain it at draw time, so a style is a toggle rather than an export. Engine-specific (a WebGL pipeline in Phaser, a canvas shader in Godot) and outside the neutral contract, so it stays a card until a game wants it.",
  sample: null,
  blockedOn: "engine-specific; belongs beside the adapter for the engine that first wants it",
};
