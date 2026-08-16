import { describe, it, expect } from "vitest";
import {
  analyse,
  violations,
  proseOf,
  MIN_PARAGRAPH_SPREAD,
  MIN_SHORT_SENTENCES,
  MAX_RULE_OF_THREE,
  MIN_DIGIT_FACTS,
  VOICE,
} from "./voice";
import { PAGE_LOCALES } from "../i18n/locales";
import type { GameCopy } from "./types";

// Every matcher in voice.ts is proven twice here: once against the real shape it
// claims to reject, and once against a line that must NOT trip it. Same reason
// score-is-single-sourced.test.ts does it - a gate whose matcher silently stops
// matching keeps reporting green forever, and nobody finds out until the thing
// it guarded ships.
//
// The rule-of-three limit earned its own paranoia. The rewrite this gate was
// built for broke that limit three times while I was actively trying to follow
// it, and I could not see any of them by reading.

/** A minimal passing page, so each test can break exactly one thing. */
function copy(over: Partial<GameCopy> = {}): GameCopy {
  return {
    name: "משחק",
    metaTitle: "כותרת",
    metaDescription: "תיאור קצר של המשחק, מספיק ארוך כדי להיות שימושי בתוצאות חיפוש.",
    lede: "משחק חינם בדפדפן. שלוש רמות, בלי שעון.",
    body: [
      "שורה קצרה. זהו.",
      "פסקה ארוכה בהרבה שנועדה להרחיב את הפער בין אורכי הפסקאות, כי פסקאות באורך זהה הן הסימן החזק ביותר לטקסט שנכתב במכונה, ולכן הגייט הזה קיים מלכתחילה ובודק בדיוק את זה.",
      "פסקה באורך בינוני שמוסיפה עוד קצת אורך לטווח. בדיוק כך.",
    ],
    howToPlay: [{ title: "נוגעים", body: "הקלף מתהפך. זהו." }],
    tips: [{ title: "טיפ", body: "סרקו לפי שורות ולא בקפיצות." }],
    teaches: [{ title: "זיכרון", body: "מאמן זיכרון חזותי." }],
    ages: [{ title: "3 עד 4", body: "רמה קלה, ובפעם הראשונה יחד." }],
    accessibility: "נגיעה אחת, בלי גרירה. הקלפים לפחות 2 על 2 סנטימטרים.",
    together: [{ title: "תור ותור", body: "כל אחד הופך שניים בתורו." }],
    faq: [{ q: "חינם?", a: "כן. 21 המשחקים פתוחים מהרגע הראשון." }],
    keywords: ["זיכרון"],
    ...over,
  };
}

describe("paragraph spread - the strongest tell, and the whole reason this file exists", () => {
  it("reads 0 when every paragraph is the same length", () => {
    const even = ["aa bb cc dd", "ee ff gg hh", "ii jj kk ll"];
    expect(analyse(copy({ body: even }), "he").paragraphSpread).toBe(0);
  });

  it("clears the floor when the lengths genuinely vary", () => {
    expect(analyse(copy(), "he").paragraphSpread).toBeGreaterThanOrEqual(MIN_PARAGRAPH_SPREAD);
  });

  it("reproduces the failing draft's number", () => {
    // The real thing: 57, 53, 50, 56, 54 words measured 0.05. If this ever
    // stops reproducing, the analyser changed and the threshold is now arbitrary.
    const body = [57, 53, 50, 56, 54].map((n) => Array(n).fill("מילה").join(" "));
    expect(analyse(copy({ body }), "he").paragraphSpread).toBeCloseTo(0.045, 2);
  });
});

describe("short sentences", () => {
  it("counts fragments in the body", () => {
    expect(analyse(copy(), "he").shortSentences).toBeGreaterThanOrEqual(1);
  });

  it("counts none when every sentence is long", () => {
    const body = [
      "זו פסקה שכל המשפטים בה ארוכים למדי ואין בה אפילו שבר משפט אחד קצר וחד שיישבור את הקצב.",
    ];
    expect(analyse(copy({ body }), "he").shortSentences).toBe(0);
  });
});

describe("banned phrases", () => {
  it("catches Hebrew stock connectors", () => {
    const r = analyse(copy({ accessibility: "לסיכום, המשחק נגיש." }), "he");
    expect(r.bannedPhrases).toContain("לסיכום");
  });

  it("catches English tell vocabulary, case-insensitively", () => {
    const r = analyse(copy({ lede: "Let us Delve into this seamless experience." }), "en");
    expect(r.bannedPhrases).toEqual(expect.arrayContaining(["delve", "seamless"]));
  });

  it("does not fire on innocent prose", () => {
    expect(analyse(copy({ lede: "A free memory game. Three levels, no timer." }), "en")
      .bannedPhrases).toEqual([]);
    expect(analyse(copy(), "he").bannedPhrases).toEqual([]);
  });
});

