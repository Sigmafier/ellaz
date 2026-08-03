// The name pool — every player gets a name, and no child ever types one.
//
// WHY A POOL AND NOT A TEXT FIELD
// A free-text name on a kids' platform is a moderation problem: someone types
// something, it appears on a leaderboard, and now this project needs a review
// queue. Picking from a fixed list removes that entirely — there is nothing to
// moderate, nothing to report, and no keyboard on the screen. It is also
// friendlier: a five-year-old who cannot spell still gets a name they like.
//
// WHY IDS AND NOT A STRING
// A stored "נמר זריז" would still say נמר זריז after the child switches the app
// to English. The profile keeps the two WORD IDS and this module renders them
// in whatever locale is current, so one player has one name in two languages.
//
// WHY HEBREW NEEDS THE GENDER COLUMN
// Hebrew adjectives agree with their noun and follow it, so an English-shaped
// adjective+noun pool produces broken Hebrew twice over: "זריז נמר" is the
// wrong order and "לטאה זריז" is the wrong gender. Every noun therefore
// declares its gender and every adjective carries both forms. This is not
// polish — it is the difference between the app's default language reading as
// written by a person or by a machine.
//
// NEVER REMOVE OR RENAME A WORD ID.
// Ids are persisted in `profile.name` forever, exactly like the shop item ids
// in `portal/world/items.ts`. Removing one silently un-names every player who
// had it. Words are ADDED; the ratchet in names.test.ts fails on a shrink.
import type { Locale } from "@i18n/index";
// Deep import, deliberately, and sanctioned by the barrel's own doc comment.
// `@shared/index` re-exports winMoment, which reaches @juice and the portal's
// WalletChip, which imports the wallet — and the wallet imports the profile,
// which imports THIS file. Through the barrel that is a runtime cycle around a
// module-level singleton constructed at import time, which is the shape that
// yields `undefined` at construction rather than a loud error. `@shared/rng`
// is a leaf with no imports of its own, so it cannot close a loop.
import { randInt } from "@shared/rng";

/** Hebrew grammatical gender. Drives which adjective form a noun takes. */
export type Gender = "m" | "f";

export interface Adjective {
  id: string;
  en: string;
  /** Both Hebrew forms. Which one is used depends on the NOUN, not the adjective. */
  he: { m: string; f: string };
}

export interface Noun {
  id: string;
  en: string;
  he: string;
  gender: Gender;
  /** The face this name wears — on the World character, and later on a board row. */
  emoji: string;
}

/**
 * Deliberately warm and slightly silly. Nothing here describes how good someone
 * is at anything: a name is not a rank, and "Mighty Tiger" must not read as a
 * prize that "Tiny Frog" missed out on.
 */
export const ADJECTIVES: readonly Adjective[] = [
  { id: "swift", en: "Swift", he: { m: "זריז", f: "זריזה" } },
  { id: "brave", en: "Brave", he: { m: "אמיץ", f: "אמיצה" } },
  { id: "happy", en: "Happy", he: { m: "שמח", f: "שמחה" } },
  { id: "clever", en: "Clever", he: { m: "חכם", f: "חכמה" } },
  { id: "gentle", en: "Gentle", he: { m: "עדין", f: "עדינה" } },
  { id: "glowing", en: "Glowing", he: { m: "זוהר", f: "זוהרת" } },
  { id: "tiny", en: "Tiny", he: { m: "קטן", f: "קטנה" } },
  { id: "mighty", en: "Mighty", he: { m: "חזק", f: "חזקה" } },
  { id: "curious", en: "Curious", he: { m: "סקרן", f: "סקרנית" } },
  { id: "cheerful", en: "Cheerful", he: { m: "עליז", f: "עליזה" } },
  { id: "golden", en: "Golden", he: { m: "זהוב", f: "זהובה" } },
  { id: "quiet", en: "Quiet", he: { m: "שקט", f: "שקטה" } },
  { id: "funny", en: "Funny", he: { m: "מצחיק", f: "מצחיקה" } },
  { id: "kind", en: "Kind", he: { m: "נחמד", f: "נחמדה" } },
  { id: "sparkly", en: "Sparkly", he: { m: "נוצץ", f: "נוצצת" } },
  { id: "dancing", en: "Dancing", he: { m: "רוקד", f: "רוקדת" } },
];

