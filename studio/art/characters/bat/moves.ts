// The bat's fight data: a swoop active on frames 2 and 3 of the attack (the
// wing thrown forward with a spark), a shove back on hurt, and a fall on ko
// with no hurt box once it is down - the same shape every fighter shares.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { BAT32_SPEC } from "./rig32";

const B = gridBox(BAT32_SPEC.origin, BAT32_SPEC.unit);
const U = BAT32_SPEC.unit;
const body = B(13, 5, 27, 31);
const push = B(14, 20, 26, 31);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const swoop = { kind: "hit" as const, box: B(24, 10, 38, 24), damage: 4, knock: { dx: 3 * U, dy: -1 * U }, stun: 5, fall: 8, effect: "spark" as const };

export const batMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [swoop], impulse: { dx: 4 * U, dy: 0 } },
    { bdy: [body], push, itr: [swoop] },
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
