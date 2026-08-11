#!/usr/bin/env node
/**
 * Reproducer — the quadratic body scan in `bodyStats`, found 2026-08-11.
 *
 * RUNNABLE, and it asserts: `node scripts/repro/repro-bodystats-quadratic.mjs`
 * exits 1 if the regression comes back. It needs no build, no network and no
 * dependencies, so it works from any checkout.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REPRODUCES
 *
 * `bodyStats` used to extract the body with
 *
 *     /<body[^>]*>([\s\S]*)<\/body>/i
 *
 * On input carrying many `<body` and no `</body>`, the engine retries from
 * every start position, drives the greedy `[\s\S]*` to end-of-input, and then
 * backtracks one character at a time hunting a close tag that is not there.
 * O(starts x length). Measured before the fix:
 *
 *      15 KB       77 ms
 *      29 KB      511 ms
 *      59 KB    2,542 ms
 *     117 KB    8,785 ms          <- roughly 4x per doubling
 *
 * After replacing it with indexOf/lastIndexOf, which cannot backtrack at all,
 * the same 117 KB takes about 10 ms.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SHAPE OF THE ASSERTION IS A RATIO, NOT A DURATION
 *
 * A wall-clock budget on a shared or loaded machine is a flaky test, and a
 * flaky test is worse than no test - it teaches its reader to ignore the file.
 * The GROWTH RATE is what distinguishes the defect: linear work roughly doubles
 * per doubling of input, quadratic work roughly quadruples. A loaded machine
 * makes every cell slower and leaves the ratio alone.
 *
 * `assert-crawlable.mjs` carries a coarse duration control for the same
 * regression, so CI is covered even if nobody runs this. This file is the
 * finer instrument and the record of how the defect was measured.
 */
import { bodyStats } from "../assert-crawlable.mjs";

// Warm the JIT before timing anything. The first call to a fresh function is a
// warm-up sample, not a measurement.
for (let i = 0; i < 50; i++) bodyStats("<body><p>warm up the compiler</p></body>");

const SIZES = [2_500, 5_000, 10_000, 20_000];
const rows = [];

for (const n of SIZES) {
  const input = "<body>".repeat(n); // many opens, no close: the pathological shape
  // Take the best of three. Timing noise only ever ADDS, so the minimum is the
  // honest sample of the work itself.
  let best = Infinity;
  for (let r = 0; r < 3; r++) {
    const t0 = process.hrtime.bigint();
    bodyStats(input);
    best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6);
  }
  rows.push({ n, kb: Math.round(input.length / 1024), ms: best });
}

console.log("  bodyStats on `<body>`.repeat(n), no closing tag (best of 3):\n");
let prev = null;
for (const r of rows) {
  const ratio = prev ? (r.ms / prev).toFixed(2) + "x" : "-";
  console.log(
    `    n=${String(r.n).padStart(6)}  ${String(r.kb).padStart(4)} KB  ` +
      `${r.ms.toFixed(2).padStart(9)} ms   vs previous: ${ratio}`,
  );
  prev = r.ms;
}

// The verdict. Compare the largest cell against the smallest: input grew 8x, so
// linear predicts ~8x time and quadratic predicts ~64x. 20x sits well clear of
// both, which is what keeps this from firing on a noisy machine.
const growth = rows.at(-1).ms / rows[0].ms;
const inputGrowth = SIZES.at(-1) / SIZES[0];
console.log(
  `\n  input grew ${inputGrowth}x, time grew ${growth.toFixed(1)}x ` +
    `(linear predicts ~${inputGrowth}x, quadratic ~${inputGrowth ** 2}x)`,
);

// A floor guards against the other failure: if every cell rounds to ~0 ms the
// ratio is noise over noise and proves nothing. Say so rather than pass.
if (rows.at(-1).ms < 0.05) {
  console.log("\n  INCONCLUSIVE — the largest cell is too fast to time reliably. Raise SIZES.");
  process.exit(0);
}

if (growth > 20) {
  console.error(
    `\n  FAIL  the body scan is growing super-linearly (${growth.toFixed(1)}x).\n` +
      "        The quadratic regex is back. bodyStats must extract the body with\n" +
      "        indexOf/lastIndexOf, never a greedy regex hunting `</body>`.",
  );
  process.exit(1);
}

console.log("\n  OK  linear. The body scan does not backtrack.");
