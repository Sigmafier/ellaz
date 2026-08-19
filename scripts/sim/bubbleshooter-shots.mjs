#!/usr/bin/env node
/**
 * Derives the numbers the bubble shooter page quotes.
 *
 *   node scripts/sim/bubbleshooter-shots.mjs [--runs 200] [--json]
 *
 * WHY THIS FILE EXISTS. Every figure a page quotes has to name the script that
 * reproduces it (`src/content/types.ts`), because a statistic nobody can
 * re-derive is a fabrication with a decimal point in it.
 *
 * IT DRIVES THE SHIPPED RULES. `fire`, `aim`, `newGame` and `LEVELS` are
 * imported from `src/games/bubbleshooter/logic.ts`, so every number below is a
 * number about the game as it ships. Re-implementing the rules here would
 * measure my reading of them and then agree with itself.
 *
 * Three sections, answering three different questions:
 *
 *   THE FIELD is arithmetic, not simulation. How many bubbles an opening board
 *   holds, and how many shots stand between the first one and the ceiling
 *   arriving, come straight out of the level table and the geometry.
 *
 *   THE BOUNCE is a sweep, not a bot. It fires a thousand angles at an opening
 *   board and asks which resting places a straight shot can reach at all. The
 *   answer is the one honest claim this game can make that a grid puzzle
 *   cannot: some of the board is only reachable off a wall.
 *
 *   THE BOTS play. `greedy` looks one shot ahead over 121 angles and takes the
 *   one that pops the most, breaking ties toward the lowest landing - roughly
 *   an adult paying attention. `blind` fires anywhere at all, which is roughly
 *   a four-year-old, and is the control that says how much of the score is the
 *   game handing it to you.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * so a rerun reproduces every figure exactly.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const B = await import(join(ROOT, "src/games/bubbleshooter/logic.ts"));
const { mulberry32, seedFrom } = await import(join(ROOT, "src/shared/rng.ts"));

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(argv[i + 1]);
};
/**
 * Three budgets, not one, because the two bots cost wildly different amounts.
 * `blind` fires once per shot; `greedy` solves every angle on the list before
 * each shot, so it is ~30x dearer and gets fewer, shorter runs. The numbers are
 * printed with the report so a quoted figure names the budget it came from.
 */
const BLIND_RUNS = flag("runs", 200);
const GREEDY_RUNS = flag("greedy-runs", 24);
/** Shots a bot is allowed before the run is cut off. A good run does not end. */
const GREEDY_CAP = flag("greedy-cap", 200);
/** Angles the BOUNCE sweep tries. Cheap: it is one board, not a run. */
const ANGLES = flag("angles", 121);
/** Angles the greedy bot weighs before each shot. Coarser, and paid per shot. */
const BOT_ANGLES = flag("bot-angles", 31);
const JSON_OUT = argv.includes("--json");

const LEVELS = B.LEVELS;
const NAMES = ["easy", "medium", "hard"];

/* ── the field ──────────────────────────────────────────────────────────── */

function fieldFacts() {
  const out = {};
  for (const level of NAMES) {
    const { startRows, colors, shotsPerPush } = LEVELS[level];
    let bubbles = 0;
    for (let r = 0; r < startRows; r++) bubbles += B.rowWidth(r, 0);
    // How many ceiling advances the board can absorb before the first row of a
    // full opening board reaches the line, if nothing is ever popped.
    const rowsToLine = B.DEATH_ROW - startRows;
    out[level] = {
      colors,
      startRows,
      bubbles,
      shotsPerPush,
      rowsToLine,
      shotsIfNothingPops: rowsToLine * shotsPerPush,
    };
  }
  return out;
}

/* ── the bounce ─────────────────────────────────────────────────────────── */

