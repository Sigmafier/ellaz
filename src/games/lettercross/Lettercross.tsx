import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { haptic } from "@juice/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { seedFrom, mulberry32 } from "@shared/rng";
import { streakStep } from "@sdk/streak";
import { BOXES, BOX_RADIUS, boxIndex, sideOf, reachedBoxes, isLocked, type BoxArt } from "./boxes";
import { BONUS_ARTS, type BonusTier } from "./bonus";
import { BonusRound } from "./BonusRound";
import {
  SIZE, CELLS, boardAt, LETTER_VALUE, newGame, apply, validate,
  isOver, bestLevel, type Level, type Placement, type State,
} from "./logic";

const LEVEL_OPTIONS: ChromeLevel<Level>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "רגיל", en: "Normal", es: "Normal" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

const STR = {
  en: { play: "Play", recall: "Take back", tiles: "Tiles", score: "Score",
        pickLetter: "Pick a letter for the wild", over: "No tiles left",
        prize: "Prize box", taken: "Prize box, taken", locked: "Locked",
        bonus: "Bonus round", bonusHint: "Build words. Everything you make counts.",
        start: "Start", finish: "Done", points: "points",
        bad: "One of those wasn't a word" },
  he: { play: "לשחק", recall: "להחזיר", tiles: "אריחים", score: "ניקוד",
        pickLetter: "בחרו אות לג'וקר", over: "נגמרו האריחים",
        prize: "תיבת פרס", taken: "תיבת פרס, נלקחה", locked: "נעול",
        bonus: "סיבוב בונוס", bonusHint: "הרכיבו מילים. כל מה שתרכיבו נספר.",
        start: "התחל", finish: "סיימתי", points: "נקודות",
        bad: "אחת מהן לא הייתה מילה" },
  es: { play: "Jugar", recall: "Retirar", tiles: "Fichas", score: "Puntos",
        pickLetter: "Elige una letra para el comodín", over: "No quedan fichas",
        prize: "Caja de premio", taken: "Caja de premio, recogida", locked: "Cerrado",
        bonus: "Ronda de bonus", bonusHint: "Forma palabras. Todo lo que hagas cuenta.",
        start: "Empezar", finish: "Listo", points: "puntos",
        bad: "Una de ellas no era palabra" },
} as const;
const str = (loc: Locale) => (STR as unknown as Record<string, typeof STR.en>)[loc] ?? STR.en;

type LettercrossSession = { level: Level; state: State; bestFired: boolean;
  reached: readonly number[]; rounds: readonly number[] };

/**
 * The snapshot gate. Handed whatever was on the disk, so it assumes nothing and
 * never throws - a wrong answer here renders a plausible board the rules can no
 * longer explain. See .claude/rules/session-snapshot-convention.md.
 *
 * IT CARRIES A REWARD LATCH, and that comment used to say the opposite. The
 * claim was "this game grants exactly once, at the end of a run", which stopped
 * being true when the record moved off the end of the run (see `play`). The
 * score only ever climbs, so once a run is above the old best EVERY turn is a
 * new best - without `bestFired` on the disk, walking out and back in re-arms
 * the reward and the run pays a star per resume, for ever.
 *
 * IT CARRIES `reached` FOR THE SAME REASON. A box is collected once, and its
 * square stays filled for the rest of the run - so a snapshot that
 * forgets which boxes are already open re-collects every one of them on the
 * first word after a resume, and walking out and back in is a coin press.
 *
 * AND `rounds`, which is the same argument a third time. A box is marked
 * reached the instant it is arrived at, so a player who walks out mid-round
 * would come back to a collected box and no round - the prize gone with no
 * error anywhere. Carrying the open queue means leaving is a pause.
 *
 * `version` is 6 because the shape has changed five times, most recently when
 * the prize boxes became SQUARES - the board grew from SIZE x SIZE to the whole
 * stage, so every index in an older snapshot means a different square. Nothing
 * is migrated: a half-played
 * board is worth a few minutes, and migration code for it is a second copy of
 * the game's rules that nothing keeps in sync.
 */
