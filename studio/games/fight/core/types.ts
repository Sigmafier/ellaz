// The fight core's whole vocabulary. Every other file under core/ imports from
// here and from its siblings, and NOTHING outside core/ - the manifest and
// moves types are RE-DECLARED below (the precedent is adapters/manifest.ts)
// so the core can be moved into a game with `git mv` and no studio import.
//
// Units. Positions, velocities and every timer are INTEGERS: world pixels in
// 1/256 (FP) at TICK_RATE ticks per second. The draw scale is a rational
// {num, den} from the arena file; 0.2 is not representable in binary floating
// point and is never multiplied by. See fixed.ts for the one division.

export const FP = 256;
export const TICK_RATE = 60;

// ---- what the studio exports (re-declared, plain JSON) ----------------------

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Vec { dx: number; dy: number }

export interface Manifest {
  character: string;
  style: string;
  scale: number;
  frameSize: { w: number; h: number };
  pivot: Point;
  animations: Record<string, { fps: number; loop: boolean; frames: string[] }>;
  hitbox: Rect;
}

export type HitKind = "hit" | "grab" | "shove";
export type HitEffect = "none" | "spark" | "dust" | "star";

export interface MovesHit { kind: HitKind; box: Rect; damage: number; knock?: Vec; stun?: number; fall?: number; effect?: HitEffect }
export interface MovesFrame { wait?: number; bdy?: Rect[]; itr?: MovesHit[]; push?: Rect; impulse?: Vec }
export interface MovesState { clip: string; next?: string; on?: Record<string, string>; cancelFrom?: number; frames: MovesFrame[] }
export interface MovesFile {
  character: string;
  style: string;
  scale: number;
  initial: string;
  inputs: string[];
  onHit: { light: string; heavy: string };
  states: Record<string, MovesState>;
}

// ---- the data files the game owns (data/*.json) --------------------------------

export interface ArenaFile {
  id: string;
  view: { w: number; h: number };
  scale: { num: number; den: number };
  /** everything step() reads, in view pixels */
  sim: { zMin: number; zMax: number; xMin: number; xMax: number; gravity: number; floorTop: number };
  /** everything only a cell reads; the core never opens it */
  art: unknown;
}

export interface MatchFile {
  id: string;
  tickRate: number;
  rounds: number;
  hp: number;
  /** a knock / impulse vector in the moves file is frame px; after the draw scale it is multiplied by this to become view px per second */
  knockScale: number;
  /** the VERTICAL component uses this instead: gravity eats a small lift in a tick or two, so a visible hop needs a bigger multiplier than the slide does */
  liftScale: number;
  /** a hit lands only when attacker and target are within this many view px in z */
  hitZBand: number;
  /** accumulated `fall` points at which a standing fighter is knocked down */
  fallThreshold: number;
  /** ground friction: each tick a sliding fighter keeps (friction-1)/friction of vx */
  friction: number;
  hitstopTicks: number;
  shakeTicks: number;
  hitsToKnockdown: number;
  knockdownWindowTicks: number;
  downTicks: number;
  getupTicks: number;
  invTicks: number;
  koFadeTicks: number;
  rematchAfterTicks: number;
}

/** probabilities are 0-255 and compared against one rng byte */
export interface AiFile {
  id: string;
  zTolerance: number;
  cooldownTicks: [number, number];
  reactTicks: [number, number];
  retreatChance: number;
  retreatTicks: [number, number];
  retreatDistance: number;
  reachPad: { min: number; max: number };
}

/** speeds are view pixels per second at TICK_RATE; compile.ts turns them into FP per tick */
export interface FighterFile { id: string; sprites: string; hp: number; speed: number; zSpeed: number }

export interface CastEntry { fighter: string; control: "player" | "ai"; ai?: string; team: number; x: number; z: number; face: 1 | -1 }
export interface ModeFile { id: string; arena: string; match: string; seed: number; cast: CastEntry[] }

