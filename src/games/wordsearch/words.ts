/**
 * Word Search - the words this game is allowed to SHOW, and the letters it is
 * allowed to scatter around them.
 *
 * WHY THIS FILE EXISTS RATHER THAN AN IMPORT.
 *
 * `src/games/lettercross/words.ts` is ENABLE1 behind a blocklist, and its own
 * NOTICE.md draws the line this game sits on the wrong side of:
 *
 *   > The moment anything displays a dictionary word - a hint button, an AI
 *   > opponent's move, a "possible words" panel - that surface must draw from an
 *   > affirmative allowlist, not from this file.
 *
 * A word search is nothing BUT displayed words: the list beside the grid is the
 * puzzle. So the dictionary is out, and this game is deliberately absent from
 * the set of modules `rounds-are-wired.test.ts` allows to import it.
 *
 * `lettercross/puzzleWords.ts` IS an affirmative allowlist and is exactly the
 * right shape - and it is English only. This platform is Hebrew first, and a
 * Hebrew child looking at a grid of Hebrew letters needs Hebrew words. So this
 * is the same discipline, authored again, in three languages:
 *
 * 1. AUTHORED, NEVER DERIVED. Nothing here imports a dictionary and no script
 *    writes this file. A list filtered out of a dictionary is the dictionary,
 *    and inherits every gap in its blocklist.
 * 2. CONCRETE AND PICTURABLE. Every entry is something a five-year-old could
 *    point at. That is also what makes a word findable rather than a vocabulary
 *    test - you scan for a shape you already hold in your head.
 * 3. GROUPED, so it can be audited by reading. Fifteen labelled rows of ordinary
 *    nouns is something a person checks; a flat array of six hundred strings is
 *    not.
 * 4. WRITTEN PER LANGUAGE, NEVER TRANSLATED. The Hebrew row of animals is not
 *    the English row in Hebrew - the two lists hold different animals, because a
 *    word's LENGTH is the whole difficulty here and translation drags one
 *    language's length distribution onto another's.
 *
 * THE SHAPE ON THE GRID. English and Spanish are authored in CAPITALS, which is
 * the form the grid draws, so nothing in `logic.ts` ever has to case-fold. Hebrew
 * has no case and is authored plain, with no nikud.
 *
 * SPANISH IS UNACCENTED ON PURPOSE - LEON, LAPIZ, AVION. That is the ordinary
 * convention for a Spanish word-search grid and it is what keeps the alphabet a
 * flat 26 letters, so a filler letter can never be an accent a word could not
 * carry. `logic.test.ts` pins every word to its language's alphabet, which is
 * what stops an accented one slipping back in.
 *
 * PURE DATA. Imported by the pure `logic.ts`, so no DOM, no React, and one type
 * import.
 */
import type { ShippedLocale } from "@i18n/locales";

/**
 * The pool, per language.
 *
 * `Record<ShippedLocale, ...>` rather than an object literal, so the day a
 * fourth language joins the SHIPPED set this file stops compiling until somebody
 * writes its words - instead of the game quietly dealing English grids to a
 * child reading something else. Same gate `spell/logic.ts` puts on its
 * alphabets.
 */
