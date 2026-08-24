import { useCallback, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { haptic } from "@juice/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { seedFrom, mulberry32 } from "@shared/rng";
import { streakStep } from "@sdk/streak";
import {
  SIZE, LETTER_VALUE, newGame, apply, validate,
  isOver, bestLevel, type Level, type Placement, type State,
} from "./logic";

const LEVEL_OPTIONS: ChromeLevel<Level>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "רגיל", en: "Normal", es: "Normal" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

const STR = {
  en: { play: "Play", recall: "Take back", tiles: "Tiles", score: "Score",
        pickLetter: "Pick a letter for the wild", over: "No tiles left" },
  he: { play: "לשחק", recall: "להחזיר", tiles: "אריחים", score: "ניקוד",
        pickLetter: "בחרו אות לג'וקר", over: "נגמרו האריחים" },
  es: { play: "Jugar", recall: "Retirar", tiles: "Fichas", score: "Puntos",
        pickLetter: "Elige una letra para el comodín", over: "No quedan fichas" },
} as const;
const str = (loc: Locale) => (STR as unknown as Record<string, typeof STR.en>)[loc] ?? STR.en;

type LettercrossSession = { level: Level; state: State };

/**
 * The snapshot gate. Handed whatever was on the disk, so it assumes nothing and
 * never throws - a wrong answer here renders a plausible board the rules can no
 * longer explain. See .claude/rules/session-snapshot-convention.md.
 *
 * There is no reward latch to carry: this game grants exactly once, at the end
 * of a run, and a finished run is not stored (`live: !over`). So resuming
 * cannot pay a player twice, which is the usual trap here.
 */
const SESSION: SessionSpec<LettercrossSession> = {
  version: 1,
  validate: (value): value is LettercrossSession => {
    const s = value as Partial<LettercrossSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (s.level !== "easy" && s.level !== "medium" && s.level !== "hard") return false;
    const g = s.state as Partial<State> | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (!Array.isArray(g.board) || g.board.length !== SIZE * SIZE) return false;
    if (!Array.isArray(g.rack) || !Array.isArray(g.bag)) return false;
    if (typeof g.score !== "number" || !Number.isFinite(g.score)) return false;
    return true;
  },
};

/**
 * The board sizes against the VIEWPORT, not its container, so the stage can
 * break out of the page gutter on a phone. Written as one uninterrupted
 * `min(...)` because `game-panel-clears-widest-board.test.ts` reads every px
 * term out of this source - see the comment on its regex.
 */
const BOARD = `min(94vw, 52vh, 430px)`;

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

/**
 * Why a play was refused. Four reasons now, not six: `start` (the first word
 * must cross the middle) and `touch` (a word must connect to what is there)
 * were removed on 2026-08-24 along with the rules themselves - a word goes
 * anywhere, so there is nothing left to say about where it went.
 */
const REASON: Record<string, Record<string, string>> = {
  en: { line: "One row or one column", gap: "No gaps",
        word: "Not a word we know", empty: "Place a tile first" },
  he: { line: "שורה אחת או טור אחד", gap: "בלי רווחים",
        word: "לא מילה שאנחנו מכירים", empty: "הניחו אריח" },
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

  const over = isOver(state) && pending.length === 0;
  useGameSession(ctx, SESSION, () => ({ level, state }), { live: !over });

  const best = ctx.score?.best(bestLevel(level));

  const reset = useCallback((next: Level) => {
    setState(newGame(next, mulberry32(seedFrom(`lettercross-${next}-${Date.now()}`))));
    setPending([]); setHeld(null); setAsking(null); setNote("");
    streakRef.current = 0;
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
    streakRef.current += 1;
    const step = streakStep(streakRef.current);
    if (step === undefined) ctx.audio.play("success");
    else ctx.audio.play("streak", { semitones: step });
    haptic.success();

    if (isOver(next)) {
      winMoment(ctx, {
        reason: "personal_best",
        tier: level,
        level: `lettercross-${level}`,
        score: { value: next.score, unit: "points", board: bestLevel(level) },
      });
    }
  }, [ctx, level, pending, state]);

  const cell = `calc(${BOARD} / ${SIZE})`;

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
          <button onClick={play} disabled={pending.length === 0}
            style={{ minWidth: 96, minHeight: 44, borderRadius: 12, border: "none",
              background: pending.length ? "var(--g)" : "var(--surface-2)",
              color: pending.length ? "#fff" : "var(--text-dim)", fontWeight: 700, fontSize: 16 }}>
            {T.play}
          </button>
          <button onClick={() => { setPending([]); setNote(""); }} disabled={pending.length === 0}
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
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${SIZE}, 1fr)`, width: BOARD, height: BOARD,
          gap: 1, background: RULE, borderRadius: 8, overflow: "hidden",
          // A flex item shrinks by DEFAULT. Without this the board is squeezed
          // by whatever appears below it - measured 367 -> 328px the moment the
          // 26-letter wild picker opens, which is a board that changes size
          // when you tap a tile. Nothing in this column shrinks; the play
          // surface scrolls instead.
          flexShrink: 0,
        }}>
          {shown.map((c, i) => {
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
