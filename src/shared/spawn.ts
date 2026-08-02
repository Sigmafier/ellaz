// The React + Web Animations glue over `spawn.pure.ts`.
//
// WHY WAAPI, AND WHY THERE IS NO GAME LOOP HERE. Motion is DECLARED to the
// browser ("travel from A to B over N ms") and interpolated by the compositor
// at the display's real refresh rate. A hand-rolled `1000/60` accumulator
// driven by requestAnimationFrame only crosses its threshold on every SECOND
// frame of a 120 Hz screen, so half the frames redraw the prop exactly where
// the last one did — structural, not occasional, and it reads as input lag.
// That trap cost this project three rounds of measurement and two wrong
// verdicts; see `.claude/rules/fixed-timestep-must-match-display.md`. Nothing
// in this file integrates a position, and nothing should ever start doing so.
// Where a prop IS at any instant is asked of the DOM at tap time via
// `getBoundingClientRect()`, which is the compositor's own answer.
//
// The only timer here is a COARSE housekeeping tick (spawn + expire, ~12 Hz).
// It is deliberately unrelated to the frame clock: it never moves anything, so
// its cadence cannot show up as motion, and being late only delays a spawn.
//
// Deliberately thin — vitest here runs `environment: "node"` and collects only
// `*.test.ts`, so a `.ts` module using React state is NOT unit-testable in this
// repo. Every decision worth testing lives in `spawn.pure.ts`.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { GameContext } from "@sdk/index";
import {
  alive,
  isAlive,
  judgeTap,
  spawn,
  type Prop,
  type SpawnSpec,
  type TapVerdict,
} from "./spawn.pure";

/** How often the housekeeping tick runs. Not a frame rate — see the header. */
const TICK_MS = 80;

/** Fallback duration for a prop with no finite lifetime (the reaction light). */
const APPEAR_MS = 320;

const DEFAULT_LANES = 5;

/**
 * Spread this on the element props are positioned inside.
 *
 * `touchAction: "none"` is load-bearing, not cosmetic: without it the browser
 * waits ~300ms to see whether a touch was a scroll before delivering the
 * pointer event, and every tap in a timed game feels late.
 */
export const PLAY_SURFACE_STYLE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  touchAction: "none",
  userSelect: "none",
};

/** How a prop moves: keyframes, plus any timing overrides. */
export interface SpawnMotion {
  keyframes: Keyframe[];
  options?: KeyframeAnimationOptions;
}

export interface SpawnerOptions<T> {
  ctx: GameContext;
  spec: SpawnSpec;
  /** False stops spawning AND freezes expiry (level select, round over). */
  running: boolean;
  /** What the next prop IS, given the lane it landed on. */
  kindFor: (lane: number) => T;
  /** Non-overlapping slots the renderer turns into positions. Default 5. */
  lanes?: number;
  /**
   * How a prop moves. Omit for one that appears and sits. Under
   * `prefers-reduced-motion` this is IGNORED and the prop fades in place.
   */
  motion?: (prop: Prop<T>) => SpawnMotion;
  /** A prop expired untapped. Fires once per prop. */
  onExpire?: (prop: Prop<T>) => void;
  rng?: () => number;
}

export interface Spawner<T> {
  /** Alive right now. Render one element per entry, keyed by `id`. */
  props: readonly Prop<T>[];
  /** Ref callback: `ref={(el) => s.attach(p, el)}`. Starts the animation. */
  attach: (prop: Prop<T>, el: HTMLElement | null) => void;
  /** The topmost live prop under a VIEWPORT point, or null. */
  hitTest: (x: number, y: number) => Prop<T> | null;
  /**
   * Hit-test and judge in one call. Does NOT remove anything — the five games
   * disagree about what a wrong tap costs, so removal is the caller's call.
   */
  tap: (x: number, y: number, target: T) => { prop: Prop<T> | null; verdict: TapVerdict };
  /** Take a prop off the board (after a hit). Safe to call twice. */
  remove: (id: number) => void;
  /** Clear the board and restart the clock — for a level change. */
  reset: () => void;
}

