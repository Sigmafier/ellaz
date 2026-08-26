#!/usr/bin/env node
/**
 * Derives the numbers the Pipe Flow page quotes.
 *
 *   node scripts/sim/flow-routes.mjs [--boards 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the flow
 * page says with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `beginAt`, `extendTo`, `release`,
 * `isSolved`, `cellOwner`, `endpointAt`, `neighbours` and `adjacent` are
 * imported from `src/games/flow/logic.ts` rather than re-written, so these
 * numbers describe the game a child actually opens. A re-implementation would
 * measure my reading of the code, agree with itself, and be confidently wrong
 * about a game we do not ship.
 *
 * Four questions:
 *
 *   1. HOW LONG IS A ROUTE? `deal` builds a walk that visits every cell of the
 *      grid once and cuts it into one segment per colour, so the segments ARE
 *      the solution. Their lengths say how much pipe a tier asks for, and the
 *      longest one per board says how lopsided a board can be.
 *
 *   2. HOW MUCH OF THE BOARD IS ONE COLOUR'S PROBLEM? The longest segment as a
 *      share of the grid. A tier with six pairs is not six equal jobs.
 *
 *   3. HOW FAR APART DO THE DOTS LOOK, versus how far the pipe actually runs?
 *      The two dots of a pair sit some straight grid distance apart, and the
 *      route between them is longer. That gap is the puzzle: a pair that looks
 *      like a two-step hop is asking for a route that wanders.
 *
 *   4. WHAT HAPPENS IF YOU JUST JOIN EVERY PAIR THE SHORT WAY? A bot lays each
 *      colour along its own shortest legal route, through the shipped rules,
 *      and the board is scored with the shipped `isSolved`. This is the number
 *      behind the page's admission.
 *
 * Plus one REGRESSION GUARD, and it is the reason this script exists at all.
 * `randomTour` seeds from the row-by-row `boustrophedon` walk and stirs it with
 * backbite moves; the `snake deals` column is how many dealt boards are still
 * recognisable as that seed. It must stay at zero.
 *
 * It has not always been. Until 2026-08-25 the walk came from a randomised
 * depth-first SEARCH under a 200,000-node budget, and on a 7x7 that budget ran
 * out almost every time: this column read 91.17% on hard and 53.75% on medium,
 * so nine hard boards in ten were cut from the same underlying walk. Nothing
 * threw and no test failed. Measuring which branch ran was the only way to see
 * it, which is why the column stays here now that it reads zero.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per
 * board, so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const flow = await import(join(ROOT, "src/games/flow/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  LEVELS,
  LEVEL_IDS,
  deal,
  beginAt,
  extendTo,
  release,
  isSolved,
  cellOwner,
  endpointAt,
  neighbours,
  adjacent,
  rowOf,
  colOf,
} = flow;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 4000);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));

/** Grid distance between two cells: the fewest steps a pipe could possibly take. */
function gridSteps(size, a, b) {
  return Math.abs(rowOf(a, size) - rowOf(b, size)) + Math.abs(colOf(a, size) - colOf(b, size));
}

/* ------------------------------------------------------- the fallback probe */

/**
 * The SEED walk `randomTour` starts from before it stirs: along row 0, back
 * along row 1, and so on.
 *
 * Rebuilt here rather than imported because `boustrophedon` is private to
 * `logic.ts`. That is safe in a way re-implementing the RULES would not be: it
 * is six lines of arithmetic with no game in it, it is only ever used to ASK a
 * question about a board rather than to produce one, and the control below
 * proves the detector fires on a board genuinely cut from it.
 */
function snake(size) {
  const out = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) out.push(r * size + (r % 2 === 0 ? i : size - 1 - i));
  }
  return out;
}

/**
 * Was this board cut straight from the seed walk rather than from a stirred one?
 *
 * A segment of the snake is a run of consecutive snake positions, so a board
 * dealt from it has every segment monotone in snake order. A stirred walk would
 * have to land back ON the snake (or its reverse) for that to happen by
 * accident, and a board that IS the snake is the board this is asking about
 * anyway - so the over-count is exactly the thing being counted.
 *
 * Landing back on it by chance is not a defect and the column should not be
 * read as one: at 5x5 the stir is 5,000 folds over a space small enough that
 * one deal in 4,000 comes home. What would be a defect is a whole tier sitting
 * high, which is what 91.17% on hard looked like.
 */
