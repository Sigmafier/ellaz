#!/usr/bin/env node
/**
 * Derives the numbers the One Stroke page quotes.
 *
 *   node scripts/sim/onestroke-paths.mjs [--boards 2000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the One
 * Stroke pages say with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `step`, `undo`, `isSolved`, `isBlocked`,
 * `openCount`, `neighbours`, `adjacent` and `seedWalk` are imported from
 * `src/games/onestroke/logic.ts` rather than re-written, so these numbers
 * describe the game a child actually opens. A re-implementation would measure
 * my reading of the code, agree with itself, and be confidently wrong about a
 * game we do not ship.
 *
 * Four questions:
 *
 *   1. HOW MUCH BOARD IS THERE? A level is a grid and a number of walls, so the
 *      open squares are what is left, and one line has to cover all of them.
 *      That count also fixes the length of every answer, which is the whole
 *      reason the record is a clock rather than a tap count.
 *
 *   2. HOW TIGHT IS IT? Dead ends - open squares with a single open neighbour -
 *      are the squares a line has to enter last or not at all, so they are what
 *      turns a rectangle into a puzzle.
 *
 *   3. DOES WALKING INTO WHATEVER IS FREE WORK? A bot takes the first free
 *      neighbour it finds, in a fixed order, through the shipped rules, and the
 *      board is scored with the shipped `isSolved`. This is the number behind
 *      the pages' admission.
 *
 *   4. DOES ONE SENSIBLE RULE WORK? A second bot always steps into the free
 *      square with the fewest free neighbours of its own - go to the tightest
 *      corner first - which is the strategy the tips describe. How far that
 *      alone gets you is what makes the tip worth printing or not.
 *
 * Plus TWO INSTRUMENTED COUNTERS, and they are the reason this script exists at
 * all rather than a table of averages.
 *
 * `zigzag deals` is the regression guard. `deal` seeds from the row-by-row
 * `seedWalk` and stirs it with backbite; this column is how many dealt boards
 * are still sitting on that seed order. It must stay at zero. Pipe Flow's
 * equivalent read 91.17% for weeks while its walk came from a budgeted search
 * that gave up on nine hard deals in ten and fell back to the seed. Nothing
 * threw and no test failed; measuring which walk shipped was the only way to
 * see it.
 *
 * `frozen regions` is the honest one. A region whose two ends are both dead
 * ends has no legal backbite move at all, so its line is whatever the cut left.
 * `deal` re-cuts to avoid that - a choice among boards that are all already
 * solvable, never a retry until an answer exists - and this column says how
 * often the re-cut still could not find one.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per
 * board, so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const onestroke = await import(join(ROOT, "src/games/onestroke/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  LEVELS,
  LEVEL_IDS,
  deal,
  step,
  isSolved,
  isBlocked,
  openCount,
  neighbours,
  seedWalk,
} = onestroke;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 2000);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));

/* ------------------------------------------------------ the board's shape */

/** Every open neighbour of `cell` on this board. */
function openNeighbours(state, cell) {
  return neighbours(state.size, cell).filter((n) => !isBlocked(state, n));
}

/** Open squares with exactly one open neighbour - the corners a line can only end in. */
function deadEnds(state) {
  let n = 0;
  for (let c = 0; c < state.size * state.size; c++) {
    if (isBlocked(state, c)) continue;
    if (openNeighbours(state, c).length === 1) n++;
  }
  return n;
}

/* --------------------------------------------------------- the seed detector */

/**
 * Is this line still the seed zigzag, restricted to the squares this board has?
 *
 * Asked through the game's own `seedWalk` rather than a private copy of the
 * same six lines of arithmetic. `deal` starts from exactly that order, so a
 * stir that stopped working leaves the plan sitting on it, and a second copy
 * here is a second thing that can quietly stop agreeing with the first.
 */
function looksLikeSeed(plan, state) {
  const order = seedWalk(state.size).filter((c) => !isBlocked(state, c));
  const same = (a, b) => a.length === b.length && a.every((c, i) => c === b[i]);
  return same(plan, order) || same(plan, [...order].reverse());
}

/* --------------------------------------------------------------- the bots */

/**
 * Play a whole board with one rule for choosing the next square, through the
 * shipped `step`.
 *
 * `choose` gets the free neighbours of the head and picks one. Returning
 * nothing means stuck. Nothing here ever undoes: the question both bots answer
 * is what happens to somebody who only ever goes forward.
 */
function play(start, choose) {
  let state = start;
  const total = openCount(state);
  for (let i = 0; i < total * 2; i++) {
    const head = state.path[state.path.length - 1];
    const free = openNeighbours(state, head).filter((n) => !state.path.includes(n));
    if (free.length === 0) break;
    const next = choose(state, free);
    if (next === undefined) break;
    const taken = step(state, next);
    if (taken.outcome.kind === "ignored") throw new Error("step refused a legal move");
    state = taken.state;
    if (isSolved(state)) break;
  }
  return { solved: isSolved(state), covered: state.path.length / total };
}

/** Whatever is free first, in a fixed order. The bot that does not think. */
const blunder = (_state, free) => free[0];

/**
 * The tightest square first: the free neighbour with the fewest free
 * neighbours of its own. This is the tip the pages print, played to the letter.
 */
