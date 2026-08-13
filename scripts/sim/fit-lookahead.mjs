#!/usr/bin/env node
/**
 * Derives the numbers the Shape Fit page quotes.
 *
 *   node scripts/sim/fit-lookahead.mjs [--runs 3000] [--cap 3000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the fit page
 * says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED REDUCER. `newGame`, `tapSlot`, `tapCell`, `isDead`,
 * `legalAnchors`, `clearFull` and `makeShape` are imported from
 * `src/games/fit/logic.ts` rather than re-written, so every run below is a run
 * of the game a child actually opens - the same bag, the same forgiving refill
 * on easy, the same super-linear clear bonus. A re-implementation would measure
 * my reading of the code, agree with itself, and be confidently wrong about a
 * game we do not ship.
 *
 * Three questions, and the third is the one worth a page:
 *
 *   1. HOW LONG DOES A RUN LAST? There is no clock and no completion here, so a
 *      placement is the only unit the game has. Two bots answer it: one taps at
 *      random, one tries every legal placement of all three offered shapes.
 *
 *   2. WHAT IS LOOKING AHEAD WORTH? The header of `logic.ts` claims the skill
 *      here is planning rather than reacting. That claim is measurable: the gap
 *      between the two bots IS the size of the skill, in placements.
 *
 *   3. WHY DOES A RUN END? `isDead` is the only ending - not one of the three
 *      offered shapes fits anywhere. So the interesting number is how FULL the
 *      board was at that moment. A board that ends nearly empty means the run
 *      was lost to the shape of the room rather than to the amount of it, which
 *      is the whole difference between this game and the falling-block one.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * with a SEPARATE stream for the bot's own choices so a random tapper's picks
 * are not correlated with the shapes the bag deals it next.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fit = await import(join(ROOT, "src/games/fit/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const {
  DIFFICULTIES,
  LEVELS,
  OFFER_SIZE,
  SHAPE_IDS,
  MILESTONE_EVERY,
  clearFull,
  isDead,
  legalAnchors,
  makeShape,
  newGame,
  tapCell,
  tapSlot,
} = fit;

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
// 3,000 runs settles every cell below to within a tenth of a placement between
// a 1,000-run and a 3,000-run pass. The cap is a tripwire, not a budget: a run
// that hit it would make every average a floor rather than a number, so hitting
// it throws.
const RUNS = arg("runs", 3000);
const CAP = arg("cap", 3000);

/* ------------------------------------------------------------ the placements */

/** Every legal (slot, anchor) pair right now, asked of the shipped rules. */
function legalPlacements(state) {
  const out = [];
  for (let slot = 0; slot < state.offer.length; slot++) {
    const id = state.offer[slot];
    if (id === null) continue;
    const shape = makeShape(id);
    for (const at of legalAnchors(state, shape)) out.push({ slot, at, shape });
  }
  return out;
}

/** The grid this placement would leave, and how many lines it would take. */
function outcomeOf(state, move) {
  const painted = [...state.grid];
  const r0 = Math.floor(move.at / state.size);
  const c0 = move.at % state.size;
  for (const [dr, dc] of move.shape.cells) {
    painted[(r0 + dr) * state.size + (c0 + dc)] = move.shape.color;
  }
  const cleared = clearFull(painted, state.size);
  return { grid: cleared.grid, lines: cleared.rows.length + cleared.cols.length };
}

/**
 * Empty squares with no empty neighbour left - the holes nothing but a single
 * dot can ever fill again.
 *
 * This is the only board-quality term the looking-ahead bot uses, and it is
 * deliberately the crudest one that still reads as a sentence: a person playing
 * this does not compute anything, they just avoid stranding gaps.
 */
function trappedSingles(grid, size) {
  let n = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r * size + c] !== null) continue;
      let open = false;
      if (r > 0 && grid[(r - 1) * size + c] === null) open = true;
      if (r < size - 1 && grid[(r + 1) * size + c] === null) open = true;
      if (c > 0 && grid[r * size + c - 1] === null) open = true;
      if (c < size - 1 && grid[r * size + c + 1] === null) open = true;
      if (!open) n++;
    }
  }
  return n;
}

function filledCount(grid) {
  let n = 0;
  for (const cell of grid) if (cell !== null) n++;
  return n;
}

/* ------------------------------------------------------------------ the bots */

/** Uniform over every legal placement. Roughly a small child tapping. */
function randomBot(state, moves, rng) {
  return moves[Math.floor(rng() * moves.length)];
}

/**
 * Tries all three shapes everywhere and keeps the best resulting board.
 *
 * One move ahead, not two: it never asks what the NEXT offer might be, because
 * the offer is drawn from a shuffled bag and a bot that modelled the bag would
 * be measuring something no player has access to.
 */
function lookaheadBot(state, moves, rng) {
  let best = -Infinity;
  let pick = [];
  for (const move of moves) {
    const after = outcomeOf(state, move);
    const score = after.lines * 100 - trappedSingles(after.grid, state.size) * 4;
    if (score > best) {
      best = score;
      pick = [move];
    } else if (score === best) pick.push(move);
  }
  return pick[Math.floor(rng() * pick.length)];
}

const BOTS = { random: randomBot, lookahead: lookaheadBot };

/**
 * One run: place until nothing offered fits.
 *
 * Driven entirely through `tapSlot` and `tapCell`, so the bag, the refill and
 * the scoring are the shipped ones. Returns the run's own numbers plus the
 * board as it stood at the end, which is question 3.
 */
