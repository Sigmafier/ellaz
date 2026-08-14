// When a table stops being a table.
//
// Pure, and separate from the Durable Object, because this is the only file in
// the server that can DESTROY something a person made. The numbers below are
// the whole policy; nothing else may hold one. A Durable Object is not
// unit-testable without a runtime, and "how long until we delete their game"
// is not a question to answer by hand-testing in production.
//
// There are two different questions here and conflating them is the mistake
// this module exists to prevent:
//
//   1. Should this table be in the LOBBY?  — cheap, reversible, wrong answer
//      costs a stale row in a list.
//   2. Should this table be DELETED?       — irreversible, and the wrong answer
//      throws away a game people were coming back to.
//
// So they get different clocks, and the second one is generous.

export type ChipsMode = "fresh" | "league";

export interface TableSnapshot {
  /**
   * Sockets connected at the moment this snapshot was TAKEN — which is not the
   * same as right now, and the difference is the whole reason `reportedAt`
   * exists below.
   */
  connected: number;
  /**
   * When this snapshot was taken.
   *
   * A table reports itself to the lobby and the lobby keeps the last thing it
   * was told. So `connected` is a CLAIM with an age, not a fact: a table whose
   * last word was "two people are here" and which then stopped waking up says
   * "two people are here" forever. Without this field there is no way to tell
   * that sentence apart from a table that is genuinely busy, and every gate
   * downstream believes it.
   */
  reportedAt: number;
  /** When the room was created. */
  createdAt: number;
  /** The last moment a socket was attached. 0 if nobody ever arrived. */
  lastSeenAt: number;
  /** Hands actually dealt. Zero means nothing has happened here yet. */
  handsPlayed: number;
  /**
   * League tables carry bankrolls ACROSS sessions — deleting one destroys
   * chips people earned on another day. Fresh-chips tables buy in per session
   * and lose nothing durable.
   */
  chipsMode: ChipsMode;
}

export type Verdict = "keep" | "unlist" | "delete";

/**
 * Drop out of the lobby after five minutes with nobody connected.
 *
 * This is the number that answers the actual complaint — a lobby listing rooms
 * that nobody is in. It is deliberately short BECAUSE it is reversible: the
 * table is still there and its code still works, so a family that walked off
 * for ten minutes comes straight back to their seats and their stacks. All
 * this does is stop strangers being invited into an empty room.
 */
export const LIST_STALE_MS = 5 * 60_000;

/**
 * A room where no hand was ever dealt is rubbish after fifteen minutes.
 *
 * This is the common case by volume: somebody taps Create, looks at the code,
 * and closes the tab. There is nothing to preserve — no stacks, no ledger, no
 * history — so the only cost of deleting it is the code becoming free again.
 * Fifteen rather than five so that "create the room, then go and tell everyone
 * the code" still works.
 */
export const REAP_UNPLAYED_MS = 15 * 60_000;

/**
 * Two hours with nobody connected ends a fresh-chips game.
 *
 * Chosen against a poker night, not against a storage bill. What is lost is the
 * session ledger — who is up, who is down — which is exactly the thing an
 * argument later depends on, and a group breaking for dinner is completely
 * ordinary. It is also well past RELINK_TTL_MS (10 minutes), so a player who
 * changed device has long since either come back or not.
 *
 * Note this is much longer than it needs to be to reclaim storage, and that is
 * the point: the failure of being too slow is a few kilobytes, and the failure
 * of being too fast is deleting a game people were in the middle of.
 */
export const REAP_FRESH_MS = 2 * 60 * 60_000;

/**
 * A league table survives a month of silence.
 *
 * League mode banks each player's stack when they stand up and hands it back
 * when they sit down again — that is the entire feature. Deleting one wipes
 * every player's bankroll, which is money they earned across previous evenings
 * and would have no way to recover. A month is long enough that a weekly game
 * that skips three weeks is safe, and short enough that a table abandoned in
 * 2026 is not still on disk in 2027.
 */
export const REAP_LEAGUE_MS = 30 * 24 * 60 * 60_000;

/**
 * The moment the table was last anything other than empty.
 *
 * `createdAt` is a FALLBACK, not a floor. A room nobody ever joined has
 * `lastSeenAt` 0, and measuring idleness from the epoch would make it 56 years
 * stale and delete it the instant it was made. But once somebody HAS been
 * here, `lastSeenAt` is the only honest answer — taking the later of the two
 * would let a bad `createdAt` keep a dead table alive indefinitely.
 */
