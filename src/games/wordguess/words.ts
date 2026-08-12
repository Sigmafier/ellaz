/**
 * The word lists, by length, in both languages.
 *
 * WRITTEN NATURALLY, NORMALISED AT COMPARISON TIME. The Hebrew words here are
 * spelled the way a person spells them, final letters and all - `מלון`, not
 * `מלונ`. `logic.ts` normalises before it compares and finalises before it
 * draws, so this file stays readable by somebody who reads Hebrew and can
 * actually check it. A list stored pre-normalised would be a list nobody can
 * proofread, which for a word game is the whole ballgame.
 *
 * THE LENGTH IS IN LETTERS, AND A FINAL LETTER IS ONE LETTER: `מלון` is four.
 * There is deliberately NO `.filter()` here trimming the lists to size. A
 * filter would quietly drop a miscounted word and leave a shorter list that
 * plays perfectly - the silent failure this repo keeps writing rules about.
 * `logic.test.ts` counts every entry and names the offender instead.
 *
 * NO NIQQUD, and no word that needs it to be read. Hebrew without vowel points
 * is ambiguous by design, and a word a child cannot pronounce from its letters
 * is a word they cannot guess. Everything here is concrete and common: things
 * in a house, animals, colours, food, school.
 *
 * The languages are NOT translations of each other. They are separately
 * chosen against the same criteria, the way the game pages are written twice.
 * A translated list inherits English letter-frequency and plays badly in
 * Hebrew, where ו and י carry vowels and dominate any honest list.
 *
 * NO ACCENTS IN THE SPANISH LIST, and that is a keyboard decision rather than
 * a spelling one. `árbol` and `león` are spelled with them, so putting either
 * in the list means a child must find á on a board that does not offer it -
 * the unwinnable round `logic.test.ts` guards against. Offering five accented
 * vowels instead would grow the keyboard to 32 keys on a phone and ask a
 * five-year-old to distinguish a from á under time pressure. So the list holds
 * only words that are already accent-free, of which Spanish has plenty.
 *
 * Ñ IS A LETTER AND IT STAYS. It is not n with a mark on it - it is its own
 * letter with its own place in the alphabet, and a child learning Spanish is
 * learning exactly that. Dropping it to keep the keyboard at 26 would be
 * teaching them something false to save one key.
 */

export type WordLength = 4 | 5 | 6;

/** Hebrew, spelled naturally. Normalised for comparison by `logic.ts`. */
export const HE: Record<WordLength, readonly string[]> = {
  4: [
    "ילדה", "חתול", "ארנב", "שמים", "אריה", "שמלה", "כדור", "חלון",
    "מיטה", "כיסא", "תפוח", "בננה", "מורה", "שמחה", "סבתא", "מתנה",
    "פרפר", "עצים", "חורף", "אביב", "סתיו", "כוכב", "ציור", "מחשב",
    "רכבת", "מטוס", "עוגה", "פיצה", "כפית", "מזלג", "סכין", "צלחת",
    "מטבח", "גינה", "כיתה", "מגרש", "ריצה", "צחוק", "חיוך", "שינה",
    "בוקר", "לילה", "שבוע", "חודש", "מספר", "אדום", "כחול", "ירוק",
    "צהוב", "שחור", "כתום", "סגול", "ורוד", "כובע", "מעיל", "שעון",
    "מפתח", "מגבת", "סבון", "מראה", "שטיח", "ארון", "בלון", "משחק",
    "בובה", "פאזל", "חידה", "שאלה", "מלון",
  ],
  5: [
    "ציפור", "ילדים", "ספרים", "שולחן", "גלידה", "תלמיד", "מחברת",
    "חברים", "משפחה", "דבורה", "פרחים", "ריקוד", "סיפור", "טלפון",
    "ספינה", "ארוחה", "מסעדה", "בקבוק", "שחייה", "קפיצה", "צבעים",
    "חולצה", "דלתות", "מרפסת", "מקלחת", "מברשת", "תמונה", "כורסה",
    "וילון", "מנורה", "קופסה", "קוביה", "מילים", "תשובה", "שמלות",
    "בננות", "מסיבה", "תרמיל", "כרטיס", "מסלול",
  ],
  6: [
    "מכונית", "שוקולד", "עיפרון", "חלומות", "מוזיקה", "כדורגל",
    "נעליים", "מדרגות", "שיניים", "אותיות", "ספרייה", "תפוזים",
    "מלפפון", "חלונות", "כיסאות", "מטוסים", "פרפרים", "מכתבים",
    "מחברות", "מזוודה", "מחשבים",
  ],
};

