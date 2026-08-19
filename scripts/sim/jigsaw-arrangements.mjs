#!/usr/bin/env node
/**
 * Derives the numbers the Jigsaw page quotes.
 *
 *   node scripts/sim/jigsaw-arrangements.mjs [--runs 20000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the jigsaw
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED REDUCER. `newGame`, `tapTray`, `tapSlot`, `isSolved`
 * and `LEVELS` are imported from `src/games/jigsaw/logic.ts` rather than
 * re-written, so every run below is a run of the game a child actually opens -
 * the same cuts, the same rule that a wrong space accepts a piece, the same
 * definition of finished. A re-implementation would measure my reading of the
 * code, agree with itself, and be confidently wrong about a game we do not ship.
 *
 * Two questions, and they are answered by different methods on purpose:
 *
 *   1. HOW BIG IS THE PUZZLE? That is arithmetic, not simulation - there are
 *      exactly `n!` ways to lay n pieces out and one of them is the picture. It
 *      is computed here rather than typed into the page so the number moves if
 *      a cut ever does.
 *
 *   2. WHAT DOES LOOKING AT THE PICTURE SAVE? Measurable: a bot that ignores
 *      the picture entirely, against the floor of one placement per piece that
 *      a child who looks achieves. The gap between them is what the game is
 *      actually asking for, in placements.
 *
 * THE BLIND BOT REMEMBERS, and that is what makes it a fair comparison rather
 * than a strawman. It fills spaces in order, and for each one it tries pieces
 * until the right one lands - never twice the same piece in the same space,
 * because remembering what you just tried is the first thing anybody does. A
 * bot without that memory is a random walk over permutations and does not
 * finish a twenty-piece cut in any amount of time worth measuring, which is
 * itself the reason this model is the one here: the first version of this
 * script was that walk, and it ran for five minutes on `hard` without
 * completing a single run.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * with a SEPARATE stream for the bot's own choices so its picks are not
 * correlated with the deal it was handed.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const jig = await import(join(ROOT, "src/games/jigsaw/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const { DIFFICULTIES, LEVELS, isSolved, newGame, pieceCount, tapSlot, tapTray } = jig;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const RUNS = flag("runs", 20000);
const AS_JSON = args.includes("--json");

/** n! as an exact integer where it fits, and as a float beyond that. */
function factorial(n) {
  let exact = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) exact *= i;
  return exact;
}

/**
 * One blind run: fill the spaces in order, trying pieces until each fits.
 *
 * A wrong piece is accepted by the rules and then lifted, which costs exactly
 * one placement - so `state.moves` counts the tries, which is the whole point.
 * Pieces already known wrong for THIS space are not tried again.
 */
function blindRun(level, seed) {
  let s = newGame(level, 1, mulberry32(seed));
  const roll = mulberry32(seed * 104729 + 7);
  const n = s.slots.length;

  for (let slot = 0; slot < n; slot += 1) {
    const tried = new Set();
    // Bounded rather than `while (true)`: every piece in the tray is a
    // candidate and one of them is right, so this cannot run out - but a bug
    // that broke that should report rather than hang.
    for (let guard = 0; guard <= n; guard += 1) {
      const pool = s.tray.filter((p) => !tried.has(p));
      if (pool.length === 0) return Number.NaN;
      const piece = pool[Math.floor(roll() * pool.length)];
      tried.add(piece);
      s = tapTray(s, piece).state;
      s = tapSlot(s, slot).state;
      if (s.slots[slot] === slot) break;
      // Wrong. Lift it back out - which is free - and try another.
      s = tapSlot(s, slot).state;
      s = tapTray(s, piece).state; // put it down again, so nothing stays held
    }
  }
  return isSolved(s) ? s.moves : Number.NaN;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const results = {};
for (const level of DIFFICULTIES) {
  const n = pieceCount(level);
  const runs = RUNS;
  const rows = [];
  for (let i = 0; i < runs; i += 1) rows.push(blindRun(level, i + 1));
  const clean = rows.filter((r) => Number.isFinite(r));
  results[level] = {
    ...LEVELS[level],
    pieces: n,
    arrangements: factorial(n).toString(),
    perfect: n,
    blindRuns: runs,
    blindGaveUp: rows.length - clean.length,
    blindMean: mean(clean),
    blindMedian: median(clean),
    blindWorst: Math.max(...clean),
    lookingWorth: mean(clean) / n,
    // The closed form, for the same quantity. Sampling without replacement
    // needs (k+1)/2 tries on average to find the right piece among k, so the
    // whole board is n(n+3)/4 - and printing it beside the measurement is what
    // turns "the simulation says 13.5" into "the simulation and the arithmetic
    // agree", which is the only version worth quoting.
    expected: (n * (n + 3)) / 4,
  };
}

if (AS_JSON) {
  console.log(JSON.stringify({ runs: RUNS, results }, null, 2));
} else {
  console.log(`Jigsaw — blind placement, up to ${RUNS} runs per cut\n`);
  console.log("level   cut    pieces  arrangements          perfect  blind mean  median  worst  runs");
  for (const level of DIFFICULTIES) {
    const r = results[level];
    console.log(
      `${level.padEnd(7)} ${`${r.cols}x${r.rows}`.padEnd(6)} ${String(r.pieces).padEnd(7)} ` +
        `${r.arrangements.padEnd(21)} ${String(r.perfect).padEnd(8)} ` +
        `${r.blindMean.toFixed(1).padStart(10)}  ${String(r.blindMedian).padStart(6)}  ` +
        `${String(r.blindWorst).padStart(5)}  ${String(r.blindRuns).padStart(5)}`,
    );
  }
  console.log(
    "\nclosed form n(n+3)/4: " +
      DIFFICULTIES.map((l) => `${l} ${results[l].expected}`).join(", "),
  );
  console.log(
    "looking at the picture is worth: " +
      DIFFICULTIES.map((l) => `${l} ${results[l].lookingWorth.toFixed(1)}x`).join(", "),
  );
  const gaveUp = DIFFICULTIES.reduce((n, l) => n + results[l].blindGaveUp, 0);
  console.log(`runs that hit the guard and were dropped: ${gaveUp}`);
}
