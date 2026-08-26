#!/usr/bin/env node
/**
 * Derives the numbers the Picture Logic page quotes.
 *
 *   node scripts/sim/nonogram-solvable.mjs [--boards 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the
 * nonogram page says with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `makePicture`, `cluesOf`, `lineSolve`, `deal`
 * and `LEVELS` are imported from `src/games/nonogram/logic.ts` rather than
 * re-written, so these numbers describe the game a child actually opens. A
 * re-implementation would measure my reading of the code, agree with itself,
 * and be confidently wrong about a game we do not ship.
 *
 * Four questions:
 *
 *   1. HOW MANY CANDIDATE PICTURES SURVIVE THE PROOF? The game draws a picture,
 *      reads the clues off it, and then runs a line solver over those clues
 *      alone. Only a board the solver finishes - meaning the clues force ONE
 *      picture and a player can reach it without a single guess - is ever
 *      shown. This is the share that survives, and one over it is how many
 *      pictures a dealt board costs.
 *
 *   2. HOW MUCH CROSS-REFERENCING DOES A TIER ASK FOR? `passes` is how many
 *      times the solver had to sweep both axes before it stopped learning
 *      anything. A board solved in two sweeps mostly fell out of its own clues;
 *      one that took six made the player look at the other axis five times.
 *      `first pass` is the share of the grid decided in the very first sweep,
 *      which is the part a player can do before thinking at all.
 *
 *   3. WHAT DOES A BOARD LOOK LIKE? The filled share, the numbers per line, and
 *      the longest single run. A tier is a grid size here; these say what that
 *      size actually produces.
 *
 *   4. HOW OFTEN DOES THE DEAL RUN OUT OF ROLLS? `deal` draws up to
 *      DEAL_ATTEMPTS pictures and falls back to a diamond if none survives. The
 *      fallback column must stay at zero; a tier above zero means the tuning
 *      has drifted and boards are being dealt from one fixed picture.
 *
 * Plus one CONTROL, and it is the reason the survival column can be believed.
 * The proof is a function that returns "solved" or "stalled", and a broken one
 * that always said "solved" would make every survival rate here 100% and every
 * board unfair - while nothing threw and no test in this file failed. So a
 * board whose clues genuinely admit two pictures is planted and the proof must
 * REFUSE it, and a second board one cell away must still be accepted. Both are
 * printed at the bottom of the run.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per
 * board, so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const nonogram = await import(join(ROOT, "src/games/nonogram/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  LEVELS,
  LEVEL_IDS,
  SYMMETRIES,
  BLANK,
  cluesOf,
  deal,
  lineSolve,
  makePicture,
} = nonogram;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 4000);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));
const pct = (n, d) => round((100 * n) / (d || 1), 1);

/**
 * One candidate picture, exactly as `deal` draws one.
 *
 * The symmetry is drawn the same way the game draws it - one of three, from the
 * same rng - so the survival rate here is the survival rate of the real deal
 * rather than of a tidier version of it.
 */
function candidate(spec, rng) {
  const symmetry = SYMMETRIES[Math.floor(rng() * SYMMETRIES.length)];
  return makePicture(spec, symmetry, rng);
}

const rows = [];

for (const level of LEVEL_IDS) {
  const spec = LEVELS[level];
  const cells = spec.size * spec.size;

  let candidates = 0;
  let survived = 0;
  let blankish = 0;
  const passes = [];
  const firstPass = [];
  const fillShare = [];
  const runsPerLine = [];
  const longestRun = [];
  const clueNumbers = [];

  for (let board = 0; board < BOARDS; board++) {
    const rng = mulberry32(board * 2654435761 + spec.size * 7919 + 13);
    const picture = candidate(spec, rng);
    candidates++;

    const on = picture.reduce((n, c) => n + (c ? 1 : 0), 0);
    // The deal's own floor: a board that is nearly blank or nearly solid is
    // not a picture, and it is thrown out before the proof ever sees it.
    if (on < spec.size || on > cells - spec.size) {
      blankish++;
      continue;
    }

    const { rows: rowClues, cols } = cluesOf(picture, spec.size);
    const proof = lineSolve(spec.size, rowClues, cols);
    if (proof.kind !== "solved") continue;

    survived++;
    passes.push(proof.passes);
    fillShare.push(on / cells);
    const lines = [...rowClues, ...cols];
    runsPerLine.push(mean(lines.map((c) => c.length)));
    longestRun.push(Math.max(...lines.map((c) => Math.max(0, ...c))));
    clueNumbers.push(lines.reduce((n, c) => n + c.length, 0));

    // How much of the grid the FIRST sweep alone decides. Re-run rather than
    // recorded inside the solver, because the solver's job is the verdict and a
    // second output it does not need is a second thing that can rot.
    firstPass.push(1 - firstSweepBlanks(spec.size, rowClues, cols) / cells);
  }

  // ...and the deal itself, end to end, which is what a player meets.
  let fallbacks = 0;
  const attempts = [];
  const dealt = Math.min(BOARDS, 600);
  for (let board = 0; board < dealt; board++) {
    const d = deal(level, mulberry32(board * 40503 + spec.size * 104729 + 3));
    if (d.fallback) fallbacks++;
    attempts.push(d.attempts);
  }

  rows.push({
    level,
    size: spec.size,
    cells,
    candidates,
    blankishPct: pct(blankish, candidates),
    survivePct: pct(survived, candidates - blankish),
    picturesPerBoard: round((candidates - blankish) / (survived || 1), 2),
    meanAttempts: round(mean(attempts), 2),
    maxAttempts: Math.max(...attempts),
    fallbacks,
    meanPasses: round(mean(passes), 2),
    maxPasses: Math.max(...passes),
    firstPassPct: pct(mean(firstPass), 1),
    fillPct: pct(mean(fillShare), 1),
    runsPerLine: round(mean(runsPerLine), 2),
    longestRun: round(mean(longestRun), 1),
    clueNumbers: Math.round(mean(clueNumbers)),
  });
}

