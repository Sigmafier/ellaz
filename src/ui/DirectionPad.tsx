import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";

// The four-way pad every steering game shares: a proper CROSS, with the down
// arrow BELOW the left/right pair rather than beside them, and a draggable
// joystick sitting in the hole in the middle.
//
// It replaces two byte-identical copies of the same `dpadBtn` helper (snake and
// maze), which laid the keys out as a two-row block — up on its own, then
// left/DOWN/right in one line. That reads as three keys and a hat: a child
// reaching for "down" lands between "left" and "right", which is the one
// mistake the shape itself was inviting.
//
//   .   ▲   .
//   ◀  (o)  ▶
//   .   ▼   .
//
// THE ARROWS ARE THE CONTRACT AND THE JOYSTICK IS THE EXTRA. Kids games here
// are tap-completable and drag is never REQUIRED (CLAUDE.md § kids games), so
// every direction stays a plain <button> with its own label; the stick is
// `aria-hidden` and adds nothing a tap cannot already do. A five-year-old on a
// phone, or anyone on assistive input, cannot reliably hold a sustained pointer
// gesture — so if this component ever ships with the arrows removed, the games
// on it are broken for exactly the players this platform is for.
//
// It lives in `@ui` beside `GameChrome` and `DifficultySelector`, and like
// `GameChrome` it is pinned to the `page` chunk in vite.config.ts — every game
// that draws a pad is on a page that has already fetched `page-*`, and the
// `src/{sdk,ui,juice,i18n,shared}` catch-all would otherwise put it in front of
// a child who has not chosen a game yet.

export type PadDir = "up" | "down" | "left" | "right";

/**
 * Where each key sits in the 3x3 cross, and the four corners left empty are
 * what makes it a cross rather than the old block.
 *
 * Exported so `direction-pad.test.ts` can read the LAYOUT as data instead of
 * grepping for grid coordinates in a style object — the down key moving back
 * up beside left/right is the exact regression this file exists to prevent,
 * and a source scan for `gridRow: 3` would pass on a pad that had quietly
 * stopped drawing a down key at all.
 */
export const PAD_KEYS: readonly { dir: PadDir; glyph: string; column: number; row: number }[] = [
  { dir: "up", glyph: "▲", column: 2, row: 1 },
  { dir: "left", glyph: "◀", column: 1, row: 2 },
  { dir: "right", glyph: "▶", column: 3, row: 2 },
  { dir: "down", glyph: "▼", column: 2, row: 3 },
];

/**
 * How far the knob must leave the middle before it means anything, as a
 * fraction of the well's radius.
 *
 * A stick with no dead zone answers the very first pixel of travel, so the
 * finger that lands slightly off-centre steers before it has asked for
 * anything — and on a game where a direction is a MOVE (maze) that is a step
 * the player did not take. 0.34 is roughly a fingertip's own slop at this size.
 */
const DEAD_ZONE = 0.34;

