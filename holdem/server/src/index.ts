// Worker entry: room creation and WebSocket routing.
//
// Room codes map to Durable Objects via idFromName(code) — which means ANY
// code maps to SOME object, so the DO itself tracks whether it was claimed by
// /api/create and refuses sockets to phantom rooms.

export { TableDO } from "./tableDO";
export { LobbyDO } from "./lobby";

import { LOBBY_NAME } from "./lobby";
import type { Env } from "./env";

export type { Env };

// Crockford-style base32, the ellaz backupCode.ts alphabet: I/L/O/U removed
// (handwriting confuses them with 1/1/0; U keeps random codes from spelling
// anything). Input normalization maps I/L→1 and O→0 — a legibility fix that
// cannot land on a DIFFERENT valid code; anything else out of alphabet is
// rejected rather than coerced.
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 5;

function makeCode(): string {
  const buf = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(buf);
  let out = "";
  for (const b of buf) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export function normalizeCode(input: string): string | null {
  const mapped = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (mapped.length !== CODE_LENGTH) return null;
  for (const ch of mapped) if (!CODE_ALPHABET.includes(ch)) return null;
  return mapped;
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = originAllowed(origin, env) ? origin! : "";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function originAllowed(origin: string | null, env: Env): boolean {
  if (!origin) return true; // non-browser clients (CLI harness, tests)
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith(".pages.dev")) return true;
    return env.ALLOWED_ORIGINS.split(",").some((o) => o.trim() === origin);
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin, env) });
    }
    if (!originAllowed(origin, env)) {
      return new Response("forbidden origin", { status: 403 });
    }

    if (url.pathname === "/api/create" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return json({ error: "bad body" }, 400, origin, env);
      // Retry on the (astronomically unlikely) already-claimed collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const stub = env.TABLE.get(env.TABLE.idFromName(code));
        const res = await stub.fetch("https://do/init", {
          method: "POST",
          body: JSON.stringify({ ...body, code }),
        });
        if (res.ok) return json({ code }, 200, origin, env);
        if (res.status !== 409) return json(await res.json(), res.status, origin, env);
      }
      return json({ error: "could not allocate a room code" }, 500, origin, env);
    }

    // The lobby. Read-only and unauthenticated: it lists the tables whose
    // hosts asked to be listed, which is the entire point of a lobby.
    if (url.pathname === "/api/tables" && request.method === "GET") {
      try {
        const stub = env.LOBBY.get(env.LOBBY.idFromName(LOBBY_NAME));
        const res = await stub.fetch("https://do/list");
        return json(await res.json(), 200, origin, env);
      } catch {
        // An empty lobby is an honest answer to "the registry is unreachable".
        // A 500 here would make the home screen look broken when every table
        // on it is perfectly playable by code.
        return json({ tables: [] }, 200, origin, env);
      }
    }

    const wsMatch = url.pathname.match(/^\/ws\/([A-Za-z0-9-]+)$/);
    if (wsMatch) {
      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const code = normalizeCode(wsMatch[1]);
      if (!code) return new Response("bad room code", { status: 404 });
      const stub = env.TABLE.get(env.TABLE.idFromName(code));
      return stub.fetch(request);
    }

    return new Response("holdem server", { status: 200 });
  },
};

function json(data: unknown, status: number, origin: string | null, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin, env) },
  });
}
