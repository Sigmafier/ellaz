import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";
import { textFor } from "@i18n/index";
import { GameChrome } from "@ui/GameChrome";
import { haptic } from "@juice/index";
import { useGameSession, useRememberedLevel, winMoment } from "@shared/index";
import { PICTURES, PALETTE, type Picture } from "./pictures";

/**
 * The drawing itself — the one thing in this catalogue a child would actually
 * mourn. Every other game's snapshot is a position in a puzzle that can simply
 * be played again; this is a picture they made.
 *
 * And unlike every other game here, it is never cleared on completion. A
 * finished drawing is not a solved puzzle sitting there with nothing left to
 * do; it is the point. Reopening coloring to find it wiped would read as the
 * app having thrown their work away.
 *
 * Two ways to colour, both optional and neither ever required (kids-games
 * rule): TAP a region to flood-fill it, or switch to the BRUSH and draw freely.
 * The brush is drag, which is allowed only because tap-fill remains the whole
 * game on its own — a child who cannot drag can still finish every picture.
 */
interface Stroke {
  c: string; // colour
  w: number; // width in viewBox units
  d: string; // SVG path data
}
interface ColoringSession {
  picId: string;
  fills: Record<string, string>;
  // Optional so a pre-brush snapshot (fills only) still validates and is NOT
  // discarded on the deploy that adds the brush — no version bump, no wiped
  // in-progress drawings. See session-snapshot-convention.
  strokes?: Stroke[];
}

const SESSION: SessionSpec<ColoringSession> = {
  version: 1,
  validate: (value): value is ColoringSession => {
    const s = value as Partial<ColoringSession> | null;
    if (typeof s !== "object" || s === null) return false;
    if (typeof s.picId !== "string" || !PICTURES.some((p) => p.id === s.picId)) return false;
    if (typeof s.fills !== "object" || s.fills === null || Array.isArray(s.fills)) return false;
    // Every fill must be a plain colour string. A non-string reaching an SVG
    // `fill` renders that region as nothing at all, which reads as a hole in
    // the drawing rather than as corrupt data.
    if (!Object.values(s.fills).every((v) => typeof v === "string")) return false;
    // Strokes are optional; when present each must be a drawable stroke, or the
    // whole array is rejected (an SVG `d` of the wrong type draws nothing).
    if (s.strokes !== undefined) {
      if (!Array.isArray(s.strokes)) return false;
      if (
        !s.strokes.every(
          (k) =>
            k !== null &&
            typeof k === "object" &&
            typeof (k as Stroke).c === "string" &&
            typeof (k as Stroke).w === "number" &&
            typeof (k as Stroke).d === "string",
        )
      )
        return false;
    }
    return true;
  },
};

const VIEW = 200; // every picture uses a 0 0 200 200 viewBox
type Tool = "fill" | "brush";
// Brush widths in viewBox units. A 200-unit board shown at ~360px means the
// smallest is a fine ~7px line and the largest a chunky ~47px one.
const BRUSH_SIZES = [4, 9, 16, 26];
const DEFAULT_BRUSH = BRUSH_SIZES[1];

/** A small preview of a picture — its outlines on a neutral ground. Used by the
 *  gallery so a child picks a drawing by SEEING it, not by reading a name. */
