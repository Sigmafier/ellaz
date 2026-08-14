// The name pool — every player is called something, and nobody types it.
//
// WHY A POOL AND NOT A TEXT FIELD
// The same reasoning as ellaz's src/sdk/names.ts, and it lands harder here: a
// poker table is a room with other people's names in it. A free-text field is a
// moderation problem the moment two strangers share a room — someone types
// something, it sits on the felt for the whole session, and this project needs
// a report button and a review queue. Picking from a fixed list removes all of
// it: there is nothing to moderate because there is nothing anyone can type.
//
// WHY IDS AND NOT A STRING
// These ids cross a socket. The server stores the two IDS and renders the name
// itself, so a client cannot put arbitrary text on another player's screen by
// calling it a name. That is the security half; the ellaz copy keeps ids for a
// different reason (one player, one name, two languages) and both hold here.
//
// WHY THIS FILE HAS NO HEBREW
// The table speaks English (operator's call, 2026-08-14). ellaz's pool carries
// Hebrew gender agreement because Hebrew adjectives inflect and follow their
// noun; English needs none of that, so this is deliberately the simpler file
// rather than a copy with columns left empty. Adding a language means adding a
// render rule here, the same shape ellaz uses.
//
// NEVER REMOVE OR RENAME A WORD ID.
// Ids are persisted per player and travel in saved hand history and the ledger.
// Removing one un-names every player who had it, retroactively, including in
// hands already played. Words are ADDED.

/** One half of a name. */
export interface Adjective {
  id: string;
  en: string;
}

/** The other half, and the face it wears at the table. */
export interface Noun {
  id: string;
  en: string;
  emoji: string;
}

/**
 * Warm, and deliberately never about skill.
 *
 * Nothing here may describe how well someone plays. "Lucky Fox" is a joke a
 * loser can enjoy; "Winning Fox" is a scoreboard attached to a person for the
 * whole night, assigned by a random number generator. `names.test.ts` enforces
 * this with a pattern, because it is the kind of thing that seems harmless when
 * you add the one word.
 */
export const ADJECTIVES: readonly Adjective[] = [
  { id: "swift", en: "Swift" },
  { id: "brave", en: "Brave" },
  { id: "lucky", en: "Lucky" },
  { id: "clever", en: "Clever" },
  { id: "calm", en: "Calm" },
  { id: "bold", en: "Bold" },
  { id: "golden", en: "Golden" },
  { id: "quiet", en: "Quiet" },
  { id: "sly", en: "Sly" },
  { id: "cheerful", en: "Cheerful" },
  { id: "steady", en: "Steady" },
  { id: "wild", en: "Wild" },
  { id: "nimble", en: "Nimble" },
  { id: "kind", en: "Kind" },
  { id: "sharp", en: "Sharp" },
  { id: "dancing", en: "Dancing" },
];

/**
 * Animals, all distinct — the animal is the seat's avatar, so two players at
 * one table must never wear the same face. Pinned in the tests.
 *
 * `emoji` is NOT the avatar any more and NOTHING RENDERS IT. The app draws
 * each animal from `client/src/ui/animals.tsx`, keyed off this `id`, because
 * an emoji is a font the phone chooses rather than a picture we ship.
 *
 * The field and `nameEmoji` are kept rather than deleted only because the
 * ratchet in `names.test.ts` asserts on them, and they would be the obvious
 * fallback for a future text-only surface — a terminal client, a share
 * string. Checked 2026-08-14: no such caller exists today. If you are looking
 * for something to delete, this is it; just do not wire it back into a screen.
 */
export const NOUNS: readonly Noun[] = [
  { id: "tiger", en: "Tiger", emoji: "🐯" },
  { id: "lion", en: "Lion", emoji: "🦁" },
  { id: "fox", en: "Fox", emoji: "🦊" },
  { id: "bear", en: "Bear", emoji: "🐻" },
  { id: "rabbit", en: "Rabbit", emoji: "🐰" },
  { id: "turtle", en: "Turtle", emoji: "🐢" },
  { id: "dolphin", en: "Dolphin", emoji: "🐬" },
  { id: "owl", en: "Owl", emoji: "🦉" },
  { id: "falcon", en: "Falcon", emoji: "🦅" },
  { id: "hedgehog", en: "Hedgehog", emoji: "🦔" },
  { id: "penguin", en: "Penguin", emoji: "🐧" },
  { id: "squirrel", en: "Squirrel", emoji: "🐿️" },
  { id: "whale", en: "Whale", emoji: "🐳" },
  { id: "monkey", en: "Monkey", emoji: "🐵" },
  { id: "badger", en: "Badger", emoji: "🦡" },
  { id: "lizard", en: "Lizard", emoji: "🦎" },
  { id: "giraffe", en: "Giraffe", emoji: "🦒" },
  { id: "panda", en: "Panda", emoji: "🐼" },
  { id: "zebra", en: "Zebra", emoji: "🦓" },
  { id: "heron", en: "Heron", emoji: "🦩" },
];

