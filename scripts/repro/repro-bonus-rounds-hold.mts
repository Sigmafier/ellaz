/**
 * /deep-test C1 + C4 + C2 + C8 for the five bonus rounds, at a seed count the
 * unit suite does not reach.
 *
 * The suite runs 120-600 seeds per generator, which is right for a test that
 * has to finish in a watch loop. This asks the pass^k question properly: a
 * generator that returns `undefined` shows a child a broken screen, and every
 * one of the four CAN return it by type.
 *
 * PRODUCTION-REAL INPUTS ONLY - the real modules, the real 346-word pool, the
 * real 28,515-entry dictionary. Nothing mocked.
 *
 *   npx tsx scripts/repro/repro-bonus-rounds-hold.mts [seeds]
 *   npx tsx scripts/repro/repro-bonus-rounds-hold.mts --control   (must FAIL)
 */
import { mulberry32 } from "../../src/shared/rng";
import { PUZZLE_WORDS } from "../../src/games/lettercross/puzzleWords";
import { isWord, solvers, letterKey } from "../../src/games/lettercross/patterns";
import { makeShared } from "../../src/games/lettercross/sharedLetter";
import { makeFill, answersFor as fillAnswers, GAPS, CHOICES } from "../../src/games/lettercross/fillGaps";
import { makeAnagram, scramble, isAnswer, MIN_LEN, MAX_LEN } from "../../src/games/lettercross/anagram";

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 5000);
const CONTROL = process.argv.includes("--control");
const POOL = new Set(PUZZLE_WORDS);

let failures = 0;
const fail = (cat: string, why: string) => { console.log(`  FAIL [${cat}] ${why}`); failures++; };
const ok = (cat: string, why: string) => console.log(`  ok   [${cat}] ${why}`);

// ---------------------------------------------------------------- C1 edges
console.log("\n=== C1  edge / boundary inputs ===");
const edges: [string, () => boolean][] = [
  ["isAnswer([], '')", () => isAnswer([], "") === false],
  ["isAnswer(letters, '') ", () => isAnswer(["c", "a", "t"], "") === false],
  ["isAnswer wrong length", () => isAnswer(["c", "a", "t"], "cats") === false],
  ["isAnswer right letters, not a word", () => isAnswer(["z", "q", "x", "j"], "zqxj") === false],
  ["isAnswer unicode", () => isAnswer(["c", "a", "t"], "חתול") === false],
  ["fillAnswers('')", () => Array.isArray(fillAnswers(""))],
  // A pattern with NO gaps has exactly ONE completion - itself - and `cat` is
  // a word, so `["cat"]` is the right answer and not a bug. This assertion said
  // `length === 0` on the first run of this harness, which is an intuition
  // about a shape `makeFill` cannot produce: it always passes GAPS gaps.
  ["fillAnswers(no gaps) is the word itself", () => JSON.stringify(fillAnswers("cat")) === '["cat"]'],
  ["solvers([])", () => solvers([]).length === 26],
  // `scramble` promises an ordering whose join is NOT a dictionary word, and
  // that is vacuously satisfiable below the dictionary's floor: it returns
  // `[]` for "" and `["a"]` for "a" - the word itself - because neither is a
  // word. Not a defect, and NOT reachable: `makeAnagram` is its only
  // production caller and passes pool words of MIN_LEN..MAX_LEN only.
  ["scramble('') is vacuous, not undefined", () => JSON.stringify(scramble("", mulberry32(1))) === "[]"],
  // The control that makes the line above safe to leave alone. If MIN_LEN ever
  // drops to where the dictionary has no entries, `scramble` starts handing
  // back the answer spelled out and nothing else here would notice.
  ["MIN_LEN keeps scramble above the dictionary floor", () => MIN_LEN >= 2 && MAX_LEN >= MIN_LEN],
];
for (const [name, f] of edges) {
  let passed = false;
  try { passed = f(); } catch (e) { fail("C1", `${name} THREW: ${(e as Error).message}`); continue; }
  passed ? ok("C1", name) : fail("C1", `${name} returned the wrong answer`);
}

// -------------------------------------------------- C4 variance / pass^k
console.log(`\n=== C4  variance / pass^k  (${N} fresh seeds per generator) ===`);
type Gen = { name: string; run: (rng: () => number) => unknown };
const gens: Gen[] = [
  { name: "makeShared(2)", run: (r) => makeShared(2, r) },
  { name: "makeShared(3)", run: (r) => makeShared(3, r) },
  { name: "makeFill()", run: (r) => makeFill(r) },
  { name: "makeAnagram()", run: (r) => makeAnagram(r) },
];
const samples: Record<string, unknown[]> = {};
for (const g of gens) {
  const got: unknown[] = [];
  let undef = 0, threw = 0;
  for (let i = 1; i <= N; i++) {
    try {
      const p = g.run(mulberry32(i));
      if (p === undefined) undef++; else got.push(p);
    } catch { threw++; }
  }
  samples[g.name] = got;
  if (threw) fail("C4", `${g.name} THREW on ${threw}/${N} seeds`);
  if (undef) fail("C4", `${g.name} returned undefined on ${undef}/${N} seeds - a child sees a broken screen`);
  else ok("C4", `${g.name} answered on ${N}/${N} seeds`);
}
// every pool word must be scrambleable, or that word can hang the anagram round
{
  const eligible = PUZZLE_WORDS.filter((w) => w.length >= MIN_LEN && w.length <= MAX_LEN);
  const bad = eligible.filter((w) => scramble(w, mulberry32(w.length * 7 + 1)) === undefined);
  bad.length
    ? fail("C4", `${bad.length} eligible pool words cannot be scrambled: ${bad.slice(0, 5).join(", ")}`)
    : ok("C4", `all ${eligible.length} eligible pool words scramble to a non-word`);
}

