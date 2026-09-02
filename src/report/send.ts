/* Sending a report - a copy of `sdk/cloud.ts`'s shape, and deliberately not an
   import of it.
   ===========================================================================

   WHY THIS DOES NOT REUSE THE BACKUP CLIENT'S IDENTITY
   `cloud.ts` signs in anonymously and keeps `{uid, refreshToken, code}` under
   `ellaz:cloud:v1`. Reusing that uid here would work, cost one less round trip,
   and quietly make every report joinable to a child's profile document - their
   coins, their room, their records - by anyone who could read both. A separate
   anonymous identity under `ellaz:report:v1` costs one sign-up on the first
   report ever sent and makes that join impossible rather than merely
   discouraged. Identity separation you can point at in a rule beats identity
   separation you have to remember.

   It also keeps the chunks apart: importing `cloud.ts` would pull the whole
   backup client, its code encoder and its records validator into a chunk that
   needs none of them.

   EVERYTHING HERE IS FAIL-SOFT
   A report is a courtesy. It must never throw into a game, never block a tap,
   and never leave the sheet claiming something the network did not do - see
   `.claude/rules/destructive-actions-show-both-sides.md`. Every path resolves
   to a `SendOutcome`, and the sheet renders that outcome rather than assuming.

   THE DOC ID IS THE THROTTLE
   The id is the current minute, and `firestore.rules` checks it against
   `request.time`, so a caller cannot invent ids to get around it. A second
   report inside the same minute is a create against an existing document, which
   Firestore answers 409 - a normal, expected outcome, reported as `throttled`
   rather than as a failure. */

import { cloudConfig } from "@sdk/cloudConfig";

/** This reporter's own anonymous identity. Never the backup one. */
export const REPORT_KEY = "ellaz:report:v1";

/** The same ceiling `cloud.ts` uses, and for the same reason: it is what makes
 *  "fail-soft" true rather than "pending forever on a captive portal". */
const TIMEOUT_MS = 8000;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * The rules block's own cap on `shot`, mirrored here so an oversized picture
 * costs the PICTURE rather than the whole report.
 *
 * Without this, one field the player did not have to send takes the words they
 * chose to type down with it: `shot` and `message` are the same document, so a
 * 403 on the picture loses everything. Measured 2026-09-02 at 640px q0.6 -
 * flat UI 12.5k, a bubbleshooter-shaped board 76.6k, pure noise 243k - so no
 * real frame reaches it today and nothing pinned that, which is exactly how a
 * margin disappears (`a-threshold-tuned-against-todays-tree-goes-stale`).
 */
export const MAX_SHOT = 220_000;

export interface ReportStore {
  read(key: string): string | null;
  write(key: string, value: string): boolean;
}

export interface ReportDraft {
  kind: "bug" | "idea";
  reason?: string;
  message?: string;
  /** The capture from `context.ts`. Serialised to a string on the way out - see
   *  the rules block, which cannot measure the size of a map. */
  ctx: unknown;
  /** A data URL, when a canvas game gave us one that was not blank. */
  shot?: string;
}

export type SendOutcome =
  | { ok: true; id: string }
  /** Expected, not broken: a report already went in this minute. */
  | { ok: false; why: "throttled" }
  /** The rules said no - an oversized field, or a clock far enough out that the
   *  minute stamp missed its window. */
  | { ok: false; why: "refused" }
  /** No identity, no network, a timeout, a 500. Retryable. */
  | { ok: false; why: "failed" };

export interface ReporterOptions {
  fetchImpl?: FetchLike;
  store?: ReportStore;
  /** Injected so a test does not depend on the wall clock. */
  now?: () => number;
}

