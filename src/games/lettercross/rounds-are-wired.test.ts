/**
 * THE RULE BEING RIGHT SAYS NOTHING ABOUT THE GAME CALLING IT.
 *
 * Each round's own test runs its generator directly, and every one of those
 * assertions passes on a build where no box ever opens the round. These read
 * `bonus.ts`, the four round components and `Lettercross.tsx` instead - the same
 * way `reaching-a-box-collects-it.test.ts` does - because the alternative is
 * mounting React to prove a wire exists.
 *
 * IT WAS `shared-letter-is-wired.test.ts` UNTIL ALL FIVE SCREENS EXISTED. Half
 * of what it pinned - the wall clock, the held ending, the cleanup - moved into
 * `roundShell.tsx` when a third round needed the same clock, so those
 * assertions moved with it rather than being deleted. A test that stops
 * matching because the code moved has to FOLLOW the code; the failure mode this
 * exists to prevent is deleting it instead, and reading the green suite as
 * proof the invariant is still held.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { BONUS_ARTS, ROUND_OF, type BonusArt, type RoundKind } from "./bonus";
import { BOXES } from "./boxes";

const read = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const SHELL = read("roundShell.tsx");
const GAME = read("Lettercross.tsx");

/** Every screen that asks a question, and the file that asks it. */
const ROUNDS: { kind: RoundKind; file: string; src: string }[] = [
  { kind: "crossword", file: "BonusRound.tsx", src: read("BonusRound.tsx") },
  { kind: "shared2", file: "SharedLetterRound.tsx", src: read("SharedLetterRound.tsx") },
  { kind: "shared3", file: "SharedLetterRound.tsx", src: read("SharedLetterRound.tsx") },
  { kind: "fillgaps", file: "FillGapsRound.tsx", src: read("FillGapsRound.tsx") },
  { kind: "anagram", file: "AnagramRound.tsx", src: read("AnagramRound.tsx") },
];
/** One entry per component, since two of the five share a file. */
const FILES = [...new Map(ROUNDS.map((r) => [r.file, r])).values()];

const ALL_KINDS: RoundKind[] = ["crossword", "shared2", "shared3", "fillgaps", "anagram"];

describe("every art opens something, and always the same thing", () => {
  it("gives every prize art a round", () => {
    const orphans = BONUS_ARTS.filter((a) => !(a in ROUND_OF));
    expect(orphans, `arts with no round: ${orphans.join(" ")}`).toEqual([]);
    // The control: the map must not be answering for things that are not arts.
    expect(Object.keys(ROUND_OF).sort()).toEqual([...BONUS_ARTS].sort());
  });

  it("names only rounds that exist, and uses every one of them", () => {
    const kinds = new Set(Object.values(ROUND_OF));
    for (const k of kinds) expect(ALL_KINDS).toContain(k);
    // ...and every screen BONUS had is reachable, or one of them is dead code
    // wearing a passing test.
    for (const k of ALL_KINDS) {
      expect([...kinds], `no art opens the ${k} round`).toContain(k);
    }
    expect(kinds.size, "five arts must open five different screens").toBe(5);
  });

  /**
   * The comment in `bonus.ts` argues its mapping from how OFTEN each art is on
   * the board. That is a claim about `boxes.ts`, so it is read off `boxes.ts`
   * rather than restated here.
   *
   * TWO ARTS APPEAR ONCE and the board holds five prize boxes twice over, so a
   * round on a once-only art is a round a player meets at most once a game.
   * `anagram` is the round added here that can pay the top price, so it takes
   * the second of those; `fillgaps` pays flat and cheaper and takes an art the
   * board holds twice.
   */
  it("puts a top-price round on each art the board holds once", () => {
    const times = (a: BonusArt) => BOXES.filter((b) => b.art === a).length;
    const artsFor = (k: RoundKind) =>
      (Object.keys(ROUND_OF) as BonusArt[]).filter((a) => ROUND_OF[a] === k);

    const once = BONUS_ARTS.filter((a) => times(a) === 1);
    expect(once.length, "the board no longer holds exactly two once-only arts").toBe(2);

    for (const k of ["shared2", "anagram"] as RoundKind[]) {
      const arts = artsFor(k);
      expect(arts, `more than one art opens ${k}`).toHaveLength(1);
      expect(times(arts[0]), `${k} sits on ${arts[0]}, which the board holds ${times(arts[0])} times`).toBe(1);
    }
    for (const k of ["shared3", "fillgaps", "crossword"] as RoundKind[]) {
      const arts = artsFor(k);
      expect(times(arts[0]), `${k} should be reachable more than once`).toBeGreaterThan(1);
    }
  });
});

