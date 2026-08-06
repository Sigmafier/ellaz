// Juice Lab - the visual arms. DOM + Web Animations only; every decision they
// make comes from the pure curves and tiers in specs.ts.
//
// Reduced motion is honoured throughout, and hit-stop is SKIPPED entirely under
// it rather than shortened: a freeze is not "motion you can turn down", it is a
// discontinuity, and for a motion-sensitive player that is the worst kind.

import { burst, celebrate, shake } from "@juice/index";
import { easeAnticipateOvershoot, type WinIntensity } from "./specs";

export function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

function layer(z: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:${z}`;
  document.body.appendChild(el);
  return el;
}

/** Sample a pure easing curve into the keyframe offsets WAAPI wants. */
function sampleCurve(fn: (t: number) => number, steps = 24): number[] {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) out.push(fn(i / steps));
  return out;
}

// ---------------------------------------------------------------------------
// Squash, stretch, anticipation, overshoot
// ---------------------------------------------------------------------------

export interface SquashOptions {
  /** Peak scale at the top of the arc. */
  scale?: number;
  ms?: number;
  /** Pull back before springing forward. The anticipation half. */
  anticipate?: boolean;
  /** Non-uniform squash: x and y move opposite ways, as in animation. */
  stretch?: boolean;
}

/**
 * The canonical pop: anticipate, squash, overshoot, settle. Built from the same
 * `easeAnticipateOvershoot` the unit tests pin, so what ships is what was tested.
 */
export function squash(el: HTMLElement, opts: SquashOptions = {}): void {
  const scale = opts.scale ?? 1.18;
  const ms = opts.ms ?? 380;
  if (prefersReducedMotion()) {
    el.animate([{ opacity: 0.75 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
    return;
  }
  const curve = sampleCurve(opts.anticipate === false ? (t) => 1 - Math.pow(1 - t, 3) : easeAnticipateOvershoot);
  const frames: Keyframe[] = curve.map((p, i) => {
    const s = 1 + (scale - 1) * p;
    // A real squash conserves volume: as it grows tall it grows narrow.
    const sx = opts.stretch ? 1 + (scale - 1) * p * 1.25 : s;
    const sy = opts.stretch ? 1 + (scale - 1) * p * 0.7 : s;
    return { transform: `scale(${sx}, ${sy})`, offset: i / (curve.length - 1) };
  });
  frames[frames.length - 1] = { transform: "scale(1, 1)", offset: 1 };
  el.animate(frames, { duration: ms, easing: "linear", fill: "none" });
}

// ---------------------------------------------------------------------------
// Hit-stop
// ---------------------------------------------------------------------------

/**
 * Freeze-frame on impact. In a DOM app there is no simulation loop to pause, so
 * the honest equivalent is to HOLD the payoff for `ms` while the impact frame
 * sits on screen - which is exactly what the player perceives either way.
 *
 * Returns a promise the caller awaits before firing the follow-through.
 */
export function hitStop(ms: number, flash = true): Promise<void> {
  if (ms <= 0 || prefersReducedMotion()) return Promise.resolve();
  if (flash) {
    const el = layer(10002);
    el.style.cssText += ";inset:0;background:#fff;opacity:0.16";
    el.animate([{ opacity: 0.16 }, { opacity: 0 }], { duration: ms + 60, easing: "ease-out" });
    setTimeout(() => el.remove(), ms + 120);
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Ripple
// ---------------------------------------------------------------------------

/** An expanding ring at the touch point - the cheapest "I felt that" there is. */
export function ripple(x: number, y: number, color = "var(--brand)"): void {
  if (prefersReducedMotion()) return;
  const host = layer(9998);
  const ring = document.createElement("div");
  const size = 26;
  ring.style.cssText =
    `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
    `margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:50%;` +
    `border:2px solid ${color};opacity:0.9`;
  host.appendChild(ring);
  ring.animate(
    [
      { transform: "scale(0.4)", opacity: 0.9 },
      { transform: "scale(3.2)", opacity: 0 },
    ],
    { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)" },
  );
  setTimeout(() => host.remove(), 520);
}

// ---------------------------------------------------------------------------
// Tiered celebration
// ---------------------------------------------------------------------------

/**
 * The win, scaled to what was actually achieved. An easy 3-coin win and a hard
 * 8-coin win must not look identical - if every win is a parade, no win is.
 */
export function celebrateTiered(at: { x: number; y: number }, i: WinIntensity): void {
  if (i.burst > 0) burst(at.x, at.y, { count: i.burst, spread: 70 + i.burst * 2 });
  if (i.confetti > 0) celebrate({ count: i.confetti });
  if (i.shake > 0 && !prefersReducedMotion()) {
    const root = document.getElementById("root");
    if (root) shake(root, i.shake, 220);
  }
}

