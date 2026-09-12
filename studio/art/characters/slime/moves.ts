// The slime's fight data: no fists, so it fights by lunging its whole body -
// a hit active on frames 2 and 3 of the attack, damage 5 and a lighter
// knockback than the teddy's claw, because a blob barely pushes anything.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { SLIME32_SPEC } from "./rig32";

const B = gridBox(SLIME32_SPEC.origin, SLIME32_SPEC.unit);
const U = SLIME32_SPEC.unit;
const body = B(4, 9, 35, 31);
const push = B(6, 20, 33, 31);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const lunge = { kind: "hit" as const, box: B(28, 14, 42, 27), damage: 5, knock: { dx: 3 * U, dy: -1 * U }, stun: 6, fall: 10, effect: "dust" as const };

export const slimeMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [lunge], impulse: { dx: 3 * U, dy: 0 } },
    { bdy: [body], push, itr: [lunge] },
    { bdy: [body], push },
    { bdy: [body], push },
  ],
  hurt: [{ bdy: [body], push, impulse: { dx: -3 * U, dy: 0 } }, { bdy: [body], push }, { bdy: [body], push }],
  ko: [
    { bdy: [body], push, impulse: { dx: -5 * U, dy: -3 * U } },
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [], push },
    { bdy: [], push },
    { bdy: [], push },
  ],
});
