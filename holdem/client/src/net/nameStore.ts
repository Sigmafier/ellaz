// Where this device remembers which name it picked.
//
// Its own module rather than a corner of socket.ts, because BOTH the socket
// (which sends the name in hello) and the store (which persists whatever the
// server settles on) need it — and store.ts is imported by socket.ts, so
// putting it in socket.ts makes that pair circular. ES modules survive a cycle
// by handing back a partly-initialised namespace, which is a bug that appears
// as `undefined is not a function` at a call site that looks fine.

import { isPlayerName, type PlayerName } from "@shared/names";

// v2, and a NEW key. The old `holdem:name` holds a bare string from the build
// that let people type a name. Reusing it would mean every returning player's
// stored value fails to parse on every load — harmless, but it would also make
// the two builds fight over one key if anyone has both open. The old value is
// left where it is.
const NAME_KEY = "holdem:name:v2";

/**
 * The two word ids this device last used, or `undefined`.
 *
 * VALIDATED, not trusted. The value crossed a storage boundary — a previous
 * build wrote it, a browser may have truncated it, a person can edit it — so
 * anything that is not two ids is treated as "never picked". That is the same
 * answer as a first visit, so there is one code path rather than two and no
 * caller ever has to handle a half-name.
 *
 * Membership in the pool is deliberately NOT checked here: a word this build
 * has not heard of should be sent, and the SERVER decides. Refusing it locally
 * would silently rename a player whose other device is one build ahead.
 */
export function savedName(): PlayerName | undefined {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isPlayerName(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveName(name: PlayerName): void {
  try {
    localStorage.setItem(NAME_KEY, JSON.stringify(name));
  } catch {
    /* incognito */
  }
}
