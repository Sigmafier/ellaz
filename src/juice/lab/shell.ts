// Tier 1 shell juice - what makes the PORTAL feel like a game rather than a
// menu that happens to launch games.
//
// The finding that produced this file: `src/portal/Home.tsx` had zero juice and
// zero sound. Not a little - none. The World shakes and bursts, the wallet chip
// pops and rolls, every game is full of feel, and the one screen every session
// starts on was completely inert. Better tap sounds cannot help a shell that
// never plays one.
//
// EVERYTHING HERE IS ATTACHED FROM OUTSIDE, by delegation on a container. No
// component is edited to receive it. That is deliberate twice over: the lab can
// A/B the REAL Home rather than a mock of it, and shipping this later is one
// call in the portal shell rather than a prop threaded through four components.
//
// Every effect no-ops under `prefers-reduced-motion` except the sound, which is
// not motion.

import { prefersReducedMotion } from "./visuals";

/** What a tap should answer with. Each part is independently switchable so the
 *  lab can prove which one is actually carrying the feeling. */
export interface ShellJuiceOptions {
  /** Scale down under the finger, spring back on release. */
  press?: boolean;
  /** Expanding ring at the touch point. */
  ripple?: boolean;
  /** Android-only; a silent no-op everywhere else. */
  haptics?: boolean;
  /** Injected rather than imported so the lab can feed it the winning
   *  palette character instead of the currently shipped `tap`. */
  playTap?: () => void;
}

const PRESS_SCALE = 0.94;
const PRESS_MS = 90;

function layer(z: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:${z}`;
  document.body.appendChild(el);
  return el;
}

/** Anything a child would consider tappable. */
function tappable(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("button, a, [role='button']");
  return el instanceof HTMLElement && root.contains(el) ? el : null;
}

/**
 * Make every tappable thing inside `root` answer: sound, press depth, ripple,
 * haptic. Returns a detach function.
 *
 * Delegated from a single listener on the container, so it costs one listener
 * regardless of how many cards the grid holds, and it keeps working when the
 * catalog grows or the filter rail swaps the grid's children out.
 */
export function attachShellJuice(root: HTMLElement, opts: ShellJuiceOptions = {}): () => void {
  const { press = true, ripple: wantRipple = true, haptics = true, playTap } = opts;
  const reduced = prefersReducedMotion();
  // A press held on one element must be released on that same element even if
  // the finger has since slid off it, or the card stays visibly squashed.
  let held: HTMLElement | null = null;

  const release = () => {
    if (!held) return;
    held.style.transform = "";
    const el = held;
    setTimeout(() => {
      // Only clear the transition if nothing else has claimed the element
      // since, or we would cancel a fresh press mid-flight.
      if (el.style.transform === "") el.style.transition = "";
    }, PRESS_MS + 40);
    held = null;
  };

  const onDown = (ev: PointerEvent) => {
    const el = tappable(ev.target, root);
    if (!el) return;

    if (playTap) {
      try {
        playTap();
      } catch {
        /* a silent tap is a disappointment, never a crash */
      }
    }
    if (haptics) {
      try {
        if ("vibrate" in navigator) navigator.vibrate(8);
      } catch {
        /* unsupported on iOS and Firefox; that is fine */
      }
    }
    if (wantRipple && !reduced) shellRipple(ev.clientX, ev.clientY);
    if (press && !reduced) {
      release();
      held = el;
      el.style.transition = `transform ${PRESS_MS}ms cubic-bezier(.3,.7,.4,1)`;
      el.style.transform = `scale(${PRESS_SCALE})`;
    }
  };

  root.addEventListener("pointerdown", onDown);
  // Release on the WINDOW, not the root: a finger that leaves the element, the
  // container, or the window entirely still has to un-squash the card.
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  return () => {
    root.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    release();
  };
}

/** An expanding ring at the finger. The cheapest "I felt that" there is. */
export function shellRipple(x: number, y: number, color = "rgba(255,255,255,.75)"): void {
  if (prefersReducedMotion()) return;
  const host = layer(9997);
  const ring = document.createElement("div");
  const size = 22;
  ring.style.cssText =
    `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
    `margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:50%;` +
    `border:2px solid ${color}`;
  host.appendChild(ring);
  ring.animate(
    [
      { transform: "scale(.35)", opacity: 0.8 },
      { transform: "scale(2.8)", opacity: 0 },
    ],
    { duration: 380, easing: "cubic-bezier(.2,.7,.3,1)" },
  );
  setTimeout(() => host.remove(), 460);
}

// ---------------------------------------------------------------------------
// Floating reward number
// ---------------------------------------------------------------------------

export interface FloatNumberOptions {
  color?: string;
  /** Bigger for a bigger reward. The whole point is that they differ. */
  size?: number;
  ms?: number;
}