/**
 * How many distinct names exist.
 *
 * Collisions are fine and are NOT prevented. Two players can both be Lucky Fox;
 * the seat number and the emoji disambiguate them on screen, and identity is
 * the playerId, never the name. Appending a discriminator would make it read
 * like a username, which is the opposite of the point.
 */
export const NAME_COMBINATIONS = ADJECTIVES.length * NOUNS.length;

/** What is stored and what crosses the wire. Two ids, nothing else. */
export interface PlayerName {
  adj: string;
  noun: string;
}

/**
 * Is this the right SHAPE for a name?
 *
 * Shape only — it does NOT check the words exist, because "shape" and
 * "membership" are separate questions with different answers on the two sides
 * of the wire. A server MUST also call `resolveName` before storing anything
 * that arrived from a client; a client rendering its own stored name should
 * tolerate a word a newer build introduced.
 *
 * Extra keys are REJECTED rather than ignored. A name is two ids; anything else
 * riding along is a client trying to smuggle a field into storage, and it
 * should fail loudly at the boundary instead of being quietly stripped
 * somewhere downstream.
 */
export function isPlayerName(value: unknown): value is PlayerName {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("adj") || !keys.includes("noun")) return false;
  const { adj, noun } = value as Record<string, unknown>;
  return typeof adj === "string" && adj !== "" && typeof noun === "string" && noun !== "";
}

/**
 * Both words, or `undefined` if either id is not in this build's pool.
 *
 * On the server this doubles as the wire validator: an id that does not resolve
 * never reaches storage, so the pool itself is the allowlist.
 */
export function resolveName(name: PlayerName | undefined): { adj: Adjective; noun: Noun } | undefined {
  if (!isPlayerName(name)) return undefined;
  const adj = ADJECTIVES.find((a) => a.id === name.adj);
  const noun = NOUNS.find((n) => n.id === name.noun);
  return adj && noun ? { adj, noun } : undefined;
}

/**
 * The name as a player reads it, or `undefined` when it cannot be resolved.
 *
 * `undefined` rather than a placeholder keeps the decision at the call site,
 * where "no name yet" and "this build does not know that word" can be answered
 * the same honest way.
 */
export function renderName(name: PlayerName | undefined): string | undefined {
  const resolved = resolveName(name);
  return resolved ? `${resolved.adj.en} ${resolved.noun.en}` : undefined;
}

/** The seat's face. `undefined` if the name does not resolve. */
export function nameEmoji(name: PlayerName | undefined): string | undefined {
  return resolveName(name)?.noun.emoji;
}

/** Index into the flattened adjective x noun space. */
function decode(index: number): PlayerName {
  return {
    adj: ADJECTIVES[Math.floor(index / NOUNS.length)].id,
    noun: NOUNS[index % NOUNS.length].id,
  };
}

function encode(name: PlayerName | undefined): number | undefined {
  const resolved = resolveName(name);
  if (!resolved) return undefined;
  return ADJECTIVES.indexOf(resolved.adj) * NOUNS.length + NOUNS.indexOf(resolved.noun);
}

/**
 * Draw an integer in [0, max] from an rng returning [0, 1).
 *
 * Clamped, because a generator pinned at exactly 1 (or a hair under, after
 * floating-point rounding) would index one past the end and hand back
 * `undefined.id` — a crash a long way from its cause.
 */
function randInt(max: number, rng: () => number): number {
  return Math.min(max, Math.max(0, Math.floor(rng() * (max + 1))));
}

/** A name, uniformly drawn from the whole pool. */
export function pickName(rng: () => number = Math.random): PlayerName {
  return decode(randInt(NAME_COMBINATIONS - 1, rng));
}

/**
 * A name GUARANTEED not to be the one passed in.
 *
 * Done by drawing from the pool with the current name REMOVED, not by drawing
 * and retrying: retrying is unbounded on a degenerate rng, so it would hang the
 * reroll button rather than fail it, and at 1-in-320 nobody would ever see it
 * in testing.
 *
 * A name that does not resolve excludes nothing, which is right — any real name
 * is already a change from an unrenderable one.
 */
export function rerollName(
  current: PlayerName | undefined,
  rng: () => number = Math.random,
): PlayerName {
  const skip = encode(current);
  if (skip === undefined) return pickName(rng);
  const drawn = randInt(NAME_COMBINATIONS - 2, rng);
  return decode(drawn >= skip ? drawn + 1 : drawn);
}
