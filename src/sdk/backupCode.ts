// The backup code — eight characters a child writes on a piece of paper.
//
// This exists because of a hard constraint, not a design preference. Anonymous
// identity lives in the browser's own storage, so "clear browsing data" destroys
// the key to the cloud copy along with the local one. NOTHING inside the device
// can survive that. The only thing that can is something OUTSIDE it, and the
// cheapest such thing is a short code on a Post-it.
//
// So the app is honest about what it is: a code you keep, not magic. It is also
// how a tablet joins a phone, which is the same operation from the other end.
//
// The alphabet is Crockford base32 — I, L, O and U removed. The first three
// because a handwritten 1 and I, or 0 and O, are the same mark, and this code
// is going to be handwritten by someone who is seven. U is out so eight random
// characters cannot spell something the parent then has to explain.
//
// Reading a code back REPAIRS those confusions rather than rejecting them:
// typing O for 0 is the font's fault, not the child's.
import { randInt } from "@shared/rng";

/** Crockford base32: 0-9 and A-Z without I, L, O, U. */
export const BACKUP_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Characters, excluding the group separator. 32^8 ≈ 1.1e12. */
export const CODE_LENGTH = 8;

/** What a misread character was almost certainly meant to be. */
const CONFUSIONS: Record<string, string> = { I: "1", L: "1", O: "0" };

/** `XXXXXXXX` → `XXXX-XXXX`. The dash is for reading, never for storage. */
export function formatBackupCode(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** A fresh code, uniformly drawn. */
export function makeBackupCode(rng: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += BACKUP_ALPHABET[randInt(0, BACKUP_ALPHABET.length - 1, rng)];
  }
  return formatBackupCode(out);
}

/**
 * A typed code in canonical `XXXX-XXXX` form, or `undefined` if it is not one.
 *
 * Total and forgiving by design: it upper-cases, drops every separator a person
 * might insert (spaces, dashes, anywhere), and maps the three confusable letters
 * onto the digits they were meant to be. What it will NOT do is guess — a
 * character outside the alphabet after repair, or the wrong length, is rejected
 * rather than coerced, because silently "fixing" a code into a DIFFERENT valid
 * code would show the child somebody else's room.
 */
export function normalizeBackupCode(input: string): string | undefined {
  if (typeof input !== "string") return undefined;

  let cleaned = "";
  for (const ch of input.toUpperCase()) {
    // Anything non-alphanumeric is a separator the person added for legibility.
    if (!/[0-9A-Z]/.test(ch)) continue;
    cleaned += CONFUSIONS[ch] ?? ch;
  }

  if (cleaned.length !== CODE_LENGTH) return undefined;
  for (const ch of cleaned) {
    if (!BACKUP_ALPHABET.includes(ch)) return undefined;
  }
  return formatBackupCode(cleaned);
}
