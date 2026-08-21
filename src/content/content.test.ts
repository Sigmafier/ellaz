import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONTENT, CONTENT_IDS } from "./index";
import { SITE, homeCopy } from "./site";
import { CATEGORY_CHROME, CATEGORY_CONTENT } from "./categories";
import { analyse, violations, proseOf } from "./voice";
import { FULL_CATALOG } from "../testing/fullCatalog";
import type { GameCopy, Locale } from "./types";
import { PAGE_LOCALES } from "../i18n/locales";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/**
 * Every language that HAS pages, read off the one list rather than written out.
 *
 * It was the literal `["he", "en"]`, which is the defect this whole lane keeps
 * finding one layer at a time: promoting a language would have run ZERO of its
 * pages through the voice gate, reported a clean sweep, and shipped prose
 * nothing had measured. Same shape as the four `locale === "he" ? … : …`
 * ternaries in `voice.ts` and the hardcoded `en/**` in `globIgnores` - correct
 * for the two languages that existed, silently wrong for the third.
 */
const LOCALES: Locale[] = [...PAGE_LOCALES];
const PAGES = CONTENT_IDS.flatMap((id) => LOCALES.map((l) => [id, l, CONTENT[id].copy[l]] as const));

describe("the content roster lines up with the catalog", () => {
  it("every page has a game", () => {
    const known = new Set(FULL_CATALOG.map((e) => e.meta.id));
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
    const missing = FULL_CATALOG.map((e) => e.meta.id).filter((id) => !written.has(id));
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
      ...CONTENT.memory.copy.he,
      body: [57, 53, 50, 56, 54].map(filler),
      accessibility:
        "אין הבהובים מהירים, אין שעון שלוחץ ואין צליל שהמשחק תלוי בו. " +
        "זה נשמע כמו פרט טכני קטן אבל הוא לא.",
      faq: [
        { q: "חינם?", a: "אין תשלום, אין רכישות ואין גרסה מורחבת." },
        { q: "פרסומות?", a: "לא באנרים, לא סרטונים ולא פרסומות בין שלבים." },
        ...CONTENT.memory.copy.he.faq.slice(2),
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
      ...CONTENT.memory.copy.he,
      lede: strip(CONTENT.memory.copy.he.lede),
      body: CONTENT.memory.copy.he.body.map(strip),
      howToPlay: CONTENT.memory.copy.he.howToPlay.map((s) => ({ ...s, body: strip(s.body) })),
      tips: CONTENT.memory.copy.he.tips.map((s) => ({ ...s, body: strip(s.body) })),
      teaches: CONTENT.memory.copy.he.teaches.map((s) => ({ ...s, body: strip(s.body) })),
      ages: CONTENT.memory.copy.he.ages.map((s) => ({ ...s, body: strip(s.body) })),
      accessibility: strip(CONTENT.memory.copy.he.accessibility),
      together: CONTENT.memory.copy.he.together.map((s) => ({ ...s, body: strip(s.body) })),
      faq: CONTENT.memory.copy.he.faq.map((f) => ({ q: strip(f.q), a: strip(f.a) })),
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

  /**
   * Leftover scaffolding, in two matchers rather than one, and the split is a
   * bug fix rather than tidiness.
   *
   * It used to be a single case-INSENSITIVE regex, which was correct for the
   * two languages it was written against and wrong the day a third arrived:
   * `/todo/i` matches the ordinary Spanish word **todo**, meaning "all" or
   * "everything", which turns up in perfectly good prose several times a page.
   * On the first Spanish run it flagged 17 of 23 pages, including sentences
   * like "queda todo guardado en el aparato".
   *
   * The markers below are written in CAPS by every convention that produces
   * them, so matching them case-sensitively keeps the catch and drops the
   * collision. `lorem ipsum` and `placeholder` stay insensitive because they
   * are phrases nobody writes by accident in any of our languages.
   *
   * Worth noticing which way this one failed. A false POSITIVE is loud and
   * costs an afternoon; the same mistake pointed the other way - a gate that
   * silently stops matching in a new language - is the shape that ships.
   */
  const SCAFFOLD_CAPS = /\b(TODO|TBD|FIXME|XXX+)\b/;
  const SCAFFOLD_PROSE = /\b(lorem ipsum|placeholder)\b/i;
  const isScaffold = (s: string): boolean => SCAFFOLD_CAPS.test(s) || SCAFFOLD_PROSE.test(s);

  it.each(PAGES)("%s/%s has no placeholder text", (id, locale, copy) => {
    const hits = proseOf(copy).filter(isScaffold);
    expect(hits, `placeholder text left in ${id}/${locale}`).toEqual([]);
  });

  it("the placeholder matcher fires on the shape it claims to catch", () => {
    expect(isScaffold("TODO: write this bit")).toBe(true);
    expect(isScaffold("TBD before we ship")).toBe(true);
    expect(isScaffold("Lorem ipsum dolor")).toBe(true);
    expect(isScaffold("A free memory game in your browser.")).toBe(false);
    // ...and does NOT fire on the Spanish word that broke the old one.
    expect(isScaffold("Queda todo guardado en el aparato.")).toBe(false);
    expect(isScaffold("Todo se guarda en el propio aparato.")).toBe(false);
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
        const a = shingles(proseOf(CONTENT[ids[i]].copy[locale]).join(" "));
        const b = shingles(proseOf(CONTENT[ids[j]].copy[locale]).join(" "));
        const score = jaccard(a, b);
        if (score > MAX_SHINGLE_OVERLAP)
          tooSimilar.push(`${ids[i]} vs ${ids[j]} = ${score.toFixed(2)}`);
      }
    }
    expect(tooSimilar, `these ${locale} pages are mostly the same page`).toEqual([]);
  });
});

describe("code supplies the game count, an author never types it", () => {
  // 2026-08-11. The Hebrew home said "עשרים ואחד משחקים" and the English said
  // "Twenty-one free games" while the roster held 22 - and the live `ItemList`
  // said `numberOfItems: 22` on the very same page. Nothing failed, because a
  // number written as a word is just prose to every gate in this repo.
  //
  // Ironically site.ts's own header comment warns about exactly this drift.
  //
  // So the count is now a FACT the emitter fills, per the standing rule that
  // authors write prose and code supplies facts. This test is the class fix:
  // it does not check that one string says 22, it forbids ANY authored site
  // copy from stating a roster count at all.

  // The digit branch is bounded to 1-3 digits with no comma or digit on either
  // side, because an unbounded `\d+` matches the "000" in "we ran 20,000 games"
  // - a simulation count, not a roster count. The control below plants exactly
  // that string, and it is what caught this: the first version of this regex
  // flagged it, which would have made the whole check un-shippable.
  /**
   * A number - as digits or as a word in any language that has pages - right
   * before the word "games".
   *
   * The Spanish half was added 2026-08-12 and it was not cosmetic: without
   * `juegos` the gate could not see a Spanish roster claim at all, so 23 new
   * pages were outside a check that reported green over them. Its own control
   * is what caught that, which is the argument for writing one per language
   * rather than one per gate.
   *
   * Note `veinti…` is a single word in Spanish (veintitrés, not veinte y tres),
   * so it needs its own alternative rather than the connector shape Hebrew and
   * English share.
   */
  const COUNT_CLAIM = new RegExp(
    "(?:(?<![\\d,.])\\d{1,3}(?![\\d,.])|" +
      "(?:twenty|thirty|forty)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|" +
      "(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)|" +
      "(?:עשרים|שלושים|ארבעים)(?: ו?(?:אחד|שניים|שלושה|ארבעה|חמישה|שישה|שבעה|שמונה|תשעה))?|" +
      "(?:עשרה|אחת עשרה|שתים עשרה)|" +
      "veinti(?:ún|uno|dós|dos|trés|tres|cuatro|cinco|séis|seis|siete|ocho|nueve)|" +
      "(?:veinte|treinta|cuarenta)(?: y (?:uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?|" +
      "(?:diez|once|doce|trece|catorce|quince|diecis[éeí]is|diecisiete|dieciocho|diecinueve)" +
      ")\\s+(?:free\\s+|juegos\\s+)?(?:games|משחקים|juegos)",
    "i",
  );

  /** Every authored string in SITE, both locales, with a path for the failure message. */
  const siteStrings = (): Array<readonly [string, string]> => {
    const out: Array<readonly [string, string]> = [];
    const walk = (node: unknown, path: string): void => {
      if (typeof node === "string") out.push([path, node] as const);
      else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (node && typeof node === "object")
        for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    };
    for (const locale of LOCALES) {
      walk(SITE[locale], locale);
      // The category pages are in this population too. They are prose about
      // groups of games, so a roster-count claim or a banned phrase is exactly
      // as wrong there as it is anywhere else - and a walk that reads `SITE`
      // and stops is the shape that reported a clean sweep over 23 unmeasured
      // Spanish pages. The full voice gate runs on them in
      // `categories.test.ts`; this walk is what puts them inside the
      // count-claim and tell-vocabulary checks below.
      walk(CATEGORY_CONTENT[locale], `${locale}.categories`);
      walk(CATEGORY_CHROME[locale], `${locale}.categoryChrome`);
    }
    return out;
  };

  it("scanned something", () => {
    // Same reason as above: a zero-string walk satisfies every assertion below.
    expect(siteStrings().length).toBeGreaterThan(20);
  });

  it("the walker can actually see a planted claim", () => {
    // The positive control. Without this the regex could be broken and every
    // assertion under it would pass over an empty match set forever.
    expect(COUNT_CLAIM.test("Twenty-one free games that run in the browser")).toBe(true);
    expect(COUNT_CLAIM.test("עשרים ואחד משחקים חינמיים בעברית")).toBe(true);
    expect(COUNT_CLAIM.test("22 games")).toBe(true);
    // Spanish, digits and words. Without these the gate was blind to 23 pages.
    expect(COUNT_CLAIM.test("Los 23 juegos de la web")).toBe(true);
    expect(COUNT_CLAIM.test("veintitrés juegos gratis en el navegador")).toBe(true);
    // ...and does not fire on the things that are not roster counts.
    expect(COUNT_CLAIM.test("There are memory games, thinking games and speed games")).toBe(false);
    expect(COUNT_CLAIM.test("we ran 20,000 games on our own boards")).toBe(false);
  });

  it("no authored site copy states how many games there are", () => {
    const claims = siteStrings()
      .filter(([, text]) => COUNT_CLAIM.test(text))
      .map(([path, text]) => `${path}: "${text.slice(0, 70)}…"`);
    expect(
      claims,
      "these strings hardcode the roster size. Use the {games} token instead - " +
        "homeCopy() fills it from the catalog, so it cannot go stale.",
    ).toEqual([]);
  });

  /**
   * The same claim, on the GAME pages - the population the check above could
   * not see, and the reason it needs its own test rather than a wider walk.
   *
   * Written 2026-08-12, and it had three live offenders the moment it ran:
   * memory, sudoku and snake each answered "is it free?" with "All 22 games on
   * the site are open from the first second" while the roster held 23. Every
   * gate here was green. `siteStrings()` walks `SITE`, so 46 published
   * documents sat outside its population entirely - which is the question to
   * ask of any gate before trusting its silence: not "is the logic right" but
   * "which pages are EXCLUDED from this".
   *
   * There is no `{games}` token to reach for here, because nothing fills one
   * on a game page - `homeCopy()` is the only filler and it only ever sees
   * `SITE`. So the fix is the one that needs no machinery: an FAQ answers
   * "every game on the site", which is true at any roster size and needs
   * nobody to keep it true.
   */
  /**
   * The same claim on a GAME page needs a tighter matcher than on the home
   * page, and finding out why is the useful part.
   *
   * `COUNT_CLAIM` alone is right for `SITE`, whose copy is all about the site.
   * Pointed at `CONTENT` it flagged three pages and only ONE was a defect:
   * blocks says "300 games per level" about a SIMULATION, and tictactoe says
   * "out of ten games" about games PLAYED. Both are exactly the specifics this
   * repo asks authors for.
   *
   * So the population changed and the matcher's required precision changed with
   * it. A roster claim is always a count of games ON THE SITE, so that is what
   * gets matched - the count, then a reference to the site within a short
   * window. A simulation count never carries one.
   */
  const SITE_REF = /(?:on|of) the site|באתר|de la (?:web|página)/i;

  it("and neither does any game page, in any language", () => {
    const claims: string[] = [];
    for (const id of CONTENT_IDS)
      for (const locale of LOCALES)
        for (const text of proseOf(CONTENT[id].copy[locale])) {
          const m = COUNT_CLAIM.exec(text);
          if (m && SITE_REF.test(text.slice(m.index, m.index + m[0].length + 30)))
            claims.push(`${id}/${locale}: "${text.slice(0, 70)}…"`);
        }
    expect(
      claims,
      "these game pages state how many games the site has, and the roster grows. " +
        'Say "every game on the site" - true at any size, and nothing has to fill it.',
    ).toEqual([]);
  });

  it("the game-page matcher separates a roster claim from a simulation count", () => {
    // The control, and it is the whole reason the site reference is there.
    const fires = (t: string): boolean => {
      const m = COUNT_CLAIM.exec(t);
      return !!m && SITE_REF.test(t.slice(m.index, m.index + m[0].length + 30));
    };
    expect(fires("All 22 games on the site are open from the first second.")).toBe(true);
    expect(fires("יש 22 משחקים באתר, וכולם פתוחים מיד.")).toBe(true);
    expect(fires("Los 23 juegos de la web están abiertos.")).toBe(true);
    // ...and not on the specifics the pages are supposed to carry.
    expect(fires("A bot ran 300 games per level and survived every one.")).toBe(false);
    expect(fires("counting who drew more out of ten games")).toBe(false);
  });

  it("homeCopy fills {games} with the real catalog length", () => {
    for (const locale of LOCALES) {
      const filled = homeCopy(locale, FULL_CATALOG.length);
      expect(filled.description).toContain(String(FULL_CATALOG.length));
      expect(filled.description).not.toContain("{games}");
      expect(filled.title).not.toContain("{games}");
    }
  });

  it("leaves no unfilled token anywhere it is used", () => {
    // A token nobody consumes ships "{games} free games" to a search result.
    //
    // The exemption is by FILLER, not by path, and each entry names the
    // function that does the filling - so adding a token means finding
    // something to fill it, rather than adding a word to a skip list. The
    // fillers themselves are asserted where they live: `homeCopy` two tests
    // above, `headingFor` in `src/build/build.test.ts`.
    const FILLED: Array<[string, string]> = [
      ["homePage", "homeCopy() in src/content/site.ts"],
      ["gameHeading", "headingFor() in src/build/gamePage.ts"],
      // Asserted in `categories.test.ts` § "fills the token, everywhere it
      // appears", which walks every field of every category in every language
      // and carries its own control - a filler that quietly stopped covering
      // one field would be invisible here, because most fields never carry a
      // token in the first place.
      [".categories.", "categoryCopy() in src/content/categories.ts"],
    ];
    const leftover = siteStrings()
      .filter(([, text]) => text.includes("{"))
      .filter(([path]) => !FILLED.some(([key]) => path.includes(key)))
      .map(([path]) => path);
    expect(leftover, "these tokens have no filler and would ship raw").toEqual([]);
  });
});

describe("the two languages are written, not translated", () => {
  // No test can prove a page was written natively. What it CAN prove is that
  // neither locale inherited the other's shape, which is the cheapest symptom of
  // a translation: paragraph-for-paragraph, sentence-for-sentence parity.
  // A real symptom check, not a real translation detector - the operator's read
  // is still the thing that decides.
  it.each(CONTENT_IDS)("%s does not mirror its other language paragraph for paragraph", (id) => {
    const he = CONTENT[id].copy.he.body.map((p) => p.trim().split(/\s+/).length);
    const en = CONTENT[id].copy.en.body.map((p) => p.trim().split(/\s+/).length);
    const identicalShape =
      he.length === en.length && he.every((n, i) => Math.abs(n - en[i]) <= 1);
    expect(
      identicalShape,
      `${id}: both languages have the same paragraph lengths to within a word, which is ` +
        `what a translation looks like. Write the second one, do not convert the first.`,
    ).toBe(false);
  });
});