function play(level, choose, seed) {
  const gameRng = mulberry32(seed);
  const botRng = mulberry32(seed ^ 0x9e3779b9);

  let state = newGame(level, gameRng);
  let placements = 0;
  let firstClear = null;

  while (placements < CAP && !isDead(state)) {
    const moves = legalPlacements(state);
    if (moves.length === 0) {
      // `isDead` said there was a move and `legalAnchors` disagreed, which would
      // mean the two halves of the shipped rules contradict each other. Loud.
      throw new Error(`${level}: isDead false with no legal placement`);
    }
    const move = choose(state, moves, botRng);

    const picked = tapSlot(state, move.slot);
    if (picked.outcome.kind !== "selected") {
      throw new Error(`${level}: slot ${move.slot} refused a shape it is holding`);
    }
    const played = tapCell(picked.state, move.at, gameRng);
    if (played.outcome.kind !== "placed") {
      // Every move above came out of `legalAnchors`, so a `blocked` here means
      // the two functions disagree about what fits. Also loud.
      throw new Error(`${level}: a legal anchor was refused (${played.outcome.kind})`);
    }

    state = played.state;
    placements++;
    if (firstClear === null && state.cleared > 0) firstClear = placements;
  }

  return {
    placements,
    firstClear,
    score: state.score,
    cleared: state.cleared,
    filled: filledCount(state.grid),
    cells: state.size * state.size,
  };
}

/* ------------------------------------------------------------------- the run */

const rows = [];
for (const level of DIFFICULTIES) {
  const cfg = LEVELS[level];
  for (const [bot, choose] of Object.entries(BOTS)) {
    let placements = 0;
    let score = 0;
    let cleared = 0;
    let firstClear = 0;
    let firstClearRuns = 0;
    let neverCleared = 0;
    let fillSum = 0;
    let underHalf = 0;
    let capped = 0;

    for (let r = 0; r < RUNS; r++) {
      const out = play(level, choose, r * 2654435761 + bot.length * 7919 + level.length * 31);
      if (out.placements >= CAP) capped++;
      placements += out.placements;
      score += out.score;
      cleared += out.cleared;
      if (out.firstClear === null) neverCleared++;
      else {
        firstClear += out.firstClear;
        firstClearRuns++;
      }
      const fill = out.filled / out.cells;
      fillSum += fill;
      if (fill < 0.5) underHalf++;
    }

    rows.push({
      level,
      bot,
      size: cfg.size,
      shapes: cfg.pool.length,
      forgiving: cfg.forgiving,
      placements: Number((placements / RUNS).toFixed(1)),
      score: Number((score / RUNS).toFixed(1)),
      lines: Number((cleared / RUNS).toFixed(1)),
      firstClearAt: firstClearRuns ? Number((firstClear / firstClearRuns).toFixed(1)) : null,
      neverClearedPct: Number(((neverCleared / RUNS) * 100).toFixed(1)),
      endFillPct: Number(((fillSum / RUNS) * 100).toFixed(1)),
      endUnderHalfPct: Number(((underHalf / RUNS) * 100).toFixed(1)),
      capped,
    });
  }
}

// A capped run never ended, so its board and its placement count are both a
// floor rather than a number, and every average above would quietly be one too.
for (const r of rows) {
  if (r.capped) throw new Error(`${r.level}/${r.bot}: ${r.capped} of ${RUNS} runs hit the cap`);
}

const byLevel = (level, bot) => rows.find((r) => r.level === level && r.bot === bot);

const out = {
  runs: RUNS,
  cap: CAP,
  offerSize: OFFER_SIZE,
  shapesInSet: SHAPE_IDS.length,
  milestoneEvery: MILESTONE_EVERY,
  boards: Object.fromEntries(DIFFICULTIES.map((d) => [d, LEVELS[d].size])),
  poolSizes: Object.fromEntries(DIFFICULTIES.map((d) => [d, LEVELS[d].pool.length])),
  /** The gap between the two bots, per level. This is the size of the skill. */
  lookaheadGain: Object.fromEntries(
    DIFFICULTIES.map((d) => [
      d,
      Number((byLevel(d, "lookahead").placements / byLevel(d, "random").placements).toFixed(2)),
    ]),
  ),
  rows,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(
    `shape fit: ${RUNS.toLocaleString("en-US")} runs per level per bot, ` +
      `${SHAPE_IDS.length} shapes in the set, ${OFFER_SIZE} offered at a time\n`,
  );
  console.log(
    "level    bot         board  shapes  placements  lines  points  first clear  board full at the end  ended under half full",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${r.bot.padEnd(11)} ${`${r.size}x${r.size}`.padStart(5)} ` +
        `${String(r.shapes).padStart(7)} ${String(r.placements).padStart(11)} ` +
        `${String(r.lines).padStart(6)} ${String(r.score).padStart(7)} ` +
        `${String(r.firstClearAt).padStart(12)} ${String(r.endFillPct + "%").padStart(22)} ` +
        `${String(r.endUnderHalfPct + "%").padStart(22)}`,
    );
  }
  console.log("\nlooking ahead is worth this many times the random bot's run length:");
  for (const [level, gain] of Object.entries(out.lookaheadGain)) {
    console.log(`  ${level.padEnd(8)} ${gain}x`);
  }
  console.log(
    `\nPlacements, not minutes: nothing here runs on a clock. 'random' taps a legal square\n` +
      `at random; 'lookahead' tries every legal placement of all three offered shapes and\n` +
      `keeps the board that clears the most lines, breaking ties on fewest stranded single\n` +
      `squares. The last column is question 3 - a run that ends on a half-empty board was\n` +
      `lost to the SHAPE of the room rather than to the amount of it.`,
  );
}
