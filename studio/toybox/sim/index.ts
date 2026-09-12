// The fight core's public surface. A cell or a harness imports from here and
// from nowhere else inside core/.

export * from "./types";
export { floorDiv, mul, toFP, toPx, clamp, sign, abs, mod } from "./fixed";
export { seedRng, nextRng, rngByte, rngRange } from "./rng";
export { hashState, hashEvents, fnv1a } from "./hash";
export { compileFight } from "./compile";
export { frameIndexAt, frameAt, stateDone, stateIndex, canCancel } from "./moves";
export { worldBox, overlaps, overlapX } from "./collide";
export { createState, tickMatch } from "./match";
export { step } from "./step";
export { reachOf, thinkAi, freshAi } from "./ai";
export { tickFighter, spawnFighter, dormant } from "./fighter";
export { tickStage, heroIndex, heroMaxHp } from "./stage";
export { tickPickups, xpToNext } from "./pickups";
export { findHits, applyHit, resolveHits } from "./hits";
export { readTape, inputsAtTick } from "./tape";
