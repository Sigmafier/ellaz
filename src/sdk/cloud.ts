// Cloud backup — anonymous identity and one document, over plain HTTP.
//
// WHY NO FIREBASE SDK
// `firebase/app` + `firebase/auth` + `firebase/firestore` is roughly 150-200 KB
// gz even tree-shaken — nearly three times this app's ENTIRE first visit, which
// the last two waves spent halving. What this platform needs from it is: sign in
// anonymously, read one document, write one document. All three are ordinary
// REST calls, so they are ~200 lines of our own code and zero dependencies. The
// SDK's real value is offline persistence and realtime listeners, and we need
// neither: localStorage is already the offline store, and a leaderboard that
// updates on open is the correct product anyway.
//
// WHY A WRITTEN-DOWN CODE
// Anonymous identity lives in the browser's own storage, so "clear browsing
// data" destroys the key to the cloud copy at the same moment it destroys the
// local one. Nothing inside the device survives that. The code is the one thing
// that can, and the app says so plainly rather than implying magic.
//
// WHAT THIS IS NOT
// It is a BACKUP and a TRANSFER, not live two-way sync. Restoring onto a device
// copies the saved progress across; from then on the two devices drift apart
// again, because merging two independently-earned coin balances needs per-device
// counters the profile does not yet carry. Claiming otherwise would be the kind
// of quiet data loss the wallet's rollback discipline exists to prevent.
//
// EVERYTHING HERE IS FAIL-SOFT. No network, a blocked request, an exhausted free
// quota, a hostile proxy: every one of them resolves to `null` or `false`. This
// module must never throw into gameplay, and nothing a child can do depends on
// it succeeding.
import { cloudConfig } from "./cloudConfig";
import { makeBackupCode, normalizeBackupCode } from "./backupCode";
import { migrateProfile, type ProfileV1 } from "./profile";
import type { Records } from "./records";
import { windowsFor } from "./board";

/** Where the anonymous identity is kept. Cleared with the rest of storage. */
export const CLOUD_KEY = "ellaz:cloud:v1";

/**
 * Cap on any single request. Not a tuned value and not a workaround for a slow
 * path — it is the ceiling that makes "fail-soft" true. Without it a stalled
 * connection (captive portal, dead wifi that never RSTs) leaves the promise
 * pending forever, and the World's backup card spins for the rest of the
 * session instead of saying it could not reach the cloud. Eight seconds is
 * comfortably longer than any of these calls takes on a bad phone connection
 * and short enough that a child does not stare at a spinner.
 */
const TIMEOUT_MS = 8000;

/** Refresh a little early — a token that expires mid-request is a failed write. */
const REFRESH_MARGIN_MS = 60_000;

export interface CloudIdentity {
  uid: string;
  /** The player's backup code, in canonical `XXXX-XXXX` form. */
  code: string;
}

interface StoredIdentity extends CloudIdentity {
  refreshToken: string;
}

/** The `fetch` seam, so tests drive this without a network or a global stub. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CloudStore {
  read(key: string): string | null;
  write(key: string, value: string): boolean;
}

/**
 * Everything one device holds that another device should end up with.
 *
 * Two fields rather than one because they live in two unrelated places on
 * disk: the profile is a single key, and the records are one key per game per
 * board. Carrying only the profile is what made the first version of this
 * feature restore a room without the personal bests that filled it.
 */
export interface DeviceState {
  profile: ProfileV1;
  records: Records;
}

/**
 * A personal best, on its way to a board.
 *
 * `board` is an already-validated `boardId()` — this module does not sanitise
 * it, because a sanitised id would silently merge two different boards.
 */
export interface BoardPublish {
  board: string;
  /** `adj__noun` word ids, or `""` for a player with no name yet. */
  name: string;
  unit: string;
  value: number;
  at: number;
}

export interface Cloud {
  /** Sign in (reusing the stored identity when there is one). `null` on any failure. */
  connect(): Promise<CloudIdentity | null>;
  /** The identity already in hand, without touching the network. */
  identity(): CloudIdentity | null;
  /** Upload a snapshot. `false` on any failure, including "not connected". */
  push(state: DeviceState): Promise<boolean>;
  /** Fetch what is behind someone's backup code. `null` if there isn't anything. */
  restore(code: string): Promise<DeviceState | null>;
  /** Put a personal best on its board. `false` on any failure. */
  publish(entry: BoardPublish): Promise<boolean>;
}

/** A request that cannot outlive TIMEOUT_MS, and never rejects. */
async function request(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Offline, aborted, CORS-blocked, or a body that is not JSON. All the same
    // answer to the caller: this did not work, carry on.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Firestore's REST shape is typed per field (`{stringValue}`, `{integerValue}`,
 * nested `{mapValue}`…), which would mean a bespoke encoder for every profile
 * field and a matching decoder that drifts out of sync with it — a shape this
 * project has already been bitten by elsewhere.
 *
 * The whole profile therefore travels as ONE JSON string. `migrateProfile` is
 * total and already coerces any string into a usable profile, so the read side
 * needs no decoder at all and a document written by a newer build cannot break
 * an older one.
 */
