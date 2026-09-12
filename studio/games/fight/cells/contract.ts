// What an engine cell IS, in types only. Every arm of the tournament
// implements this and nothing else, and the one harness (run-cell.ts) drives
// it. Note what is absent: no update, no step, no dt - a cell has no method
// through which it could advance the simulation. It loads, it draws what the
// draw plan says, it reports its input and its stats. That absence is the
// structural guarantee that seven arms run one program.

import type { InputFrame } from "../core/types";
import type { BoxOp, HudModel, PropOp, ShadowOp, SpriteOp } from "../core/view";

/** where a sprite set's four files live, as URLs the cell can fetch or hand to its loader */
export interface SpriteSetRef { name: string; png: string; atlas: string; manifest: string }

/** the arena's art, already interpreted into flat rectangles by shared/arena.ts */
export interface ArenaDrawOp { kind: "rect"; x: number; y: number; w: number; h: number; color: string }

/** a particle this frame, from shared/fx.ts's own little sim (never the core's rng) */
export interface FxOp { kind: "dot" | "star" | "ring"; x: number; y: number; r: number; color: string; alpha: number }

export interface CellStats {
  engine: string;            // "canvas", "phaser4", ...
  version: string;           // the library version the bundle carries, "-" for canvas
  drawn: number;             // sprites drawn since mount - equal work across arms
  backbuffer: [number, number];
  dpr: number;
  samples: number | null;    // MSAA samples for a GL arm, null for 2D
}

export interface Cell {
  readonly id: string;
  /** decode the sheets, build whatever the engine needs per frame name; resolve when drawable */
  load(sets: SpriteSetRef[]): Promise<void>;
  /** attach the engine's canvas to `host` at the logical view size; the harness sizes the CSS */
  mount(host: HTMLElement, view: { w: number; h: number }): void;
  /** the buttons this side is holding right now (keyboard, touch); bypassed during a tape run */
  readInput(side: number): InputFrame;
  beginFrame(camX: number, shakeX: number, shakeY: number): void;
  drawArena(ops: readonly ArenaDrawOp[]): void;
  drawShadow(op: ShadowOp): void;
  /** the coins, as the flat rects shared/props.ts hands over; above the shadows, below the sprites */
  drawProps(ops: readonly PropOp[]): void;
  /** draw `frame` of `set` with its pivot at (x, y), flipped when asked; nearest-neighbour, one draw scale */
  drawSprite(op: SpriteOp): void;
  drawFx(ops: readonly FxOp[]): void;
  drawHud(model: HudModel): void;
  drawBoxes(boxes: readonly BoxOp[]): void;
  endFrame(): void;
  stats(): CellStats;
}

/** what a cell's main.ts passes to runCell: where the data lives and which mode to play */
export interface CellOptions {
  /** base URL holding data/ and assets/ (relative, e.g. "../.." from a built cell page) */
  root: string;
  mode: string;
  /** a tick tape name under the game's tapes/ to replay instead of live input */
  tape?: string;
  /** draw bdy / itr / push boxes */
  boxes?: boolean;
  /** stop after this many ticks (a tape run stops at its own length) */
  ticks?: number;
}
