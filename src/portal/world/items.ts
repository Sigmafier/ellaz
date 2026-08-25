import type { Locale } from "@i18n/index";
import type { ExtraArtId } from "./itemsRest";

// The shop catalogue — pure data, no art and no React.
//
// ⚠ ITEM IDS ARE PERSISTED. `profile.owned` stores these strings in the
// player's localStorage forever, so an id here is a permanent contract: never
// rename one, never reuse one for a different thing. Retiring an item means
// dropping the row and never issuing that id again.
//
// Every category carries exactly one `price: 0` default so the room is never
// empty and a player who has earned nothing still sees a complete scene. The
// "none" defaults (rug_none, hat_none, …) are that free default for slots whose
// natural empty state is "nothing there".

/** The tab order in the World screen, and the slot order in the scene. */
export const CATEGORIES = [
  "wall",
  "floor",
  "rug",
  "window",
  "light",
  "plant",
  "poster",
  "toy",
  "outfit",
  "hat",
  "pet",
] as const;

export type ItemCategory = (typeof CATEGORIES)[number];

export interface ShopItem<A extends string = string> {
  /** STABLE FOREVER — it is persisted in profile.owned. Never reuse an id. */
  id: string;
  category: ItemCategory;
  name: Record<Locale, string>;
  /** 0 = the free default for its category (implicitly owned). */
  price: number;
  /** Locked until the player has earned this many lifetime stars. */
  requiresStars?: number;
  /**
   * Locked until the player's LONGEST daily streak has reached this many days.
   *
   * Deliberately the same shape as `requiresStars` — a number that must be
   * reached, checked in one place, absent on everything else — rather than a
   * parallel mechanism. It reads a different counter, and that is the whole
   * difference.
   *
   * IT IS `longest`, NEVER `current`, AND THAT IS NOT A DETAIL. Gating on the
   * running streak would take the shelf away again the first morning a child
   * forgets — an item they could see yesterday, gone today, because they went
   * to a birthday party. This platform has no fail-punishment anywhere and this
   * would have been the first. `longest` is a high-water mark that nothing in
   * `daily.ts` can reduce, so a broken streak costs a child nothing at all.
   *
   * A gated item still costs coins. The streak buys ACCESS, never the item —
   * which is why the shelf cannot inflate anything: it gives the coins already
   * in the wallet somewhere new to go rather than adding more of them.
   */
  requiresStreak?: number;
  art: A;
}

