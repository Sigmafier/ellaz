import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT, CONTENT_IDS } from "./index";
import { analyse, violations, proseOf } from "./voice";
import { CATALOG } from "../portal/catalog";
import type { GameCopy, Locale } from "./types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCALES: Locale[] = ["he", "en"];
const PAGES = CONTENT_IDS.flatMap((id) => LOCALES.map((l) => [id, l, CONTENT[id][l]] as const));

describe("the content roster lines up with the catalog", () => {
  it("every page has a game", () => {
    const known = new Set(CATALOG.map((e) => e.meta.id));
    const orphans = CONTENT_IDS.filter((id) => !known.has(id));
    expect(orphans, `content with no game in the catalog: ${orphans.join(", ")}`).toEqual([]);
  });

  it("scanned something", () => {
    // A zero-page run satisfies every assertion below forever, which is the
    // same false green assert-first-visit.mjs refuses a zero-entry manifest for.
    expect(PAGES.length).toBeGreaterThan(0);
  });

  // ARMED 2026-08-03, once all 21 were written. Until then it was a todo,
  // because three pilots shipped first so the operator could correct the voice
  // while it cost three pages instead of twenty-one.
  //
  // From here this is the gate that makes a new game impossible to ship
  // wordless: `catalog.test.ts` ratchets the game count up, and this fails the
  // moment that count exceeds the number of pages. The two together mean adding
  // a game to the catalog without adding its content is a red build, which is
  // the whole point of step 6 in the add-a-game recipe.
  it("every catalogued game has content", () => {
    const written = new Set(CONTENT_IDS);
    const missing = CATALOG.map((e) => e.meta.id).filter((id) => !written.has(id));
    expect(missing, `games in the catalog with no page: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("the voice gate, on every real page", () => {
  it.each(PAGES)("%s/%s reads like a person", (id, locale, copy) => {
    const report = analyse(copy, locale);
    const failures = violations(report);
    expect(
      failures,
      `${id}/${locale} fails the voice gate:\n  ${failures.join("\n  ")}\n\n` +
        `measured: ${JSON.stringify(report, null, 2)}\n\n` +
        `The gate cannot see the three things that matter most - whether the ` +
        `admission is true, whether a statistic was derived, and whether it sounds ` +
        `like us. Those are the operator's read. This only catches what a human ` +
        `read reliably misses.`,
    ).toEqual([]);
  });
});

describe("the gate can actually fail - positive control", () => {
  // Both real pages passed on the first run, which is exactly the shape of a
  // check that is silently doing nothing. So: reconstruct the draft this gate
  // was built to reject and require it to fail. If this test ever passes
  // clean, the gate has stopped measuring and every green above is worthless.
  //
  // The real numbers, from the audit that started this: five body paragraphs of
  // 57, 53, 50, 56 and 54 words, three triple-negations, two contrast
  // formulas, zero digits.
  it("rejects the draft that started all this", () => {
    const filler = (n: number) => Array(n).fill("מילה").join(" ");
    const oldDraft: GameCopy = {
      ...CONTENT.memory.he,
      body: [57, 53, 50, 56, 54].map(filler),
      accessibility:
        "אין הבהובים מהירים, אין שעון שלוחץ ואין צליל שהמשחק תלוי בו. " +
        "זה נשמע כמו פרט טכני קטן אבל הוא לא.",
      faq: [
        { q: "חינם?", a: "אין תשלום, אין רכישות ואין גרסה מורחבת." },
        { q: "פרסומות?", a: "לא באנרים, לא סרטונים ולא פרסומות בין שלבים." },
        ...CONTENT.memory.he.faq.slice(2),
      ],
    };

    const failures = violations(analyse(oldDraft, "he"));
    expect(failures.some((f) => f.includes("paragraph spread"))).toBe(true);
    expect(failures.some((f) => f.includes("rule-of-three"))).toBe(true);
    expect(failures.some((f) => f.includes("not just"))).toBe(true);
  });

  it("catches prose that spells every number out", () => {
    // Deliberately a SEPARATE fixture. The one above inherits the real tips and
    // FAQ, which are full of digits, so asserting the digit rule there would
    // have been asserting something the fixture does not reproduce. It failed,
    // which is the control working on itself.
    const strip = (s: string) => s.replace(/\d[\d.,]*/g, "כמה");
    const spelledOut: GameCopy = {
      ...CONTENT.memory.he,
      lede: strip(CONTENT.memory.he.lede),
      body: CONTENT.memory.he.body.map(strip),
      howToPlay: CONTENT.memory.he.howToPlay.map((s) => ({ ...s, body: strip(s.body) })),
      tips: CONTENT.memory.he.tips.map((s) => ({ ...s, body: strip(s.body) })),
      teaches: CONTENT.memory.he.teaches.map((s) => ({ ...s, body: strip(s.body) })),
      ages: CONTENT.memory.he.ages.map((s) => ({ ...s, body: strip(s.body) })),
      accessibility: strip(CONTENT.memory.he.accessibility),
      together: CONTENT.memory.he.together.map((s) => ({ ...s, body: strip(s.body) })),
      faq: CONTENT.memory.he.faq.map((f) => ({ q: strip(f.q), a: strip(f.a) })),
    };

    const report = analyse(spelledOut, "he");
    expect(report.digitFacts).toBe(0);
    expect(violations(report).some((f) => f.includes("digit-bearing"))).toBe(true);
  });
});

