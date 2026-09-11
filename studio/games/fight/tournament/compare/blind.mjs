// Assign a letter to every arm, from a seed, and write the mapping to a file
// the grading page reads and the grader does not.
//
//   node blind.mjs [--seed 7] [cell...]
//
// The point is not secrecy, it is that a name carries a prior. An operator who
// can see which card is the library everyone recommends is grading the
// recommendation as much as the pixels. So the page shows A, B, C and nothing
// else, and the mapping is opened AFTER a ranking has been written down.
//
// This prints the seed and the letters, never the mapping - printing it here
// would put it in the transcript the grader is looking at.
//
// The population comes from the built tree, never a hand-kept list, so an arm
// that was built is graded whether or not anyone remembered to add it.

import { existsSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DIST, listCells, parseFlags } from "../harness/run-tape.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const LETTERS_FILE = join(HERE, "letters.json");
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** mulberry32 - a seeded generator, so a shuffle is reproducible from its seed alone */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates, backwards, off one seeded stream. */
export function shuffled(items, seed) {
  const rnd = rngOf(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function assign(cells, seed) {
  if (cells.length > ALPHABET.length) throw new Error(`${cells.length} cells is more than ${ALPHABET.length} letters`);
  const order = shuffled(cells, seed);
  const letters = {};
  order.forEach((cell, i) => { letters[ALPHABET[i]] = cell; });
  return { seed, at: new Date().toISOString(), letters };
}

function main(argv) {
  const f = parseFlags(argv, { dist: DEFAULT_DIST, seed: "1" });
  const cells = f.rest.length ? f.rest : listCells(String(f.dist));
  if (cells.length === 0) { console.log(`blind: NO cells found under ${f.dist}/cells and none named - nothing to letter`); return 2; }
  const seed = Number(f.seed);
  if (!Number.isFinite(seed)) { console.log(`blind: --seed must be a number, got ${f.seed}`); return 2; }
  const map = assign(cells, seed);
  writeFileSync(LETTERS_FILE, `${JSON.stringify(map, null, 2)}\n`);
  const used = Object.keys(map.letters);
  console.log(`blind: seed ${seed} - ${used.length} arm(s) lettered ${used.join(" ")} - written to ${LETTERS_FILE}`);
  console.log("blind: the mapping is deliberately NOT printed - open letters.json after the ranking is written down");
  console.log("blind: the built page reads this file as an asset, so rebuild the cells before grading");
  return 0;
}

const isMain = process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) process.exit(main(process.argv.slice(2)));
