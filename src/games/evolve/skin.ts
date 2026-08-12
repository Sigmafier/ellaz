// The creature ladder for "התפתחות" / "Evolution" — 2048's merge engine with a
// growing creature painted on each tile instead of a power of two.
//
// PURE data + one lookup. No DOM, no React, no game rules: the rules live in
// `../n2048/logic.ts` and are reused verbatim.
//
// Type-only imports below are ERASED at compile time, so this module pulls
// nothing into the runtime graph. `TileSkin` is the renderer's contract; we only
// supply the data it asks for.
import type { Locale } from "@i18n/index";
import type { SkinTile, TileSkin } from "../n2048/Game2048";

export interface Rung {
  /** The tile value this creature stands for. Ascending powers of two from 2. */
  value: number;
  glyph: string;
  /** Bilingual name — the tile's aria-label, since a glyph does not read itself. */
  name: Record<Locale, string>;
  bg: string;
}

/**
 * Small creature to big creature, so a five-year-old can narrate the run:
 * an egg hatches into a caterpillar, and eleven merges later there is a dragon.
 *
 * The three win targets each land on a memorable rung on purpose:
 * kids 256 = crocodile, hard 512 = dinosaur, classic 2048 = dragon
 * (`LEVELS` in `../n2048/logic.ts`; pinned by skin.test.ts).
 */
export const LADDER: readonly Rung[] = [
  { value: 2, glyph: "🥚", name: { he: "ביצה", en: "Egg", es: "Huevo" }, bg: "#f3efe2" },
  { value: 4, glyph: "🐛", name: { he: "זחל", en: "Caterpillar", es: "Oruga" }, bg: "#e6f0cf" },
  { value: 8, glyph: "🐝", name: { he: "דבורה", en: "Bee", es: "Abeja" }, bg: "#d8ecab" },
  { value: 16, glyph: "🐸", name: { he: "צפרדע", en: "Frog", es: "Rana" }, bg: "#b9e59d" },
  { value: 32, glyph: "🐢", name: { he: "צב", en: "Turtle", es: "Tortuga" }, bg: "#93dea1" },
  { value: 64, glyph: "🦎", name: { he: "לטאה", en: "Lizard", es: "Lagartija" }, bg: "#6dd5ad" },
  { value: 128, glyph: "🐍", name: { he: "נחש", en: "Snake", es: "Serpiente" }, bg: "#4ac9bf" },
  { value: 256, glyph: "🐊", name: { he: "תנין", en: "Crocodile", es: "Cocodrilo" }, bg: "#37b4ce" },
  { value: 512, glyph: "🦕", name: { he: "דינוזאור", en: "Dinosaur", es: "Dinosaurio" }, bg: "#3e9cd5" },
  { value: 1024, glyph: "🦖", name: { he: "טי-רקס", en: "T-Rex", es: "T-Rex" }, bg: "#5a7ed5" },
  { value: 2048, glyph: "🐉", name: { he: "דרקון", en: "Dragon", es: "Dragón" }, bg: "#795ecf" },
];

/**
 * Value -> creature. TOTAL for every positive value: anything above the top rung
 * clamps to the dragon rather than returning nothing, because a tile with no
 * creature would render blank and a blank tile is a bug a child would meet
 * exactly once, at their best-ever run. Empty cells (0 or less) map to null.
 *
 * Monotonic by construction: the ladder is ascending and we take the last rung
 * whose value is at or below `value`.
 */
export function rungFor(value: number): Rung | null {
  if (value <= 0) return null;
  let found = LADDER[0];
  for (const rung of LADDER) {
    if (rung.value <= value) found = rung;
    else break;
  }
  return found;
}

export const CREATURES: TileSkin = {
  boardBg: "#1f6f6b",
  emptyBg: "rgba(255,255,255,0.16)",
  kids: true,
  tile(value: number): SkinTile | null {
    const rung = rungFor(value);
    return rung ? { glyph: rung.glyph, label: rung.name, bg: rung.bg } : null;
  },
};
