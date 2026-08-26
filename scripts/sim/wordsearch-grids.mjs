#!/usr/bin/env node
/**
 * Derives the numbers the Word Search page quotes.
 *
 *   node scripts/sim/wordsearch-grids.mjs [--boards 4000] [--json]
 *
 * WHY THIS FILE EXISTS. `src/content/types.ts` requires every figure a page
 * quotes to name the script that reproduces it, because a statistic you cannot
 * re-derive is a fabrication with a decimal point in it. Everything the word
 * search page says with a digit in it comes from here.
 *
 * IT DRIVES THE SHIPPED RULES. `deal`, `occurrences`, `judge`, `letters` and
 * `LEVELS` are imported from `src/games/wordsearch/logic.ts` rather than
 * re-written, so these numbers describe the game a child actually opens. A
 * re-implementation would measure my reading of the code, agree with itself, and
 * be confidently wrong about a game we do not ship.
 *
 * Four questions:
 *
 *   1. HOW HARD IS IT TO PLANT A WORD? `deal` tries random positions until one
 *      fits. The attempts per word say how crowded a tier is; the re-deal and
 *      shrink columns say whether the bound on those attempts ever costs a
 *      player a word off their list. Both must stay at zero.
 *
 *   2. HOW MUCH OF THE GRID IS A WORD? Words cross, so the squares they occupy
 *      are fewer than the letters they spell. The share that is filler is what a
 *      player is actually searching through.
 *
 *   3. HOW OFTEN DOES THE FILLER SPELL A LISTED WORD BY ACCIDENT? This is the
 *      number behind the game's one design decision. `logic.ts` accepts ANY
 *      occurrence rather than matching the selection against where the word was
 *      planted, and the alternative - refuse anything that is not the planted
 *      copy - would refuse exactly these finds.
 *
 *   4. WHAT DOES THE HEBREW GRID DO DIFFERENTLY? Every horizontal placement in
 *      Hebrew runs right to left, which is the direction a Hebrew reader scans.
 *      The column counts them, and it must never read anything but 100%.
 *
 * Plus one POSITIVE CONTROL, and the whole accidental-occurrence table is worth
 * nothing without it. A detector that cannot fire reports a beautifully clean
 * sheet over a game full of the thing it was looking for, so a second copy of a
 * listed word is planted by hand into a real grid and the same `occurrences`
 * used above must find it.
 *
 * Determinism: `mulberry32` from the game's own `@shared/rng`, seeded per board,
 * so two runs of the same command produce the same table.
 */

import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ws = await import(join(ROOT, "src/games/wordsearch/logic.ts"));
const { mulberry32, seedFrom } = await import(join(ROOT, "src/shared/rng.ts"));

const { LEVELS, LEVEL_IDS, deal, judge, letters, occurrences, colOf } = ws;

const LANGS = ["he", "en", "es"];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
};
const BOARDS = arg("boards", 4000);

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const round = (n, d = 1) => Number(n.toFixed(d));

/* ------------------------------------------------------------- the measurement */

