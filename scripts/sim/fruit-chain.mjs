#!/usr/bin/env node
/**
 * Derives the numbers the Fruit Drop page quotes.
 *
 *   node scripts/sim/fruit-chain.mjs [--runs 40] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the fruit
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED PHYSICS. `newWorld`, `drop`, `step`, `canDrop`,
 * `clampDropX`, `isSettled` and `radiusOf` are imported from
 * `src/games/fruit/logic.ts` rather than re-written, and `step` is fed the same
 * fixed `DT` the renderer feeds it, in the same order: drop, then step until the
 * pile is still, then drop again. A re-implementation would measure my reading
 * of the solver, agree with itself, and produce confident numbers about a game
 * we do not ship. This one cannot: if the friction constant moves tomorrow,
 * these rows move with it.
 *
 * Three questions, and the third is the one worth a page:
 *
 *   1. HOW FAR UP THE CHAIN does a player get? Two bots. One drops at a
 *      uniformly random spot, which is the floor - it is what happens with no
 *      intention at all. The other follows a single rule with no lookahead and
 *      no memory: aim at the topmost fruit of the same kind, and at the middle
 *      of the box when the board holds none. That is roughly what a person does
 *      on their first run, and it is a floor on what thinking is worth here
 *      rather than a ceiling.
 *
 *   2. HOW LONG IS A RUN? Fruit dropped before something comes to rest above
 *      the line. It is the honest length of a sitting, and it is what decides
 *      whether the box is a two-minute game or a ten-minute one.
 *
 *   3. HOW MUCH OF THE SCORING IS THE PILE ITSELF? A merge changes the shape of
 *      everything under it, and the resettle can fold two more pairs together
 *      that the player never lined up. Counted here as: within one settle, the
 *      merges in the FIRST sub-step that merges anything are the drop's own, and
 *      every merge in a LATER sub-step of the same settle is a consequence of
 *      that first one. That share is what this game actually rewards, and
 *      nobody has published it.
 *
 * A fourth number falls out of the same runs and is the page's admission:
 * MAX OVERLAP. The solver is five relaxation passes of positional correction,
 * so a deep pile does not fully separate - neighbouring fruit end a settle
 * genuinely inside one another. Measured on the final pile of every settle,
 * reported in world units and as a share of the smaller fruit's radius.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fruit = await import(join(ROOT, "src/games/fruit/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  DT,
  LEVELS,
  LEVEL_IDS,
  TOP_TIER,
  canDrop,
  clampDropX,
  drop,
  isSettled,
  newWorld,
  radiusOf,
  step,
} = fruit;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};

const RUNS = arg("runs", 40);
/** More drops than any observed run survives. A run that hits it is reported. */
const DROP_CAP = arg("drops", 400);
/** Sub-steps one settle may spend. 3,000 is 25 seconds of simulated time. */
const SETTLE_CAP = arg("settle", 3000);

/* ------------------------------------------------------------- the two bots */

/** No intention at all: anywhere the walls allow. */
function aimRandom(world, rng) {
  const r = radiusOf(world.pending);
  return r + rng() * (world.width - 2 * r);
}

/**
 * Which fruit a drop at `x` would actually land on, or null for the floor.
 *
 * A falling circle of radius `rp` first touches whichever fruit is highest among
 * those whose horizontal distance is under the sum of the two radii. It is a
 * straight-down approximation and it ignores the bounce, which is exactly what a
 * player's guess is.
 */
function firstHit(world, x) {
  const rp = radiusOf(world.pending);
  let best = null;
  for (const f of world.fruit) {
    if (Math.abs(f.x - x) >= radiusOf(f.tier) + rp) continue;
    if (!best || f.y < best.y) best = f;
  }
  return best;
}

/**
 * THE RANDOM BOT PLUS ONE RULE, and the plus-one is the whole point of the
 * column: drop on a twin you can actually REACH, and when there is no reachable
 * twin, drop exactly where the random bot would.
 *
 * Built as a differential on purpose. Any other fallback - the middle of the
 * box, the lowest gap - is a second rule smuggled in, and then the two columns
 * differ by two things and the table cannot say which one paid.
 *
 * Reachable rather than nearest. An earlier version aimed at the topmost twin
 * whatever was in front of it, which is a rule that buries itself: the twin is
 * under three other fruit, the drop lands on those instead, and the bot builds
 * one tower in one column and tops out in 13 drops on every level - identically
 * on the widest box and the narrowest, because a single column never touches a
 * wall.
 */
function aimSame(world, rng) {
  const twins = world.fruit
    .filter((f) => f.tier === world.pending)
    .sort((a, b) => a.y - b.y);
  for (const t of twins) {
    const x = clampDropX(world, t.x);
    if (firstHit(world, x) === t) return x;
  }
  return aimRandom(world, rng);
}

/* ------------------------------------------------------------- measurements */

/** The deepest two circles are inside each other, over every pair in the pile. */
function deepestOverlap(world) {
  let worst = 0;
  let worstShare = 0;
  const list = world.fruit;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const ra = radiusOf(a.tier);
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      const rb = radiusOf(b.tier);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const over = ra + rb - d;
      if (over <= 0) continue;
      if (over > worst) worst = over;
      const share = over / Math.min(ra, rb);
      if (share > worstShare) worstShare = share;
    }
  }
  return { worst, worstShare };
}

const topTierIds = (world) => {
  const out = new Set();
  for (const f of world.fruit) if (f.tier === TOP_TIER) out.add(f.id);
  return out;
};

/* ------------------------------------------------------------------ one run */

