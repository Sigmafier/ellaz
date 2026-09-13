// The turn kind's vocabulary: the raw files (what a game writes), the compiled
// data (what step reads, frozen, every geometry in FP) and the state (what the
// hash covers). A grid-tactics battle: heroes and foes on a cols x rows grid,
// one side moves and strikes, then the other, until one side stands.
//
// The same rules as the fight's sim: integers only, FP = 1/256 px through
// sim/fixed.ts's helpers, no DOM, no clock, no Math.random. Every number that
// tunes play is a field of a rules, unit or battle file; this file names the
// fields and never a value.

// ---- the raw files -----------------------------------------------------------

/** what a unit IS: who it fights for, how far it walks, how hard it hits, how tall its hp bar sits */
export interface UnitFile {
  id: string;
  /** a sprite set under the game's assets/, with a manifest carrying the five clips */
  sprites: string;
  team: number;
  name: string;
  hp: number;
  atk: number;
  /** tiles per turn (manhattan, through allies, never through foes) */
  move: number;
  /** manhattan reach of a strike */
  range: number;
  /** view px above the feet where the hp bar sits */
  tall: number;
  /** drawn `hover` px above its tile; a flying unit's float and bar rise with it */
  flying?: boolean;
  hover?: number;
  /** whole multiples of the cell's draw scale (a boss drawn big); absent is 1 */
  drawScale?: number;
  /** the HUD draws this unit's bar top-centre while it stands */
  boss?: boolean;
}

/** a battle: a grid placed on a painted field, and who starts where */
export interface BattleFile {
  id: string;
  view: { w: number; h: number };
  /** the grid in view px: tile size and the top-left of tile (0, 0); a unit stands at its tile's bottom-centre */
  grid: { cols: number; rows: number; tileW: number; tileH: number; x: number; y: number };
  /** tiles nobody may stand on (the campfire) */
  blocked: { c: number; r: number }[];
  placements: { unit: string; c: number; r: number }[];
  /** the field's picture: only a cell opens it */
  art: unknown;
}

/** every timing of the turn machine, in ticks; `tickRate` says what a tick is */
export interface RulesFile {
  id: string;
  tickRate: number;
  /** one tile of a walk */
  walkTicks: number;
  /** a strike: the swing before the damage lands, then the settle after */
  strikeWindupTicks: number;
  strikeRecoverTicks: number;
  /** the pause after ENEMY TURN shows before the first enemy acts */
  enemyBannerTicks: number;
  /** between one enemy's action and the next */
  betweenTicks: number;
  /** how long YOUR TURN / ENEMY TURN stay up; the first YOUR TURN of a battle */
  turnBannerTicks: number;
  firstBannerTicks: number;
  /** a damage float's life, and how many view px it rises over it */
  floatTicks: number;
  floatRise: number;
}

export interface TurnModeFile {
  id: string;
  kind: "turn";
  battle: string;
  rules: string;
  seed: number;
}

/** the part of a sprite manifest the turn reads: its clips */
export interface ClipSheet {
  animations: Record<string, { fps: number; loop: boolean; frames: string[] }>;
}

/** what the loader (disk or http) hands the compiler */
export interface LoadedTurn {
  mode: TurnModeFile;
  battle: BattleFile;
  rules: RulesFile;
  /** one per DISTINCT unit the placements name, in first-appearance order */
  units: UnitFile[];
  /** keyed by a unit's `sprites` name */
  sets: Record<string, { manifest: ClipSheet }>;
}

// ---- compiled ----------------------------------------------------------------

/** the five clips every unit set must carry, by index: clip 0 is idle, 4 is ko */
export const CLIPS = ["idle", "walk", "attack", "hurt", "ko"] as const;
export const CLIP_IDLE = 0;
export const CLIP_WALK = 1;
export const CLIP_ATTACK = 2;
export const CLIP_HURT = 3;
export const CLIP_KO = 4;

export interface CClip { frames: readonly string[]; ticksPerFrame: number; loop: boolean }

