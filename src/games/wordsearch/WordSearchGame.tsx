import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AUTONYM, dirOf, textFor, type Locale } from "@i18n/index";
import { formatScore, type GameContext, type RewardTier, type SessionSpec } from "@sdk/index";
import { GameChrome, type ChromeLevel } from "@ui/GameChrome";
import { burst, haptic, shake } from "@juice/index";
import { useGameSession, useGameTimer, useRememberedLevel, winMoment } from "@shared/index";
import {
  LEVELS,
  LEVEL_IDS,
  alphabetOf,
  clearAnchor,
  colOf,
  contentLangOptions,
  everyWordOccurs,
  foundCount,
  isSolved,
  letters,
  lineBetween,
  newGame,
  resolve,
  rowOf,
  scoreFor,
  tap,
  textOn,
  type Cell,
  type LevelId,
  type WordSearchState,
} from "./logic";

/**
 * Which language the WORDS are in, remembered separately from the level and
 * under this game's own namespace.
 *
 * It is NOT the interface language. A Hebrew-speaking child can hunt English
 * words without every button on the screen changing around them, and an
 * English-speaking one is never handed a grid of letters they cannot read. The
 * same key `spell` and `letters` use, for the same reason.
 */
const LANG_KEY = "lang";

const LEVEL_LABELS: Record<LevelId, Record<Locale, string>> = {
  easy: { he: "קל", en: "Easy", es: "Fácil" },
  medium: { he: "בינוני", en: "Med", es: "Media" },
  hard: { he: "קשה", en: "Hard", es: "Difícil" },
};

/**
 * The level row, built FROM the logic's own list rather than beside it.
 *
 * `LEVEL_IDS` decides the order and `LEVEL_LABELS` is a `Record<LevelId, …>`, so
 * adding a tier to `logic.ts` reds this file by name instead of shipping a
 * difficulty the toggle cannot reach.
 */
const LEVEL_OPTIONS: ChromeLevel<LevelId>[] = LEVEL_IDS.map((id) => ({
  id,
  label: LEVEL_LABELS[id],
}));

/**
 * Two vocabularies that happen to spell the same three words today.
 *
 * A level is a grid size and a direction set; a tier is what the economy pays
 * for it. Written out rather than passed straight through, so the day this game
 * gains an "expert" the compiler asks what that is worth instead of quietly
 * handing `grant()` a tier it has never heard of.
 */
const LEVEL_TIER: Record<LevelId, RewardTier> = {
  easy: "easy",
  medium: "medium",
  hard: "hard",
};

/* -------------------------------------------------------------- the palette */

/**
 * The colours a found word is marked in, taken in list order.
 *
 * Ten, for the ten words of the hardest tier, and spread across LIGHTNESS as
 * well as hue. A word search cannot stop using colour to tell one marked word
 * from another, but two marks a red-green colour-blind player reads as one hue
 * are still a pale one and a dark one - and on a crowded board two words often
 * cross, so the pair has to be told apart at the crossing itself.
 */
const MARKS: readonly string[] = [
  "#F2B705",
  "#2E4FB8",
  "#E4572E",
  "#12A594",
  "#C64191",
  "#5B3FA8",
  "#7FB800",
  "#B23A3A",
  "#0B7189",
  "#D6704B",
];

/* ---------------------------------------------------------------- the board */

/**
 * A square's size, against the VIEWPORT and never the container - the house rule
 * for every board here.
 *
 * The vw and vh terms are computed into variables rather than interpolated
 * inline so the whole `min(...)` reads as one uninterrupted expression, which is
 * what `game-panel-clears-widest-board.test.ts` scans for.
 *
 * 44px is the cap at every tier rather than one per tier, so the arithmetic has
 * a single answer: the widest board is `12 x 44 = 528px` plus eleven 2px gaps,
 * which is 550 inside the 684px the desktop panel leaves. On a 390px phone the
 * vw term binds instead - 7vw on hard is ~27px, so the board is ~350px.
 */
function cellSize(size: number): string {
  const vw = (84 / size).toFixed(2);
  const vh = (46 / size).toFixed(2);
  return `min(${vw}vw, ${vh}vh, 44px)`;
}

const CELL_GAP = 2;

/* -------------------------------------------------------------- the session */

