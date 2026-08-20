import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { GameContext, RewardTier, SessionSpec } from "@sdk/index";
import { textFor, type Locale } from "@i18n/index";
import { Button } from "@ui/components";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { shake, haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import {
  newGame,
  move,
  spawn,
  hasMoves,
  hasWon,
  LEVELS,
  type Grid,
  type Direction,
  type LevelKey,
} from "./logic";

const LEVEL_OPTIONS: DifficultyOption<LevelKey>[] = [
  { id: "kids", label: { he: "ילדים", en: "Kids", es: "Peques" } },
  { id: "classic", label: { he: "קלאסי", en: "Classic", es: "Clásico" } },
  { id: "hard", label: { he: "קשה", en: "Hard", es: "Difícil" } },
];

// The board sizes are the game's own vocabulary; the economy speaks in tiers.
const LEVEL_TIER: Record<LevelKey, RewardTier> = {
  kids: "easy",
  classic: "medium",
  hard: "hard",
};

const TILE_COLORS: Record<number, string> = {
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
};

function tileText(v: number): string {
  return v >= 8 ? "#f9f6f2" : "#5b5147";
}

/** What a skin paints on one non-empty tile. */
export interface SkinTile {
  /** The glyph drawn instead of the number. */
  glyph: string;
  /** Bilingual name, used as the tile's aria-label (a number reads itself; a glyph does not). */
  label: Record<Locale, string>;
  bg: string;
}

/**
 * An optional repaint of the board. ABSENT (the default) = today's numbers and
 * palette, unchanged — every skin-aware branch below falls back to the exact
 * literal it replaced, so the 2048 game renders and behaves identically.
 *
 * A skin owns its own value -> tile mapping, so this renderer never learns what
 * ladder a skinned game uses. `tile()` MUST be TOTAL over every positive value
 * (clamp at the top rung): a value it declines to map falls back to the number,
 * which is honest but off-theme.
 */
export interface TileSkin {
  boardBg: string;
  emptyBg: string;
  /** Bump the difficulty row to the age-5 touch target (kids games). */
  kids?: boolean;
  tile(value: number): SkinTile | null;
}

/**
 * A run in progress. 2048 is endless, so this is the shape where "the position"
 * is least obviously just the board.
 *
 * `won` and `bestFired` are the fields that make it correct rather than merely
 * plausible. Both are records of a reward this run has ALREADY been paid, and
 * both gate a `winMoment` further down. Drop either from the snapshot and
 * leaving the game becomes a way to be paid twice — reach 2048, walk out, come
 * back, and the next merge grants the win again. That is not a rounding error
 * in a kid's coin balance; it is an economy with a repeatable exploit, and it
 * would look exactly like the game working.
 *
 * `over` is deliberately NOT here. A dead board is not a position worth
 * returning to, so the run is cleared instead of stored — see `live` below.
 *
 * Evolve reuses this renderer under its OWN game id, so it gets its own
 * `ellaz:evolve:session` for free and the two never collide.
 */
interface Game2048Session {
  level: LevelKey;
  grid: Grid;
  score: number;
  won: boolean;
  bestFired: boolean;
}

const SESSION: SessionSpec<Game2048Session> = {
  version: 1,
  validate: (value): value is Game2048Session => {
    const s = value as Partial<Game2048Session> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.level !== "string" || !(s.level in LEVELS)) return false;
    if (typeof s.score !== "number" || !Number.isFinite(s.score) || s.score < 0) return false;
    if (typeof s.won !== "boolean" || typeof s.bestFired !== "boolean") return false;
    // Square, matching the level's own size, and numeric throughout. `move()`
    // reads every cell arithmetically, so a string in the grid propagates as
    // "22" instead of 4 and corrupts the run rather than throwing.
    const g = s.grid;
    const n = LEVELS[s.level].size;
    return (
      Array.isArray(g) &&
      g.length === n &&
      g.every(
        (row) =>
          Array.isArray(row) &&
          row.length === n &&
          row.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0),
      )
    );
  },
};

