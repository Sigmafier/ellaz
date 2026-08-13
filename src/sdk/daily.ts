// The daily puzzle and the streak — the single place a "day" is decided.
//
// Two halves that share one vocabulary, the date key:
//
//   1. WHICH PUZZLE. There is no backend and there will not be one, so the
//      puzzle of the day is DERIVED from the date rather than fetched. Every
//      device that agrees on the date agrees on the puzzle, forever, offline,
//      with nothing to sync and nothing to go down.
//   2. HOW MANY DAYS IN A ROW. A game reports THAT IT WAS PLAYED, on a given
//      day; this module alone decides what that does to the streak. Same shape
//      as economy.ts (reasons in, coins out) and score.ts (a unit in, a
//      direction out) — a game cannot say "and that should count as three".
//
// EVERYTHING DOWN TO `migrateDaily` IS PURE, ZERO I/O, and that is where the
// policy lives. Below it sit two thin layers that remember and expose: the
// `DailyStore` (one localStorage key) and `createDailyPort` (what a game gets
// as `ctx.daily`). Split exactly the way economy.ts is split from wallet.ts and
// score.ts from scoreboard.ts — the rules stay testable with no storage at all.
//
// THE PRODUCT LAW THIS ENFORCES
// "Losing gives nothing, and never takes anything away"
// (`rewards-economy-convention.md`). So `longest` is a high-water mark and
// nothing here can reduce it, a missed day lapses the current run without
// deducting anything, and there is no "you broke your streak" flag for a screen
// to shame a child with. The absence of that field is the feature.
import { mulberry32, seedFrom } from "@shared/rng";
import { localStorageBackend, type KeyValueBackend } from "./profile";

/**
 * Where the streak lives. Deliberately NOT a `ellaz:<game>:score:<board>` key.
 *
 * `records.ts` validates every incoming key from a restored cloud document
 * against that anchored pattern, so a streak — like a session snapshot — cannot
 * ride a backup code between devices. A streak is a fact about how often
 * somebody opened THIS tablet, in the way a personal best is a fact about the
 * player, and merging two devices' streaks has no honest answer.
 */
export const DAILY_KEY = "ellaz:daily:v1";

/** Exactly a zero-padded `YYYY-MM-DD`. Nothing looser. */
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAY_MS = 86_400_000;

/**
 * A date key as a whole number of days since the epoch, or undefined.
 *
 * THE TRAP THIS EXISTS FOR: the obvious implementation subtracts two `Date`s
 * built from local components and divides by 86,400,000. Under any timezone
 * with daylight saving, one local day a year is 23 hours long and another is
 * 25 — so across the spring shift the division yields 0.958 and floors to ZERO,
 * and the streak stops counting for every child in that timezone, once a year,
 * on a day nobody thinks to test.
 *
 * Parsing the key at UTC midnight sidesteps the whole class: UTC has no
 * shifts, so the difference of two of these is always an exact multiple of a
 * day. The local-ness of the day was already decided, once, by `localDateKey`.
 */
function dayNumber(key: string): number | undefined {
  const m = DATE_KEY_RE.exec(key);
  if (!m) return undefined;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const ms = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(ms)) return undefined;

  // `Date.UTC` ROLLS OVER rather than refusing: month 13 becomes next January
  // and February 30th becomes March 2nd. Without this round-trip a corrupt key
  // reads as a real day and the arithmetic runs happily on a date nobody
  // played. It also rejects a two-digit year, which `Date.UTC` maps into 1900.
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() + 1 !== month ||
    back.getUTCDate() !== day
  ) {
    return undefined;
  }
  return ms / DAY_MS;
}

/** Is this a real calendar day, written the one way this module writes them? */
export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && dayNumber(value) !== undefined;
}

/**
 * Calendar days from `from` to `to` — negative when `to` is earlier, and
 * undefined when either key is unreadable.
 *
 * Undefined rather than NaN on purpose: NaN compares false against every
 * threshold, so it would silently take whichever branch happened to be last.
 */
