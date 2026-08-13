// DOM game-feel effects: screen shake, success particle burst, and a tiny
// rAF tween. Kept framework-neutral (plain elements) so any renderer can use them.

import { loadTuning, tuning } from "./tuning";

// Read the operator's picks ONCE, at module load. The alternative - reading
// storage inside `shake()` - would touch localStorage on every wrong answer in
// every game, which is a synchronous disk hit on the exact frame that is
// supposed to feel immediate. A pick made in the lab reaches the games on the
// next page load, which is the same contract the voice picks have.
loadTuning();

/**
 * The confetti palette, read off the live theme.
 *
 * A CSS custom property holds arbitrary text, so `--confetti-colors` is a
 * comma list and this splits it. That is the whole mechanism, and it is why
 * this file follows the theme without importing React, a palette module, or
 * anything that would drag a framework into the juice layer.
 *
 * The fallback matters as much as the read: this runs in jsdom under test and
 * in a browser before the stylesheet has parsed, and in both cases
 * `getPropertyValue` returns an empty string. Confetti with no colours is
 * invisible confetti - a win that silently stops feeling like one - so an
 * empty read falls back to night's list rather than to nothing.
 */
function themeColors(name: string, fallback: string[]): string[] {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const parsed = raw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  } catch {
    // No document, no computed style: fall through.
  }
  return fallback;
}

const SPARK_FALLBACK = ["#6c5ce7", "#00cec9", "#fdcb6e", "#ff7675", "#55efc4"];
const CONFETTI_FALLBACK = [
  "#6c5ce7",
  "#a29bfe",
  "#00cec9",
  "#fdcb6e",
  "#ff7675",
  "#55efc4",
  "#fd79a8",
  "#74b9ff",
];

export function shake(
  el: HTMLElement,
  intensity = tuning().shakePx,
  ms = tuning().shakeMs,
): void {
  const start = performance.now();
  const base = el.style.transform;
  function frame(now: number) {
    const p = (now - start) / ms;
    if (p >= 1) {
      el.style.transform = base;
      return;
    }
    const decay = 1 - p;
    const dx = (Math.random() * 2 - 1) * intensity * decay;
    const dy = (Math.random() * 2 - 1) * intensity * decay;
    el.style.transform = `${base} translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export interface BurstOptions {
  count?: number;
  colors?: string[];
  spread?: number;
}

// Confetti-style burst at a screen point. Elements are absolutely positioned,
// animated with the Web Animations API, and self-remove on finish.
export function burst(x: number, y: number, opts: BurstOptions = {}): void {
  const count = opts.count ?? 14;
  const colors = opts.colors ?? themeColors("--spark-colors", SPARK_FALLBACK);
  const spread = opts.spread ?? tuning().burstSpread;
  const layer = document.createElement("div");
  layer.style.cssText = `position:fixed;left:0;top:0;pointer-events:none;z-index:9999`;
  document.body.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 8;
    p.style.cssText =
      `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
      `border-radius:${Math.random() > 0.5 ? "50%" : "2px"};` +
      `background:${colors[i % colors.length]}`;
    layer.appendChild(p);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = spread + Math.random() * spread;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    p.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 120}px) scale(0.3)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 300, easing: "cubic-bezier(.2,.6,.3,1)" },
    );
  }
  setTimeout(() => layer.remove(), 1100);
}