function measure(level, lang) {
  const spec = LEVELS[level];
  const cells = spec.size * spec.size;

  let attempts = 0;
  let words = 0;
  let redeals = 0;
  let shrunk = 0;
  let wordLetters = 0;
  let wordSquares = 0;
  let crossings = 0;
  let horizontal = 0;
  let horizontalWithTheReader = 0;
  let accidental = 0;
  let boardsWithAccident = 0;
  let accidentsAccepted = 0;

  for (let seed = 0; seed < BOARDS; seed++) {
    const d = deal(level, lang, mulberry32(seedFrom(`${level}-${lang}-${seed}`)));
    attempts += d.attempts;
    redeals += d.redeals;
    words += d.state.words.length;
    if (d.state.words.length < spec.words) shrunk++;

    const taken = new Set();
    for (const p of d.placements) {
      wordLetters += p.cells.length;
      for (const c of p.cells) {
        if (taken.has(c)) crossings++;
        else taken.add(c);
      }
      // ONLY `across`, and getting that wrong is worth recording: the first
      // version of this column counted `acrossBack` too and reported 50% on
      // every hard board in every language. Nothing was broken - `acrossBack`
      // runs against the reader BY DESIGN, which is what makes it the awkward
      // direction. A guard that pools a thing with its own opposite measures
      // the mixture rather than the property.
      if (p.dir === "across") {
        horizontal++;
        // "With the reader" means the letters advance the way this language is
        // read: leftwards in Hebrew, rightwards in the Latin scripts.
        const step = colOf(p.cells[1], spec.size) - colOf(p.cells[0], spec.size);
        if (step === ws.readingSense(lang)) horizontalWithTheReader++;
      }
    }
    wordSquares += taken.size;

    // The accidental occurrences: every place a listed word appears that is not
    // where the deal planted it.
    let extras = 0;
    for (let i = 0; i < d.state.words.length; i++) {
      const word = d.state.words[i];
      const planted = d.placements.find((p) => p.word === word).cells.join();
      for (const spot of occurrences(d.state, word)) {
        if (spot.join() === planted) continue;
        extras++;
        // ...and the shipped `judge` accepts it, which is the whole decision.
        if (judge(d.state, spot) === i) accidentsAccepted++;
      }
    }
    accidental += extras;
    if (extras) boardsWithAccident++;
  }

  return {
    level,
    lang,
    size: spec.size,
    listed: spec.words,
    dirs: spec.dirs.length,
    attemptsPerWord: round(attempts / words, 2),
    redealPct: round((redeals / BOARDS) * 100, 2),
    shrunk,
    meanWordLength: round(wordLetters / words, 1),
    crossingsPerBoard: round(crossings / BOARDS, 2),
    wordSharePct: round((wordSquares / BOARDS / cells) * 100, 1),
    // Printed as its own column rather than left as "100 minus the one before",
    // because it is the figure the pages quote and a number a reader has to
    // subtract for is a number that gets subtracted wrong.
    fillerSharePct: round(100 - (wordSquares / BOARDS / cells) * 100, 1),
    horizontalWithTheReaderPct: horizontal ? round((horizontalWithTheReader / horizontal) * 100, 1) : 100,
    accidentalPer10k: round((accidental / BOARDS) * 10000, 1),
    accidentalBoardsPct: round((boardsWithAccident / BOARDS) * 100, 3),
    accidentalAcceptedPct: accidental ? round((accidentsAccepted / accidental) * 100, 1) : 100,
  };
}

const rows = [];
for (const level of LEVEL_IDS) for (const lang of LANGS) rows.push(measure(level, lang));

/** Pooled over the three languages, which is what the prose quotes. */
function pooled(level) {
  const mine = rows.filter((r) => r.level === level);
  return {
    level,
    size: mine[0].size,
    listed: mine[0].listed,
    dirs: mine[0].dirs,
    attemptsPerWord: round(mean(mine.map((r) => r.attemptsPerWord)), 2),
    meanWordLength: round(mean(mine.map((r) => r.meanWordLength)), 1),
    crossingsPerBoard: round(mean(mine.map((r) => r.crossingsPerBoard)), 2),
    wordSharePct: round(mean(mine.map((r) => r.wordSharePct)), 1),
    fillerSharePct: round(mean(mine.map((r) => r.fillerSharePct)), 1),
    accidentalPer10k: round(mean(mine.map((r) => r.accidentalPer10k)), 1),
    accidentalBoardsPct: round(mean(mine.map((r) => r.accidentalBoardsPct)), 3),
  };
}
const pool = LEVEL_IDS.map(pooled);

/* ------------------------------------------------------------ the control */

/**
 * Plant a second copy of a listed word into a real grid and require the same
 * `occurrences` used above to find it.
 *
 * Without this the accidental column could be reading zero because the detector
 * is broken rather than because the situation is rare - and "rare" is exactly
 * what it reports, so the two are indistinguishable from the number alone.
 */
