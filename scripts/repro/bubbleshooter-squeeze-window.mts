/* How wide is the window for threading a one-cell gap, in the CURRENT build?
   Real module, real aim().

   Board: row 0 left full (the ceiling backstop, so every shot terminates
   somewhere), row 4 full EXCEPT one cell. Threading = the bubble comes to rest
   ABOVE row 4. Anything else stopped at the wall. */
import { aim, newGame, MAX_ANGLE, cellCenter, rowWidth } from "/mnt/c/Users/ytr_o/OneDrive/Desktop/ellaz/src/games/bubbleshooter/logic";

const s = newGame("hard", () => 0.5);
for (let r = 0; r < s.rows.length; r++) for (let c = 0; c < s.rows[r].length; c++) s.rows[r][c] = null;
const WALL = 4, HOLE = 5;
for (let c = 0; c < rowWidth(0, s.shift); c++) s.rows[0][c] = 1;
for (let c = 0; c < rowWidth(WALL, s.shift); c++) s.rows[WALL][c] = c === HOLE ? null : 2;

console.log(`hole = row ${WALL} col ${HOLE}, centre x=${cellCenter(WALL, HOLE, s.shift).x.toFixed(3)}`);

const STEPS = 40001;
const hits: number[] = [];
for (let i = 0; i < STEPS; i++) {
  const angle = -MAX_ANGLE + (2 * MAX_ANGLE * i) / (STEPS - 1);
  const shot = aim(s, angle);
  if (shot.cell && shot.cell.row < WALL) hits.push(angle);
}
const step = (2 * MAX_ANGLE) / (STEPS - 1);
console.log(`angles that get past the wall: ${hits.length} / ${STEPS}`);
// widest contiguous run
let best = 0, run = 0;
for (let i = 1; i < hits.length; i++) {
  if (hits[i] - hits[i - 1] < step * 1.5) { run += step; if (run > best) best = run; } else run = 0;
}
console.log(`widest contiguous window: ${(best * 1000).toFixed(2)} mrad`);
// What that is in finger-pixels: aim is dragged over the field width. Measure
// the horizontal travel of the aim ray at the wall's height for that window.
const yWall = 0.5 + WALL * (Math.sqrt(3) / 2);
const reach = (cellCenter(WALL, HOLE, s.shift).y - yWall) || 1;
console.log(`for scale: 360px field / 10 cols = 36px per bubble;`);
console.log(`the window as a share of the full aim arc: ${((best / (2 * MAX_ANGLE)) * 100).toFixed(3)}%`);
console.log(`=> about ${(best / (2 * MAX_ANGLE) * 360).toFixed(1)} px of finger travel across a 360px-wide aim drag`);

/* CONTROLS - this probe must be able to say both other things. */
const measure = (mut: (st: typeof s) => void) => {
  const t = newGame("hard", () => 0.5);
  for (let r = 0; r < t.rows.length; r++) for (let c = 0; c < t.rows[r].length; c++) t.rows[r][c] = null;
  for (let c = 0; c < rowWidth(0, t.shift); c++) t.rows[0][c] = 1;
  mut(t);
  let n = 0;
  for (let i = 0; i < STEPS; i++) {
    const angle = -MAX_ANGLE + (2 * MAX_ANGLE * i) / (STEPS - 1);
    const shot = aim(t, angle);
    if (shot.cell && shot.cell.row < WALL) n++;
  }
  return n;
};
const sealed = measure((t) => { for (let c = 0; c < rowWidth(WALL, t.shift); c++) t.rows[WALL][c] = 2; });
const open = measure(() => {});
console.log(`\ncontrol  wall sealed  -> ${sealed} / ${STEPS}   (must be 0)`);
console.log(`control  no wall      -> ${open} / ${STEPS}   (must be ~all)`);
console.log(sealed === 0 && open > STEPS * 0.9 ? "controls PASS - the probe can report both answers" : "CONTROLS FAILED - do not trust the number above");
