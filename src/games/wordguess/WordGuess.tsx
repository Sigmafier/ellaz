import { textFor } from "@i18n/index";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { haptic, shake } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import type { WordLength } from "./words";
import {
  MAX_GUESSES,
  backspace,
  finalize,
  isOver,
  keyboardMarks,
  keysFor,
  newRound,
  submit,
  typeLetter,
  type Guess,
  type Mark,
  type WordState,
} from "./logic";

const LEVELS = [
  { id: "easy", length: 4, he: "4 אותיות", en: "4 letters" },
  { id: "medium", length: 5, he: "5 אותיות", en: "5 letters" },
  { id: "hard", length: 6, he: "6 אותיות", en: "6 letters" },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];

const LEVEL_OPTIONS: DifficultyOption<LevelId>[] = LEVELS.map((lv) => ({
  id: lv.id,
  label: { he: lv.he, en: lv.en },
}));

/**
 * Tile colours.
 *
 * FIXED VALUES, NOT THEME TOKENS, for the two that carry meaning. A `--green`
 * that resolves to a pale mint in the light theme and a deep jade in the dark
 * one would change what a hit LOOKS like between themes, and these two colours
 * are the entire language the game speaks. The neutral states follow the theme,
 * because "no information yet" has none to lose.
 *
 * Green and ORCHID, not green and yellow. The green/yellow pair is the trade
 * dress of the game this mechanic comes from, and § Legal in CLAUDE.md says
 * change the colours for any cloned mechanic. Orchid is also this game's own
 * `meta.color`, so the board matches its card on the home grid.
 */
const TILE: Record<Mark, { bg: string; fg: string }> = {
  hit: { bg: "#17B98A", fg: "#FFF7EC" },
  near: { bg: "#A855C9", fg: "#FFF7EC" },
  // ALL THREE ARE SOLID FILLS, and miss is the reason. It was
  // `var(--surface-2)` on `var(--text-dim)` first, which is correct-looking
  // reasoning - "no information, so let it recede" - and wrong on the screen:
  // in the light theme `--surface-2` is #fff3e0 against a `--surface` of
  // #fffdf8, so a tested-and-absent letter was indistinguishable from a row
  // nobody had touched. Miss is not the absence of information. It is the
  // single most common answer the game gives, and a player has to be able to
  // see at a glance which letters are spent.
  miss: { bg: "#6E6478", fg: "#FFF7EC" },
};

interface WordSession {
  levelId: LevelId;
  round: WordState;
  /**
   * How many words in a row, which is also the SCORE.
   *
   * It travels for the opposite reason to 2048's `won` latch: not to stop a
   * double payout, but to stop a silent loss. A player nine words into a run
   * who answers the phone would otherwise come back to zero and have no way to
   * know why. Nothing re-grants on restore — the score is only ever reported
   * from the solve handler — so carrying it cannot pay anyone twice.
   */
  streak: number;
}

const SESSION: SessionSpec<WordSession> = {
  version: 1,
  validate: (value): value is WordSession => {
    const s = value as Partial<WordSession> | null;
    if (typeof s !== "object" || s === null) return false;
    const level = LEVELS.find((lv) => lv.id === s.levelId);
    if (!level) return false;
    if (typeof s.streak !== "number" || !Number.isFinite(s.streak) || s.streak < 0) return false;
    const r = s.round as Partial<WordState> | undefined;
    if (typeof r !== "object" || r === null) return false;
    // The stored word must be the length this difficulty deals. A four-letter
    // answer under a six-tile row is not a crash: it is a round that renders
    // two permanently empty columns and can never be solved.
    if (r.length !== level.length) return false;
    if (!Array.isArray(r.target) || r.target.length !== level.length) return false;
    if (!r.target.every((ch) => typeof ch === "string" && ch.length === 1)) return false;
    if (!Array.isArray(r.draft) || r.draft.length > level.length) return false;
    if (typeof r.solved !== "boolean") return false;
    if (!Array.isArray(r.guesses) || r.guesses.length > MAX_GUESSES) return false;
    return r.guesses.every(
      (g: Guess) =>
        g &&
        Array.isArray(g.letters) &&
        Array.isArray(g.marks) &&
        g.letters.length === level.length &&
        g.marks.length === level.length,
    );
  },
};

function lengthOf(id: LevelId): WordLength {
  return (LEVELS.find((lv) => lv.id === id) ?? LEVELS[0]).length;
}