export function dayDiff(from: string, to: string): number | undefined {
  const a = dayNumber(from);
  const b = dayNumber(to);
  if (a === undefined || b === undefined) return undefined;
  return b - a;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * The day it is where the child is — `YYYY-MM-DD` in the DEVICE's timezone.
 *
 * NEVER `toISOString().slice(0, 10)`. Israel runs UTC+2/+3, so a child playing
 * at 01:00 on Thursday is still on Wednesday in UTC: they would be handed
 * yesterday's puzzle, and playing again after breakfast would count as a second
 * day. Every timezone east of Greenwich has the same problem for some part of
 * every night, and every timezone west of it has the mirror image.
 *
 * An unusable Date answers the empty key rather than "NaN-NaN-NaN", so it lands
 * in the same "no day" state as never having played.
 */
export function localDateKey(d: Date): string {
  const t = d.getTime();
  if (!Number.isFinite(t)) return "";
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

/**
 * A NUL byte, because it can appear in neither a date key nor a game id.
 *
 * Concatenating the two without one lets ("2026-01-01", "1x") and
 * ("2026-01-011", "x") hash the same string, which would silently give two
 * different days the same puzzle. A readable separator like ":" is fine only
 * for as long as no game id ever contains one; this is fine forever.
 */
const SEED_SEPARATOR = "\u0000";

/**
 * The seed for one game's puzzle on one day.
 *
 * Deterministic and device-independent by construction: `seedFrom` is a pure
 * hash, so a phone and a PC on the same date open the same puzzle without ever
 * talking to each other or to us. That is the whole reason there is no backend
 * here — the puzzle is not distributed, it is derived.
 *
 * The consequence is that this function is a CONTRACT with every device that
 * has already run the app. Changing the hash, the separator, or the argument
 * order re-rolls every puzzle in history, including yesterday's, which a child
 * may be halfway through. `daily.test.ts` pins three literal seeds so that
 * cannot happen by accident.
 *
 * Junk input is hashed rather than refused — this is a hash, not a gate, and
 * determinism is the only property it owes anyone.
 */
export function dailySeed(dateKey: string, gameId: string): number {
  return seedFrom(`${dateKey}${SEED_SEPARATOR}${gameId}`);
}

/**
 * The generator for one game's puzzle on one day, ready to pass as a game's
 * injectable `rng`.
 *
 * Exists so twenty games cannot each wire `mulberry32(dailySeed(...))` slightly
 * differently — the same argument as `winMoment` owning the win.
 */
export function dailyRng(dateKey: string, gameId: string): () => number {
  return mulberry32(dailySeed(dateKey, gameId));
}

/**
 * The date key `days` away from this one, or "" for a key this module cannot
 * read.
 *
 * Arithmetic at UTC midnight for the same reason `dayNumber` parses there: a
 * local day is 23 or 25 hours long twice a year, so "yesterday" computed by
 * subtracting 86,400,000 from a LOCAL Date lands on the same day one spring
 * morning and skips one the following autumn.
 */
export function shiftDateKey(dateKey: string, days: number): string {
  const day = dayNumber(dateKey);
  if (day === undefined || !Number.isFinite(days)) return "";
  const d = new Date((day + Math.trunc(days)) * DAY_MS);
  if (!Number.isFinite(d.getTime())) return "";
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;
}

/** The highest-scoring id for a day. Pure; `ids` must not be empty. */
function topScorer(ids: readonly string[], dateKey: string): string {
  let winner = ids[0];
  let top = dailySeed(dateKey, winner);
  for (let i = 1; i < ids.length; i += 1) {
    const id = ids[i];
    const score = dailySeed(dateKey, id);
    // Ties break on the ID, never on roster position. Two games that score the
    // same must resolve the same way whatever order the catalogue lists them
    // in, or reordering the home grid would re-roll days that already happened.
    if (score > top || (score === top && id < winner)) {
      winner = id;
      top = score;
    }
  }
  return winner;
}

/**
 * Which game is the puzzle on `dateKey`. Pure, and stable as the catalogue
 * grows.
 *
 * WHY NOT `ids[dayNumber % ids.length]`, AND WHY NOT `hash(day) % ids.length`.
 * Both read naturally and both are wrong for the same reason: the answer is a
 * function of `ids.length`, so shipping the 26th game silently re-rolls EVERY
 * day in history and every day to come. A child who played yesterday's puzzle
 * would find a different game behind yesterday's date, and the rotation would
 * lurch every time the roster moved.
 *
 * This is rendezvous hashing instead: score every id for the day with the
 * already-pinned `dailySeed` and take the highest. On its own, adding a game
 * changes only the days that game WINS — roughly one day in n — and never
 * re-points a day from one existing game to another; removing one only affects
 * the days it used to win. That is the whole reason for the shape. (The second
 * pass below widens that slightly, and the paragraph after it says by how
 * much.)
 *
 * THE SECOND PASS is the no-repeat guard. Rendezvous hashing is memoryless, so
 * without it the same game comes up two days running about once every n days —
 * 4% of days on a roster of 25, which a child reads as the app being stuck
 * rather than as chance. Excluding YESTERDAY'S top scorer costs one extra
 * scoring pass and keeps the dependency depth at ONE day, which is what
 * preserves the property above: a roster change still perturbs only the days it
 * wins, plus the day after each of those. A chain that looked back further
 * would make every day depend on all of history, and then one new game really
 * would reshuffle the calendar.
 *
 * It REDUCES repeats rather than eliminating them: on the ~1/n of days where
 * two consecutive days share a top scorer, yesterday's actual pick was already
 * the runner-up and today may land on it again. That is ~1/n² — once every few
 * years at this roster size — and closing it would cost the depth-1 property,
 * which is worth more.
 */
export function dailyPick(ids: readonly string[], dateKey: string): string | undefined {
  // A roster arrives from the portal, so it is ordinary app data rather than
  // hostile input — but an empty id would still hash happily and win days, and
  // a duplicate would be picked twice as often. Both are cheap to refuse.
  const usable = [...new Set(ids.filter((id) => typeof id === "string" && id !== ""))];
  if (usable.length === 0 || !isDateKey(dateKey)) return undefined;
  if (usable.length === 1) return usable[0];

  const yesterday = shiftDateKey(dateKey, -1);
  const avoid = yesterday === "" ? undefined : topScorer(usable, yesterday);
  const pool = avoid === undefined ? usable : usable.filter((id) => id !== avoid);
  // `pool` can only empty out if the roster was a single id, handled above.
  return topScorer(pool.length > 0 ? pool : usable, dateKey);
}

/**
 * The streak, as it reaches the disk. Four numbers and a date.
 *
 * There is deliberately no `brokenAt`, no `lapsed`, no `missedDays` — nothing a
 * screen could read back as an accusation. A child who stopped for a week
 * arrives at a game with a streak of one and a personal record intact, which is
 * the whole of what this platform has to say about it.
 */
export interface DailyStateV1 {
  v: 1;
  /** Days in a row, counting today. 0 only before the very first play. */
  current: number;
  /** The best `current` ever reached. NEVER reduced — nothing here decrements it. */
  longest: number;
  /** Distinct days played, ever. Also only ever goes up. */
  days: number;
  /** The last day played, or "" for never. */
  last: string;
}

export function emptyDaily(): DailyStateV1 {
  return { v: 1, current: 0, longest: 0, days: 0, last: "" };
}

/** A non-negative whole number, or 0 for anything that isn't one. Same rule as profile.ts. */
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A day was played: set the run to `current` and pull the high-water marks up behind it. */
function played(state: DailyStateV1, current: number, dateKey: string): DailyStateV1 {
  return {
    v: 1,
    current,
    longest: Math.max(state.longest, current),
    days: state.days + 1,
    last: dateKey,
  };
}

/**
 * Record that the player showed up on `dateKey`. PURE — returns a new state and
 * never touches the one it was given.
 *
 * Five cases, and four of them are about a clock nobody can trust:
 *
 * - an unreadable key             → the state, untouched
 * - no usable day behind it       → a streak of one
 * - the same day again            → the SAME OBJECT, so ten calls are one play
 * - exactly one day later         → the run continues
 * - two or more days later        → a new run of one; `longest` is not touched
 *
 * A gap does not deduct, does not zero `longest`, and does not set any flag.
 * That is the platform law, not a default.
 */
export function advance(state: DailyStateV1, dateKey: string): DailyStateV1 {
  if (!isDateKey(dateKey)) return state;

  const today = dayNumber(dateKey);
  if (today === undefined) return state;

  // "" means never played; anything else that fails to parse got past a
  // migration and is treated the same way — as no anchor at all.
  const before = state.last === "" ? undefined : dayNumber(state.last);
  if (before === undefined) return played(state, 1, dateKey);

  const diff = today - before;
  if (diff === 0) return state;

  // THE STORED DAY IS IN THE FUTURE. A child moving the device clock is an
  // ordinary afternoon, not an attack, so nothing is zeroed and nothing is
  // refused: the day is treated as already played, and `last` is re-anchored on
  // the real one so TOMORROW still counts.
  //
  // Re-anchoring rather than freezing is the deliberate half. Leaving `last` in
  // the future would lock the streak until the clock genuinely caught up —
  // years, for a device that shipped with a wrong date — and the child who
  // suffers that is the honest one whose battery died. It does leave the streak
  // farmable by a clock set forward repeatedly; that is fine. A streak buys
  // nothing, and this is not an anti-cheat surface (see SESSION_COIN_CAP in
  // economy.ts, which is a brake rather than a lock for the same reason).
  if (diff < 0) return { ...state, last: dateKey };

  if (diff === 1) return played(state, state.current + 1, dateKey);
  return played(state, 1, dateKey);
}

/**
 * Coerce ANY stored value into a usable streak. MUST NEVER THROW.
 *
 * Modelled on `migrateProfile`, and handed the same inputs: a missing key, a
 * truncated write, a hand-edited value, a record written by a build that does
 * not exist yet, or plain junk. Every one of those has to end with a child able
 * to keep playing, so fields are salvaged BY NAME regardless of the declared
 * `v`, and everything else defaults.
 *
 * The outer try/catch is the one place this goes further than `migrateProfile`:
 * `raw` is whatever a caller had in hand, and an object with a throwing getter
 * would otherwise take the boot path with it. Cheap insurance on a promise the
 * rest of the module relies on.
 */
export function migrateDaily(raw: unknown): DailyStateV1 {
  try {
    let value: unknown = raw;

    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return emptyDaily();
      }
    }

    if (!isRecord(value)) return emptyDaily();

    const storedCurrent = count(value.current);
    const last = isDateKey(value.last) ? value.last : "";

    // No anchor day means nothing can ever extend this run, so it is not a
    // streak — but the record it implies is real and `longest` may never fall,
    // so it is folded upward rather than lost.
    const current = last === "" ? 0 : storedCurrent;
    const longest = Math.max(count(value.longest), storedCurrent);

    // Coherence, not decoration: you cannot have played fewer distinct days
    // than your longest run of them, and an anchor day means at least one.
    const days = Math.max(count(value.days), longest, last === "" ? 0 : 1);

    return { v: 1, current, longest, days, last };
  } catch {
    return emptyDaily();
  }
}