const control = (() => {
  const { state, placements } = deal("easy", "en", mulberry32(seedFrom("control")));
  const word = placements[0].word;
  const glyphs = letters(word);
  const taken = new Set(placements.flatMap((p) => p.cells));
  const size = state.size;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c + glyphs.length <= size; c++) {
      const run = glyphs.map((_, i) => r * size + c + i);
      if (!run.every((x) => !taken.has(x))) continue;
      const grid = state.grid.slice();
      run.forEach((x, i) => (grid[x] = glyphs[i]));
      const planted = { ...state, grid };
      const spots = occurrences(planted, word);
      return spots.length >= 2 && judge(planted, run) === planted.words.indexOf(word);
    }
  }
  return false;
})();
if (!control) throw new Error("the accidental-occurrence detector cannot fire; every reading above is worthless");

/** Hebrew must plant every horizontal word right to left. Never anything else. */
const hebrew = rows.filter((r) => r.lang === "he");
const hebrewOk = hebrew.every((r) => r.horizontalWithTheReaderPct === 100);

/* ---------------------------------------------------------------- reporting */

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ boards: BOARDS, control, hebrewOk, rows, pooled: pool }, null, 2));
} else {
  const total = BOARDS * LEVEL_IDS.length * LANGS.length;
  console.log(
    `word search: ${BOARDS.toLocaleString("en-US")} boards per level per language, ` +
      `${total.toLocaleString("en-US")} in all\n`,
  );
  console.log(
    "level     lang  grid  listed  dirs  tries/word  redeal  short  mean len  crossings  word %  RTL %  accidents/10k",
  );
  for (const r of rows) {
    console.log(
      `${r.level.padEnd(9)} ${r.lang.padEnd(4)} ${(r.size + "x" + r.size).padStart(5)} ` +
        `${String(r.listed).padStart(7)} ${String(r.dirs).padStart(5)} ` +
        `${String(r.attemptsPerWord).padStart(11)} ${String(r.redealPct + "%").padStart(7)} ` +
        `${String(r.shrunk).padStart(6)} ${String(r.meanWordLength).padStart(9)} ` +
        `${String(r.crossingsPerBoard).padStart(10)} ${String(r.wordSharePct + "%").padStart(7)} ` +
        `${String(r.horizontalWithTheReaderPct + "%").padStart(6)} ` +
        `${String(r.accidentalPer10k).padStart(14)}`,
    );
  }

  console.log("\npooled over the three languages, which is what the page quotes:\n");
  console.log("level     grid  listed  dirs  tries/word  mean len  crossings  word %  filler %  accidents/10k  boards %");
  for (const p of pool) {
    console.log(
      `${p.level.padEnd(9)} ${(p.size + "x" + p.size).padStart(5)} ${String(p.listed).padStart(7)} ` +
        `${String(p.dirs).padStart(5)} ${String(p.attemptsPerWord).padStart(11)} ` +
        `${String(p.meanWordLength).padStart(9)} ${String(p.crossingsPerBoard).padStart(10)} ` +
        `${String(p.wordSharePct + "%").padStart(7)} ${String(p.fillerSharePct + "%").padStart(9)} ` +
        `${String(p.accidentalPer10k).padStart(14)} ` +
        `${String(p.accidentalBoardsPct + "%").padStart(9)}`,
    );
  }

  const accepted = rows.every((r) => r.accidentalAcceptedPct === 100);
  console.log(
    "\nEvery listed word is on the board by construction: `deal` PLANTS each word at a\n" +
      "real position before a single filler letter is drawn, and the list it hands back is\n" +
      "the set of words it managed to place. 'short' is how many boards shipped a list\n" +
      "smaller than the tier asks for, and it must stay at 0.\n" +
      "'accidents/10k' is how often the filler spells a listed word somewhere the deal did\n" +
      "not intend, per ten thousand boards. `logic.ts` accepts any occurrence, so a player\n" +
      `who finds one is right: ${accepted ? "100%" : "NOT ALL"} of them are accepted by the shipped rules. Matching\n` +
      "the planted cells instead would refuse every one.\n" +
      `'RTL %' is the Hebrew direction guard - horizontal Hebrew words running right to\n` +
      `left, as a Hebrew reader scans. Hebrew: ${hebrewOk ? "100% on every tier" : "BROKEN"}.\n` +
      `Accidental-occurrence detector control: ${control ? "fires" : "DEAD"}.`,
  );
}
