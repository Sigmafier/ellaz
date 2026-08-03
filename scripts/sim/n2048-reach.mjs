#!/usr/bin/env node
/**
 * What each 2048 board actually asks of you.
 *
 *   node scripts/sim/n2048-reach.mjs [--games 3000] [--json]
 *
 * The three levels are usually described as board sizes, which tells a player
 * nothing. What separates them is how much ROOM the board leaves while you
 * build, and that is measurable two ways:
 *
 *   1. Arithmetic - a target tile of value T is 2^k, and every tile is built
 *      from two of the one below, so reaching it takes T/2 spawned twos at
 *      minimum. That number against the cell count is the real difficulty.
 *   2. Simulation - play the REAL move engine with two throwaway strategies,
 *      random and a plain corner heuristic, and record the highest tile each
 *      reaches. Neither is a good player. The gap between them is the point:
 *      it is what strategy is worth on this board, before skill.
 *
 * Uses `logic.ts` itself, so a retuned level or spawn rate moves this output
 * rather than being contradicted by it.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { LEVELS, emptyGrid, spawn, move, hasMoves } = await import(
  join(ROOT, "src/games/n2048/logic.ts")
);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const GAMES = arg("games", 3000);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = ["up", "down", "left", "right"];

const highest = (g) => Math.max(...g.flat());

/**
 * Two strategies, both deliberately simple.
 * - random: any direction that moves something.
 * - corner: prefer left, then up, then down, and only slide right when nothing
 *   else is legal. The whole of the folk advice, and nothing more.
 */
function run(size, strategy, rng) {
  let g = spawn(spawn(emptyGrid(size), rng), rng);
  let moves = 0;
  const order = strategy === "corner" ? ["left", "up", "down", "right"] : null;

  while (hasMoves(g) && moves < 20000) {
    let played = false;
    const dirs = order ?? DIRS.slice().sort(() => rng() - 0.5);
    for (const d of dirs) {
      const res = move(g, d);
      if (res.moved) {
        g = spawn(res.grid, rng);
        played = true;
        moves++;
        break;
      }
    }
    if (!played) break;
  }
  return { best: highest(g), moves };
}

const LABEL = { kids: "kids", classic: "classic", hard: "hard" };
const out = { games: GAMES, levels: {} };

for (const [name, lv] of Object.entries(LEVELS)) {
  const cells = lv.size * lv.size;
  const stats = {};
  for (const strategy of ["random", "corner"]) {
    let sumBest = 0;
    let reached = 0;
    let sumMoves = 0;
    for (let i = 0; i < GAMES; i++) {
      const r = run(lv.size, strategy, mulberry32(i * 2654435761 + name.length * 7919 + strategy.length));
      sumBest += r.best;
      sumMoves += r.moves;
      if (r.best >= lv.target) reached++;
    }
    stats[strategy] = {
      avgBestTile: Math.round(sumBest / GAMES),
      avgMoves: Math.round(sumMoves / GAMES),
      reachedTargetPct: Number(((reached / GAMES) * 100).toFixed(1)),
    };
  }

  out.levels[LABEL[name]] = {
    board: `${lv.size}x${lv.size}`,
    cells,
    target: lv.target,
    // Every tile is two of the one below, all the way down to a spawned 2.
    minSpawnsToTarget: lv.target / 2,
    spawnsPerCell: Number((lv.target / 2 / cells).toFixed(1)),
    ...stats,
  };
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`2048: ${GAMES} games per level per strategy\n`);
  console.log("level     board   target   twos needed   per cell   random best   corner best");
  for (const [name, r] of Object.entries(out.levels)) {
    console.log(
      `${name.padEnd(9)} ${r.board.padEnd(7)} ${String(r.target).padStart(6)}   ` +
        `${String(r.minSpawnsToTarget).padStart(11)}   ${String(r.spawnsPerCell).padStart(8)}   ` +
        `${String(r.random.avgBestTile).padStart(11)}   ${String(r.corner.avgBestTile).padStart(11)}`,
    );
  }
  console.log(
    "\n'twos needed' is the arithmetic minimum: a target tile is built from two " +
      "\nof the one below, all the way down. 'per cell' is that against the board's " +
      "\nsize, which is what actually makes a level hard.",
  );
}
