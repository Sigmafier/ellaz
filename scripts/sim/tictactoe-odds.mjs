#!/usr/bin/env node
/**
 * What the three Tic-Tac-Toe opponents actually do to you.
 *
 *   node scripts/sim/tictactoe-odds.mjs [--games 20000] [--json]
 *
 * "Hard is unbeatable" is a claim about a minimax search, and claims about
 * code are worth exactly what a run of the code says. This plays real games
 * against the real `chooseMove`, and the hard column coming back at 0 wins out
 * of thousands is the proof - not a comment saying minimax cannot lose.
 *
 * The player here moves at random, which is the floor rather than a typical
 * five-year-old. Read the numbers as "what the board gives you before any
 * thinking at all"; a child who has noticed that the centre is worth taking
 * beats every one of these figures.
 *
 * Also reported: the exhaustive perfect-play result, computed over the full
 * game tree rather than sampled. That one is a fact about the game itself, not
 * about our AI, and it is why the hard record can honestly stay empty forever.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { emptyBoard, winner, isFull, available, place, chooseMove } = await import(
  join(ROOT, "src/games/tictactoe/logic.ts")
);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const GAMES = arg("games", 20000);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The human is X and moves first, exactly as in the game. */
function play(level, rng) {
  let b = emptyBoard();
  for (;;) {
    const moves = available(b);
    b = place(b, moves[Math.floor(rng() * moves.length)], "X");
    let w = winner(b);
    if (w) return "win";
    if (isFull(b)) return "draw";

    b = place(b, chooseMove(b, "O", level, rng), "O");
    w = winner(b);
    if (w) return "loss";
    if (isFull(b)) return "draw";
  }
}

const levels = {};
for (const level of ["easy", "medium", "hard"]) {
  const tally = { win: 0, draw: 0, loss: 0 };
  for (let i = 0; i < GAMES; i++) tally[play(level, mulberry32(i * 2654435761 + level.length))]++;
  levels[level] = {
    winPct: Number(((tally.win / GAMES) * 100).toFixed(1)),
    drawPct: Number(((tally.draw / GAMES) * 100).toFixed(1)),
    lossPct: Number(((tally.loss / GAMES) * 100).toFixed(1)),
    wins: tally.win,
  };
}

/**
 * Exhaustive: can X force a win against perfect play? Full tree, no sampling.
 * 1 = X wins, 0 = draw, -1 = O wins.
 */
function solve(b, toMove) {
  const w = winner(b);
  if (w) return w.player === "X" ? 1 : -1;
  if (isFull(b)) return 0;
  const scores = available(b).map((m) => solve(place(b, m, toMove), toMove === "X" ? "O" : "X"));
  return toMove === "X" ? Math.max(...scores) : Math.min(...scores);
}

/** How many distinct games exist at all, played out to the end. */
function count(b, toMove) {
  if (winner(b) || isFull(b)) return 1;
  return available(b).reduce((n, m) => n + count(place(b, m, toMove), toMove === "X" ? "O" : "X"), 0);
}

const perfect = solve(emptyBoard(), "X");
const out = {
  games: GAMES,
  levels,
  perfectPlayResult: perfect === 0 ? "draw" : perfect > 0 ? "X wins" : "O wins",
  totalPlayouts: count(emptyBoard(), "X"),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`tic-tac-toe: ${GAMES} games per opponent, player moves at random and goes first\n`);
  console.log("opponent   you win   draw     you lose");
  for (const [name, r] of Object.entries(levels)) {
    console.log(
      `${name.padEnd(10)} ${String(r.winPct + "%").padStart(7)}   ` +
        `${String(r.drawPct + "%").padStart(6)}   ${String(r.lossPct + "%").padStart(8)}`,
    );
  }
  console.log(
    `\nHard: ${levels.hard.wins} wins in ${GAMES} games.` +
      `\nWith both sides perfect the game is a ${out.perfectPlayResult} - over all ` +
      `${out.totalPlayouts.toLocaleString("en-US")} playouts, there is no line that beats it.`,
  );
}
