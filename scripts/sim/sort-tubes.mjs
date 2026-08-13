#!/usr/bin/env node
/**
 * Derives the numbers the colour-sort page quotes.
 *
 *   node scripts/sim/sort-tubes.mjs [--boards 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the sort
 * page says with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `pourCount`, `pour` and `isSolved` are
 * imported from `src/games/sort/logic.ts` rather than re-written, so these
 * numbers describe the game a child actually opens. A re-implementation would
 * measure my reading of the code, agree with itself, and be confidently wrong
 * about a game we do not ship.
 *
 * Three questions, and the third is the one worth a page:
 *
 *   1. HOW FAR FROM SOLVED does a board arrive? `deal` walks backwards from the
 *      finished board and hands the trail back as `plan`, so reversing it always
 *      wins. Its LENGTH is an honest upper bound on the puzzle - never the best
 *      route, because a random walk away from the answer wanders.
 *
 *   2. CAN YOU WEDGE IT? Every board has a solution. That is a property of the
 *      construction, not a claim about it. It says nothing about whether a
 *      player can pour themselves into a corner with no legal pour left, which
 *      is the question undo exists to answer - so a bot pours at random until it
 *      wins, jams, or hits the cap.
 *
 *   3. WHAT DOES A SENSIBLE STRATEGY GET? A bot with no memory and no plan:
 *      finish a tube if a pour finishes one, otherwise stack onto a matching
 *      colour, and only spend an empty tube when there is nothing else. It is
 *      roughly what a person does on their first board, and it is a floor on
 *      what thinking is worth here, not a ceiling.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per board,
 * so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sort = await import(join(ROOT, "src/games/sort/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const { LEVELS, LEVEL_IDS, deal, pour, pourCount, topRun, isSolved } = sort;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 4000);
const CAP = arg("cap", 400);

/** Every pour the rules allow right now, asked of the shipped `pourCount`. */
function legalMoves(state) {
  const out = [];
  for (let from = 0; from < state.tubes.length; from++) {
    if (state.tubes[from].length === 0) continue;
    for (let to = 0; to < state.tubes.length; to++) {
      const count = pourCount(state, from, to);
      if (count > 0) out.push({ from, to, count });
    }
  }
  return out;
}

/**
 * Pouring a full tube of one colour into an empty one is legal and changes
 * nothing, so a random bot can shuffle finished tubes around forever and a
 * greedy one can loop on them. Both bots ignore these, which is also what a
 * player does - nobody moves a finished tube for fun.
 */
function isPointless(state, m) {
  const source = state.tubes[m.from];
  const run = topRun(source);
  return run !== null && run.count === source.length && state.tubes[m.to].length === 0;
}

/** Uniform over the legal pours. The question is only whether it jams. */
function playRandom(state, rng) {
  let s = state;
  for (let i = 0; i < CAP; i++) {
    if (isSolved(s)) return { outcome: "solved", pours: i };
    const options = legalMoves(s).filter((m) => !isPointless(s, m));
    if (options.length === 0) return { outcome: "wedged", pours: i };
    const m = options[Math.floor(rng() * options.length)];
    s = pour(s, m.from, m.to);
  }
  return { outcome: "capped", pours: CAP };
}

/**
 * What a first-time player does, scored rather than branched so the ordering is
 * one table instead of a stack of ifs.
 *
 * The negative on an empty destination is the whole strategy: two spare tubes is
 * all the room the board gives, and spending one to park a single ball is how a
 * position stops having a next move.
 */
function scoreMove(state, m, previous) {
  const dest = state.tubes[m.to];
  const source = state.tubes[m.from];
  const run = topRun(source);
  let score = 0;

  if (dest.length + m.count === state.capacity && (dest.length === 0 || dest[0] === run.color))
    score += 100; // finishes a tube
  if (dest.length > 0) score += 40;
  if (m.count === run.count) score += 20; // clears the whole run, exposing what is under it
  if (m.count === source.length) score += 15; // empties the source
  if (dest.length === 0) score -= 60; // spends one of the two spares
  if (previous && previous.from === m.to && previous.to === m.from) score -= 1000;
  return score;
}