const SESSION: SessionSpec<LettercrossSession> = {
  version: 6,
  validate: (value): value is LettercrossSession => {
    const s = value as Partial<LettercrossSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (s.level !== "easy" && s.level !== "medium" && s.level !== "hard") return false;
    const g = s.state as Partial<State> | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (!Array.isArray(g.board) || g.board.length !== CELLS) return false;
    if (!Array.isArray(g.rack) || !Array.isArray(g.bag)) return false;
    if (typeof g.score !== "number" || !Number.isFinite(g.score)) return false;
    if (typeof s.bestFired !== "boolean") return false;
    if (!Array.isArray(s.reached) || s.reached.some((n) => !Number.isInteger(n))) return false;
    if (!Array.isArray(s.rounds) || s.rounds.some((n) => !Number.isInteger(n))) return false;
    return true;
  },
};

/**
 * The STAGE is the board PLUS the one-cell ring of prize boxes around it, and
 * it is the thing that sizes against the VIEWPORT - not its container, so it
 * can break out of the page gutter on a phone. Written as one uninterrupted
 * `min(...)` because `game-panel-clears-widest-board.test.ts` reads every px
 * term out of this source - see the comment on its regex.
 *
 * The ring is one cell on every side, so the stage is SIZE + 2 cells across and
 * the BOARD is derived from it rather than the other way round. That is the
 * whole reason the cell size did not move when the ring arrived: the stage is
 * still the width the bare 11-wide board used to be.
 */
const STAGE = `min(94vw, 52vh, 430px)`;
const RING = SIZE + 2;
// The board itself is never sized in CSS: it spans SIZE of the stage's RING
// tracks, so it IS SIZE/RING of the stage and cannot disagree with the ring
// beside it. A second `calc()` saying the same thing is a second place to be
// wrong when SIZE moves.

// The board is a PHYSICAL OBJECT, not a themed surface: warm tiles, pastel
// premium squares, dark ink, one look in both themes. That is deliberate, and
// undoing it is how this broke the first time.
//
// The defect this replaces: the tile backgrounds were hardcoded light hex while
// the letter took `var(--ink)` - a token defined NOWHERE in this repo, and only
// this file ever read it. An undefined var() makes the whole declaration
// invalid at computed-value time, so `color` fell back to `inherit` and the
// letter took the THEME's text colour. Measured on the live page in night:
// #f5f6ff on #fff7ec, contrast 1.01 - a board of invisible letters, with no
// error anywhere and the market theme perfect.
//
// The rule: a background and the text on it are ONE decision. Both hardcoded or
// both tokens. A mixed pair only agrees in the theme you happened to look at.
const PAPER = "#FFF7EC";      // a tile already on the board
const PAPER_NEW = "#FFF0C2";  // placed this turn, not yet played
const PAPER_SPENT = "#E8E0D4"; // a rack tile whose letter is already down
const SQUARE = "#FAF4EA";     // a plain empty square
const RULE = "#E4D8C6";       // the grid lines, and the rack tile borders
const INK = "#241C17";        // every letter, on any of the above
// `--g` is emitted per page onto the body, so it is present in the app and on
// an emitted page alike - but a fallback costs nothing and closes exactly the
// class of bug above. It mirrors meta.color.
const ACCENT = "var(--g, #B33A3A)";

// The prize boxes. Hardcoded like PAPER and INK above, and for the same
// reason: they are a physical object sitting on the board, not a themed
// surface, so they read the same in both themes.
const GOLD_LIT = "#FFDE86";   // the lit top edge of a box
const GOLD = "#F2B93F";       // its face
const GOLD_EDGE = "#B07C1C";  // its border
const GOLD_INK = "#5A3A05";   // a number printed on it

/**
 * Original art, drawn here rather than pulled from `@ui/gameArt` - that module
 * is the CARD art for the home grid and the share cards, and it ships in the
 * shell, so a glyph only this game draws must not live in it. These ride the
 * lazy `game-lettercross-*` chunk and cost a first visit nothing.
 */