export function WordGuess({ ctx }: { ctx: GameContext }) {
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { streak: "רצף", tries: "ניחושים", wasWord: "המילה הייתה", nextWord: "מילה הבאה" },
      en: { streak: "Streak", tries: "Tries", wasWord: "The word was", nextWord: "Next word" },
    },
    ctx.locale,
  );
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const [levelId, setLevelId] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    LEVELS[0].id,
  );

  /**
   * A finished round is never restored, but the streak behind it always is.
   *
   * Handing back a solved board shows a child a puzzle with nothing left to do;
   * handing back a lost one shows them a failure they already lived through.
   * So a finished snapshot yields a FRESH word — and the run's streak rides
   * across, because that is the part they earned rather than the part they
   * finished.
   */
  const resume = restored && restored.levelId === levelId ? restored : undefined;
  const [state, setState] = useState<WordState>(() =>
    resume && !isOver(resume.round) ? resume.round : newRound(ctx.locale, lengthOf(levelId)),
  );
  const [streak, setStreak] = useState(() => resume?.streak ?? 0);
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(levelId));
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  /**
   * The live state, for the handlers that must not read a stale one.
   *
   * Typing goes through a functional updater, so four letters dispatched in one
   * frame all land. `onSubmit` cannot do that - `winMoment` must fire from the
   * handler and never from inside an updater - so it would read whatever
   * `state` was when the handler was last created. Type the final letter and
   * press Enter in the same frame and it sees a draft one letter short, shakes
   * the board, and eats the submit.
   *
   * Found by driving the real game: four letters and Enter dispatched together
   * rendered the row correctly and did nothing on Enter, while the same Enter
   * 300ms later scored it. A fast typist reaches this; a test that types with
   * delays never will.
   */
  const stateRef = useRef(state);
  stateRef.current = state;

  useGameSession(ctx, SESSION, () => ({ levelId, round: state, streak }), { live: true });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(levelId);
    }
  }, [ctx, levelId]);

  const nextWord = useCallback(
    (id: LevelId = levelId, keepStreak = true) => {
      setLevelId(id);
      setState(newRound(ctx.locale, lengthOf(id)));
      if (!keepStreak) setStreak(0);
      setBest(ctx.score?.best(id));
    },
    [ctx, levelId, setLevelId],
  );

  const onKey = useCallback(
    (ch: string) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      if (isOver(stateRef.current)) return;
      setState((s) => typeLetter(s, ch));
      ctx.audio.play("tap");
    },
    [ctx],
  );

  const onBackspace = useCallback(() => {
    if (isOver(stateRef.current)) return;
    setState((s) => backspace(s));
  }, []);

  // Everything with a side effect runs HERE, in the handler, never inside a
  // setState updater — React may run an updater twice, and for winMoment that
  // is a double grant rather than a stray animation.
  const onSubmit = useCallback(() => {
    const current = stateRef.current;
    if (isOver(current)) return;
    const { state: ns, outcome } = submit(current);
    if (outcome.kind === "ignored") return;

    if (outcome.kind === "short") {
      // A short row is not a mistake worth a sound. A nudge, and nothing said.
      if (boardRef.current) shake(boardRef.current);
      haptic.tap();
      return;
    }

    setState(ns);

    if (outcome.solved) {
      const next = streak + 1;
      setStreak(next);
      const r = boardRef.current?.getBoundingClientRect();
      const at = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
      // One grant per solved word. There is deliberately no second
      // `personal_best` on top when the streak record breaks: the solve has
      // already paid a star through `level_complete`, and paying again for the
      // same event is how an economy quietly inflates. The record rides along
      // as the score instead.
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: levelId,
        level: `${levelId}-${current.guesses.length + 1}`,
        at,
        score: { value: next, unit: "points", board: levelId },
      });
      if (result.score) setBest(result.score.best);
      // Supplementary, never the question: the word is already on screen in
      // letters. Hearing it is a bonus for a child still learning to read it.
      void ctx.speech.speak(finalize(ns.target).join(""), { locale: ctx.locale });
    } else if (outcome.lost) {
      setStreak(0);
      ctx.audio.play("fail");
      haptic.tap();
    } else {
      ctx.audio.play(outcome.marks.some((m) => m === "hit") ? "success" : "tap");
      haptic.tap();
    }
  }, [ctx, streak, levelId]);

  // Physical keyboard, for everyone on a desktop. `e.key` already carries the
  // Hebrew letter when the OS layout is Hebrew, so there is no map to maintain.
  useEffect(() => {
    const keys = new Set(keysFor(ctx.locale));
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
      } else if (keys.has(e.key.toLowerCase())) {
        e.preventDefault();
        onKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [ctx, onKey, onSubmit, onBackspace]);

  const length = lengthOf(levelId);
  const over = isOver(state);
  const keyMarks = keyboardMarks(state);
  const answer = finalize(state.target).join("");

  // The rows: every submitted guess, then the row being typed, then blanks.
  const rows: { letters: string[]; marks: (Mark | null)[] }[] = [];
  for (const g of state.guesses) rows.push({ letters: finalize(g.letters), marks: g.marks });
  if (!over) {
    const draft = [...state.draft];
    while (draft.length < length) draft.push("");
    rows.push({
      // Only finalise a row that is FULL. Finalising as you type would flip the
      // letter under the player's finger the moment they filled the last tile.
      letters: state.draft.length === length ? finalize(state.draft) : draft,
      marks: new Array(length).fill(null),
    });
  }
  while (rows.length < MAX_GUESSES) {
    rows.push({ letters: new Array(length).fill(""), marks: new Array(length).fill(null) });
  }

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "trophy", label: T.streak, value: streak },
        { icon: "star", label: ctx.t("best"), value: best ?? "-" },
        {
          icon: "moves",
          label: T.tries,
          value: `${Math.min(state.guesses.length, MAX_GUESSES)}/${MAX_GUESSES}`,
          ltr: true,
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={levelId}
      // A new length is a new game: the streak does not carry across, because a
      // run of four-letter words is not a run of six-letter ones. The record is
      // scoped per level for the same reason.
      onLevel={(id) => nextWord(id, false)}
      onRestart={() => nextWord(levelId, false)}
      footer={
        over ? (
          <button
            type="button"
            onClick={() => nextWord()}
            style={{
              width: "100%", border: "none", borderRadius: "var(--radius-2)",
              background: "var(--brand-fill)", color: "#fff", fontFamily: "inherit",
              padding: "12px 14px", minHeight: 68, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10, flexWrap: "wrap", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {state.solved ? ctx.t("youWon") : T.wasWord}
            </span>
            {!state.solved && (
              <span dir={ctx.dir} style={{ fontSize: 20, fontWeight: 900 }}>
                {answer}
              </span>
            )}
            <span style={{ fontSize: 15, fontWeight: 800, opacity: 0.85 }}>
              · {T.nextWord}
            </span>
          </button>
        ) : (
          <Keyboard ctx={ctx} marks={keyMarks} onKey={onKey} onEnter={onSubmit} onBack={onBackspace} />
        )
      }
    >
      <div
        ref={boardRef}
        // NOT `dir="ltr"`. The spatial-grid rule pins a BOARD to LTR so swipe
        // directions cannot invert, but these tiles are a WORD, and a Hebrew
        // word reads right to left. Pinning this one would spell every answer
        // backwards — the exact bug that rule exists to prevent, mirrored.
        dir={ctx.dir}
        style={{ display: "grid", gap: 6, width: `min(92vw, 52vh, ${length * 72}px)` }}
      >
        {rows.map((row, r) => (
          <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${length}, 1fr)`, gap: 6 }}>
            {row.letters.map((ch, c) => {
              const m = row.marks[c];
              return (
                <div
                  key={c}
                  className={m ? "ellaz-flip" : undefined}
                  style={{
                    aspectRatio: "1", minHeight: 40, borderRadius: 10,
                    display: "grid", placeItems: "center",
                    fontSize: "clamp(18px, 6vw, 30px)", fontWeight: 900, lineHeight: 1,
                    background: m ? TILE[m].bg : "var(--surface)",
                    color: m ? TILE[m].fg : "var(--text)",
                    border: m ? "none" : `2px solid ${ch ? "var(--brand-2)" : "var(--line)"}`,
                  }}
                >
                  {ch}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </GameChrome>
  );
}

function Keyboard({
  ctx, marks, onKey, onEnter, onBack,
}: {
  ctx: GameContext;
  marks: Record<string, Mark>;
  onKey: (ch: string) => void;
  onEnter: () => void;
  onBack: () => void;
}) {
  const K = textFor(
    { he: { del: "מחיקה", check: "בדיקה" }, en: { del: "delete", check: "Check" } },
    ctx.locale,
  );
  const keys = keysFor(ctx.locale);
  const big = {
    flex: "1 1 auto", minWidth: 74, minHeight: 44, border: "none",
    borderRadius: 8, background: "var(--surface-2)", color: "var(--text)",
    fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer",
  } as const;
  return (
    <div
      dir={ctx.dir}
      // WRAPS, because the key count is fixed by the ALPHABET and not by this
      // layout: 22 in Hebrew, 26 in English, and a non-wrapping row of 26 is
      // ~900px inside a 390px phone with the frame's own overflow hidden — the
      // exact shape of the boards-row bug.
      style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}
    >
      {keys.map((k) => {
        const m = marks[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onKey(k)}
            style={{
              flex: "0 0 auto", minWidth: 30, minHeight: 44, padding: "0 6px",
              border: "none", borderRadius: 8,
              background: m ? TILE[m].bg : "var(--surface)",
              color: m ? TILE[m].fg : "var(--text)",
              fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer",
              boxShadow: "var(--shadow-1)",
            }}
          >
            {k}
          </button>
        );
      })}
      <button type="button" onClick={onBack} style={big} aria-label={K.del}>
        ⌫
      </button>
      <button type="button" onClick={onEnter} style={{ ...big, background: "var(--brand-fill)", color: "#fff" }}>
        {K.check}
      </button>
    </div>
  );
}