/**
 * "+3" rising and fading at the point of earning. The single most recognisable
 * game element there is, and the portal had none.
 *
 * Deliberately separate from the coin flight rather than replacing it: the
 * number says WHAT you earned at the place you earned it, the flight says WHERE
 * it went. Together they answer both questions a child actually has.
 */
export function floatNumber(
  x: number,
  y: number,
  text: string,
  opts: FloatNumberOptions = {},
): void {
  const size = opts.size ?? 30;
  const ms = opts.ms ?? 900;
  const host = layer(10003);
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText =
    `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);` +
    `font-family:"Fredoka",var(--font,sans-serif);font-weight:800;font-size:${size}px;` +
    `line-height:1;color:${opts.color ?? "var(--yellow,#fdcb6e)"};` +
    // A gold number on a light card is invisible without this.
    `text-shadow:0 2px 0 rgba(0,0,0,.45),0 0 14px rgba(253,203,110,.55);white-space:nowrap`;
  host.appendChild(el);

  const reduced = prefersReducedMotion();
  el.animate(
    reduced
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }]
      : [
          // Overshoot on the way in, so it POPS rather than merely appearing.
          { transform: "translate(-50%,-50%) scale(.5)", opacity: 0 },
          { transform: "translate(-50%,-90%) scale(1.25)", opacity: 1, offset: 0.28 },
          { transform: "translate(-50%,-110%) scale(1)", opacity: 1, offset: 0.55 },
          { transform: "translate(-50%,-190%) scale(.9)", opacity: 0 },
        ],
    { duration: reduced ? 520 : ms, easing: "cubic-bezier(.2,.8,.3,1)" },
  );
  setTimeout(() => host.remove(), (reduced ? 520 : ms) + 120);
}

// ---------------------------------------------------------------------------
// Entrance stagger
// ---------------------------------------------------------------------------

/** Total cascade length. Past this a grid feels slow to arrive, not alive. */
const STAGGER_TOTAL_MS = 520;

/**
 * Cards cascade in rather than all appearing at once. Turns a static grid into
 * an arrival.
 *
 * The step SHRINKS as the catalog grows: a fixed per-card delay would be a
 * pleasant 0.4s at ten games and an unbearable 2s at fifty. The cascade always
 * finishes inside STAGGER_TOTAL_MS regardless of how many games ship.
 */
export function staggerIn(root: HTMLElement, selector = "button, a"): void {
  if (prefersReducedMotion()) return;
  const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (els.length === 0) return;
  const step = Math.min(30, STAGGER_TOTAL_MS / els.length);
  els.forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, transform: "translateY(10px) scale(.97)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 300, delay: i * step, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" },
    );
  });
}

// ---------------------------------------------------------------------------
// Idle attract
// ---------------------------------------------------------------------------

export interface IdleAttractOptions {
  /** Silence before the first nudge. */
  afterMs?: number;
  /** Gap between nudges while still idle. */
  everyMs?: number;
  selector?: string;
}

/**
 * After a stretch of no input, one random card wiggles.
 *
 * Standard in kids' games, and it solves a real problem rather than a cosmetic
 * one: a child who has stopped because they do not know what to do next gets an
 * answer that requires no reading. It is a POINTER, not a nag - which is why it
 * moves one card rather than all of them, and stops the instant anything is
 * touched.
 */
export function startIdleAttract(root: HTMLElement, opts: IdleAttractOptions = {}): () => void {
  const afterMs = opts.afterMs ?? 15000;
  const everyMs = opts.everyMs ?? 5000;
  const selector = opts.selector ?? "button";
  if (prefersReducedMotion()) return () => {};

  let timer = 0;
  let stopped = false;

  const wiggle = () => {
    if (stopped) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (els.length > 0) {
      const el = els[Math.floor(Math.random() * els.length)];
      el.animate(
        [
          { transform: "rotate(0deg) scale(1)" },
          { transform: "rotate(-4deg) scale(1.06)", offset: 0.25 },
          { transform: "rotate(4deg) scale(1.06)", offset: 0.55 },
          { transform: "rotate(-2deg) scale(1.03)", offset: 0.8 },
          { transform: "rotate(0deg) scale(1)" },
        ],
        { duration: 620, easing: "ease-in-out" },
      );
    }
    timer = window.setTimeout(wiggle, everyMs);
  };

  const reset = () => {
    window.clearTimeout(timer);
    if (!stopped) timer = window.setTimeout(wiggle, afterMs);
  };

  // Capture phase: a tap that a child's finger lands on a card must reset the
  // timer even though the card's own handler stops propagation.
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "wheel"];
  for (const e of events) window.addEventListener(e, reset, { capture: true, passive: true });
  reset();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    for (const e of events) window.removeEventListener(e, reset, { capture: true });
  };
}
