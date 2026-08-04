import { useEffect, useRef, useState } from "react";
import type { GameContext } from "@sdk/index";
import { Button } from "@ui/components";
import { haptic } from "@juice/index";
import { winMoment } from "@shared/index";
import { PICTURES, PALETTE } from "./pictures";

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

  const nextPicture = () => {
    const ni = (picIdx + 1) % PICTURES.length;
    setPicIdx(ni);
    setFills({});
    ctx.analytics.levelStart(PICTURES[ni].id);
  };

  const clearPage = () => setFills({});

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center", maxWidth: "100%" }}>
        <Button variant="ghost" kids ariaLabel="clear" onClick={clearPage}>
          🧽
        </Button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>{pic.name[ctx.locale]}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
            {picIdx + 1}/{PICTURES.length}
          </div>
        </div>
        <Button variant="ghost" kids ariaLabel="next picture" onClick={nextPicture}>
          ➡
        </Button>
      </div>

      <div
        className="ellaz-play-surface"
        style={{
          width: "min(88vw, 58vh, 380px)",
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

      {/* Color palette — big swatches, tap to select. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          width: "min(88vw, 380px)",
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
      <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{ctx.t("pickColor")} 🎨</div>
    </div>
  );
}
