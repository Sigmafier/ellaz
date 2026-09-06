// The robot's fight data: the body box on every frame, the punch active on
// frames 2 and 3 of the attack (the fist thrown forward with the spark), a
// shove back on hurt, a fall on ko with no hurt box once it is down. Boxes are
// named in the drawing's own grid cells and converted to body units here.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { ROBOT48_SPEC } from "./rig48";

const B = gridBox(ROBOT48_SPEC.origin, ROBOT48_SPEC.unit);
const body = B(9, 0, 25, 47);
const push = B(10, 22, 24, 47);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const punch = { kind: "hit" as const, box: B(26, 20, 44, 29), damage: 10, knock: { dx: 6 * ROBOT48_SPEC.unit, dy: -2 * ROBOT48_SPEC.unit }, stun: 8, fall: 20, effect: "star" as const };

export const robotMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [punch], impulse: { dx: 2 * ROBOT48_SPEC.unit, dy: 0 } },
    { bdy: [body], push, itr: [punch] },
    { bdy: [body], push },
    { bdy: [body], push },
  ],
  hurt: [{ bdy: [body], push, impulse: { dx: -3 * ROBOT48_SPEC.unit, dy: 0 } }, { bdy: [body], push }, { bdy: [body], push }],
  ko: [
    { bdy: [body], push, impulse: { dx: -6 * ROBOT48_SPEC.unit, dy: -4 * ROBOT48_SPEC.unit } },
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [], push },
    { bdy: [], push },
    { bdy: [], push },
  ],
});