function looksLikeSnake(plan, size) {
  const at = new Map(snake(size).map((cell, i) => [cell, i]));
  return plan.every((seg) => {
    const step = at.get(seg[1]) - at.get(seg[0]);
    if (step !== 1 && step !== -1) return false;
    return seg.every((cell, i) => at.get(cell) - at.get(seg[0]) === i * step);
  });
}

/* --------------------------------------------------------- the shortest-way bot */

/**
 * The shortest route this colour can still take, or null if it has none left.
 *
 * Avoids every cell another pipe already covers and every other colour's dot,
 * which is exactly what `extendTo` refuses, so the route it returns is one the
 * shipped rules will actually accept step by step.
 */
function shortestRoute(state, color) {
  const [from, to] = state.endpoints[color];
  const size = state.size;
  const seen = new Set([from]);
  const back = new Map();
  const queue = [from];

  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    if (cell === to) {
      const route = [cell];
      let at = cell;
      while (at !== from) {
        at = back.get(at);
        route.unshift(at);
      }
      return route;
    }
    for (const next of neighbours(size, cell)) {
      if (seen.has(next)) continue;
      const dot = endpointAt(state, next);
      if (dot !== null && dot !== color) continue;
      if (cellOwner(state, next) !== null) continue;
      seen.add(next);
      back.set(next, cell);
      queue.push(next);
    }
  }
  return null;
}

/**
 * Join every pair by its shortest route, in the order the deal handed the
 * colours over, and report what the board thinks of the result.
 *
 * Driven through `beginAt` / `extendTo` / `release` rather than by writing
 * paths into the state, so anything the rules refuse shows up as a refusal here
 * instead of as a board the game would never accept.
 */
function playShortest(start) {
  let state = start;
  let blocked = 0;

  for (let color = 0; color < state.endpoints.length; color++) {
    const route = shortestRoute(state, color);
    if (route === null) {
      blocked++;
      continue;
    }
    const begun = beginAt(state, route[0]);
    if (begun.outcome.kind === "ignored") throw new Error("beginAt refused a dot");
    state = begun.state;
    for (const cell of route.slice(1)) {
      const step = extendTo(state, cell);
      if (step.outcome.kind === "ignored") throw new Error("extendTo refused a planned step");
      state = step.state;
    }
    state = release(state).state;
  }

  const covered = new Set();
  for (const path of state.paths) for (const cell of path) covered.add(cell);

  return {
    blocked,
    solved: isSolved(state),
    coverage: covered.size / (state.size * state.size),
    moves: state.moves,
  };
}