export const WORD_POOL: Record<ShippedLocale, readonly string[]> = {
  he: [
    // animals
    "כלב", "חתול", "סוס", "פרה", "פיל", "אריה", "דוב", "נמר", "קוף", "עכבר", "ארנב", "ברווז",
    "צפרדע", "ציפור", "חמור", "גמל", "זברה", "תרנגול", "שועל", "כבשה", "עיזים", "צבי", "נחש", "צב",
    // food and drink
    "לחם", "חלב", "גבינה", "תפוח", "בננה", "ענבים", "אגס", "תות", "גזר", "מלפפון", "שוקולד",
    "עוגה", "גלידה", "מים", "מיץ", "אורז", "ביצה", "דבש", "מרק", "סוכר", "אבטיח", "תפוז",
    // the body
    "ראש", "רגל", "אוזן", "עין", "שיער", "ברך", "אצבע", "בטן", "כתף", "מצח", "לשון", "צוואר",
    // around the house
    "כיסא", "שולחן", "מיטה", "דלת", "חלון", "מנורה", "שטיח", "מקרר", "כוס", "צלחת", "מזלג",
    "כפית", "סיר", "מגבת", "סבון", "מברשת", "ארון", "מדף", "מפתח", "שעון", "מראה", "כרית",
    // outside
    "שמש", "ירח", "כוכב", "פרח", "גשם", "שלג", "ענן", "רוח", "הר", "נהר", "יער", "חוף",
    "אבן", "חול", "שדה", "גשר", "כביש", "עלה", "שורש", "זרע", "דשא", "אגם", "סלע",
    // colours
    "אדום", "כחול", "ירוק", "צהוב", "לבן", "שחור", "ורוד", "כתום", "סגול", "חום",
    // clothes
    "חולצה", "נעל", "גרב", "כובע", "מעיל", "שמלה", "צעיף", "כפפה", "מכנס", "חגורה",
    // school and drawing
    "ספר", "עיפרון", "מחברת", "דבק", "נייר", "צבע", "מספר", "אות", "מילה", "שורה", "סרגל",
    // getting about
    "מכונית", "רכבת", "מטוס", "סירה", "משאית", "אופניים", "אוטובוס", "גלגל", "מפרש",
    // music
    "תוף", "חליל", "שיר", "פסנתר", "גיטרה", "ריקוד", "פעמון", "צליל",
    // toys and objects
    "כדור", "בובה", "קוביה", "עפיפון", "חבל", "בלון", "דגל", "מטבע", "סביבון", "נר",
    // weather and how things feel
    "חם", "קר", "רטוב", "יבש", "רך", "חזק", "שקט", "מהיר",
    // people
    "אמא", "אבא", "אחות", "סבתא", "סבא", "חבר", "ילד", "ילדה", "מורה", "רופא", "שכן",
  ],

  en: [
    // animals
    "CAT", "DOG", "BIRD", "FISH", "FROG", "BEAR", "LION", "WOLF", "GOAT", "DUCK", "CRAB",
    "SNAIL", "HORSE", "MOUSE", "SHEEP", "TIGER", "ZEBRA", "WHALE", "PANDA", "RABBIT",
    "MONKEY", "TURTLE", "SPIDER", "BEETLE", "OTTER", "EAGLE", "PUPPY", "CAMEL",
    // food and drink
    "BREAD", "APPLE", "GRAPE", "LEMON", "MELON", "PEACH", "ONION", "HONEY", "JUICE",
    "WATER", "MILK", "RICE", "BEAN", "CORN", "CAKE", "SOUP", "PEAR", "PLUM", "SUGAR",
    "TOAST", "OLIVE", "BERRY", "SALAD",
    // the body
    "HAND", "HEAD", "FOOT", "KNEE", "NOSE", "HAIR", "FACE", "TOOTH", "THUMB", "HEART",
    "BRAIN", "ELBOW", "ANKLE", "WRIST", "FINGER", "SHOULDER",
    // around the house
    "BED", "CUP", "POT", "PAN", "KEY", "RUG", "DOOR", "WALL", "ROOF", "LAMP", "DESK",
    "SOFA", "BOOK", "CHAIR", "TABLE", "SPOON", "PLATE", "CLOCK", "TOWEL", "BRUSH",
    "SHELF", "WINDOW", "GARDEN", "MIRROR", "BASKET", "PILLOW", "BROOM",
    // outside
    "SUN", "SKY", "SEA", "SAND", "LEAF", "TREE", "ROCK", "HILL", "LAKE", "WIND", "RAIN",
    "SNOW", "STAR", "MOON", "CLOUD", "GRASS", "RIVER", "BEACH", "STONE", "STORM",
    "PLANT", "FIELD", "FLOWER", "FOREST", "ISLAND", "VALLEY", "MEADOW",
    // colours
    "RED", "BLUE", "PINK", "GREY", "GREEN", "BLACK", "WHITE", "BROWN", "CREAM",
    // clothes
    "HAT", "CAP", "SOCK", "SHOE", "COAT", "BELT", "SCARF", "GLOVE", "SHIRT", "DRESS",
    "SKIRT", "BOOT", "JACKET",
    // school and drawing
    "PEN", "INK", "MAP", "PAGE", "WORD", "LINE", "RULER", "PAPER", "PENCIL", "CRAYON",
    "NUMBER", "LETTER", "SCHOOL", "LESSON",
    // getting about
    "BUS", "CAR", "VAN", "JET", "SHIP", "BOAT", "BIKE", "ROAD", "TRAIN", "PLANE",
    "TRUCK", "WHEEL", "SAIL", "FERRY",
    // music
    "DRUM", "BELL", "HORN", "SONG", "NOTE", "FLUTE", "PIANO", "VIOLIN", "BANJO", "TUNE",
    // toys and objects
    "TOY", "BALL", "KITE", "GAME", "ROPE", "CARD", "COIN", "FLAG", "DOLL", "BLOCK",
    "PUZZLE", "BUBBLE", "RIBBON", "BUTTON", "CANDLE",
    // weather and how things feel
    "HOT", "DRY", "WET", "ICY", "WARM", "COOL", "WINDY", "SUNNY", "RAINY", "CLOUDY",
    // people
    "BABY", "GIRL", "AUNT", "TWIN", "UNCLE", "SISTER", "COUSIN", "FRIEND", "FATHER",
  ],

  es: [
    // animals
    "GATO", "PERRO", "PATO", "RANA", "OSO", "LEON", "LOBO", "CABRA", "CERDO", "CABALLO",
    "RATON", "OVEJA", "TIGRE", "CEBRA", "BALLENA", "CONEJO", "MONO", "TORTUGA", "PAJARO",
    "CARACOL", "ABEJA", "MOSCA", "PEZ", "AGUILA",
    // food and drink
    "PAN", "LECHE", "QUESO", "MANZANA", "UVA", "PERA", "LIMON", "MELON", "SOPA", "ARROZ",
    "AGUA", "JUGO", "PASTEL", "MIEL", "HUEVO", "CEBOLLA", "MAIZ", "FRESA", "AZUCAR",
    // the body
    "MANO", "CABEZA", "PIE", "RODILLA", "NARIZ", "PELO", "CARA", "DIENTE", "CODO",
    "DEDO", "HOMBRO", "CUELLO", "OREJA", "FRENTE",
    // around the house
    "CAMA", "TAZA", "OLLA", "LLAVE", "PUERTA", "PARED", "TECHO", "LAMPARA", "MESA",
    "SILLA", "LIBRO", "PLATO", "RELOJ", "TOALLA", "CEPILLO", "VENTANA", "ESPEJO",
    "CESTA", "JABON", "CAJON", "ESTANTE",
    // outside
    "SOL", "CIELO", "MAR", "ARENA", "HOJA", "ARBOL", "ROCA", "LAGO", "VIENTO", "LLUVIA",
    "NIEVE", "LUNA", "NUBE", "HIERBA", "RIO", "PLAYA", "PIEDRA", "PLANTA", "CAMPO",
    "FLOR", "BOSQUE", "ISLA", "VALLE", "PUENTE", "MONTE",
    // colours
    "ROJO", "AZUL", "ROSA", "GRIS", "VERDE", "NEGRO", "BLANCO", "MARRON", "CREMA",
    // clothes
    "GORRO", "ZAPATO", "ABRIGO", "BUFANDA", "GUANTE", "CAMISA", "VESTIDO", "FALDA",
    "BOTA", "CALCETIN",
    // school and drawing
    "PLUMA", "MAPA", "PAGINA", "PALABRA", "LINEA", "REGLA", "PAPEL", "LAPIZ", "NUMERO",
    "LETRA", "ESCUELA", "TIZA", "GOMA",
    // getting about
    "COCHE", "BARCO", "BICI", "TREN", "AVION", "CAMION", "RUEDA", "CALLE", "VELA",
    // music
    "TAMBOR", "CAMPANA", "NOTA", "FLAUTA", "PIANO", "GUITARRA", "CANCION", "BAILE",
    // toys and objects
    "PELOTA", "COMETA", "JUEGO", "CUERDA", "CARTA", "MONEDA", "BANDERA", "CAJA",
    "CUBO", "GLOBO", "CINTA", "BOTON", "PUZLE",
    // weather and how things feel
    "FRIO", "SECO", "MOJADO", "SUAVE", "FUERTE", "RAPIDO", "LENTO", "CALOR",
    // people
    "BEBE", "NINA", "TIA", "TIO", "ABUELA", "ABUELO", "AMIGO", "MADRE", "PADRE",
    "HERMANA", "VECINO", "MAESTRA",
  ],
};

