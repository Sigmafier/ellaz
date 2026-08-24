import { useCallback, useMemo, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { haptic } from "@juice/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { seedFrom, mulberry32 } from "@shared/rng";
import {
  SIZE, CENTRE, LETTER_VALUE, premiumAt, newGame, apply, validate,
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

const REASON: Record<string, Record<string, string>> = {
  en: { line: "One row or one column", gap: "No gaps", start: "The first word crosses the middle",
        touch: "Touch a letter already there", word: "Not a word we know", empty: "Place a tile first" },
  he: { line: "שורה אחת או טור אחד", gap: "בלי רווחים", start: "המילה הראשונה עוברת במרכז",
        touch: "צריך לגעת באות שכבר על הלוח", word: "לא מילה שאנחנו מכירים", empty: "הניחו אריח" },
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

  const over = isOver(state) && pending.length === 0;
  useGameSession(ctx, SESSION, () => ({ level, state }), { live: !over });

  const best = ctx.score?.best(bestLevel(level));

  const reset = useCallback((next: Level) => {
    setState(newGame(next, mulberry32(seedFrom(`lettercross-${next}-${Date.now()}`))));
    setPending([]); setHeld(null); setAsking(null); setNote("");
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
  }, []);

  const placeAt = useCallback((index: number) => {
    if (over) return;
    if (pending.some((p) => p.index === index)) return takeBack(index);
    if (state.board[index] || held === null) return;
    const tile = state.rack[held];
    if (tile === "?") { setAsking(index); return; }
    setPending((ps) => [...ps, { index, letter: tile, wild: false }]);
    setHeld(null); setNote("");
  }, [held, over, pending, state.board, state.rack, takeBack]);

  const chooseWild = useCallback((letter: string) => {
    if (asking === null) return;
    setPending((ps) => [...ps, { index: asking, letter, wild: true }]);
    setAsking(null); setHeld(null); setNote("");
  }, [asking]);

  const play = useCallback(() => {
    const v = validate(state.board, pending);
    if (!v.ok) {
      // A refusal is not an error. Say which rule, once, and leave the tiles
      // where they are so nothing has to be laid out again.
      setNote((REASON[ctx.locale] ?? REASON.en)[v.reason] ?? "");
      haptic.fail();
      return;
    }
    const next = apply(state, pending);
    setState(next);
    setPending([]); setHeld(null); setNote("");
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
              color: pending.length ? "#fff" : "var(--ink-soft)", fontWeight: 700, fontSize: 16 }}>
            {T.play}
          </button>
          <button onClick={() => { setPending([]); setNote(""); }} disabled={pending.length === 0}
            style={{ minWidth: 96, minHeight: 44, borderRadius: 12, border: "1px solid var(--line)",
              background: "transparent", color: "var(--ink)", fontSize: 16 }}>
            {T.recall}
          </button>
        </div>
      }
    >
      {/* The grid is pinned LTR: it is a spatial board, and in the Hebrew app an
          unpinned grid mirrors, so column 0 lands on the right and every word
          reads backwards. See .claude/rules/rtl-spatial-grid-dir-ltr.md */}
      <div dir="ltr" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${SIZE}, 1fr)`, width: BOARD, height: BOARD,
          gap: 1, background: "var(--line)", borderRadius: 8, overflow: "hidden",
        }}>
          {shown.map((c, i) => {
            const pr = premiumAt(i);
            const tentative = pending.some((p) => p.index === i);
            const bg = c
              ? (tentative ? "#FFF0C2" : "var(--paper, #FFF7EC)")
              : pr === "tw" ? "#F6C6C6" : pr === "dw" ? "#F8DEDE"
              : pr === "tl" ? "#C7DDF3" : pr === "dl" ? "#E1EDF9"
              : i === CENTRE ? "#EFE6D8" : "var(--surface)";
            return (
              <button key={i} onClick={() => placeAt(i)} aria-label={c ? c.letter : `${i}`}
                style={{
                  border: "none", padding: 0, background: bg, minWidth: 0, minHeight: 0,
                  fontSize: `calc(${cell} * 0.46)`, fontWeight: 700, lineHeight: 1,
                  color: c?.wild ? "var(--g)" : "var(--ink)",
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", minHeight: 52 }}>
          {state.rack.map((tile, i) => {
            const spent = pending.filter((p) => (p.wild ? "?" : p.letter) === tile).length;
            const usedUp = state.rack.slice(0, i + 1).filter((t) => t === tile).length <= spent;
            return (
              <button key={i} onClick={() => setHeld(held === i ? null : i)} disabled={usedUp || over}
                style={{
                  width: 44, height: 48, borderRadius: 10, fontSize: 20, fontWeight: 800,
                  border: held === i ? "3px solid var(--g)" : "1px solid var(--line)",
                  background: usedUp ? "var(--surface-2)" : "var(--paper, #FFF7EC)",
                  color: tile === "?" ? "var(--g)" : "var(--ink)",
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

        {asking !== null && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{T.pickLetter}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 320 }}>
              {[..."abcdefghijklmnopqrstuvwxyz"].map((ch) => (
                <button key={ch} onClick={() => chooseWild(ch)}
                  style={{ width: 30, height: 34, borderRadius: 7, border: "1px solid var(--line)",
                    background: "var(--surface)", fontWeight: 700 }}>{ch.toUpperCase()}</button>
              ))}
            </div>
          </div>
        )}

        {(note || over) && (
          <div style={{ fontSize: 14, color: "var(--ink-soft)", minHeight: 20 }}>
            {over ? T.over : note}
          </div>
        )}
      </div>
    </GameChrome>
  );
}