// ------------------------------------------- C2 semantic correctness
console.log("\n=== C2  semantic correctness (valid-but-WRONG) ===");
{
  let multi = 0, dup = 0, giveaway = 0, missing = 0;
  for (const c of [2, 3]) {
    for (const p of samples[`makeShared(${c})`] as any[]) {
      const all = solvers(p.patterns);
      if (all.length !== 1 || all[0] !== p.answer) multi++;
      if (new Set(p.words).size !== c) dup++;
      if (!p.choices.includes(p.answer)) missing++;
      if (p.patterns.some((q: string) => solvers([q]).length < 2)) giveaway++;
    }
  }
  multi ? fail("C2", `${multi} shared-letter puzzles do not have EXACTLY ONE dictionary answer`)
        : ok("C2", "every shared-letter puzzle has exactly one dictionary answer");
  dup ? fail("C2", `${dup} shared-letter puzzles show the same word twice`)
      : ok("C2", "no shared-letter puzzle shows one word twice");
  missing ? fail("C2", `${missing} shared-letter rows do not contain the answer`)
          : ok("C2", "every shared-letter row contains its own answer");
  console.log(`  note [C2] ${giveaway} puzzles carry a one-answer line (the 'any' fallback pass, by design)`);
}
{
  let multi = 0, shortRow = 0, missing = 0, wrongGaps = 0;
  for (const p of samples["makeFill()"] as any[]) {
    const a = fillAnswers(p.pattern);
    if (a.length !== 1 || a[0] !== p.word) multi++;
    if (p.choices.length !== CHOICES) shortRow++;
    if (p.gaps.length !== GAPS) wrongGaps++;
    for (const i of p.gaps) if (!p.choices.includes(p.word[i])) missing++;
  }
  multi ? fail("C2", `${multi} fill-gaps patterns do NOT have exactly one dictionary answer`)
        : ok("C2", "every fill-gaps pattern has exactly one dictionary answer");
  missing ? fail("C2", `${missing} fill-gaps rows omit a letter the answer needs - unsolvable`)
          : ok("C2", "every fill-gaps row carries every letter its answer needs");
  (shortRow || wrongGaps)
    ? fail("C2", `${shortRow} rows are not ${CHOICES} long / ${wrongGaps} puzzles are not ${GAPS} gaps`)
    : ok("C2", `every fill-gaps row is ${CHOICES} letters over ${GAPS} gaps`);
}
{
  let notWord = 0, giveaway = 0, wrongLen = 0, notAccepted = 0;
  for (const p of samples["makeAnagram()"] as any[]) {
    if (!isWord(p.word)) notWord++;
    if (p.letters.join("") === p.word) giveaway++;
    if (letterKey(p.letters.join("")) !== letterKey(p.word)) wrongLen++;
    if (!isAnswer(p.letters, p.word)) notAccepted++;
  }
  notWord ? fail("C2", `${notWord} anagram answers are not dictionary words`)
          : ok("C2", "every anagram answer is a dictionary word");
  giveaway ? fail("C2", `${giveaway} anagrams are shown already spelled`)
           : ok("C2", "no anagram is shown already spelled");
  (wrongLen || notAccepted)
    ? fail("C2", `${wrongLen} letter-sets do not spell the answer / ${notAccepted} answers are refused by isAnswer`)
    : ok("C2", "every anagram's own answer is accepted by isAnswer");
}

// ------------------------------- C8 the safety property, generatively
console.log("\n=== C8  nothing SHOWS a word the pool does not contain ===");
{
  const shown = new Set<string>();
  for (const c of [2, 3]) for (const p of samples[`makeShared(${c})`] as any[]) for (const w of p.words) shown.add(w);
  for (const p of samples["makeFill()"] as any[]) shown.add(p.word);
  for (const p of samples["makeAnagram()"] as any[]) shown.add(p.word);
  const outside = [...shown].filter((w) => !POOL.has(CONTROL ? "definitely-not-a-word" : w));
  console.log(`  population: ${shown.size} distinct words shown across ${N * 4} generated puzzles`);
  outside.length
    ? fail("C8", `${outside.length} SHOWN words are outside puzzleWords.ts: ${outside.slice(0, 6).join(", ")}`)
    : ok("C8", `all ${shown.size} shown words come from the authored pool`);
  // Positive control on the population itself: a probe that generated nothing
  // would report a clean sweep over an empty set.
  if (shown.size < 50) fail("C8", `only ${shown.size} distinct words seen - the probe is broken, not the tree`);
}

console.log(CONTROL ? "\n(--control: the C8 check was deliberately pointed at a word the pool cannot hold)" : "");
console.log(failures ? `\n${failures} failure(s)` : `\nHOLDS - ${N} seeds per generator, nothing broke`);
process.exit(failures ? 1 : 0);