// A full-screen confetti celebration raining from the top — the big "you did it"
// reward moment. Heavier than burst(); use it for wins and milestones.
export function celebrate(opts: { count?: number; colors?: string[] } = {}): void {
  const count = opts.count ?? tuning().confetti;
  const colors = opts.colors ?? themeColors("--confetti-colors", CONFETTI_FALLBACK);
  const layer = document.createElement("div");
  layer.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:10000;overflow:hidden";
  document.body.appendChild(layer);
  const W = window.innerWidth;
  const H = window.innerHeight;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 7 + Math.random() * 9;
    const startX = Math.random() * W;
    p.style.cssText =
      `position:absolute;left:${startX}px;top:-20px;width:${size}px;height:${size * 0.6}px;` +
      `background:${colors[i % colors.length]};border-radius:2px;`;
    layer.appendChild(p);
    const driftX = (Math.random() * 2 - 1) * 120;
    const spins = 2 + Math.random() * 4;
    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${driftX}px, ${H + 60}px) rotate(${spins * 360}deg)`, opacity: 0.9 },
      ],
      { duration: 1600 + Math.random() * 1200, easing: "cubic-bezier(.25,.6,.4,1)", delay: Math.random() * 400 },
    );
  }
  setTimeout(() => layer.remove(), 2600);
}

export interface FlyToOptions {
  /**
   * Builds ONE flying particle; called `count` times, so it must return a fresh
   * node each time.
   *
   * REQUIRED, and it used to be an optional emoji string defaulting to a coin.
   * A default here is what let the flying coin and the coin in the wallet drift
   * into two separate drawings - they agreed only because both happened to be
   * the same character, with nothing checking. `@juice` must not import `@ui`,
   * so the caller injects the glyph, exactly as it injects the tap sound.
   *
   * Size yourself in `em`: the wrapper's font-size varies per particle, which
   * is what gives the flock its spread.
   */
  particle: () => Node;
  count?: number;
  ms?: number;
}

/** Honour the reduced-motion preference the same way global.css does. */
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

/**
 * Fly a small flock of emoji from a screen point to an element (the wallet
 * chip) — the "you earned this, and here is where it went" moment.
 *
 * `from` is in VIEWPORT coordinates, like burst(). PURELY COSMETIC: it reads no
 * balance and writes none, so a failure here can never cost a player a coin.
 *
 * When there is no target to fly to (chip not mounted, game rendered outside the
 * host) it degrades to burst() at the origin rather than doing nothing — the win
 * must always feel like something happened.
 */
export function flyTo(
  from: { x: number; y: number },
  target: HTMLElement | null,
  opts: FlyToOptions,
): void {
  const count = Math.max(1, Math.min(12, Math.round(opts.count ?? 5)));
  const ms = opts.ms ?? 620;

  // A detached or zero-box target would send the flock to (0,0), which reads as
  // a bug. Treat "no usable box" exactly like "no target".
  const rect = target && target.isConnected ? target.getBoundingClientRect() : null;
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    burst(from.x, from.y);
    return;
  }
  const dx = rect.left + rect.width / 2 - from.x;
  const dy = rect.top + rect.height / 2 - from.y;

  const reduced = prefersReducedMotion();
  const stagger = reduced ? 0 : 55;
  const dur = reduced ? 260 : ms;

  const layer = document.createElement("div");
  layer.style.cssText = "position:fixed;left:0;top:0;pointer-events:none;z-index:10001";
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.appendChild(opts.particle());
    // Reduced motion: no travel at all — the coins simply appear at the wallet
    // and fade, so the reward still registers without anything flying across.
    const startX = reduced ? from.x + dx : from.x;
    const startY = reduced ? from.y + dy : from.y;
    p.style.cssText =
      `position:absolute;left:${startX}px;top:${startY}px;font-size:${20 + Math.random() * 8}px;` +
      `line-height:1;will-change:transform,opacity`;
    layer.appendChild(p);

    const frames: Keyframe[] = reduced
      ? [
          { transform: "translate(-50%,-50%) scale(0.8)", opacity: 0 },
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: 0.4 },
          { transform: "translate(-50%,-50%) scale(1)", opacity: 0 },
        ]
      : [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          {
            // Arc: rise above the straight line and scatter sideways, so the
            // flock reads as several coins rather than one moving blob.
            transform:
              `translate(calc(-50% + ${dx * 0.5 + (Math.random() * 2 - 1) * 70}px), ` +
              `calc(-50% + ${dy * 0.5 - (50 + Math.random() * 70)}px)) scale(1.25)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`,
            opacity: 0.15,
          },
        ];

    p.animate(frames, {
      duration: dur,
      delay: i * stagger,
      easing: "cubic-bezier(.3,.1,.25,1)",
      fill: "forwards",
    });
  }

  setTimeout(() => layer.remove(), dur + count * stagger + 160);
}

/** Add a one-shot CSS animation class to an element, auto-removed on finish. */
export function popEl(el: HTMLElement, cls = "ellaz-pop"): void {
  el.classList.remove(cls);
  // reflow to restart the animation if the class was present
  void el.offsetWidth;
  el.classList.add(cls);
  const done = () => {
    el.classList.remove(cls);
    el.removeEventListener("animationend", done);
  };
  el.addEventListener("animationend", done);
}

/** Minimal eased tween on a numeric value. Returns a cancel function. */
export function tween(
  from: number,
  to: number,
  ms: number,
  onUpdate: (v: number) => void,
  ease: (t: number) => number = (t) => 1 - Math.pow(1 - t, 3),
): () => void {
  const start = performance.now();
  let raf = 0;
  function frame(now: number) {
    const p = Math.min(1, (now - start) / ms);
    onUpdate(from + (to - from) * ease(p));
    if (p < 1) raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