/* ------------------------------------------------------------------- the run */

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];
  const cells = spec.size * spec.size;

  const routeLengths = [];
  const longestPerBoard = [];
  const shortestPerBoard = [];
  const gaps = [];
  let adjacentPairs = 0;
  let snakeBoards = 0;

  let blockedBoards = 0;
  let solvedByShortest = 0;
  const coverage = [];
  const shortestMoves = [];

  for (let b = 0; b < BOARDS; b++) {
    const rng = mulberry32(b * 2654435761 + level.length * 7919);
    const { state, plan } = deal(level, rng);

    // A deal that arrived already finished would flatter every column below. It
    // cannot happen - `deal` hands back empty paths - but a silent zero is
    // exactly the shape that makes a table lie.
    if (isSolved(state)) throw new Error(`${level}: deal returned a solved board`);
    if (plan.reduce((a, s) => a + s.length, 0) !== cells)
      throw new Error(`${level}: the plan does not cover the grid`);

    let longest = 0;
    let shortest = Infinity;
    for (const seg of plan) {
      routeLengths.push(seg.length);
      longest = Math.max(longest, seg.length);
      shortest = Math.min(shortest, seg.length);
    }
    longestPerBoard.push(longest);
    shortestPerBoard.push(shortest);

    for (const [a, z] of state.endpoints) {
      gaps.push(gridSteps(spec.size, a, z) + 1);
      if (adjacent(spec.size, a, z)) adjacentPairs++;
    }

    if (looksLikeSnake(plan, spec.size)) snakeBoards++;

    const run = playShortest(state);
    if (run.blocked > 0) blockedBoards++;
    if (run.solved) solvedByShortest++;
    coverage.push(run.coverage);
    shortestMoves.push(run.moves);
  }

  const pairs = BOARDS * spec.pairs;
  return {
    level,
    size: spec.size,
    pairs: spec.pairs,
    cells,
    meanRoute: round(mean(routeLengths)),
    shortestRoute: Math.min(...shortestPerBoard),
    longestRoute: round(mean(longestPerBoard)),
    longestSeen: Math.max(...longestPerBoard),
    longestSharePct: round((mean(longestPerBoard) / cells) * 100),
    meanGap: round(mean(gaps)),
    detour: round(mean(routeLengths) / mean(gaps), 2),
    adjacentPairsPct: round((adjacentPairs / pairs) * 100, 2),
    snakeBoardsPct: round((snakeBoards / BOARDS) * 100, 2),
    shortestCoveragePct: round(mean(coverage) * 100),
    shortestBlockedPct: round((blockedBoards / BOARDS) * 100, 1),
    shortestSolvedPct: round((solvedByShortest / BOARDS) * 100, 2),
    shortestMoves: round(mean(shortestMoves)),
  };
});

/**
 * The detector has to be able to say yes, or "never fell back" is a sentence
 * about the detector rather than about the game. Cut the snake into segments by
 * hand and require a positive reading.
 */
const control = (() => {
  const tour = snake(5);
  const plan = [tour.slice(0, 7), tour.slice(7, 13), tour.slice(13, 19), tour.slice(19)];
  return looksLikeSnake(plan, 5);
})();
if (!control) throw new Error("the snake detector cannot fire; every reading above is worthless");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, snakeDetectorControl: control, rows }, null, 2));
} else {
  console.log(`pipe flow: ${BOARDS.toLocaleString("en-US")} dealt boards per level\n`);
  console.log(
    "level     grid  pairs  cells  mean route  longest  longest %  straight  detour  adj pairs  snake deals",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${(r.size + "x" + r.size).padStart(4)} ${String(r.pairs).padStart(6)} ` +
        `${String(r.cells).padStart(6)} ${String(r.meanRoute).padStart(11)} ` +
        `${String(r.longestRoute).padStart(8)} ${String(r.longestSharePct + "%").padStart(10)} ` +
        `${String(r.meanGap).padStart(9)} ${String(r.detour + "x").padStart(7)} ` +
        `${String(r.adjacentPairsPct + "%").padStart(10)} ${String(r.snakeBoardsPct + "%").padStart(12)}`,
    );
  }

  console.log("\njoin every pair by its own shortest route, through the shipped rules:\n");
  console.log("level     board covered  boards won  a colour left with no route  routes laid");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${String(r.shortestCoveragePct + "%").padStart(13)} ` +
        `${String(r.shortestSolvedPct + "%").padStart(11)} ` +
        `${String(r.shortestBlockedPct + "%").padStart(28)} ${String(r.shortestMoves).padStart(12)}`,
    );
  }

  console.log(
    "\nEvery board is solvable by construction: `deal` cuts a walk that already visited\n" +
      "every cell, so the segments cover the grid and cannot overlap. 'mean route' is one\n" +
      "of those segments; 'straight' is the shortest pipe that could join the same two\n" +
      "dots, so 'detour' is how much further the real route runs. The second table is the\n" +
      "page's admission: joining every pair is not winning.\n" +
      "'snake deals' is the regression guard - boards still recognisable as the unstirred\n" +
      "seed walk. A whole tier above zero means the stir stopped working; it read 91.17%\n" +
      "on hard while the walk came from a budgeted search.\n" +
      `Snake detector control: ${control ? "fires" : "DEAD"}.`,
  );
}