function playGreedy(state, rng) {
  let s = state;
  let previous = null;
  for (let i = 0; i < CAP; i++) {
    if (isSolved(s)) return { outcome: "solved", pours: i };
    const options = legalMoves(s).filter((m) => !isPointless(s, m));
    if (options.length === 0) return { outcome: "wedged", pours: i };

    let best = -Infinity;
    let pick = [];
    for (const m of options) {
      const score = scoreMove(s, m, previous);
      if (score > best) {
        best = score;
        pick = [m];
      } else if (score === best) pick.push(m);
    }
    const m = pick[Math.floor(rng() * pick.length)];
    s = pour(s, m.from, m.to);
    previous = m;
  }
  return { outcome: "capped", pours: CAP };
}

const rows = LEVEL_IDS.map((level) => {
  const spec = LEVELS[level];
  let planTotal = 0;
  let planMin = Infinity;
  let planMax = 0;
  const random = { solved: 0, wedged: 0, capped: 0 };
  const greedy = { solved: 0, wedged: 0, capped: 0 };
  let greedyPours = 0;
  let randomPours = 0;

  for (let b = 0; b < BOARDS; b++) {
    const rng = mulberry32(b * 2654435761 + level.length * 7919);
    const { state, plan } = deal(level, rng);
    planTotal += plan.length;
    planMin = Math.min(planMin, plan.length);
    planMax = Math.max(planMax, plan.length);

    // A board `deal` handed back already solved would flatter every column
    // below. It cannot happen - `deal` re-scrambles rather than ship one - but
    // a silent zero is exactly the shape that makes a table lie.
    if (isSolved(state)) throw new Error(`${level}: deal returned an already-solved board`);

    const r = playRandom(state, mulberry32(b + 1));
    random[r.outcome]++;
    if (r.outcome === "solved") randomPours += r.pours;

    const g = playGreedy(state, mulberry32(b + 1));
    greedy[g.outcome]++;
    if (g.outcome === "solved") greedyPours += g.pours;
  }

  return {
    level,
    colors: spec.colors,
    tubes: spec.colors + spec.spare,
    spare: spec.spare,
    capacity: spec.capacity,
    scrambleSteps: spec.colors * spec.capacity * 4,
    planPours: Number((planTotal / BOARDS).toFixed(1)),
    planShortest: planMin,
    planLongest: planMax,
    randomWedgedPct: Number(((random.wedged / BOARDS) * 100).toFixed(1)),
    randomSolvedPct: Number(((random.solved / BOARDS) * 100).toFixed(1)),
    randomPours: random.solved ? Number((randomPours / random.solved).toFixed(1)) : null,
    greedySolvedPct: Number(((greedy.solved / BOARDS) * 100).toFixed(1)),
    greedyWedgedPct: Number(((greedy.wedged / BOARDS) * 100).toFixed(1)),
    greedyPours: greedy.solved ? Number((greedyPours / greedy.solved).toFixed(1)) : null,
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, cap: CAP, rows }, null, 2));
} else {
  console.log(`colour sort: ${BOARDS.toLocaleString("en-US")} dealt boards per level\n`);
  console.log(
    "level    colours  tubes  trail back  random wins  random jams  random pours  greedy wins  greedy pours",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${String(r.colors).padStart(7)} ${String(r.tubes).padStart(6)} ` +
        `${String(r.planPours).padStart(11)} ` +
        `${String(r.randomSolvedPct + "%").padStart(12)} ${String(r.randomWedgedPct + "%").padStart(12)} ` +
        `${String(r.randomPours).padStart(13)} ` +
        `${String(r.greedySolvedPct + "%").padStart(12)} ${String(r.greedyPours).padStart(13)}`,
    );
  }
  console.log(
    "\nEvery board is solvable by construction: `deal` walks backwards from the finished\n" +
      "board, so reversing its trail always wins. 'trail back' is that walk's length - an\n" +
      "upper bound, never the best route. The jam column is the one undo exists for.",
  );
}
