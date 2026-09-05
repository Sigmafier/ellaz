// The contract every style module fulfils. One file per style, one function,
// no state: `render(scene, opts)` returns a fresh canvas of the scene's size.

import type { Canvas2D } from "../canvas";
import type { Scene } from "../scene-ops";

export interface RenderOpts {
  /**
   * Seed for any jitter or grain. Defaults to `<style>:<scene id>` so the
   * same scene renders the same bytes every time - a diff means the art
   * changed, never the dice.
   */
  seed?: string;
  /**
   * Sprite mode: a style that normally paints a page (paper, crayon,
   * watercolor, voxel ground) leaves the canvas transparent
   * instead, so the export can sit on any background.
   */
  transparent?: boolean;
}

export type Renderer = (scene: Scene, opts?: RenderOpts) => Canvas2D;

export type StyleTier = "full" | "card";
export type StyleFamily = "pixel" | "vector" | "craft" | "paint";

export interface StyleMeta {
  /** stable id - a directory name, an export folder name, a game binding key. never renamed */
  id: string;
  name: string;
  /** "full" = complete recipe + tuned; "card" = one paragraph, ported as-is */
  tier: StyleTier;
  family: StyleFamily;
  /** one line for the gallery card */
  tagline: string;
}

export interface Style extends StyleMeta {
  render: Renderer;
}
