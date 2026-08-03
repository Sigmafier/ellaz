#!/usr/bin/env node
/**
 * How many clues a sudoku level actually gives you.
 *
 *   node scripts/sim/sudoku-clues.mjs [--puzzles 200] [--json]
 *
 * The level table names a TARGET clue count, and the generator carves down
 * towards it - but it puts a clue back whenever removing it would leave the
 * puzzle with more than one answer. So the target is a floor the generator is
 * aiming at, and the number a player actually sees is higher. Nothing in the
 * code says by how much. This measures it.
 *
 * It runs the REAL generator (`src/games/sudoku/logic.ts`) through the alias
 * hook rather than reimplementing the carve. A reimplementation would agree
 * with itself and describe a game we do not ship - which is the exact failure
 * `provenance` exists to prevent.
 *
 * Deterministic: fixed-seed LCG, so the published figures reproduce.
 */

import { register } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
register("./alias-hooks.mjs", pathToFileURL(join(HERE, "/")));

const { generateSpec, specForLevel } = await import(
  pathToFileURL(join(ROOT, "src", "games", "sudoku", "logic.ts")).href
);

/**
 * The target clue counts live in a module-private table, so read them from the
 * source. Parsing rather than copying means a retuned level either shows up here
 * or fails loudly.
 */
function targets() {
  const src = readFileSync(join(ROOT, "src", "games", "sudoku", "logic.ts"), "utf8");
  const rows = [...src.matchAll(/(\w+):\s*\{\s*spec:\s*SPEC_(\d+),\s*givens:\s*(\d+)\s*\}/g)].map(
    (m) => ({ level: m[1], size: Number(m[2]), target: Number(m[3]) }),
  );
  if (!rows.length) {
    throw new Error(
      "No LEVELS rows found in src/games/sudoku/logic.ts. The level table moved or changed " +
        "shape, so every clue-count figure on the sudoku page is now unverified.",
    );
  }
  return rows;
}

function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const args = process.argv.slice(2);
const N = Number(args[args.indexOf("--puzzles") + 1]) || 200;
const asJson = args.includes("--json");

const rnd = lcg(20260803);
const rows = targets().map(({ level, size, target }) => {
  const spec = specForLevel(level);
  const counts = [];
  for (let i = 0; i < N; i++) {
    const { puzzle } = generateSpec(spec, target, rnd);
    counts.push(puzzle.flat().filter((v) => v !== 0).length);
  }
  counts.sort((a, b) => a - b);
  const cells = size * size;
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  return {
    level,
    board: `${size}x${size}`,
    cells,
    target,
    actualMean: Number(mean.toFixed(1)),
    actualMin: counts[0],
    actualMax: counts[counts.length - 1],
    toSolve: Number((cells - mean).toFixed(1)),
  };
});

if (asJson) {
  console.log(JSON.stringify({ puzzles: N, rows }, null, 2));
} else {
  console.log(`sudoku: ${N} generated puzzles per level\n`);
  console.log("level    board   cells   target   actual clues (min-max)   you fill in");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(8)} ${r.board.padEnd(7)} ${String(r.cells).padStart(5)} ` +
        `${String(r.target).padStart(8)}   ${String(r.actualMean).padStart(6)} ` +
        `(${r.actualMin}-${r.actualMax})`.padEnd(16) +
        `${String(r.toSolve).padStart(11)}`,
    );
  }
  console.log(
    "\nThe generator carves towards the target and puts a clue back whenever removing it\n" +
      "would leave the puzzle with more than one answer, so what you play is never below it.",
  );
}