function encodeDoc(state: DeviceState, code: string): string {
  return JSON.stringify({
    fields: {
      profile: { stringValue: JSON.stringify(state.profile) },
      // Records travel as their own string field rather than inside the profile
      // so this stays ADDITIVE: a document written before records existed simply
      // has no key here, and an older build reading a newer document ignores it.
      records: { stringValue: JSON.stringify(state.records) },
      code: { stringValue: code },
      updatedAt: { integerValue: String(state.profile.updatedAt) },
    },
  });
}

function decodeState(doc: unknown): DeviceState | null {
  if (!isRecord(doc) || !isRecord(doc.fields)) return null;
  const field = doc.fields.profile;
  if (!isRecord(field)) return null;
  const raw = str(field.stringValue);
  if (!raw) return null;

  // The profile is what makes a document a document. Records are optional and
  // a missing or unreadable set degrades to none rather than failing the whole
  // restore — losing the records is bad; refusing to return the room is worse.
  return { profile: migrateProfile(raw), records: decodeRecords(doc.fields.records) };
}

function decodeRecords(field: unknown): Records {
  if (!isRecord(field)) return {};
  const raw = str(field.stringValue);
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    // Shape only. `adoptRecords` is what validates every key and value before
    // any of this reaches the disk, and it is the only thing allowed to.
    return isRecord(value) ? (value as Records) : {};
  } catch {
    return {};
  }
}

export interface CloudOptions {
  fetchImpl?: FetchLike;
  store?: CloudStore;
  /** Seeds a fresh backup code. Injected so tests are deterministic. */
  rng?: () => number;
}