/**
 * Which cells a shot can come to rest in, split by whether it had to use a
 * wall. A path with more than two points bounced: the polyline is
 * launcher → each bounce → the landing centre.
 *
 * MEASURED ON TWO BOARDS, and the pair is the finding. On an OPENING board the
 * answer is zero every time, because a solid wall of bubbles means every
 * landing slot sits along its own straight line from the launcher - so the
 * first draft of this page was about to claim a bounce statistic that is
 * genuinely 0%. It is the board with HOLES in it, forty shots later, where the
 * wall starts to buy anything. Reporting only the opening board would have been
 * true and useless; reporting only the played one would have overstated it.
 */
function bounceReach(level, seed, shotsFirst = 0) {
  const rng = mulberry32(seedFrom(seed));
  let s = B.newGame(level, rng);
  for (let i = 0; i < shotsFirst && !s.dead; i++) {
    s = B.fire(s, greedyAngle(s, mulberry32(seedFrom(`${seed}-probe-${i}`))), rng).state;
  }
  const direct = new Set();
  const viaWall = new Set();
  for (let i = 0; i < ANGLES; i++) {
    const angle = -B.MAX_ANGLE + (2 * B.MAX_ANGLE * i) / (ANGLES - 1);
    const shot = B.aim(s, angle);
    if (!shot.cell) continue;
    const key = `${shot.cell.row},${shot.cell.col}`;
    (shot.path.length > 2 ? viaWall : direct).add(key);
  }
  const onlyWall = [...viaWall].filter((k) => !direct.has(k));
  const all = new Set([...direct, ...viaWall]);
  return {
    reachable: all.size,
    direct: direct.size,
    onlyWithABounce: onlyWall.length,
    shareOnlyWithABounce: onlyWall.length / all.size,
  };
}

/* ── the bots ───────────────────────────────────────────────────────────── */

/** Same-coloured bubbles already touching this cell, before the shot lands. */
function support(state, cell, colour) {
  return B.neighbors(cell.row, cell.col, state.shift).filter(
    (n) => B.at(state, n.row, n.col) === colour,
  ).length;
}

/**
 * The bot, and it BUILDS as well as pops.
 *
 * The first version only took immediate pops and broke ties toward the lowest
 * landing row. It measured 17 shots on hard, and it was the BOT that was bad
 * rather than the level: a person with no popping move parks the bubble against
 * one of its own colour so the next one finishes the group, and that bot never
 * did. Tuning a difficulty against a proxy that cannot play is how a level ends
 * up too easy for everybody real.
 *
 * So the ordering is: pop if anything pops, otherwise build the biggest cluster
 * available, otherwise land low. It is still well short of a good human - no
 * lookahead past one shot, no reading of the `next` bubble - so treat its
 * numbers as a FLOOR on what a person does, which is the honest direction for a
 * figure a page is going to quote.
 */
function greedyAngle(state, rng) {
  let best = null;
  for (let i = 0; i < BOT_ANGLES; i++) {
    const angle = -B.MAX_ANGLE + (2 * B.MAX_ANGLE * i) / (BOT_ANGLES - 1);
    const { outcome } = B.fire(state, angle, rng);
    if (!outcome.cell) continue;
    const score =
      outcome.gained * 10000 + support(state, outcome.cell, state.current) * 100 + outcome.cell.row;
    if (!best || score > best.score) best = { angle, score };
  }
  return best ? best.angle : 0;
}

function play(level, bot, seed, cap) {
  const rng = mulberry32(seedFrom(seed));
  let s = B.newGame(level, rng);
  let shots = 0;
  for (; shots < cap && !s.dead; shots++) {
    // The lookahead uses its OWN generator, so probing the board cannot consume
    // the run's randomness and change the game it is probing.
    const angle = bot === "greedy"
        ? greedyAngle(s, mulberry32(seedFrom(`${seed}-probe-${shots}`)))
        : (rng() * 2 - 1) * B.MAX_ANGLE;
    s = B.fire(s, angle, rng).state;
  }
  return { shots, score: s.score, boards: s.boards, dead: s.dead };
}