interface StoredIdentity {
  uid: string;
  refreshToken: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function localStore(): ReportStore {
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

/** One request, bounded. Resolves to the Response or null - never throws. */
/**
 * The SERVER's clock, off the `Date` header every Google API reply carries.
 *
 * This is not a nicety. The throttle id is a minute stamp and `firestore.rules`
 * compares it to `request.time` with a +/-2 minute window, so a device whose
 * clock is 3 minutes out is refused on EVERY report, forever - and the sheet
 * answers a 403 with "That did not send. Try again?", which resends a
 * byte-identical id. Measured 2026-09-02: 0/1/2 min skew send, 3 and 4 are
 * refused, and three taps of Try again produced one id and three 403s.
 *
 * The clock a guard compares against is the only clock worth stamping with.
 *
 * THIS DEPENDS ON A CORS EXPOSURE, so it is measured rather than assumed.
 * `Date` is NOT a CORS-safelisted response header, so a cross-origin reply can
 * carry it and the browser can still refuse to let us read it - in which case
 * this returns undefined, the local clock is used, and the bug is back with
 * every test still green. Measured 2026-09-02 through a real browser's own CORS
 * filter, from an http origin, against both hosts we call:
 *
 *   identitytoolkit accounts:signUp  visible=[content-encoding,content-length,
 *                                    content-type,date,server,vary]
 *   firestore.googleapis.com         same, plus x-debug-tracking-id
 *
 * If Google ever stops exposing it this degrades silently, which is why the
 * fallback below is a fallback and not an error.
 */
function serverClock(res: Response | null): number | undefined {
  const raw = res?.headers?.get?.("date");
  if (!raw) return undefined;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : undefined;
}

async function ask(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<Response | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, signal: abort.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface Reporter {
  send(draft: ReportDraft): Promise<SendOutcome>;
}

export function createReporter(options: ReporterOptions = {}): Reporter {
  const { apiKey, projectId } = cloudConfig();
  const fetchImpl = options.fetchImpl ?? ((u, i) => fetch(u, i));
  const store = options.store ?? localStore();
  const now = options.now ?? (() => Date.now());
  const docBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  function readStored(): StoredIdentity | null {
    try {
      const raw = store.read(REPORT_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value)) return null;
      const uid = str(value.uid);
      const refreshToken = str(value.refreshToken);
      return uid && refreshToken ? { uid, refreshToken } : null;
    } catch {
      return null;
    }
  }

  /** An id token to write with, minting the identity on the very first report. */
  async function authorise(): Promise<{ uid: string; token: string; serverNow?: number } | null> {
    const stored = readStored();

    if (stored) {
      const res = await ask(fetchImpl, `https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: stored.refreshToken }),
      });
      if (res?.ok) {
        const body: unknown = await res.json().catch(() => null);
        const token = isRecord(body) ? str(body.access_token || body.id_token) : "";
        if (token) return { uid: stored.uid, token, serverNow: serverClock(res) };
      }
      // A refresh that fails is not fatal: the identity is worth nothing except
      // as a throttle key, so minting a new one costs the player nothing and
      // gets their report through. Falls through to sign-up.
    }

    const res = await ask(fetchImpl, `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    if (!res?.ok) return null;
    const body: unknown = await res.json().catch(() => null);
    if (!isRecord(body)) return null;
    const uid = str(body.localId);
    const refreshToken = str(body.refreshToken);
    const token = str(body.idToken);
    if (!uid || !token) return null;
    // A refused write here costs the throttle, not the report: the send still
    // goes, and the next one signs up again.
    if (refreshToken) store.write(REPORT_KEY, JSON.stringify({ uid, refreshToken }));
    return { uid, token, serverNow: serverClock(res) };
  }

  async function send(draft: ReportDraft): Promise<SendOutcome> {
    const who = await authorise();
    if (!who) return { ok: false, why: "failed" };

    // The server's clock when we have it, ours only as a fallback. See
    // `serverClock`: the local clock is the one thing here that can be wrong.
    const at = who.serverNow ?? now();
    const minute = String(Math.floor(at / 60000));
    const fields: Record<string, unknown> = {
      at: { integerValue: String(at) },
      kind: { stringValue: draft.kind },
      // A STRING, matching the rule that bounds it. See the rules block.
      ctx: { stringValue: JSON.stringify(draft.ctx) },
    };
    if (draft.reason) fields.reason = { stringValue: draft.reason };
    if (draft.message) fields.message = { stringValue: draft.message };
    if (draft.shot) fields.shot = { stringValue: draft.shot };

    const url = `${docBase}/reports/${who.uid}/items?documentId=${minute}`;
    const res = await ask(fetchImpl, url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${who.token}` },
      body: JSON.stringify({ fields }),
    });

    if (!res) return { ok: false, why: "failed" };
    if (res.ok) return { ok: true, id: `${who.uid}/${minute}` };
    // 409 ALREADY_EXISTS is the throttle doing its job, and it is the one
    // failure the sheet should explain rather than offer a retry for.
    if (res.status === 409) return { ok: false, why: "throttled" };
    if (res.status === 403) return { ok: false, why: "refused" };
    return { ok: false, why: "failed" };
  }

  return { send };
}
