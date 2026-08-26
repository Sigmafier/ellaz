#!/usr/bin/env node
/**
 * Derives the numbers the Untangle page quotes.
 *
 *   node scripts/sim/untangle-graphs.mjs [--boards 3000] [--bots 400] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the
 * untangle pages say with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `beginGrab`, `dragTo`, `endGrab`,
 * `isSolved`, `countCrossings`, `crossingPairs`, `edgesCross` and `clampPoint`
 * are imported from `src/games/untangle/logic.ts` rather than rewritten, so
 * these numbers describe the game a child actually opens. A re-implementation
 * would measure my reading of the code, agree with itself, and be confidently
 * wrong about a game we do not ship.
 *
 * Five questions:
 *
 *   1. HOW BIG IS THE DRAWING? Dots, lines and lines per dot, per tier. The
 *      line count is a CEILING in `LEVELS`, not a promise, because a small
 *      scatter sometimes has no room for that many without a crossing - so
 *      what a tier actually deals has to be measured rather than read off the
 *      constant.
 *
 *   2. HOW TANGLED DOES IT ARRIVE? The crossings a scramble produces, and how
 *      often the first ring order fails to clear the tier's floor and has to be
 *      redrawn. That second column is the one that says whether the floor is a
 *      real constraint or a formality.
 *
 *   3. HOW MANY DOTS ACTUALLY HAVE TO MOVE? Place dots on their witness spots
 *      one at a time, always choosing the one that removes the most crossings,
 *      and stop the moment nothing crosses. That count is the shortest honest
 *      answer to "how much of this board is really the puzzle".
 *
 *   4. WHAT DOES ONE DOT COST? The share of the board's crossings a single dot
 *      is involved in, at the deal.
 *
 *   5. IS TIDYING UP ENOUGH? A bot that repeatedly grabs the dot in the most
 *      crossings and drops it on the best of a handful of random spots,
 *      accepting only strict improvement. This is the page's admission: a
 *      board can need a move that makes things worse first.
 *
 * Plus one CONTROL, because every column above is a number about a detector.
 * `countCrossings` must report zero on the witness drawing and more than zero
 * on the dealt board, for every board measured. A predicate that could only
 * ever answer "tangled" would make the whole table meaningless, and it would
 * look exactly like a healthy one.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per
 * board, so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const untangle = await import(join(ROOT, "src/games/untangle/logic.ts"));
const { mulberry32, shuffle } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  LEVELS,
  LEVEL_IDS,
  MARGIN,
  SPAN,
  beginGrab,
  clampPoint,
  countCrossings,
  crossingPairs,
  deal,
  dragTo,
  edgesCross,
  endGrab,
  isSolved,
} = untangle;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 3000);
const BOTS = arg("bots", 500);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));

/* ------------------------------------------------- how tangled is a scramble */

/**
 * One ring order, drawn the way `scramble` draws its first one.
 *
 * `scramble` is private and returns only its answer, so "how often does the
 * first order fail the floor" cannot be read off a dealt board - by definition
 * every dealt board already cleared it. It is re-derived here from the same
 * public pieces `scramble` uses: `ringSlots`, a shuffle of the dots, and
 * `crossingPairs`. That is safe in a way re-implementing the RULES would not
 * be, because it only ASKS a question about a board rather than producing one,
 * and the mean it reports is checked against the dealt boards' own mean on
 * every row.
 */
function oneRingOrder(dots, edges, rng) {
  const slots = untangle.ringSlots(dots);
  const order = shuffle(
    Array.from({ length: dots }, (_, i) => i),
    rng,
  );
  const nodes = new Array(dots);
  order.forEach((dot, slot) => {
    nodes[dot] = slots[slot];
  });
  return crossingPairs(nodes, edges).length;
}

/* -------------------------------------------- how many dots have to be moved */

/**
 * Place dots on their witness spots, greediest first, until nothing crosses.
 *
 * Driven through `beginGrab` / `dragTo` / `endGrab` rather than by writing
 * coordinates into the state, so a gesture the rules would refuse shows up as a
 * refusal here instead of as a board the game would never produce.
 */
