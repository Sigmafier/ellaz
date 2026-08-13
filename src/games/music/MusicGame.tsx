import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { haptic, popEl } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  LENGTHS,
  MILESTONE_EVERY,
  ROWS,
  STEPS,
  VOICES,
  cellIndex,
  clearTune,
  columnRows,
  isVoice,
  milestoneStep,
  newTune,
  noteCount,
  pitchFor,
  resize,
  scoreReport,
  setVoice,
  surprise,
  toggleCell,
  type Length,
  type TuneState,
  type Voice,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// decides what a tap LOOKS and SOUNDS like, and what the outcomes it reports
// are worth to the economy.
//
// TAP, NEVER DRAG. There is no gesture in this game at all: a square is on or
// off, the play button is a button, and the three voices are three buttons.
// Painting a row by dragging across it would be a lovely addition ON TOP; it
// may never be the only way through (the kids rule in CLAUDE.md).
//
// THE CLOCK LIVES HERE AND NOWHERE ELSE. `playing` and the playhead are React
// state, never `TuneState`, so a snapshot can never restore a tune that is
// mid-playback with no loop behind it - which is the memory `lock` trap in
// session-snapshot-convention.md, avoided by construction rather than by a
// `settle()` at save time.

const LEVEL_OPTIONS: DifficultyOption<Length>[] = [
  { id: "short", label: { he: "קצר", en: "Short", es: "Corta" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "long", label: { he: "ארוך", en: "Long", es: "Larga" } },
];

// This game's own words, as a locale RECORD rather than a `locale === "he" ?`
// ternary - promoting a language reds this block by name instead of leaving the
// game speaking English inside a page that is not.
const WORDS: Record<
  Locale,
  {
    hint: string;
    notes: string;
    play: string;
    stop: string;
    surprise: string;
    voice: Record<Voice, string>;
    note: (col: number) => string;
    on: string;
    off: string;
  }
> = {
  he: {
    hint: "הקישו על הריבועים, ואז על הנגן",
    notes: "תווים",
    play: "נגנו",
    stop: "עצרו",
    surprise: "הפתיעו אותי",
    voice: { round: "צליל עגול", soft: "צליל רך", bright: "צליל בהיר" },
    note: (col) => `תו בפעימה ${col}`,
    on: "דולק",
    off: "כבוי",
  },
  en: {
    hint: "Tap the squares, then tap play",
    notes: "Notes",
    play: "Play",
    stop: "Stop",
    surprise: "Surprise me",
    voice: { round: "round sound", soft: "soft sound", bright: "bright sound" },
    note: (col) => `note on beat ${col}`,
    on: "on",
    off: "off",
  },
  es: {
    hint: "Toca los cuadros y luego el play",
    notes: "Notas",
    play: "Tocar",
    stop: "Parar",
    surprise: "Sorpréndeme",
    voice: { round: "sonido redondo", soft: "sonido suave", bright: "sonido brillante" },
    note: (col) => `nota en el tiempo ${col}`,
    on: "encendida",
    off: "apagada",
  },
};

/* -------------------------------------------------------------- the style */

/**
 * One colour per ROW, warm at the top and cool at the bottom.
 *
 * The colour is the second way a child reads the pitch, after the height - and
 * it is the one that survives a tune being looked at rather than listened to.
 * Index 0 is the top row, which `pitchFor` makes the highest note.
 */
const ROW_COLORS: readonly string[] = [
  "#FF4D8D", // raspberry - highest
  "#FF8A3D", // tangerine
  "#FFC730", // sunflower
  "#6FD44E", // lime
  "#3DBBEE", // lagoon
  "#8093F1", // periwinkle - lowest
];

/** The board itself. Deliberately not a theme token - see the note on the grid. */
const WELL = "#1D2440";
const WELL_CELL = "#28315A";
/** The column the playhead is on, behind whatever notes sit in it. */
const WELL_HEAD = "#3B477E";

/**
 * How long one beat lasts.
 *
 * Slow enough that a four-year-old can hear each note as its own thing, and
 * fast enough that eight of them read as a tune rather than as a list. Fixed
 * rather than a control: a tempo slider is a fourth thing on a screen that is
 * already a grid, a play button and three voices.
 */
const STEP_MS = 320;

/** How long a note rings. Slightly under a beat, so repeats are audible. */
const NOTE_MS = 260;

/** What each voice id actually IS. `logic.ts` deals in the id and never in this. */
const VOICE_SPEC: Record<Voice, { type: OscillatorType; gain: number }> = {
  round: { type: "sine", gain: 0.2 },
  soft: { type: "triangle", gain: 0.18 },
  // Quieter on purpose: a square wave carries far more energy in its harmonics,
  // so matching the others by NUMBER would be a good deal louder by ear.
  bright: { type: "square", gain: 0.1 },
};

/* ------------------------------------------------------------------ glyphs */

/**
 * Original SVG, and that is a rule rather than a preference: the operator's
 * standing law is no emoji in product chrome, SVG only. A play triangle and a
 * stop square also need no reading, in any language.
 */
function Glyph({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const PLAY_D = "M7.5 5.2 19 12 7.5 18.8z";
const STOP_D = "M6.4 6.4h11.2v11.2H6.4z";
const SPARK_D = "M12 3.4 13.7 9l5.6 1.7-5.6 1.7L12 18l-1.7-5.6L4.7 10.7 10.3 9z";
/** The three voices, drawn as what they sound like: smooth, soft, spiky. */
const VOICE_D: Record<Voice, string> = {
  round: "M3 12c2.6-7 5.2-7 7.8 0s5.2 7 7.8 0",
  soft: "M3.5 15.5c3-9 6-9 8.5 0 2.5-6 5-6 8 0",
  bright: "M3 16.5 6 7.5 9 16.5 12 7.5 15 16.5 18 7.5 21 16.5",
};

/* ------------------------------------------------------------- the snapshot */

/**
 * The tune, plus the two things the run has already been PAID for.
 *
 * Both latches travel, and each one is a way to be paid twice if it does not
 * (session-snapshot-convention.md):
 *
 * `paidStep` is the highest milestone this tune has ever reached. It CANNOT be
 * derived from the note count the way `fit` derives its milestone from lines
 * cleared, because lines cleared only ever goes up and a note count goes DOWN
 * every time a child erases something. Erase five notes, leave, come back, add
 * them again - with a derived step, that pays a second coin for the same six
 * notes, once per resume, forever.
 *
 * `bestFired` is the one celebration this toy ever throws: the first time this
 * tune becomes the biggest thing the player has built on this length. Without
 * it, every note past the record is a new record and the confetti fires on
 * every tap.
 */
interface MusicSession {
  state: TuneState;
  paidStep: number;
  bestFired: boolean;
}

const SESSION: SessionSpec<MusicSession> = {
  version: 1,
  validate: (value): value is MusicSession => {
    const s = value as Partial<MusicSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.bestFired !== "boolean") return false;
    if (typeof s.paidStep !== "number" || !Number.isFinite(s.paidStep) || s.paidStep < 0) {
      return false;
    }

    const t = s.state as Partial<TuneState> | null | undefined;
    if (typeof t !== "object" || t === null) return false;
    if (typeof t.level !== "string" || !(t.level in STEPS)) return false;
    // The grid must match the dimensions the LENGTH declares, not merely the
    // ones the snapshot claims: the CSS grid is built from the level, so a
    // tune of some other width renders as a grid whose cells and columns
    // disagree - a plausible picture with no error anywhere.
    const steps = STEPS[t.level as Length];
    if (t.steps !== steps) return false;
    if (!Array.isArray(t.cells) || t.cells.length !== ROWS * steps) return false;
    if (!t.cells.every((c) => typeof c === "boolean")) return false;
    return isVoice(t.voice);
  },
};

/* ----------------------------------------------------------------- the game */

export function MusicGame({ ctx }: { ctx: GameContext }) {
  // The length a child last chose, VALIDATED against this game's own list - an
  // id no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears.
  const [level, setLevel] = useRememberedLevel(ctx, LENGTHS, "medium");

  // Read ONCE, before the first render, so a returning child's tune never
  // flashes as an empty grid.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume = restored && restored.state.level === level ? restored : undefined;

  const [state, setState] = useState<TuneState>(() => resume?.state ?? newTune(level));
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  const [playing, setPlaying] = useState(false);
  /** Which beat is sounding right now. Renderer-only - see the header. */
  const [head, setHead] = useState<number | null>(null);

  const startedRef = useRef(false);
  /** The live tune, for the playback loop - so editing does not restart it. */
  const stateRef = useRef(state);
  stateRef.current = state;
  const paidRef = useRef(resume?.paidStep ?? 0);
  const bestFiredRef = useRef(resume?.bestFired ?? false);

  const T = WORDS[ctx.locale];
  const notes = noteCount(state);

  /* ------------------------------------------------------------ the sound */

  /** Ring one square. Every note in the app goes through here. */
  const ring = useCallback(
    (row: number, voice: Voice) => {
      const spec = VOICE_SPEC[voice];
      ctx.audio.tone({ freq: pitchFor(row), ms: NOTE_MS, type: spec.type, gain: spec.gain });
    },
    [ctx],
  );

  /** Ring a whole beat. Top note first, always - see `columnRows`. */
  const ringColumn = useCallback(
    (col: number) => {
      const tune = stateRef.current;
      for (const row of columnRows(tune, col)) ring(row, tune.voice);
    },
    [ring],
  );

  // The playhead. A frame loop rather than an interval, and it reads the tune
  // out of a REF rather than out of props: a loop that restarted on every edit
  // would jump the beat every time a child touched a square, which is exactly
  // when they are listening hardest.
  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      const col = Math.floor((now - started) / STEP_MS) % stateRef.current.steps;
      if (col !== last) {
        last = col;
        setHead(col);
        ringColumn(col);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setHead(null);
    };
  }, [playing, ringColumn]);

  // A tune playing into a pocket is the one thing this toy could do that a
  // parent would mind. The tab going away stops it.
  useEffect(() => ctx.onPause(() => setPlaying(false)), [ctx]);

  /* ------------------------------------------------------------ the taps */

  const startLevel = useCallback(
    (next: Length) => {
      setLevel(next);
      // RESIZE, never a fresh grid. Every other game in this catalogue treats a
      // level change as a new deal, and that is right for a puzzle and wrong
      // for a thing somebody made.
      setState((prev) => resize(prev, next));
      setBest(ctx.score?.best(next));
      // The record is per length, so this is a different board and its first
      // new best is a real one. `paidStep` is NOT reset: the notes survived the
      // resize, so the coins they earned must not be payable twice.
      bestFiredRef.current = false;
      ctx.analytics.levelStart(next);
    },
    [ctx, setLevel],
  );

  // GameChrome's restart button. A deliberate act on an empty-able toy, so it
  // starts a genuinely new tune - both latches with it, exactly like a new run
  // in an endless game.
  const restart = useCallback(() => {
    setPlaying(false);
    setState((prev) => clearTune(prev));
    paidRef.current = 0;
    bestFiredRef.current = false;
  }, []);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  // ALWAYS live. A tune is never over, so there is nothing to clear - the same
  // answer `coloring` gives, and for the same reason: a finished drawing is not
  // a solved puzzle.
  useGameSession(
    ctx,
    SESSION,
    () => ({ state, paidStep: paidRef.current, bestFired: bestFiredRef.current }),
    { live: true },
  );

  /**
   * Bank what a tune this size is worth.
   *
   * Everything here runs in the HANDLER, never inside a setState updater:
   * React may run an updater twice, and a doubled `winMoment` is a doubled
   * grant - real coins, not a stray animation.
   */
  const bank = useCallback(
    (tune: TuneState, at: { x: number; y: number }) => {
      const report = scoreReport(tune, level);
      const scored = ctx.score?.report(report);
      if (scored?.isPersonalBest) setBest(scored.best);

      // A coin every few notes, against the HIGHEST this tune has ever been -
      // never against the current count, which goes down when a child erases.
      const step = milestoneStep(report.value);
      if (step > paidRef.current) {
        paidRef.current = step;
        winMoment(ctx, {
          reason: "milestone",
          level: `notes-${step * MILESTONE_EVERY}`,
          at,
          // This fires every few taps, and a full-screen celebration that fires
          // every few taps stops being one.
          confetti: false,
        });
      }

      // The one celebration this toy ever throws, latched to once per tune.
      // There is no `level_complete` here on purpose: nothing is ever finished.
      //
      // And NO TIER, which is a statement rather than an omission: a tier is
      // how hard the thing was, and nothing here can be hard. `economy.ts`
      // reads a missing tier as the gentlest one, so this pays the least a win
      // can pay - which is the honest price for a toy that cannot be lost.
      if (scored?.isPersonalBest && !bestFiredRef.current) {
        bestFiredRef.current = true;
        winMoment(ctx, { reason: "personal_best", level: `notes-${report.value}`, at });
      }
    },
    [ctx, level],
  );

  const onCell = useCallback(
    (index: number, el: HTMLElement) => {
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = toggleCell(state, index);
      if (outcome.kind === "ignored") return;
      setState(next);
      haptic.tap();
      popEl(el);

      // Turning a note ON plays it, so a child hears what they just made
      // without waiting for the playhead to come round. Turning one off is
      // silent - there is no sound for a thing that is no longer there.
      if (outcome.kind !== "on") return;
      ring(outcome.row, next.voice);

      const r = el.getBoundingClientRect();
      bank(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    },
    [bank, ctx, ring, state],
  );

  const onSurprise = useCallback(
    (el: HTMLElement) => {
      ctx.audio.unlock();
      const next = surprise(state);
      setState(next);
      haptic.tap();
      const r = el.getBoundingClientRect();
      bank(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    },
    [bank, ctx, state],
  );

  const onPlay = useCallback(() => {
    // Inside the tap, so iOS opens its gate. Without this the first play of a
    // session is silent and nothing on screen says why.
    ctx.audio.unlock();
    haptic.tap();
    setPlaying((p) => !p);
  }, [ctx]);

  const onVoice = useCallback(
    (voice: Voice) => {
      ctx.audio.unlock();
      const next = setVoice(state, voice);
      if (next === state) return;
      setState(next);
      haptic.tap();
      // Hear the new voice at once, on a note the tune actually contains, so
      // the button demonstrates itself rather than describing itself.
      ring(columnRows(next, 0)[0] ?? Math.floor(ROWS / 2), voice);
    },
    [ctx, ring, state],
  );

  /* ----------------------------------------------------------- the screen */

  const steps = state.steps;
  // Sized against the VIEWPORT, not this container, like every board here. On a
  // 390px phone the eight-beat grid comes out ~43px a square; the 62px cap
  // stops the four-beat one becoming enormous on a desktop and sits well under
  // what the 700px panel leaves (game-panel-clears-widest-board.test.ts).
  const cell = `min(${(88 / steps).toFixed(2)}vw, 7vh, 62px)`;

  const controlStyle = {
    height: 56,
    minWidth: 56,
    border: "none",
    borderRadius: "var(--radius-2)",
    background: "var(--surface-2)",
    color: "var(--text)",
    display: "grid",
    placeItems: "center",
    fontSize: 26,
    cursor: "pointer",
    touchAction: "none" as const,
  };

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: T.notes, value: notes },
        { icon: "trophy", label: ctx.t("best"), value: best ?? "-" },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={startLevel}
      onRestart={restart}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "10px 10px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            // The controls. LTR like the grid: these are positions a child
            // points at, and they sit under a strip that reads left to right.
            dir="ltr"
            style={{
              display: "flex",
              // The count is fixed but the WIDTH is not, and this container
              // clips rather than scrolls
              // (a-row-that-grows-with-the-catalog-must-wrap.md).
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <button
              type="button"
              aria-label={playing ? T.stop : T.play}
              onClick={onPlay}
              style={{
                ...controlStyle,
                flex: "1 1 120px",
                background: playing ? "var(--brand)" : "var(--brand-fill)",
                color: "#FFF7EC",
                fontSize: 30,
              }}
            >
              <Glyph d={playing ? STOP_D : PLAY_D} filled />
            </button>
            <button
              type="button"
              aria-label={T.surprise}
              onClick={(e) => onSurprise(e.currentTarget)}
              style={{ ...controlStyle, flex: "0 0 auto" }}
            >
              <Glyph d={SPARK_D} filled />
            </button>
            {VOICES.map((v) => (
              <button
                key={v}
                type="button"
                aria-label={T.voice[v]}
                aria-pressed={state.voice === v}
                onClick={() => onVoice(v)}
                style={{
                  ...controlStyle,
                  flex: "0 0 auto",
                  outline: state.voice === v ? "3px solid var(--brand)" : "none",
                  outlineOffset: -3,
                }}
              >
                <Glyph d={VOICE_D[v]} />
              </button>
            ))}
          </div>
          <b
            style={{
              fontSize: 15,
              fontFamily: "Fredoka, inherit",
              textAlign: "center",
              color: "var(--text-dim)",
            }}
          >
            {T.hint}
          </b>
        </div>
      }
    >
      <div
        className="ellaz-play-surface"
        // LTR, always. Time runs left to right in every notation there is, and
        // an RTL grid would lay beat 1 out on the visual right - so the tune a
        // child watched would play backwards against the one they drew
        // (rtl-spatial-grid-dir-ltr.md).
        dir="ltr"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${steps}, ${cell})`,
          // Explicit ROWS as well: without them a taller cell stretches its row
          // and the square grid deforms.
          gridTemplateRows: `repeat(${ROWS}, ${cell})`,
          gap: 4,
          padding: 6,
          background: WELL,
          borderRadius: 16,
          touchAction: "none",
        }}
      >
        {state.cells.map((on, i) => {
          const row = Math.floor(i / steps);
          const col = i % steps;
          const lit = head === col;
          return (
            <button
              key={i}
              type="button"
              // Every square reads the same without its beat and its colour, so
              // a screen reader could not tell 48 of them apart. One-based,
              // because nobody counts from zero out loud.
              aria-label={`${T.note(col + 1)} ${on ? T.on : T.off}`}
              aria-pressed={on}
              onClick={(e) => onCell(cellIndex(row, col, steps), e.currentTarget)}
              style={{
                minWidth: 0,
                minHeight: 0,
                padding: 0,
                border: "none",
                borderRadius: "26%",
                background: on ? ROW_COLORS[row] : lit ? WELL_HEAD : WELL_CELL,
                // A note under the playhead lifts rather than changes colour,
                // so the beat is legible without the tune appearing to change.
                transform: on && lit ? "scale(1.08)" : "none",
                boxShadow: on
                  ? "inset 0 2px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.22)"
                  : "none",
                transition: "background 0.1s ease, transform 0.1s ease",
                cursor: "pointer",
                touchAction: "none",
              }}
            />
          );
        })}
      </div>
    </GameChrome>
  );
}
