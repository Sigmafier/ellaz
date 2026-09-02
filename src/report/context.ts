/* What a report carries - PURE, and an ALLOWLIST.
   ===========================================================================

   This is the first thing this app sends that a person composed, and it is sent
   from a device that may belong to a five-year-old. So the design is inverted
   from the obvious one: it does not gather everything and remove what is
   sensitive, it reads a short list of named keys and can never see anything
   else. `storage.keys()` exists on the env only so a test can prove this
   function never calls it.

   THE ONE VALUE THAT MUST NEVER LEAVE
   `ellaz:cloud:v1` holds the backup CODE, which restores an entire profile onto
   another device. A report carrying it would be a copy of a child's whole game,
   posted to us and then, once filed, to a public issue tracker. It is not on
   the list below, and `context.test.ts` plants a real-shaped one and searches
   the serialised payload for it - the value, not the field name, because a
   field nobody has thought of yet is still sent.

   The profile is off the list for the same reason and a weaker one: coins,
   stars and a name say nothing about why a game broke.

   PURE, over an injected env, so it tests in node with no DOM and so the
   browser-shaped edges (storage that throws in Incognito, a missing
   `navigator`) are cases rather than accidents. */

/** The most user-agent we will carry. Long enough for any real one; short
 *  enough that a hostile value cannot make the document unreadable. */
export const MAX_UA = 300;

/** The session envelope's own ceiling, from `sdk/session.ts`. A snapshot bigger
 *  than the one the app itself would store is not one of ours. */
export const MAX_SESSION_BYTES = 64 * 1024;

/** Why a board did not travel. Absence alone reads as "the player had not
 *  started", which is a different fact and a misleading one. */
export type SessionDropped = "too-big" | "unreadable";

export interface ReportEnv {
  storage: {
    read(key: string): string | null;
    /** Never called. Present so a test can prove that. */
    keys(): string[];
  };
  view: { w: number; h: number; dpr: number; orientation: "portrait" | "landscape" };
  client: { userAgent: string; language: string; online: boolean };
  now: number;
  base: string;
  buildStamp: string;
}

export interface ReportGame {
  id: string;
  level?: string;
  /** The verbatim `{v, at, s}` envelope - it replays through the game's own
   *  `SessionSpec.validate`, so we need no knowledge of any game's shape. */
  session?: unknown;
  sessionAgeMs?: number;
  sessionDropped?: SessionDropped;
}

export interface ReportContext {
  at: number;
  game?: ReportGame;
  view: ReportEnv["view"];
  app: { locale?: string; theme?: string; muted?: boolean; base: string; buildStamp: string };
  client: ReportEnv["client"];
}

/** Read one named key, parsed, or undefined. Never throws: storage is a
 *  `SecurityError` away in Incognito and a report is not worth a crash. */
function readJson(env: ReportEnv, key: string): unknown {
  try {
    const raw = env.storage.read(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** The raw string, or undefined - for the one case where size matters before
 *  shape does. */
function readRaw(env: ReportEnv, key: string): string | undefined {
  try {
    return env.storage.read(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function capture(env: ReportEnv, gameId: string): ReportGame {
  const game: ReportGame = { id: gameId };

  const level = readJson(env, `ellaz:${gameId}:level`);
  if (typeof level === "string") game.level = level;

  const raw = readRaw(env, `ellaz:${gameId}:session`);
  if (raw !== undefined) {
    if (raw.length > MAX_SESSION_BYTES) {
      // DROPPED, never truncated. Half an envelope is invalid JSON that reads
      // downstream as a corrupt board rather than as an absent one, and the
      // whole point of sending it is that it can be replayed.
      game.sessionDropped = "too-big";
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = undefined;
      }
      if (isRecord(parsed)) {
        game.session = parsed;
        const at = parsed.at;
        if (typeof at === "number" && Number.isFinite(at)) {
          game.sessionAgeMs = Math.max(0, env.now - at);
        }
      } else {
        game.sessionDropped = "unreadable";
      }
    }
  }

  return game;
}

/**
 * Everything a report knows about the moment, and nothing else.
 *
 * `gameId` undefined means the player was not in a game - on the home screen,
 * the room or the boards - and the `game` block is simply absent.
 */
export function captureContext(gameId: string | undefined, env: ReportEnv): ReportContext {
  const locale = readJson(env, "ellaz:locale");
  const theme = readJson(env, "ellaz:theme");
  const muted = readJson(env, "ellaz:muted");

  return {
    at: env.now,
    game: gameId ? capture(env, gameId) : undefined,
    view: env.view,
    app: {
      locale: typeof locale === "string" ? locale : undefined,
      theme: typeof theme === "string" ? theme : undefined,
      muted: typeof muted === "boolean" ? muted : undefined,
      base: env.base,
      buildStamp: env.buildStamp,
    },
    client: {
      userAgent: env.client.userAgent.slice(0, MAX_UA),
      language: env.client.language,
      online: env.client.online,
    },
  };
}
