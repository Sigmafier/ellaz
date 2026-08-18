import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import type { Locale } from "@i18n/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { artGround, gameArt } from "@ui/gameArt";
import { haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { PICTURES } from "./pictures";
import {
  DIFFICULTIES,
  LEVELS,
  correctCount,
  isSolved,
  newGame,
  scoreReport,
  tapSlot,
  tapTray,
  type Difficulty,
  type JigsawState,
} from "./logic";

// The renderer. Every rule about what a tap DOES lives in logic.ts; this file
// owns the one thing the rules deliberately know nothing about — the picture.
//
// TAP, NEVER DRAG. `logic.ts` has no `drag(from, to)` at all: a tap picks a
// piece up and a tap on a slot puts it down. That is the kids rule in CLAUDE.md
// and it is also the accessible path — a five-year-old on a phone, and anyone
// on assistive input, cannot reliably hold a sustained pointer gesture. Drag
// may be added ON TOP of this later; it may never replace it.

const LEVEL_OPTIONS: DifficultyOption<Difficulty>[] = [
  { id: "easy", label: { he: "קל", en: "Easy", es: "Fácil" } },
  { id: "medium", label: { he: "בינוני", en: "Med", es: "Media" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// This game's own words, as a locale RECORD rather than a `locale === "he" ?`
// ternary - promoting a language reds this block by name instead of leaving the
// game speaking English inside a page that is not.
const WORDS: Record<
  Locale,
  {
    hint: string;
    done: string;
    pieces: string;
    placed: string;
    piece: (n: number) => string;
    slot: (n: number) => string;
    held: string;
  }
> = {
  he: {
    hint: "בחרו חלק, ואז הקישו איפה הוא יושב",
    done: "הרכבתם את התמונה!",
    pieces: "חלקים",
    placed: "במקום",
    piece: (n) => `חלק ${n}`,
    slot: (n) => `משבצת ${n}`,
    held: "נבחר",
  },
  en: {
    hint: "Pick a piece, then tap where it goes",
    done: "You built the picture!",
    pieces: "Pieces",
    placed: "In place",
    piece: (n) => `piece ${n}`,
    slot: (n) => `space ${n}`,
    held: "picked",
  },
  es: {
    hint: "Elige una pieza y toca dónde va",
    done: "¡Has armado la imagen!",
    pieces: "Piezas",
    placed: "En su sitio",
    piece: (n) => `pieza ${n}`,
    slot: (n) => `hueco ${n}`,
    held: "elegida",
  },
};

/* ------------------------------------------------------------- the snapshot */

/**
 * A puzzle in progress.
 *
 * NO REWARD LATCH, and that is a decision rather than an omission: this game
 * pays exactly once, when the picture is finished, and `live: false` CLEARS the
 * snapshot at that moment. So there is no stored state from which the win could
 * be collected a second time by leaving and coming back
 * (session-snapshot-convention.md).
 */
interface JigsawSession {
  state: JigsawState;
}

const SESSION: SessionSpec<JigsawSession> = {
  version: 1,
  validate: (value): value is JigsawSession => {
    const s = value as Partial<JigsawSession> | null;
    if (typeof s !== "object" || s === null) return false;

    const g = s.state as Partial<JigsawState> | null | undefined;
    if (typeof g !== "object" || g === null) return false;
    if (typeof g.level !== "string" || !(g.level in LEVELS)) return false;

    // The cut must match the LEVEL, not merely what the snapshot claims: the
    // CSS grid is built from the level, so a board of some other shape renders
    // as a grid whose cells and columns disagree — a plausible picture with no
    // error anywhere.
    const cfg = LEVELS[g.level as Difficulty];
    const count = cfg.cols * cfg.rows;
    if (g.cols !== cfg.cols || g.rows !== cfg.rows) return false;
    if (!Number.isInteger(g.picture)) return false;
    // A picture index from an older build with a longer list would read off the
    // end and render nothing at all.
    if ((g.picture as number) < 0 || (g.picture as number) >= PICTURES.length) return false;

    if (!Array.isArray(g.slots) || g.slots.length !== count) return false;
    if (!Array.isArray(g.tray)) return false;

    // THE INVARIANT: every piece in exactly one place. A snapshot that lost a
    // piece renders a hole nothing can fill, and one that duplicated a piece
    // renders a puzzle that can never be finished — both perfectly plausible
    // to look at, which is why this is checked rather than trusted.
    const placed = g.slots.filter((p): p is number => p !== null);
    const seen = [...g.tray, ...placed].sort((a, b) => a - b);
    if (seen.length !== count) return false;
    if (seen.some((p, i) => p !== i)) return false;

    // A held piece is always a TRAY piece — see `tapSlot`, where lifting
    // returns the piece to the tray in the same breath as selecting it.
    if (g.selected !== null) {
      if (!Number.isInteger(g.selected)) return false;
      if (!g.tray.includes(g.selected as number)) return false;
    }
    return typeof g.moves === "number" && Number.isFinite(g.moves) && g.moves >= 0;
  },
};

/* ---------------------------------------------------------------- the piece */

/**
 * One piece of the picture: a WINDOW onto the whole scene, not a slice of it.
 *
 * The inner element is the full drawing at board size, shifted so that the part
 * belonging to this piece is the part on screen, and the outer element clips.
 * That means no clip paths, no ids, no rasterising and no second copy of the
 * art — and it works with `gameArt`'s own `preserveAspectRatio="slice"` because
 * the inner box is exactly the 4:3 the scene is drawn on.
 *
 * The scenes carry no `<defs>`, gradients or filters, which is what makes
 * inlining the same SVG twenty times safe: there are no ids to collide.
 */
function Piece({
  picture,
  piece,
  cols,
  rows,
}: {
  picture: string;
  piece: number;
  cols: number;
  rows: number;
}) {
  const col = piece % cols;
  const row = Math.floor(piece / cols);
  return (
    <span
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${cols * 100}%`,
          height: `${rows * 100}%`,
          // Percentages against the CONTAINING block (one piece), so this is
          // "back up by exactly `col` pieces". A transform's percentages would
          // be against the element's own size, which is the whole board, and
          // would slide it a full board width instead.
          marginLeft: `${-col * 100}%`,
          marginTop: `${-row * 100}%`,
        }}
        dangerouslySetInnerHTML={{ __html: gameArt(picture) }}
      />
    </span>
  );
}

/* ----------------------------------------------------------------- the game */

export function JigsawGame({ ctx }: { ctx: GameContext }) {
  // The level a child last chose, VALIDATED against this game's own list - an id
  // no longer in the list resolves to -1 in GameChrome's findIndex and the
  // toggle silently disappears. Everything below reads `level`; a hardcoded
  // "easy" here would cut a six-piece board under chrome saying "Hard".
  const [level, setLevel] = useRememberedLevel(ctx, DIFFICULTIES, "easy");

  // Read ONCE, before the first render, so a resumed puzzle never flashes as a
  // fresh one. A finished picture is refused rather than restored: `live`
  // clears it on the way out, so a stored solved board could only come from a
  // build that wrote one.
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const resume =
    restored && restored.state.level === level && !isSolved(restored.state) ? restored : undefined;

  const [state, setState] = useState<JigsawState>(
    () => resume?.state ?? newGame(level, PICTURES.length),
  );
  const [best, setBest] = useState<number | undefined>(() => ctx.score?.best(level));
  /** The slot a piece just landed in, for one short pop. */
  const [popped, setPopped] = useState<number | null>(null);

  const startedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const startedAt = useRef(Date.now());

  const T = WORDS[ctx.locale];
  const solved = isSolved(state);
  const picture = PICTURES[state.picture] ?? PICTURES[0];
  const done = correctCount(state);

  // Cosmetic timers, tracked only so unmount can cancel them - a `setState`
  // firing into a torn-down game is a console error in front of a child.
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  // Cut a fresh puzzle at `next`. A new picture as well as a new cut, so
  // "again" is a different puzzle rather than the same one twice.
  const startLevel = useCallback(
    (next: Difficulty) => {
      setLevel(next);
      setState(newGame(next, PICTURES.length));
      setBest(ctx.score?.best(next));
      setPopped(null);
      startedAt.current = Date.now();
      ctx.analytics.levelStart(next);
    },
    [ctx, setLevel],
  );

  const restart = useCallback(() => startLevel(level), [startLevel, level]);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(level);
    }
  }, [ctx, level]);

  // An unfinished picture is worth coming back to; a finished one is not, so
  // `live: false` CLEARS rather than freezes. Restoring a solved puzzle would
  // show a child a board with nothing left to do and no way to understand why.
  useGameSession(ctx, SESSION, () => ({ state }), { live: !solved });

  /* ------------------------------------------------------------- the taps */

  const onTray = useCallback(
    (piece: number) => {
      ctx.audio.unlock();
      ctx.speech.unlock();
      const { state: next } = tapTray(state, piece);
      if (next.selected !== state.selected) {
        ctx.audio.play("tap");
        haptic.tap();
      }
      setState(next);
    },
    [ctx, state],
  );

  // Everything here runs in the HANDLER, never inside a setState updater:
  // React may run an updater twice, and a doubled `winMoment` is a doubled
  // grant - real coins, not a stray animation.
  const onSlot = useCallback(
    (slot: number, el: HTMLElement) => {
      if (solved) return;
      ctx.audio.unlock();
      ctx.speech.unlock();

      const { state: next, outcome } = tapSlot(state, slot);
      if (outcome.kind === "ignored") return;
      setState(next);

      if (outcome.kind === "lifted") {
        ctx.audio.play("tap");
        haptic.tap();
        return;
      }

      // A piece in the wrong place is not a mistake being scored - it is how a
      // jigsaw gets solved. So a wrong slot sounds the same as a right one and
      // says nothing; only the picture coming together is feedback.
      setPopped(slot);
      after(260, () => setPopped(null));
      ctx.audio.play(outcome.home ? "pop" : "tap");
      haptic.tap();

      if (!outcome.solved) return;

      // The one win this game has. It banks BEFORE any animation can throw, and
      // the score rides it, so the record and the reward are one decision.
      const r = el.getBoundingClientRect();
      const report = scoreReport(next, level);
      const won = winMoment(ctx, {
        reason: "level_complete",
        tier: level,
        level: `${level}-${picture}`,
        at: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        ms: Date.now() - startedAt.current,
        score: { value: report.value, unit: report.unit, board: report.board },
      });
      if (won.score) setBest(won.score.best);
    },
    [after, ctx, level, picture, solved, state],
  );

  /* ----------------------------------------------------------- the screen */

  const { cols, rows } = state;
  const trayPieceWidth = Math.round(240 / cols);

  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "layers", label: T.placed, value: `${done}/${state.slots.length}`, ltr: true },
        { icon: "bolt", label: ctx.t("moves"), value: state.moves },
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
            minHeight: 96,
          }}
        >
          <div
            // The tray. LTR like the board: these are positions a child points
            // at, and a row that mirrors between languages is a different row
            // (rtl-spatial-grid-dir-ltr.md).
            dir="ltr"
            style={{
              display: "flex",
              // The tray holds up to twenty pieces, so it WRAPS rather than
              // clipping - a-row-that-grows-with-the-catalog-must-wrap.md.
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              width: "100%",
            }}
          >
            {state.tray.map((piece) => {
              const held = state.selected === piece;
              return (
                <button
                  key={piece}
                  type="button"
                  aria-label={`${T.piece(piece + 1)}${held ? ` — ${T.held}` : ""}`}
                  aria-pressed={held}
                  onClick={() => onTray(piece)}
                  style={{
                    position: "relative",
                    width: trayPieceWidth,
                    aspectRatio: `${4 / cols} / ${3 / rows}`,
                    border: "none",
                    padding: 0,
                    borderRadius: 8,
                    background: artGround(picture),
                    outline: held ? "3px solid var(--brand)" : "none",
                    outlineOffset: 2,
                    transform: held ? "scale(0.94)" : "none",
                    transition: "transform 0.12s ease",
                    cursor: "pointer",
                    touchAction: "none",
                    overflow: "hidden",
                  }}
                >
                  <Piece picture={picture} piece={piece} cols={cols} rows={rows} />
                </button>
              );
            })}
          </div>
          <b
            style={{
              fontSize: 15,
              fontFamily: "Fredoka, inherit",
              textAlign: "center",
              color: "var(--text-dim)",
            }}
          >
            {solved ? T.done : T.hint}
          </b>
        </div>
      }
    >
      <div
        className="ellaz-play-surface"
        // LTR, always. The app is Hebrew RTL by default, so an RTL grid lays
        // column 0 out on the visual RIGHT and the picture assembles mirrored -
        // see rtl-spatial-grid-dir-ltr.md.
        dir="ltr"
        style={{
          position: "relative",
          // Sized against the VIEWPORT, not this container, like every board
          // here. 4:3 rather than square, because that is the shape every scene
          // in `@ui/gameArt` is drawn on and a jigsaw that letterboxes its own
          // picture is showing the wrong picture. 46vh leaves room for a tray
          // of twenty pieces under it. The 460px cap sits well under what the
          // 700px desktop panel leaves, so nothing grows a scrollbar inside it
          // (game-panel-clears-widest-board.test.ts).
          width: "min(92vw, 46vh, 460px)",
          aspectRatio: "4 / 3",
          boxSizing: "border-box",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          // Explicit ROWS as well: without them a taller cell stretches its row
          // and the picture deforms.
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 2,
          padding: 4,
          background: "var(--surface-2)",
          borderRadius: 14,
          touchAction: "none",
        }}
      >
        {state.slots.map((piece, i) => (
          <button
            key={i}
            type="button"
            // Twenty spaces that all read "space" are twenty a screen reader
            // cannot tell apart, so each carries its own column and row.
            // One-based, because nobody counts from zero out loud.
            aria-label={`${T.slot(i + 1)} ${(i % cols) + 1}, ${Math.floor(i / cols) + 1}${
              piece === null ? "" : ` — ${T.piece(piece + 1)}`
            }`}
            className={popped === i ? "ellaz-pop" : undefined}
            onClick={(e) => onSlot(i, e.currentTarget)}
            style={{
              position: "relative",
              minWidth: 0,
              minHeight: 0,
              border: "none",
              padding: 0,
              borderRadius: 6,
              background: piece === null ? "rgba(0,0,0,0.10)" : artGround(picture),
              cursor: "pointer",
              touchAction: "none",
              overflow: "hidden",
            }}
          >
            {piece === null ? null : (
              <Piece picture={picture} piece={piece} cols={cols} rows={rows} />
            )}
          </button>
        ))}
      </div>
    </GameChrome>
  );
}
