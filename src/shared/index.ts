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
// The instruction chip every kids game shows at the top.
export { Prompt, type PromptProps } from "./Prompt";
