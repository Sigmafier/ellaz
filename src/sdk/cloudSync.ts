// The thin half of cloud backup — the part that may live in the shell.
//
// `cloud.ts` is dynamically imported so it, `cloudConfig.ts` and
// `backupCode.ts` land in their own `cloud-*` chunk rather than on the first
// visit. That is the same three-part arrangement PostHog uses, and skipping any
// one part silently cancels it:
//   1. the dynamic import below,
//   2. a `cloud` branch in vite.config `manualChunks`, placed BEFORE the
//      catch-all that pins everything under src/sdk to the shell,
//   3. `**/cloud-*.js` in the PWA `globIgnores`.
// See .claude/rules/precache-glob-sweeps-new-chunks.md.
//
// Nothing here is on a gameplay path. Every function resolves to a null, a
// false, or nothing at all when the cloud is unreachable, and no caller is
// allowed to care.
import type { Cloud, CloudIdentity } from "./cloud";
import type { ProfileV1 } from "./profile";
import { wallet } from "./wallet";

/**
 * How long the app sits on a change before uploading.
 *
 * A child clearing a level can move coins, stars, a per-game record and a
 * purchase within a second or two of each other, and each of those is its own
 * wallet notification. Uploading per notification would be several requests for
 * one moment of play. Five seconds coalesces a burst into a single write while
 * staying far shorter than the time it takes to put a tablet down.
 */
const DEBOUNCE_MS = 5000;

let loaded: Cloud | null = null;
let loading: Promise<Cloud | null> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Load the chunk at most once. A failed load is not cached — the next call retries. */
function load(): Promise<Cloud | null> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = import("./cloud")
      .then((m) => {
        loaded = m.createCloud();
        return loaded;
      })
      .catch(() => null)
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/**
 * Is there anything here worth backing up?
 *
 * A first-time visitor who bounces off the home screen should not mint an
 * anonymous account and a document. Waiting until the profile holds something
 * keeps the free quota spent on real players and means a child who never earns
 * anything never touches the network at all.
 */
function worthSaving(profile: ProfileV1): boolean {
  return (
    profile.coins > 0 ||
    profile.stars > 0 ||
    profile.owned.length > 0 ||
    profile.name !== undefined ||
    Object.keys(profile.games).length > 0
  );
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void pushNow();
  }, DEBOUNCE_MS);
}

/** Upload the current profile now, skipping the debounce. Never throws. */
export async function pushNow(): Promise<boolean> {
  const profile = wallet.snapshot();
  if (!worthSaving(profile)) return false;
  const cloud = await load();
  if (!cloud) return false;
  return cloud.push(profile);
}

/**
 * Begin mirroring wallet changes. Idempotent, and safe to call before the
 * player has anything to mirror.
 *
 * Called after first paint, like `analytics.init()`, so the chunk fetch never
 * competes with the home grid rendering.
 */
export function startCloudSync(): void {
  if (started) return;
  started = true;

  wallet.subscribe(() => schedule());

  // A tab going away is the last chance to flush a pending change. `hidden` is
  // the reliable signal on mobile — `beforeunload` does not fire when a phone
  // browser is backgrounded and then killed, which is how most sessions end.
  try {
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && timer) {
          clearTimeout(timer);
          timer = null;
          void pushNow();
        }
      });
    }
  } catch {
    /* a browser that refuses the listener simply waits for the debounce */
  }
}

/** The backup code to show the player, connecting if necessary. `null` if unreachable. */
export async function cloudIdentity(): Promise<CloudIdentity | null> {
  const cloud = await load();
  if (!cloud) return null;
  return cloud.connect();
}

/**
 * Look up the profile behind a typed code WITHOUT applying it.
 *
 * Deliberately separated from adopting it: the caller shows the player what
 * they are about to get, and only then commits. Restoring silently over a
 * device that already has progress is the one genuinely destructive thing this
 * feature can do.
 */
export async function cloudRestore(code: string): Promise<ProfileV1 | null> {
  const cloud = await load();
  if (!cloud) return null;
  return cloud.restore(code);
}
