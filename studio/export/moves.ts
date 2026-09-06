// The fight half of a character: a state graph over clip names with per-frame
// boxes, authored in the rig's body units (pivot at the feet, y down, so a
// box above the ground has a negative y) and converted to frame pixels of a
// given export exactly the way the manifest's hitbox is. Kept out of the
// sprite manifest on purpose: a game that does not fight never reads this.
// The shape is export/moves.schema.json; the LF2 study that chose it is
// docs/reference/little-fighter-2.md § What our manifest should borrow.

import type { FrameGeometry } from "./pack";

export interface Box { x: number; y: number; w: number; h: number }
export interface Vec { dx: number; dy: number }
export type HitKind = "hit" | "grab" | "shove";
export type HitEffect = "none" | "spark" | "dust" | "star";

export interface Hit {
  kind: HitKind;
  box: Box;
  damage: number;
  knock?: Vec;
  stun?: number;
  fall?: number;
  effect?: HitEffect;
}

export interface MoveFrame {
  wait?: number;
  bdy?: Box[];
  itr?: Hit[];
  push?: Box;
  impulse?: Vec;
}

export interface MoveState {
  clip: string;
  next?: string;
  on?: Record<string, string>;
  cancelFrom?: number;
  frames: MoveFrame[];
}

/** what a character authors: body units, pivot-relative */
export interface Moves {
  initial: string;
  inputs: string[];
  onHit: { light: string; heavy: string };
  states: Record<string, MoveState>;
}

/** what an export carries beside the atlas: the same graph in frame pixels */
export interface MovesFile extends Moves {
  character: string;
  style: string;
  scale: number;
}

/** a box in body units from grid cells (inclusive corners) of a pixel spec's drawing */
export function gridBox(origin: [number, number], unit: number): (c0: number, r0: number, c1: number, r1: number) => Box {
  const [oc, orow] = origin;
  return (c0, r0, c1, r1) => ({ x: (c0 - oc) * unit, y: (r0 - orow) * unit, w: (c1 - c0 + 1) * unit, h: (r1 - r0 + 1) * unit });
}

export function buildMovesFile(character: string, style: string, scale: number, geo: FrameGeometry, moves: Moves): MovesFile {
  const box = (b: Box): Box => ({ x: geo.pivot.x + b.x * scale, y: geo.pivot.y + b.y * scale, w: b.w * scale, h: b.h * scale });
  const vec = (v: Vec): Vec => ({ dx: v.dx * scale, dy: v.dy * scale });
  const states: Record<string, MoveState> = {};
  for (const [name, st] of Object.entries(moves.states)) {
    states[name] = {
      ...st,
      frames: st.frames.map((f) => ({
        ...(f.wait !== undefined ? { wait: f.wait } : {}),
        ...(f.bdy ? { bdy: f.bdy.map(box) } : {}),
        ...(f.itr ? { itr: f.itr.map((h) => ({ ...h, box: box(h.box), ...(h.knock ? { knock: vec(h.knock) } : {}) })) } : {}),
        ...(f.push ? { push: box(f.push) } : {}),
        ...(f.impulse ? { impulse: vec(f.impulse) } : {}),
      })),
    };
  }
  return { character, style, scale, initial: moves.initial, inputs: [...moves.inputs], onHit: { ...moves.onHit }, states };
}

/** the standard five-state graph every fighter shares; a character fills the boxes */
export function standardGraph(frames: { idle: MoveFrame[]; walk: MoveFrame[]; attack: MoveFrame[]; hurt: MoveFrame[]; ko: MoveFrame[] }): Moves {
  return {
    initial: "idle",
    inputs: ["move", "stop", "attack"],
    onHit: { light: "hurt", heavy: "ko" },
    states: {
      idle: { clip: "idle", on: { move: "walk", attack: "attack" }, frames: frames.idle },
      walk: { clip: "walk", on: { stop: "idle", attack: "attack" }, frames: frames.walk },
      attack: { clip: "attack", next: "idle", cancelFrom: 4, on: { attack: "attack" }, frames: frames.attack },
      hurt: { clip: "hurt", next: "idle", frames: frames.hurt },
      ko: { clip: "ko", frames: frames.ko },
    },
  };
}
