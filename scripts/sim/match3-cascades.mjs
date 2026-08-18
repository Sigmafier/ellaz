#!/usr/bin/env node
/**
 * Derives the numbers the Match Three page quotes.
 *
 *   node scripts/sim/match3-cascades.mjs [--runs 2000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the match3
 * page says with a digit in it comes from here or from the game's own source.
 *
 * IT DRIVES THE SHIPPED REDUCER. `newGame`, `swapAt`, `findMatches`, `hasMove`
 * and `LEVELS` are imported from `src/games/match3/logic.ts` rather than
 * re-written, so every run below is a run of the game a child actually opens -
 * the same deal, the same cascade multiplier, the same shuffle when a board
 * locks. A re-implementation would measure my reading of the code, agree with
 * itself, and be confidently wrong about a game we do not ship.
 *
 * Three questions:
 *
 *   1. WHAT DOES ONE SWAP DO? Three gems is the floor; the interesting number
 *      is the average, because everything above three came from a chain the
 *      player did not have to see.
 *
 *   2. WHAT IS LOOKING WORTH? The claim on the page is that this is a game
 *      about reading the board rather than about speed. That is measurable: a
 *      bot taking any legal swap against a bot taking the BEST legal swap, and
 *      the gap between them is the size of the skill, in swaps per round.
 *
 *   3. HOW OFTEN DOES THE BOARD LOCK? `swapAt` shuffles when no legal swap is
 *      left. If that fires often the guarantee is doing visible work; if it
 *      almost never fires, it is an insurance policy, and the page should say
 *      which.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per run,
 * with a SEPARATE stream for the bot's own choices so a random chooser's picks
 * are not correlated with the gems the refill deals it next.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const m3 = await import(join(ROOT, "src/games/match3/logic.ts"));
const { mulberry32 } = await import(join(ROOT, "src/shared/rng.ts"));

const { DIFFICULTIES, LEVELS, findMatches, newGame, swapAt } = m3;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};
const RUNS = flag("runs", 2000);
const AS_JSON = args.includes("--json");

/** Every adjacent pair on a board, as [a, b]. Right and down only - swapping is symmetric. */
function pairs(size) {
  const out = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const i = r * size + c;
      if (c + 1 < size) out.push([i, i + 1]);
      if (r + 1 < size) out.push([i, i + size]);
    }
  }
  return out;
}

/**
 * Every legal swap on this board, with the size of the line it makes.
 *
 * Legality is tested with `findMatches` on a swapped COPY rather than by
 * calling `swapAt` - two reasons, and the second matters more than the speed.
 * `swapAt` runs the whole cascade and the lock check for every candidate, which
 * is quadratic-on-quadratic and took this script past two minutes a run. And it
 * consumes the rng, so probing a move would change the refill the real move
 * then gets: the greedy bot would be playing a measurably different game from
 * the random one purely because it looks at more options.
 *
 * The size reported is therefore the IMMEDIATE line, not the whole chain, which
 * is what makes `best` a look-at-the-board bot rather than an oracle. A player
 * cannot see the refill either.
 */
function legalSwaps(state, board) {
  const grid = [...state.grid];
  const out = [];
  for (const [a, b] of board) {
    [grid[a], grid[b]] = [grid[b], grid[a]];
    const hit = findMatches(grid, state.size).length;
    [grid[a], grid[b]] = [grid[b], grid[a]];
    if (hit > 0) out.push([a, b, hit]);
  }
  return out;
}

/**
 * Play one round, from a fresh board to the swap that completes round 1.
 *
 * `pick` chooses among the legal swaps.
 */
function playRound(level, seed, pick) {
  let state = newGame(level, mulberry32(seed));
  const board = pairs(state.size);
  const roll = mulberry32(seed * 7919 + 13);

  let swaps = 0;
  let gems = 0;
  let cascades = 0; // swaps whose chain ran to two steps or more
  let matched = 0;
  let deepest = 0;
  let shuffles = 0;

  // A hard bound rather than `while (true)`: a bug that made the round
  // un-completable would otherwise hang the script instead of reporting.
  for (let guard = 0; guard < 4000; guard += 1) {
    const legal = legalSwaps(state, board);
    if (legal.length === 0) break; // cannot happen - the board guarantees a move

    const [a, b] = pick(legal, roll);
    const { state: next, outcome } = swapAt(state, a, b, roll);
    swaps += 1;
    if (outcome.kind === "matched") {
      matched += 1;
      gems += outcome.gems;
      if (outcome.steps.length >= 2) cascades += 1;
      deepest = Math.max(deepest, outcome.steps.length);
      if (outcome.shuffled) shuffles += 1;
      if (outcome.roundUp > 0) {
        state = next;
        return { swaps, gems, cascades, matched, deepest, shuffles };
      }
    }
    state = next;
  }
  return { swaps, gems, cascades, matched, deepest, shuffles };
}

const anySwap = (legal, roll) => legal[Math.floor(roll() * legal.length)];
const bestSwap = (legal) =>
  legal.reduce((best, cur) => (cur[2] > best[2] ? cur : best), legal[0]);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

const results = {};
for (const level of DIFFICULTIES) {
  const arms = {};
  for (const [name, pick] of [
    ["any", anySwap],
    ["best", bestSwap],
  ]) {
    const rows = [];
    for (let i = 0; i < RUNS; i += 1) rows.push(playRound(level, i + 1, pick));
    arms[name] = {
      swapsPerRound: mean(rows.map((r) => r.swaps)),
      gemsPerSwap: mean(rows.map((r) => (r.matched ? r.gems / r.matched : 0))),
      cascadeRate: mean(rows.map((r) => (r.matched ? r.cascades / r.matched : 0))),
      deepest: Math.max(...rows.map((r) => r.deepest)),
      shufflesPerRound: mean(rows.map((r) => r.shuffles)),
    };
  }
  results[level] = {
    ...LEVELS[level],
    ...arms,
    lookaheadWorth: arms.any.swapsPerRound / arms.best.swapsPerRound,
  };
}

if (AS_JSON) {
  console.log(JSON.stringify({ runs: RUNS, results }, null, 2));
} else {
  console.log(`Match Three — ${RUNS} rounds per level per bot\n`);
  console.log(
    "level   size colours goal | swaps/round        gems/swap     cascade%   deepest  shuffles",
  );
  for (const level of DIFFICULTIES) {
    const r = results[level];
    console.log(
      `${level.padEnd(7)} ${String(r.size).padEnd(4)} ${String(r.colors).padEnd(7)} ` +
        `${String(r.goal).padEnd(4)} | ` +
        `any ${r.any.swapsPerRound.toFixed(1).padStart(5)}  best ${r.best.swapsPerRound.toFixed(1).padStart(5)}  ` +
        `${r.any.gemsPerSwap.toFixed(2)}/${r.best.gemsPerSwap.toFixed(2)}  ` +
        `${(r.any.cascadeRate * 100).toFixed(1)}%/${(r.best.cascadeRate * 100).toFixed(1)}%  ` +
        `${String(r.best.deepest).padStart(3)}      ${r.any.shufflesPerRound.toFixed(3)}`,
    );
  }
  console.log(
    "\nlookahead is worth: " +
      DIFFICULTIES.map((l) => `${l} ${results[l].lookaheadWorth.toFixed(2)}x`).join(", "),
  );
  // Not a bot result: the floor a swap can possibly clear, straight off the
  // rules, so the average above has something to be read against.
  console.log("a match is three gems by definition; everything over three came from a chain.");
}
