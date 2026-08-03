#!/usr/bin/env node
/**
 * How often can a Minesweeper board be cleared by pure logic, with no guessing?
 *
 *   node scripts/sim/minesweeper-guessfree.mjs [--boards 2000] [--json]
 *
 * The single most useful thing a player can be told about this game, and the
 * one nobody can answer by reading the code. Everyone has lost a board to a
 * coin-flip and wondered whether they missed something. Usually they did not.
 *
 * Method: play each board with a solver that only ever makes moves it can
 * PROVE are safe, and stop the moment it has nothing provable left. Two rules,
 * both of which a human uses without naming them:
 *
 *   1. Single point - a revealed number whose unknown neighbours exactly equal
 *      its remaining mine count are all mines; if its mines are all flagged,
 *      every remaining neighbour is safe.
 *   2. Subset - if one number's unknown set is contained in another's, the
 *      difference resolves. This is the 1-2-1 wall pattern and its relatives.
 *
 * A solver with only these two rules is WEAKER than a perfect player: a full
 * constraint enumeration can crack some boards it cannot. So the number below
 * is a LOWER bound on guess-free boards, which is the honest direction to err
 * for a claim that guessing is rare. It is also close to how a person actually
 * plays, which makes it the more useful figure of the two.
 *
 * The real generator is used, through the alias hooks, so a retuned difficulty
 * changes this output instead of being contradicted by it. The first click is
 * always safe here exactly as in the game (`placeMines` bans the clicked cell
 * and its neighbours), so an opening loss is impossible and does not pollute
 * the count.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { DIFFICULTIES, newGame, placeMines } = await import(
  join(ROOT, "src/games/minesweeper/logic.ts")
);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 2000);

/** Deterministic RNG so a re-run reproduces the number exactly. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (r, c) => r * 100 + c;

function neighbours(rows, cols, r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  return out;
}

/**
 * Play one board with the two logical rules only.
 * Returns "solved" when every safe cell was proven, "stuck" when a guess was needed.
 */
function solve(state) {
  const { rows, cols, grid } = state;
  const revealed = new Set();
  const known = new Set(); // proven mines

  // Flood the zero-region the way the game does, so the solver sees what a
  // player sees rather than one cell at a time.
  const reveal = (r0, c0) => {
    const stack = [[r0, c0]];
    while (stack.length) {
      const [r, c] = stack.pop();
      if (revealed.has(key(r, c)) || known.has(key(r, c))) continue;
      revealed.add(key(r, c));
      if (grid[r][c].adj === 0) {
        for (const [nr, nc] of neighbours(rows, cols, r, c)) stack.push([nr, nc]);
      }
    }
  };

  reveal(state.firstR, state.firstC);

  const total = rows * cols;
  const mines = state.mines;

  for (;;) {
    // Self-check, every iteration. A solver that reveals a mine is not proving
    // anything - it is guessing and getting away with it, and it would inflate
    // every number below while looking like a better solver. This costs a scan
    // and buys the right to quote the result.
    for (const k of revealed) {
      if (grid[Math.floor(k / 100)][k % 100].mine) {
        throw new Error(`solver revealed a mine at ${Math.floor(k / 100)},${k % 100} - result void`);
      }
    }

    if (revealed.size === total - mines) return "solved";

    // Build the constraint set: each revealed number, its unknown neighbours,
    // and how many of them are still unaccounted-for mines.
    const constraints = [];
    for (const k of revealed) {
      const r = Math.floor(k / 100);
      const c = k % 100;
      if (grid[r][c].adj === 0) continue;
      const unknown = [];
      let flagged = 0;
      for (const [nr, nc] of neighbours(rows, cols, r, c)) {
        const nk = key(nr, nc);
        if (known.has(nk)) flagged++;
        else if (!revealed.has(nk)) unknown.push(nk);
      }
      if (unknown.length) constraints.push({ cells: new Set(unknown), need: grid[r][c].adj - flagged });
    }

    let progress = false;

    // Rule 1 - single point.
    for (const con of constraints) {
      if (con.need === 0) {
        for (const k of con.cells)
          if (!revealed.has(k)) {
            reveal(Math.floor(k / 100), k % 100);
            progress = true;
          }
      } else if (con.need === con.cells.size) {
        for (const k of con.cells)
          if (!known.has(k)) {
            known.add(k);
            progress = true;
          }
      }
    }
    if (progress) continue;

    // Rule 2 - subset. A ⊂ B ⇒ B\A holds need(B) - need(A) mines.
    for (const a of constraints) {
      for (const b of constraints) {
        if (a === b || a.cells.size >= b.cells.size) continue;
        let subset = true;
        for (const k of a.cells)
          if (!b.cells.has(k)) {
            subset = false;
            break;
          }
        if (!subset) continue;

        const diff = [...b.cells].filter((k) => !a.cells.has(k));
        const need = b.need - a.need;
        if (need === 0) {
          for (const k of diff)
            if (!revealed.has(k)) {
              reveal(Math.floor(k / 100), k % 100);
              progress = true;
            }
        } else if (need === diff.length) {
          for (const k of diff)
            if (!known.has(k)) {
              known.add(k);
              progress = true;
            }
        }
      }
    }

    if (!progress) return "stuck";
  }
}

const out = { boards: BOARDS, levels: {} };

for (const [name, d] of Object.entries(DIFFICULTIES)) {
  let solved = 0;
  for (let i = 0; i < BOARDS; i++) {
    const rng = mulberry32(i * 2654435761 + name.length * 7919);
    // Open in the middle, the way most people do, and the way that maximises
    // the opening reveal. Cell choice changes the number slightly; it is stated
    // rather than tuned.
    const r0 = Math.floor(d.rows / 2);
    const c0 = Math.floor(d.cols / 2);
    const placed = placeMines(newGame(d), r0, c0, rng);
    placed.firstR = r0;
    placed.firstC = c0;
    if (solve(placed) === "solved") solved++;
  }
  out.levels[name] = {
    board: `${d.rows}x${d.cols}`,
    mines: d.mines,
    density: Number(((d.mines / (d.rows * d.cols)) * 100).toFixed(1)),
    guessFreePct: Number(((solved / BOARDS) * 100).toFixed(1)),
  };
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`minesweeper: ${BOARDS} boards per level, first click at the centre\n`);
  console.log("level     board   mines   density   cleared without a single guess");
  for (const [name, r] of Object.entries(out.levels)) {
    console.log(
      `${name.padEnd(9)} ${r.board.padEnd(7)} ${String(r.mines).padStart(5)}   ` +
        `${String(r.density + "%").padStart(7)}   ${String(r.guessFreePct + "%").padStart(29)}`,
    );
  }
  console.log(
    "\nLower bound: the solver knows single-point and subset only, so a board it " +
      "\ncalls unsolvable may still yield to a full constraint enumeration.",
  );
}
