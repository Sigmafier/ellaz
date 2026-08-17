import { describe, it, expect } from "vitest";
import { mulberry32 } from "@shared/rng";
import { SHIPPED_LOCALES, type ShippedLocale } from "@i18n/locales";
import { WORDS } from "./words";
import {
  ALPHABETS,
  LEVELS,
  MIN_LETTERS,
  SPELLING_LETTERS,
  baseLetter,
  buildPuzzle,
  contentLangOptions,
  hint,
  isComplete,
  isMilestoneRound,
  lettersOf,
  levelById,
  nextSlot,
  place,
  poolFor,
  refillBag,
  startPuzzle,
  usedTileIds,
  type Level,
  type SpellState,
} from "./logic";

const rng = () => mulberry32(20260817);
const LANGS = SHIPPED_LOCALES;
const hard = levelById("hard");

/** Play a whole word correctly, tapping the right tile for each slot in turn. */
function solve(state: SpellState): SpellState {
  let s = state;
  let guard = 0;
  while (!isComplete(s) && guard++ < 50) {
    const slot = nextSlot(s);
    const spent = usedTileIds(s);
    const tile = s.puzzle.tray.find((t) => t.letter === s.puzzle.letters[slot] && !spent.has(t.id));
    if (!tile) throw new Error(`no tile for ${s.puzzle.letters[slot]} in ${s.puzzle.word}`);
    s = place(s, tile.id).state;
  }
  return s;
}

