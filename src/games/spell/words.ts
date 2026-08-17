// The picture words this game asks a child to SPELL.
//
// WHY THIS IS NOT `@shared/cast`, and not `letters/words.ts` either.
//
// Both of those lists are chosen for games where a word is only ever SHOWN or
// SAID. This one has to be typed out letter by letter, from a tray of tiles,
// which is a much narrower requirement than it looks:
//
//   - every letter must exist in that language's own tile alphabet, so a word
//     carrying an apostrophe (cast's `ג'ירפה`) or an accent (`león`, `plátano`,
//     `pájaro`, `avión`) is unspellable here - the tray has no key for it. That
//     is not a reason to strip the accent: `arbol` is a MISSPELLING, and a
//     spelling game teaching one would be worse than not carrying the word.
//     So the word is dropped and a clean sibling takes its place - 🌲 `pino`
//     for the tree, 🚂 `tren` for the bus, `ave` for the bird.
//   - a word with a space in it (`ice cream`, `arco iris`) has no tile either.
//   - the three languages are chosen TOGETHER, per picture, so a picture that
//     is clean in two languages and accented in the third does not ship. That
//     is why the list is shorter than the vocabulary would allow.
//
// `words.test.ts`-style assertions live in `logic.test.ts`: every word is
// spellable from its own alphabet, in every language, and no word is shorter
// than `MIN_LETTERS`. A word that breaks either rule fails the build rather
// than reaching a child as a tile they cannot find.
//
// Hebrew carries no nikud and DOES carry final forms (`עץ`, `לחם`), because a
// final form is how the word is really written - see `SPELLING_LETTERS` in
// `logic.ts`, which accepts them as tiles while `ALPHABETS` never offers one as
// a decoy.
//
// Written NATIVELY per language, never translated: `en: "bike"` sits beside
// `es: "bici"`, which is what a Spanish-speaking child calls it, rather than
// the longer dictionary word. Promoting a fourth SHIPPED locale reds this file
// by name, exactly as it reds `cast.ts`.
//
// PURE DATA. Imported by the pure `logic.ts`, so nothing here may import DOM,
// React or anything beyond the type.
import type { CastItem } from "@shared/cast";

