#!/usr/bin/env node
/**
 * Derives the move statistics the memory game page quotes.
 *
 *   node scripts/sim/memory-moves.mjs [--games 20000] [--json]
 *
 * WHY THIS FILE EXISTS. Research on getting quoted by answer engines
 * (arXiv:2311.09735) found that adding statistics is one of the two biggest
 * levers. Our own rules forbid inventing one. Both hold only because a game is
 * a system you can MEASURE: this script is the reason the page may say "9.2
 * moves" at all, and `src/content/types.ts` requires every quoted figure to
 * name the script that produces it.
 *
 * The first draft of that page said "ten pairs in under twenty-eight moves is
 * already something". Nothing produced that number. It is gone.
 *
 * GROUNDED IN THE REAL BOARDS. The level table is parsed out of
 * `src/games/memory/Memory.tsx` rather than copied here, so if somebody changes
 * a difficulty the script either follows them or fails loudly. A statistic that
 * silently describes a board we no longer ship is worse than none.
 *
 * Two strategies, both playing the real rules (one move = two cards flipped):
 *
 *   perfect  remembers every card it has ever seen and plays optimally on that
 *            knowledge. This is the ceiling a human is chasing, not the
 *            theoretical minimum - even perfect memory has to spend moves
 *            LEARNING where the cards are.
 *   random   picks two unmatched cards at random. The floor.
 *
 * The theoretical minimum is simply `pairs`: every move a match, no misses,
 * which requires luck rather than skill.
 *
 * Determinism: a fixed-seed LCG, so two runs of the same command give the same
 * numbers. 20,000 games converges to one decimal place - a 200,000-game run
 * agreed on all six cells.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = join(ROOT, "src", "games", "memory", "Memory.tsx");

/** Parse the shipped difficulty table. Throws rather than guess. */
function levels() {
  const src = readFileSync(SOURCE, "utf8");
  const rows = [...src.matchAll(/\{\s*id:\s*"(\w+)",\s*pairs:\s*(\d+),\s*cols:\s*(\d+)/g)].map(
    (m) => ({ id: m[1], pairs: Number(m[2]), cols: Number(m[3]) }),
  );
  if (!rows.length) {
    throw new Error(
      `No LEVELS rows found in ${SOURCE}. The memory game's difficulty table moved or ` +
        `changed shape, so every figure this script feeds into the page is now unverified. ` +
        `Fix the parser before re-quoting any number.`,
    );
  }
  return rows;
}

/** Fixed-seed LCG. Math.random would make the published figures unreproducible. */
function lcg(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Play one board to completion, returning the move count.
 * `perfect` toggles between the two strategies described above.
 */
function play(pairs, perfect, rnd) {
  const deck = [];
  for (let i = 0; i < pairs; i++) deck.push(i, i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const closed = new Set(deck.map((_, i) => i));
  const seen = new Map(); // index -> face, everything the player remembers
  let moves = 0;

  while (closed.size) {
    moves++;

    if (!perfect) {
      const arr = [...closed];
      const a = arr[Math.floor(rnd() * arr.length)];
      const rest = arr.filter((i) => i !== a);
      const b = rest[Math.floor(rnd() * rest.length)];
      if (deck[a] === deck[b]) {
        closed.delete(a);
        closed.delete(b);
      }
      continue;
    }

    // Known pair among remembered cards? Take it - free match, no risk.
    const byFace = new Map();
    let took = false;
    for (const i of closed) {
      if (!seen.has(i)) continue;
      const face = seen.get(i);
      if (byFace.has(face)) {
        closed.delete(byFace.get(face));
        closed.delete(i);
        took = true;
        break;
      }
      byFace.set(face, i);
    }
    if (took) continue;

    // Otherwise turn over something new, and follow it up with the best card
    // available: its known partner if we have one, else another unseen card so
    // the move at least buys information.
    const unseen = [...closed].filter((i) => !seen.has(i));
    const a = unseen[Math.floor(rnd() * unseen.length)];
    seen.set(a, deck[a]);

    const known = [...closed].find((i) => i !== a && seen.get(i) === deck[a]);
    if (known !== undefined) {
      closed.delete(a);
      closed.delete(known);
      continue;
    }

    const rest = [...closed].filter((i) => i !== a && !seen.has(i));
    if (!rest.length) continue;
    const b = rest[Math.floor(rnd() * rest.length)];
    seen.set(b, deck[b]);
    if (deck[b] === deck[a]) {
      closed.delete(a);
      closed.delete(b);
    }
  }

  return moves;
}

const args = process.argv.slice(2);
const N = Number(args[args.indexOf("--games") + 1]) || 20000;
const asJson = args.includes("--json");

const rnd = lcg(12345);
const rows = levels().map(({ id, pairs }) => {
  const avg = (perfect) => {
    let total = 0;
    for (let i = 0; i < N; i++) total += play(pairs, perfect, rnd);
    return Number((total / N).toFixed(1));
  };
  return { level: id, pairs, minimum: pairs, perfectMemory: avg(true), random: avg(false) };
});

if (asJson) {
  console.log(JSON.stringify({ games: N, rows }, null, 2));
} else {
  console.log(`memory: ${N.toLocaleString("en-US")} simulated games per level\n`);
  console.log("level      pairs   minimum   perfect memory   random guessing");
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(10)} ${String(r.pairs).padStart(5)} ${String(r.minimum).padStart(9)} ` +
        `${String(r.perfectMemory).padStart(16)} ${String(r.random).padStart(17)}`,
    );
  }
  console.log("\nOne move = two cards flipped, which is how the game counts it.");
}
