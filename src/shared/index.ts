// Shared game utilities — the neutral helpers every game may import.
// Import either from the barrel (`@shared`) or the module directly
// (`@shared/rng`); both resolve via the `@shared` alias registered in
// vite.config.ts, tsconfig.json AND vitest.config.ts.
export { mulberry32, seedFrom, randInt, pick, shuffle } from "./rng";
export { PENTATONIC, PENTATONIC_NAMES } from "./notes";
export { winMoment, type WinMomentOptions } from "./winMoment";
// Themed emoji casts a game draws characters from (visually distinct by design).
export { CAST, CAST_THEMES, castOf, drawCast, type CastItem, type CastTheme } from "./cast";
// Parametric SVG shape paths — pure string math, no DOM.
export { SHAPE_IDS, SHAPE_NAMES, shapePath, type ShapeId } from "./shapes";
// The repeat-the-pattern brain, shared by every pattern game.
export {
  IDLE,
  beginInput,
  isComplete,
  pressPad,
  startRound,
  type Phase,
  type SeqState,
} from "./sequence";
// Pause-aware game clock (React hook).
export { useGameTimer, type GameTimer, type GameTimerOptions } from "./useGameTimer";
// Spawn/expire/tap rules for the games where things appear, move and get
// tapped. PURE half — safe to import from a logic.ts (via `@shared/spawn.pure`).
export {
  SPAWN_DIFFICULTIES,
  SPAWN_PRESETS,
  alive,
  dueToSpawn,
  isAlive,
  isSustainable,
  judgeTap,
  pickLane,
  spawn,
  steadyStateAlive,
  type Prop,
  type SpawnDifficulty,
  type SpawnOptions,
  type SpawnSpec,
  type TapVerdict,
} from "./spawn.pure";
// ...and the React + Web Animations glue over it. Motion is DECLARED to the
// browser, never stepped by a hand-rolled loop — see the header of spawn.ts.
export {
  PLAY_SURFACE_STYLE,
  useSpawner,
  type SpawnMotion,
  type Spawner,
  type SpawnerOptions,
} from "./spawn";
// The instruction chip every kids game shows at the top.
export { Prompt, type PromptProps } from "./Prompt";