// ---------------------------------------------------------------------------
// Coin flight with trail and landing
// ---------------------------------------------------------------------------

export interface RichFlightOptions {
  emoji?: string;
  count?: number;
  ms?: number;
  /** Leave a fading trail behind each coin. */
  trail?: boolean;
  /** Fired as each coin arrives - the hook for a per-coin landing sound. */
  onLand?: (index: number) => void;
}

/**
 * Coins arc to the wallet, optionally trailing, and report each arrival.
 *
 * PURELY COSMETIC, like the shipped flyTo: it reads no balance and writes none,
 * so nothing here can cost a player a coin. Degrades to a burst at the origin
 * when there is no target, because a win must always feel like something.
 */
export function flyToRich(
  from: { x: number; y: number },
  target: HTMLElement | null,
  opts: RichFlightOptions = {},
): void {
  const emoji = opts.emoji ?? "🪙";
  const count = Math.max(1, Math.min(12, Math.round(opts.count ?? 5)));
  const ms = opts.ms ?? 620;

  const rect = target && target.isConnected ? target.getBoundingClientRect() : null;
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    burst(from.x, from.y, { count });
    for (let i = 0; i < count; i++) setTimeout(() => opts.onLand?.(i), 120 + i * 55);
    return;
  }

  const dx = rect.left + rect.width / 2 - from.x;
  const dy = rect.top + rect.height / 2 - from.y;
  const reduced = prefersReducedMotion();
  const stagger = reduced ? 0 : 55;
  const dur = reduced ? 260 : ms;
  const host = layer(10001);

  for (let i = 0; i < count; i++) {
    const coin = document.createElement("div");
    coin.textContent = emoji;
    const startX = reduced ? from.x + dx : from.x;
    const startY = reduced ? from.y + dy : from.y;
    coin.style.cssText =
      `position:absolute;left:${startX}px;top:${startY}px;font-size:${20 + Math.random() * 8}px;` +
      `line-height:1;will-change:transform,opacity`;
    host.appendChild(coin);

    const archX = dx * 0.5 + (Math.random() * 2 - 1) * 70;
    const archY = dy * 0.5 - (50 + Math.random() * 70);

    const frames: Keyframe[] = reduced
      ? [
          { transform: "translate(-50%,-50%) scale(0.8)", opacity: 0 },
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0.4 },
          { transform: "translate(-50%,-50%) scale(1)", opacity: 0 },
        ]
      : [
          { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${archX}px), calc(-50% + ${archY}px)) scale(1.25) rotate(180deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35) rotate(360deg)`,
            opacity: 0.15,
          },
        ];

    coin.animate(frames, {
      duration: dur,
      delay: i * stagger,
      easing: "cubic-bezier(.3,.1,.25,1)",
      fill: "forwards",
    });

    if (opts.trail && !reduced) spawnTrail(host, from, { archX, archY, dx, dy }, dur, i * stagger);

    const arriveAt = dur + i * stagger;
    setTimeout(() => opts.onLand?.(i), arriveAt);
  }

  setTimeout(() => host.remove(), dur + count * stagger + 260);
}

function spawnTrail(
  host: HTMLElement,
  from: { x: number; y: number },
  path: { archX: number; archY: number; dx: number; dy: number },
  dur: number,
  delay: number,
): void {
  const DOTS = 5;
  for (let t = 1; t <= DOTS; t++) {
    const dot = document.createElement("div");
    const size = 7 - t * 0.8;
    dot.style.cssText =
      `position:absolute;left:${from.x}px;top:${from.y}px;width:${size}px;height:${size}px;` +
      `margin-left:${-size / 2}px;margin-top:${-size / 2}px;border-radius:50%;` +
      `background:var(--yellow, #fdcb6e);opacity:0`;
    host.appendChild(dot);
    dot.animate(
      [
        { transform: "translate(0,0)", opacity: 0.55 },
        {
          transform: `translate(${path.archX}px, ${path.archY}px)`,
          opacity: 0.35,
          offset: 0.55,
        },
        { transform: `translate(${path.dx}px, ${path.dy}px)`, opacity: 0 },
      ],
      {
        duration: dur,
        // Each dot lags a little further behind the coin, which is the trail.
        delay: delay + t * 26,
        easing: "cubic-bezier(.3,.1,.25,1)",
        fill: "forwards",
      },
    );
  }
}

/** A short bounce on the wallet chip as coins land. */
export function chipBounce(el: HTMLElement | null): void {
  if (!el) return;
  if (prefersReducedMotion()) {
    el.animate([{ opacity: 0.7 }, { opacity: 1 }], { duration: 160 });
    return;
  }
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.16)", offset: 0.35 },
      { transform: "scale(0.97)", offset: 0.68 },
      { transform: "scale(1)" },
    ],
    { duration: 320, easing: "cubic-bezier(.3,1.4,.4,1)" },
  );
}
