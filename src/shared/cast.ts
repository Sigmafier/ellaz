// Themed casts of emoji "characters" a game can draw from.
//
// Hebrew-first: `he` is the PRIMARY name, not a translation of `en`. These
// strings are read aloud to a 4-6 year old and printed under the glyph, so they
// are the everyday words a child uses (כבאית, not "רכב כיבוי אש").
//
// VISUAL DISTINCTNESS IS A CORRECTNESS PROPERTY, not a style preference. A
// "what disappeared?" or "find the pair" round is unfair the moment two members
// of a theme look alike at 40px on a phone, so this file deliberately picks
// 🐘🦁🐸🐧 over 🐕🐩🦮, and skips 🍏/🍐 because they read as 🍎. `cast.test.ts`
// pins the mechanical half (no duplicate glyphs); the judgement half lives here,
// so when you add an item, look at it next to its theme-mates before shipping.
//
// The `rng` parameter goes LAST and defaults to `Math.random`, matching `rng.ts`
// and every game signature in the repo.
import { shuffle } from "./rng";

export interface CastItem {
  /** The glyph a game draws. */
  emoji: string;
  /** Hebrew name — the primary string. */
  he: string;
  /** English name. */
  en: string;
}

/**
 * Theme ids in a stable order. `CastTheme` is DERIVED from this, so adding a
 * theme here without adding it to `CAST` is a tsc error rather than a runtime
 * `undefined`.
 */
export const CAST_THEMES = ["animals", "fruit", "vehicles", "toys", "nature", "food"] as const;

export type CastTheme = (typeof CAST_THEMES)[number];

export const CAST: Record<CastTheme, readonly CastItem[]> = {
  animals: [
    { emoji: "🐘", he: "פיל", en: "elephant" },
    { emoji: "🦁", he: "אריה", en: "lion" },
    { emoji: "🐸", he: "צפרדע", en: "frog" },
    { emoji: "🐧", he: "פינגווין", en: "penguin" },
    { emoji: "🐢", he: "צב", en: "turtle" },
    { emoji: "🦋", he: "פרפר", en: "butterfly" },
    { emoji: "🐙", he: "תמנון", en: "octopus" },
    { emoji: "🦒", he: "ג'ירפה", en: "giraffe" },
    { emoji: "🐝", he: "דבורה", en: "bee" },
    { emoji: "🐬", he: "דולפין", en: "dolphin" },
  ],
  fruit: [
    { emoji: "🍎", he: "תפוח", en: "apple" },
    { emoji: "🍌", he: "בננה", en: "banana" },
    { emoji: "🍇", he: "ענבים", en: "grapes" },
    { emoji: "🍉", he: "אבטיח", en: "watermelon" },
    { emoji: "🍓", he: "תות", en: "strawberry" },
    { emoji: "🍍", he: "אננס", en: "pineapple" },
    { emoji: "🥝", he: "קיווי", en: "kiwi" },
    { emoji: "🍒", he: "דובדבן", en: "cherry" },
    { emoji: "🥥", he: "קוקוס", en: "coconut" },
  ],
  vehicles: [
    { emoji: "🚗", he: "מכונית", en: "car" },
    { emoji: "🚌", he: "אוטובוס", en: "bus" },
    { emoji: "🚂", he: "רכבת", en: "train" },
    { emoji: "✈️", he: "מטוס", en: "airplane" },
    { emoji: "🚁", he: "מסוק", en: "helicopter" },
    { emoji: "🚲", he: "אופניים", en: "bicycle" },
    { emoji: "🚜", he: "טרקטור", en: "tractor" },
    { emoji: "🚒", he: "כבאית", en: "fire truck" },
    { emoji: "⛵", he: "סירה", en: "sailboat" },
    { emoji: "🚀", he: "חללית", en: "rocket" },
  ],
  toys: [
    { emoji: "🧸", he: "דובון", en: "teddy bear" },
    { emoji: "⚽", he: "כדור", en: "ball" },
    { emoji: "🪁", he: "עפיפון", en: "kite" },
    { emoji: "🎈", he: "בלון", en: "balloon" },
    { emoji: "🪀", he: "יו-יו", en: "yo-yo" },
    { emoji: "🧩", he: "פאזל", en: "puzzle" },
    { emoji: "🪆", he: "בובה", en: "doll" },
    { emoji: "🎲", he: "קובייה", en: "dice" },
    { emoji: "🛴", he: "קורקינט", en: "scooter" },
  ],
  nature: [
    { emoji: "🌳", he: "עץ", en: "tree" },
    { emoji: "🌻", he: "חמנייה", en: "sunflower" },
    { emoji: "🍄", he: "פטרייה", en: "mushroom" },
    { emoji: "🌈", he: "קשת", en: "rainbow" },
    { emoji: "⭐", he: "כוכב", en: "star" },
    { emoji: "🌙", he: "ירח", en: "moon" },
    { emoji: "☁️", he: "ענן", en: "cloud" },
    { emoji: "🌊", he: "גל", en: "wave" },
    { emoji: "🔥", he: "אש", en: "fire" },
    { emoji: "❄️", he: "שלג", en: "snow" },
  ],
  food: [
    { emoji: "🍕", he: "פיצה", en: "pizza" },
    { emoji: "🍔", he: "המבורגר", en: "hamburger" },
    { emoji: "🍦", he: "גלידה", en: "ice cream" },
    { emoji: "🥨", he: "בייגלה", en: "pretzel" },
    { emoji: "🧀", he: "גבינה", en: "cheese" },
    { emoji: "🥕", he: "גזר", en: "carrot" },
    { emoji: "🍿", he: "פופקורן", en: "popcorn" },
    { emoji: "🍪", he: "עוגייה", en: "cookie" },
    { emoji: "🥚", he: "ביצה", en: "egg" },
    { emoji: "🍟", he: "צ'יפס", en: "fries" },
  ],
};

/**
 * Every item of a theme, in its declared order.
 *
 * Throws on an id that is not a theme. The type already prevents it, but a
 * catalog-driven game can hand this a string off a save file, and an honest
 * throw beats silently returning `undefined` and rendering an empty board.
 */
export function castOf(theme: CastTheme): readonly CastItem[] {
  const items = CAST[theme];
  if (!items) throw new Error(`[ellaz] unknown cast theme: ${String(theme)}`);
  return items;
}

/**
 * `n` DISTINCT items from a theme, in random order.
 *
 * CLAMPS rather than throws: asking for more items than the theme holds returns
 * the whole theme shuffled, and a negative `n` returns `[]`. A round that is one
 * character short is a smaller round; a thrown error mid-game is a black screen
 * for a five-year-old. Callers that care can compare `result.length` to `n`.
 */
export function drawCast(theme: CastTheme, n: number, rng: () => number = Math.random): CastItem[] {
  const items = castOf(theme);
  const take = Math.max(0, Math.min(Math.floor(n), items.length));
  return shuffle(items, rng).slice(0, take);
}
