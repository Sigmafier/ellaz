// What an engine cell IS, in types only. Every arm of the tournament
// implements this and nothing else, and the one harness (run-cell.ts) drives
// it. Note what is absent: no update, no step, no dt - a cell has no method
// through which it could advance the simulation. It loads, it draws what the
// draw plan says, it reports its input and its stats. That absence is the
// structural guarantee that seven arms run one program.

import type { Tape } from "../sim/tape";
import type { InputFrame } from "../sim/types";
import type { BoxOp, DrawPlan, HudModel, PropOp, ShadowOp, SpriteOp } from "../sim/view";

/** where a sprite set's four files live, as URLs the cell can fetch or hand to its loader */
export interface SpriteSetRef { name: string; png: string; atlas: string; manifest: string }

/** the arena's art, already interpreted into flat rectangles by shared/arena.ts */
export interface RectArenaOp { kind: "rect"; x: number; y: number; w: number; h: number; color: string }
/** a whole painted frame of a loaded set with its TOP-LEFT at (x, y), at the cell's one draw scale: a dungeon room's picture, drawn under everything (2026-09-13, the third kind) */
export interface FrameArenaOp { kind: "frame"; set: string; frame: string; x: number; y: number }
export type ArenaDrawOp = RectArenaOp | FrameArenaOp;

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

/** a live input for one side, polled once per tick; `I` is one tick's input in the kind's own shape */
export interface InputPoll<I> {
  read(side: number): I;
  detach(): void;
}

/** the two halves of an arena file a cell page reads: the box the cell mounts at and the art the painter interprets; a kind whose picture is not the painter's (a dungeon room's frame) hands the loop its own `ops` instead */
export interface ArenaForCell { view: { w: number; h: number }; world?: { w: number }; art: unknown; ops?: ArenaDrawOp[] }

/**
 * One KIND of simulation the harness can drive - the fight's (cells/kinds/fight.ts)
 * or a turn machine's. The loop in run-cell.ts owns the clock, the tape, the
 * hash chain, the fx and the draw order, and it calls exactly these; a kind
 * supplies pure functions and never sees a frame. The proof that the seam is
 * clean is that the fight's goldens print identical through it.
 *
 * L is what the kind's http loader returns, D its compiled data, S its state,
 * I one player's input for one tick, E one event. Every method is total: a
 * kind that cannot answer (no tape input shape, no arena) throws naming why.
 */
export interface SimKind<L, D, S, I, E extends { kind: string }> {
  readonly id: string;
  /** fetch `mode`'s data under `root` (the browser twin of the disk loader) */
  load(root: string, mode: string): Promise<L>;
  compile(loaded: L): D;
  /** the sprite set names the cell must load before the first frame */
  sets(loaded: L): string[];
  arena(loaded: L): ArenaForCell;
  create(data: D): S;
  step(state: S, inputs: readonly I[], data: D): S;
  hashState(state: S): string;
  hashEvents(events: readonly E[]): string;
  tick(state: S): number;
  /** the events `state` produced on its tick (consumed by fx and the event hash, never re-read) */
  events(state: S): readonly E[];
  /** how many sides the loop polls or reads off the tape each tick */
  players(state: S): number;
  inputsAt(tape: Tape<I>, tick: number, players: number): I[];
  view(prev: S, next: S, alpha256: number, data: D, boxes: boolean): DrawPlan;
  /** the live sources for a run with no tape, merged into one poll */
  attachInput(host: HTMLElement, data: D): InputPoll<I>;
  /** extra window fields a page or a headless probe reads (the fight's `__fightStage`) */
  publish(state: S): Record<string, unknown>;
}

/** what a cell's main.ts passes to runCell: where the data lives, which mode to play, and which kind of sim plays it */
export interface CellOptions<L = unknown, D = unknown, S = unknown, I = unknown, E extends { kind: string } = { kind: string }> {
  /** base URL holding data/ and assets/ (relative, e.g. "../.." from a built cell page) */
  root: string;
  mode: string;
  /** a tick tape name under the game's tapes/ to replay instead of live input */
  tape?: string;
  /** draw bdy / itr / push boxes */
  boxes?: boolean;
  /** stop after this many ticks (a tape run stops at its own length) */
  ticks?: number;
  /** the simulation to run; absent means the fight's */
  kind?: SimKind<L, D, S, I, E>;
}
