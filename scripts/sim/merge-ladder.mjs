#!/usr/bin/env node
/**
 * Derives the numbers the merge page quotes.
 *
 *   node scripts/sim/merge-ladder.mjs [--runs 200] [--cap 40000] [--json]
 *
 * WHY THIS FILE EXISTS. Every figure a page quotes has to name the script that
 * reproduces it (`src/content/types.ts`), because a statistic nobody can
 * re-derive is a fabrication with a decimal point in it.
 *
 * IT DRIVES THE SHIPPED REDUCER. `tapCell`, `newGame`, `isDead` and `LADDER`
 * are imported from `src/games/merge/logic.ts`, so the tap counts below are taps
 * on the real game - including the fact that a merge costs TWO of them, one to
 * pick a creature up and one to put it down. Re-implementing the rules here
 * would measure my reading of them and agree with itself.
 *
 * Two halves, and they answer different questions:
 *
 *   THE ARITHMETIC is exact, not simulated. A rung is made of two of the rung
 *   below, so the top of the ladder costs 2^(rungs-1) of the bottom one. That
 *   number is the honest answer to "can my child finish this", and it comes out
 *   of `LADDER.length` and `tierPoints` rather than out of anybody's head.
 *
 *   THE SIMULATION plays a bot that always combines the smallest pair it can see
 *   and otherwise drops a fresh creature on an empty square. No lookahead, no
 *   tidying - roughly what a five-year-old does. It reports how many taps each
 *   milestone rung costs on each level, and whether a run ever ran out of moves,
 *   which the level table claims is effectively impossible.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const merge = await import(join(ROOT, "src/games/merge/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const { LADDER, LEVELS, DIFFICULTIES, MILESTONE_EVERY, newGame, tapCell, isDead, tierPoints } =
  merge;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
// 150 runs settles every cell: the easy column is deterministic (its board has
// no pressure and every arrival is the bottom rung), and the two crowded levels
// moved by under 1% between a 60-run and a 150-run pass.
const RUNS = arg("runs", 150);
const CAP = arg("cap", 40000);

/* --------------------------------------------------------------- the arithmetic */

const TOP = LADDER.length - 1;

/**
 * What one creature at `tier` costs in bottom-rung creatures, and what building
 * it scores. Both are closed forms rather than counters, so they are exact at
 * any rung and do not depend on a run ever getting there.
 *
 * Score: making one tier-t creature is worth `tierPoints(t)`, and building a
 * tier-T creature makes 2^(T-t) of them at every tier from 1 to T.
 */
function cost(tier) {
  let points = 0;
  for (let t = 1; t <= tier; t++) points += 2 ** (tier - t) * tierPoints(t);
  return { seeds: 2 ** tier, merges: 2 ** tier - 1, points };
}

const milestones = [];
for (let t = MILESTONE_EVERY; t <= TOP; t += MILESTONE_EVERY) milestones.push(t);

/* --------------------------------------------------------------- the simulation */

/** The lowest rung with two of them on the board, or -1. */
function lowestPair(state) {
  const seen = new Set();
  let best = -1;
  for (const c of state.cells) {
    if (c === null || c === TOP) continue;
    if (seen.has(c) && (best === -1 || c < best)) best = c;
    seen.add(c);
  }
  return best;
}

function firstFree(state) {
  return state.cells.indexOf(null);
}

/**
 * One run, stopped at `cap` taps or when the board runs out of moves. Returns
 * the tap count at which each milestone rung was first reached.
 */
