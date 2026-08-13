#!/usr/bin/env node
/**
 * Derives the numbers the pet page quotes.
 *
 *   node scripts/sim/pet-growing.mjs [--runs 2000] [--cap 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the pet page
 * says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED REDUCER. `careFor`, `careOf`, `newPet` and `stageFor`
 * are imported from `src/games/pet/logic.ts` rather than re-written, so these
 * counts describe the creature a child actually raises. A re-implementation
 * would measure my reading of the code, agree with itself, and be confidently
 * wrong about a game we do not ship.
 *
 * Three questions, and the second is the one worth a page:
 *
 *   1. WHAT DOES ATTENTION COST? A tap that matches the thought bubble is worth
 *      `GRANTED_GAIN` and any other tap is worth `PLAIN_GAIN`, so the fastest
 *      possible route to each size is arithmetic rather than a simulation:
 *      `ceil(STAGE_CARE[i] / GRANTED_GAIN)`. Exact at any stage, and true even
 *      if no child ever plays that way.
 *
 *   2. WHAT DOES IGNORING IT COST? This is the whole design claim. A child who
 *      never once looks at the bubble still finishes, just slower. Three bots
 *      answer it: one always grants the wish, one taps at random, and one only
 *      ever cuddles the creature and never reads anything at all.
 *
 *   3. CAN A TAP GO WRONG? The rules have no refusal branch and no penalty, so
 *      every tap should raise the care count. That is asserted here rather than
 *      asserted in prose - `minGain` across every simulated tap, and a hard
 *      throw if any tap ever fails to move the number up.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * with a SEPARATE stream for the bot's own choices so a random tapper's picks
 * are not correlated with the wish the reducer rolls next.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pet = await import(join(ROOT, "src/games/pet/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  CARE_KINDS,
  STAGE_CARE,
  MAX_STAGE,
  MILESTONE_EVERY,
  GRANTED_GAIN,
  PLAIN_GAIN,
  PETS,
  careFor,
  careOf,
  newPet,
  stageFor,
} = pet;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
// 2,000 runs settles every cell. The attentive column is deterministic (every
// tap grants, so the wish never matters), and the two others moved by under a
// tenth of a tap between a 500-run and a 2,000-run pass.
const RUNS = arg("runs", 2000);
const CAP = arg("cap", 4000);

const PET_ID = PETS[0].id;

/* --------------------------------------------------------------- arithmetic */

/**
 * The floor on each size, in taps, for somebody who grants every wish.
 *
 * Derived from the shipped `STAGE_CARE` ladder and `GRANTED_GAIN`, so adding a
 * stage or re-pricing a tap re-derives the whole column instead of leaving a
 * hardcoded number behind that nothing contradicts.
 */
const fastest = STAGE_CARE.map((care) => Math.ceil(care / GRANTED_GAIN));

/* --------------------------------------------------------------- the bots */

/** Reads the bubble every time. The ceiling on how well anybody can do. */
const attentive = (state) => state.wish;

/** Four buttons, no attention. Roughly a toddler with a finger. */
const random = (_state, rng) => CARE_KINDS[Math.floor(rng() * CARE_KINDS.length)];

/**
 * Never reads anything, ever - taps the creature itself, which cuddles it.
 *
 * The interesting arm. It grants the wish at most once (the first time the
 * bubble happens to ask for a cuddle), and after that the wish moves to
 * something else and stays there forever, so every remaining tap is worth the
 * plain gain. It is the worst any child can possibly do, and it still finishes.
 */
const oblivious = () => "cuddle";

const BOTS = { attentive, random, oblivious };

/**
 * One run: tap until the creature is fully grown or the cap is hit.
 *
 * Returns the tap count at which each size was first reached, how many
 * milestone coins the run collected, and the smallest gain any tap produced -
 * which is the "nothing is ever refused" claim, measured rather than asserted.
 */
function play(choose, seed, cap) {
  const wishRng = mulberry32(seed);
  const botRng = mulberry32(seed ^ 0x9e3779b9);

  let state = newPet(wishRng);
  const reached = new Map([[0, 0]]);
  let taps = 0;
  let granted = 0;
  let coins = 0;
  let minGain = Infinity;

  while (taps < cap && stageFor(careOf(state, PET_ID)) < MAX_STAGE) {
    const before = careOf(state, PET_ID);
    const kind = choose(state, botRng);
    const step = careFor(state, PET_ID, kind, wishRng);
    state = step.state;
    taps++;

    const outcome = step.outcome;
    minGain = Math.min(minGain, outcome.gain);
    if (outcome.granted) granted++;
    if (outcome.milestone) coins++;
    if (outcome.care <= before) {
      // A tap that did not raise the care count would make every column below
      // meaningless, and it is exactly the shape this game promises cannot
      // happen. Loud, not silent.
      throw new Error(`a ${kind} tap left care at ${outcome.care}, was ${before}`);
    }
    if (!reached.has(outcome.stage)) reached.set(outcome.stage, taps);
  }

  return { reached, taps, granted, coins, minGain, care: careOf(state, PET_ID) };
}