function stats(values) {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return {
    median: v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2),
    mean: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    min: v[0],
    max: v[v.length - 1],
  };
}

/* ── run ────────────────────────────────────────────────────────────────── */

const field = fieldFacts();
const bounce = {};
const bots = {};
for (const level of NAMES) {
  // Averaged over many boards, so the figure describes the GAME rather than one
  // lucky deal. `opening` is a fresh board; `played` is the same board forty
  // greedy shots in, which is where a real player spends the run.
  const summarise = (samples) => ({
    reachable: stats(samples.map((s) => s.reachable)).median,
    onlyWithABounce: stats(samples.map((s) => s.onlyWithABounce)).median,
    shareOnlyWithABounce: samples.reduce((a, s) => a + s.shareOnlyWithABounce, 0) / samples.length,
  });
  bounce[level] = {
    opening: summarise(Array.from({ length: 40 }, (_, i) => bounceReach(level, `reach-${level}-${i}`))),
    played: summarise(Array.from({ length: 12 }, (_, i) => bounceReach(level, `played-${level}-${i}`, 40))),
  };
  bots[level] = {};
  for (const bot of ["greedy", "blind"]) {
    const n = bot === "greedy" ? GREEDY_RUNS : BLIND_RUNS;
    const cap = bot === "greedy" ? GREEDY_CAP : 4000;
    const runs = Array.from({ length: n }, (_, i) => play(level, bot, `${bot}-${level}-${i}`, cap));
    bots[level][bot] = {
      score: stats(runs.map((r) => r.score)),
      shots: stats(runs.map((r) => r.shots)),
      boardsCleared: runs.reduce((a, r) => a + r.boards, 0),
      runsThatClearedABoard: runs.filter((r) => r.boards > 0).length,
      runsEndedAtTheLine: runs.filter((r) => r.dead).length,
      runsStillAliveAtTheCap: runs.filter((r) => !r.dead).length,
      cap,
      runs: runs.length,
    };
  }
}

const report = { blindRuns: BLIND_RUNS, greedyRuns: GREEDY_RUNS, greedyCap: GREEDY_CAP, angles: ANGLES, botAngles: BOT_ANGLES, field, bounce, bots };

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("THE FIELD");
  for (const level of NAMES) {
    const f = field[level];
    console.log(
      `  ${level.padEnd(7)} ${f.colors} colours · ${f.startRows} rows = ${f.bubbles} bubbles · ` +
        `a new row every ${f.shotsPerPush} shots · ${f.shotsIfNothingPops} shots to the line if nothing pops`,
    );
  }
  console.log(`\nTHE BOUNCE  (${ANGLES} angles per board)`);
  for (const level of NAMES) {
    for (const when of ["opening", "played"]) {
      const b = bounce[level][when];
      console.log(
        `  ${level.padEnd(7)} ${when.padEnd(8)} ${String(b.reachable).padStart(3)} resting places reachable · ` +
          `${b.onlyWithABounce} of them ONLY off a wall (${(b.shareOnlyWithABounce * 100).toFixed(1)}%)`,
      );
    }
  }
  console.log(
    `\nTHE BOTS  (greedy: ${GREEDY_RUNS} runs, ${BOT_ANGLES} angles weighed per shot, cut off at ${GREEDY_CAP} shots · blind: ${BLIND_RUNS} runs, played to the end)`,
  );
  for (const level of NAMES) {
    for (const bot of ["greedy", "blind"]) {
      const r = bots[level][bot];
      console.log(
        `  ${level.padEnd(7)} ${bot.padEnd(7)} score median ${String(r.score.median).padStart(5)} ` +
          `(mean ${r.score.mean}, max ${r.score.max}) · shots median ${r.shots.median} · ` +
          `${r.runsThatClearedABoard}/${r.runs} runs cleared a board · ${r.boardsCleared} boards total · ` +
          `${r.runsStillAliveAtTheCap}/${r.runs} still alive at the cut-off`,
      );
    }
  }
}