export const WORDS: readonly CastItem[] = [
  // Animals
  { emoji: "🐶", he: "כלב", en: "dog", es: "perro" },
  { emoji: "🐱", he: "חתול", en: "cat", es: "gato" },
  { emoji: "🐄", he: "פרה", en: "cow", es: "vaca" },
  { emoji: "🐷", he: "חזיר", en: "pig", es: "cerdo" },
  { emoji: "🐴", he: "סוס", en: "horse", es: "caballo" },
  { emoji: "🐑", he: "כבשה", en: "sheep", es: "oveja" },
  { emoji: "🐔", he: "תרנגולת", en: "hen", es: "gallina" },
  { emoji: "🦆", he: "ברווז", en: "duck", es: "pato" },
  { emoji: "🐦", he: "ציפור", en: "bird", es: "ave" },
  { emoji: "🐟", he: "דג", en: "fish", es: "pez" },
  { emoji: "🐸", he: "צפרדע", en: "frog", es: "rana" },
  { emoji: "🐝", he: "דבורה", en: "bee", es: "abeja" },
  { emoji: "🐘", he: "פיל", en: "elephant", es: "elefante" },
  { emoji: "🐻", he: "דוב", en: "bear", es: "oso" },
  { emoji: "🐒", he: "קוף", en: "monkey", es: "mono" },
  { emoji: "🐢", he: "צב", en: "turtle", es: "tortuga" },
  { emoji: "🦋", he: "פרפר", en: "butterfly", es: "mariposa" },
  { emoji: "🐌", he: "חילזון", en: "snail", es: "caracol" },

  // Food
  { emoji: "🍎", he: "תפוח", en: "apple", es: "manzana" },
  { emoji: "🍌", he: "בננה", en: "banana", es: "banana" },
  { emoji: "🍇", he: "ענבים", en: "grapes", es: "uvas" },
  { emoji: "🍓", he: "תות", en: "berry", es: "fresa" },
  { emoji: "🥕", he: "גזר", en: "carrot", es: "zanahoria" },
  { emoji: "🍅", he: "עגבניה", en: "tomato", es: "tomate" },
  { emoji: "🍞", he: "לחם", en: "bread", es: "pan" },
  { emoji: "🧀", he: "גבינה", en: "cheese", es: "queso" },
  { emoji: "🥚", he: "ביצה", en: "egg", es: "huevo" },
  { emoji: "🥛", he: "חלב", en: "milk", es: "leche" },
  { emoji: "🍰", he: "עוגה", en: "cake", es: "pastel" },
  { emoji: "🍪", he: "עוגיה", en: "cookie", es: "galleta" },
  { emoji: "🍫", he: "שוקולד", en: "chocolate", es: "chocolate" },
  { emoji: "🌰", he: "אגוז", en: "nut", es: "nuez" },

  // Nature and weather
  { emoji: "☀️", he: "שמש", en: "sun", es: "sol" },
  { emoji: "🌙", he: "ירח", en: "moon", es: "luna" },
  { emoji: "⭐", he: "כוכב", en: "star", es: "estrella" },
  { emoji: "🌲", he: "אורן", en: "pine", es: "pino" },
  { emoji: "🌸", he: "פרח", en: "flower", es: "flor" },
  { emoji: "🌻", he: "חמניה", en: "sunflower", es: "girasol" },
  { emoji: "🌊", he: "ים", en: "sea", es: "mar" },
  { emoji: "🌧️", he: "גשם", en: "rain", es: "lluvia" },
  { emoji: "❄️", he: "שלג", en: "snow", es: "nieve" },
  { emoji: "🔥", he: "אש", en: "fire", es: "fuego" },
  { emoji: "🧊", he: "קרח", en: "ice", es: "hielo" },
  { emoji: "💧", he: "טיפה", en: "drop", es: "gota" },
  { emoji: "🌵", he: "קקטוס", en: "cactus", es: "cactus" },

  // Home and things
  { emoji: "🏠", he: "בית", en: "home", es: "casa" },
  { emoji: "🚪", he: "דלת", en: "door", es: "puerta" },
  { emoji: "🪟", he: "חלון", en: "window", es: "ventana" },
  { emoji: "🪑", he: "כיסא", en: "chair", es: "silla" },
  { emoji: "🛏️", he: "מיטה", en: "bed", es: "cama" },
  { emoji: "🔑", he: "מפתח", en: "key", es: "llave" },
  { emoji: "⏰", he: "שעון", en: "clock", es: "reloj" },
  { emoji: "🕯️", he: "נר", en: "candle", es: "vela" },
  { emoji: "🪣", he: "דלי", en: "bucket", es: "cubo" },
  { emoji: "📖", he: "ספר", en: "book", es: "libro" },
  { emoji: "🎩", he: "כובע", en: "hat", es: "sombrero" },
  { emoji: "👟", he: "נעל", en: "shoe", es: "zapato" },

  // Out and about
  { emoji: "🚗", he: "מכונית", en: "car", es: "coche" },
  { emoji: "🚂", he: "רכבת", en: "train", es: "tren" },
  { emoji: "⛵", he: "סירה", en: "boat", es: "barco" },
  { emoji: "🚲", he: "אופניים", en: "bike", es: "bici" },
  { emoji: "⚽", he: "כדור", en: "ball", es: "pelota" },
  { emoji: "🎈", he: "בלון", en: "balloon", es: "globo" },
  { emoji: "🎁", he: "מתנה", en: "gift", es: "regalo" },
  { emoji: "🧸", he: "דובי", en: "teddy", es: "osito" },
  { emoji: "🥁", he: "תוף", en: "drum", es: "tambor" },
  { emoji: "🎸", he: "גיטרה", en: "guitar", es: "guitarra" },
];