function Thumb({ pic }: { pic: Picture }) {
  return (
    <svg viewBox={pic.viewBox} width="100%" height="100%" style={{ display: "block" }} aria-hidden>
      {pic.regions.map((r) => (
        <path key={r.id} d={r.d} fill="#fff" stroke="#2d3436" strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      {pic.outlines?.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#2d3436" strokeWidth={2.5} strokeLinecap="round" />
      ))}
    </svg>
  );
}

function strokePath(pts: number[][]): string {
  if (pts.length === 0) return "";
  const r = (n: number) => Math.round(n * 10) / 10;
  if (pts.length === 1) {
    const [x, y] = pts[0];
    // A round-capped zero-length segment renders as a dot of the brush width.
    return `M${r(x)} ${r(y)} L${r(x + 0.01)} ${r(y)}`;
  }
  return "M" + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L");
}

// SVG region-fill coloring PLUS a freehand brush. Live SVG (not canvas) because
// per-region fill is the core mechanic and strokes persist as compact path data.
export function Coloring({ ctx }: { ctx: GameContext }) {
  const T = textFor(
    {
      he: { pick: "בחרו ציור", fill: "מילוי", brush: "מכחול", size: "גודל", undo: "בטל" },
      en: { pick: "Pick a picture", fill: "Fill", brush: "Brush", size: "Size", undo: "Undo" },
      es: { pick: "Elige un dibujo", fill: "Rellenar", brush: "Pincel", size: "Tamaño", undo: "Deshacer" },
    },
    ctx.locale,
  );

  // The picture rides the same level memory every other game uses, by ID rather
  // than by index: an index means "whichever picture is third", so adding a
  // drawing would silently hand every returning child a different page. A new
  // player lands on the first REAL picture, not the blank page (which sits first
  // in the gallery for discoverability).
  const [picId, setPicId] = useRememberedLevel(
    ctx,
    PICTURES.map((p) => p.id),
    (PICTURES.find((p) => p.id !== "blank") ?? PICTURES[0]).id,
  );
  const pic = PICTURES[Math.max(0, PICTURES.findIndex((p) => p.id === picId))];

  const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState<Tool>("fill");
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [fills, setFills] = useState<Record<string, string>>(() =>
    // The guard is the whole safety of a restore: fills are keyed by region id,
    // and region ids are only unique WITHIN a picture. Painting the boat's fills
    // onto the house would be indistinguishable from a drawing the child did not
    // make.
    restored && restored.picId === pic.id ? restored.fills : {},
  );
  const [strokes, setStrokes] = useState<Stroke[]>(() =>
    restored && restored.picId === pic.id ? (restored.strokes ?? []) : [],
  );
  const [live, setLive] = useState<string | null>(null); // in-progress stroke `d`
  const drawingRef = useRef<number[][] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);

  // Keep the chosen picture's thumbnail in view — the gallery scrolls, and the
  // current one can otherwise sit off the end. `block: "nearest"` so it never
  // scrolls the whole page.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pic.id]);

  useGameSession(ctx, SESSION, () => ({ picId: pic.id, fills, strokes }), { live: true });

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
    // The blank page is a single region; flood-filling it is choosing a
    // background, not completing a picture, so it earns no win.
    if (pic.id !== "blank" && !wasComplete && nowComplete) {
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

  // Map a pointer event to viewBox coordinates. The board is square and the
  // viewBox is 0 0 200 200, so a plain rect-relative scale is exact — no CTM.
  const toView = (e: ReactPointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.max(0, Math.min(VIEW, n));
    return [clamp(((e.clientX - rect.left) / rect.width) * VIEW), clamp(((e.clientY - rect.top) / rect.height) * VIEW)];
  };

  const brushDown = (e: ReactPointerEvent) => {
    ctx.audio.unlock();
    ctx.speech.unlock();
    (e.target as Element).setPointerCapture(e.pointerId);
    drawingRef.current = [toView(e)];
    setLive(strokePath(drawingRef.current));
    haptic.tap();
  };
  const brushMove = (e: ReactPointerEvent) => {
    const pts = drawingRef.current;
    if (!pts) return;
    const p = toView(e);
    const last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.4) return; // thin out points
    pts.push(p);
    setLive(strokePath(pts));
  };
  const brushUp = () => {
    const pts = drawingRef.current;
    drawingRef.current = null;
    setLive(null);
    if (!pts) return;
    setStrokes((s) => [...s, { c: color, w: brushSize, d: strokePath(pts) }]);
    ctx.audio.play("pop");
  };

  const undo = () => {
    setStrokes((s) => s.slice(0, -1));
    ctx.audio.play("tap");
  };

  const goToPicture = (id: string) => {
    setPicId(id);
    setFills({});
    setStrokes([]);
    ctx.audio.play("tap");
    ctx.analytics.levelStart(id);
  };

  // Restart = wipe THIS drawing (fills + strokes), not skip to another picture.
  const clearPage = () => {
    setFills({});
    setStrokes([]);
  };

  const btnBase = {
    border: "none",
    borderRadius: 12,
    fontFamily: "Fredoka, inherit",
    fontWeight: 800,
    fontSize: 15,
    padding: "0 12px",
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    boxShadow: "var(--shadow-1)",
  } as const;

  return (
    <GameChrome
      ctx={ctx}
      // Coloring keeps NO record and never will — ranking a child's drawing is
      // the opposite of this platform's premise (see score-contract-convention).
      stats={[]}
      // No difficulty toggle: the picture is chosen from the visible gallery in
      // the footer, which a child understands at a glance where a "3/15" toggle
      // did not.
      onRestart={clearPage}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* The picture gallery — SEE the drawings and tap one. Horizontal
              scroll so it stays one row however many pictures ship. */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)", marginBottom: 4 }}>
              {T.pick}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {PICTURES.map((p) => {
                const active = p.id === pic.id;
                return (
                  <button
                    key={p.id}
                    ref={active ? activeThumbRef : undefined}
                    aria-label={p.name[ctx.locale]}
                    aria-pressed={active}
                    onClick={() => goToPicture(p.id)}
                    style={{
                      flex: "0 0 auto",
                      width: 58,
                      height: 58,
                      padding: 4,
                      borderRadius: 12,
                      border: active ? "3px solid var(--brand)" : "2px solid var(--line)",
                      background: "#fff",
                      boxShadow: active ? "var(--shadow-2)" : "var(--shadow-1)",
                      cursor: "pointer",
                    }}
                  >
                    {p.id === "blank" ? (
                      <span style={{ fontSize: 30, display: "grid", placeItems: "center", height: "100%" }}>✏️</span>
                    ) : (
                      <Thumb pic={p} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tool row: fill vs brush. Both buttons share the width. */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              aria-label={T.fill}
              aria-pressed={tool === "fill"}
              onClick={() => {
                setTool("fill");
                ctx.audio.play("tap");
              }}
              style={{
                ...btnBase,
                flex: "1 1 0",
                background: tool === "fill" ? "var(--brand)" : "var(--surface)",
                color: tool === "fill" ? "#fff" : "var(--text)",
              }}
            >
              🪣 {T.fill}
            </button>
            <button
              aria-label={T.brush}
              aria-pressed={tool === "brush"}
              onClick={() => {
                setTool("brush");
                ctx.audio.play("tap");
              }}
              style={{
                ...btnBase,
                flex: "1 1 0",
                background: tool === "brush" ? "var(--brand)" : "var(--surface)",
                color: tool === "brush" ? "#fff" : "var(--text)",
              }}
            >
              🖌️ {T.brush}
            </button>
          </div>

          {/* Brush sizes + undo. ALWAYS rendered — the row does not appear and
              disappear with the tool, so toggling fill/brush never reflows the
              footer (the layout-shift bug). Undo is always here and disabled,
              not hidden, when there is nothing to take back. */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {BRUSH_SIZES.map((s) => {
              const on = brushSize === s;
              const dot = 8 + s * 0.9;
              return (
                <button
                  key={s}
                  aria-label={`${T.size} ${s}`}
                  aria-pressed={on}
                  onClick={() => {
                    setBrushSize(s);
                    setTool("brush"); // choosing a size means you want to draw
                    ctx.audio.play("tap");
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: on ? "3px solid var(--brand)" : "2px solid var(--line)",
                    background: "var(--surface)",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-1)",
                  }}
                >
                  <span style={{ width: dot, height: dot, borderRadius: "50%", background: color, display: "block" }} />
                </button>
              );
            })}
            <button
              aria-label={T.undo}
              onClick={undo}
              disabled={strokes.length === 0}
              style={{
                ...btnBase,
                marginInlineStart: "auto",
                height: 48,
                padding: "0 16px",
                fontSize: 18,
                background: "var(--surface)",
                color: "var(--text)",
                opacity: strokes.length === 0 ? 0.4 : 1,
                cursor: strokes.length === 0 ? "default" : "pointer",
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>↶</span> {T.undo}
            </button>
          </div>

          {/* The palette. auto-fit keeps every swatch at the 44px tap floor and
              drops to another row rather than shrinking below it. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))",
              gap: 8,
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
                  border: color === c ? "4px solid var(--text)" : "2px solid rgba(0,0,0,0.12)",
                  background: c,
                  boxShadow: "var(--shadow-1)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
      }
    >
      <div
        className="ellaz-play-surface"
        style={{
          width: "min(92vw, 46vh, 440px)",
          aspectRatio: "1",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "var(--shadow-1)",
          overflow: "hidden",
          touchAction: "none", // the brush owns the gesture; no scroll/zoom fights
        }}
      >
        <svg ref={svgRef} viewBox={pic.viewBox} width="100%" height="100%" style={{ display: "block" }}>
          {pic.regions.map((r) => (
            <path
              key={r.id}
              d={r.d}
              fill={fills[r.id] ?? "#f4f4f8"}
              stroke="#2d3436"
              strokeWidth={2}
              strokeLinejoin="round"
              onPointerDown={tool === "fill" ? (e) => paint(r.id, e.currentTarget) : undefined}
              style={{ cursor: "pointer", pointerEvents: tool === "fill" ? "auto" : "none" }}
            />
          ))}

          {/* Decorative strokes (whiskers, waffle lines) — on top, not fillable. */}
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

          {/* The child's freehand strokes, over the picture. */}
          {strokes.map((k, i) => (
            <path
              key={`stroke-${i}`}
              d={k.d}
              fill="none"
              stroke={k.c}
              strokeWidth={k.w}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
          ))}
          {live && (
            <path
              d={live}
              fill="none"
              stroke={color}
              strokeWidth={brushSize}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
          )}

          {/* Brush capture layer — only live while the brush is selected. */}
          <rect
            x={0}
            y={0}
            width={VIEW}
            height={VIEW}
            fill="transparent"
            onPointerDown={tool === "brush" ? brushDown : undefined}
            onPointerMove={tool === "brush" ? brushMove : undefined}
            onPointerUp={tool === "brush" ? brushUp : undefined}
            onPointerCancel={tool === "brush" ? brushUp : undefined}
            style={{ pointerEvents: tool === "brush" ? "all" : "none", cursor: "crosshair", touchAction: "none" }}
          />
        </svg>
      </div>
    </GameChrome>
  );
}
