// The session snapshot — "carry on where you left off".
//
// A game reports its CURRENT POSITION. It never decides what makes a stored
// position usable. Same shape as economy.ts and score.ts one layer up: 22 games
// must not each invent their own answer to "is this old save still safe to
// load", because the wrong answer does not crash — it renders a plausible board
// that the game's own rules can no longer explain.
//
// That is the whole reason this is a port and not a `ctx.storage.get("state")`
// in each renderer. A restored snapshot is the only INPUT to a game that this
// app does not generate fresh, and it comes off a disk that a previous build
// wrote, that a browser may have truncated, and that a person can hand-edit.
// Everything here is a rejection rule.
//
// What it is NOT: a device-to-device transfer. The key never matches
// `records.ts`'s anchored `ellaz:<game>:score:<board>` pattern, so a restored
// cloud document cannot write one and a backup code does not carry one. A
// half-finished sudoku is a fact about THIS tablet, in the way a personal best
// is a fact about the player.
import type { SaveStore } from "./types";

/** The key, under the game's own `ellaz:<gameId>:` namespace. */
export const SESSION_KEY = "session";

/**
 * Past this, a snapshot is treated as absent.
 *
 * Not a storage measure — there is one key per game and each write overwrites
 * the last, so nothing accumulates. It is about what a child expects: reopening
 * a game you last touched in March and finding it mid-puzzle reads as the app
 * being confused, not as it being helpful. A month is well past the point where
 * anyone remembers the position they left.
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A serialized snapshot larger than this is refused.
 *
 * Defensive, and it should never fire: the biggest real snapshot in the catalog
 * is a coloring drawing's fill map at roughly 1 KB. It exists because
 * `ctx.storage` lets a game persist ANYTHING — a canvas as a data URL is one
 * careless line away — and localStorage is the same quota that holds
 * `ellaz:profile:v1`. A snapshot must never be the reason a child's coins fail
 * to save. See `RewardResult.persisted`.
 */
export const SESSION_MAX_BYTES = 64 * 1024;

/**
 * What a game declares about its own snapshot. One module-level const per game,
 * living beside the type it describes.
 *
 * `version` and `validate` are deliberately both required and cover different
 * failures. Version catches the snapshot this build's own predecessor wrote in
 * a shape that no longer exists — the common case, and the one a developer
 * causes. `validate` catches truncation and hand-editing, which no version
 * number can see. Neither is redundant.
 */
export interface SessionSpec<T> {
  /**
   * Bump this whenever the snapshot's SHAPE changes. A snapshot written under
   * any other version is discarded rather than migrated: a half-finished board
   * is worth a few minutes of play, and migration code for it would be a second
   * copy of the game's rules that nothing keeps in sync.
   */
  version: number;
  /**
   * Cheap shape check against what THIS build can actually use. Must not throw
   * and must not assume any field exists — it is handed whatever was on the
   * disk. Check the things whose absence would render a broken board: grid
   * dimensions, array lengths, the difficulty this position belongs to.
   */
  validate(value: unknown): value is T;
}

/** What actually lands on the disk. `s` is the game's own snapshot. */
interface Envelope {
  v: number;
  at: number;
  s: unknown;
}

/**
 * Read the position a game was left in, write the position it is in now.
 *
 * Like `ScorePort` and `RewardsPort`, the game does not get to override the
 * policy: there is no way to ask for a snapshot that is too old, too big, or
 * written under a version this build does not understand. `load` answers
 * `undefined` for every one of those, which is the same answer as "never
 * played", so a game needs exactly one code path for both.
 */
export interface SessionPort {
  /** The stored position, or undefined for anything this build cannot trust. */
  load<T>(spec: SessionSpec<T>): T | undefined;
  /** Overwrite the stored position. Never throws; a refused write is silent. */
  save<T>(spec: SessionSpec<T>, snapshot: T): void;
  /** Forget the position. Call it when the run ENDS — see the note below. */
  clear(): void;
}

function isEnvelope(value: unknown): value is Envelope {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Partial<Envelope>;
  return typeof e.v === "number" && typeof e.at === "number" && "s" in e;
}

export function createSessionPort(
  storage: SaveStore,
  opts: { now?: () => number } = {},
): SessionPort {
  const now = opts.now ?? (() => Date.now());

  return {
    load<T>(spec: SessionSpec<T>): T | undefined {
      // `storage.get` already swallows a parse failure and answers the
      // fallback, so a truncated write arrives here as null rather than as a
      // throw. Everything below is about a snapshot that PARSED and is still
      // not usable, which is the harder half.
      const raw = storage.get<unknown>(SESSION_KEY, null);
      if (!isEnvelope(raw)) return undefined;
      if (raw.v !== spec.version) return undefined;

      // A stamp from the future means a clock change or a newer build; treat it
      // as present rather than expired, since `age < 0` would otherwise sail
      // through the max-age check for the wrong reason.
      const age = now() - raw.at;
      if (!Number.isFinite(age) || age > SESSION_MAX_AGE_MS) return undefined;

      // The game's own check runs LAST and inside a try/catch. It is ordinary
      // game code being handed hostile input, and a validator that throws on a
      // shape it did not anticipate must degrade to "no snapshot", never to a
      // white screen where a game used to be.
      try {
        return spec.validate(raw.s) ? raw.s : undefined;
      } catch {
        return undefined;
      }
    },

    save<T>(spec: SessionSpec<T>, snapshot: T): void {
      let size: number;
      try {
        // Measured, not guessed. `JSON.stringify` also answers undefined for an
        // undefined snapshot and throws on a cycle, and both are a game bug
        // that must not become a crash in front of a child.
        const json = JSON.stringify(snapshot);
        if (typeof json !== "string") return;
        size = json.length;
      } catch {
        return;
      }
      // Over the cap, the PREVIOUS snapshot is deliberately left alone rather
      // than cleared. Snapshots only grow within a run, so what is on the disk
      // is the last one that fit — an earlier position in the same puzzle.
      // Resuming a few moves back beats resuming nothing.
      if (size > SESSION_MAX_BYTES) return;

      const envelope: Envelope = { v: spec.version, at: now(), s: snapshot };
      storage.set(SESSION_KEY, envelope);
    },

    clear(): void {
      storage.remove(SESSION_KEY);
    },
  };
}