/**
 * A hunt in progress: the tier, the language of the words, the whole board, and
 * the clock.
 *
 * THE CLOCK IS THE HALF THAT IS EASY TO LEAVE OUT, and leaving it out turns
 * every abandoned board into a personal best nobody earned - the record here IS
 * the time. `useGameTimer({ initialMs })` is the other end of that promise.
 *
 * THERE IS NO REWARD LATCH IN THIS SNAPSHOT, and that is a fact about the game
 * rather than an omission. The only grant is the single `level_complete` at the
 * end, a solved board is never handed back (`live: !won` clears it, and the
 * guard at the mount refuses one anyway), so there is nothing this run has
 * already been paid for. The day this game pays a coin per word found, that
 * latch belongs here or leaving and returning becomes a way to be paid twice.
 *
 * AND NO STATE HERE CAN ONLY BE LEFT BY A TIMER. The flash on a freshly found
 * word lives in React state in the component, never in the snapshot: stored, it
 * would come back with no timer behind it and the board would sit lit up
 * forever. Same trap `memory`'s mismatch lock had to be settled out of.
 */
interface WordSearchSession {
  level: LevelId;
  lang: Locale;
  state: WordSearchState;
  elapsedMs: number;
}

const SESSION: SessionSpec<WordSearchSession> = {
  version: 1,
  validate: (value): value is WordSearchSession => {
    const s = value as Partial<WordSearchSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (typeof s.elapsedMs !== "number" || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0)
      return false;

    const spec = LEVELS[s.level as LevelId];
    const g = s.state;
    if (typeof g !== "object" || g === null) return false;
    if (g.lang !== s.lang) return false;
    // Everything the renderer sizes itself from reads off the LEVEL, so a board
    // of some other shape lays out as a grid whose columns and squares disagree.
    if (g.size !== spec.size) return false;

    let alphabet: ReadonlySet<string>;
    try {
      alphabet = alphabetOf(g.lang);
    } catch {
      return false; // a language this build does not have words for
    }
    const cells = spec.size * spec.size;
    if (!Array.isArray(g.grid) || g.grid.length !== cells) return false;
    if (!g.grid.every((ch) => typeof ch === "string" && alphabet.has(ch))) return false;

    if (!Array.isArray(g.words) || g.words.length === 0 || g.words.length > spec.words) return false;
    if (!g.words.every((w) => typeof w === "string" && w.length > 0)) return false;
    if (!Array.isArray(g.found) || g.found.length !== g.words.length) return false;

    for (let i = 0; i < g.found.length; i++) {
      const marks = g.found[i];
      if (marks === null) continue;
      if (!Array.isArray(marks) || marks.length < 2) return false;
      if (!marks.every((c) => Number.isInteger(c) && c >= 0 && c < cells)) return false;
      // The marks are drawn as a line, so they had better be one. A hand-edited
      // save that scattered them would paint squares nothing connects and leave
      // a word "found" in a place it is not.
      const line = lineBetween(spec.size, marks[0], marks[marks.length - 1]);
      if (line === null || line.length !== marks.length) return false;
      if (!line.every((c, k) => c === marks[k])) return false;
      const text = textOn(g as WordSearchState, marks);
      const back = letters(text).reverse().join("");
      if (text !== g.words[i] && back !== g.words[i]) return false;
    }

    if (g.anchor !== null && !(Number.isInteger(g.anchor) && g.anchor >= 0 && g.anchor < cells))
      return false;

    // THE STRICTEST CHECK, AND THE ONE WORTH THE LINES. Everything above says
    // the save is well formed; this says the puzzle is still solvable. A grid
    // whose letters were truncated or edited would render perfectly and hold a
    // list containing a word that is not there - which is the exact failure this
    // whole game is built words-first to prevent, arriving by the back door.
    return everyWordOccurs(g as WordSearchState);
  },
};

/* ----------------------------------------------------------------- the game */