function localStorageStore(): CloudStore {
  return {
    read(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createCloud(options: CloudOptions = {}): Cloud {
  const { apiKey, projectId } = cloudConfig();
  const fetchImpl = options.fetchImpl ?? ((u, i) => fetch(u, i));
  const store = options.store ?? localStorageStore();
  const rng = options.rng;

  const docBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  let stored: StoredIdentity | null = readStored();
  let idToken: string | null = null;
  let idTokenExpiry = 0;
  /** One in-flight connect at a time — a boot and a World open must not race. */
  let connecting: Promise<CloudIdentity | null> | null = null;
  /**
   * Has `codes/<code>` been written during THIS page load?
   *
   * Neither the uid nor the code ever changes for a device, so the index only
   * has to be written once — and it is a whole document write against a
   * fail-closed daily quota, which every push used to spend re-storing a value
   * that was already there.
   *
   * Deliberately in memory rather than persisted: a fresh page load re-verifies
   * the index once, which is cheap and quietly repairs an index that some other
   * failure lost. A persisted flag would remember a lie forever.
   */
  let indexWritten = false;

  function readStored(): StoredIdentity | null {
    try {
      const raw = store.read(CLOUD_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value)) return null;
      const uid = str(value.uid);
      const refreshToken = str(value.refreshToken);
      const code = normalizeBackupCode(str(value.code) ?? "");
      return uid && refreshToken && code ? { uid, refreshToken, code } : null;
    } catch {
      return null;
    }
  }

  function writeStored(next: StoredIdentity): void {
    // A dead refresh token sends `connect` through a fresh sign-up, which mints
    // a NEW code. The latch is about the code that was actually indexed, so
    // carrying it across would leave the new code resolving to nothing for the
    // rest of the session.
    if (next.code !== stored?.code) indexWritten = false;
    stored = next;
    store.write(CLOUD_KEY, JSON.stringify(next));
  }

  /** A usable bearer token, refreshing or signing up as needed. */
  async function token(): Promise<string | null> {
    if (idToken && Date.now() < idTokenExpiry - REFRESH_MARGIN_MS) return idToken;

    if (stored) {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: stored.refreshToken,
      });
      const res = await request(fetchImpl, `https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (isRecord(res)) {
        const fresh = str(res.id_token);
        const nextRefresh = str(res.refresh_token) ?? stored.refreshToken;
        if (fresh) {
          idToken = fresh;
          idTokenExpiry = Date.now() + Number(res.expires_in ?? 3600) * 1000;
          writeStored({ ...stored, refreshToken: nextRefresh });
          return fresh;
        }
      }
      // A refresh token that no longer works means we can never authenticate as
      // that uid again, so `connect` falls through to a fresh sign-up with a
      // fresh code. The player's OLD code is not orphaned by that: `codes/<old>`
      // and `players/<olduid>` both still exist and are readable by any signed-in
      // user, so the code on their piece of paper still restores. What is lost is
      // our ability to keep WRITING to that document, which is the correct thing
      // to lose.
      return null;
    }
    return null;
  }

  async function signUp(): Promise<StoredIdentity | null> {
    const res = await request(fetchImpl, `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    if (!isRecord(res)) return null;
    const uid = str(res.localId);
    const refreshToken = str(res.refreshToken);
    const fresh = str(res.idToken);
    if (!uid || !refreshToken || !fresh) return null;

    idToken = fresh;
    idTokenExpiry = Date.now() + Number(res.expiresIn ?? 3600) * 1000;
    const identity: StoredIdentity = { uid, refreshToken, code: makeBackupCode(rng) };
    writeStored(identity);
    return identity;
  }

  async function authed(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown | null> {
    const bearer = await token();
    if (!bearer) return null;
    return request(fetchImpl, `${docBase}/${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${bearer}` },
    });
  }

  // Standalone rather than methods on the returned object: `push` and `restore`
  // both need `connect`, and reaching it through `this` would break the moment a
  // caller destructured the port (`const { push } = cloud`), which is exactly
  // how a React component would use it.
  function connect(): Promise<CloudIdentity | null> {
    // Collapse concurrent callers onto one attempt, then release the latch so a
    // later call can retry. Caching the FAILURE would strand a player who
    // opened the app in a lift.
    if (connecting) return connecting;
    connecting = (async () => {
      if (stored && (await token())) return { uid: stored.uid, code: stored.code };
      const created = await signUp();
      return created ? { uid: created.uid, code: created.code } : null;
    })().finally(() => {
      connecting = null;
    });
    return connecting;
  }

  return {
    identity() {
      return stored ? { uid: stored.uid, code: stored.code } : null;
    },

    connect,

    async push(state: DeviceState) {
      if (!stored) await connect();
      const id = stored;
      if (!id) return false;

      const wrote = await authed(`players/${id.uid}?updateMask.fieldPaths=profile&updateMask.fieldPaths=records&updateMask.fieldPaths=code&updateMask.fieldPaths=updatedAt`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: encodeDoc(state, id.code),
      });
      if (!wrote) return false;
      if (indexWritten) return true;

      // The code index is what makes the code usable from another device. It is
      // written AFTER the profile and its failure is reported, because a code
      // that resolves to a document that isn't there yet would be worse than a
      // code that does not resolve at all.
      const indexed = await authed(`codes/${id.code}?updateMask.fieldPaths=uid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { uid: { stringValue: id.uid } } }),
      });
      // Latched only on a real success. Setting it before the answer arrives
      // would turn one dropped request into a code that never resolves.
      if (indexed === null) return false;
      indexWritten = true;
      return true;
    },

    async restore(code: string) {
      const canonical = normalizeBackupCode(code);
      if (!canonical) return null;
      // Restoring still needs an identity of our own: every read is
      // authenticated, so a device that has never connected signs up first.
      if (!stored && !(await connect())) return null;

      const index = await authed(`codes/${canonical}`);
      if (!isRecord(index) || !isRecord(index.fields)) return null;
      const owner = isRecord(index.fields.uid) ? str(index.fields.uid.stringValue) : undefined;
      if (!owner) return null;

      return decodeState(await authed(`players/${owner}`));
    },

    /**
     * One document per player per board, overwritten blind — no read first.
     *
     * That is sound because of WHEN this is called: only on a personal best,
     * which by definition beats everything this player has ever done, and
     * therefore also beats their best today, this week and this month. So all
     * four windows can be set to the same value without knowing what was there.
     * One write, zero reads, and nothing to get wrong about merging.
     *
     * The consequence is worth stating plainly, because it decides what a
     * board MEANS: the all-time board is the classic best-ever ranking, and the
     * day/week/month boards hold the players who set a new personal best in
     * that window. "Who got better today", not "who scored highest today".
     * On a platform whose rule is that no child is shown as last, a board that
     * refreshes with whoever is improving is the kinder one — and it is also
     * the one that costs a single write.
     */
    async publish(entry: BoardPublish) {
      if (!stored) await connect();
      const id = stored;
      if (!id) return false;
      if (!Number.isFinite(entry.value)) return false;

      const { d, w, m } = windowsFor(entry.at);
      const fields = {
        name: { stringValue: entry.name },
        unit: { stringValue: entry.unit },
        best: { doubleValue: entry.value },
        d: { stringValue: d },
        dBest: { doubleValue: entry.value },
        w: { stringValue: w },
        wBest: { doubleValue: entry.value },
        m: { stringValue: m },
        mBest: { doubleValue: entry.value },
        at: { integerValue: String(Math.floor(entry.at)) },
      };
      const mask = Object.keys(fields)
        .map((f) => `updateMask.fieldPaths=${f}`)
        .join("&");

      const wrote = await authed(`boards/${entry.board}/scores/${id.uid}?${mask}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      return wrote !== null;
    },
  };
}
