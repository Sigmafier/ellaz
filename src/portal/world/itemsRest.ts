import { SHELL_ITEMS, type AnyArtId, type ShopItem } from "./items";

// The second shelf's CATALOGUE ROWS — the lazy half of the shop's data.
//
// Carved into the `world-art` chunk beside the drawings it names, and for the
// same measured reason: `items.ts` is pinned to the SHELL, because Home draws
// the child's real room in its world card. These 52 rows cost 2,448 B gz in
// there against 718 B of headroom, so a shelf living in `items.ts` would have
// blown the first-visit ceiling for every child on the site, most of whom
// never open the shop at all.
//
// A row here is a row in every other respect — same type, same permanent ids,
// same gates. What differs is only WHEN it arrives:
//
//   the World screen   imports this module statically, so the shop is whole
//                      the moment the screen renders
//   Home               does not import it. A player wearing something off this
//                      shelf sees their slot's default in the world card until
//                      `loadRoomArtRest()` lands on browser idle — the same
//                      fallback an unknown id has always had
//
// So the room can be briefly INCOMPLETE on the home screen and is never WRONG:
// `artFor` resolves an id the shell does not know by that id's own prefix, and
// `roomPiece` falls back to the slot's default for any drawing it has not been
// handed yet.

/**
 * THE SECOND SHELF — 52 items added on 2026-08-25.
 *
 * Nothing here is a second class of item: same permanent ids, priced in the
 * same coins, gated by the same `isUnlocked`, drawn into the same room. The
 * only thing that makes it a separate list is which chunk it rides in.
 *
 * PRICES. The tiers are deliberate, and they are what "expensive" means here:
 * a level completion pays 3-8 coins and one game session is capped at 40, so
 * roughly 30-60 coins is a good afternoon. 20-45 is one sitting, 50-95 is a
 * couple, 110-200 is a week, and the 250-500 tier is a month of coming back —
 * which is why every item up there is star-gated as well. A price a child can
 * reach in one session gives them nothing to want tomorrow; a price nobody can
 * ever reach is not a price, it is a picture. Both ends are wrong.
 */