/** Honour the reduced-motion preference the same way `@juice/effects` does. */
function prefersReducedMotion(): boolean {
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

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

/** Appear in place: the reduced-motion form, and the default for a still prop. */
const APPEAR: Keyframe[] = [
  { opacity: 0, transform: "scale(0.85)" },
  { opacity: 1, transform: "scale(1)", offset: 0.25 },
  { opacity: 1, transform: "scale(1)" },
];

/**
 * Props that appear, live for a while, maybe move, and get tapped or expire.
 *
 * Owns four things and nothing else: the live list, one WAAPI animation per
 * prop, a pause-aware clock, and cleanup. Rules (which kind to ask for, what a
 * wrong tap costs, when the round ends) stay in the game.
 */
export function useSpawner<T>(o: SpawnerOptions<T>): Spawner<T> {
  const { ctx, running } = o;
  const [props, setProps] = useState<readonly Prop<T>[]>([]);

  // Everything the tick reads lives in a ref, refreshed every render. Callbacks
  // are inline arrows (a fresh identity each time) and `spec` is usually an
  // object literal, so depending on them would re-create the interval on every
  // render — which resets its phase and, at a fast enough render rate, starves
  // the spawner outright. Reading through refs also means a mid-round
  // difficulty change is picked up on the very next tick, with no restart.
  const kindForRef = useRef(o.kindFor);
  const motionRef = useRef(o.motion);
  const onExpireRef = useRef(o.onExpire);
  const specRef = useRef(o.spec);
  const lanesRef = useRef(o.lanes ?? DEFAULT_LANES);
  const rngRef = useRef(o.rng);
  useEffect(() => {
    kindForRef.current = o.kindFor;
    motionRef.current = o.motion;
    onExpireRef.current = o.onExpire;
    specRef.current = o.spec;
    lanesRef.current = o.lanes ?? DEFAULT_LANES;
    rngRef.current = o.rng;
  });

  const propsRef = useRef<readonly Prop<T>[]>([]);
  const animsRef = useRef(new Map<number, Animation>());
  const elsRef = useRef(new Map<number, HTMLElement>());
  const lastSpawnRef = useRef(-Infinity);
  // Ids never restart, not even on reset: a reused id is a reused React key,
  // which reuses the DOM node and inherits the dead prop's animation.
  const nextIdRef = useRef(1);

  // The pause-aware game clock, as a span accumulator: `banked` holds completed
  // time, `spanStart` marks the live span (null while frozen). Both spawning
  // and expiry read it, so freezing it freezes the whole board together — a
  // backgrounded tab neither fills with props nor expires the ones on screen.
  const bankedRef = useRef(0);
  const spanStartRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const runningRef = useRef(running);

  const elapsed = useCallback(() => {
    const start = spanStartRef.current;
    return bankedRef.current + (start === null ? 0 : now() - start);
  }, []);

  /** Bank the clock and hold every animation, or open both back up. */
  const setFrozen = useCallback((frozen: boolean) => {
    if (frozen) {
      const start = spanStartRef.current;
      if (start !== null) {
        bankedRef.current += now() - start;
        spanStartRef.current = null;
      }
      for (const a of animsRef.current.values()) a.pause();
    } else {
      if (spanStartRef.current === null) spanStartRef.current = now();
      for (const a of animsRef.current.values()) a.play();
    }
  }, []);

  const startAnimation = useCallback(
    (prop: Prop<T>, el: HTMLElement) => {
      const remaining = prop.lifeMs - (elapsed() - prop.bornAt);
      const life = Number.isFinite(remaining) && remaining > 0 ? remaining : APPEAR_MS;

      const reduced = prefersReducedMotion();
      const custom = reduced ? undefined : motionRef.current?.(prop);
      const keyframes = custom ? custom.keyframes : APPEAR;
      const options: KeyframeAnimationOptions = {
        duration: reduced ? Math.min(APPEAR_MS, life) : life,
        easing: "linear",
        fill: "forwards",
        ...(reduced ? undefined : custom?.options),
      };

      let anim: Animation;
      try {
        anim = el.animate(keyframes, options);
      } catch {
        return; // A prop that cannot animate is still tappable. Never throw at a kid.
      }
      animsRef.current.set(prop.id, anim);
      if (pausedRef.current || !runningRef.current) anim.pause();
    },
    [elapsed],
  );

  const dropAnimation = useCallback((id: number) => {
    const anim = animsRef.current.get(id);
    if (anim) {
      try {
        anim.cancel();
      } catch {
        /* already finished or detached */
      }
      animsRef.current.delete(id);
    }
    elsRef.current.delete(id);
  }, []);

  const attach = useCallback(
    (prop: Prop<T>, el: HTMLElement | null) => {
      // A NULL element is IGNORED on purpose. `ref={(el) => attach(p, el)}` is a
      // fresh closure every render, so React detaches and re-attaches on every
      // single render; cancelling here would restart the animation each time and
      // the prop would never actually travel. Dead entries are swept by the tick
      // instead, which is keyed on the prop list rather than on ref churn.
      if (!el) return;
      if (elsRef.current.get(prop.id) === el) return;
      // A genuinely new node (React remounted the row): retire the animation
      // pointing at the old one and re-run the REMAINING life on the new.
      dropAnimation(prop.id);
      elsRef.current.set(prop.id, el);
      startAnimation(prop, el);
    },
    [dropAnimation, startAnimation],
  );

  // Reads and writes `propsRef` rather than using a `setProps(prev => ...)`
  // updater: React may run an updater twice, and cancelling an animation inside
  // one is exactly the misfire the game conventions warn about.
  const remove = useCallback(
    (id: number) => {
      dropAnimation(id);
      const next = propsRef.current.filter((p) => p.id !== id);
      propsRef.current = next;
      setProps(next);
    },
    [dropAnimation],
  );

  const hitTest = useCallback(
    (x: number, y: number): Prop<T> | null => {
      const t = elapsed();
      const live = propsRef.current;
      // Backwards: the newest prop renders last and therefore sits on top.
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        if (!isAlive(p, t)) continue;
        const el = elsRef.current.get(p.id);
        if (!el || !el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return p;
      }
      return null;
    },
    [elapsed],
  );

  const tap = useCallback(
    (x: number, y: number, target: T) => {
      const prop = hitTest(x, y);
      return { prop, verdict: judgeTap(prop, target, elapsed()) };
    },
    [hitTest, elapsed],
  );

  const reset = useCallback(() => {
    for (const id of [...animsRef.current.keys()]) dropAnimation(id);
    elsRef.current.clear();
    lastSpawnRef.current = -Infinity;
    bankedRef.current = 0;
    spanStartRef.current = runningRef.current && !pausedRef.current ? now() : null;
    propsRef.current = [];
    setProps([]);
  }, [dropAnimation]);

  // Portal pause/resume. BOTH unsubscribes run on cleanup — each subscribe
  // RETURNS one, and dropping them leaks a listener that keeps a dead game's
  // refs (and its animations) alive for the rest of the session.
  useEffect(() => {
    const offPause = ctx.onPause(() => {
      pausedRef.current = true;
      setFrozen(true);
    });
    const offResume = ctx.onResume(() => {
      pausedRef.current = false;
      if (runningRef.current) setFrozen(false);
    });
    return () => {
      offPause();
      offResume();
    };
  }, [ctx, setFrozen]);

  useEffect(() => {
    runningRef.current = running;
    setFrozen(!running || pausedRef.current);
  }, [running, setFrozen]);

  // The housekeeping tick: expire, then maybe spawn. Cleared on every
  // dependency change AND on unmount.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const t = elapsed();
      const cur = propsRef.current;

      const live = alive(cur, t);
      if (live.length !== cur.length) {
        const survivors = new Set(live.map((p) => p.id));
        for (const p of cur) {
          if (survivors.has(p.id)) continue;
          dropAnimation(p.id);
          onExpireRef.current?.(p);
        }
      }

      const born = spawn<T>(
        {
          props: live,
          now: t,
          lastSpawnAt: lastSpawnRef.current,
          spec: specRef.current,
          lanes: lanesRef.current,
          nextId: nextIdRef.current,
          kindFor: (lane) => kindForRef.current(lane),
        },
        rngRef.current,
      );
      if (born) {
        nextIdRef.current += 1;
        lastSpawnRef.current = t;
      }

      if (live.length === cur.length && !born) return; // nothing changed
      const next = born ? [...live, born] : live;
      propsRef.current = next;
      setProps(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, elapsed, dropAnimation]);

  // Unmount: cancel EVERY animation. A leaked one outlives the game and keeps
  // running on the home screen, holding a reference to a detached element.
  useEffect(() => {
    const anims = animsRef.current;
    const els = elsRef.current;
    return () => {
      for (const a of anims.values()) {
        try {
          a.cancel();
        } catch {
          /* already gone */
        }
      }
      anims.clear();
      els.clear();
      spanStartRef.current = null;
    };
  }, []);

  return { props, attach, hitTest, tap, remove, reset };
}