// ───────────────────────────────────────────────────────────────────────────
// The thin layer that REMEMBERS. Everything above this line is pure.
// ───────────────────────────────────────────────────────────────────────────

/** What a `complete()` actually did. `persisted` is false when the disk refused. */
export interface DailyWrite {
  state: DailyStateV1;
  persisted: boolean;
}

/**
 * Where the streak lives between sessions. One key, one record, ADD-ONLY.
 *
 * There is deliberately no `clear()`, no `set()` and no `reset()` — the same
 * asymmetry that keeps `spend()` off `RewardsPort` and `clear()` off
 * `ScorePort`. Nothing in this app can take a day back, so no screen and no
 * game can be the thing that does.
 */
export interface DailyStore {
  /** The streak as it stands. Never throws. */
  read(): DailyStateV1;
  /** Record that the daily puzzle was finished on `dateKey`. Never throws. */
  complete(dateKey: string): DailyWrite;
  /** Called on every change. Returns an unsubscribe. */
  subscribe(cb: (state: DailyStateV1) => void): () => void;
}

/**
 * The backend is injected for the same reason the wallet's is: the node vitest
 * environment has no localStorage at all, and a policy that can only be tested
 * through a browser is a policy nobody tests.
 */
export function createDailyStore(backend: KeyValueBackend): DailyStore {
  let state = migrateDaily(backend.read(DAILY_KEY));
  const subs = new Set<(s: DailyStateV1) => void>();

  return {
    read: () => state,

    complete(dateKey: string): DailyWrite {
      const next = advance(state, dateKey);
      // `advance` returns the SAME OBJECT for a day already counted and for a
      // key it cannot read, so this is what makes ten calls in one day one
      // play — no write, no notification, no second entry in `days`.
      if (next === state) return { state, persisted: true };

      let persisted = false;
      try {
        persisted = backend.write(DAILY_KEY, JSON.stringify(next));
      } catch {
        persisted = false;
      }

      // The in-memory streak advances EVEN IF THE DISK REFUSED, and that is the
      // scoreboard's answer rather than the wallet's. A coin the device will
      // not keep is a lie about a balance, so the wallet rolls it back; a day
      // the child genuinely played is a fact about today, and telling them it
      // did not happen is the bigger lie. `persisted` is returned so a caller
      // that wants to say so can.
      state = next;
      for (const cb of subs) {
        try {
          cb(state);
        } catch {
          // A subscriber is a screen. A screen that throws must not cost a
          // child the day they just earned, nor stop the next screen updating.
        }
      }
      return { state, persisted };
    },

    subscribe(cb) {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
  };
}

/** The app's one streak. Same arrangement as the `wallet` singleton. */
export const dailyStreak: DailyStore = createDailyStore(localStorageBackend());

/** What `ctx.daily` reports back. A snapshot, never a handle. */
export interface DailySummary {
  /** Today, in the DEVICE's timezone. "" only if the clock is unusable. */
  readonly today: string;
  /** Is THIS game today's puzzle? */
  readonly isToday: boolean;
  /** Has today already been counted? True for the rest of the day after a win. */
  readonly done: boolean;
  /** Days in a row, counting today. */
  readonly streak: number;
  /** The best run ever. Never falls. */
  readonly longest: number;
  /** Distinct days played, ever. Never falls. */
  readonly days: number;
  /** False when the device refused to store the change this call made. */
  readonly persisted: boolean;
}

/**
 * The daily surface a game gets. Fourth port of the family, and the same
 * asymmetry as the other three.
 *
 * `complete()` TAKES NO ARGUMENTS, and that is the whole design. A game cannot
 * name the day, cannot pass a count, cannot claim to be the daily, and cannot
 * ask for a streak the way it cannot ask for 500 coins. It reports one fact —
 * "the player finished me" — and this module decides whether today's puzzle was
 * what they finished. There is no `clear()` and no way to reduce anything.
 */
export interface DailyPort {
  /** Today, in the DEVICE's timezone. Read fresh, so a session open across midnight moves. */
  readonly today: string;
  /** Is this game today's puzzle? */
  readonly isToday: boolean;
  /** The seed for this game's puzzle today, for a game that generates its own board. */
  seed(): number;
  /** The generator for this game's puzzle today, ready to pass as an injectable `rng`. */
  rng(): () => number;
  /** The streak, unchanged. Never throws. */
  read(): DailySummary;
  /** Report that this game was finished. A no-op unless it IS today's puzzle. Never throws. */
  complete(): DailySummary;
}

export interface DailyPortOptions {
  store?: DailyStore;
  /** Injected so a test can move the clock without moving the machine's. */
  now?: () => Date;
  /**
   * Which game is the puzzle on a given day.
   *
   * INJECTED BECAUSE THE ANSWER LIVES IN THE PORTAL. The rotation is a fact
   * about the CATALOGUE, and the SDK is below the catalogue in the module graph
   * — `src/portal/dailyRotation.ts` binds `dailyPick` to the roster and hands
   * the result down through `createContext`. Keeping the roster out of here is
   * what stops a game from importing the portal to find out.
   *
   * The default answers "nothing is today's puzzle", so a port built without
   * one is inert rather than wrong: it never counts a day it should not.
   */
  pick?: (dateKey: string) => string | undefined;
}

export function createDailyPort(gameId: string, opts: DailyPortOptions = {}): DailyPort {
  const store = opts.store ?? dailyStreak;
  const now = opts.now ?? (() => new Date());
  const pick = opts.pick ?? (() => undefined);

  const today = (): string => {
    try {
      return localDateKey(now());
    } catch {
      return "";
    }
  };

  /**
   * `pick` is portal code being called from inside a game's context, so it is
   * treated the way `SessionSpec.validate` is: it must not be able to take a
   * win down with it. A throw means "not today's puzzle", which costs a streak
   * day and costs nothing else.
   */
  const isDaily = (dateKey: string): boolean => {
    if (!isDateKey(dateKey)) return false;
    try {
      return pick(dateKey) === gameId;
    } catch {
      return false;
    }
  };

  const summary = (dateKey: string, persisted: boolean): DailySummary => {
    const s = store.read();
    return {
      today: dateKey,
      isToday: isDaily(dateKey),
      done: dateKey !== "" && s.last === dateKey,
      streak: s.current,
      longest: s.longest,
      days: s.days,
      persisted,
    };
  };

  return {
    get today() {
      return today();
    },
    get isToday() {
      return isDaily(today());
    },
    seed: () => dailySeed(today(), gameId),
    rng: () => dailyRng(today(), gameId),
    read: () => summary(today(), true),
    complete() {
      const dateKey = today();
      // The ONE decision a game is not allowed to make. A game that is not
      // today's puzzle reports a win exactly the same way, and gets a read.
      if (!isDaily(dateKey)) return summary(dateKey, true);
      const { persisted } = store.complete(dateKey);
      return summary(dateKey, persisted);
    },
  };
}
