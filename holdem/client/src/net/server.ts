// Where the server is, and the one HTTP call this client makes.
//
// The URL is configuration, never a literal in a component: the same bundle is
// served from localhost, from a pages.dev preview and from poker.ellaz.fun, and
// each talks to a different worker. `VITE_HOLDEM_SERVER` is substituted at
// BUILD time, so a deploy that forgets it does not fall back to localhost
// quietly — see the check below.

const CONFIGURED = import.meta.env.VITE_HOLDEM_SERVER as string | undefined;

/**
 * The server's base URL.
 *
 * In dev, defaults to the local wrangler port so `npm run dev` works with no
 * setup. In a production build the variable is REQUIRED: a bundle pointing at
 * localhost renders perfectly, connects to nothing, and shows a player an
 * endless "connecting" — a failure with no symptom anyone can report usefully.
 */
export function serverBase(): string {
  if (CONFIGURED) return CONFIGURED.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:8787";
  throw new Error(
    "VITE_HOLDEM_SERVER was not set at build time — this bundle has no server to talk to.",
  );
}

export function socketUrl(code: string): string {
  return `${serverBase().replace(/^http/, "ws")}/ws/${code}`;
}

export interface CreateOptions {
  maxSeats: number;
  sb: number;
  bb: number;
  startingStack: number;
  minBuyIn: number;
  maxBuyIn: number;
  actionTimeMs: number;
}

/** Create a table. Returns its room code. */
export async function createRoom(opts: CreateOptions): Promise<string> {
  const res = await fetch(`${serverBase()}/api/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`could not create a table (HTTP ${res.status})`);
  const body = (await res.json()) as { code?: string };
  if (!body.code) throw new Error("the server created a table without a code");
  return body.code;
}

/**
 * Tidy a typed room code the way the server does.
 *
 * Kept in step with normalizeCode in server/src/index.ts DELIBERATELY rather
 * than shared, because the two answer different questions: this one is a
 * courtesy while somebody types, and the server's is the authority. If they
 * ever disagree the server wins and the player sees "no such room", which is
 * survivable; sharing the function would make a client-side edit able to change
 * what the server accepts.
 */
export function tidyCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .slice(0, 5);
}