/**
 * The letters a FILLER square may hold, per language, weighted by how often the
 * letter turns up in that language.
 *
 * Uniform filler is the tempting version and it is the wrong one twice over. It
 * makes the grid look wrong - a Hebrew square full of ז and ט reads as noise to
 * anybody who reads Hebrew - and it makes the planted words STAND OUT, because a
 * run of common letters is visibly unlike its surroundings. Weighted filler is
 * what turns a word search into a search.
 *
 * HEBREW FINAL FORMS ARE ABSENT HERE AND PRESENT IN THE WORDS, and the split is
 * deliberate: a word really does end in ם or ץ, so the grid must be able to draw
 * one - but a final form in the middle of a row is a shape no Hebrew word could
 * have there, which quietly marks that square as filler. Same reasoning
 * `spell/logic.ts` gives for keeping finals out of its decoy tray.
 *
 * Weights are rough letter frequencies, rounded to whole numbers. They do not
 * need to be exact; they need to be not-uniform.
 */
const WEIGHTS: Record<ShippedLocale, Readonly<Record<string, number>>> = {
  he: {
    א: 8, ב: 5, ג: 2, ד: 3, ה: 9, ו: 10, ז: 1, ח: 3, ט: 2, י: 11, כ: 4,
    ל: 8, מ: 8, נ: 5, ס: 2, ע: 4, פ: 3, צ: 2, ק: 3, ר: 7, ש: 6, ת: 7,
  },
  en: {
    A: 8, B: 2, C: 3, D: 4, E: 12, F: 2, G: 2, H: 6, I: 7, J: 1, K: 1, L: 4, M: 2,
    N: 7, O: 8, P: 2, Q: 1, R: 6, S: 6, T: 9, U: 3, V: 1, W: 2, X: 1, Y: 2, Z: 1,
  },
  es: {
    A: 12, B: 2, C: 4, D: 5, E: 13, F: 1, G: 1, H: 1, I: 6, J: 1, K: 1, L: 6, M: 3,
    N: 7, O: 9, P: 3, Q: 1, R: 7, S: 8, T: 5, U: 4, V: 1, W: 1, X: 1, Y: 1, Z: 1,
  },
};

/** Every letter a word of this language may be written with, finals included. */
export const ALPHABETS: Record<ShippedLocale, ReadonlySet<string>> = {
  he: new Set([...Object.keys(WEIGHTS.he), "ך", "ם", "ן", "ף", "ץ"]),
  en: new Set(Object.keys(WEIGHTS.en)),
  es: new Set(Object.keys(WEIGHTS.es)),
};

/**
 * The weighted bag a filler letter is drawn from, one flat array per language.
 *
 * Built once at module load rather than per square: a grid is up to 144 squares
 * and a re-deal builds several, so rebuilding a 100-entry array each time is
 * work nobody asked for.
 */
export const FILLER_BAG: Record<ShippedLocale, readonly string[]> = {
  he: bagOf("he"),
  en: bagOf("en"),
  es: bagOf("es"),
};

function bagOf(lang: ShippedLocale): string[] {
  const out: string[] = [];
  for (const [letter, weight] of Object.entries(WEIGHTS[lang])) {
    for (let i = 0; i < weight; i++) out.push(letter);
  }
  return out;
}
