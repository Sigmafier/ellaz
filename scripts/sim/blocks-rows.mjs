#!/usr/bin/env node
/**
 * What each Falling Blocks level actually asks of you.
 *
 *   node scripts/sim/blocks-rows.mjs [--games 400] [--json]
 *
 * The three levels are usually described as "slower" and "faster", which tells
 * a player nothing - the speed only decides how long you have to make the move,
 * not how hard the move is. What separates them is the PIECE POOL, and that is
 * measurable: play the real engine with two throwaway policies and count the
 * rows each one clears before the stack tops out.
 *
 *   1. random  - drop each piece into a random column, at a random rotation.
 *                Nobody plays this badly. It is the floor: what the board gives
 *                you for free.
 *   2. tidy    - try every column and rotation, keep the one that leaves the
 *                fewest buried holes, then the flattest surface. One piece of
 *                lookahead, no queue, no held piece. It is roughly what a
 *                careful eight-year-old does.
 *
 * The gap between them is what thinking is worth on that pool, before any
 * skill. Neither policy sees the `next` piece, on purpose - a bot that plans
 * two ahead measures a game nobody is playing.
 *
 * TWO THINGS THIS CANNOT MEASURE, and both matter more than the numbers it
 * does produce:
 *
 * - THE CLOCK IS INVISIBLE TO IT. A bot places instantly, so `startMs` and
 *   `floorMs` change nothing here. What separates the levels in this output is
 *   the PIECE POOL alone - which is the more interesting half, because it says
 *   the levels would still differ with the speed removed.
 * - A GOOD POLICY DOES NOT DIE on the two gentler pools. So `survivedPct` is
 *   reported beside the median, and a level where it is high has no meaningful
 *   median at all: the run ended because this script stopped it. Quoting that
 *   number as a ceiling would be inventing one.
 *
 * Uses `logic.ts` itself, so a retuned pool or board size moves this output
 * rather than being contradicted by it.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { LEVELS, canPlace, hardDrop, newGame, rotate } = await import(
  join(ROOT, "src/games/blocks/logic.ts")
);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const GAMES = arg("games", 400);
/** Where a run is cut off. A survivor is reported as such, never as a death. */
const PIECE_CAP = arg("cap", 1000);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every distinct (rotation, column) this piece can be dropped from. */
function placements(state) {
  const out = [];
  const seen = new Set();
  let piece = state.piece;
  for (let turns = 0; turns < 4; turns++) {
    const key = JSON.stringify(piece.cells);
    if (!seen.has(key)) {
      seen.add(key);
      for (let c = -piece.cells.length; c <= state.cols; c++) {
        const s = { ...state, piece, pc: c };
        if (canPlace(s, piece, s.pr, c)) out.push({ piece, pc: c });
      }
    }
    piece = rotate(piece);
  }
  return out;
}

/** Column heights, buried holes and how uneven the surface is. */
function survey(board, cols) {
  const rows = board.length;
  const heights = [];
  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let top = rows;
    for (let r = 0; r < rows; r++) {
      if (board[r][c]) {
        top = r;
        break;
      }
    }
    heights.push(rows - top);
    for (let r = top + 1; r < rows; r++) if (!board[r][c]) holes++;
  }
  let bumps = 0;
  for (let c = 1; c < cols; c++) bumps += Math.abs(heights[c] - heights[c - 1]);
  return { holes, bumps, max: Math.max(...heights), sum: heights.reduce((a, b) => a + b, 0) };
}

function play(level, policy, rng) {
  let s = newGame(level, rng);
  let pieces = 0;
  while (!s.over && pieces < PIECE_CAP) {
    const opts = placements(s);
    if (!opts.length) break;
    let chosen;
    if (policy === "random") {
      chosen = opts[Math.floor(rng() * opts.length)];
    } else {
      let bestScore = Infinity;
      for (const o of opts) {
        // A fixed rng: only the NEXT piece drawn depends on it, and the trial
        // is thrown away, so a real draw here would consume the bag twice.
        const landed = hardDrop({ ...s, piece: o.piece, pc: o.pc }, () => 0);
        const q = survey(landed.state.board, s.cols);
        // Holes dominate: one buried cell costs more rows than any amount of
        // unevenness, because nothing above it can ever come out.
        const cost = q.holes * 9 + q.max * 1.5 + q.bumps * 0.6 - landed.cleared * 8;
        if (cost < bestScore) {
          bestScore = cost;
          chosen = o;
        }
      }
    }
    s = hardDrop({ ...s, piece: chosen.piece, pc: chosen.pc }, rng).state;
    pieces++;
  }
  return { lines: s.lines, score: s.score, pieces, survived: !s.over };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const out = { games: GAMES, levels: {} };

for (const [name, lv] of Object.entries(LEVELS)) {
  const stats = {};
  for (const policy of ["random", "tidy"]) {
    const lines = [];
    const scores = [];
    const pieces = [];
    let survived = 0;
    for (let i = 0; i < GAMES; i++) {
      const r = play(name, policy, mulberry32(i * 2654435761 + name.length * 7919 + policy.length));
      lines.push(r.lines);
      scores.push(r.score);
      pieces.push(r.pieces);
      if (r.survived) survived++;
    }
    stats[policy] = {
      medianRows: median(lines),
      meanRows: Number((lines.reduce((a, b) => a + b, 0) / GAMES).toFixed(1)),
      medianScore: median(scores),
      medianPieces: median(pieces),
      // High means the median above is where this script stopped, not where the
      // game did. Read it first.
      survivedPct: Number(((survived / GAMES) * 100).toFixed(1)),
    };
  }

  out.levels[name] = {
    board: `${lv.cols}x${lv.rows}`,
    cells: lv.cols * lv.rows,
    pieces: lv.pool.length,
    pool: [...lv.pool],
    startMs: lv.startMs,
    floorMs: lv.floorMs,
    ...stats,
  };
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`Falling Blocks: ${GAMES} games per level per policy, ${PIECE_CAP}-piece cap\n`);
  console.log("level    board    pool   random rows (mean)   tidy rows   tidy survived");
  for (const [name, r] of Object.entries(out.levels)) {
    console.log(
      `${name.padEnd(8)} ${r.board.padEnd(8)} ${String(r.pieces).padEnd(6)} ` +
        `${String(r.random.meanRows).padEnd(20)} ${String(r.tidy.medianRows).padEnd(11)} ` +
        `${r.tidy.survivedPct}%`,
    );
  }
  console.log(
    `\nThe clock is invisible to a bot, so what separates these rows is the piece\n` +
      `pool alone. Where "tidy survived" is high the median beside it is this\n` +
      `script's cap, not the game's ceiling.`,
  );
}
