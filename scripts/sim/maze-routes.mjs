#!/usr/bin/env node
/**
 * Derives the numbers the Way Home page quotes.
 *
 *   node scripts/sim/maze-routes.mjs [--deals 20000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the maze
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED REDUCER. `newMaze`, `tap`, `optimalRoute`, `distances`,
 * `openNeighbours` and `isSolved` are imported from `src/games/maze/logic.ts`
 * rather than re-written, so every deal below is a deal a child could actually
 * be handed - the same carve, the same braid, the same rule that a route picks
 * up every crumb it walks over. A re-implementation would measure my reading of
 * the code, agree with itself, and be confidently wrong about a game we do not
 * ship.
 *
 * Three questions, and the first is the one worth a page:
 *
 *   1. IS THE OBVIOUS ORDER THE RIGHT ONE? The header of `logic.ts` claims the
 *      skill here is choosing an ORDER rather than reacting. That is measurable:
 *      play each deal three ways - the brute-forced optimum, a bot that always
 *      walks to the nearest crumb, and a bot that takes them in reading order -
 *      and the gap between them IS the size of the skill, in steps.
 *
 *   2. HOW MUCH DOES THE ORDER MATTER AT ALL? Same deal, best order against
 *      worst order. If the spread is small the game has no puzzle in it; if it
 *      is large, "perfect" is a real thing to aim at.
 *
 *   3. IS EASY ACTUALLY A MAZE? `LEVELS.easy.braid` is 0.9, which opens nine in
 *      ten dead ends back up. So count the dead ends that survive, per level.
 *      This is the page's admission and it should be measured rather than
 *      asserted.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per deal,
 * so every row below replays exactly.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const maze = await import(join(ROOT, "src/games/maze/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  DIFFICULTIES,
  LEVELS,
  distances,
  isSolved,
  newMaze,
  openNeighbours,
  optimalRoute,
  tap,
} = maze;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
// 20,000 deals settles every cell below to within a hundredth of a step between
// a 5,000-deal and a 20,000-deal pass.
const DEALS = arg("deals", 20000);

/* -------------------------------------------------------------------- bots */

/**
 * Walk to the nearest crumb still out there, over and over, then go home.
 *
 * The order a person actually reaches for, and the one `optimalRoute`'s comment
 * says is wrong often enough to matter. Ties break on the lowest cell index so
 * a deal replays identically.
 */
function nearestFirst(state) {
  const d = distances(state.walls, state.size, state.at);
  let best = state.cheese[0];
  for (const c of state.cheese) if (d[c] < d[best]) best = c;
  return best;
}

/** Take the crumbs in reading order - top left to bottom right. */
function readingOrder(state) {
  return state.cheese[0]; // `cheese` is kept ascending by `newMaze`
}

const BOTS = { nearest: nearestFirst, reading: readingOrder };

/**
 * One run, driven entirely through the shipped `tap`.
 *
 * So the route is the one the mouse really walks, and crumbs collected on the
 * way to somewhere else count exactly as they do in the game.
 */
function play(state, choose) {
  let s = state;
  let guard = 0;
  while (s.cheese.length > 0) {
    if (guard++ > s.size * s.size) throw new Error("maze: a bot failed to collect a crumb");
    const target = choose(s);
    const { state: next, outcome } = tap(s, target);
    if (outcome.kind !== "moved") {
      throw new Error(`maze: the shipped rules refused a walk to ${target} (${outcome.kind})`);
    }
    s = next;
  }
  const { state: done, outcome } = tap(s, s.home);
  if (outcome.kind !== "moved" || !outcome.solved) {
    throw new Error("maze: home was not reachable, which a carved maze forbids");
  }
  if (!isSolved(done)) throw new Error("maze: finished a maze the rules do not call solved");
  return done.steps;
}

/* ------------------------------------------------------- the worst ordering */

function permutations(items) {
  if (items.length <= 1) return [items];
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i], ...tail]);
  }
  return out;
}

/**
 * The most expensive order of crumbs, over the game's own distances.
 *
 * `optimalRoute` already gives the cheapest; this is its mirror, so the pair
 * bounds how much the ORDER can possibly be worth on one deal. It measures the
 * pure ordering cost and deliberately ignores crumbs picked up en route, which
 * only ever makes a bad order look better than it is.
 */