export const ITEMS = [
  // ── room ────────────────────────────────────────────────────────────────
  { id: "wall_plain", category: "wall", price: 0, art: "wall_plain",
    name: { he: "קיר חלק", en: "Plain wall", es: "Pared lisa" } },
  { id: "wall_stripes", category: "wall", price: 25, art: "wall_stripes",
    name: { he: "קיר פסים", en: "Striped wall", es: "Pared de rayas" } },
  { id: "wall_stars", category: "wall", price: 40, art: "wall_stars",
    name: { he: "קיר כוכבים", en: "Starry wall", es: "Pared de estrellas" } },

  { id: "floor_wood", category: "floor", price: 0, art: "floor_wood",
    name: { he: "רצפת עץ", en: "Wood floor", es: "Suelo de madera" } },
  { id: "floor_tiles", category: "floor", price: 25, art: "floor_tiles",
    name: { he: "רצפת אריחים", en: "Tiled floor", es: "Suelo de baldosas" } },

  { id: "rug_none", category: "rug", price: 0, art: "rug_none",
    name: { he: "בלי שטיח", en: "No rug", es: "Sin alfombra" } },
  { id: "rug_round", category: "rug", price: 20, art: "rug_round",
    name: { he: "שטיח עגול", en: "Round rug", es: "Alfombra redonda" } },
  { id: "rug_rainbow", category: "rug", price: 45, art: "rug_rainbow",
    name: { he: "שטיח קשת", en: "Rainbow rug", es: "Alfombra arcoíris" } },

  { id: "plant_none", category: "plant", price: 0, art: "plant_none",
    name: { he: "בלי צמח", en: "No plant", es: "Sin planta" } },
  { id: "plant_cactus", category: "plant", price: 20, art: "plant_cactus",
    name: { he: "קקטוס", en: "Cactus", es: "Cactus" } },
  { id: "plant_palm", category: "plant", price: 35, art: "plant_palm",
    name: { he: "דקל", en: "Palm", es: "Palmera" } },

  { id: "window_none", category: "window", price: 0, art: "window_none",
    name: { he: "בלי חלון", en: "No window", es: "Sin ventana" } },

  { id: "light_none", category: "light", price: 0, art: "light_none",
    name: { he: "בלי מנורה", en: "No light", es: "Sin lámpara" } },

  { id: "toy_none", category: "toy", price: 0, art: "toy_none",
    name: { he: "בלי צעצוע", en: "No toy", es: "Sin juguete" } },

  { id: "poster_none", category: "poster", price: 0, art: "poster_none",
    name: { he: "בלי פוסטר", en: "No poster", es: "Sin póster" } },
  { id: "poster_rocket", category: "poster", price: 30, art: "poster_rocket",
    name: { he: "פוסטר חללית", en: "Rocket poster", es: "Póster de cohete" } },
  { id: "poster_cat", category: "poster", price: 30, art: "poster_cat",
    name: { he: "פוסטר חתול", en: "Cat poster", es: "Póster de gato" } },

  // ── character ───────────────────────────────────────────────────────────
  { id: "outfit_basic", category: "outfit", price: 0, art: "outfit_basic",
    name: { he: "בגד רגיל", en: "Basic outfit", es: "Ropa normal" } },
  { id: "outfit_stripes", category: "outfit", price: 30, art: "outfit_stripes",
    name: { he: "בגד פסים", en: "Striped outfit", es: "Ropa de rayas" } },
  { id: "outfit_space", category: "outfit", price: 60, requiresStars: 5, art: "outfit_space",
    name: { he: "חליפת חלל", en: "Space suit", es: "Traje espacial" } },

  { id: "hat_none", category: "hat", price: 0, art: "hat_none",
    name: { he: "בלי כובע", en: "No hat", es: "Sin gorro" } },
  { id: "hat_cap", category: "hat", price: 25, art: "hat_cap",
    name: { he: "כובע מצחייה", en: "Cap", es: "Gorra" } },
  { id: "hat_crown", category: "hat", price: 70, requiresStars: 10, art: "hat_crown",
    name: { he: "כתר", en: "Crown", es: "Corona" } },

  { id: "pet_none", category: "pet", price: 0, art: "pet_none",
    name: { he: "בלי חיה", en: "No pet", es: "Sin mascota" } },
  { id: "pet_cat", category: "pet", price: 60, art: "pet_cat",
    name: { he: "חתול", en: "Cat", es: "Gato" } },
  { id: "pet_dog", category: "pet", price: 60, art: "pet_dog",
    name: { he: "כלב", en: "Dog", es: "Perro" } },
  { id: "pet_dragon", category: "pet", price: 120, requiresStars: 20, art: "pet_dragon",
    name: { he: "דרקון", en: "Dragon", es: "Dragón" } },
] as const satisfies readonly ShopItem[];

/**
 * THE STREAK SHELF — the three things only coming back day after day unlocks.
 *
 * They are ordinary catalogue rows in every other respect: permanent ids, a
 * coin price, a category that already exists. What they are not is buyable by
 * any other route. There is no star count, no amount of play in one sitting and
 * no number of wins that opens them; the only key is a run of days.
 *
 * PRICED, NOT GIVEN, and that is the answer to the inflation question. The shop
 * is the only coin sink in this app, so the risk of a daily reward was always
 * that it prints currency into a bucket with a fixed bottom. A shelf does the
 * opposite: it deepens the bucket. A child with a fortnight's streak has three
 * new things to want, bought with coins they already had.
 *
 * The rungs match `STREAK_MILESTONES` in `daily.ts` on purpose — day 3, day 7,
 * day 14 — so the day a milestone pays is the day something new appears in the
 * shop. They are two lists rather than one because they answer different
 * questions ("when does a streak pay" versus "what does it open"), and
 * `items.test.ts` pins that the shelf's rungs are real rungs of that ladder.
 *
 * SEPARATE FROM `ITEMS` because it is keyed by its own art-id union and drawn
 * by its own map, `streakArt.tsx`. Both halves ship in the SHELL, so the split
 * costs nothing and buys a per-half `tsc` exhaustiveness check.
 */
export const STREAK_ITEMS = [
  { id: "poster_flame", category: "poster", price: 15, requiresStreak: 3, art: "poster_flame",
    name: { he: "פוסטר להבה", en: "Flame poster", es: "Póster de llama" } },
  { id: "outfit_flame", category: "outfit", price: 45, requiresStreak: 7, art: "outfit_flame",
    name: { he: "בגד להבה", en: "Flame outfit", es: "Ropa de llama" } },
  { id: "pet_firebird", category: "pet", price: 90, requiresStreak: 14, art: "pet_firebird",
    name: { he: "ציפור אש", en: "Firebird", es: "Ave de fuego" } },
] as const satisfies readonly ShopItem[];

