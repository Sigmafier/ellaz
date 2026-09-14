import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { readStick, useHeldDirection, type PadDir } from "./DirectionPad";

// "On the board": no pad under the game at all. A finger that lands anywhere on
// the board BIRTHS a stick under itself, and dragging away from that point
// steers - the same gesture as survivors' "On the board", for the grid games.
//
// Operator ruling, 2026-09-14, picked off a rendered mock: one of the three
// modes in the Controls setting, never the default. Arrows stay the default and
// one tap away, because a five-year-old cannot hold a sustained drag.
//
// ALWAYS A WRAPPER, whatever the mode. It renders its children in the same
// element every time and only adds the overlay when `active`, so switching mode
// never remounts the board. For snake that is load-bearing rather than tidy:
// its board is the node Phaser mounted a canvas into, and a remount would throw
// the running game away.
//
// The stick maths and the held-direction repeat are DirectionPad's own
// `readStick` and `useHeldDirection` - one implementation, so the pad's stick,
// the big stick and this one cannot come to disagree about what a drag means.
//
// Pinned to the `page` chunk in vite.config.ts beside `DirectionPad`: nothing on
// the home screen draws it.

/** The stick's reach from where the finger landed, in px. */
export const BOARD_STICK_RADIUS = 48;

/** The knob's diameter, as a fraction of the ring's. */
const KNOB = 0.46;

export function BoardStick(props: {
  /** Whether the overlay is on. Off, this is a plain wrapper around the board. */
  active: boolean;
  /** Called once when the stick enters a direction. */
  onDir: (dir: PadDir) => void;
  /**
   * A press that never left the dead zone. Snake passes its "tap to start" here,
   * because the overlay sits over the canvas and the canvas no longer hears it.
   */
  onTap?: () => void;
  /** Repeat the held direction every N ms, as `DirectionPad` does (maze). */
  repeatMs?: number;
  children: ReactNode;
}): ReactElement {
  const { active, repeatMs, children } = props;

  const { hold, release: releaseHeld } = useHeldDirection(props.onDir, repeatMs);
  const onTapRef = useRef(props.onTap);
  onTapRef.current = props.onTap;

  /** The one finger steering. A second finger is ignored, not a second stick. */
  const pointerRef = useRef<number | null>(null);
  /** Where that finger landed, in client px. */
  const birthRef = useRef({ x: 0, y: 0 });
  /** Whether this gesture ever steered - if not, lifting the finger is a tap. */
  const steeredRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /** Drawn: the ring's centre inside the wrapper, and the knob's offset from it. */
  const [stick, setStick] = useState<{ cx: number; cy: number; kx: number; ky: number } | null>(
    null,
  );

  const release = useCallback(() => {
    pointerRef.current = null;
    releaseHeld();
    setStick(null);
  }, [releaseHeld]);

  // A repeat that outlives the mode keeps walking a game nobody is touching.
  useEffect(() => {
    if (!active) release();
  }, [active, release]);

  const ring = BOARD_STICK_RADIUS * 2;
  const knob = Math.round(ring * KNOB);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "grid" }}>
      {children}
      {active && (
        <div
          // Hidden from assistive tech: the arrows, one tap away in the picker,
          // are the accessible way to steer. The board itself stays readable -
          // this layer has no content of its own.
          aria-hidden="true"
          data-board-stick=""
          onPointerDown={(e) => {
            if (pointerRef.current !== null) return;
            e.preventDefault();
            // Capture, so a finger that slides off the board keeps steering.
            e.currentTarget.setPointerCapture(e.pointerId);
            pointerRef.current = e.pointerId;
            birthRef.current = { x: e.clientX, y: e.clientY };
            releaseHeld();
            steeredRef.current = false;
            const box = wrapRef.current?.getBoundingClientRect();
            setStick({
              cx: e.clientX - (box?.left ?? 0),
              cy: e.clientY - (box?.top ?? 0),
              kx: 0,
              ky: 0,
            });
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== pointerRef.current) return;
            const { knob: k, dir } = readStick(
              e.clientX - birthRef.current.x,
              e.clientY - birthRef.current.y,
              BOARD_STICK_RADIUS,
            );
            setStick((s) => (s ? { ...s, kx: k.x, ky: k.y } : s));
            if (dir) steeredRef.current = true;
            hold(dir);
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== pointerRef.current) return;
            const tapped = !steeredRef.current;
            release();
            if (tapped) onTapRef.current?.();
          }}
          // Cancel and a capture the browser took back both END the gesture and
          // neither is a tap. Up releases first, so the lost-capture event that
          // follows every normal lift finds no pointer and does nothing.
          onPointerCancel={(e) => {
            if (e.pointerId === pointerRef.current) release();
          }}
          onLostPointerCapture={(e) => {
            if (e.pointerId === pointerRef.current) release();
          }}
          style={{
            position: "absolute",
            inset: 0,
            touchAction: "none",
            userSelect: "none",
            cursor: "pointer",
          }}
        >
          {stick && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: stick.cx - BOARD_STICK_RADIUS,
                  top: stick.cy - BOARD_STICK_RADIUS,
                  width: ring,
                  height: ring,
                  boxSizing: "border-box",
                  borderRadius: "50%",
                  border: "3px solid var(--surface)",
                  opacity: 0.7,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: stick.cx - knob / 2,
                  top: stick.cy - knob / 2,
                  width: knob,
                  height: knob,
                  borderRadius: "50%",
                  background: "var(--brand-fill)",
                  opacity: 0.85,
                  transform: `translate(${stick.kx}px, ${stick.ky}px)`,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
