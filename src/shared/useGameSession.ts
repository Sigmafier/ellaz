// Persisting the position a game is in, without paying for it every move.
//
// The naive shape — write the snapshot in an effect whenever the state changes
// — is wrong here for a reason specific to this catalogue: the snapshot of a
// timed game contains its CLOCK, which changes every 100ms. That effect would
// fire ten times a second forever, on a board nobody is touching.
//
// So the snapshot arrives as a GETTER, read only at the moments that matter,
// and nothing about it re-renders anything:
//
//   pause    — the tab was hidden. On a phone this is also how a session
//              usually ENDS, so it is the single most important flush.
//   unmount  — they tapped home, or switched games.
//   interval — the crash floor. Pause and unmount cover every ordinary exit;
//              this bounds what a kill or a power loss can cost.
//   live:false — the run ended. Flushes IMMEDIATELY rather than on the next
//              tick, so a solved board is never sitting on the disk waiting to
//              be restored as a puzzle that is already finished.
//
// Deliberately thin, like useGameTimer beside it: vitest here runs
// `environment: "node"` and collects only `*.test.ts`, so a React hook in this
// repo is not unit-testable. Every rule worth pinning lives in `sdk/session.ts`,
// which is pure and has 24 tests over it.
import { useEffect, useRef } from "react";
import type { GameContext, SessionSpec } from "@sdk/index";

/** The crash floor. Long enough to be free, short enough to lose nothing real. */
const DEFAULT_INTERVAL_MS = 5000;

export interface GameSessionOptions {
  /**
   * Is there still a position worth returning to?
   *
   * False the moment the run is over — solved, dead, game over — which CLEARS
   * the snapshot rather than freezing it. Restoring a finished board would show
   * a child a puzzle with nothing left to do and no obvious way to understand
   * why.
   */
  live: boolean;
  /** How often to flush while playing. Default 5s. */
  intervalMs?: number;
}

/**
 * Keep the stored position in step with the live one.
 *
 * `getSnapshot` may return null to mean "nothing worth storing right now" —
 * a game mid-animation, a board that has not been touched yet. Null clears,
 * exactly like `live: false`, so a game has one way to say it.
 */
export function useGameSession<T>(
  ctx: GameContext,
  spec: SessionSpec<T>,
  getSnapshot: () => T | null,
  opts: GameSessionOptions,
): void {
  const { live, intervalMs = DEFAULT_INTERVAL_MS } = opts;

  // All three are inline values that change identity every render. Held in
  // refs, they cannot re-create the interval and reset its cadence — the same
  // trap `useGameTimer` documents for `onTick`.
  const getRef = useRef(getSnapshot);
  const specRef = useRef(spec);
  const liveRef = useRef(live);
  useEffect(() => {
    getRef.current = getSnapshot;
    specRef.current = spec;
    liveRef.current = live;
  });

  // Whether the tab is hidden. The pause flush has already stored the position,
  // so the interval must not keep rewriting it against a board nobody can see.
  const pausedRef = useRef(false);

  const flushRef = useRef(() => {});
  flushRef.current = () => {
    // Reading the getter is game code. It runs during teardown and during a
    // visibility change, where a half-updated render is entirely possible, and
    // a throw here must not take the game or the portal down with it.
    try {
      const snapshot = liveRef.current ? getRef.current() : null;
      if (snapshot === null || snapshot === undefined) ctx.session.clear();
      else ctx.session.save(specRef.current, snapshot);
    } catch {
      /* nothing to store is always a valid outcome — see session.ts */
    }
  };

  // The run ended: clear now, not on the next tick. Nothing happens on the
  // first mount while `live` is true, so a snapshot just restored is not
  // immediately overwritten by an identical one.
  useEffect(() => {
    if (!live) flushRef.current();
  }, [live]);

  useEffect(() => {
    const offPause = ctx.onPause(() => {
      pausedRef.current = true;
      flushRef.current();
    });
    const offResume = ctx.onResume(() => {
      pausedRef.current = false;
    });
    // Both unsubscribes run, always. Each of these RETURNS one, and dropping it
    // leaks a listener that keeps a dead game's refs alive for the session.
    return () => {
      offPause();
      offResume();
    };
  }, [ctx]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (!pausedRef.current) flushRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs]);

  // Unmount. Last effect declared, so it cleans up LAST — after the interval is
  // already gone — and the final write is the one that lands.
  useEffect(() => () => flushRef.current(), []);
}
