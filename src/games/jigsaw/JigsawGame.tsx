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
  frameSides,
  isSolved,
  newGame,
  pieceEdges,
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
    guide: string;
    /** Two flat sides. */
    corner: string;
    /** One flat side. */
    edge: string;
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
    guide: "רמז",
    corner: "פינה",
    edge: "שוליים",
  },
  en: {
    hint: "Pick a piece, then tap where it goes",
    done: "You built the picture!",
    pieces: "Pieces",
    placed: "In place",
    piece: (n) => `piece ${n}`,
    slot: (n) => `space ${n}`,
    held: "picked",
    guide: "Hint",
    corner: "corner",
    edge: "edge",
  },
  es: {
    hint: "Elige una pieza y toca dónde va",
    done: "¡Has armado la imagen!",
    pieces: "Piezas",
    placed: "En su sitio",
    piece: (n) => `pieza ${n}`,
    slot: (n) => `hueco ${n}`,
    held: "elegida",
    guide: "Pista",
    corner: "esquina",
    edge: "borde",
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

/* ------------------------------------------------------------------ the rim */

/**
 * The flat outer edge of a frame piece, and the reason it exists.
 *
 * Every piece here was an identical rectangle, so the first thing anybody does
 * with a real jigsaw — pull the frame out of the pile and build the border —
 * could not be done at all, and the only way through the board was to try
 * pieces one at a time. `src/content/games/jigsaw.ts` has meanwhile been
 * telling players that "the four corners are the only pieces with two flat
 * sides", which was true of cardboard and false of this game.
 *
 * TWO cues, because either one alone is missable and they fail on different
 * backgrounds:
 *
 *   the BAND, drawn here — a strip of the art's own paper along each outward
 *   side, which is what an uncut edge looks like;
 *
 *   the SHAPE, drawn by `pieceRadius` below — a flat side runs corner to
 *   corner, so the corners it touches are square while every other corner
 *   stays round. That one survives a scene whose own background is pale, and
 *   it is visible in silhouette rather than needing to be looked at.
 *
 * The colour is a LITERAL rather than a theme token because it sits on the
 * art: `@ui/gameArt` scenes are drawn on their own paper and do not follow the
 * theme, so a rim that did would go dark on a drawing that did not. It is
 * `gameArt`'s own paper tone, copied rather than imported — that file reserves
 * `PAL` for the scenes themselves.
 *
 * MEASURED, and this is why the hairline is here: the band alone was invisible
 * in the tray. The tray card is `--surface`, which is `#fffdf8` in the light
 * theme — the same cream — so a paper band on a paper card read as nothing at
 * all, and the frame pieces looked exactly like the middle ones. The hairline
 * inside the band is what separates it from whatever it is lying on, and the
 * matching one on the button separates the piece from the card.
 */
const RIM = 4;
const RIM_PAPER = "#FFF7EC";
/** The band, told apart from the card under it. */
const RIM_HAIRLINE = "inset 0 0 0 1px rgba(36,28,59,0.28)";
/** The piece, told apart from the card under it. Not clipped by `overflow`. */
const PIECE_EDGE = "0 0 0 1px rgba(36,28,59,0.22)";

/**
 * Square where the cut is flat, round everywhere else.
 *
 * A corner of the piece is square when EITHER side meeting there is flat,
 * because a straight edge runs the full width of the piece — so a top-row
 * piece has a square top-left and top-right, and a corner piece has one
 * square corner facing the outside of the picture.
 */
function pieceRadius(piece: number, cols: number, rows: number, round: number): string {
  const e = pieceEdges(piece, cols, rows);
  const r = (a: boolean, b: boolean) => (a || b ? 2 : round);
  return [
    r(e.top, e.left),
    r(e.top, e.right),
    r(e.bottom, e.right),
    r(e.bottom, e.left),
  ]
    .map((n) => `${n}px`)
    .join(" ");
}

function Rim({ piece, cols, rows }: { piece: number; cols: number; rows: number }) {
  const e = pieceEdges(piece, cols, rows);
  const side = `${RIM}px solid ${RIM_PAPER}`;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        // The rim is decoration over a button that must stay tappable — a
        // 4 px frame swallowing the tap at the exact edge of a piece is the
        // kind of miss a five-year-old cannot diagnose.
        pointerEvents: "none",
        borderTop: e.top ? side : undefined,
        borderRight: e.right ? side : undefined,
        borderBottom: e.bottom ? side : undefined,
        borderLeft: e.left ? side : undefined,
        boxShadow: RIM_HAIRLINE,
      }}
    />
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
  /**
   * Whether the empty spaces show a ghost of the piece that belongs in them.
   *
   * ON by default, because the complaint this answers is that the board gives
   * no way to see how the pieces combine: twenty fragments of a drawing nobody
   * has seen whole is a memory test, not a jigsaw. The ghost is the box lid,
   * laid out in place rather than beside the board — it costs no layout space,
   * it is exactly aligned by construction, and each space stops showing one the
   * moment a piece covers it, so the board fills in with the real picture as it
   * is solved.
   *
   * It is a TOGGLE and not a level, so a child who wants the harder game can
   * turn it off without giving up the twenty-piece cut, and the choice is
   * remembered per device. It is deliberately NOT in the session snapshot: a
   * preference outlives one puzzle, and a snapshot is cleared the moment a
   * picture is finished.
   */
  const [guide, setGuide] = useState<boolean>(() => ctx.storage.get("guide", true));
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

  // Everything here runs in the HANDLER and reads `guide` from the closure
  // rather than from a `setState` updater. React may run an updater twice, and
  // a doubled write here would toggle the stored preference back — the setting
  // would flip on screen and be forgotten by the next visit.
  const toggleGuide = useCallback(() => {
    ctx.audio.unlock();
    const next = !guide;
    setGuide(next);
    ctx.storage.set("guide", next);
    ctx.audio.play("tap");
    haptic.tap();
  }, [ctx, guide]);

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

  /** " — corner" / " — edge", or nothing for a middle piece. */
  const frameWord = (piece: number) => {
    const sides = frameSides(piece, cols, rows);
    if (sides >= 2) return ` — ${T.corner}`;
    if (sides === 1) return ` — ${T.edge}`;
    return "";
  };

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
                  // The rim says "corner" to anyone who can see it. This says
                  // the same thing to anyone who cannot, which is the point of
                  // marking the frame at all — sorting the border out first is
                  // the strategy, not a decoration.
                  aria-label={`${T.piece(piece + 1)}${frameWord(piece)}${
                    held ? ` — ${T.held}` : ""
                  }`}
                  aria-pressed={held}
                  onClick={() => onTray(piece)}
                  style={{
                    position: "relative",
                    width: trayPieceWidth,
                    aspectRatio: `${4 / cols} / ${3 / rows}`,
                    border: "none",
                    padding: 0,
                    // Square where the cut is flat. `Piece` and `Rim` both
                    // inherit this, so the art and the band follow the shape.
                    borderRadius: pieceRadius(piece, cols, rows, 8),
                    background: artGround(picture),
                    boxShadow: PIECE_EDGE,
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
                  {/* The flat sides, so the frame can be pulled out of the
                      tray the way it is out of a box. */}
                  <Rim piece={piece} cols={cols} rows={rows} />
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // The catalogue's own wrapping rule: this row holds a sentence
              // whose length is a translator's decision, so it wraps rather
              // than pushing the button off a 390 px phone
              // (a-row-that-grows-with-the-catalog-must-wrap.md).
              flexWrap: "wrap",
              gap: 10,
            }}
          >
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
            <button
              type="button"
              // The guide is ON by default, so this button is how the harder
              // game is reached rather than how the easier one is. It says what
              // it controls and holds `aria-pressed`, because "eye" alone is a
              // symbol a child has to have been taught.
              aria-label={T.guide}
              aria-pressed={guide}
              onClick={toggleGuide}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                minHeight: 34,
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                fontSize: 14,
                fontFamily: "Fredoka, inherit",
                background: guide ? "var(--brand-fill)" : "var(--surface-2)",
                color: guide ? "var(--on-brand)" : "var(--text-dim)",
                cursor: "pointer",
              }}
            >
              {/* One glyph in both states — the pill's fill says which
                  state it is in, and a second emoji nobody recognises would
                  say it worse. */}
              <span aria-hidden="true">👁️</span>
              {T.guide}
            </button>
          </div>
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
              frameWord(i)
            }${piece === null ? "" : ` — ${T.piece(piece + 1)}`}`}
            className={popped === i ? "ellaz-pop" : undefined}
            onClick={(e) => onSlot(i, e.currentTarget)}
            style={{
              position: "relative",
              minWidth: 0,
              minHeight: 0,
              border: "none",
              padding: 0,
              borderRadius: pieceRadius(i, cols, rows, 6),
              // An empty space is a dark hole, EXCEPT under the guide - the
              // wash sits over the ghost and greys the one thing it is there
              // to show, and a space holding a ghost is not empty to look at.
              background:
                piece !== null
                  ? artGround(picture)
                  : guide
                    ? "transparent"
                    : "rgba(0,0,0,0.10)",
              cursor: "pointer",
              touchAction: "none",
              overflow: "hidden",
            }}
          >
            {piece === null ? (
              // THE GUIDE. A faint copy of the piece that belongs here, in the
              // place it belongs — so a child can see what the finished picture
              // is and where each fragment sits in it, which is the whole
              // question a tray of twenty rectangles could not answer. It is
              // covered the moment a real piece lands, so the board fills in
              // with the drawing rather than with a hint.
              guide ? (
                <span
                  aria-hidden="true"
                  // Faint enough to read as a hint rather than as the answer,
                  // strong enough that a tray piece can be matched to it. It is
                  // the picture's own colours at a fraction of their strength,
                  // so a placed piece reads as the same thing turned up.
                  style={{ position: "absolute", inset: 0, opacity: 0.34 }}
                >
                  <Piece picture={picture} piece={i} cols={cols} rows={rows} />
                </span>
              ) : null
            ) : (
              <Piece picture={picture} piece={piece} cols={cols} rows={rows} />
            )}
            {/* On the board too, so a frame piece and the space it belongs in
                carry the same mark and match by shape rather than by trial. */}
            <Rim piece={i} cols={cols} rows={rows} />
          </button>
        ))}
      </div>
    </GameChrome>
  );
}