/** one placed unit, compiled: its file's numbers, its clips, and where it starts */
export interface CUnit {
  id: string;
  set: string;
  team: number;
  name: string;
  hp: number;
  atk: number;
  move: number;
  range: number;
  /** view px */
  tall: number;
  hover: number;
  flying: boolean;
  size: number;
  boss: boolean;
  clips: readonly CClip[];
  c: number;
  r: number;
}

/** the grid in FP; `blocked` is one flag per tile, row-major */
export interface CGrid {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  x: number;
  y: number;
  blocked: readonly boolean[];
}

export interface TurnData {
  rules: RulesFile;
  grid: CGrid;
  units: readonly CUnit[];
  view: { w: number; h: number };
  seed: number;
}

// ---- state -------------------------------------------------------------------

/** phases */
export const PHASE_PLAYER = 0;
export const PHASE_ANIM = 1;
export const PHASE_ENEMY = 2;
export const PHASE_WON = 3;
export const PHASE_LOST = 4;

/** what a unit is doing right now */
export const ACT_NONE = 0;
export const ACT_WALK = 1;
export const ACT_WINDUP = 2;
export const ACT_RECOVER = 3;

/** the enemy phase's sub-step */
export const SUB_WAIT = 0;
export const SUB_WALK = 1;
export const SUB_STRIKE = 2;
export const SUB_BETWEEN = 3;

/** banners */
export const BANNER_NONE = 0;
export const BANNER_YOUR_TURN = 1;
export const BANNER_ENEMY_TURN = 2;
export const BANNER_VICTORY = 3;
export const BANNER_DEFEAT = 4;

/** the log line, as a code plus the units and number it names; a cell turns it into words */
export const LOG_CLICK_A_HERO = 0;
export const LOG_HERO_PICKED = 1;
export const LOG_PICK_ANOTHER = 2;
export const LOG_STRIKE_OR_WAIT = 3;
export const LOG_HERO_DONE = 4;
export const LOG_HIT = 5;
export const LOG_HIT_DOWN = 6;
export const LOG_VICTORY = 7;
export const LOG_DEFEAT = 8;

export interface LogState { kind: number; a: number; b: number; n: number }

export interface UnitState {
  c: number;
  r: number;
  /** FP view px of the feet */
  x: number;
  y: number;
  hp: number;
  acted: number;
  moved: number;
  face: 1 | -1;
  clip: number;
  clipT: number;
  act: number;
  actT: number;
  /** the tween's start, FP */
  fromX: number;
  fromY: number;
  /** the next tile of `path` to walk to */
  pathIdx: number;
  /** an enemy's intent: whom it will strike (-1 none) and whether it reaches; a hero's target while striking */
  target: number;
  strikes: number;
  /** the tiles to walk, as row-major indices; an enemy's plan, or a hero's chosen walk */
  path: number[];
}

export interface FloatState { x: number; y: number; value: number; t: number }

export interface TurnState {
  tick: number;
  rng: number;
  phase: number;
  /** a countdown the phase machine waits on */
  phaseT: number;
  sub: number;
  turn: number;
  /** the selected hero, -1 none */
  sel: number;
  /** the unit walking or striking, -1 none */
  actor: number;
  /** the enemy phase's index into units, -1 before the first */
  cursor: number;
  banner: number;
  bannerT: number;
  log: LogState;
  units: UnitState[];
  floats: FloatState[];
  /** produced this tick, consumed by the cell, never hashed into hashState */
  events: TurnEvent[];
}

/** one tick's input for the player: a click on a tile, a wait, a restart */
export interface TurnInput { c: number; r: number; act: number }
export const ACT_INPUT_NONE = 0;
export const ACT_INPUT_PICK = 1;
export const ACT_INPUT_WAIT = 2;
export const ACT_INPUT_RESTART = 3;
export const NO_TURN_INPUT: TurnInput = { c: 0, r: 0, act: 0 };

/** `hit` and `ko` carry the fight's fields so one fx module serves both kinds */
export type TurnEvent =
  | { kind: "hit"; attacker: number; target: number; x: number; z: number; h: number; damage: number; effect: "none" }
  | { kind: "ko"; target: number }
  | { kind: "phase"; phase: number }
  | { kind: "turn"; turn: number };