describe("the dash family", () => {
  it("catches em, en and horizontal bar", () => {
    // Escapes, not literals: a source file that contains the character is how a
    // model learns to emit it, and this repo's ban is on the output, not the test.
    const bad = `three dashes — here – and ― there`;
    expect(analyse(copy({ accessibility: bad }), "en").dashes).toBe(3);
  });

  it("leaves the plain hyphen alone", () => {
    expect(analyse(copy({ accessibility: "one - two - three" }), "en").dashes).toBe(0);
  });
});

describe("rule of three", () => {
  it("catches the Hebrew triple negation", () => {
    const r = analyse(copy({ accessibility: "אין חשבון, אין סיסמה ואין מייל למלא." }), "he");
    expect(r.ruleOfThree).toBe(1);
  });

  it("catches the English one", () => {
    const r = analyse(copy({ accessibility: "No ads, no signup, and no download." }), "en");
    expect(r.ruleOfThree).toBe(1);
  });

  it("leaves a pair alone - two is a sentence, three is a rhythm", () => {
    expect(analyse(copy({ accessibility: "אין חשבון ואין סיסמה." }), "he").ruleOfThree).toBe(0);
    expect(analyse(copy({ accessibility: "No ads and no signup." }), "en").ruleOfThree).toBe(0);
  });
});

describe("the contrast formula", () => {
  it("catches it in Hebrew", () => {
    const r = analyse(copy({ accessibility: "זה נשמע כמו פרט קטן אבל הוא לא." }), "he");
    expect(r.contrastFormula).toBe(1);
  });

  it("catches it in English", () => {
    const r = analyse(copy({ accessibility: "It's not just a game, it's a habit." }), "en");
    expect(r.contrastFormula).toBe(1);
  });

  it("does not fire on an ordinary sentence containing 'not'", () => {
    const r = analyse(copy({ accessibility: "There is not a timer anywhere in this game." }), "en");
    expect(r.contrastFormula).toBe(0);
  });
});

describe("digit-bearing facts", () => {
  it("counts each number once, including decimals and thousands separators", () => {
    const r = analyse(copy({ accessibility: "20,000 games, 9.2 moves, floor of 6." }), "en");
    expect(r.digitFacts).toBeGreaterThanOrEqual(3);
  });

  it("counts none in prose that spells its numbers out", () => {
    const r = analyse(
      copy({
        lede: "A free game.",
        body: ["Three levels. No timer.", "Twenty thousand games were simulated for this.", "Six pairs."],
        howToPlay: [{ title: "Tap", body: "It flips." }],
        tips: [{ title: "Scan", body: "Go in rows." }],
        teaches: [{ title: "Memory", body: "It trains recall." }],
        ages: [{ title: "Three to four", body: "Easy, together." }],
        accessibility: "One tap. No dragging.",
        together: [{ title: "Turns", body: "Take two each." }],
        faq: [{ q: "Free?", a: "Yes." }],
      }),
      "en",
    );
    expect(r.digitFacts).toBe(0);
  });
});

describe("violations() reports every failure, not just the first", () => {
  it("is empty for a page that passes", () => {
    const good = copy({
      accessibility: "נגיעה אחת. הקלפים לפחות 2 על 2 סנטימטרים, ב-3 רמות, מתוך 21 משחקים.",
    });
    const r = analyse(good, "he");
    // Only the thresholds this fixture is built to clear.
    const relevant = violations(r).filter((v) => !v.startsWith(`${r.words} words`));
    expect(relevant).toEqual([]);
  });

  it("names the paragraph-spread failure with the actual lengths", () => {
    const body = ["aa bb cc dd ee", "ff gg hh ii jj", "kk ll mm nn oo"];
    const msgs = violations(analyse(copy({ body }), "he"));
    expect(msgs.some((m) => m.includes("paragraph spread"))).toBe(true);
    expect(msgs.some((m) => m.includes("5, 5, 5"))).toBe(true);
  });

  it("reports several problems at once", () => {
    const broken = copy({
      body: ["aa bb cc dd ee", "ff gg hh ii jj", "kk ll mm nn oo"],
      accessibility: `לסיכום, אין א, אין ב ואין ג — וזה נשמע כמו פרט קטן אבל הוא לא.`,
    });
    const msgs = violations(analyse(broken, "he"));
    expect(msgs.length).toBeGreaterThanOrEqual(4);
    expect(msgs.some((m) => m.includes("banned phrases"))).toBe(true);
    expect(msgs.some((m) => m.includes("dash"))).toBe(true);
    expect(msgs.some((m) => m.includes("not just"))).toBe(true);
  });
});