/** How many cells are still undecided after ONE sweep of rows then columns. */
function firstSweepBlanks(size, rowClues, cols) {
  const marks = new Array(size * size).fill(BLANK);
  const write = (index, forced, at) => {
    if (marks[index] !== BLANK) return;
    if (forced.filled[at]) marks[index] = 1;
    else if (forced.empty[at]) marks[index] = 2;
  };
  for (let r = 0; r < size; r++) {
    const line = [];
    for (let c = 0; c < size; c++) line.push(marks[r * size + c]);
    const forced = nonogram.forcedInLine(rowClues[r], line);
    for (let c = 0; c < size; c++) write(r * size + c, forced, c);
  }
  for (let c = 0; c < size; c++) {
    const line = [];
    for (let r = 0; r < size; r++) line.push(marks[r * size + c]);
    const forced = nonogram.forcedInLine(cols[c], line);
    for (let r = 0; r < size; r++) write(r * size + c, forced, r);
  }
  return marks.reduce((n, m) => n + (m === BLANK ? 1 : 0), 0);
}

/* ------------------------------------------------------------- the control */

// Two lone cells on a diagonal: the clues read 1,1 down both axes, and the
// other diagonal reads them identically. The proof MUST refuse this board.
const AMBIGUOUS = { rows: [[1], [1], [], [], []], cols: [[1], [1], [], [], []] };
// The same two cells stacked instead: the column now reads 2, which pins them.
const PINNED = { rows: [[1], [1], [], [], []], cols: [[2], [], [], [], []] };

const refusesAmbiguous = lineSolve(5, AMBIGUOUS.rows, AMBIGUOUS.cols).kind === "stalled";
const acceptsPinned = lineSolve(5, PINNED.rows, PINNED.cols).kind === "solved";

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify({ boards: BOARDS, control: { refusesAmbiguous, acceptsPinned }, rows }, null, 2),
  );
} else {
  console.log(`picture logic: ${BOARDS.toLocaleString("en-US")} candidate pictures per tier\n`);
  console.log(
    "tier      grid   cells  survive  pictures/board  passes  max  first pass  filled  numbers/line  longest run  numbers",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${(r.size + "x" + r.size).padStart(5)} ${String(r.cells).padStart(7)} ` +
        `${String(r.survivePct + "%").padStart(8)} ${String(r.picturesPerBoard).padStart(15)} ` +
        `${String(r.meanPasses).padStart(7)} ${String(r.maxPasses).padStart(4)} ` +
        `${String(r.firstPassPct + "%").padStart(11)} ${String(r.fillPct + "%").padStart(7)} ` +
        `${String(r.runsPerLine).padStart(13)} ${String(r.longestRun).padStart(12)} ` +
        `${String(r.clueNumbers).padStart(8)}`,
    );
  }

  console.log("\nthe deal itself, end to end:\n");
  console.log("tier      pictures drawn  worst case  fell back to the diamond  near-blank rejects");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${String(r.meanAttempts).padStart(14)} ${String(r.maxAttempts).padStart(11)} ` +
        `${String(r.fallbacks).padStart(25)} ${String(r.blankishPct + "%").padStart(19)}`,
    );
  }

  console.log(
    "\nEvery board is proved before it is shown: the picture is drawn first, the clues are\n" +
      "read off it, and a line solver that only ever writes a cell every arrangement agrees\n" +
      "on has to finish the whole grid. That makes the puzzle unique AND reachable without a\n" +
      "guess. 'survive' is the share of candidate pictures that clear it; the rest are thrown\n" +
      "away. 'first pass' is how much of the grid one sweep of rows and columns settles.\n" +
      "'fell back to the diamond' must stay 0 - a tier above zero means every board at that\n" +
      "size is coming from one fixed picture.\n" +
      `Control - the proof refuses a board with two answers: ${refusesAmbiguous ? "fires" : "DEAD"}. ` +
      `And still accepts the board one cell away: ${acceptsPinned ? "yes" : "NO"}.`,
  );
}
