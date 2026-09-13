// The turn kind's door: everything a game's test, a gate or a cell kind needs.

export * from "./types";
export { compileTurn } from "./compile";
export { createState, cloneState, anyAlive } from "./battle";
export { stepTurn } from "./step";
export { hashTurnState, hashTurnEvents, HASHED_TURN_STATE_FIELDS, HASHED_UNIT_FIELDS, HASHED_LOG_FIELDS, HASHED_FLOAT_FIELDS } from "./hash";
export { viewTurn, tileAtPx } from "./view";
export { inputsAtTurn } from "./tape";
export { inGrid, unitAt, reachable, targetsFrom, dist, tileIndex, tileX, tileY, colOf, rowOf } from "./grid";
export type { Reach } from "./grid";
export { planIntents } from "./intent";
