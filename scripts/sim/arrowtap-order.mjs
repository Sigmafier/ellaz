#!/usr/bin/env node
/**
 * Derives the numbers the Arrows Out page quotes.
 *
 *   node scripts/sim/arrowtap-order.mjs [--boards 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the Arrows
 * Out pages say with a digit in it comes from here or from the game's own
 * source.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `canLeave`, `tap`, `hasMove` and
 * `isSolved` are imported from `src/games/arrowtap/logic.ts` rather than
 * rewritten, so these numbers describe the board a child actually opens. A
 * re-implementation would measure MY READING of the code, agree with itself,
 * and produce a confident number about a game we do not ship.
 *
 * Three questions, and the second is the one worth a page:
 *
 *   1. HOW MUCH IS OPEN AT THE START? A fresh board holds `n` arrows and only
 *      some of them have a clear line to their edge. That count is the game's
 *      real difficulty curve: a board where 2 of 22 can move feels nothing like
 *      one where 12 can, and the grid size alone does not say which you got.
 *
 *   2. DOES THE ORDER MATTER? A tap only ever EMPTIES a cell, an empty cell
 *      blocks nothing, so a path that was clear stays clear and the set of
 *      legal taps can only grow. That argues you cannot strand yourself. An
 *      argument is not a measurement, so a bot taps uniformly at random among
 *      the legal taps, all the way down, and the stranded column is what would
 *      prove the argument wrong.
 *
 *   3. DOES THE CHOICE WIDEN? Same runs, sampled at the first tap, at the
 *      halfway point and at the tightest moment of the whole game, and as a
 *      SHARE of the arrows still on the board rather than as a count - a count
 *      falls at the end for the trivial reason that there is nothing left to
 *      tap, and would report that instead of anything about the puzzle.
 *
 * The shortfall column is here for the admission rather than for the prose.
 * `deal` places one arrow at a time onto a cell whose exit is clear right then
 * and STOPS rather than retrying when it runs out of room, so a board may carry
 * fewer arrows than its level asked for. Whether that ever happens at the
 * shipped tiers is a measurement, not a guess, and a zero there is a finding
 * too - it says the tiers sit under the ceiling with room to spare.
 *
 * Determinism: `mulberry32` and `seedFrom` from the game's own `@shared/rng`,
 * seeded per board and per bot, so two runs of the same command print the same
 * table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arrowtap = await import(join(ROOT, "src/games/arrowtap/logic.ts"));
const { mulberry32, seedFrom } = await import(join(ROOT, "src/shared/rng.ts"));

const { LEVELS, LEVEL_IDS, canLeave, deal, hasMove, isSolved, tap } = arrowtap;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 4000);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (x, d = 1) => Number(x.toFixed(d));
const pct = (n, of) => round((n / of) * 100, 1);

/** Every cell the shipped rules would let you tap right now. */
function legalTaps(state) {
  const out = [];
  for (let cell = 0; cell < state.cells.length; cell++) {
    if (canLeave(state, cell)) out.push(cell);
  }
  return out;
}

/**
 * Play one board to the end, choosing uniformly among the legal taps.
 *
 * No strategy at all, on purpose. The question is not how well a bot plays -
 * every tap removes exactly one arrow, so the tap COUNT is fixed before the
 * first move and there is nothing to optimise. The question is whether an
 * order exists that gets stuck, and random play is the cheapest way to hunt it.
 */