const BOX_ART: Readonly<Record<BoxArt, ReactNode>> = {
  gem: (
    <>
      <polygon points="12,3 20,10 12,21 4,10" fill="#5EC8E5" stroke="#1B6F86" strokeWidth="1.4" />
      <path d="M4 10h16M12 3v18" stroke="#1B6F86" strokeWidth="1" />
    </>
  ),
  star: (
    <polygon points="12,3 14.6,9.3 21.4,9.8 16.2,14.2 17.8,20.8 12,17.2 6.2,20.8 7.8,14.2 2.6,9.8 9.4,9.3"
      fill="#FFD34D" stroke="#B8860B" strokeWidth="1.2" />
  ),
  leaf: (
    <path d="M12 21C6 17 4 11 6 4c7-1 12 3 13 9 .5 4-3 7-7 8z"
      fill="#7DC96B" stroke="#2F6B27" strokeWidth="1.3" />
  ),
  bell: (
    <>
      <path d="M12 3a5 5 0 0 0-5 5v5l-2 3h14l-2-3V8a5 5 0 0 0-5-5z"
        fill="#F0A33C" stroke="#8A4B12" strokeWidth="1.3" />
      <circle cx="12" cy="19" r="2" fill="#8A4B12" />
    </>
  ),
  drop: (
    <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"
      fill="#E8748C" stroke="#8E2B41" strokeWidth="1.3" />
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#C9CDD6" stroke="#5A6070" strokeWidth="1.4" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="#5A6070" strokeWidth="1.7" />
    </>
  ),
};


/**
 * Why a play was refused. Four reasons now, not six: `start` (the first word
 * must cross the middle) and `touch` (a word must connect to what is there)
 * were removed on 2026-08-24 along with the rules themselves - a word goes
 * anywhere, so there is nothing left to say about where it went.
 */
const REASON: Record<string, Record<string, string>> = {
  en: { line: "One row or one column", gap: "No gaps",
        word: "Not a word we know", empty: "Place a tile first",
        off: "Not a square you can play on" },
  he: { line: "שורה אחת או טור אחד", gap: "בלי רווחים",
        word: "לא מילה שאנחנו מכירים", empty: "הניחו אריח",
        off: "לא משבצת שאפשר לשחק עליה" },
};

