// The particles. Decoration only: nothing here is hashed, nothing here can
// reach the sim, and a cell that dropped every FxOp on the floor would still
// play an identical fight. That is why this file is allowed a wall clock and
// the core is not.
//
// It still has to be REPRODUCIBLE, because the tournament compares arms on
// equal work: the same event stream must SPAWN the same particles on every
// arm, or one engine "wins" by having drawn fewer dots. So the spread comes
// from an lcg seeded here - never the core's rng (which would make the sim's
// future depend on how pretty a frame was) and never Math.random. Wall time
// moves them and fades them; it never decides how many there are.
//
// Note what the events carry: only `hit` has coordinates. knockdown, ko and
// land name a fighter and nothing else, so the position they are drawn at is
// the one the last hit on that fighter was seen at. It is right within a pixel
// in every case that matters (all three follow a hit), and a fighter who has
// never been hit spawns nothing rather than a burst at the origin.

import type { FightEvent } from "../../core/types";
import type { FxOp } from "../contract";

/** the snes16 names this file draws with, as literals - a shared file may not import a sibling */
const YELLOW = "#ffc93c";
const WHITE = "#fff4dc";
const DUST = "#c4844a";
const DUST_PALE = "#f4dca8";

/** live particles; the oldest is dropped past this, so a long fight cannot grow unbounded */
const CAP = 200;

/** the largest wall-clock step one frame may age the world by, so a tab left in the background does not flush everything at once */
const MAX_STEP_MS = 100;

interface Particle {
  kind: FxOp["kind"];
  x: number; y: number;
  vx: number; vy: number;      // px per second
  gravity: number;             // px per second squared, screen y down
  r0: number; r1: number;      // radius at birth and at death
  color: string;
  life: number;                // ms
  age: number;                 // ms
}

interface Point { x: number; y: number }

interface World {
  live: Particle[];
  rnd: () => number;
  /** the last place each fighter was seen, in screen px at the feet */
  feet: Map<number, Point>;
  /** the previous frame's timestamp, or -1 before the first frame */
  last: number;
}

export interface Fx {
  onEvent(ev: FightEvent, toScreen: (x: number, z: number, h: number) => Point): void;
  frame(nowMs: number): FxOp[];
}

/** the demos' lcg, kept here so fx never reaches for the core's rng */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// ---- spawning ---------------------------------------------------------------

function add(w: World, p: Particle): void {
  if (w.live.length >= CAP) w.live.shift();
  w.live.push(p);
}

function star(w: World, x: number, y: number, angle: number, speed: number, color: string): void {
  add(w, {
    kind: "star", x, y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    gravity: 160, r0: 3 + w.rnd() * 2, r1: 1, color, life: 320, age: 0,
  });
}

function dot(w: World, x: number, y: number, spread: number, color: string): void {
  add(w, {
    kind: "dot",
    x: x + (w.rnd() - 0.5) * spread, y: y + (w.rnd() - 0.5) * 4,
    vx: (w.rnd() - 0.5) * 40, vy: -10 - w.rnd() * 25,
    gravity: 90, r0: 2 + w.rnd() * 2, r1: 1, color, life: 380 + w.rnd() * 160, age: 0,
  });
}

function ring(w: World, x: number, y: number, r1: number, color: string, life: number): void {
  add(w, { kind: "ring", x, y, vx: 0, vy: 0, gravity: 0, r0: 3, r1, color, life, age: 0 });
}

/** n stars evenly around the compass with a little jitter, so a burst never looks stamped */
function burst(w: World, x: number, y: number, n: number, speed: number): void {
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (w.rnd() - 0.5) * 0.6;
    star(w, x, y, angle, speed * (0.7 + w.rnd() * 0.6), i % 2 === 0 ? YELLOW : WHITE);
  }
}

function dots(w: World, at: Point, n: number, spread: number, color: string): void {
  for (let i = 0; i < n; i++) dot(w, at.x, at.y, spread, color);
}

// ---- the two calls the harness makes ----------------------------------------

function onEvent(w: World, ev: FightEvent, toScreen: (x: number, z: number, h: number) => Point): void {
  if (ev.kind === "hit") {
    const at = toScreen(ev.x, ev.z, ev.h);
    const ground = toScreen(ev.x, ev.z, 0);
    w.feet.set(ev.target, ground);
    w.feet.set(ev.attacker, ground);
    burst(w, at.x, at.y, 6 + Math.floor(w.rnd() * 3), 150);
    dots(w, ground, 3, 18, DUST);
    return;
  }
  const who = ev.kind === "land" ? ev.who : ev.kind === "knockdown" || ev.kind === "ko" ? ev.target : -1;
  const at = w.feet.get(who);
  // "block" and "phase" draw nothing: neither carries a position, and a phase
  // change is the HUD's job to show, not a puff of dust. Neither does anything
  // for a fighter nobody has hit yet - a burst at (0, 0) is worse than none.
  if (at === undefined) return;
  if (ev.kind === "knockdown") { ring(w, at.x, at.y, 26, DUST_PALE, 420); dots(w, at, 6, 30, DUST); }
  else if (ev.kind === "ko") { ring(w, at.x, at.y, 48, WHITE, 560); burst(w, at.x, at.y - 14, 10, 190); }
  else if (ev.kind === "land") dots(w, at, 2, 22, DUST_PALE);
}

/**
 * Advance by the wall-clock delta since the previous call and hand back what
 * is still alive. The FIRST call advances nothing - `nowMs` on frame one is
 * whatever the page's clock happened to read, and treating it as a delta ages
 * every particle out before it is ever drawn.
 */
function frame(w: World, nowMs: number): FxOp[] {
  const dtMs = w.last < 0 ? 0 : Math.max(0, Math.min(MAX_STEP_MS, nowMs - w.last));
  w.last = nowMs;
  const dt = dtMs / 1000;
  const ops: FxOp[] = [];
  let keep = 0;
  for (const p of w.live) {
    p.age += dtMs;
    if (p.age >= p.life) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    w.live[keep++] = p;
    const t = p.age / p.life;
    ops.push({
      kind: p.kind,
      x: Math.round(p.x),
      y: Math.round(p.y),
      r: Math.max(1, Math.round(p.r0 + (p.r1 - p.r0) * t)),
      color: p.color,
      alpha: 1 - t,
    });
  }
  w.live.length = keep;
  return ops;
}

export function createFx(): Fx {
  const w: World = { live: [], rnd: lcg(0x9e3779b9), feet: new Map(), last: -1 };
  return {
    onEvent: (ev, toScreen) => onEvent(w, ev, toScreen),
    frame: (nowMs) => frame(w, nowMs),
  };
}