export function Game2048({ ctx, skin }: { ctx: GameContext; skin?: TileSkin }) {
  const [level, setLevel] = useRememberedLevel(ctx, LEVEL_OPTIONS.map((o) => o.id), "classic");
  const { size, target } = LEVELS[level];
  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  // Only a run at this level, still with moves in it. Both halves matter: a
  // 5x5 grid restored under a 4x4 level renders as a broken board, and a dead
  // one restores a game that cannot be played.
  const resume =
    restored && restored.level === level && restored.grid.length === size ? restored : undefined;

  const [grid, setGrid] = useState<Grid>(() => resume?.grid ?? newGame(size));
  const [score, setScore] = useState(() => resume?.score ?? 0);
  const [best, setBest] = useState(() => ctx.score?.best() ?? 0);
  const [won, setWon] = useState(() => resume?.won ?? false);
  const [over, setOver] = useState(false);
  const [mergedIdx, setMergedIdx] = useState<Set<number>>(() => new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // A once-per-run latch over the score port's verdict: every merge past the
  // old record is technically "a new best", so without the latch one good run
  // would mint a personal-best reward on every move.
  //
  // It is RESTORED rather than reset, because a resumed run is the same run.
  // Reset, a player who walks away above their old record collects the
  // personal-best reward again on their very next merge, once per resume,
  // forever. Same reasoning as `won` above: both are "this run already paid
  // for that", and a snapshot that drops them turns leaving the game into a
  // way to be paid twice.
  const bestFiredRef = useRef(resume?.bestFired ?? false);

  // Reset the game to a given level (board size + win target).
  const resetLevel = useCallback(
    (key: LevelKey) => {
      setLevel(key);
      setGrid(newGame(LEVELS[key].size));
      setScore(0);
      setWon(false);
      setOver(false);
      bestFiredRef.current = false;
      ctx.analytics.levelStart(key);
    },
    [ctx],
  );

  const reset = useCallback(() => resetLevel(level), [resetLevel, level]);

  // `live: !over` — a board with no moves left is cleared, so the next open
  // deals a fresh one rather than reopening a game that is already lost.
  useGameSession(
    ctx,
    SESSION,
    () => ({ level, grid, score, won, bestFired: bestFiredRef.current }),
    { live: !over },
  );

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart("endless");
    }
  }, [ctx]);

  // Everything here runs in the HANDLER, never inside a setGrid updater: React
  // may run an updater twice, which would double-grant the win.
  const doMove = useCallback(
    (dir: Direction) => {
      if (over) return;
      const res = move(grid, dir);
      if (!res.moved) return;
      ctx.audio.unlock();
      ctx.speech.unlock();
      const next = spawn(res.grid);
      setGrid(next);

      const el = boardRef.current;
      const r = el?.getBoundingClientRect();
      const centre = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;

      if (res.gained > 0) {
        const ns = score + res.gained;
        ctx.audio.play("success");
        haptic.tap();
        setScore(ns);
        if (ctx.score?.report({ value: ns, unit: "points" }).isPersonalBest) {
          setBest(ns);
          if (!bestFiredRef.current) {
            bestFiredRef.current = true;
            winMoment(ctx, {
              reason: "personal_best",
              level: `best-${ns}`,
              at: centre,
              confetti: false,
            });
          }
        }
        // Pulse each merged tile for tactile feedback.
        const idx = new Set(res.merged.map(([rr, cc]) => rr * size + cc));
        setMergedIdx(idx);
        setTimeout(() => setMergedIdx(new Set()), 260);
      }
      if (!won && hasWon(next, target)) {
        setWon(true);
        winMoment(ctx, {
          reason: "level_complete",
          tier: LEVEL_TIER[level],
          level: `reach-${target}`,
          at: centre,
        });
      }
      if (!hasMoves(next)) {
        setOver(true);
        ctx.audio.play("fail");
        if (el) shake(el);
        ctx.analytics.levelFail(level, "no-moves");
      }
    },
    [ctx, grid, score, over, won, size, target, level],
  );

  // Keyboard (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  // Swipe (touch) via Pointer Events on the board.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    let sx = 0,
      sy = 0,
      tracking = false;
    const down = (e: PointerEvent) => {
      tracking = true;
      sx = e.clientX;
      sy = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const up = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? "right" : "left");
      else doMove(dy > 0 ? "down" : "up");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
    };
  }, [doMove]);

  // The furthest a run has got. With a skin it is the CREATURE, not the number
  // behind it - evolve's whole premise is that the player is climbing a ladder
  // of animals, and "512" is the implementation detail under that.
  const topTile = Math.max(...grid.flat());
  const topPaint = topTile > 0 && skin ? skin.tile(topTile) : null;
  // This game's own words. A locale RECORD, so promoting a language reds
  // this block by name instead of leaving the game speaking English
  // inside a page that is not.
  const T = textFor(
    {
      he: { highest: "הכי גבוה", hint: "החליקו או חצים" },
      en: { highest: "Highest", hint: "Swipe or arrow keys" },
      es: { highest: "Más alto", hint: "Desliza o usa las flechas" },
    },
    ctx.locale,
  );
  return (
    <GameChrome
      ctx={ctx}
      stats={[
        { icon: "bolt", label: ctx.t("score"), value: score, record: best },
        {
          icon: "layers",
          label: T.highest,
          value: topPaint ? topPaint.glyph : topTile,
          ltr: true,
        },
      ]}
      levels={LEVEL_OPTIONS}
      level={level}
      onLevel={resetLevel}
      onRestart={reset}
      footer={
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-2)",
            boxShadow: "var(--shadow-1)",
            padding: "14px 12px",
            minHeight: 62,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <b style={{ fontSize: 17, fontFamily: "Fredoka, inherit" }}>
            {won ? ctx.t("youWon") : over ? ctx.t("gameOver") : T.hint}
          </b>
        </div>
      }
    >
      <div
        ref={boardRef}
        className="ellaz-play-surface"
        dir="ltr"
        style={{
          position: "relative",
          width: "min(88vw, 48vh, 420px)",
          aspectRatio: "1",
          background: skin ? skin.boardBg : "#bbada0",
          borderRadius: 14,
          padding: 10,
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`, // equal rows regardless of tile content
          gap: 10,
          touchAction: "none",
        }}
      >
        {grid.flat().map((v, i) => {
          // Null whenever there is no skin (the number path) or the tile is empty.
          const painted = v > 0 && skin ? skin.tile(v) : null;
          const emptyBg = skin ? skin.emptyBg : "rgba(238,228,218,0.35)";
          return (
            <div
              key={i}
              className={mergedIdx.has(i) ? "ellaz-merge" : undefined}
              // A number reads itself to a screen reader; a glyph needs the name.
              role={painted ? "img" : undefined}
              aria-label={painted ? painted.label[ctx.locale] : undefined}
              style={{
                display: "grid",
                placeItems: "center",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                background:
                  v === 0 ? emptyBg : painted ? painted.bg : TILE_COLORS[v] ?? "#3c3a32",
                borderRadius: 8,
                color: tileText(v),
                fontWeight: 800,
                lineHeight: 1,
                fontSize: painted
                  ? "clamp(24px,7vw,44px)"
                  : v >= 1024
                    ? "clamp(18px,5vw,30px)"
                    : "clamp(22px,7vw,40px)",
                transition: "background 0.12s ease",
              }}
            >
              {painted ? painted.glyph : v > 0 ? v : ""}
            </div>
          );
        })}

        {(won || over) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(20,22,44,0.72)",
              borderRadius: 14,
              gap: 16,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>{won ? "🎉" : "😅"}</div>
              <h2 style={{ margin: "8px 0" }}>{won ? ctx.t("youWon") : ctx.t("gameOver")}</h2>
              <Button onClick={reset}>{ctx.t("restart")}</Button>
            </div>
          </div>
        )}
      </div>
    </GameChrome>
  );
}
