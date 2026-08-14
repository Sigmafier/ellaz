#!/usr/bin/env node
/**
 * What each thinking game's levels actually ask of a child.
 *
 *   node scripts/sim/thinking-levels.mjs [--json]
 *
 * Four games (echo, sequence, shadows, vanish) advertise their levels
 * as a word. This turns each word into the quantity it stands for, read from
 * the game's own constants, so a retuned level moves this output instead of
 * being contradicted by it.
 *
 * The one that matters most is echo. A sequence game's difficulty is not the
 * pad count, it is how fast luck stops being available, and that is
 * pads^length. Six pads and five flashes is one chance in 7,776, which is the
 * honest answer to "could they have guessed that".
 *
 * shadows is the interesting counter-example: hard has the SAME number of
 * choices as medium. Its difficulty is entirely that every silhouette comes
 * from one theme, so a guess is worth exactly as much and looking is worth far
 * less. A page that quoted only the choice count would call them equal.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const echo = await import(join(ROOT, "src/games/echo/logic.ts"));
const sequence = await import(join(ROOT, "src/games/sequence/logic.ts"));
const shadows = await import(join(ROOT, "src/games/shadows/logic.ts"));
const vanish = await import(join(ROOT, "src/games/vanish/logic.ts"));

const pct = (x) => Number((x * 100).toFixed(1));

/* ------------------------------------------------------------------- echo */

const echoLevels = {};
for (const level of echo.LEVELS) {
  // One in pads^n. Reported at the round where luck stops being a story you
  // can tell yourself about a good result.
  const oneIn = (n) => Math.pow(level.pads, n);
  echoLevels[level.id] = {
    pads: level.pads,
    guessOneInAtRound3: oneIn(3),
    guessOneInAtRound5: oneIn(5),
    // The flash shortens as the pattern grows, down to a floor. The floor plus
    // the gap is the fastest beat a child ever has to read.
    firstFlashMs: echo.FLASH_MAX_MS,
    fastestFlashMs: echo.FLASH_MIN_MS,
    gapMs: echo.GAP_MS,
  };
}

/* --------------------------------------------------------------- sequence */

const sequenceLevels = {};
for (const [d, families] of Object.entries(sequence.FAMILIES)) {
  sequenceLevels[d] = {
    families: [...families],
    // A repeating family has a period; the two that grow do not, and reporting
    // 0 for them rather than omitting them is the honest shape.
    periods: families.map((f) => sequence.PERIOD[f]),
    // With six colours, blind guessing is one in six however clever the pattern.
    colours: sequence.SEQ_COLORS.length,
    blindGuessPct: pct(1 / sequence.SEQ_COLORS.length),
  };
}

/* ---------------------------------------------------------------- shadows */

const shadowLevels = {};
for (const [d, cfg] of Object.entries(shadows.DIFFICULTY_CONFIG)) {
  shadowLevels[d] = {
    choices: cfg.choices,
    guessPct: pct(1 / cfg.choices),
    allFromOneTheme: cfg.sameTheme,
  };
}
// The claim the page rests on: medium and hard are equally guessable, so the
// difference between them cannot be the choice count.
const shadowsSameOdds =
  shadowLevels.medium.choices === shadowLevels.hard.choices &&
  shadowLevels.medium.allFromOneTheme !== shadowLevels.hard.allFromOneTheme;

/* ----------------------------------------------------------------- vanish */

const vanishLevels = {};
for (const [d, spec] of Object.entries(vanish.LEVELS)) {
  const perItem = spec.studyMs / spec.count;
  vanishLevels[d] = {
    items: spec.count,
    studyMs: spec.studyMs,
    msPerItem: Math.round(perItem),
    secondsPerItem: Number((perItem / 1000).toFixed(2)),
    guessPct: pct(1 / spec.count),
  };
  // The design claim is that the TOTAL grows while the PER-ITEM budget shrinks.
  // If a retune ever broke the floor, this must fail loudly rather than let a
  // page keep quoting a fairness promise the code no longer keeps.
  if (perItem < vanish.MIN_MS_PER_ITEM) {
    throw new Error(
      `vanish ${d}: ${Math.round(perItem)}ms per item is below the declared floor of ` +
        `${vanish.MIN_MS_PER_ITEM}ms - the fairness promise is broken, publish nothing.`,
    );
  }
  if (spec.studyMs < vanish.MIN_STUDY_MS) {
    throw new Error(`vanish ${d}: study window ${spec.studyMs}ms is below ${vanish.MIN_STUDY_MS}ms`);
  }
}

const out = {
  echo: echoLevels,
  sequence: sequenceLevels,
  shadows: { levels: shadowLevels, mediumAndHardShareOdds: shadowsSameOdds },
  vanish: vanishLevels,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log("echo: when luck stops being an explanation\n");
  console.log("level     pads   1 in ... at round 3   at round 5   flash first -> fastest");
  for (const [name, r] of Object.entries(echoLevels)) {
    console.log(
      `${name.padEnd(9)} ${String(r.pads).padStart(4)}   ${String(r.guessOneInAtRound3).padStart(18)}   ` +
        `${String(r.guessOneInAtRound5).padStart(10)}   ${r.firstFlashMs}ms -> ${r.fastestFlashMs}ms`,
    );
  }

  console.log("\nsequence: the pattern families each level draws from\n");
  for (const [name, r] of Object.entries(sequenceLevels)) {
    console.log(`${name.padEnd(9)} ${r.families.join(", ").padEnd(22)} periods ${r.periods.join("/")}`);
  }
  console.log(`Blind guessing is 1 in ${sequenceLevels.easy.colours} whatever the pattern.`);

  console.log("\nshadows: why medium and hard are not the same level\n");
  console.log("level     choices   guess odds   all one theme");
  for (const [name, r] of Object.entries(shadowLevels)) {
    console.log(
      `${name.padEnd(9)} ${String(r.choices).padStart(7)}   ${String(r.guessPct + "%").padStart(10)}   ${r.allFromOneTheme}`,
    );
  }
  console.log(
    shadowsSameOdds
      ? "Medium and hard are equally guessable. The difference is entirely that hard\ndraws every silhouette from one theme, so looking is worth much less."
      : "NOTE: medium and hard now differ in choice count - the page claim needs revisiting.",
  );

  console.log("\nvanish: the total window grows while the per-item budget shrinks\n");
  console.log("level     items   study   per item   guess odds");
  for (const [name, r] of Object.entries(vanishLevels)) {
    console.log(
      `${name.padEnd(9)} ${String(r.items).padStart(5)}   ${String(r.studyMs / 1000 + "s").padStart(5)}   ` +
        `${String(r.secondsPerItem + "s").padStart(8)}   ${String(r.guessPct + "%").padStart(10)}`,
    );
  }
}
