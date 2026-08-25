/**
 * DID DELETING `shuffled` MOVE A SINGLE SEEDED PUZZLE?
 *
 * `patterns.ts` carried its own 8-line Fisher-Yates and three round generators
 * called it. 8fea36c deleted it and pointed them at `shuffle` from
 * `@shared/rng`. The two read as identical - same descending loop, same
 * `Math.floor(rng() * (i + 1))` draw, same swap - and that reading is what
 * made the swap safe to make. This asserts it instead.
 *
 * WHY IT IS NOT A STYLE QUESTION. A Fisher-Yates walking the array the OTHER
 * way consumes the same rng stream and returns a DIFFERENT permutation. Every
 * generator here is seeded, so a different permutation is a different puzzle
 * for every player on every seed - and every seeded test would move with it,
 * so the suite would go green again on the new answers and say nothing.
 *
 * THE OLD IMPLEMENTATION IS A LITERAL BELOW, NEVER AN IMPORT. That is the
 * whole point of a control arm: `import { shuffled } from "./patterns"` would
 * be importing the thing under test, and after the deletion it would simply be
 * a second name for `shuffle` - two arms that cannot disagree, passing forever.
 * (Same trap `src/lab/previous.ts` was built to avoid, where every "was" arm
 * had been written as the shipped constant.)
 *
 *   npx tsx scripts/repro/repro-shuffle-swap-is-inert.mts
 *   npx tsx scripts/repro/repro-shuffle-swap-is-inert.mts --control
 *
 * `--control` walks the array the other way. It MUST fail, or this probe is
 * incapable of reporting the defect it exists for.
 */
import { mulberry32, shuffle } from "../../src/shared/rng";
import { makeShared } from "../../src/games/lettercross/sharedLetter";
import { makeFill } from "../../src/games/lettercross/fillGaps";
import { makeAnagram } from "../../src/games/lettercross/anagram";

const CONTROL = process.argv.includes("--control");

/** patterns.ts's `shuffled`, verbatim as it stood at 79db84c. A LITERAL. */
function shuffledOld<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  if (CONTROL) {
    // The mutation: ascending instead of descending. Same draws, same swap,
    // different permutation - the exact defect this probe must be able to see.
    for (let i = 0; i < a.length - 1; i++) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let fails = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${detail ? ` - ${detail}` : ""}`);
  if (!cond) fails++;
};

// ---------------------------------------------------------------- the permutation
console.log("=== the two implementations, same seed, same array ===");
{
  const LENS = [0, 1, 2, 3, 5, 8, 13, 26, 100];
  let compared = 0;
  let differed = 0;
  const examples: string[] = [];
  for (const n of LENS) {
    const src = Array.from({ length: n }, (_, i) => i);
    for (let seed = 1; seed <= 400; seed++) {
      const a = shuffle(src, mulberry32(seed));
      const b = shuffledOld(src, mulberry32(seed));
      compared++;
      if (a.join(",") !== b.join(",")) {
        differed++;
        if (examples.length < 3) examples.push(`len=${n} seed=${seed}: ${a.join("")} vs ${b.join("")}`);
      }
    }
  }
  console.log(`  population: ${compared} (len,seed) pairs over lengths ${LENS.join(",")}`);
  ok("every permutation is identical", differed === 0, differed ? `${differed} differ; ${examples[0]}` : "");
  // Positive control on the POPULATION itself: a comparison over an empty or
  // all-degenerate set would report "identical" having compared nothing real.
  const nonTrivial = shuffle(Array.from({ length: 26 }, (_, i) => i), mulberry32(7)).join(",");
  ok("the population is real (a 26-element shuffle is not the identity)",
    nonTrivial !== Array.from({ length: 26 }, (_, i) => i).join(","));
}

// ---------------------------------------------------------- the puzzles themselves
console.log("\n=== the generators, 3,000 seeds each, output fingerprinted ===");
{
  const SEEDS = 3000;
  const fp = (v: unknown) => JSON.stringify(v);

  for (const [name, gen] of [
    ["makeShared(2)", (r: () => number) => makeShared(2, r)],
    ["makeShared(3)", (r: () => number) => makeShared(3, r)],
    ["makeFill", (r: () => number) => makeFill(r)],
    ["makeAnagram", (r: () => number) => makeAnagram(r)],
  ] as const) {
    let produced = 0;
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const out = gen(mulberry32(seed));
      if (out !== undefined) { produced++; seen.add(fp(out)); }
    }
    ok(`${name}: produced a puzzle on every seed`, produced === SEEDS, `${produced}/${SEEDS}`);
    // A generator returning ONE puzzle for every seed would satisfy "produced
    // on every seed" and be completely broken - so assert real variety too.
    ok(`${name}: is actually seeded (many distinct puzzles)`, seen.size > SEEDS / 10,
      `${seen.size} distinct of ${SEEDS}`);
  }
}

console.log(`\n${fails} failure(s)${CONTROL ? "  (--control: the old arm walks the array the other way; a 0 here means this probe is BLIND)" : ""}`);
process.exit(fails ? 1 : 0);