function play(level, rng, cap) {
  let state = newGame(level, rng);
  const reached = new Map();
  let taps = 0;

  const note = () => {
    for (const t of milestones) if (state.topTier >= t && !reached.has(t)) reached.set(t, taps);
  };
  note();

  while (taps < cap && !isDead(state)) {
    const tier = lowestPair(state);
    if (tier === -1) {
      const free = firstFree(state);
      // `isDead` already ruled this out, so a -1 here means the board and the
      // rules disagree and every number below would be built on it.
      if (free === -1) throw new Error(`${level}: no pair and no free square, but not dead`);
      state = tapCell(state, free, rng).state;
      taps++;
      continue;
    }

    const from = state.cells.indexOf(tier);
    const to = state.cells.indexOf(tier, from + 1);
    state = tapCell(state, from, rng).state;
    state = tapCell(state, to, rng).state;
    taps += 2;
    note();
    if (reached.size === milestones.length) break;
  }

  return { reached, taps, dead: isDead(state), merges: state.merges, score: state.score };
}

const rows = DIFFICULTIES.map((level) => {
  const cfg = LEVELS[level];
  const totals = new Map(milestones.map((t) => [t, { taps: 0, runs: 0 }]));
  let deaths = 0;

  for (let r = 0; r < RUNS; r++) {
    const out = play(level, mulberry32(r * 2654435761 + level.length * 7919), CAP);
    if (out.dead) deaths++;
    for (const [tier, taps] of out.reached) {
      const cell = totals.get(tier);
      cell.taps += taps;
      cell.runs++;
    }
  }

  const squares = cfg.rows * cfg.cols;
  return {
    level,
    board: `${cfg.rows}x${cfg.cols}`,
    squares,
    /**
     * The exact shape of the only board with nothing left to do, which is why
     * `isDead` is so hard to reach. `hasMerge` ignores the top rung (it cannot
     * pair with anything), so a full board jams only when every square below the
     * ceiling holds a DIFFERENT rung. There are `LADDER.length - 1` of those, so
     * the leftovers must all be top-rung creatures - and this is how many.
     */
    topRungsToJam: Math.max(0, squares - (LADDER.length - 1)),
    spawnPerMerge: cfg.spawnPerMerge,
    spawnTop: cfg.spawnTop,
    deaths,
    milestones: milestones.map((tier) => {
      const cell = totals.get(tier);
      return {
        tier,
        name: LADDER[tier].en,
        reachedInRuns: cell.runs,
        taps: cell.runs ? Math.round(cell.taps / cell.runs) : null,
      };
    }),
  };
});

const out = {
  runs: RUNS,
  cap: CAP,
  rungs: LADDER.length,
  top: { tier: TOP, name: LADDER[TOP].en, ...cost(TOP) },
  ladder: LADDER.map((c, tier) => ({ tier, name: c.en, ...cost(tier) })),
  rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(
    `the ladder: ${LADDER.length} rungs, ${LADDER[0].en} to ${LADDER[TOP].en}\n`,
  );
  console.log("rung  creature       costs (bottom rung)   merges     points");
  for (const r of out.ladder) {
    console.log(
      `${String(r.tier).padStart(4)}  ${r.name.padEnd(14)} ${String(r.seeds).padStart(19)} ` +
        `${String(r.merges).padStart(9)} ${String(r.points).padStart(10)}`,
    );
  }

  console.log(`\n${RUNS} simulated runs per level, cap ${CAP.toLocaleString("en-US")} taps\n`);
  console.log(
    "level    board  fills by  " + milestones.map((t) => LADDER[t].en.padStart(10)).join("  "),
  );
  for (const r of rows) {
    const cells = r.milestones
      .map((m) => String(m.taps === null ? "-" : m.taps).padStart(10))
      .join("  ");
    console.log(
      `${r.level.padEnd(8)} ${r.board.padStart(5)} ${String(r.spawnPerMerge + "/merge").padStart(9)}  ${cells}`,
    );
  }
  console.log(
    `\nTaps, not merges: a merge costs two of them, one to pick up and one to put down.\n` +
      `Runs that ran out of moves: ${rows.map((r) => `${r.level} ${r.deaths}/${RUNS}`).join(", ")}.\n` +
      `A board jams only when every square below the ceiling holds a different rung, so it\n` +
      `takes ${rows.map((r) => `${r.topRungsToJam} ${LADDER[TOP].en}s on ${r.level}`).join(", ")}.`,
  );
}