describe("the game opens them", () => {
  /** The control. Every assertion below is about a string being present. */
  it("can read the renderer and every round at all", () => {
    expect(GAME.length).toBeGreaterThan(8000);
    expect(SHELL.length).toBeGreaterThan(2000);
    expect(GAME).toContain("export function Lettercross");
    for (const r of FILES) {
      expect(r.src.length, `${r.file} did not read`).toBeGreaterThan(1500);
    }
  });

  it("mounts all four round components", () => {
    for (const r of FILES) {
      const name = r.file.replace(".tsx", "");
      expect(GAME, `${name} is never imported`)
        .toMatch(new RegExp(`import \\{ ${name} \\} from "\\./${name}"`));
      expect(GAME, `${name} is never rendered`).toContain(`<${name}`);
    }
  });

  /**
   * ...and picks it from `ROUND_OF`, never from an art name written out here. A
   * hardcoded `art === "star"` is correct today and silently stops agreeing with
   * `bonus.ts` the first time that table moves.
   */
  it("asks bonus.ts which round, instead of naming an art", () => {
    expect(GAME).toMatch(/ROUND_OF\[/);
    const block = GAME.slice(GAME.indexOf("{rounds.length > 0 &&"), GAME.indexOf("{asking !== null && ("));
    expect(block.length, "could not slice the round switch - the matcher is blind").toBeGreaterThan(300);
    for (const art of BONUS_ARTS) {
      expect(block, `the switch names the art "${art}" directly`).not.toContain(`"${art}"`);
    }
    // Every kind the table can hold must be answered for, or a box opens the
    // crossword by falling through and looks like a mapping decision.
    for (const k of ALL_KINDS) {
      expect(block, `the switch never mentions ${k}`).toContain(k);
    }
  });

  it("hands the shared-letter round its own count, rather than two components", () => {
    expect(GAME).toMatch(/count=\{count\}/);
    expect(GAME).toMatch(/kind === "shared3" \? 3 : 2/);
  });

  it("carries the strings in every locale it ships", () => {
    const keys = ["letters:", "shared2:", "shared3:", "got:", "missed:",
      "gaps:", "gapsHint:", "anagram:", "anagramHint:", "clear:"];
    for (const key of keys) {
      const n = (GAME.match(new RegExp(key.replace(":", "\\s*:"), "g")) ?? []).length;
      expect(n, `${key} appears ${n} times - it needs one per locale`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the shell every round runs on", () => {
  /**
   * WALL-CLOCK, NEVER A FRAME COUNTER. A 20-second round driven by a per-frame
   * accumulator is 10 seconds on a 120Hz display, and the whole difficulty of
   * these screens is their clock.
   * See .claude/rules/fixed-timestep-must-match-display.md
   */
  it("runs its clock off the wall clock", () => {
    expect(SHELL).toMatch(/performance\.now\(\) - t0/);
    expect(SHELL, "a frame counter is back").not.toMatch(/frames\s*\+\+|\+\+\s*frames/);

    // THE CROSSWORD ROUND STILL RUNS ITS OWN, and that is stated rather than
    // exempted. It predates the shell and does not fit it: it settles on a
    // SCORE off the board the player built rather than on a won/lost, and its
    // ending is a points line rather than a verdict. So the invariant is held
    // in two places, and the second one is checked here too - the point is the
    // wall clock, not the file it lives in. (It also dwells 1500ms against the
    // shell's 1800; a real divergence, small, and the price of not rewriting a
    // working round to remove it.)
    const own = ROUNDS.find((r) => r.file === "BonusRound.tsx")!.src;
    expect(own).toMatch(/performance\.now\(\) - t0/);
    expect(own, "a frame counter is back").not.toMatch(/frames\s*\+\+|\+\+\s*frames/);

    // ...and none of the three the shell DOES serve may grow a second clock.
    for (const r of FILES.filter((f) => f.file !== "BonusRound.tsx")) {
      expect(r.src, `${r.file} runs its own frame loop`).not.toMatch(/requestAnimationFrame/);
    }
  });

  /**
   * THE END-OF-ROUND LATCH IS A REF, NOT THE PHASE. The frame loop and the
   * handback timeout are both created once, so a `phase` read from either
   * closure is for ever the phase at creation time - the clock would keep
   * counting under a round that had already been won.
   */
  it("latches the ending on a ref the loop can read", () => {
    expect(SHELL).toMatch(/doneRef = useRef\(false\)/);
    expect(SHELL).toMatch(/if \(doneRef\.current\) return/);
  });

  /** It holds the result before handing back, like the crossword round does. */
  it("holds the outcome on screen before it closes", () => {
    expect(SHELL).toMatch(/setTimeout\(\s*\(\) => settleRef\.current\(won\), DWELL_MS\)/);
    expect(SHELL).toMatch(/DWELL_MS = \d+/);
  });

  /** A player who leaves mid-round takes the frame loop and the handback too. */
  it("cancels both timers on the way out", () => {
    const cleanup = SHELL.slice(SHELL.indexOf("useEffect(() => () => {"));
    expect(cleanup.length, "could not slice the cleanup - the matcher is blind").toBeGreaterThan(80);
    expect(cleanup).toMatch(/clearTimeout\(timerRef\.current\)/);
    expect(cleanup).toMatch(/cancelAnimationFrame\(rafRef\.current\)/);
  });
});

describe("each round itself", () => {
  /** One place turns "how it went" into a payout, and it is none of these. */
  it("reports a quality and never a payout", () => {
    for (const r of FILES) {
      const n = (r.src.match(/tierOf\(/g) ?? []).length;
      expect(n, `${r.file} calls tierOf ${n} times - it must reduce once`).toBe(1);
      expect(r.src, `${r.file} names a coin amount`).not.toMatch(/coins\s*:/);
    }
  });

  /**
   * The words are English in every locale, so no line whose ORDER means
   * anything may mirror in the Hebrew app.
   *
   * COUNTED PER ROW, not per file. "The file mentions dir=ltr" is satisfied by
   * a round that pins one of its two rows and lets the other mirror - which is
   * exactly what a planted mutation did, and it survived a `toMatch` here while
   * the anagram's answer read backwards in Hebrew. So each round declares how
   * many order-bearing rows it draws, and adding one without its own pin reds.
   *
   * A row of loose CHOICES is deliberately not counted: those are a set, not a
   * sequence, so which end they start from carries nothing.
   */
  it("pins every row whose order means something LTR", () => {
    const ROWS: Record<string, number> = {
      // the crossword's board
      "BonusRound.tsx": 1,
      // the column of gapped words
      "SharedLetterRound.tsx": 1,
      // the one gapped word
      "FillGapsRound.tsx": 1,
      // the word being built, AND the tiles it is built from
      "AnagramRound.tsx": 2,
    };
    for (const r of FILES) {
      // `<div dir=` and not a bare match, so the prose above each row - which
      // quotes the attribute to explain it - cannot stand in for the attribute.
      const n = (r.src.match(/<div dir="ltr"/g) ?? []).length;
      expect(n, `${r.file} pins ${n} rows LTR, not ${ROWS[r.file]}`).toBe(ROWS[r.file]);
    }
    // The control: the matcher must be able to report a missing pin at all.
    expect((SHELL.match(/<div dir="ltr"/g) ?? []).length,
      "the shell draws no letters, so it should have no pin").toBe(0);
  });

  /**
   * A WRONG ANSWER MUST NOT END THE ROUND. This platform does not punish, and a
   * bonus that can be lost on the first tap is a trap wearing a prize's
   * clothes. Each handler may only finish on a RIGHT answer, so `finish(` may
   * appear exactly once in it - and never as `finish(false)`.
   */
  it("does not end the round on a wrong answer", () => {
    const handlers: { file: string; from: string; to: string; src: string }[] = [
      { file: "SharedLetterRound.tsx", from: "const guess = ", to: "// The blanks fill in",
        src: ROUNDS.find((r) => r.file === "SharedLetterRound.tsx")!.src },
      { file: "FillGapsRound.tsx", from: "const tap = ", to: "const pull = ",
        src: ROUNDS.find((r) => r.file === "FillGapsRound.tsx")!.src },
      { file: "AnagramRound.tsx", from: "const lay = ", to: "const take = ",
        src: ROUNDS.find((r) => r.file === "AnagramRound.tsx")!.src },
    ];
    for (const h of handlers) {
      const a = h.src.indexOf(h.from);
      const b = h.src.indexOf(h.to);
      expect(a, `could not find "${h.from}" in ${h.file} - the matcher is blind`).toBeGreaterThan(-1);
      expect(b, `could not find "${h.to}" in ${h.file} - the matcher is blind`).toBeGreaterThan(a);
      const body = h.src.slice(a, b);
      expect(body.length, `${h.file}: the sliced handler is too short to be real`).toBeGreaterThan(150);
      const calls = (body.match(/\bfinish\(/g) ?? []).length;
      expect(calls, `${h.file} finishes on a wrong answer too`).toBe(1);
      expect(body, `${h.file} can end the round in a loss on an input`).not.toMatch(/finish\(false\)/);
    }
  });

  /** A round that ends with the answer still hidden teaches nothing. */
  it("shows the answer when the clock wins", () => {
    const shared = ROUNDS.find((r) => r.file === "SharedLetterRound.tsx")!.src;
    expect(shared).toMatch(/const reveal = clock\.phase === "done"/);
    expect(shared).toMatch(/pattern\.replace\("_", puzzle\.answer\)/);

    const fill = ROUNDS.find((r) => r.file === "FillGapsRound.tsx")!.src;
    expect(fill).toMatch(/const reveal = clock\.phase === "done"/);
    expect(fill).toMatch(/reveal && puzzle \? puzzle\.word/);

    const ana = ROUNDS.find((r) => r.file === "AnagramRound.tsx")!.src;
    expect(ana).toMatch(/const reveal = clock\.phase === "done"/);
    expect(ana).toMatch(/reveal && puzzle \? \[\.\.\.puzzle\.word\]/);
  });

  /**
   * THE POOL SHOWS, THE DICTIONARY JUDGES. Four of the five screens put a word
   * on a child's screen, and `words.ts` may never be one of them - it is ENABLE1
   * behind a blocklist, and a blocklist is not provably complete (NOTICE.md).
   * So no round component may reach for it directly.
   */
  it("never imports the dictionary into a screen", () => {
    for (const r of FILES) {
      expect(r.src, `${r.file} imports words.ts, which it may not show`)
        .not.toMatch(/from "\.\/words"/);
    }
    // The control: something in the tree does import it, or this proves nothing.
    expect(read("patterns.ts")).toMatch(/from "\.\/words"/);
  });

  it("keeps the list of modules allowed to READ the dictionary to exactly two", () => {
    // NOTICE.md names this list, and it named it WRONG until 2026-08-25 - it
    // said `patterns.ts` was the only one, while `bonusBoard.ts` had imported
    // the dictionary since the crossword shipped. The safety property held
    // (neither SHOWS a word from it), but the sentence was checkable and false,
    // in the one file here whose job is to be precise about this.
    //
    // So the set is asserted rather than described. A third module arriving is
    // a red build naming itself, instead of a NOTICE that quietly stops being
    // true - and the two that are here each carry their reason:
    //
    //   patterns.ts    answers "is that a word" for the three pool-fed screens
    //   bonusBoard.ts  the crossword, which judges what the player built from
    //                  their OWN deal and shows nothing from the dictionary
    const ROUND_MODULES = [
      "patterns.ts", "bonusBoard.ts", "sharedLetter.ts", "fillGaps.ts",
      "anagram.ts", "bonus.ts", "puzzleWords.ts",
    ];
    const readers = ROUND_MODULES.filter((f) => /from "\.\/words"/.test(read(f)));
    expect(readers.sort(), `the set of dictionary readers moved - update NOTICE.md in the same change`)
      .toEqual(["bonusBoard.ts", "patterns.ts"]);
    // Positive control: the matcher can see a NON-reader, so an empty answer
    // above would be a broken regex rather than a clean tree.
    expect(readers.length, "the matcher found nothing - it is broken, not the tree")
      .toBeLessThan(ROUND_MODULES.length);
  });

  it("keeps NOTICE.md agreeing with that set", () => {
    // The doc and the code state the same fact; only one of them is executable.
    const notice = read("NOTICE.md");
    expect(notice, "NOTICE.md still claims patterns.ts is the ONLY reader")
      .not.toMatch(/`patterns\.ts` is the only module in the round tree/);
    expect(notice, "NOTICE.md no longer names bonusBoard.ts as the second reader")
      .toContain("bonusBoard.ts");
  });
});