describe("proseOf visits every authored field", () => {
  it("misses nothing - a field it skips is a field the gate cannot see", () => {
    // Marker per field. Anything absent from the join is unguarded, which is
    // exactly how a banned phrase would ship inside an un-scanned section.
    const marked = copy({
      lede: "M_LEDE",
      body: ["M_BODY"],
      howToPlay: [{ title: "t", body: "M_HOWTO" }],
      tips: [{ title: "t", body: "M_TIPS" }],
      teaches: [{ title: "t", body: "M_TEACHES" }],
      ages: [{ title: "t", body: "M_AGES" }],
      accessibility: "M_ACCESS",
      together: [{ title: "t", body: "M_TOGETHER" }],
      faq: [{ q: "M_FAQ_Q", a: "M_FAQ_A" }],
    });
    const joined = proseOf(marked).join("\n");
    for (const marker of [
      "M_LEDE",
      "M_BODY",
      "M_HOWTO",
      "M_TIPS",
      "M_TEACHES",
      "M_AGES",
      "M_ACCESS",
      "M_TOGETHER",
      "M_FAQ_Q",
      "M_FAQ_A",
    ]) {
      expect(joined, `proseOf() does not include ${marker}`).toContain(marker);
    }
  });
});

describe("the thresholds are the ones the report argues for", () => {
  it("has not drifted from the researched values", () => {
    // If someone loosens a threshold to make a page pass, that is a decision,
    // and it should show up as a diff on this line rather than quietly in voice.ts.
    expect(MIN_PARAGRAPH_SPREAD).toBe(0.25);
    expect(MIN_SHORT_SENTENCES).toBe(3);
    expect(MAX_RULE_OF_THREE).toBe(1);
    expect(MIN_DIGIT_FACTS).toBe(4);
  });
});

describe("every language with pages has its own voice rules", () => {
  // GATE 6. The strong half of this is a TYPE - `VOICE` is
  // `Record<PageLocale, VoiceRules>`, so promoting a language before somebody
  // has written its tell vocabulary does not compile. These tests pin the part
  // a type cannot see: that the entries are real rather than placeholders
  // copied from the language next door.
  it("covers exactly the locales that have pages, no more and no fewer", () => {
    expect(Object.keys(VOICE).sort()).toEqual([...PAGE_LOCALES].sort());
  });

  it("gives every language a non-trivial banned list", () => {
    for (const locale of PAGE_LOCALES) {
      expect(VOICE[locale].banned.length, `${locale} has no banned phrases`).toBeGreaterThan(5);
    }
  });

  it("gives every language its OWN list, not a copy of the one next door", () => {
    // The realistic way a third language ships broken: `es: VOICE.en`. It
    // type-checks, it runs, and it measures Spanish prose against English tells
    // - so it passes everything and reports clean. The lists must be disjoint,
    // because a tell is a fact about one language's vocabulary.
    const locales = [...PAGE_LOCALES];
    for (let i = 0; i < locales.length; i += 1) {
      for (let j = i + 1; j < locales.length; j += 1) {
        const a = new Set(VOICE[locales[i]].banned);
        const shared = VOICE[locales[j]].banned.filter((p) => a.has(p));
        expect(shared, `${locales[i]} and ${locales[j]} share banned phrases`).toEqual([]);
      }
    }
  });

  it("actually catches its own language's tells, and only its own", () => {
    // The positive control. Without it, every assertion above is satisfied by
    // two lists of plausible strings that match nothing.
    const he = analyse(copy({ lede: "חשוב לציין שהמשחק קל." }), "he");
    const en = analyse(copy({ lede: "This game is a testament to simplicity." }), "en");
    expect(he.bannedPhrases).toContain("חשוב לציין");
    expect(en.bannedPhrases).toContain("testament to");
    // And the negative control: each language's tell is invisible to the other.
    expect(analyse(copy({ lede: "חשוב לציין שהמשחק קל." }), "en").bannedPhrases).toEqual([]);
    expect(
      analyse(copy({ lede: "This game is a testament to simplicity." }), "he").bannedPhrases,
    ).toEqual([]);
  });
});

describe("punctuation spacing is a per-language rule, not a universal one", () => {
  // The shared fixture is Hebrew and carries its own "חינם?", so every count
  // below is a DELTA against the untouched fixture rather than an absolute.
  // Hardcoding the absolute passed for the wrong reason once already: it
  // silently included the fixture's own mark, so the number agreed with a
  // miscount instead of with the rule.
  const base = analyse(copy(), "fr").tightPunctuation;

  it("flags a tight colon and a tight question mark in French", () => {
    const r = analyse(copy({ lede: "L'aveu: ce jeu ne pardonne rien. Vraiment?" }), "fr");
    expect(r.tightPunctuation - base).toBe(2);
  });

  it("accepts the no-break space", () => {
    const r = analyse(copy({ lede: "L'aveu\u00A0: ce jeu ne pardonne rien. Vraiment\u00A0?" }), "fr");
    expect(r.tightPunctuation - base).toBe(0);
  });

  it("is SILENT for languages that do not want the space", () => {
    // The half that matters. English, Hebrew and Spanish put nothing before a
    // colon, so a rule applied to every language would red three correct
    // locales in order to fix one - the "gate that reds correct pages" failure
    // this session already hit three times in the French glossary alone.
    for (const locale of ["en", "he", "es"] as const) {
      expect(
        analyse(copy({ lede: "One thing: this is correct. Right?" }), locale).tightPunctuation,
        `${locale} must not be held to French spacing`,
      ).toBe(0);
    }
  });
});
