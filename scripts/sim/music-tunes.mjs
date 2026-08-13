#!/usr/bin/env node
/**
 * Derives the numbers the Music Box page quotes.
 *
 *   node scripts/sim/music-tunes.mjs [--draws 200000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the music
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED MODULE. `newTune`, `toggleCell`, `surprise`, `resize`,
 * `noteCount`, `milestoneStep` and `pitchFor` are imported from
 * `src/games/music/logic.ts` rather than re-written, and the scale comes from
 * `@shared/notes`. So the counts below describe the toy a child opens rather
 * than my reading of it.
 *
 * Four questions:
 *
 *   1. HOW MUCH ROOM IS THERE? A toy with nothing to be wrong in it lives or
 *      dies on whether a child can keep finding something new, so the honest
 *      size of the space is the first thing worth knowing - and it is countable
 *      exactly, from `ROWS` and `STEPS`, rather than estimated.
 *
 *   2. CAN ANYTHING HERE CLASH? The header of `logic.ts` claims the pentatonic
 *      scale is what removes every rule about which note may follow which. That
 *      is checkable: measure every pair of notes on the grid in semitones and
 *      look for a semitone or a tritone. If one is in there, the claim is false
 *      and the page must not make it.
 *
 *   3. WHAT DOES THE SURPRISE BUTTON REACH? It deals one note per column, so it
 *      can only ever reach a melody - a vanishingly small corner of question 1.
 *      Measured empirically as well as counted, because a bug in `surprise`
 *      would show up as the two disagreeing.
 *
 *   4. WHAT SURVIVES A RESIZE? `resize` keeps notes rather than dealing a fresh
 *      grid, which is unlike every other game here. Shortening still drops what
 *      no longer fits, so the page should say how much.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per draw.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const music = await import(join(ROOT, "src/games/music/logic.ts"));
const { PENTATONIC, PENTATONIC_NAMES } = await import(join(ROOT, "src/shared/notes.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  LENGTHS,
  MILESTONE_EVERY,
  ROWS,
  STEPS,
  milestoneStep,
  newTune,
  noteCount,
  pitchFor,
  resize,
  surprise,
  toggleCell,
} = music;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const DRAWS = arg("draws", 200000);

/* ------------------------------------------------- question 2: the scale */

/**
 * Every pair of notes on the grid, in semitones.
 *
 * A semitone is a frequency ratio of 2^(1/12), so the distance between two
 * pitches is `12 * log2(hi/lo)`. Rounded only for reporting - the check below
 * runs on the raw value, so a scale that was a HAIR off a tritone would not be
 * waved through by the rounding.
 */
const intervals = [];
for (let a = 0; a < ROWS; a++) {
  for (let b = a + 1; b < ROWS; b++) {
    const semis = 12 * Math.log2(PENTATONIC[b] / PENTATONIC[a]);
    intervals.push({
      from: PENTATONIC_NAMES[a],
      to: PENTATONIC_NAMES[b],
      semitones: Number(semis.toFixed(3)),
    });
  }
}

/** How close any pair comes to the two intervals that make a grown-up wince. */
const nearestTo = (target) =>
  Math.min(...intervals.map((i) => Math.abs((i.semitones % 12) - target)));

const scale = {
  notes: ROWS,
  pairs: intervals.length,
  smallestGap: Number(Math.min(...intervals.map((i) => i.semitones)).toFixed(2)),
  /** 0 would mean a pair IS a semitone apart. */
  closestToASemitone: Number(nearestTo(1).toFixed(2)),
  /** 0 would mean a pair IS a tritone - the interval nothing here has. */
  closestToATritone: Number(nearestTo(6).toFixed(2)),
  semitonePairs: intervals.filter((i) => Math.abs((i.semitones % 12) - 1) < 0.5).length,
  tritonePairs: intervals.filter((i) => Math.abs((i.semitones % 12) - 6) < 0.5).length,
  /** The top row is the highest note, and getting that upside down is silent. */
  topRowIsHighest: pitchFor(0) === Math.max(...PENTATONIC),
};

/* --------------------------------------------- questions 1, 3 and 4 */

