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
import type { BoardStanding, BoardWindow, Cloud, CloudIdentity, DeviceState } from "./cloud";
import { boardId } from "./board";
import { readRecords } from "./records";
import { wallet } from "./wallet";
import type { PooledRow } from "./pooled";

/**
 * How long the app sits on a change before uploading.
 *
 * Sized against the free daily write quota, which is FAIL-CLOSED: once it is
 * spent, writes are refused for the rest of the day and backups stop working
 * for every player, not just the one who spent it. So the number of writes is a
 * correctness concern rather than a tuning knob, and the honest question is
 * what a longer window actually costs.
 *
 * It costs at most the last 30 seconds of play, and only when a tab dies
 * without a visibility change — a crash or a force-quit. That is the whole
 * downside, because this is a BACKUP and not live sync: nothing on screen waits
 * for an upload, and the local profile is already saved. Against it, thirty
 * seconds instead of five is a 6x cut in writes during a burst of play.
 *
 * The `visibilitychange` flush below is what makes that trade safe on a phone.
 * Backgrounding the tab is how a mobile session actually ends, and it fires the
 * pending push immediately, so the 30s window is only ever really open while
 * the child is still looking at the game.
 */
const DEBOUNCE_MS = 30000;

let loaded: Cloud | null = null;
let loading: Promise<Cloud | null> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
/**
 * The last profile that actually REACHED the cloud, serialised without
 * `updatedAt`. `null` means "nothing known to be up there", which is also what
 * a failure resets it to.
 */
let lastPushed: string | null = null;

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
function worthSaving({ profile, records }: DeviceState): boolean {
  return (
    profile.coins > 0 ||
    profile.stars > 0 ||
    profile.owned.length > 0 ||
    profile.name !== undefined ||
    Object.keys(profile.games).length > 0 ||
    Object.keys(records).length > 0
  );
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void pushNow();
  }, DEBOUNCE_MS);
}

/**
 * What this profile would look like to a player, ignoring when it was written.
 *
 * `updatedAt` moves on EVERY wallet mutation, including ones that changed
 * nothing a player could see, so a comparison over the whole serialised profile
 * could never match twice and the skip below would be dead code that always let
 * the push through. Dropping the stamp is the entire point of this function.
 */
function fingerprint(state: DeviceState): string {
  const { updatedAt: _ignored, ...rest } = state.profile;
  // Records are part of it: a personal best set while the session coin cap is
  // holding would otherwise move nothing in the profile, and the push carrying
  // that record would be skipped as "already sent".
  return JSON.stringify({ profile: rest, records: state.records });
}

/** Everything this device would hand to another one. */
function deviceState(): DeviceState {
  return { profile: wallet.snapshot(), records: readRecords() };
}

/** Upload the current progress now, skipping the debounce. Never throws. */
export async function pushNow(): Promise<boolean> {
  const state = deviceState();
  if (!worthSaving(state)) return false;

  // Re-uploading a document byte-for-byte identical to the one already up there
  // spends a write out of the daily quota to change nothing. `true` because the
  // cloud does hold this progress, which is what a caller asking "is it backed
  // up?" wants to hear.
  const fresh = fingerprint(state);
  if (fresh === lastPushed) return true;

  const cloud = await load();
  if (!cloud) return false;
  const pushed = await cloud.push(state);
  // Only a real success may be remembered. Forgetting on failure is what makes
  // a failed upload retry instead of being skipped as "already sent".
  lastPushed = pushed ? fresh : null;
  return pushed;
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

/**
 * Put a personal best on its board. Fire-and-forget; never throws.
 *
 * Reached from a win, so everything about it is best-effort: a game id that
 * cannot be a document id, no network, an exhausted quota — each one silently
 * does nothing. A board is a nice thing to be on, never a thing a child can
 * fail to do.
 *
 * A name is MINTED here if the player has none. Names are created lazily by the
 * first screen that shows one, and nothing on the way to a personal best ever
 * shows a child their name — so on the realistic path (open a game, play it
 * well, never visit the room) `wallet.name` is undefined and the row would land
 * on a public board permanently blank. This is the first moment a name is
 * genuinely needed, which is exactly where the name-pool rule says to mint one.
 */
export async function publishScore(
  game: string,
  board: string,
  value: number,
  unit: string,
  at: number = Date.now(),
): Promise<boolean> {
  // Both checked BEFORE minting a name: a publish that will not happen must not
  // leave a side effect behind to show for it.
  const id = boardId(game, board);
  if (id === null) return false;

  const cloud = await load();
  if (!cloud) return false;

  // The stored word ids, not a rendered string: one player has one name in both
  // languages, and the board renders it in whichever the reader is using.
  //
  // `ensureName` returns the picked name even on a device that refused to store
  // it, so a locked-down browser gets a named row rather than a blank one — it
  // just gets a different name next session, which is the better half of that
  // trade.
  const name = wallet.ensureName();
  return cloud.publish({
    board: id,
    name: `${name.adj}__${name.noun}`,
    unit,
    value,
    at,
  });
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
export async function cloudRestore(code: string): Promise<DeviceState | null> {
  const cloud = await load();
  if (!cloud) return null;
  return cloud.restore(code);
}

/**
 * Read a board. `null` when the cloud is unreachable, which a screen shows as
 * "we could not load this" rather than as an empty board — an empty board says
 * nobody is playing, and that is a different and sadder claim.
 */
export async function boardStanding(
  game: string,
  board: string,
  window: BoardWindow,
  unit: string,
): Promise<BoardStanding | null> {
  const id = boardId(game, board);
  if (id === null) return null;
  const cloud = await load();
  if (!cloud) return null;
  return cloud.board(id, window, unit);
}

/**
 * Every score row on the platform, for the pooled standings and medals
 * screens. `null` when the cloud is unreachable — same shape as every other
 * function here, so callers already know how to show it.
 */
export async function allScores(): Promise<{ rows: PooledRow[]; truncated: boolean } | null> {
  const cloud = await load();
  if (!cloud) return null;
  return cloud.scores();
}