/** Animals only, and only ones a small child recognises on sight. */
export const NOUNS: readonly Noun[] = [
  { id: "tiger", en: "Tiger", he: "נמר", gender: "m", emoji: "🐯" },
  { id: "lion", en: "Lion", he: "אריה", gender: "m", emoji: "🦁" },
  { id: "fox", en: "Fox", he: "שועל", gender: "m", emoji: "🦊" },
  { id: "bear", en: "Bear", he: "דוב", gender: "m", emoji: "🐻" },
  { id: "rabbit", en: "Rabbit", he: "ארנב", gender: "m", emoji: "🐰" },
  { id: "turtle", en: "Turtle", he: "צב", gender: "m", emoji: "🐢" },
  { id: "dolphin", en: "Dolphin", he: "דולפין", gender: "m", emoji: "🐬" },
  { id: "owl", en: "Owl", he: "ינשוף", gender: "m", emoji: "🦉" },
  { id: "butterfly", en: "Butterfly", he: "פרפר", gender: "m", emoji: "🦋" },
  { id: "hedgehog", en: "Hedgehog", he: "קיפוד", gender: "m", emoji: "🦔" },
  { id: "penguin", en: "Penguin", he: "פינגווין", gender: "m", emoji: "🐧" },
  { id: "squirrel", en: "Squirrel", he: "סנאי", gender: "m", emoji: "🐿️" },
  { id: "whale", en: "Whale", he: "לווייתן", gender: "m", emoji: "🐳" },
  { id: "monkey", en: "Monkey", he: "קוף", gender: "m", emoji: "🐵" },
  { id: "bee", en: "Bee", he: "דבורה", gender: "f", emoji: "🐝" },
  { id: "lizard", en: "Lizard", he: "לטאה", gender: "f", emoji: "🦎" },
  { id: "giraffe", en: "Giraffe", he: "ג'ירפה", gender: "f", emoji: "🦒" },
  { id: "panda", en: "Panda", he: "פנדה", gender: "f", emoji: "🐼" },
  { id: "zebra", en: "Zebra", he: "זברה", gender: "f", emoji: "🦓" },
  { id: "frog", en: "Frog", he: "צפרדע", gender: "f", emoji: "🐸" },
];

/**
 * How many distinct names exist.
 *
 * Collisions are expected and fine: two children can both be Swift Tiger. The
 * name is what a player is CALLED, not who they are — identity is the anonymous
 * uid. Appending a discriminator number would buy uniqueness nobody asked for
 * and make the name read like a username, which is the opposite of the point.
 */
export const NAME_COMBINATIONS = ADJECTIVES.length * NOUNS.length;

/** What the profile stores. Two ids, nothing else. */
export interface PlayerName {
  adj: string;
  noun: string;
}

/**
 * Is this the right SHAPE for a stored name?
 *
 * Shape only, on purpose — it does NOT check the words exist. A profile written
 * by a newer build (another tab mid-deploy, a device that updated first) carries
 * words this build has never heard of, and deleting the child's name over that
 * would be a worse bug than briefly not rendering it. Resolution is where
 * unknown words are handled, and it degrades to "no name" rather than throwing.
 */
export function isPlayerName(value: unknown): value is PlayerName {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const { adj, noun } = value as Record<string, unknown>;
  return typeof adj === "string" && adj !== "" && typeof noun === "string" && noun !== "";
}

/** Both words, or `undefined` if either id is not in this build's pool. */
export function resolveName(name: PlayerName | undefined): { adj: Adjective; noun: Noun } | undefined {
  if (!isPlayerName(name)) return undefined;
  const adj = ADJECTIVES.find((a) => a.id === name.adj);
  const noun = NOUNS.find((n) => n.id === name.noun);
  return adj && noun ? { adj, noun } : undefined;
}

/**
 * The name as a child reads it, or `undefined` when it cannot be resolved.
 *
 * Hebrew is `<noun> <adjective>` with the adjective agreeing in gender;
 * English is `<Adjective> <Noun>`. Returning `undefined` rather than a
 * placeholder string keeps the decision at the call site, where "this player
 * has no name yet" and "this build doesn't know that word" can both be answered
 * the same honest way: offer them a name.
 */
export function renderName(name: PlayerName | undefined, locale: Locale): string | undefined {
  const resolved = resolveName(name);
  if (!resolved) return undefined;
  const { adj, noun } = resolved;
  return locale === "he" ? `${noun.he} ${adj.he[noun.gender]}` : `${adj.en} ${noun.en}`;
}

/** The noun's emoji — the character's face. `undefined` if the name doesn't resolve. */
export function nameEmoji(name: PlayerName | undefined): string | undefined {
  return resolveName(name)?.noun.emoji;
}

/** Index into the flattened adjective × noun space. */
function decode(index: number): PlayerName {
  const adj = ADJECTIVES[Math.floor(index / NOUNS.length)];
  const noun = NOUNS[index % NOUNS.length];
  return { adj: adj.id, noun: noun.id };
}

function encode(name: PlayerName | undefined): number | undefined {
  const resolved = resolveName(name);
  if (!resolved) return undefined;
  const adjIndex = ADJECTIVES.indexOf(resolved.adj);
  const nounIndex = NOUNS.indexOf(resolved.noun);
  return adjIndex * NOUNS.length + nounIndex;
}

/** A name, uniformly drawn from the whole pool. */
export function pickName(rng: () => number = Math.random): PlayerName {
  return decode(randInt(0, NAME_COMBINATIONS - 1, rng));
}

/**
 * A name that is GUARANTEED not to be the one passed in.
 *
 * The reroll button's whole job is that something changes, so it must not be
 * able to hand back the current name. That is done by drawing from the pool
 * with the current name REMOVED — not by drawing and retrying, which is
 * unbounded on a degenerate rng and would hang the button rather than fail it.
 *
 * A name that doesn't resolve (a word this build doesn't know) excludes nothing,
 * which is right: any real name is already a change from an unrenderable one.
 */
export function rerollName(current: PlayerName | undefined, rng: () => number = Math.random): PlayerName {
  const skip = encode(current);
  if (skip === undefined) return pickName(rng);
  const drawn = randInt(0, NAME_COMBINATIONS - 2, rng);
  return decode(drawn >= skip ? drawn + 1 : drawn);
}