function playRun(level, aim, seed) {
  const rng = mulberry32(seed);
  let w = newWorld(level, rng);

  let drops = 0;
  let direct = 0;
  let chain = 0;
  let pops = 0;
  let bestTier = 0;
  let overlap = 0;
  let overlapShare = 0;
  let settleCapped = 0;

  while (!w.over && drops < DROP_CAP) {
    // The renderer refuses a tap during the drop cooldown, so the bot waits it
    // out in real sub-steps rather than reaching around the rule.
    let guard = 0;
    while (!canDrop(w) && !w.over && guard++ < SETTLE_CAP) w = step(w, DT);
    if (w.over) break;

    w = drop(w, clampDropX(w, aim(w, rng)), rng);
    drops++;

    let mergedThisSettle = false;
    let steps = 0;
    for (; steps < SETTLE_CAP; steps++) {
      const before = w.merges;
      const beforeTop = topTierIds(w);
      w = step(w, DT);
      const made = w.merges - before;
      if (made > 0) {
        if (mergedThisSettle) chain += made;
        else {
          direct += made;
          mergedThisSettle = true;
        }
        // A top-tier fruit can only ever leave by popping with its twin, so the
        // ids that vanished are exactly the popped ones, two per pop. Counting
        // `lastMerge.popped` instead would miss a pop that was not the last
        // merge of its sub-step.
        let gone = 0;
        for (const id of beforeTop) if (!w.fruit.some((f) => f.id === id)) gone++;
        pops += gone / 2;
      }
      for (const f of w.fruit) if (f.tier > bestTier) bestTier = f.tier;
      if (w.over || isSettled(w)) break;
    }
    if (steps >= SETTLE_CAP) settleCapped++;

    const o = deepestOverlap(w);
    if (o.worst > overlap) overlap = o.worst;
    if (o.worstShare > overlapShare) overlapShare = o.worstShare;
  }

  return {
    drops,
    score: w.score,
    merges: w.merges,
    direct,
    chain,
    pops,
    bestTier,
    overlap,
    overlapShare,
    settleCapped,
    ended: w.over,
    fruitLeft: w.fruit.length,
  };
}

/* --------------------------------------------------------------- the tables */

const BOTS = [
  { id: "random", aim: aimRandom, seed: 101 },
  { id: "one-rule", aim: aimSame, seed: 202 },
];

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));

const rows = [];
for (const level of LEVEL_IDS) {
  for (const bot of BOTS) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      // A distinct stream per level and per bot. Keyed on the level's INDEX and
      // not on `level.length`, which is 4 for both "easy" and "hard" - two rows
      // sharing a seed stream is how a table reports the same run twice and
      // reads as a finding.
      runs.push(
        playRun(level, bot.aim, i * 2654435761 + LEVEL_IDS.indexOf(level) * 7919 + bot.seed),
      );
    }

    const direct = runs.reduce((a, r) => a + r.direct, 0);
    const chain = runs.reduce((a, r) => a + r.chain, 0);
    const total = direct + chain;

    rows.push({
      level,
      width: LEVELS[level].width,
      bot: bot.id,
      runs: RUNS,
      drops: round(mean(runs.map((r) => r.drops))),
      score: Math.round(mean(runs.map((r) => r.score))),
      merges: round(mean(runs.map((r) => r.merges))),
      bestTierMean: round(mean(runs.map((r) => r.bestTier + 1)), 1),
      bestTierMax: Math.max(...runs.map((r) => r.bestTier + 1)),
      // How many RUNS got a fruit onto the last rung at all. The max alone
      // cannot say whether that was one lucky run or half of them, and "reached
      // it once" is a claim about runs rather than about the maximum.
      topRuns: runs.filter((r) => r.bestTier === TOP_TIER).length,
      chainPct: total ? round((chain / total) * 100) : 0,
      pops: runs.reduce((a, r) => a + r.pops, 0),
      overlap: round(Math.max(...runs.map((r) => r.overlap)), 2),
      overlapPct: round(Math.max(...runs.map((r) => r.overlapShare)) * 100),
      endedPct: round((runs.filter((r) => r.ended).length / RUNS) * 100),
      settleCapped: runs.reduce((a, r) => a + r.settleCapped, 0),
    });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ runs: RUNS, dropCap: DROP_CAP, rows }, null, 2));
} else {
  console.log(`fruit drop: ${RUNS} runs per level per bot, shipped physics at ${1 / DT} Hz\n`);
  console.log(
    "level   width  bot        drops  score  merges  chains  top rung  best  hit 10  pops  overlap",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(7)} ${String(r.width).padStart(5)}  ${r.bot.padEnd(9)} ` +
        `${String(r.drops).padStart(5)} ${String(r.score).padStart(6)} ` +
        `${String(r.merges).padStart(7)} ${String(r.chainPct + "%").padStart(7)} ` +
        `${String(r.bestTierMean).padStart(9)} ${String(r.bestTierMax).padStart(5)} ` +
        `${String(r.topRuns).padStart(7)} ${String(r.pops).padStart(5)} ` +
        `${String(r.overlap + "u").padStart(8)}`,
    );
  }
  const capped = rows.reduce((a, r) => a + r.settleCapped, 0);
  const ended = rows.every((r) => r.endedPct === 100);
  console.log(
    `\n'chains' is the share of merges that happened in a LATER sub-step of the same settle\n` +
      `than the first one - folded together by the pile resettling rather than by the drop.\n` +
      `'top rung' counts from 1, so 10 is the watermelon, and 'hit 10' is how many RUNS put a\n` +
      `fruit there at all. 'overlap' is the deepest two fruit end a settle inside one another,\n` +
      `in world units against a 3.2-unit blueberry radius.\n` +
      `${ended ? "Every run ended by filling the box" : "Some runs hit the drop cap"}; ` +
      `${capped} settles hit the ${SETTLE_CAP}-sub-step cap.`,
  );
}