/**
 * The set of art keys `art.tsx` draws. Derived from ITEMS, so its
 * `Record<ArtId, …>` turns a missing or misspelled art key into a `tsc` build
 * failure rather than a blank patch of room at runtime.
 *
 * It stays narrow to ITEMS deliberately: widening it would red-build `art.tsx`,
 * which the streak shelf must not do (see `streakArt.tsx`).
 */
export type ArtId = (typeof ITEMS)[number]["art"];

/** The set of art keys `streakArt.tsx` draws, under the same guarantee. */
export type StreakArtId = (typeof STREAK_ITEMS)[number]["art"];

/** Anything the room can draw, from any of the three registries. */
export type AnyArtId = ArtId | StreakArtId | ExtraArtId;

/**
 * The half of the catalogue that ships in the SHELL — everything a returning
 * player can already have equipped, plus every category's free default.
 *
 * The other half is `itemsRest.ts`, and the split is PAYLOAD, not meaning. This
 * module is pinned to the shell because Home draws the child's real room in its
 * world card, so every row here is downloaded by every child before they have
 * chosen a game. Measured on the artifact when the second shelf landed: its 52
 * rows cost 2,448 B gz in here, against 718 B of headroom.
 *
 * `SHOP_ITEMS` over there is the WHOLE catalogue and is what the shop renders.
 * Never iterate this one to answer a question about the shop — it is two thirds
 * short, and a shelf rendered from it looks complete.
 */
export const SHELL_ITEMS: readonly ShopItem<AnyArtId>[] = [...ITEMS, ...STREAK_ITEMS];

export function itemById(id: string): ShopItem<AnyArtId> | undefined {
  return SHELL_ITEMS.find((item) => item.id === id);
}

/**
 * The free item every category is guaranteed to have. `items.test.ts` pins
 * "exactly one price-0 item per category", which is what makes this total.
 */
export function defaultFor(category: ItemCategory): ShopItem<AnyArtId> {
  const found = SHELL_ITEMS.find((item) => item.category === category && item.price === 0);
  if (!found) throw new Error(`no free default for category "${category}"`);
  return found;
}

/**
 * What to draw in a slot. Falls back to the category's free default whenever
 * the equipped id is missing, unknown (an item retired in a later release), or
 * belongs to a different slot — so a stale profile still renders a full room.
 */
export function artFor(category: ItemCategory, equippedId: string | undefined): AnyArtId {
  if (!equippedId) return defaultFor(category).art;
  const known = itemById(equippedId);
  if (known) return known.category === category ? known.art : defaultFor(category).art;

  // Not in the shell half. It is either a row from the LAZY shelf — whose art
  // key IS its id, and whose id begins with its slot — or an item retired in a
  // later release. Guessing costs nothing: a guess that is wrong lands on an
  // art key `roomPiece` has never been handed, and its answer for that is this
  // category's default, which is exactly what a retired id already resolved to.
  //
  // The invariant it leans on (`art === id`, and `id` starts with `category_`)
  // holds for all 82 rows and is pinned by `shop-previews-before-it-buys.test.ts`,
  // so a future row that breaks it is a red build rather than a wall that
  // quietly stops drawing for the one child who bought it.
  return equippedId.startsWith(`${category}_`) ? (equippedId as AnyArtId) : defaultFor(category).art;
}

/**
 * Is this item unlocked for a player with these stars and this longest streak?
 *
 * ONE function, so the shop card, the tap handler and any future screen cannot
 * disagree about what is locked — the same reason `firstBoard()` exists rather
 * than a `game.boards[0]` written inline. Both gates must pass when both are
 * present; today no item carries both, and this is what would keep them honest
 * if one ever did.
 *
 * A free default is never locked, which `items.test.ts` also pins from the
 * other direction: the room has to be complete before a child has earned
 * anything at all.
 */
export function isUnlocked(
  item: Pick<ShopItem, "price" | "requiresStars" | "requiresStreak">,
  earned: { stars: number; longestStreak: number },
): boolean {
  if (item.price === 0) return true;
  if (item.requiresStars !== undefined && earned.stars < item.requiresStars) return false;
  if (item.requiresStreak !== undefined && earned.longestStreak < item.requiresStreak) return false;
  return true;
}
