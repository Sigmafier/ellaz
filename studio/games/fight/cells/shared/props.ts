// The coin, as flat rectangles, from one pixel map both cells share. A prop has
// no sprite set (the export carries characters, not props), so it is drawn the
// way the arena is: `{ kind: "rect" }` ops the cell already knows how to fill.
// The map is a DRAWING literal, not a gameplay number - nothing here reaches
// the sim, and a cell that drew every coin as a square would play the same
// fight. Six spin widths, the demo's, read off `spin` from the draw plan.

import type { PropOp } from "../../core/view";
import type { ArenaDrawOp } from "../contract";

/** the demo's 8x8 coin; `.` is transparent */
const COIN = ["..####..", ".#yyyy#.", "#yWyyyo#", "#yWyyyo#", "#yyyyyo#", "#yyyyoo#", ".#oooo#.", "..####.."];
const COIN_INK: Record<string, string> = { "#": "#1a1230", y: "#ffc93c", W: "#ffffff", o: "#e0901c" };
/** the width the 8-px coin shows at each spin phase, twice the demo's half-widths */
const SPIN_W = [8, 6, 4, 2, 4, 6];
const COIN_H = 8;
/** the coin is drawn two world px per map px, so it reads at the fighters' scale */
const PX = 2;

/** one coin as rects: `op.x` is its centre, `op.y` its bottom edge, both in world px */
export function coinOps(op: PropOp): ArenaDrawOp[] {
  const w = SPIN_W[op.spin % SPIN_W.length];
  const ops: ArenaDrawOp[] = [];
  const left = op.x - w;
  const top = op.y - COIN_H * PX;
  for (let r = 0; r < COIN.length; r++) {
    const row = COIN[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === ".") { c++; continue; }
      let run = 1;
      while (c + run < row.length && row[c + run] === ch) run++;
      // the map is 8 wide; a narrower spin squeezes each column into w/8 of the full width
      const x0 = left + Math.round((c * w * PX) / COIN.length);
      const x1 = left + Math.round(((c + run) * w * PX) / COIN.length);
      if (x1 > x0) ops.push({ kind: "rect", x: x0, y: top + r * PX, w: x1 - x0, h: PX, color: COIN_INK[ch] });
      c += run;
    }
  }
  return ops;
}

/** every coin in the plan, back to front, as rects */
export function propOps(props: readonly PropOp[]): ArenaDrawOp[] {
  const out: ArenaDrawOp[] = [];
  for (const p of props) out.push(...coinOps(p));
  return out;
}