export function Lettercross({ ctx }: { ctx: GameContext }) {
  const T = str(ctx.locale);
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((l) => l.id), "medium");

  const restored = useMemo(() => ctx.session?.load(SESSION), [ctx]);
  const resume = restored && restored.level === level ? restored : undefined;

  const [state, setState] = useState<State>(
    () => resume?.state ?? newGame(level, mulberry32(seedFrom(`lettercross-${level}-${Date.now()}`))),
  );
  /** Tiles laid this turn but not yet played. Board state stays untouched. */
  const [pending, setPending] = useState<Placement[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const [asking, setAsking] = useState<number | null>(null);
  const [note, setNote] = useState<string>("");

  /**
   * How many words in a row have been ACCEPTED. Held in a ref rather than
   * state because nothing renders from it - it only ever decides which sound
   * the next accepted word makes, and a re-render per word would be paid for
   * nothing. `sdk/streak.ts` alone turns it into a rung; this game reports the
   * count and never picks a pitch, the same shape as `economy.ts` and
   * `score.ts`. A REFUSED word resets it: the run is of good words, not of
   * attempts.
   */
  const streakRef = useRef(0);

  /**
   * Has THIS run already been paid for beating the record? The score only goes
   * up, so from the turn it passes the old best every later turn is also a
   * personal best - unlatched, that is a star and a coin per word for the rest
   * of the game. It rides the snapshot so leaving is not a way to re-arm it.
   */
  const bestFiredRef = useRef(resume?.bestFired ?? false);

  /**
   * Every box the run has ARRIVED at - collected if it was open, found if it
   * was a padlock. One list rather than two because the question it answers is
   * "has this already happened", and both kinds must stop happening again.
   */
  const [reached, setReached] = useState<readonly number[]>(() => resume?.reached ?? []);
  /** Where the coins fly FROM: the box itself, not the middle of the screen. */
  const boxEls = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * The boxes whose bonus rounds are waiting, HEAD FIRST. A QUEUE rather than
   * one box, because a single word can run out to two boxes at once - a play
   * that opens two and shows one would silently drop a prize the player earned,
   * and only one round can be on screen at a time. It rides the snapshot
   * because leaving mid-round must be a pause rather than a loss.
   */
  const [rounds, setRounds] = useState<readonly number[]>(() => resume?.rounds ?? []);

  const over = isOver(state) && pending.length === 0;
  useGameSession(ctx, SESSION, () => ({ level, state, bestFired: bestFiredRef.current, reached, rounds }), { live: !over });

  const best = ctx.score?.best(bestLevel(level));

  const reset = useCallback((next: Level) => {
    setState(newGame(next, mulberry32(seedFrom(`lettercross-${next}-${Date.now()}`))));
    setPending([]); setHeld(null); setAsking(null); setNote("");
    streakRef.current = 0;
    bestFiredRef.current = false;
    setReached([]);
    setRounds([]);
  }, []);

  /** The board as it looks with this turn's tentative tiles on it. */
  const shown = useMemo(() => {
    const b = [...state.board];
    for (const p of pending) b[p.index] = { letter: p.letter, wild: p.wild };
    return b;
  }, [state.board, pending]);

  const takeBack = useCallback((index: number) => {
    setPending((ps) => ps.filter((p) => p.index !== index));
    setNote("");
    ctx.audio.play("flip");
  }, [ctx]);

  const placeAt = useCallback((index: number) => {
    if (over) return;
    if (pending.some((p) => p.index === index)) return takeBack(index);
    if (state.board[index] || held === null) return;
    const tile = state.rack[held];
    if (tile === "?") { setAsking(index); return; }
    setPending((ps) => [...ps, { index, letter: tile, wild: false }]);
    setHeld(null); setNote("");
    ctx.audio.play("pop"); haptic.tap();
  }, [ctx, held, over, pending, state.board, state.rack, takeBack]);

  const chooseWild = useCallback((letter: string) => {
    if (asking === null) return;
    setPending((ps) => [...ps, { index: asking, letter, wild: true }]);
    setAsking(null); setHeld(null); setNote("");
    ctx.audio.play("pop"); haptic.tap();
  }, [asking, ctx]);

  const play = useCallback(() => {
    const v = validate(state.board, pending);
    if (!v.ok) {
      // A refusal is not an error. Say which rule, once, and leave the tiles
      // where they are so nothing has to be laid out again.
      setNote((REASON[ctx.locale] ?? REASON.en)[v.reason] ?? "");
      ctx.audio.play("fail"); haptic.fail();
      streakRef.current = 0;
      return;
    }
    const next = apply(state, pending);
    setState(next);
    setPending([]); setHeld(null); setNote("");

    // The ladder REPLACES the ordinary success sound rather than stacking on
    // it - two voices on one event is a pile, not an escalation. Below the
    // floor a word sounds like Wood run; from the third in a row it sounds
    // like Glass, climbing. `streakStep` returns `undefined` rather than 0 for
    // "too short", and the explicit `=== undefined` is why: rung 0 is a REAL
    // note - the ladder's own bottom - so `if (!step)` would play `success`
    // on the third word forever and the ladder would never start.
    /**
     * STEP 2 OF THE GAME PLAN: a letter IN a box collects it.
     *
     * Not a letter beside it. Until 2026-08-25 a box was collected by filling
     * the board square next to it, and the operator's correction on seeing the
     * first bonus round is why this changed: "the mini game only apply if you
     * put a letter in the outside boxes not near them." That is BONUS's own
     * rule - its first or last letter of a word ON a bonus square - and it now
     * needs no code of its own at all, because a box is a playable square and a
     * word simply runs off the edge of the board into one.
     *
     * Reached is asked of the WHOLE BOARD rather than of this turn's tiles - a
     * box is taken when its square is occupied, by whichever turn put a tile
     * there. Which means the square stays filled for the rest of the run, so
     * `reached` is what stops the box collecting itself again on every later
     * word. It rides the snapshot for the same reason (see SESSION).
     *
     * A PADLOCK IS FOUND, NOT OPENED. Step 4 gives the wild tile a job and
     * opens them; today a lock says so and pays nothing, and the number printed
     * on it still means nothing. Marking it reached anyway is what stops the
     * note firing again every turn.
     */
    const arrived = reachedBoxes(next.board).filter((n) => !reached.includes(n));
    const opened = arrived.filter((n) => !isLocked(BOXES[n]));
    const found = arrived.filter((n) => isLocked(BOXES[n]));
    // STEP 5: EVERY prize art opens a round of its own now - bell, gem, star,
    // leaf and drop, five different verbs. Step 3 shipped one so the operator
    // could judge whether being pulled out of a word puzzle feels like a reward;
    // it did, so the flat-coin box is gone and `prize` is empty in practice. It
    // stays as the fallback for an art with no round rather than being deleted,
    // or a sixth art added later would pay NOTHING and look like it worked.
    // Marked reached HERE rather than when a round resolves: the queue rides the
    // snapshot, so a player who walks out mid-round comes back to it.
    const queued = opened.filter((n) => (BONUS_ARTS as readonly string[]).includes(BOXES[n].art));
    const prize = opened.filter((n) => !queued.includes(n));
    if (arrived.length) setReached((r) => [...r, ...arrived]);

    streakRef.current += 1;

    // THE BOX REPLACES THE WORD SOUND rather than stacking on it - the same
    // argument the streak ladder makes eight lines down, and the reason it is
    // an `else` rather than two `play` calls: two voices on one event is a
    // pile, not an escalation. `winMoment` below plays the win chord, so a
    // turn that opens a box sounds like opening a box.
    if (opened.length === 0) {
      const step = streakStep(streakRef.current);
      if (step === undefined) ctx.audio.play("success");
      else ctx.audio.play("streak", { semitones: step });
      haptic.success();
    }

    // Coins for progress, and the game says WHAT HAPPENED rather than what it
    // is worth: `milestone` is a flat coin and no star in `economy.ts`, which
    // is the whole reason a box cannot quietly become worth twelve
    // (rewards-economy-convention.md). `at` is the BOX, so the coins arc from
    // the thing that just opened rather than from the middle of the screen.
    for (const n of prize) {
      const r = boxEls.current[n]?.getBoundingClientRect();
      winMoment(ctx, {
        reason: "milestone",
        tier: level,
        level: `lettercross-box-${BOXES[n].art}`,
        confetti: false,
        at: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined,
      });
    }
    if (found.length) setNote(T.locked);
    if (queued.length) setRounds((q) => [...q, ...queued]);

    // THE RECORD IS WRITTEN EVERY TURN, not at the end of the run, and that is
    // a fix rather than a preference. This used to hang off `isOver`, which is
    // bag-empty AND rack-empty - and tiles leave the rack only by being placed,
    // so on 81 squares a 94-tile bag could never empty. Thirteen tiles were
    // stranded by arithmetic, `isOver` was unreachable, and it was the ONLY
    // path that recorded a score: "Best" read "-" for ever. (The prize boxes
    // became playable on 2026-08-25, so it is 93 squares against 94 tiles now -
    // no longer impossible, and still not something anyone will reach.)
    //
    // Reporting per turn is not a weaker version of reporting at the end. This
    // score only ever climbs, so the last report of a run IS its total, and
    // `report` keeps the better value itself - which is also why this game
    // holds no `best` of its own (score-contract-convention.md).
    const scored = ctx.score?.report({
      value: next.score, unit: "points", board: bestLevel(level),
    });

    // ...but the MOMENT is once per run. `isPersonalBest` is true on every turn
    // after the first crossing, so the latch is what stands between a beaten
    // record and a star per word. No confetti: this is a milestone inside a run,
    // not the end of one (rewards-economy-convention.md).
    if (scored?.isPersonalBest && !bestFiredRef.current) {
      bestFiredRef.current = true;
      winMoment(ctx, {
        reason: "personal_best",
        tier: level,
        level: `lettercross-${level}`,
        confetti: false,
      });
    }
  }, [ctx, level, pending, reached, state, T.locked]);

  /**
   * The round hands back a TIER and this hands that to `winMoment` - the game
   * still never names an amount, and `economy.ts` still owns the table.
   *
   * `level_complete` rather than `milestone`, and the choice is forced: a
   * milestone is a flat coin with no way to say the round went well, so a
   * mini-game paying the same for a bullseye and a near-miss is not a
   * mini-game. `level_complete` is the one reason carrying a tier, and its own
   * definition in `economy.ts` says "a level, round, or puzzle was finished".
   * The overload is real and worth knowing: everywhere else a tier is the
   * DIFFICULTY the player chose, and here it is how well they aimed.
   */
  const finishBonus = useCallback((tier: BonusTier) => {
    const n = rounds[0];
    setRounds((q) => q.slice(1));
    if (n === undefined) return;
    const r = boxEls.current[n]?.getBoundingClientRect();
    winMoment(ctx, {
      reason: "level_complete",
      tier,
      level: `lettercross-bonus-${BOXES[n].art}`,
      confetti: false,
      at: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined,
    });
  }, [ctx, rounds]);

  const cell = `calc(${STAGE} / ${RING})`;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "star", label: T.score, value: state.score, record: best ?? "-" },
        { icon: "moves", label: T.tiles, value: state.bag.length + state.rack.length, compact: true },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(next) => { setLevel(next); reset(next); }}
      onRestart={() => reset(level)}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={play} disabled={pending.length === 0 || rounds.length > 0}
            style={{ minWidth: 96, minHeight: 44, borderRadius: 12, border: "none",
              background: pending.length ? "var(--g)" : "var(--surface-2)",
              color: pending.length ? "#fff" : "var(--text-dim)", fontWeight: 700, fontSize: 16 }}>
            {T.play}
          </button>
          <button onClick={() => { setPending([]); setNote(""); }} disabled={pending.length === 0 || rounds.length > 0}
            style={{ minWidth: 96, minHeight: 44, borderRadius: 12, border: "1px solid var(--line)",
              background: "transparent", color: "var(--text)", fontSize: 16 }}>
            {T.recall}
          </button>
        </div>
      }
    >
      {/* The grid is pinned LTR: it is a spatial board, and in the Hebrew app an
          unpinned grid mirrors, so column 0 lands on the right and every word
          reads backwards. See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
      <div dir="ltr" style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        position: "relative", // the wild picker is an overlay inside this column
      }}>
        {/* THE STAGE: one RING x RING grid holding the board in the middle and
            the prize boxes in the ring around it. The boxes are placed by GRID
            AREA rather than absolute px, which is what makes "in line with a
            row or column" true by construction instead of by arithmetic that
            can drift - a box and the squares it lines up with are literally in
            the same grid track. */}
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${RING}, 1fr)`,
          gridTemplateRows: `repeat(${RING}, 1fr)`, width: STAGE, height: STAGE,
          flexShrink: 0,
        }}>
          {/* A PRIZE BOX IS A SQUARE YOU PLAY ON, not a decoration beside one.
              It takes a tile exactly the way a board square does - same
              `placeAt`, same index space - which is what makes "the first or
              last letter of a word lands in the box" a consequence of the
              geometry rather than a rule anyone had to write. */}
          {BOXES.map((b, n) => {
            const side = sideOf(b);
            const shut = isLocked(b);
            const here = reached.includes(n);
            const i = boxIndex(b);
            const c = shown[i];
            const tentative = pending.some((p) => p.index === i);
            // The gold NEVER leaves while a tile is on it - a filled box is a
            // tile in a gold frame, so the board still reads back as "that word
            // ran all the way out to the star". `taken` is the empty-frame
            // state, which now only happens if a tile is somehow taken off one.
            const taken = here && !shut && !c;
            return (
              <button key={n} ref={(el) => { boxEls.current[n] = el; }}
                onClick={() => placeAt(i)}
                aria-label={c ? c.letter : taken ? T.taken : shut ? T.locked : T.prize}
                style={{
                gridRow: b.row + 2, gridColumn: b.col + 2,
                display: "grid", placeItems: "center", position: "relative",
                padding: 0, boxSizing: "border-box",
                background: c
                  ? (tentative ? PAPER_NEW : PAPER)
                  : taken ? SQUARE : `linear-gradient(160deg, ${GOLD_LIT}, ${GOLD})`,
                border: `1px solid ${taken ? RULE : GOLD_EDGE}`,
                borderRadius: BOX_RADIUS[side],
                boxShadow: here && shut ? `inset 0 0 0 2px ${GOLD_INK}` : undefined,
                opacity: taken ? 0.5 : 1,
                fontSize: `calc(${cell} * 0.46)`, fontWeight: 700, lineHeight: 1,
                color: c?.wild ? ACCENT : INK,
                cursor: over ? "default" : "pointer",
                transition: "background 220ms, opacity 220ms",
              }}>
                {c ? c.letter.toUpperCase() : (
                  <svg viewBox="0 0 24 24" width="74%" height="74%" aria-hidden="true"
                    style={{ opacity: taken ? 0.3 : 1 }}>
                    {BOX_ART[b.art]}
                  </svg>
                )}
                {b.value !== undefined && !c && (
                  <span style={{
                    position: "absolute", insetInlineEnd: "4%", bottom: 0,
                    fontSize: `calc(${cell} * 0.34)`, fontWeight: 800,
                    lineHeight: 1, color: GOLD_INK,
                  }}>{b.value}</span>
                )}
              </button>
            );
          })}

        <div style={{
          gridArea: `2 / 2 / span ${SIZE} / span ${SIZE}`,
          display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${SIZE}, 1fr)`,
          gap: 1, background: RULE, overflow: "hidden",
          // A flex item shrinks by DEFAULT. Without this the board is squeezed
          // by whatever appears below it - measured 367 -> 328px the moment the
          // 26-letter wild picker opens, which is a board that changes size
          // when you tap a tile. Nothing in this column shrinks; the play
          // surface scrolls instead.
          flexShrink: 0,
        }}>
          {Array.from({ length: SIZE * SIZE }, (_, k) => {
            // The board is SIZE x SIZE of squares inside a stage that is two
            // wider, so a board square's own index is not its index on the
            // stage. `boardAt` is the one conversion and it lives in `grid.ts`
            // beside the rest of the geometry - a second `+1` written out here
            // is a second place to be wrong when the ring changes thickness.
            const i = boardAt(Math.floor(k / SIZE), k % SIZE);
            const c = shown[i];
            // EVERY SQUARE IS THE SAME SQUARE. No premium colours, no centre
            // star - operator's call, 2026-08-24: "we dont need the color
            // blocks, all should be placeable". The board is now a sheet of
            // paper, and the only thing that varies on it is whether a tile is
            // on it and whether that tile was laid this turn.
            const tentative = pending.some((p) => p.index === i);
            const bg = c ? (tentative ? PAPER_NEW : PAPER) : SQUARE;
            return (
              <button key={i} onClick={() => placeAt(i)} aria-label={c ? c.letter : `${i}`}
                style={{
                  border: "none", padding: 0, background: bg, minWidth: 0, minHeight: 0,
                  fontSize: `calc(${cell} * 0.46)`, fontWeight: 700, lineHeight: 1,
                  color: c?.wild ? ACCENT : INK,
                  cursor: over ? "default" : "pointer",
                }}>
                {c ? c.letter.toUpperCase() : ""}
              </button>
            );
          })}
        </div>
        </div>

        {/* The rack. A tile is TAPPED, never dragged - drag is never required
            here (see CLAUDE.md, kids games), and a rack that only responds to a
            sustained gesture takes the game away from the people it is for. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", minHeight: 52, flexShrink: 0 }}>
          {state.rack.map((tile, i) => {
            const spent = pending.filter((p) => (p.wild ? "?" : p.letter) === tile).length;
            const usedUp = state.rack.slice(0, i + 1).filter((t) => t === tile).length <= spent;
            return (
              <button key={i} onClick={() => { setHeld(held === i ? null : i); ctx.audio.play("tap"); }} disabled={usedUp || over}
                style={{
                  width: 44, height: 48, borderRadius: 10, fontSize: 20, fontWeight: 800,
                  border: held === i ? `3px solid ${ACCENT}` : `1px solid ${RULE}`,
                  background: usedUp ? PAPER_SPENT : PAPER,
                  color: tile === "?" ? ACCENT : INK,
                  opacity: usedUp ? 0.35 : 1, cursor: usedUp ? "default" : "pointer",
                }}>
                {tile === "?" ? "★" : tile.toUpperCase()}
                {tile !== "?" && (
                  <sub style={{ fontSize: 10, fontWeight: 600, opacity: 0.6 }}>{LETTER_VALUE[tile]}</sub>
                )}
              </button>
            );
          })}
        </div>

        {/* The round covers the column exactly as the picker does, so the board
            and the rack behind it stop taking taps. The two footer buttons are
            OUTSIDE this column - they are disabled above rather than covered,
            which is the part that is easy to miss. */}
        {rounds.length > 0 && (
          <BonusRound
            key={rounds[0]}
            glyph={BOX_ART[BOXES[rounds[0]].art]}
            t={{ label: T.bonus, hint: T.bonusHint, start: T.start,
                 finish: T.finish, points: T.points, bad: T.bad }}
            onStop={finishBonus}
            playTap={() => ctx.audio.play("tap")}
          />
        )}

        {/* The picker is an OVERLAY rather than a row in the column, for the
            same reason. Twenty-six buttons appearing in flow is the biggest
            reflow this screen has; as a layer over the board it costs the
            layout nothing and nothing below it moves. */}
        {asking !== null && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6, background: "color-mix(in oklab, var(--surface) 88%, transparent)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{T.pickLetter}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 320 }}>
              {[..."abcdefghijklmnopqrstuvwxyz"].map((ch) => (
                <button key={ch} onClick={() => chooseWild(ch)}
                  style={{ width: 30, height: 34, borderRadius: 7, border: "1px solid var(--line)",
                    background: "var(--surface)", color: "var(--text)", fontWeight: 700 }}>{ch.toUpperCase()}</button>
              ))}
            </div>
          </div>
        )}

        {/* THE NOTE IS ALWAYS IN THE LAYOUT, empty or not.
            Conditionally rendering it is what made the game "keep shrinking and
            growing as I play": measured on the built artifact at 1440x900, the
            panel went 661 -> 695px and the Play button moved 34px DOWN the
            instant a word was refused, then back up the moment the note
            cleared. Refuse a word, take it back, refuse another - the button
            you are aiming at moves every single turn.
            `flexShrink: 0` on the board (2026-08-23) fixed a different defect
            with the same symptom - the board being SQUEEZED - and left this
            one untouched. Reserving the row is what closes it. */}
        <div aria-live="polite" style={{
          fontSize: 14, color: "var(--text-dim)", height: 20, lineHeight: "20px",
          flexShrink: 0, textAlign: "center",
        }}>
          {over ? T.over : note}
        </div>
      </div>
    </GameChrome>
  );
}