/** Which direction a displacement means, or null inside the dead zone. */
export function padDirection(dx: number, dy: number, radius: number): PadDir | null {
  if (radius <= 0) return null;
  if (Math.hypot(dx, dy) < radius * DEAD_ZONE) return null;
  // The DOMINANT axis, so a diagonal drag resolves to one of the four rather
  // than to whichever of two handlers happens to run first. A game here has no
  // diagonal to give.
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

export function DirectionPad(props: {
  /** Called once when the stick enters a direction, and on every arrow press. */
  onDir: (dir: PadDir) => void;
  /** Edge of one cell, in px. The whole pad is three of these plus two gaps. */
  size?: number;
  /**
   * Repeat the held direction every N ms while the stick stays in it. Omit for
   * a game that steers once and keeps going (snake); pass it for a game where a
   * direction is a STEP and holding should walk (maze).
   */
  repeatMs?: number;
}): ReactElement {
  const { onDir, size = 54, repeatMs } = props;

  const wellRef = useRef<HTMLDivElement>(null);
  /** The direction the stick is currently in, so re-entering it does not refire. */
  const heldRef = useRef<PadDir | null>(null);
  const timerRef = useRef<number | null>(null);
  /** Always the LATEST handler. The prop is a fresh closure on every render and
   *  the repeat timer outlives several of them. */
  const onDirRef = useRef(onDir);
  onDirRef.current = onDir;

  /** Knob offset from the middle, in px. State because it is drawn. */
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);

  const stopRepeat = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // A repeat timer that outlives the component keeps calling into a torn-down
  // game — a setState into nothing, in front of a child.
  useEffect(() => stopRepeat, [stopRepeat]);

  /** Read the pointer, move the knob, and fire if the direction changed. */
  const track = useCallback(
    (clientX: number, clientY: number) => {
      const box = wellRef.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      const radius = box.width / 2;
      const dx = clientX - (box.left + radius);
      const dy = clientY - (box.top + radius);

      // Clamp to the rim, so the knob never leaves its well however far the
      // finger travels.
      const dist = Math.hypot(dx, dy);
      const k = dist > radius ? radius / dist : 1;
      setKnob({ x: dx * k, y: dy * k });

      const dir = padDirection(dx, dy, radius);
      if (dir === heldRef.current) return;
      heldRef.current = dir;
      stopRepeat();
      if (!dir) return;
      onDirRef.current(dir);
      if (repeatMs !== undefined) {
        timerRef.current = window.setInterval(() => {
          const held = heldRef.current;
          if (held) onDirRef.current(held);
        }, repeatMs);
      }
    },
    [repeatMs, stopRepeat],
  );

  const release = useCallback(() => {
    heldRef.current = null;
    stopRepeat();
    setKnob(null);
  }, [stopRepeat]);

  const keyStyle: CSSProperties = {
    border: "none",
    borderRadius: "var(--radius-2)",
    background: "var(--surface)",
    boxShadow: "var(--shadow-1)",
    color: "var(--text)",
    fontSize: Math.round(size * 0.44),
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    touchAction: "none",
    userSelect: "none",
  };

  return (
    // `dir="ltr"`, always. The app is Hebrew RTL by default, so an RTL grid puts
    // column 1 on the visual RIGHT — and these are physical DIRECTIONS on boards
    // that are themselves pinned LTR, so a mirrored pad is a pad whose left
    // arrow moves the piece right (rtl-spatial-grid-dir-ltr.md).
    <div
      dir="ltr"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gridTemplateRows: `repeat(3, ${size}px)`,
        gap: 8,
        touchAction: "none",
      }}
    >
      {PAD_KEYS.map(({ dir, glyph, column, row }) => (
        <button
          key={dir}
          type="button"
          aria-label={dir}
          // pointerdown, not click, so a turn registers the instant the finger
          // lands; preventDefault so a press does not also scroll the page or
          // fire a phantom click behind it.
          onPointerDown={(e) => {
            e.preventDefault();
            onDir(dir);
          }}
          style={{ ...keyStyle, gridColumn: column, gridRow: row }}
        >
          {glyph}
        </button>
      ))}

      {/* The stick. Hidden from assistive tech on purpose: it offers nothing
          the four buttons above do not, and announcing a drag target to a
          reader who cannot drag is worse than silence. */}
      <div
        ref={wellRef}
        aria-hidden="true"
        onPointerDown={(e) => {
          e.preventDefault();
          // Capture, so a finger that slides off the well keeps steering
          // instead of silently handing the gesture to whatever is underneath.
          e.currentTarget.setPointerCapture(e.pointerId);
          track(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          track(e.clientX, e.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        // The third way a gesture ends, and the one that is easy to miss: the
        // browser can take the capture back on its own (a system gesture, a
        // context menu, the page being scrolled out from under the finger).
        // Without this the stick keeps its held direction after the finger has
        // gone — and with `repeatMs` set, that is a game that walks by itself.
        onLostPointerCapture={release}
        style={{
          gridColumn: 2,
          gridRow: 2,
          borderRadius: "50%",
          background: "var(--surface-2)",
          // The RING is what makes it read as a well rather than as a stray
          // dot. Measured at 390px in the light theme: `--surface-2` is cream
          // on a cream page, so without an edge the circle all but disappears
          // and the knob looks like it is floating in the gap between four
          // keys. `--line` is the one token that stays a visible edge in both
          // themes, which is the whole reason it exists.
          border: "2px solid var(--line)",
          boxSizing: "border-box",
          boxShadow: "var(--shadow-1)",
          display: "grid",
          placeItems: "center",
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: size * 0.56,
            height: size * 0.56,
            borderRadius: "50%",
            background: "var(--brand-fill)",
            boxShadow: "var(--shadow-2)",
            // Snap home when the finger lifts; follow it exactly while it is
            // down, or the knob lags behind the direction already being sent.
            transform: knob ? `translate(${knob.x}px, ${knob.y}px)` : undefined,
            transition: knob ? "none" : "transform 0.14s var(--ease)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
