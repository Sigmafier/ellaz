#!/usr/bin/env node
/**
 * Green Light: what the three levels really change, and how badly guessing does.
 *
 *   node scripts/sim/reaction-wait.mjs [--draws 200000] [--json]
 *
 * The ladder here runs sideways rather than up. Harder does not mean a longer
 * wait, it means a LESS GUESSABLE one, and that claim is measurable:
 *
 * If a child stops watching and simply taps at a fixed moment every time, the
 * best fixed moment they could possibly choose is the middle of the band, and
 * their average error is a quarter of the band's width. That number is what
 * "you cannot count to it" actually costs, in milliseconds, per level. It grows
 * far faster than the average wait does, which is the whole design.
 *
 * Both are computed two ways: from the band arithmetic, and by sampling the
 * real `waitMs` through the real `LEVELS`. They have to agree, or the script
 * refuses rather than publishing whichever one it happened to print.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(ROOT, "src/games/reaction/logic.ts"));

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const DRAWS = arg("draws", 200000);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const out = { draws: DRAWS, levels: {}, praise: {} };

for (const d of R.DIFFICULTIES) {
  const { minWaitMs, maxWaitMs } = R.LEVELS[d];
  const width = maxWaitMs - minWaitMs;

  const rng = mulberry32(d.length * 7919 + 13);
  let sum = 0;
  let lo = Infinity;
  let hi = -Infinity;
  // The best a guesser can do is aim at the middle; measure their error there.
  const aim = (minWaitMs + maxWaitMs) / 2;
  let guessError = 0;

  for (let i = 0; i < DRAWS; i++) {
    const w = R.waitMs(d, rng);
    sum += w;
    guessError += Math.abs(w - aim);
    if (w < lo) lo = w;
    if (w > hi) hi = w;
  }

  const sampledMean = sum / DRAWS;
  const sampledError = guessError / DRAWS;
  const predictedError = width / 4; // uniform band, aiming at the middle

  // The two derivations must land on the same number. Disagreement means either
  // the band is not uniform or the sampler is not drawing from it, and in both
  // cases the honest move is to publish nothing.
  if (Math.abs(sampledError - predictedError) > width * 0.02) {
    throw new Error(
      `${d}: sampled guess error ${Math.round(sampledError)}ms disagrees with the band ` +
        `arithmetic ${Math.round(predictedError)}ms - do not publish either.`,
    );
  }
  if (lo < R.WAIT_FLOOR_MS || hi > R.WAIT_CEIL_MS) {
    throw new Error(`${d}: drew ${lo}..${hi}ms, outside the declared ${R.WAIT_FLOOR_MS}..${R.WAIT_CEIL_MS}`);
  }

  out.levels[d] = {
    bandMs: [minWaitMs, maxWaitMs],
    widthMs: width,
    meanWaitMs: Math.round(sampledMean),
    bestGuessErrorMs: Math.round(sampledError),
    observedMs: [lo, hi],
  };
}

out.praise = {
  lightningUnderMs: R.LIGHTNING_AT,
  quickUnderMs: R.QUICK_AT,
  goodUnderMs: R.GOOD_AT,
  // Every band is praise. There is deliberately no band for "too slow".
  bands: ["steady", "good", "quick", "lightning"],
};

const easy = out.levels.easy;
const hard = out.levels.hard;
out.spreadGrowth = Number((hard.widthMs / easy.widthMs).toFixed(2));
out.meanGrowth = Number((hard.meanWaitMs / easy.meanWaitMs).toFixed(2));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`green light: ${DRAWS.toLocaleString("en-US")} draws per level\n`);
  console.log("level     wait band        average   if you guess instead of watch");
  for (const [name, r] of Object.entries(out.levels)) {
    console.log(
      `${name.padEnd(9)} ${String(r.bandMs[0] + "-" + r.bandMs[1] + "ms").padEnd(16)} ` +
        `${String(r.meanWaitMs + "ms").padStart(7)}   ${String("off by " + r.bestGuessErrorMs + "ms").padStart(29)}`,
    );
  }
  console.log(
    `\nFrom easy to hard the average wait grows ${out.meanGrowth}x while the band grows ` +
      `${out.spreadGrowth}x.\nThat gap is the ladder: harder means less guessable, not longer.` +
      `\n\nEvery result is praise - under ${R.LIGHTNING_AT}ms, ${R.QUICK_AT}ms, ${R.GOOD_AT}ms, and steady above.` +
      `\nThere is no band for too slow, because there is no too slow.`,
  );
}