const rows = Object.entries(BOTS).map(([name, choose]) => {
  const sums = new Map(STAGE_CARE.map((_, stage) => [stage, { taps: 0, runs: 0 }]));
  let taps = 0;
  let granted = 0;
  let coins = 0;
  let minGain = Infinity;
  let capped = 0;

  for (let r = 0; r < RUNS; r++) {
    const out = play(choose, r * 2654435761 + name.length * 7919, CAP);
    if (out.taps >= CAP) capped++;
    taps += out.taps;
    granted += out.granted;
    coins += out.coins;
    minGain = Math.min(minGain, out.minGain);
    for (const [stage, at] of out.reached) {
      const cell = sums.get(stage);
      cell.taps += at;
      cell.runs++;
    }
  }

  return {
    bot: name,
    totalTaps: taps,
    tapsToFull: Number((taps / RUNS).toFixed(1)),
    grantedPct: Number(((granted / taps) * 100).toFixed(1)),
    coins: Number((coins / RUNS).toFixed(1)),
    minGain,
    capped,
    stages: STAGE_CARE.map((_, stage) => {
      const cell = sums.get(stage);
      return { stage, reachedInRuns: cell.runs, taps: cell.runs ? Number((cell.taps / cell.runs).toFixed(1)) : null };
    }),
  };
});

// A cap hit anywhere would mean a run never finished, and every average above
// would be a floor rather than a number. There is no failure state here, so
// this must be zero.
for (const r of rows) {
  if (r.capped) throw new Error(`${r.bot}: ${r.capped} of ${RUNS} runs hit the ${CAP}-tap cap`);
  if (r.minGain < PLAIN_GAIN) throw new Error(`${r.bot}: a tap gained ${r.minGain}`);
}

const out = {
  runs: RUNS,
  cap: CAP,
  /** Every tap the three bots made. None of them was refused - see `minGain`. */
  totalTaps: rows.reduce((a, r) => a + r.totalTaps, 0),
  creatures: PETS.length,
  stages: STAGE_CARE.length,
  stageCare: [...STAGE_CARE],
  grantedGain: GRANTED_GAIN,
  plainGain: PLAIN_GAIN,
  milestoneEvery: MILESTONE_EVERY,
  fastest,
  /**
   * Every creature at full size, for somebody who grants every wish. Printed
   * rather than left as arithmetic on two other columns, so the page's "81
   * accurate taps" names a script that actually produces 81.
   */
  fastestAllCreatures: fastest[MAX_STAGE] * PETS.length,
  rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(
    `the ladder: ${STAGE_CARE.length} sizes, care ${STAGE_CARE.join(" / ")}, ` +
      `${GRANTED_GAIN} for a granted wish and ${PLAIN_GAIN} for anything else\n`,
  );
  console.log("size  care needed  fastest possible (taps)");
  STAGE_CARE.forEach((care, stage) => {
    console.log(`${String(stage + 1).padStart(4)} ${String(care).padStart(12)} ${String(fastest[stage]).padStart(24)}`);
  });

  console.log(
    `\nall ${PETS.length} creatures at full size, granting every wish: ` +
      `${out.fastestAllCreatures} taps`,
  );

  console.log(`\n${RUNS.toLocaleString("en-US")} simulated runs per bot, one creature each\n`);
  console.log(
    "bot          " +
      STAGE_CARE.map((_, s) => `size ${s + 1}`.padStart(9)).join("  ") +
      "   wishes met   coins",
  );
  for (const r of rows) {
    console.log(
      `${r.bot.padEnd(12)} ` +
        r.stages.map((s) => String(s.taps).padStart(9)).join("  ") +
        `   ${String(r.grantedPct + "%").padStart(10)}  ${String(r.coins).padStart(6)}`,
    );
  }
  console.log(
    `\nTaps, not minutes: nothing here runs on a clock, so a tap is the only unit the\n` +
      `game has. 'attentive' always taps what the bubble asks for, 'random' taps one of\n` +
      `the four buttons at random, and 'oblivious' never reads anything and only ever\n` +
      `cuddles the creature. Every one of them finishes.\n` +
      `Smallest gain any tap produced, across all ${out.totalTaps.toLocaleString("en-US")} ` +
      `simulated taps: ${rows.map((r) => `${r.bot} ${r.minGain}`).join(", ")}. ` +
      `There is no refused tap.`,
  );
}