// ---- compiled data: all integers, frozen, what step() actually reads -----------

export interface CBox { x: number; y: number; w: number; h: number }          // FP, pivot-relative, y down
export interface CHit { kind: HitKind; box: CBox; damage: number; knockX: number; knockY: number; stun: number; fall: number; effect: HitEffect }
export interface CFrame { bdy: CBox[]; itr: CHit[]; push: CBox | null; impulseX: number; impulseY: number }
export interface CState {
  name: string;
  clip: string;
  frameNames: string[];
  fps: number;
  loop: boolean;
  /** tick at which each frame starts, when the file authored `wait`; else empty and fps rules */
  starts: number[];
  /** ticks the whole state lasts (one-shot states); loop states use it as the period */
  total: number;
  next: number;             // state index, or -1
  onMove: number; onStop: number; onAttack: number;   // state index, or -1
  cancelFrom: number;       // frame index, or -1
  frames: CFrame[];
}
export interface CFighter {
  id: string;
  set: string;               // the sprite set, e.g. "robot--snes16"
  hp: number;
  speed: number;             // FP per tick
  zSpeed: number;            // FP per tick
  initial: number;
  hurt: number;              // onHit.light
  ko: number;                // onHit.heavy
  states: CState[];          // sorted by name
}
export interface CArena { zMin: number; zMax: number; xMin: number; xMax: number; gravity: number }   // FP; gravity FP per tick^2
export interface CMatch extends MatchFile {}
export interface CAi extends AiFile {}
export interface CCast { fighter: number; control: "player" | "ai"; ai: number; team: number; x: number; z: number; face: 1 | -1 }
export interface FightData {
  seed: number;
  arena: CArena;
  match: CMatch;
  fighters: CFighter[];
  ais: CAi[];
  cast: CCast[];
}

// ---- the state ----------------------------------------------------------------

export interface InputFrame { mx: -1 | 0 | 1; mz: -1 | 0 | 1; attack: boolean }
export const NO_INPUT: InputFrame = { mx: 0, mz: 0, attack: false };

export interface AiState { cooldown: number; mode: 0 | 1 | 2; modeT: number; wantMx: -1 | 0 | 1; wantMz: -1 | 0 | 1; wantAttack: boolean }

export interface FighterState {
  x: number; z: number; h: number;          // FP world px; h is height above the floor, >= 0
  vx: number; vz: number; vh: number;       // FP per tick
  face: 1 | -1;
  st: number;                               // index into CFighter.states
  stT: number;                              // ticks in this state
  frame: number;                            // derived each tick, kept for the view
  hp: number;
  stun: number;                             // ticks left frozen by a hit
  inv: number;                              // ticks left invulnerable
  down: number;                             // ticks left on the floor after a knockdown, 0 = standing
  fall: number;                             // accumulated fall points toward a knockdown
  hits: number;                             // recent hits toward hitsToKnockdown
  hitsT: number;                            // ticks since the first recent hit
  hitMask: number;                          // which opposing fighters this attack has already hit
  ai: AiState | null;
}

export type Phase = 0 | 1 | 2 | 3;         // 0 intro, 1 fight, 2 ko fade, 3 over
export interface FightState {
  tick: number;
  rng: number;                              // uint32, lives here so the sim has no hidden state
  phase: Phase;
  phaseT: number;
  freeze: number;                           // hitstop ticks left, applies to everyone
  shake: number;                            // ticks of shake left, for the view only
  winner: -1 | 0 | 1;
  fighters: FighterState[];
  events: FightEvent[];                     // produced this tick, consumed by the cell, never hashed into hashState
}

export type FightEvent =
  | { kind: "hit"; attacker: number; target: number; x: number; z: number; h: number; damage: number; effect: HitEffect }
  | { kind: "block"; target: number }
  | { kind: "knockdown"; target: number }
  | { kind: "ko"; target: number }
  | { kind: "land"; who: number }
  | { kind: "phase"; phase: Phase };