function worstRoute(state) {
  const points = [state.at, ...state.cheese, state.home];
  const from = points.map((p) => distances(state.walls, state.size, p));
  let worst = -1;
  for (const order of permutations(state.cheese.map((_, i) => i + 1))) {
    let total = 0;
    let at = 0;
    for (const next of order) {
      total += from[at][points[next]];
      at = next;
    }
    total += from[at][state.home];
    if (total > worst) worst = total;
  }
  return worst;
}

/** Cells with exactly one way out. Question 3. */
function deadEnds(state) {
  let n = 0;
  for (let i = 0; i < state.size * state.size; i++) {
    if (openNeighbours(state.walls, state.size, i).length === 1) n++;
  }
  return n;
}

/* ------------------------------------------------------------------- the run */

const rows = [];
for (const level of DIFFICULTIES) {
  const cfg = LEVELS[level];
  let par = 0;
  let worst = 0;
  let ends = 0;
  let ties = 0;
  const steps = { nearest: 0, reading: 0 };
  const perfect = { nearest: 0, reading: 0 };

  for (let i = 0; i < DEALS; i++) {
    const rng = mulberry32(i * 2654435761 + level.length * 7919);
    const dealt = newMaze(level, 0, rng);

    par += dealt.par;
    ends += deadEnds(dealt);

    const w = worstRoute(dealt);
    worst += w;
    if (w === dealt.par) ties++;

    for (const [bot, choose] of Object.entries(BOTS)) {
      const walked = play(dealt, choose);
      if (walked < dealt.par) {
        // `par` is brute-forced over every order, so nothing can beat it. A hit
        // here means the two halves of the shipped rules disagree. Loud.
        throw new Error(`${level}: a bot walked ${walked} against a par of ${dealt.par}`);
      }
      steps[bot] += walked;
      if (walked === dealt.par) perfect[bot]++;
    }
  }

  rows.push({
    level,
    size: cfg.size,
    cheese: cfg.cheese,
    braid: cfg.braid,
    par: Number((par / DEALS).toFixed(2)),
    worstOrder: Number((worst / DEALS).toFixed(2)),
    orderCost: Number((worst / par).toFixed(2)),
    /** Deals where every order costs the same - no puzzle at all on those. */
    orderNeverMattersPct: Number(((ties / DEALS) * 100).toFixed(1)),
    deadEnds: Number((ends / DEALS).toFixed(2)),
    deadEndsPerCell: Number(((ends / DEALS / (cfg.size * cfg.size)) * 100).toFixed(1)),
    nearestSteps: Number((steps.nearest / DEALS).toFixed(2)),
    nearestPerfectPct: Number(((perfect.nearest / DEALS) * 100).toFixed(1)),
    readingSteps: Number((steps.reading / DEALS).toFixed(2)),
    readingPerfectPct: Number(((perfect.reading / DEALS) * 100).toFixed(1)),
  });
}

const out = {
  deals: DEALS,
  boards: Object.fromEntries(DIFFICULTIES.map((d) => [d, LEVELS[d].size])),
  crumbs: Object.fromEntries(DIFFICULTIES.map((d) => [d, LEVELS[d].cheese])),
  rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`way home: ${DEALS.toLocaleString("en-US")} fresh deals per level\n`);
  console.log(
    "level    board  crumbs  braid  par    worst order  x par  order never matters  dead ends  nearest-first  matches par  reading order  matches par",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${`${r.size}x${r.size}`.padStart(5)} ${String(r.cheese).padStart(7)} ` +
        `${String(r.braid).padStart(6)} ${String(r.par).padStart(6)} ` +
        `${String(r.worstOrder).padStart(12)} ${String(r.orderCost + "x").padStart(6)} ` +
        `${String(r.orderNeverMattersPct + "%").padStart(20)} ` +
        `${String(r.deadEnds).padStart(10)} ${String(r.nearestSteps).padStart(14)} ` +
        `${String(r.nearestPerfectPct + "%").padStart(12)} ${String(r.readingSteps).padStart(14)} ` +
        `${String(r.readingPerfectPct + "%").padStart(12)}`,
    );
  }
  console.log(
    `\nSteps, not seconds: nothing here runs on a clock. 'par' is brute-forced over every\n` +
      `order of the crumbs, so no route can beat it. 'nearest-first' always walks to the\n` +
      `closest crumb still out there; 'reading order' takes them top left to bottom right.\n` +
      `Both then go home. 'dead ends' is cells with exactly one way out - question 3, and\n` +
      `the reason the easy board reads as a garden rather than as a maze.`,
  );
}
