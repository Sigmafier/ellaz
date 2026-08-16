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
// TYPE-ONLY, and from the LEAF `locales.ts` rather than the `strings.ts`
// resolver: it erases at build time, so this costs nothing at runtime and
// cannot pull the i18n resolver into the shared module graph. Same sanctioned
// arrow as `@ui` -> `@i18n` (see CLAUDE.md); `locales.ts` imports nothing, so
// it can never become a cycle.
import type { ShippedLocale } from "@i18n/locales";
import { shuffle } from "./rng";

/**
 * A themed character: the glyph, plus its name in every language a HUMAN HAS
 * WRITTEN one for.
 *
 * `Record<ShippedLocale, string>` rather than two literal `he` / `en` fields, and
 * that is a gate rather than a tidy-up: written as `he: string; en: string` it
 * would simply COMPILE, and `Shadows.tsx` and `SortSize.tsx` would go on handing
 * players of a newly-added language English aria-labels with no error anywhere.
 *
 * It was keyed on `PageLocale` until 2026-08-16, which made these 58 names part
 * of the price of a new PAGE — 58 strings in the shell chunk for a language
 * whose only new artifact is prose nobody downloads. Now the two are separate:
 * promoting a page language demands nothing here, and widening SHIPPED_LOCALES
 * demands all 58 and is a payload decision taken on purpose.
 *
 * Call sites are unchanged — `item.he` and `item.en` still resolve, because the
 * record's keys ARE those names.
 *
 * The intersection is safe here specifically because a `CastItem` has no `id`
 * field. Indonesian's locale code is `id`, which is why `GameContent` nests its
 * languages under `copy` instead of intersecting them (see
 * `src/content/types.ts`); nothing here collides.
 */
export type CastItem = Record<ShippedLocale, string> & {
  /** The glyph a game draws. */
  emoji: string;
};

/**
 * Theme ids in a stable order. `CastTheme` is DERIVED from this, so adding a
 * theme here without adding it to `CAST` is a tsc error rather than a runtime
 * `undefined`.
 */
export const CAST_THEMES = ["animals", "fruit", "vehicles", "toys", "nature", "food"] as const;

export type CastTheme = (typeof CAST_THEMES)[number];

export const CAST: Record<CastTheme, readonly CastItem[]> = {
  animals: [
    { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" },
    { emoji: "🦁", he: "אריה", en: "lion", es: "león" },
    { emoji: "🐸", he: "צפרדע", en: "frog", es: "rana" },
    { emoji: "🐧", he: "פינגווין", en: "penguin", es: "pingüino" },
    { emoji: "🐢", he: "צב", en: "turtle", es: "tortuga" },
    { emoji: "🦋", he: "פרפר", en: "butterfly", es: "mariposa" },
    { emoji: "🐙", he: "תמנון", en: "octopus", es: "pulpo" },
    { emoji: "🦒", he: "ג'ירפה", en: "giraffe", es: "jirafa" },
    { emoji: "🐝", he: "דבורה", en: "bee", es: "abeja" },
    { emoji: "🐬", he: "דולפין", en: "dolphin", es: "delfín" },
  ],
  fruit: [
    { emoji: "🍎", he: "תפוח", en: "apple", es: "manzana" },
    { emoji: "🍌", he: "בננה", en: "banana", es: "plátano" },
    { emoji: "🍇", he: "ענבים", en: "grapes", es: "uvas" },
    { emoji: "🍉", he: "אבטיח", en: "watermelon", es: "sandía" },
    { emoji: "🍓", he: "תות", en: "strawberry", es: "fresa" },
    { emoji: "🍍", he: "אננס", en: "pineapple", es: "piña" },
    { emoji: "🥝", he: "קיווי", en: "kiwi", es: "kiwi" },
    { emoji: "🍒", he: "דובדבן", en: "cherry", es: "cereza" },
    { emoji: "🥥", he: "קוקוס", en: "coconut", es: "coco" },
  ],
  vehicles: [
    { emoji: "🚗", he: "מכונית", en: "car", es: "coche" },
    { emoji: "🚌", he: "אוטובוס", en: "bus", es: "autobús" },
    { emoji: "🚂", he: "רכבת", en: "train", es: "tren" },
    { emoji: "✈️", he: "מטוס", en: "airplane", es: "avión" },
    { emoji: "🚁", he: "מסוק", en: "helicopter", es: "helicóptero" },
    { emoji: "🚲", he: "אופניים", en: "bicycle", es: "bicicleta" },
    { emoji: "🚜", he: "טרקטור", en: "tractor", es: "tractor" },
    { emoji: "🚒", he: "כבאית", en: "fire truck", es: "camión de bomberos" },
    { emoji: "⛵", he: "סירה", en: "sailboat", es: "velero" },
    { emoji: "🚀", he: "חללית", en: "rocket", es: "cohete" },
  ],
  toys: [
    { emoji: "🧸", he: "דובון", en: "teddy bear", es: "osito" },
    { emoji: "⚽", he: "כדור", en: "ball", es: "pelota" },
    { emoji: "🪁", he: "עפיפון", en: "kite", es: "cometa" },
    { emoji: "🎈", he: "בלון", en: "balloon", es: "globo" },
    { emoji: "🪀", he: "יו-יו", en: "yo-yo", es: "yoyó" },
    { emoji: "🧩", he: "פאזל", en: "puzzle", es: "puzle" },
    { emoji: "🪆", he: "בובה", en: "doll", es: "muñeca" },
    { emoji: "🎲", he: "קובייה", en: "dice", es: "dado" },
    { emoji: "🛴", he: "קורקינט", en: "scooter", es: "patinete" },
  ],
  nature: [
    { emoji: "🌳", he: "עץ", en: "tree", es: "árbol" },
    { emoji: "🌻", he: "חמנייה", en: "sunflower", es: "girasol" },
    { emoji: "🍄", he: "פטרייה", en: "mushroom", es: "seta" },
    { emoji: "🌈", he: "קשת", en: "rainbow", es: "arcoíris" },
    { emoji: "⭐", he: "כוכב", en: "star", es: "estrella" },
    { emoji: "🌙", he: "ירח", en: "moon", es: "luna" },
    { emoji: "☁️", he: "ענן", en: "cloud", es: "nube" },
    { emoji: "🌊", he: "גל", en: "wave", es: "ola" },
    { emoji: "🔥", he: "אש", en: "fire", es: "fuego" },
    { emoji: "❄️", he: "שלג", en: "snow", es: "nieve" },
  ],
  food: [
    { emoji: "🍕", he: "פיצה", en: "pizza", es: "pizza" },
    { emoji: "🍔", he: "המבורגר", en: "hamburger", es: "hamburguesa" },
    { emoji: "🍦", he: "גלידה", en: "ice cream", es: "helado" },
    { emoji: "🥨", he: "בייגלה", en: "pretzel", es: "pretzel" },
    { emoji: "🧀", he: "גבינה", en: "cheese", es: "queso" },
    { emoji: "🥕", he: "גזר", en: "carrot", es: "zanahoria" },
    { emoji: "🍿", he: "פופקורן", en: "popcorn", es: "palomitas" },
    { emoji: "🍪", he: "עוגייה", en: "cookie", es: "galleta" },
    { emoji: "🥚", he: "ביצה", en: "egg", es: "huevo" },
    { emoji: "🍟", he: "צ'יפס", en: "fries", es: "patatas fritas" },
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