const careful = (state, free) => {
  let best = free[0];
  let bestScore = Infinity;
  for (const cell of free) {
    const score = openNeighbours(state, cell).filter((n) => !state.path.includes(n)).length;
    if (score < bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
};

/* ------------------------------------------------------------------- the run */

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];
  const cells = spec.size * spec.size;

  const ends = [];
  let boardsWithDeadEnd = 0;
  const seedFolds = [];
  const regionFolds = [];
  let frozen = 0;
  let zigzag = 0;

  let blunderWins = 0;
  let carefulWins = 0;
  const blunderCoverage = [];
  const carefulCoverage = [];

  for (let b = 0; b < BOARDS; b++) {
    const rng = mulberry32(b * 2654435761 + level.length * 7919);
    const { state, plan, seedFolds: seeded, folds } = deal(level, rng);

    // A deal that arrived already finished would flatter every column below. It
    // cannot happen - `deal` hands back a line one square long - but a silent
    // zero is exactly the shape that makes a table lie.
    if (isSolved(state)) throw new Error(`${level}: deal returned a finished board`);
    if (plan.length !== openCount(state))
      throw new Error(`${level}: the plan does not cover the open squares`);

    const tight = deadEnds(state);
    ends.push(tight);
    if (tight > 0) boardsWithDeadEnd++;
    seedFolds.push(seeded);
    regionFolds.push(folds);
    if (folds === 0) frozen++;
    if (looksLikeSeed(plan, state)) zigzag++;

    const one = play(state, blunder);
    if (one.solved) blunderWins++;
    blunderCoverage.push(one.covered);

    const two = play(state, careful);
    if (two.solved) carefulWins++;
    carefulCoverage.push(two.covered);
  }

  const open = cells - spec.blocked;
  return {
    level,
    size: spec.size,
    walls: spec.blocked,
    cells,
    open,
    openPct: round((open / cells) * 100),
    steps: open - 1,
    deadEnds: round(mean(ends), 2),
    deadEndBoardsPct: round((boardsWithDeadEnd / BOARDS) * 100, 1),
    seedFolds: Math.round(mean(seedFolds)),
    regionFolds: Math.round(mean(regionFolds)),
    frozenPct: round((frozen / BOARDS) * 100, 2),
    zigzagPct: round((zigzag / BOARDS) * 100, 2),
    blunderWinsPct: round((blunderWins / BOARDS) * 100, 1),
    blunderCoveragePct: round(mean(blunderCoverage) * 100),
    carefulWinsPct: round((carefulWins / BOARDS) * 100, 1),
    carefulCoveragePct: round(mean(carefulCoverage) * 100),
  };
});

/**
 * The detector has to be able to say yes, or "never fell back" is a sentence
 * about the detector rather than about the game. Hand it the seed order on a
 * board with no walls and require a positive reading.
 */
const control = (() => {
  const bare = { size: 5, blocked: [], start: 0, path: [0] };
  return looksLikeSeed(seedWalk(5), bare) && !looksLikeSeed([...seedWalk(5)].slice(1), bare);
})();
if (!control) throw new Error("the seed detector cannot fire; every reading above is worthless");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, seedDetectorControl: control, rows }, null, 2));
} else {
  console.log(`one stroke: ${BOARDS.toLocaleString("en-US")} dealt boards per level\n`);
  console.log(
    "level     grid  walls  open  open %  steps  dead ends  boards with one  grid folds  region folds  frozen  zigzag deals",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${(r.size + "x" + r.size).padStart(4)} ${String(r.walls).padStart(6)} ` +
        `${String(r.open).padStart(5)} ${String(r.openPct + "%").padStart(7)} ` +
        `${String(r.steps).padStart(6)} ${String(r.deadEnds).padStart(10)} ` +
        `${String(r.deadEndBoardsPct + "%").padStart(16)} ` +
        `${String(r.seedFolds).padStart(11)} ${String(r.regionFolds).padStart(13)} ` +
        `${String(r.frozenPct + "%").padStart(7)} ${String(r.zigzagPct + "%").padStart(13)}`,
    );
  }

  console.log("\ntwo bots, both driven through the shipped rules, neither ever taking a step back:\n");
  console.log("level     first free square wins  board covered  tightest square wins  board covered");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${String(r.blunderWinsPct + "%").padStart(22)} ` +
        `${String(r.blunderCoveragePct + "%").padStart(14)} ` +
        `${String(r.carefulWinsPct + "%").padStart(21)} ` +
        `${String(r.carefulCoveragePct + "%").padStart(14)}`,
    );
  }

  console.log(
    "\nEvery board is finishable by construction: `deal` stirs one walk that visits every\n" +
      "square, then takes the walls off the ENDS of it, so what is left is still one\n" +
      "unbroken line over exactly the squares that remain. 'steps' is therefore the same\n" +
      "for every answer on a level, which is why the record is the clock.\n" +
      "'zigzag deals' is the regression guard - boards still sitting on the unstirred seed\n" +
      "walk. A whole tier above zero means the stir stopped working; the same column read\n" +
      "91.17% on Pipe Flow's hard tier while its walk came from a budgeted search.\n" +
      "'frozen' is regions whose two ends are both dead ends, where backbite has no legal\n" +
      "move and the line is whatever the cut left. Those boards are still solvable.\n" +
      `Seed detector control: ${control ? "fires" : "DEAD"}.`,
  );
}