function emptySince(s: TableSnapshot): number {
  return s.lastSeenAt > 0 ? s.lastSeenAt : s.createdAt;
}

/**
 * How often an OCCUPIED table re-states that it is occupied.
 *
 * Comfortably under `PRESENCE_TTL_MS`, so one missed beat is not a delisting
 * and it takes a genuine death to go quiet.
 */
export const HEARTBEAT_MS = 2 * 60_000;

/**
 * How long "somebody is here" is believed after it was said.
 *
 * This is the fix for a lobby that advertised dead rooms forever. `lobby.ts`
 * decides staleness at READ time and its own comment claims that check "cannot
 * be missed" — and it was missed, by exactly one line: the verdict returned
 * `keep` the moment `connected > 0`, and `connected` is whatever the table
 * last said before it stopped saying anything. A room whose players closed
 * their tabs in a way that never produced a clean close was therefore pinned
 * at "2 players are here" permanently. Measured live 2026-08-14: a table sat
 * in the lobby forty minutes after the last browser closed.
 *
 * The rule that replaces it: presence is a claim with an expiry. A live table
 * renews it every `HEARTBEAT_MS`; a table that cannot renew it is, after this
 * long, no longer evidence of anything. Three misses.
 */
export const PRESENCE_TTL_MS = 6 * 60_000;

/**
 * Is anybody actually here?
 *
 * The table's own snapshots are taken with `reportedAt` of now, so on the
 * table this is just `connected > 0` and stays exact. It is only across the
 * wire, where a row can outlive the thing that wrote it, that the age matters
 * — which is why one function serves both and neither has to remember.
 */
export function presentNow(s: TableSnapshot, now: number): boolean {
  return s.connected > 0 && now - s.reportedAt <= PRESENCE_TTL_MS;
}

/** How long a table has had nobody in it. Never negative. */
export function idleMs(s: TableSnapshot, now: number): number {
  if (presentNow(s, now)) return 0;
  return Math.max(0, now - emptySince(s));
}

/**
 * How long this table may sit empty before it is deleted.
 *
 * Unplayed wins over league on purpose: a league room where nobody ever dealt
 * a card has banked nothing, so there is no bankroll to protect and it is
 * rubbish on the same fifteen-minute clock as any other empty room.
 */
export function reapAfterMs(s: TableSnapshot): number {
  if (s.handsPlayed === 0) return REAP_UNPLAYED_MS;
  return s.chipsMode === "league" ? REAP_LEAGUE_MS : REAP_FRESH_MS;
}

export function verdict(s: TableSnapshot, now: number): Verdict {
  if (presentNow(s, now)) return "keep";
  const idle = idleMs(s, now);
  if (idle >= reapAfterMs(s)) return "delete";
  if (idle >= LIST_STALE_MS) return "unlist";
  return "keep";
}

/**
 * Whether the lobby should show this table.
 *
 * `isPrivate` is not part of the snapshot because it is not a fact about
 * activity — it is the host's choice, and it must never influence when the
 * table is REAPED. A private table is deleted on exactly the same clock as a
 * listed one; hiding a room is not a reason to keep it forever.
 */
export function shouldList(s: TableSnapshot, now: number, isPrivate: boolean): boolean {
  if (isPrivate) return false;
  return verdict(s, now) === "keep";
}

/**
 * When this table next needs waking up, or null if it does not.
 *
 * Returns an absolute epoch ms so the caller can hand it straight to
 * `setAlarm`. A Durable Object has exactly one alarm slot, so this shares it
 * with the game clock and the caller arms whichever comes first.
 */
export function nextCheckAt(s: TableSnapshot, now: number): number | null {
  // An occupied table wakes anyway, to say so. That heartbeat is what makes
  // `PRESENCE_TTL_MS` above safe to enforce: without it, enforcing an expiry
  // on presence would delist tables that are genuinely busy but quiet — six
  // people between hands emit nothing at all.
  if (presentNow(s, now)) return now + HEARTBEAT_MS;
  const since = emptySince(s);
  const unlistAt = since + LIST_STALE_MS;
  const deleteAt = since + reapAfterMs(s);
  if (now < unlistAt) return unlistAt;
  if (now < deleteAt) return deleteAt;
  // Both boundaries are behind us; the next wake-up is now, and whoever asked
  // should be deleting rather than scheduling.
  return null;
}