function playRandom(state, rng) {
  let s = state;
  const dealt = s.left;
  let openFraction = null;
  let halfFraction = null;
  let tightestShare = Infinity;
  let widest = 0;
  let guard = dealt + 1;

  while (!isSolved(s)) {
    const legal = legalTaps(s);
    // The `hasMove` the renderer asks and the list this bot picks from must
    // agree. They are two different functions over the same rule, and a board
    // where they disagree would make every column below meaningless.
    if (legal.length > 0 !== hasMove(s)) {
      throw new Error(`hasMove and canLeave disagree with ${s.left} arrows left`);
    }
    if (legal.length === 0) return { outcome: "stranded", taps: s.taps, left: s.left };

    const share = legal.length / s.left;
    if (openFraction === null) openFraction = share;
    if (halfFraction === null && s.left * 2 <= dealt) halfFraction = share;
    // Measured as a SHARE, not a count. Near the end few arrows remain, so few
    // can move, and a raw count would report the last two taps of every game
    // rather than anything about the puzzle.
    if (s.left > 1) tightestShare = Math.min(tightestShare, share);
    widest = Math.max(widest, legal.length);

    s = tap(s, legal[Math.floor(rng() * legal.length)]).state;
    // Every pass removes exactly one arrow, so this can only fire if a tap
    // stopped doing that - which would otherwise spin here forever.
    if (--guard <= 0) return { outcome: "looped", taps: s.taps, left: s.left };
  }

  return {
    outcome: "cleared",
    taps: s.taps,
    left: 0,
    openFraction,
    halfFraction: halfFraction ?? openFraction,
    tightestShare: tightestShare === Infinity ? 1 : tightestShare,
    widest,
  };
}

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];
  const dealt = [];
  const opening = [];
  const openShare = [];
  const halfShare = [];
  const tightest = [];
  const widest = [];
  const outcomes = { cleared: 0, stranded: 0, looped: 0 };
  let short = 0;
  let tapsMatchArrows = 0;

  for (let b = 0; b < BOARDS; b++) {
    const { state, plan } = deal(level, mulberry32(seedFrom(`arrowtap-${level}-${b}`)));

    // A deal that handed back an empty board would flatter every column below,
    // and a silent zero is exactly the shape that makes a table lie.
    if (isSolved(state)) throw new Error(`${level}: deal returned an empty board`);
    if (plan.length !== state.left) throw new Error(`${level}: plan and left disagree`);

    dealt.push(state.left);
    if (state.left < spec.arrows) short++;

    const open = legalTaps(state).length;
    opening.push(open);

    const run = playRandom(state, mulberry32(seedFrom(`arrowtap-bot-${level}-${b}`)));
    outcomes[run.outcome]++;
    if (run.outcome === "cleared") {
      if (run.taps === state.left) tapsMatchArrows++;
      openShare.push(run.openFraction);
      halfShare.push(run.halfFraction);
      tightest.push(run.tightestShare);
      widest.push(run.widest);
    }
  }

  return {
    level,
    size: spec.size,
    asked: spec.arrows,
    dealtMean: round(mean(dealt), 2),
    dealtMin: Math.min(...dealt),
    shortPct: pct(short, BOARDS),
    openingMean: round(mean(opening), 1),
    openingMin: Math.min(...opening),
    openingMax: Math.max(...opening),
    openingSharePct: pct(mean(openShare), 1),
    halfSharePct: pct(mean(halfShare), 1),
    tightestSharePct: pct(mean(tightest), 1),
    tightestShareMinPct: pct(Math.min(...tightest), 1),
    widestMean: round(mean(widest), 1),
    clearedPct: pct(outcomes.cleared, BOARDS),
    strandedPct: pct(outcomes.stranded, BOARDS),
    tapsMatchPct: pct(tapsMatchArrows, outcomes.cleared || 1),
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, rows }, null, 2));
} else {
  console.log(`arrows out: ${BOARDS.toLocaleString("en-US")} dealt boards per level\n`);
  console.log(
    "level    grid  asked  dealt  short  open now  open %  half %  tightest %  random clears  stranded  taps = arrows",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${`${r.size}x${r.size}`.padStart(4)} ${String(r.asked).padStart(6)} ` +
        `${String(r.dealtMean).padStart(6)} ${String(`${r.shortPct}%`).padStart(6)} ` +
        `${String(r.openingMean).padStart(9)} ${String(`${r.openingSharePct}%`).padStart(7)} ` +
        `${String(`${r.halfSharePct}%`).padStart(7)} ${String(`${r.tightestSharePct}%`).padStart(11)} ` +
        `${String(`${r.clearedPct}%`).padStart(14)} ${String(`${r.strandedPct}%`).padStart(9)} ` +
        `${String(`${r.tapsMatchPct}%`).padStart(13)}`,
    );
  }
  console.log("\nopening spread (legal taps on a fresh board), min to max:");
  for (const r of rows) {
    console.log(
      `  ${r.level.padEnd(8)} ${String(r.openingMin).padStart(2)} to ${String(r.openingMax).padStart(2)} ` +
        `of ${r.dealtMean} arrows, widest choice at any point ${r.widestMean}, ` +
        `tightest share ever seen ${r.tightestShareMinPct}%`,
    );
  }
  console.log(
    "\nA tap only empties a cell and an empty cell blocks nothing, so every clear path\n" +
      "stays clear and the legal set only grows. The stranded column is what would\n" +
      "disprove that; 'random clears' is the same claim from the other side. The tap\n" +
      "count is not a score here - clearing a board takes exactly one tap per arrow,\n" +
      "whatever order you pick, which is why the record is the clock instead.",
  );
}
