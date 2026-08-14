// Everything this client keeps on the device, and nothing else.
//
// One key holds a random token that identifies this browser to a table. It is
// not a login and it is not a secret worth protecting: it exists so that
// closing the tab and coming back puts you in the same seat rather than
// stranding your chips. Clearing site data loses it, exactly as ellaz's own
// storage does, and the fix is the same one the operator already relies on
// there — the host can issue a relink code.
//
// Every access is wrapped, because localStorage THROWS in Safari private mode
// rather than returning null. An unwrapped read is a white screen for that
// player and nobody else.

const TOKEN_KEY = "holdem:token:v1";
const NAME_KEY = "holdem:name:v1";
const ROOM_KEY = "holdem:lastRoom:v1";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A device that refuses to remember is still a device that can play. The
    // cost is that a refresh forfeits the seat, which is worth far less than
    // refusing to deal them in.
  }
}

/**
 * This device's token. Generated once and kept.
 *
 * `crypto.randomUUID` is unavailable on http:// origins other than localhost,
 * so there is a fallback — a client that cannot produce a token cannot join at
 * all, which is a silly way to lose a player on a LAN.
 */
export function deviceToken(): string {
  const existing = read(TOKEN_KEY);
  if (existing && existing.length >= 8) return existing;

  const fresh = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : randomHex(16);

  write(TOKEN_KEY, fresh);
  return fresh;
}

function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The name this device last used, so a returning player keeps their animal. */
export function storedName(): { adj: string; noun: string } | undefined {
  const raw = read(NAME_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).adj === "string" &&
      typeof (parsed as Record<string, unknown>).noun === "string"
    ) {
      return parsed as { adj: string; noun: string };
    }
  } catch {
    // Hand-edited or half-written. The server assigns a name when we send
    // none, so forgetting it is a complete recovery.
  }
  return undefined;
}

export function rememberName(name: { adj: string; noun: string }): void {
  write(NAME_KEY, JSON.stringify({ adj: name.adj, noun: name.noun }));
}

export function lastRoom(): string | null {
  return read(ROOM_KEY);
}

export function rememberRoom(code: string): void {
  write(ROOM_KEY, code);
}