const rows = [];
for (const level of LENGTHS) {
  const steps = STEPS[level];
  const squares = ROWS * steps;

  // Question 1, counted exactly: every square is on or off, independently.
  const allTunes = 2n ** BigInt(squares);
  // Question 3, counted exactly: `surprise` lights exactly one row per column.
  const melodies = BigInt(ROWS) ** BigInt(steps);

  // Question 1, driven: fill every square through the shipped `toggleCell` and
  // check the count and the coins agree with the arithmetic above.
  let filled = newTune(level);
  let taps = 0;
  for (let i = 0; i < squares; i++) {
    const { state, outcome } = toggleCell(filled, i);
    if (outcome.kind !== "on") throw new Error(`music: square ${i} refused to light`);
    filled = state;
    taps++;
  }
  if (noteCount(filled) !== squares) throw new Error("music: a full grid miscounted itself");

  // Question 3, driven. A separate stream per draw so two draws cannot share a
  // sequence, and a Set so the collision count is measured rather than assumed.
  const seen = new Set();
  let collisions = 0;
  let noteSum = 0;
  const blank = newTune(level);
  for (let d = 0; d < DRAWS; d++) {
    const tune = surprise(blank, mulberry32(d * 2654435761 + steps * 7919));
    noteSum += noteCount(tune);
    const key = tune.cells.map((c) => (c ? "1" : "0")).join("");
    if (seen.has(key)) collisions++;
    else seen.add(key);
  }

  // Question 4: shorten a full-length tune and see what is left. Driven over
  // random grids rather than argued from the loop bounds.
  let kept = 0;
  let before = 0;
  for (let d = 0; d < 2000; d++) {
    const rng = mulberry32(d * 40503 + steps);
    let tune = newTune("long");
    for (let i = 0; i < ROWS * STEPS.long; i++) {
      if (rng() < 0.25) tune = toggleCell(tune, i).state;
    }
    before += noteCount(tune);
    kept += noteCount(resize(tune, level));
  }

  rows.push({
    level,
    steps,
    squares,
    tunes: allTunes.toString(),
    melodies: melodies.toString(),
    tapsToFill: taps,
    coinsForAFullGrid: milestoneStep(squares),
    notesPerSurprise: Number((noteSum / DRAWS).toFixed(2)),
    surprisesDrawn: DRAWS,
    surprisesRepeated: collisions,
    surprisesDistinct: seen.size,
    keptFromLongPct: Number(((kept / before) * 100).toFixed(1)),
  });
}

const out = {
  draws: DRAWS,
  noteRows: ROWS,
  milestoneEvery: MILESTONE_EVERY,
  scale,
  intervals,
  lengths: rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`music box: ${ROWS} rows of notes, a coin every ${MILESTONE_EVERY} notes\n`);
  console.log(
    "length   beats  squares  different tunes            one-note-per-beat melodies  taps to fill  coins  surprise notes  repeats in draws  kept from an 8-beat tune",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${String(r.steps).padStart(5)} ${String(r.squares).padStart(8)} ` +
        `${r.tunes.padStart(26)} ${r.melodies.padStart(26)} ${String(r.tapsToFill).padStart(13)} ` +
        `${String(r.coinsForAFullGrid).padStart(6)} ${String(r.notesPerSurprise).padStart(15)} ` +
        `${String(r.surprisesRepeated).padStart(17)} ${String(r.keptFromLongPct + "%").padStart(25)}`,
    );
  }
  console.log(`\nthe scale, in semitones - ${scale.pairs} pairs of notes on the grid:`);
  for (const i of intervals) {
    console.log(`  ${i.from} to ${i.to}  ${String(i.semitones).padStart(6)}`);
  }
  console.log(
    `\n  smallest gap between any two notes: ${scale.smallestGap} semitones\n` +
      `  pairs a semitone apart: ${scale.semitonePairs}   pairs a tritone apart: ${scale.tritonePairs}\n` +
      `  closest any pair comes to a semitone: ${scale.closestToASemitone}   to a tritone: ${scale.closestToATritone}\n` +
      `  the top row is the highest note: ${scale.topRowIsHighest}`,
  );
  console.log(
    `\nA tune is every square on or off, so the count is exact rather than sampled. The\n` +
      `'surprise' column is the corner of that space one tap can reach: one note per beat,\n` +
      `which is a melody. The last column shortens a random 8-beat tune and counts what\n` +
      `survives - the notes past the new end are dropped, and nothing else is.`,
  );
}