describe("every quoted statistic names a script that produces it", () => {
  it.each(CONTENT_IDS)("%s provenance sources all exist on disk", (id) => {
    const rows = CONTENT[id].provenance;
    expect(rows.length, `${id} quotes numbers but declares no provenance`).toBeGreaterThan(0);

    const missing = rows.filter((p) => !existsSync(join(ROOT, p.source)));
    expect(
      missing.map((p) => `${p.claim} -> ${p.source}`),
      `These statistics point at files that do not exist, so nothing reproduces them. ` +
        `That is how "ten pairs in under twenty-eight moves" got into the first draft.`,
    ).toEqual([]);
  });
});

describe("required shape", () => {
  it.each(PAGES)("%s/%s fills every field", (_id, _locale, copy: GameCopy) => {
    expect(copy.metaTitle.length, "metaTitle over 60 chars gets truncated in results").toBeLessThanOrEqual(60);
    expect(copy.metaDescription.length).toBeGreaterThanOrEqual(50);
    expect(copy.metaDescription.length).toBeLessThanOrEqual(160);
    expect(copy.body.length, "3-6 body paragraphs").toBeGreaterThanOrEqual(3);
    expect(copy.body.length).toBeLessThanOrEqual(6);
    expect(copy.howToPlay.length).toBeGreaterThanOrEqual(3);
    expect(copy.tips.length, "tips is where the only genuinely original writing lives").toBeGreaterThanOrEqual(3);
    expect(copy.teaches.length).toBeGreaterThanOrEqual(3);
    expect(copy.ages.length).toBeGreaterThanOrEqual(3);
    expect(copy.together.length).toBeGreaterThanOrEqual(3);
    expect(copy.faq.length, "6+ FAQ entries, phrased as real queries").toBeGreaterThanOrEqual(6);
    expect(copy.keywords.length).toBeGreaterThanOrEqual(3);
    expect(copy.accessibility.trim().length).toBeGreaterThan(80);
  });

  it.each(PAGES)("%s/%s has no placeholder text", (id, locale, copy) => {
    const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|xxx+|placeholder)\b/i;
    const hits = proseOf(copy).filter((s) => PLACEHOLDER.test(s));
    expect(hits, `placeholder text left in ${id}/${locale}`).toEqual([]);
  });

  it("the placeholder matcher fires on the shape it claims to catch", () => {
    const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|xxx+|placeholder)\b/i;
    expect(PLACEHOLDER.test("TODO: write this bit")).toBe(true);
    expect(PLACEHOLDER.test("Lorem ipsum dolor")).toBe(true);
    expect(PLACEHOLDER.test("A free memory game in your browser.")).toBe(false);
  });
});

/* ------------------------------------------------------------------------- *
 * Cross-page duplication.
 *
 * Twenty-one pages can each pass every count above while being eighty percent
 * the same page - which reads as thin, templated content to a search engine and
 * gives an answer engine nothing to prefer between them. Word counts cannot see
 * that. Overlap can.
 * ------------------------------------------------------------------------- */

const MAX_SHINGLE_OVERLAP = 0.35;

/** Normalised 8-gram set. Punctuation and case dropped so near-copies collide. */
function shingles(text: string, n = 8): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const s of a) if (b.has(s)) shared++;
  return shared / (a.size + b.size - shared);
}

describe("no two pages in a language are the same page", () => {
  it("the overlap measure separates a near-copy from unrelated prose", () => {
    // Proven before it is trusted. A near-copy of the real lede must score high;
    // two genuinely different paragraphs must score low. Without this the check
    // could be measuring nothing and would pass every roster forever.
    const base =
      "a free memory game that runs in your browser flip two cards find a pair " +
      "finish in as few moves as you can three levels no timer and no way to lose";
    const nearCopy = base.replace("memory", "matching").replace("cards", "tiles");
    const unrelated =
      "sudoku fills a grid so that every row column and box holds each symbol " +
      "exactly once there is a clock and the record is the time you took";

    expect(jaccard(shingles(base), shingles(nearCopy))).toBeGreaterThan(MAX_SHINGLE_OVERLAP);
    expect(jaccard(shingles(base), shingles(unrelated))).toBeLessThan(MAX_SHINGLE_OVERLAP);
  });

  it.each(LOCALES)("%s pages are distinct from each other", (locale) => {
    const ids = CONTENT_IDS;
    if (ids.length < 2) {
      // One page cannot duplicate another. Stated rather than silently skipped,
      // so nobody reads a green tick as "checked 21 pages".
      expect(ids.length).toBe(1);
      return;
    }
    const tooSimilar: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = shingles(proseOf(CONTENT[ids[i]][locale]).join(" "));
        const b = shingles(proseOf(CONTENT[ids[j]][locale]).join(" "));
        const score = jaccard(a, b);
        if (score > MAX_SHINGLE_OVERLAP)
          tooSimilar.push(`${ids[i]} vs ${ids[j]} = ${score.toFixed(2)}`);
      }
    }
    expect(tooSimilar, `these ${locale} pages are mostly the same page`).toEqual([]);
  });
});

describe("the two languages are written, not translated", () => {
  // No test can prove a page was written natively. What it CAN prove is that
  // neither locale inherited the other's shape, which is the cheapest symptom of
  // a translation: paragraph-for-paragraph, sentence-for-sentence parity.
  // A real symptom check, not a real translation detector - the operator's read
  // is still the thing that decides.
  it.each(CONTENT_IDS)("%s does not mirror its other language paragraph for paragraph", (id) => {
    const he = CONTENT[id].he.body.map((p) => p.trim().split(/\s+/).length);
    const en = CONTENT[id].en.body.map((p) => p.trim().split(/\s+/).length);
    const identicalShape =
      he.length === en.length && he.every((n, i) => Math.abs(n - en[i]) <= 1);
    expect(
      identicalShape,
      `${id}: both languages have the same paragraph lengths to within a word, which is ` +
        `what a translation looks like. Write the second one, do not convert the first.`,
    ).toBe(false);
  });
});