export const EXTRA_ITEMS = [
  // ── walls ───────────────────────────────────────────────────────────────
  { id: "wall_dots", category: "wall", price: 25, art: "wall_dots",
    name: { he: "קיר נקודות", en: "Dotty wall", es: "Pared de lunares" } },
  { id: "wall_brick", category: "wall", price: 45, art: "wall_brick",
    name: { he: "קיר לבנים", en: "Brick wall", es: "Pared de ladrillo" } },
  { id: "wall_forest", category: "wall", price: 70, art: "wall_forest",
    name: { he: "קיר יער", en: "Forest wall", es: "Pared de bosque" } },
  { id: "wall_sunset", category: "wall", price: 95, art: "wall_sunset",
    name: { he: "קיר שקיעה", en: "Sunset wall", es: "Pared de atardecer" } },
  { id: "wall_candy", category: "wall", price: 140, art: "wall_candy",
    name: { he: "קיר ממתקים", en: "Candy wall", es: "Pared de caramelos" } },
  { id: "wall_galaxy", category: "wall", price: 280, requiresStars: 18, art: "wall_galaxy",
    name: { he: "קיר גלקסיה", en: "Galaxy wall", es: "Pared de galaxia" } },

  // ── floors ──────────────────────────────────────────────────────────────
  { id: "floor_grass", category: "floor", price: 30, art: "floor_grass",
    name: { he: "רצפת דשא", en: "Grass floor", es: "Suelo de césped" } },
  { id: "floor_checker", category: "floor", price: 45, art: "floor_checker",
    name: { he: "רצפת משבצות", en: "Checker floor", es: "Suelo de cuadros" } },
  { id: "floor_water", category: "floor", price: 110, art: "floor_water",
    name: { he: "רצפת מים", en: "Water floor", es: "Suelo de agua" } },
  { id: "floor_clouds", category: "floor", price: 160, art: "floor_clouds",
    name: { he: "רצפת עננים", en: "Cloud floor", es: "Suelo de nubes" } },
  { id: "floor_lava", category: "floor", price: 300, requiresStars: 22, art: "floor_lava",
    name: { he: "רצפת לבה", en: "Lava floor", es: "Suelo de lava" } },

  // ── rugs ────────────────────────────────────────────────────────────────
  { id: "rug_paw", category: "rug", price: 40, art: "rug_paw",
    name: { he: "שטיח כפות", en: "Paw rug", es: "Alfombra de huellas" } },
  { id: "rug_star", category: "rug", price: 55, art: "rug_star",
    name: { he: "שטיח כוכב", en: "Star rug", es: "Alfombra de estrella" } },
  { id: "rug_zigzag", category: "rug", price: 75, art: "rug_zigzag",
    name: { he: "שטיח זיגזג", en: "Zigzag rug", es: "Alfombra de zigzag" } },
  { id: "rug_galaxy", category: "rug", price: 210, requiresStars: 14, art: "rug_galaxy",
    name: { he: "שטיח גלקסיה", en: "Galaxy rug", es: "Alfombra de galaxia" } },

  // ── windows (a view, upper right of the wall) ────────────────────────────
  { id: "window_day", category: "window", price: 35, art: "window_day",
    name: { he: "חלון יום", en: "Day window", es: "Ventana de día" } },
  { id: "window_night", category: "window", price: 55, art: "window_night",
    name: { he: "חלון לילה", en: "Night window", es: "Ventana de noche" } },
  { id: "window_rain", category: "window", price: 80, art: "window_rain",
    name: { he: "חלון גשם", en: "Rainy window", es: "Ventana de lluvia" } },
  { id: "window_space", category: "window", price: 240, requiresStars: 16, art: "window_space",
    name: { he: "חלון חלל", en: "Space window", es: "Ventana espacial" } },

  // ── lights (hanging from the ceiling, top centre) ────────────────────────
  { id: "light_lamp", category: "light", price: 30, art: "light_lamp",
    name: { he: "מנורה", en: "Lamp", es: "Lámpara" } },
  { id: "light_lantern", category: "light", price: 50, art: "light_lantern",
    name: { he: "פנס נייר", en: "Paper lantern", es: "Farolillo" } },
  { id: "light_fairy", category: "light", price: 85, art: "light_fairy",
    name: { he: "אורות קטנים", en: "Fairy lights", es: "Lucecitas" } },
  { id: "light_disco", category: "light", price: 190, requiresStars: 12, art: "light_disco",
    name: { he: "כדור דיסקו", en: "Disco ball", es: "Bola de discoteca" } },

  // ── plants ──────────────────────────────────────────────────────────────
  { id: "plant_flower", category: "plant", price: 30, art: "plant_flower",
    name: { he: "פרח", en: "Flower", es: "Flor" } },
  { id: "plant_mushroom", category: "plant", price: 60, art: "plant_mushroom",
    name: { he: "פטרייה", en: "Mushroom", es: "Seta" } },
  { id: "plant_bonsai", category: "plant", price: 90, art: "plant_bonsai",
    name: { he: "בונסאי", en: "Bonsai", es: "Bonsái" } },
  { id: "plant_carnivore", category: "plant", price: 180, requiresStars: 10, art: "plant_carnivore",
    name: { he: "צמח טורף", en: "Snapper plant", es: "Planta carnívora" } },

  // ── posters ─────────────────────────────────────────────────────────────
  { id: "poster_music", category: "poster", price: 35, art: "poster_music",
    name: { he: "פוסטר מוזיקה", en: "Music poster", es: "Póster de música" } },
  { id: "poster_dino", category: "poster", price: 45, art: "poster_dino",
    name: { he: "פוסטר דינוזאור", en: "Dino poster", es: "Póster de dinosaurio" } },
  { id: "poster_map", category: "poster", price: 65, art: "poster_map",
    name: { he: "מפת אוצר", en: "Treasure map", es: "Mapa del tesoro" } },
  { id: "poster_medal", category: "poster", price: 150, requiresStars: 8, art: "poster_medal",
    name: { he: "פוסטר מדליה", en: "Medal poster", es: "Póster de medalla" } },

  // ── toys (on the floor, right of the character) ──────────────────────────
  { id: "toy_ball", category: "toy", price: 20, art: "toy_ball",
    name: { he: "כדור", en: "Ball", es: "Pelota" } },
  { id: "toy_blocks", category: "toy", price: 35, art: "toy_blocks",
    name: { he: "קוביות", en: "Blocks", es: "Bloques" } },
  { id: "toy_teddy", category: "toy", price: 60, art: "toy_teddy",
    name: { he: "דובי", en: "Teddy", es: "Osito" } },
  { id: "toy_robot", category: "toy", price: 130, art: "toy_robot",
    name: { he: "רובוט צעצוע", en: "Toy robot", es: "Robot de juguete" } },
  { id: "toy_castle", category: "toy", price: 260, requiresStars: 20, art: "toy_castle",
    name: { he: "טירה", en: "Castle", es: "Castillo" } },

  // ── outfits ─────────────────────────────────────────────────────────────
  { id: "outfit_hoodie", category: "outfit", price: 40, art: "outfit_hoodie",
    name: { he: "קפוצ'ון", en: "Hoodie", es: "Sudadera" } },
  { id: "outfit_dino", category: "outfit", price: 90, art: "outfit_dino",
    name: { he: "בגד דינוזאור", en: "Dino suit", es: "Traje de dinosaurio" } },
  { id: "outfit_knight", category: "outfit", price: 170, requiresStars: 12, art: "outfit_knight",
    name: { he: "שריון אביר", en: "Knight armour", es: "Armadura" } },
  { id: "outfit_wizard", category: "outfit", price: 220, requiresStars: 16, art: "outfit_wizard",
    name: { he: "גלימת קוסם", en: "Wizard robe", es: "Túnica de mago" } },
  { id: "outfit_rainbow", category: "outfit", price: 380, requiresStars: 30, art: "outfit_rainbow",
    name: { he: "בגד קשת", en: "Rainbow suit", es: "Traje arcoíris" } },

  // ── hats ────────────────────────────────────────────────────────────────
  { id: "hat_beanie", category: "hat", price: 25, art: "hat_beanie",
    name: { he: "כובע צמר", en: "Beanie", es: "Gorro de lana" } },
  { id: "hat_party", category: "hat", price: 35, art: "hat_party",
    name: { he: "כובע מסיבה", en: "Party hat", es: "Gorro de fiesta" } },
  { id: "hat_pirate", category: "hat", price: 95, art: "hat_pirate",
    name: { he: "כובע פיראט", en: "Pirate hat", es: "Sombrero pirata" } },
  { id: "hat_wizard", category: "hat", price: 145, requiresStars: 12, art: "hat_wizard",
    name: { he: "כובע קוסם", en: "Wizard hat", es: "Sombrero de mago" } },
  { id: "hat_halo", category: "hat", price: 300, requiresStars: 26, art: "hat_halo",
    name: { he: "הילה", en: "Halo", es: "Aureola" } },

  // ── pets ────────────────────────────────────────────────────────────────
  { id: "pet_bunny", category: "pet", price: 55, art: "pet_bunny",
    name: { he: "ארנב", en: "Bunny", es: "Conejo" } },
  { id: "pet_turtle", category: "pet", price: 65, art: "pet_turtle",
    name: { he: "צב", en: "Turtle", es: "Tortuga" } },
  { id: "pet_penguin", category: "pet", price: 80, art: "pet_penguin",
    name: { he: "פינגווין", en: "Penguin", es: "Pingüino" } },
  { id: "pet_fox", category: "pet", price: 95, art: "pet_fox",
    name: { he: "שועל", en: "Fox", es: "Zorro" } },
  { id: "pet_robot", category: "pet", price: 200, requiresStars: 15, art: "pet_robot",
    name: { he: "רובוט", en: "Robot pet", es: "Robot" } },
  { id: "pet_unicorn", category: "pet", price: 500, requiresStars: 40, art: "pet_unicorn",
    name: { he: "חד-קרן", en: "Unicorn", es: "Unicornio" } },
] as const satisfies readonly ShopItem[];

/** The set of art keys `artRest.tsx` draws — the lazy `world-art` chunk. */
export type ExtraArtId = (typeof EXTRA_ITEMS)[number]["art"];

/**
 * THE WHOLE CATALOGUE, and the only list the shop may render.
 *
 * `SHELL_ITEMS` is deliberately NOT this: it is the half that ships early, and
 * iterating it to answer a question about the shop silently drops 52 items — a
 * shelf that renders perfectly with two thirds of it missing, which is the one
 * failure this split can cause. Anything counting, filtering or listing for a
 * player reads THIS one.
 */
export const SHOP_ITEMS: readonly ShopItem<AnyArtId>[] = [...SHELL_ITEMS, ...EXTRA_ITEMS];

/** Find any item in the whole catalogue — the shop's counterpart to `itemById`. */
export function shopItemById(id: string): ShopItem<AnyArtId> | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}
