import { useEffect, useRef, useState, useCallback } from "react";
import type { GameContext, RewardTier } from "@sdk/index";
import { Button, Stat } from "@ui/components";
import { DifficultySelector, type DifficultyOption } from "@ui/DifficultySelector";
import { shake, haptic } from "@juice/index";
import { winMoment } from "@shared/index";
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
  { id: "kids", label: { he: "ילדים", en: "Kids" } },
  { id: "classic", label: { he: "קלאסי", en: "Classic" } },
  { id: "hard", label: { he: "קשה", en: "Hard" } },
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

export function Game2048({ ctx }: { ctx: GameContext }) {
  const [level, setLevel] = useState<LevelKey>("classic");
  const { size, target } = LEVELS[level];
  const [grid, setGrid] = useState<Grid>(() => newGame(size));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => ctx.storage.get("best", 0));
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const [mergedIdx, setMergedIdx] = useState<Set<number>>(() => new Set());
  const boardRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Authoritative best + a once-per-run latch: every merge past the old record
  // is technically "a new best", so without the latch one good run would mint a
  // personal-best reward on every move.
  const bestRef = useRef(best);
  const bestFiredRef = useRef(false);

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
        if (ns > bestRef.current) {
          bestRef.current = ns;
          ctx.storage.set("best", ns);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 16 }}>
      <DifficultySelector
        options={LEVEL_OPTIONS}
        value={level}
        onChange={resetLevel}
        locale={ctx.locale}
      />

      <div style={{ display: "flex", gap: 10 }}>
        <Stat label={ctx.t("score")} value={score} />
        <Stat label={ctx.t("best")} value={best} />
        <Button variant="ghost" onClick={reset}>
          {ctx.t("restart")}
        </Button>
      </div>

      <div
        ref={boardRef}
        className="ellaz-play-surface"
        dir="ltr"
        style={{
          position: "relative",
          width: "min(88vw, 62vh, 420px)",
          aspectRatio: "1",
          background: "#bbada0",
          borderRadius: 14,
          padding: 10,
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`, // equal rows regardless of tile content
          gap: 10,
          touchAction: "none",
        }}
      >
        {grid.flat().map((v, i) => (
          <div
            key={i}
            className={mergedIdx.has(i) ? "ellaz-merge" : undefined}
            style={{
              display: "grid",
              placeItems: "center",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              background: v === 0 ? "rgba(238,228,218,0.35)" : TILE_COLORS[v] ?? "#3c3a32",
              borderRadius: 8,
              color: tileText(v),
              fontWeight: 800,
              lineHeight: 1,
              fontSize: v >= 1024 ? "clamp(18px,5vw,30px)" : "clamp(22px,7vw,40px)",
              transition: "background 0.12s ease",
            }}
          >
            {v > 0 ? v : ""}
          </div>
        ))}

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
      <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
        {ctx.dir === "rtl" ? "החליקו או חצים" : "Swipe or arrow keys"}
      </div>
    </div>
  );
}