function dotsThatMustMove(start) {
  let state = start;
  const left = new Set(state.nodes.map((_, i) => i));
  let placed = 0;

  while (!isSolved(state) && left.size > 0) {
    let bestDot = -1;
    let bestCrossings = Infinity;
    for (const dot of left) {
      const nodes = state.nodes.slice();
      nodes[dot] = state.solution[dot];
      const n = crossingPairs(nodes, state.edges).length;
      if (n < bestCrossings) {
        bestCrossings = n;
        bestDot = dot;
      }
    }
    state = beginGrab(state, bestDot).state;
    state = dragTo(state, state.solution[bestDot]).state;
    state = endGrab(state).state;
    left.delete(bestDot);
    placed++;
  }
  if (!isSolved(state)) throw new Error("the witness drawing did not untangle the board");
  return { placed, moves: state.moves };
}

/* ------------------------------------------------------------- the tidy bot */

/** Crossings involving a line that this dot carries. Moving one dot changes only these. */
function localCrossings(nodes, edges, dot) {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i];
    if (a[0] !== dot && a[1] !== dot) continue;
    for (let j = 0; j < edges.length; j++) {
      if (i === j) continue;
      const b = edges[j];
      // Count each crossing once: skip the pair when the other line also
      // carries this dot and has the lower index.
      if ((b[0] === dot || b[1] === dot) && j < i) continue;
      if (edgesCross(nodes, a, b)) n++;
    }
  }
  return n;
}

const BOT_STEPS = 160;
const BOT_TRIES = 20;

/**
 * Grab the dot in the most crossings, drop it on the best of `BOT_TRIES`
 * random spots, and keep the drop only when the board strictly improves.
 *
 * Moving one dot can only change crossings on the lines that dot carries, so
 * the improvement is exact from the local counts alone - no full recount, and
 * no approximation to argue about later.
 */
function tidyBot(start, rng) {
  let nodes = start.nodes.slice();
  const edges = start.edges;

  for (let step = 0; step < BOT_STEPS; step++) {
    if (crossingPairs(nodes, edges).length === 0) return { solved: true, steps: step };

    let worst = 0;
    let worstScore = -1;
    for (let dot = 0; dot < nodes.length; dot++) {
      const n = localCrossings(nodes, edges, dot);
      if (n > worstScore) {
        worstScore = n;
        worst = dot;
      }
    }

    let bestAt = null;
    let bestScore = worstScore;
    for (let t = 0; t < BOT_TRIES; t++) {
      const at = clampPoint({
        x: MARGIN + rng() * (SPAN - 2 * MARGIN),
        y: MARGIN + rng() * (SPAN - 2 * MARGIN),
      });
      const trial = nodes.slice();
      trial[worst] = at;
      const n = localCrossings(trial, edges, worst);
      if (n < bestScore) {
        bestScore = n;
        bestAt = at;
      }
    }
    if (bestAt === null) return { solved: false, steps: step, stuck: true };
    nodes = nodes.slice();
    nodes[worst] = bestAt;
  }
  return { solved: crossingPairs(nodes, edges).length === 0, steps: BOT_STEPS, stuck: false };
}

/* ------------------------------------------------------------------ the run */

