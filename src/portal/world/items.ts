import type { Locale } from "@i18n/index";

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
  "plant",
  "poster",
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
 * The set of art keys the room can draw. Derived from ITEMS, so `art.tsx`'s
 * `Record<ArtId, …>` turns a missing or misspelled art key into a `tsc` build
 * failure rather than a blank patch of room at runtime.
 */
export type ArtId = (typeof ITEMS)[number]["art"];

/** The catalogue as a plain array — the const tuple is awkward to iterate. */
export const ALL_ITEMS: readonly ShopItem<ArtId>[] = ITEMS;

export function itemById(id: string): ShopItem<ArtId> | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/**
 * The free item every category is guaranteed to have. `items.test.ts` pins
 * "exactly one price-0 item per category", which is what makes this total.
 */
export function defaultFor(category: ItemCategory): ShopItem<ArtId> {
  const found = ALL_ITEMS.find((item) => item.category === category && item.price === 0);
  if (!found) throw new Error(`no free default for category "${category}"`);
  return found;
}

/**
 * What to draw in a slot. Falls back to the category's free default whenever
 * the equipped id is missing, unknown (an item retired in a later release), or
 * belongs to a different slot — so a stale profile still renders a full room.
 */
export function artFor(category: ItemCategory, equippedId: string | undefined): ArtId {
  const equipped = equippedId ? itemById(equippedId) : undefined;
  const chosen = equipped && equipped.category === category ? equipped : defaultFor(category);
  return chosen.art;
}