export function WordSearchGame({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useRememberedLevel(
    ctx,
    LEVEL_OPTIONS.map((o) => o.id),
    "easy",
  );

  // Games always receive the app locale narrowed to a shipped one (he/en/es), so
  // "the interface is Hebrew" is exactly `ctx.locale === "he"` - decided inside
  // `contentLangOptions` as data rather than as a branch here.
  const langOptions = contentLangOptions(ctx.locale);
  const [lang, setLang] = useState<Locale>(() => {
    const stored = ctx.storage.get<unknown>(LANG_KEY, null);
    return typeof stored === "string" && (langOptions as readonly string[]).includes(stored)
      ? (stored as Locale)
      : langOptions[0];
  });

  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Adopted only for the tier AND the language this mount opened on, and never
  // once it is solved: a finished board has nothing left to find, and returning
  // to one reads as the game having failed to deal a puzzle.
  const resume =
    restored && restored.level === level && restored.lang === lang && !isSolved(restored.state)
      ? restored
      : undefined;

  // Nothing is half-selected on the way back in. A restored `anchor` would leave
  // a selection open in the hand of a child who has not touched the screen yet,
  // and their next tap anywhere would try to finish a word they have no memory
  // of starting.
  const [state, setState] = useState<WordSearchState>(() =>
    resume ? clearAnchor(resume.state) : newGame(level, lang),
  );
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** The word just found, so it can flash. Never persisted - see the session. */
  const [flash, setFlash] = useState<number | null>(null);
  /** The line under the finger during a drag. Purely a preview. */
  const [preview, setPreview] = useState<Cell[] | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const timer = useGameTimer(ctx, { running: !won, initialMs: resume?.elapsedMs });

  // The found-word chip springs and settles. A RENDERER-ONLY state with a timer
  // behind it, which is exactly why it is not in the snapshot: stored, it would
  // come back with no timer left to clear it and the chip would sit enlarged for
  // good. Same trap `memory` had to settle its mismatch lock out of.
  useEffect(() => {
    if (flash === null) return;
    const id = window.setTimeout(() => setFlash(null), 380);
    return () => window.clearTimeout(id);
  }, [flash]);

  /**
   * The live board, mirrored out of React.
   *
   * A drag delivers pointer events faster than React re-renders, so two of them
   * in one frame would both read the same stale `state` out of the closure and
   * the second would overwrite the first. Every handler reads this ref and
   * writes through `apply`.
   */
  const live = useRef(state);
  const apply = useCallback((next: WordSearchState) => {
    live.current = next;
    setState(next);
  }, []);

  const holding = useRef(false);
  const dragged = useRef(false);
  const lastCell = useRef<Cell | null>(null);

  useGameSession(ctx, SESSION, () => ({ level, lang, state: live.current, elapsedMs: timer.elapsedMs }), {
    live: !won,
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  const centreOf = useCallback((cell: Cell | null) => {
    const el =
      cell === null
        ? boardRef.current
        : boardRef.current?.querySelector(`[data-cell="${cell}"]`);
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  }, []);

  const restart = useCallback(
    (lv: LevelId = level, lg: Locale = lang) => {
      setLevel(lv);
      setLang(lg);
      ctx.storage.set(LANG_KEY, lg);
      apply(newGame(lv, lg));
      setWon(false);
      setFlash(null);
      setPreview(null);
      setBest(ctx.score?.best(lv));
      timer.reset();
      holding.current = false;
      dragged.current = false;
      lastCell.current = null;
      ctx.analytics.levelStart(lv);
    },
    [apply, ctx, lang, level, setLevel, timer],
  );

  /**
   * React to whatever the rules just said.
   *
   * From the handler flow and never from inside a `setState` updater - React may
   * run an updater twice, and this one grants coins (see the rewards rule).
   */
  const announce = useCallback(
    (next: WordSearchState, outcome: ReturnType<typeof tap>["outcome"]) => {
      if (outcome.kind === "anchored") {
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }
      if (outcome.kind === "cleared") {
        ctx.audio.play("tap");
        return;
      }
      if (outcome.kind === "missed") {
        // A refusal is not a scolding. The board twitches, nothing is lost, and
        // the game says nothing about what was wrong with the guess.
        const el = boardRef.current;
        if (el) shake(el, 3, 140);
        return;
      }
      if (outcome.kind !== "found") return;

      ctx.audio.play("pop");
      haptic.tap();
      setFlash(outcome.index);
      const at = centreOf(outcome.cells[Math.floor(outcome.cells.length / 2)]);
      if (at) burst(at.x, at.y, { count: 8 });

      if (!isSolved(next)) return;

      setWon(true);
      ctx.audio.play("success");
      const solvedMs = timer.elapsedMs;
      const middle = centreOf(null);
      const result = winMoment(ctx, {
        reason: "level_complete",
        tier: LEVEL_TIER[level],
        level,
        at: middle,
        // A real duration, because this game really does keep a clock. Passing a
        // count here would be logged as milliseconds, which this repo has
        // shipped twice.
        ms: solvedMs,
        score: scoreFor(solvedMs, level),
      });
      if (result.score) setBest(result.score.best);
    },
    [centreOf, ctx, level, timer],
  );

  /**
   * A tap on a square - the complete path through this game.
   *
   * Touch the first letter, touch the last. Drag is layered on exactly these
   * calls and is never required, because a five-year-old on a phone and anybody
   * on assistive input cannot reliably hold a gesture across twelve squares. The
   * keyboard reaches this same function from Enter and Space.
   */
  const onCell = useCallback(
    (cell: Cell) => {
      if (won) return;
      ctx.audio.unlock();
      const step = tap(live.current, cell);
      if (step.outcome.kind === "ignored") return;
      apply(step.state);
      announce(step.state, step.outcome);
    },
    [announce, apply, ctx, won],
  );

  /**
   * Which square the finger is over now.
   *
   * `setPointerCapture` sends every later move to the element the gesture
   * STARTED on, so `onPointerEnter` on the neighbours never fires and the
   * position has to be read off the document instead. That is the price of the
   * capture, and the capture is what keeps a fast drag from being dropped the
   * moment it leaves a 27px target.
   */
  const cellUnder = (x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y);
    const holder = el instanceof Element ? el.closest("[data-cell]") : null;
    if (!(holder instanceof HTMLElement) || holder.dataset.cell === undefined) return null;
    return Number(holder.dataset.cell);
  };

  const onMove = useCallback((x: number, y: number) => {
    if (!holding.current) return;
    const cell = cellUnder(x, y);
    if (cell === null || cell === lastCell.current) return;
    lastCell.current = cell;
    dragged.current = true;
    const anchor = live.current.anchor;
    setPreview(anchor === null ? null : lineBetween(live.current.size, anchor, cell));
  }, []);

  const onLift = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    const cell = lastCell.current;
    lastCell.current = null;
    setPreview(null);
    // A plain tap leaves the selection OPEN so the next tap can finish it; only
    // a drag ends when the finger does. Without that split, tap-to-select would
    // close on the first square and the two-tap path would not exist.
    if (!dragged.current) return;
    dragged.current = false;
    if (cell === null || won) return;
    const step = resolve(live.current, cell);
    if (step.outcome.kind === "ignored") return;
    apply(step.state);
    announce(step.state, step.outcome);
  }, [announce, apply, won]);

  /* -------------------------------------------------------------- the view */

  const size = state.size;
  const cell = cellSize(size);
  const done = foundCount(state);

  /** Which word, if any, has claimed each square. Derived, never stored. */
  const marks = useMemo(() => {
    const out = new Map<Cell, number>();
    state.found.forEach((cells, i) => {
      if (!cells) return;
      for (const c of cells) if (!out.has(c)) out.set(c, i);
    });
    return out;
  }, [state.found]);

  const previewSet = useMemo(() => new Set(preview ?? []), [preview]);

  // This game's own words. A locale RECORD, so promoting a language reds this
  // block by name instead of leaving the game speaking English inside a page
  // that is not.
  const T = textFor(
    {
      he: {
        words: "מילים",
        start: "נגעו באות הראשונה של מילה, ואז באחרונה",
        picking: "עכשיו נגעו באות האחרונה",
        language: "שפת המילים",
      },
      en: {
        words: "Words",
        start: "Tap the first letter of a word, then its last",
        picking: "Now tap the last letter",
        language: "Word language",
      },
      es: {
        words: "Palabras",
        start: "Toca la primera letra de una palabra y luego la última",
        picking: "Ahora toca la última letra",
        language: "Idioma de las palabras",
      },
    },
    ctx.locale,
  );

  const hint = won ? `${ctx.t("youWon")} 🎉` : state.anchor !== null ? T.picking : T.start;

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        {
          icon: "clock",
          label: ctx.t("time"),
          value: formatScore(timer.elapsedMs, "ms"),
          ltr: true,
          record: best === undefined ? "-" : formatScore(best, "ms"),
        },
        {
          icon: "check",
          label: T.words,
          value: `${done}/${state.words.length}`,
          ltr: true,
          compact: true,
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={(lv) => restart(lv)}
      onRestart={() => restart()}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <div
            style={{
              color: "var(--text-dim)",
              fontSize: 13,
              textAlign: "center",
              minHeight: 20,
              padding: "0 6px",
            }}
          >
            {hint}
          </div>
          {/* The content-language toggle, labelled with each language's own
              autonym so it reads the same whatever the interface language is. */}
          <div
            dir="ltr"
            role="group"
            aria-label={T.language}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}
          >
            {langOptions.map((option) => {
              const on = option === lang;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => restart(level, option)}
                  style={{
                    minWidth: 64,
                    minHeight: 44,
                    border: on ? "3px solid var(--brand)" : "3px solid transparent",
                    borderRadius: "var(--radius-2)",
                    background: on ? "var(--brand)" : "var(--surface)",
                    color: on ? "#fff" : "var(--text)",
                    boxShadow: "var(--shadow-1)",
                    fontFamily: "Fredoka, inherit",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    padding: "0 10px",
                  }}
                >
                  {AUTONYM[option]}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        {/* `dir="ltr"`, because this board's POSITION is meaningful: a square is
            indexed `row * size + col`, so mirroring the grid under Hebrew would
            put every column somewhere the rules do not believe it is. The WORDS
            still read the right way round, because `logic.ts` plants Hebrew
            right-to-left INSIDE this left-to-right grid.
            See .claude/rules/rtl-spatial-grid-dir-ltr.md. */}
        <div
          ref={boardRef}
          dir="ltr"
          className="ellaz-play-surface"
          onPointerMove={(e) => onMove(e.clientX, e.clientY)}
          onPointerUp={onLift}
          onPointerCancel={onLift}
          style={
            {
              ["--cell" as string]: cell,
              display: "grid",
              gridTemplateColumns: `repeat(${size}, var(--cell))`,
              gridTemplateRows: `repeat(${size}, var(--cell))`,
              justifyContent: "center",
              gap: CELL_GAP,
              padding: 6,
              borderRadius: "var(--radius-3)",
              background: "rgba(255,255,255,0.05)",
              touchAction: "none",
            } as CSSProperties
          }
        >
          {Array.from({ length: size * size }, (_, i) => {
            const owner = marks.get(i);
            const hue = owner === undefined ? undefined : MARKS[owner % MARKS.length];
            const anchored = state.anchor === i;
            const inPreview = previewSet.has(i);
            return (
              <button
                key={i}
                type="button"
                data-cell={i}
                aria-label={`${state.grid[i]}, row ${rowOf(i, size) + 1} column ${colOf(i, size) + 1}`}
                // Pointer Events, and the capture with them: a drag that begins
                // on a square belongs to this board even if the finger leaves a
                // 27px target before it lifts. `click` is deliberately NOT
                // listened to - it would fire a second time after this one.
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  holding.current = true;
                  dragged.current = false;
                  lastCell.current = i;
                  setPreview(null);
                  onCell(i);
                }}
                // ...which leaves the keyboard, since a <button> reaches its own
                // onClick from Enter and Space and we are not listening there.
                // This is the third complete route through the game: every move
                // can be made without a pointer at all.
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  onCell(i);
                }}
                style={{
                  width: "var(--cell)",
                  height: "var(--cell)",
                  padding: 0,
                  border: "none",
                  borderRadius: "calc(var(--cell) * 0.2)",
                  background: hue ?? (inPreview ? "var(--brand)" : "rgba(255,255,255,0.08)"),
                  boxShadow: anchored ? "inset 0 0 0 3px var(--brand)" : undefined,
                  color: hue || inPreview ? "#fff" : "var(--text)",
                  fontFamily: "Fredoka, inherit",
                  fontWeight: 700,
                  fontSize: "calc(var(--cell) * 0.52)",
                  lineHeight: 1,
                  cursor: "pointer",
                  touchAction: "none",
                  transition: "background 0.12s ease",
                }}
              >
                {state.grid[i]}
              </button>
            );
          })}
        </div>

        {/* The list. Its direction follows the WORDS, not the interface: a
            Hebrew word list inside an English page still reads right to left. */}
        <ul
          dir={dirOf(lang)}
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            justifyContent: "center",
            maxWidth: "min(96vw, 560px)",
          }}
        >
          {state.words.map((word, i) => {
            const got = state.found[i] !== null;
            return (
              <li
                key={word}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-pill)",
                  background: got ? MARKS[i % MARKS.length] : "var(--surface)",
                  color: got ? "#fff" : "var(--text)",
                  boxShadow: "var(--shadow-1)",
                  fontFamily: "Fredoka, inherit",
                  fontWeight: 700,
                  fontSize: 15,
                  // Struck through as well as coloured, so a found word is
                  // marked by SHAPE and not by colour alone.
                  textDecoration: got ? "line-through" : undefined,
                  opacity: got ? 0.85 : 1,
                  transform: flash === i ? "scale(1.12)" : undefined,
                  transition: "transform 0.18s ease, background 0.18s ease",
                }}
              >
                {word}
              </li>
            );
          })}
        </ul>
      </div>
    </GameChrome>
  );
}