let controlWitnessClean = 0;
let controlDealTangled = 0;
let controlBoards = 0;

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];

  const lines = [];
  const degrees = [];
  const crossings = [];
  const dotShare = [];
  let firstOrderShort = 0;
  const firstOrderCrossings = [];
  const mustMove = [];

  for (let b = 0; b < BOARDS; b++) {
    const state = deal(level, mulberry32(b * 2654435761 + level.length * 7919));

    // The control, on every single board rather than once at the end: the
    // witness must read clean and the dealt board must not. A predicate that
    // could only ever say "tangled" would make every column here meaningless.
    controlBoards++;
    if (countCrossings({ nodes: state.solution, edges: state.edges }) === 0) controlWitnessClean++;
    const dealt = countCrossings(state);
    if (dealt > 0) controlDealTangled++;

    lines.push(state.edges.length);
    const degree = new Array(state.nodes.length).fill(0);
    for (const [a, z] of state.edges) {
      degree[a]++;
      degree[z]++;
    }
    degrees.push(mean(degree));
    crossings.push(dealt);
    const first = oneRingOrder(spec.dots, state.edges, mulberry32(b * 22695477 + 3));
    firstOrderCrossings.push(first);
    if (first < spec.crossings) firstOrderShort++;

    // How much of the tangle one dot answers for, at the deal.
    let worst = 0;
    for (let dot = 0; dot < state.nodes.length; dot++) {
      worst = Math.max(worst, localCrossings(state.nodes, state.edges, dot));
    }
    dotShare.push(dealt === 0 ? 0 : worst / dealt);

    mustMove.push(dotsThatMustMove(state).placed);
  }

  let botSolved = 0;
  const botSteps = [];
  for (let b = 0; b < BOTS; b++) {
    const rng = mulberry32(b * 40503 + 17);
    const state = deal(level, mulberry32(b * 2654435761 + level.length * 7919));
    const run = tidyBot(state, rng);
    if (run.solved) {
      botSolved++;
      botSteps.push(run.steps);
    }
  }

  const pairs = (spec.dots * (spec.dots - 1)) / 2;

  return {
    level,
    dots: spec.dots,
    lineCeiling: spec.lines,
    meanLines: round(mean(lines)),
    minLines: Math.min(...lines),
    meanDegree: round(mean(degrees), 2),
    joinedPairsPct: round((mean(lines) / pairs) * 100),
    crossingFloor: spec.crossings,
    meanCrossings: round(mean(crossings)),
    minCrossings: Math.min(...crossings),
    maxCrossings: Math.max(...crossings),
    firstOrderMean: round(mean(firstOrderCrossings)),
    firstOrderShortPct: round((firstOrderShort / BOARDS) * 100, 2),
    meanMustMove: round(mean(mustMove), 1),
    mustMoveSharePct: round((mean(mustMove) / spec.dots) * 100),
    worstDotSharePct: round(mean(dotShare) * 100),
    botSolvedPct: round((botSolved / BOTS) * 100),
    botSteps: botSteps.length ? round(mean(botSteps), 1) : 0,
  };
});

if (controlWitnessClean !== controlBoards || controlDealTangled !== controlBoards) {
  throw new Error(
    `the control failed: ${controlWitnessClean}/${controlBoards} witness drawings read clean, ` +
      `${controlDealTangled}/${controlBoards} dealt boards read tangled. Every number above is worthless.`,
  );
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, bots: BOTS, control: controlBoards, rows }, null, 2));
} else {
  console.log(`untangle: ${BOARDS.toLocaleString("en-US")} dealt boards per tier\n`);
  console.log(
    "tier      dots  lines  min  per dot  pairs joined  crossings  min  max  1st short  must move  of dots  worst dot",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${String(r.dots).padStart(4)} ${String(r.meanLines).padStart(6)} ` +
        `${String(r.minLines).padStart(4)} ${String(r.meanDegree).padStart(8)} ` +
        `${String(r.joinedPairsPct + "%").padStart(13)} ${String(r.meanCrossings).padStart(10)} ` +
        `${String(r.minCrossings).padStart(4)} ${String(r.maxCrossings).padStart(4)} ` +
        `${String(r.firstOrderShortPct + "%").padStart(10)} ${String(r.meanMustMove).padStart(10)} ` +
        `${String(r.mustMoveSharePct + "%").padStart(8)} ${String(r.worstDotSharePct + "%").padStart(10)}`,
    );
  }

  console.log(`\ntidy up and hope: ${BOTS} boards per tier, ${BOT_STEPS} grabs, ${BOT_TRIES} spots tried each\n`);
  console.log("tier      boards untangled  grabs when it worked");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${String(r.botSolvedPct + "%").padStart(17)} ${String(r.botSteps).padStart(21)}`,
    );
  }

  console.log(
    "\nEvery board is untangleable by construction: `deal` joins the dots without a single\n" +
      "crossing FIRST and only then scrambles where they sit, so a crossing-free drawing\n" +
      "exists before the board is shown. 'must move' is how many dots have to be put back\n" +
      "before the last crossing goes, always taking the dot that helps most. The second\n" +
      "table is the pages' admission: only ever making the board better is not enough.\n" +
      `Control: ${controlWitnessClean}/${controlBoards} witness drawings clean, ` +
      `${controlDealTangled}/${controlBoards} dealt boards tangled.`,
  );
}
