// Shell juice - what makes the PORTAL feel like a game rather than a menu that
// happens to launch games.
//
// The finding that produced this file: `src/portal/Home.tsx` had zero juice and
// zero sound. Not a little - none. The World shakes and bursts, the wallet chip
// pops and rolls, every game is full of feel, and the one screen every session
// STARTS on was completely inert. A better tap sound cannot help a shell that
// never plays one.
//
// EVERYTHING HERE IS ATTACHED FROM OUTSIDE, by delegation on a container. No
// component is edited to receive it, and no prop is threaded through four
// components to turn it on.
//
// Every effect no-ops under `prefers-reduced-motion` except the sound, which is
// not motion.

import { prefersReducedMotion } from "./effects";

export interface ShellJuiceOptions {
  /** Scale down under the finger, spring back on release. */
  press?: boolean;
  /** Expanding ring at the touch point. */
  ripple?: boolean;
  /** Android-only; a silent no-op everywhere else. */
  haptics?: boolean;
  /**
   * Injected rather than imported. `@juice` must not depend on `@sdk` - the
   * audio port owns mute, unlock and the palette, and a juice module reaching
   * into it would invert the layering the whole SDK contract rests on. The
   * portal passes `() => audio.play("tap")`.
   */
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
 * catalog grows or a filter swaps the grid's children out - which is exactly
 * the case a per-card handler gets wrong months later, silently.
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

/**
 * An expanding ring at the finger. The cheapest "I felt that" there is.
 *
 * `currentColor`, not a literal. The ring is appended to a layer on `body`, so
 * it inherits `--text` and comes out dark on a light theme and light on a dark
 * one. The lab version was hard-coded white, which was correct there because the
 * tournament ran on one dark backdrop, and invisible on any light theme this app
 * actually ships. The repo's own token-hygiene gate caught it.
 */
export function shellRipple(x: number, y: number, color = "currentColor"): void {
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
