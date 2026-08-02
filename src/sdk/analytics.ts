import type { AnalyticsPort } from "./types";

// Anonymous, kid-safe analytics behind a port so the backend is swappable.
// COPPA "internal operations": anonymous events only — never identify(), no PII,
// no autocapture, no session replay, no behavioral ads. Everything is
// best-effort: analytics failure must never block gameplay.
//
// PostHog is loaded LAZILY, after first paint, and never from the shell chunk.
// It is 74.5 KB gz — 52% of everything a child downloads before seeing anything —
// and most of that is sessionRecording/surveys/toolbar/rrweb, every one of which
// the rules above forbid us from using. Deferring it is the single largest win
// available on first visit.
//
// Three things make that work, and skipping any one of them silently cancels it:
//   1. the dynamic import below,
//   2. a `vendor-analytics` branch in vite.config manualChunks, so it becomes its
//      own chunk instead of being folded somewhere unhelpful,
//   3. `**/vendor-analytics-*.js` in the PWA globIgnores — the precache glob
//      sweeps `**/*.js`, so without it the new chunk is precached on first visit
//      and the payload does not move at all. The build stays green either way.
// See .claude/rules/precache-glob-sweeps-new-chunks.md.
//
// Both exports below keep their exact signatures, so no call site changes.

/**
 * How many events may wait for the library to arrive.
 *
 * The window is small (one idle callback plus a script fetch) but it is not
 * zero, and on a stalled network it never closes. A child playing through that
 * must not accumulate unbounded memory, so the queue is bounded and drops the
 * OLDEST — a late event is worth more than an early one when only some survive.
 */
export const QUEUE_CAP = 50;

export interface QueuedEvent {
  event: string;
  props?: Record<string, unknown>;
}

export interface EventQueue {
  push(e: QueuedEvent): void;
  /** Removes and returns everything, so a second flush cannot double-send. */
  drain(): QueuedEvent[];
  readonly size: number;
}

/** Bounded FIFO. Pure, so it is testable in the node vitest env. */
export function createEventQueue(cap: number = QUEUE_CAP): EventQueue {
  const items: QueuedEvent[] = [];
  return {
    push(e: QueuedEvent) {
      items.push(e);
      if (items.length > cap) items.shift();
    },
    drain() {
      return items.splice(0, items.length);
    },
    get size() {
      return items.length;
    },
  };
}

/** The slice of posthog-js this app actually uses. */
interface PostHogLike {
  init(key: string, opts: Record<string, unknown>): void;
  capture(event: string, props?: Record<string, unknown>): void;
}

/**
 * Import posthog-js, resolving null on ANY failure rather than rejecting.
 *
 * Offline, a content blocker, a CDN 404 or a module that arrives in an
 * unexpected shape all land here, and none of them may reach gameplay. The
 * importer is injectable as the last parameter (the rng convention) so this is
 * testable without mocking a dynamic import.
 */
export async function loadPostHog(
  importer: () => Promise<{ default: unknown }> = () => import("posthog-js"),
): Promise<PostHogLike | null> {
  try {
    const mod = await importer();
    const ph = mod?.default as PostHogLike | undefined;
    return typeof ph?.capture === "function" ? ph : null;
  } catch {
    return null;
  }
}

let started = false;
/** The live library, once it has loaded AND initialised. Null until then. */
let ph: PostHogLike | null = null;
/** Set when the load or init failed for good, so later events stop queueing. */
let unavailable = false;
const pending = createEventQueue();

/**
 * Run after first paint. `requestIdleCallback` where it exists (all our target
 * browsers except Safari), a macrotask everywhere else — the point is only that
 * it is not on the critical path, so a 0 ms timeout is a fine fallback.
 */
function afterFirstPaint(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (typeof ric === "function") ric(fn);
  else setTimeout(fn, 0);
}

async function startPostHog(key: string, host: string): Promise<void> {
  const loaded = await loadPostHog();
  if (!loaded) {
    unavailable = true;
    pending.drain();
    return;
  }
  try {
    loaded.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: "localStorage",
      // anonymous mode: no person profiles are created unless we identify() (we never do)
      person_profiles: "never",
      respect_dnt: true,
    });
  } catch {
    unavailable = true;
    pending.drain();
    return;
  }
  ph = loaded;
  for (const e of pending.drain()) {
    try {
      ph.capture(e.event, e.props);
    } catch {
      /* never throw from analytics */
    }
  }
}

function init(): void {
  if (started) return;
  started = true;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";
  if (!key) {
    // No key configured (e.g. local dev) — events log to console in dev, silent in prod.
    return;
  }
  afterFirstPaint(() => {
    void startPostHog(key, host);
  });
}

function emit(event: string, props?: Record<string, unknown>): void {
  try {
    const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
    if (key && started) {
      if (ph) ph.capture(event, props);
      else if (!unavailable) pending.push({ event, props });
    } else if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[ellaz:analytics]", event, props ?? {});
    }
  } catch {
    /* never throw from analytics */
  }
}

/** Portal-level analytics (session, navigation). */
export const analytics = {
  init,
  track: emit,
};

/** Per-game analytics port, auto-tags gameId + the level taxonomy. */
export function createAnalyticsPort(gameId: string): AnalyticsPort {
  const tag = (props?: Record<string, unknown>) => ({ game: gameId, ...props });
  return {
    track: (event, props) => emit(event, tag(props)),
    levelStart: (level) => emit("level_start", tag({ level })),
    levelComplete: (level, ms) => emit("level_complete", tag({ level, ms })),
    levelFail: (level, why) => emit("level_fail", tag({ level, why })),
  };
}
