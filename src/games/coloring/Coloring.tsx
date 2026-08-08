import { useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { GameChrome } from "@ui/GameChrome";
import { type DifficultyOption } from "@ui/DifficultySelector";
import { haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { PICTURES, PALETTE } from "./pictures";

// The picture chooser rides the chrome's level toggle, because it is exactly
// that shape: one card showing the CURRENT picture, each tap advancing to the
// next. Twelve pictures is past the dot threshold, so the toggle shows "3/12".
const PICTURE_OPTIONS: DifficultyOption<string>[] = PICTURES.map((p) => ({
  id: p.id,
  label: p.name,
}));

// SVG region-fill coloring. Tap a color, tap a region — the region fills.
// Live SVG (not canvas) because per-region fill IS the mechanic here.
export function Coloring({ ctx }: { ctx: GameContext }) {
  const [picIdx, setPicIdx] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const started = useRef(false);
  const pic = PICTURES[picIdx];

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      ctx.lifecycle.gameplayStart();
      ctx.analytics.levelStart(pic.id);
    }
  }, [ctx, pic.id]);

  // The win is decided HERE, in the handler — never inside a setFills updater.
  // React may run an updater twice, which would double-count the picture.
  const paint = (regionId: string, el: SVGPathElement) => {
    ctx.audio.unlock();
    ctx.speech.unlock();
    ctx.audio.play("pop");
    haptic.tap();
    const nf = { ...fills, [regionId]: color };
    const wasComplete = pic.regions.every((r) => fills[r.id]);
    const nowComplete = pic.regions.every((r) => nf[r.id]);
    setFills(nf);
    if (!wasComplete && nowComplete) {
      // Coins fly from the region that completed the picture.
      const r = el.getBoundingClientRect();
      winMoment(ctx, {
        reason: "level_complete",
        tier: "easy",
        level: pic.id,
        at: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      });
    }
    ctx.analytics.track("region_filled", { picture: pic.id, region: regionId });
  };

  // Takes the picture to GO TO, rather than computing "the next one" itself.
  // The toggle already decides what next means, and a second copy of that
  // arithmetic here would be right today and wrong the first time either side
  // learns to skip, shuffle, or remember where the child left off.
  const goToPicture = (id: string) => {
    const ni = Math.max(0, PICTURES.findIndex((p) => p.id === id));
    setPicIdx(ni);
    setFills({});
    ctx.analytics.levelStart(PICTURES[ni].id);
  };

  const clearPage = () => setFills({});

  return (
    <GameChrome
      ctx={ctx}
      // Coloring keeps NO record and never will - ranking a child's drawing is
      // the opposite of this platform's premise (see score-contract-convention).
      // So there is no stat row here at all, rather than an empty one.
      stats={[]}
      levels={PICTURE_OPTIONS}
      level={pic.id}
      onLevel={goToPicture}
      // Restart = wipe this drawing, not skip to another picture. A child who
      // wants a clean sheet of the SAME house would otherwise lose the house.
      onRestart={clearPage}
      footer={
        /* auto-fit, NOT a hard `repeat(6, 1fr)`. Every swatch carries a 44px
           minimum (the tap floor) and aspect-ratio 1, so six of them plus five
           gaps need 314px - more than a 320px phone has left after the frame's
           gutters. The old fixed six overflowed and pushed the first column off
           the left edge, where the frame clipped it: two colours simply
           unreachable, and only on the smallest screens. auto-fit drops to a
           second row instead of shrinking below the tap floor. */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))",
            gap: 10,
            width: "100%",
          }}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              aria-label={`color ${c}`}
              aria-pressed={color === c}
              onClick={() => {
                setColor(c);
                ctx.audio.play("tap");
              }}
              style={{
                aspectRatio: "1",
                minHeight: 44,
                borderRadius: 12,
                border: color === c ? "4px solid var(--text)" : "2px solid rgba(255,255,255,0.25)",
                background: c,
                boxShadow: "var(--shadow-1)",
              }}
            />
          ))}
        </div>
      }
    >
      <div
        className="ellaz-play-surface"
        style={{
          width: "min(88vw, 44vh, 380px)",
          aspectRatio: "1",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "var(--shadow-1)",
          overflow: "hidden",
        }}
      >
        <svg viewBox={pic.viewBox} width="100%" height="100%" style={{ display: "block" }}>
          {pic.regions.map((r) => (
            <path
              key={r.id}
              d={r.d}
              fill={fills[r.id] ?? "#f4f4f8"}
              stroke="#2d3436"
              strokeWidth={2}
              strokeLinejoin="round"
              onPointerDown={(e) => paint(r.id, e.currentTarget)}
              style={{ cursor: "pointer" }}
            />
          ))}
          {/* Decorative strokes (whiskers, antennae) — drawn on top, not fillable. */}
          {pic.outlines?.map((d, i) => (
            <path
              key={`outline-${i}`}
              d={d}
              fill="none"
              stroke="#2d3436"
              strokeWidth={2}
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          ))}
        </svg>
      </div>

    </GameChrome>
  );
}