/** English. Common, concrete, no proper nouns. */
export const EN: Record<WordLength, readonly string[]> = {
  4: [
    "bird", "cake", "moon", "star", "tree", "fish", "boat", "door",
    "book", "lamp", "rain", "snow", "sand", "leaf", "frog", "bear",
    "wolf", "lion", "goat", "duck", "milk", "rice", "soup", "salt",
    "corn", "pear", "plum", "lime", "desk", "sock", "coat", "ring",
    "gold", "blue", "pink", "gray", "road", "hill", "lake", "cave",
    "wind", "fire", "song", "game", "kite", "ball", "doll", "card",
    "clay", "gift", "note", "word", "line",
  ],
  5: [
    "apple", "grape", "lemon", "peach", "beach", "cloud", "storm",
    "river", "stone", "grass", "plant", "tiger", "zebra", "horse",
    "mouse", "sheep", "whale", "shark", "eagle", "robin", "bread",
    "honey", "sugar", "candy", "pizza", "juice", "water", "table",
    "chair", "clock", "brush", "paint", "chalk", "paper", "green",
    "brown", "black", "white", "light", "night", "dream", "smile",
    "laugh", "dance", "music", "story", "words",
  ],
  6: [
    "banana", "orange", "cherry", "tomato", "carrot", "potato",
    "monkey", "rabbit", "turtle", "parrot", "spider", "flower",
    "garden", "forest", "island", "desert", "planet", "rocket",
    "bridge", "castle", "window", "pillow", "basket", "bottle",
    "pencil", "crayon", "school", "friend", "family", "summer",
    "winter", "spring", "silver", "purple", "yellow", "bright",
    "puzzle",
  ],
};

/** Spanish, accent-free but NOT n-for-ñ. See the header. */
export const ES: Record<WordLength, readonly string[]> = {
  4: [
    "casa", "mesa", "cama", "gato", "pato", "rana", "mono", "lobo",
    "vaca", "toro", "mula", "foca", "puma", "nido", "hoja", "flor",
    "rosa", "pino", "agua", "nube", "mano", "pelo", "dedo", "boca",
    "cara", "ojos", "pies", "cola", "ropa", "bota", "tren", "moto",
    "bici", "remo", "vela", "faro", "mapa", "sopa", "pera", "uvas",
    "piña", "kiwi", "papa", "taza", "vaso", "miel", "nuez", "luna",
    "cine", "azul", "rojo", "gris", "dado", "pala", "sapo", "lima",
    "mora", "higo", "seta", "arco", "alas", "isla", "lago", "nave",
    "olas",
  ],
  5: [
    "perro", "gallo", "pollo", "oveja", "tigre", "koala", "panda",
    "zorro", "burro", "cerdo", "cabra", "pluma", "nieve", "playa",
    "arena", "campo", "monte", "cielo", "calle", "plaza", "banco",
    "silla", "libro", "papel", "regla", "clase", "letra", "color",
    "verde", "negro", "plata", "fresa", "pasta", "arroz", "queso",
    "leche", "torta", "dulce", "fruta", "huevo", "carne", "salsa",
    "barco", "coche", "globo", "nubes", "rueda", "motor", "radio",
    "reloj", "gorro", "falda", "blusa", "botas", "manta",
  ],
  6: [
    "conejo", "iguana", "paloma", "abejas", "gusano", "planta",
    "bosque", "laguna", "arroyo", "piedra", "madera", "hierba",
    "flores", "frutas", "tomate", "cereza", "helado", "dulces",
    "pastel", "comida", "cocina", "puerta", "dibujo", "camisa",
    "zapato", "cohete", "alumno", "sonido", "juegos", "amigos",
    "fiesta", "pelota", "muñeca", "globos", "regalo", "cuento",
    "letras", "ciudad", "pueblo", "camino", "puente", "verano",
    "semana", "minuto", "mañana", "noches",
  ],
};