describe("the word list", () => {
  // The tray is built from the language's own alphabet, so a word carrying a
  // letter that alphabet has never heard of is a word no child can finish. It
  // renders perfectly and is simply unsolvable, which is why this is a build
  // gate rather than a review note. `león` and `ג'ירפה` both fail it.
  it("every word is spellable from its own alphabet", () => {
    for (const lang of LANGS) {
      for (const item of WORDS) {
        const unspellable = lettersOf(item[lang], lang).filter(
          (l) => !SPELLING_LETTERS[lang].has(l),
        );
        expect(unspellable, `${item[lang]} (${lang}) needs tiles for ${unspellable.join(", ")}`)
          .toEqual([]);
      }
    }
  });

  it("no word carries a space, and no word is empty", () => {
    for (const lang of LANGS) {
      for (const item of WORDS) {
        expect(item[lang].trim(), `${item.emoji} has no ${lang} word`).not.toBe("");
        expect(item[lang], `${item[lang]} (${lang}) has a space and cannot be one row of tiles`)
          .not.toMatch(/\s/);
      }
    }
  });

  it("every picture is distinct", () => {
    expect(new Set(WORDS.map((w) => w.emoji)).size).toBe(WORDS.length);
  });

  // Deliberately checked per LANGUAGE. The whole point of filtering the pool by
  // the length of the word in the chosen language is that difficulty means the
  // same thing in all three, and the way that fails is a language quietly
  // running out of words at one level.
  it("every level has a real pool in every language", () => {
    for (const lang of LANGS) {
      for (const level of LEVELS) {
        expect(
          poolFor(level, lang).length,
          `${lang}/${level.id} has too few words to play`,
        ).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it("a level's pool contains every shorter level's pool", () => {
    for (const lang of LANGS) {
      const easy = new Set(poolFor(levelById("easy"), lang).map((w) => w.emoji));
      const medium = new Set(poolFor(levelById("medium"), lang).map((w) => w.emoji));
      const all = new Set(poolFor(hard, lang).map((w) => w.emoji));
      for (const e of easy) expect(medium.has(e), `${e} left the medium pool`).toBe(true);
      for (const m of medium) expect(all.has(m), `${m} left the hard pool`).toBe(true);
      expect(all.size).toBeGreaterThan(easy.size);
    }
  });

  // The two-letter Hebrew words stay in `words.ts` as honest singulars and are
  // filtered out HERE. If this ever passes vacuously - because somebody
  // pluralised them to dodge the floor - the control below fails.
  it("no pool offers a word shorter than the floor", () => {
    for (const lang of LANGS) {
      for (const item of poolFor(hard, lang)) {
        expect(lettersOf(item[lang], lang).length).toBeGreaterThanOrEqual(MIN_LETTERS);
      }
    }
  });

  it("and the list really does contain words the floor excludes", () => {
    const short = WORDS.filter((w) => lettersOf(w.he, "he").length < MIN_LETTERS);
    expect(short.length, "the floor is only meaningful if something is under it")
      .toBeGreaterThan(0);
    expect(poolFor(hard, "he").map((w) => w.emoji)).not.toContain(short[0].emoji);
    // ...and the same pictures are still playable in the other languages.
    expect(poolFor(hard, "en").map((w) => w.emoji)).toContain(short[0].emoji);
  });
});

describe("building a puzzle", () => {
  it("the tray holds every letter of the word, in the right quantity", () => {
    for (const lang of LANGS) {
      for (const item of poolFor(hard, lang)) {
        const p = buildPuzzle(lang, item, levelById("easy"), rng());
        const count = (list: string[]) =>
          list.reduce<Record<string, number>>((a, l) => ({ ...a, [l]: (a[l] ?? 0) + 1 }), {});
        expect(count(p.tray.map((t) => t.letter)), `${item[lang]} (${lang})`)
          .toEqual(count(p.letters));
      }
    }
  });

  it("easy adds no decoys, so the tray is pure ordering", () => {
    const p = buildPuzzle("en", WORDS[0], levelById("easy"), rng());
    expect(p.tray.length).toBe(p.letters.length);
  });

  it("harder levels add exactly their decoy count", () => {
    for (const level of LEVELS) {
      const p = buildPuzzle("en", WORDS[0], level, rng());
      expect(p.tray.length, level.id).toBe(p.letters.length + level.decoys);
    }
  });

  // A decoy that duplicates a letter the word needs is PLACEABLE, so it grows
  // the tray without making the puzzle any harder. Compared by base form, so a
  // Hebrew word ending in a final never draws its own base letter as a decoy.
  it("no decoy is a letter the word actually uses", () => {
    for (const lang of LANGS) {
      for (const item of poolFor(hard, lang)) {
        const p = buildPuzzle(lang, item, hard, rng());
        const needed = p.letters.map(baseLetter);
        const extra = [...p.tray.map((t) => t.letter)];
        for (const l of p.letters) extra.splice(extra.indexOf(l), 1);
        for (const d of extra) {
          expect(needed, `${d} is a decoy in ${item[lang]}`).not.toContain(baseLetter(d));
        }
      }
    }
  });

  it("every tile has its own id, even when the letter repeats", () => {
    const banana = WORDS.find((w) => w.en === "banana");
    if (!banana) throw new Error("the fixture word left the list");
    const p = buildPuzzle("en", banana, hard, rng());
    expect(p.letters.filter((l) => l === "A").length).toBe(3);
    expect(new Set(p.tray.map((t) => t.id)).size).toBe(p.tray.length);
  });

  it("hebrew keeps its letters as written and latin is uppercased", () => {
    expect(lettersOf("לחם", "he")).toEqual(["ל", "ח", "ם"]);
    expect(lettersOf("dog", "en")).toEqual(["D", "O", "G"]);
  });

  it("a seed reproduces the same tray", () => {
    const a = buildPuzzle("en", WORDS[0], hard, mulberry32(7));
    const b = buildPuzzle("en", WORDS[0], hard, mulberry32(7));
    expect(a.tray).toEqual(b.tray);
  });
});

describe("placing a tile", () => {
  const puzzleFor = (word: string, level: Level = hard) => {
    const item = WORDS.find((w) => w.en === word);
    if (!item) throw new Error(`${word} left the list`);
    return buildPuzzle("en", item, level, rng());
  };

  it("the right letter fills the next slot", () => {
    const s = startPuzzle(puzzleFor("dog"));
    const d = s.puzzle.tray.find((t) => t.letter === "D")!;
    const r = place(s, d.id);
    expect(r.outcome).toBe("placed");
    expect(r.slot).toBe(0);
    expect(r.state.slots[0]).toEqual({ tileId: d.id, hinted: false });
    expect(r.complete).toBe(false);
  });

  it("a wrong letter is never placed - it is ruled out", () => {
    const s = startPuzzle(puzzleFor("dog"));
    const g = s.puzzle.tray.find((t) => t.letter === "G")!;
    const r = place(s, g.id);
    expect(r.outcome).toBe("wrong");
    expect(r.state.slots.every((x) => x === null)).toBe(true);
    expect(r.state.ruledOut).toEqual([g.id]);
    expect(place(r.state, g.id).outcome).toBe("ignored");
  });

  // The regression this whole `ruledOut` design exists for. `banana` rules N
  // out at slot 1 and NEEDS it at slot 2; a list that survived a placement
  // would dim the tile the child is about to reach for.
  it("a letter ruled out at one slot is available at the next", () => {
    const s = startPuzzle(puzzleFor("banana"));
    const n = s.puzzle.tray.find((t) => t.letter === "N")!;
    const wrong = place(s, n.id);
    expect(wrong.outcome).toBe("wrong");

    const b = s.puzzle.tray.find((t) => t.letter === "B")!;
    const afterB = place(wrong.state, b.id);
    expect(afterB.state.ruledOut).toEqual([]);

    const a = afterB.state.puzzle.tray.find((t) => t.letter === "A")!;
    const afterA = place(afterB.state, a.id);
    expect(place(afterA.state, n.id).outcome).toBe("placed");
  });

  it("a tile already in a slot cannot be spent twice", () => {
    const s = startPuzzle(puzzleFor("dog"));
    const d = s.puzzle.tray.find((t) => t.letter === "D")!;
    const after = place(s, d.id).state;
    expect(place(after, d.id).outcome).toBe("ignored");
  });

  it("an unknown tile id changes nothing", () => {
    const s = startPuzzle(puzzleFor("dog"));
    const r = place(s, 999);
    expect(r.outcome).toBe("ignored");
    expect(r.state).toBe(s);
  });

  it("the last letter completes the word, and taps after it do nothing", () => {
    const done = solve(startPuzzle(puzzleFor("dog")));
    expect(isComplete(done)).toBe(true);
    const stray = place(done, done.puzzle.tray[0].id);
    expect(stray.outcome).toBe("ignored");
    expect(stray.complete).toBe(true);
  });

  // Every word in every language, played to the end. This is the property that
  // matters: a puzzle that cannot be finished is indistinguishable from a hard
  // one until a child is stuck in it.
  it("every word in every language can be spelled to the end", () => {
    for (const lang of LANGS) {
      for (const item of poolFor(hard, lang)) {
        const done = solve(startPuzzle(buildPuzzle(lang, item, hard, rng())));
        const spelled = done.slots.map(
          (s) => done.puzzle.tray.find((t) => t.id === s!.tileId)!.letter,
        );
        expect(spelled.join(""), `${item[lang]} (${lang})`).toBe(
          lettersOf(item[lang], lang).join(""),
        );
      }
    }
  });
});

describe("the hint", () => {
  const dog = () => {
    const item = WORDS.find((w) => w.en === "dog")!;
    return startPuzzle(buildPuzzle("en", item, hard, rng()));
  };

  it("fills the first unknown letter", () => {
    const r = hint(dog());
    expect(r.slot).toBe(0);
    expect(r.state.slots[0]?.hinted).toBe(true);
    expect(r.state.puzzle.tray.find((t) => t.id === r.tileId)?.letter).toBe("D");
  });

  it("fills the first UNKNOWN one, not the first one", () => {
    const s = dog();
    const d = s.puzzle.tray.find((t) => t.letter === "D")!;
    const r = hint(place(s, d.id).state);
    expect(r.slot).toBe(1);
    expect(r.state.slots[0]?.hinted).toBe(false);
    expect(r.state.slots[1]?.hinted).toBe(true);
  });

  it("counts itself, and clears the ruled-out tiles like any placement", () => {
    const s = dog();
    const g = s.puzzle.tray.find((t) => t.letter === "G")!;
    const stuck = place(s, g.id).state;
    expect(stuck.ruledOut).toHaveLength(1);

    const r = hint(stuck);
    expect(r.state.hints).toBe(1);
    expect(r.state.ruledOut).toEqual([]);
    expect(hint(r.state).state.hints).toBe(2);
  });

  it("can finish the word on its own, and then stops", () => {
    let s = dog();
    for (let i = 0; i < s.puzzle.letters.length; i++) s = hint(s).state;
    expect(isComplete(s)).toBe(true);
    expect(s.hints).toBe(3);

    const after = hint(s);
    expect(after.state).toBe(s);
    expect(after.tileId).toBeUndefined();
    expect(after.complete).toBe(true);
  });

  // The button must never be a dead end: whatever the tray, the hint has a tile
  // for it. Checked against every word rather than one, because the tray is
  // built per word and this is the promise `hint` leans on.
  it("always has a tile to give, for every word in every language", () => {
    for (const lang of LANGS) {
      for (const item of poolFor(hard, lang)) {
        let s = startPuzzle(buildPuzzle(lang, item, hard, rng()));
        while (!isComplete(s)) {
          const r = hint(s);
          expect(r.tileId, `${item[lang]} (${lang}) ran out of hints`).toBeDefined();
          s = r.state;
        }
      }
    }
  });
});

describe("the shuffle bag", () => {
  it("deals every picture once before repeating", () => {
    const pool = poolFor(hard, "en");
    const bag = refillBag(pool, rng());
    expect(new Set(bag.map((b) => b.emoji)).size).toBe(pool.length);
  });

  it("never repeats across the seam of two passes", () => {
    const pool = poolFor(hard, "en");
    for (const item of pool) {
      expect(refillBag(pool, rng(), item.emoji)[0].emoji).not.toBe(item.emoji);
    }
  });

  it("leaves the pool alone", () => {
    const pool = poolFor(hard, "en");
    const before = pool.map((p) => p.emoji);
    refillBag(pool, rng());
    expect(pool.map((p) => p.emoji)).toEqual(before);
  });
});

describe("levels, rewards and languages", () => {
  it("levels are ordered and every id resolves", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(["easy", "medium", "hard"]);
    for (const l of LEVELS) expect(levelById(l.id)).toBe(l);
    expect(() => levelById("expert" as never)).toThrow();
  });

  it("difficulty ramps both axes", () => {
    const [easy, medium, hardLevel] = LEVELS;
    expect(easy.maxLetters).toBeLessThan(medium.maxLetters);
    expect(medium.maxLetters).toBeLessThan(hardLevel.maxLetters);
    expect(easy.decoys).toBeLessThan(medium.decoys);
    expect(medium.decoys).toBeLessThan(hardLevel.decoys);
  });

  it("a milestone lands every fifth word and never on zero", () => {
    expect(isMilestoneRound(0)).toBe(false);
    expect(isMilestoneRound(5)).toBe(true);
    expect(isMilestoneRound(7)).toBe(false);
    expect(isMilestoneRound(10)).toBe(true);
  });

  it("offers the player's own language first", () => {
    for (const lang of LANGS) {
      const options = contentLangOptions(lang);
      expect(options[0]).toBe(lang);
      expect(new Set(options).size).toBe(options.length);
      expect(options.length).toBeGreaterThan(1);
    }
    expect(contentLangOptions("he")).toEqual(["he", "en", "es"]);
  });

  it("every alphabet is real letters, and hebrew offers no final form", () => {
    for (const lang of LANGS) {
      const alphabet = ALPHABETS[lang as ShippedLocale];
      expect(new Set(alphabet).size).toBe(alphabet.length);
      expect(alphabet.length).toBeGreaterThan(20);
    }
    for (const final of ["ך", "ם", "ן", "ף", "ץ"]) {
      expect(ALPHABETS.he, `${final} must never be a decoy`).not.toContain(final);
      expect(SPELLING_LETTERS.he.has(final), `${final} must be spellable`).toBe(true);
      expect(baseLetter(final)).not.toBe(final);
    }
    expect(baseLetter("A")).toBe("A");
  });
});
