import type { Locale, PageLocale } from "./types";

/**
 * The words that are the same on every page: section headings, the platform
 * facts, the home and world pages, the 404.
 *
 * These are AUTHORED, like the per-game copy, but they are authored once. The
 * per-game files must never restate a platform fact ("free", "no ads", "works
 * offline") in a field of their own - a writer who types it can get it wrong,
 * and one copy of a claim per game is one chance per game to drift. The page
 * renderer reads it from here instead.
 *
 * Build-time only, like everything under `src/content/`.
 */

export const ORIGIN = "https://ellaz.fun";

export interface SiteCopy {
  brand: string;
  tagline: string;
  /** Breadcrumb root. */
  home: string;
  /**
   * The H1 on a game page, with `{title}` standing in for the game's name.
   *
   * A pattern rather than a hardcoded branch, because "what a game page is
   * called" is a decision each language makes for itself. Hebrew says "משחק X"
   * and English says just "X"; a third language may want a word in front, or
   * after, or neither, and none of that should live in the renderer.
   */
  gameHeading: string;
  /** The label on the button that starts the game. */
  play: string;
  playNote: string;
  /**
   * What the poster says before any JavaScript has run. It is the EMITTED
   * state, so it has to be true for someone who never gets any: the game needs
   * a script, the rest of the page does not.
   */
  noScript: string;
  /** What the poster says once the runtime has taken over and is fetching. */
  loading: string;
  /** Shown instead, when the visitor has data saver on and we wait for a tap. */
  dataSaver: string;
  /** The two controls in a game page's header. */
  chrome: { back: string; fullScreen: string };
  /** Section headings on a game page, in render order. */
  headings: {
    howToPlay: string;
    about: string;
    teaches: string;
    tips: string;
    ages: string;
    accessibility: string;
    together: string;
    faq: string;
    related: string;
  };
  /** The platform facts strip. Derived facts, stated once. */
  facts: string[];
  /** Category labels, keyed by the `Category` union in the SDK. */
  categories: Record<string, string>;
  homePage: { title: string; description: string; h1: string; lede: string; body: string[] };
  worldPage: { title: string; description: string; h1: string; lede: string; body: string[] };
  boardsPage: { title: string; description: string; h1: string; lede: string; body: string[] };
  notFound: { title: string; h1: string; body: string; back: string };
  footer: string;
}

const he: SiteCopy = {
  brand: "Ellaz",
  tagline: "משחקים חינם בעברית, ישר בדפדפן",
  home: "בית",
  gameHeading: "משחק {title}",
  play: "לשחק",
  playNote: "נפתח במשחק עצמו. בלי הורדה ובלי הרשמה.",
  noScript: "המשחק דורש JavaScript. שאר העמוד לא.",
  loading: "המשחק נטען מעצמו. אין מה ללחוץ.",
  dataSaver: "חיסכון בנתונים פעיל, אז אנחנו מחכים לאישור ולא מורידים לבד.",
  chrome: { back: "כל המשחקים", fullScreen: "מסך מלא" },
  headings: {
    howToPlay: "איך משחקים?",
    about: "על המשחק",
    teaches: "מה המשחק מלמד?",
    tips: "טיפים",
    ages: "מאיזה גיל מתאים?",
    accessibility: "נגישות",
    together: "לשחק ביחד",
    faq: "שאלות נפוצות",
    related: "משחקים נוספים",
  },
  facts: ["חינם", "בלי פרסומות", "בלי הרשמה", "בלי הורדה", "עובד בלי אינטרנט", "שחקן אחד"],
  categories: {
    kids: "לילדים",
    learn: "לימוד",
    think: "חשיבה",
    speed: "מהירות",
    create: "יצירה",
    classics: "קלאסיים",
  },
  homePage: {
    title: "Ellaz - משחקים חינם בעברית לילדים ולמבוגרים",
    description:
      "{games} משחקים חינמיים בעברית, ישר בדפדפן. בלי הורדה, בלי הרשמה ובלי פרסומות. עובדים על טלפון, טאבלט ומחשב.",
    h1: "משחקים חינם בעברית",
    lede: "כל המשחקים כאן פתוחים מהרגע הראשון, רצים בדפדפן ועובדים גם בלי אינטרנט אחרי ביקור אחד.",
    body: [
      "האתר נבנה סביב שאלה אחת: מה ילד בן ארבע יכול לפתוח לבד. אין קריאה בשום מקום, אין חשבון למלא ואין מסך שמבקש משהו לפני שמשחקים. נוגעים במשחק והוא מתחיל.",
      "יש כאן משחקי זיכרון, חשיבה, מהירות ויצירה, ולצידם כמה קלאסיקות שמבוגר יאהב באותה מידה. כל משחק שומר שיא על המכשיר עצמו, וכל שיא נשמר בנפרד לכל רמה.",
    ],
  },
  worldPage: {
    title: "החדר שלי - Ellaz",
    description:
      "החדר של השחקן ב-Ellaz. מטבעות שנצברו במשחקים קונים רהיטים, בעלי חיים ובגדים, והכל נשמר על המכשיר.",
    h1: "החדר שלי",
    lede: "כל ניצחון במשחק מכניס מטבעות לארנק, והמטבעות האלה קונים דברים לחדר.",
    body: [
      "לחדר יש שמונה מקומות שאפשר למלא: קיר, רצפה, שטיח, צמח, פוסטר, בגד, כובע וחיה. בכל קטגוריה יש פריט אחד חינמי מההתחלה, כך שהחדר שלם עוד לפני שנצבר מטבע אחד.",
      "קנייה היא נגיעה אחת, בלי חלון אישור ובלי בקשת פרטים. פריט שאין מספיק מטבעות בשבילו פשוט מרטט קלות ולא אומר כלום, כי סירוב הוא לא שגיאה.",
      "לכל שחקן יש גם שם: שם תואר וחיה, מתוך רשימה סגורה, עם כפתור שמגריל מחדש. אף ילד לא מקליד שם, ולכן אין כאן שום דבר שצריך לפקח עליו.",
    ],
  },
  boardsPage: {
    title: "השיאים - Ellaz",
    description:
      "לוחות השיאים של Ellaz. כל משחק שומר שיא לכל רמה, ואפשר לראות איפה הוא עומד מול שאר השחקנים: היום, השבוע, החודש ותמיד.",
    h1: "השיאים",
    lede: "השיא שלכם בכל משחק, ולידו המקום שלו מול כל מי שמשחק כאן.",
    body: [
      "כל משחק שומר את התוצאה הטובה ביותר, בנפרד לכל רמת קושי. חלק מהמשחקים סופרים נקודות, חלק סופרים זמן וחלק סופרים מהלכים, ולכל אחד יש לוח משלו. בסודוקו מנצח מי שסיים מהר. בזיכרון מנצח מי שהפך פחות קלפים.",
      "הלוח לא מדרג את כולם, וזה בכוונה. מי שקרוב לראש רואה מקום מדויק, אחריו מופיע אחוזון כל עוד הוא נעים לקריאה, וכל השאר רואים את השיא של עצמם בלי שום מיקום. אף ילד לא יראה כאן שהוא אחרון.",
      "השמות באים מרשימה סגורה: שם תואר וחיה. אף אחד לא מקליד שם, ולכן אין בלוח שום דבר שמזהה ילד.",
      "מה שהלוח לא עושה: הכול נשמר על המכשיר עצמו, אז מחיקה של נתוני הדפדפן מוחקת גם את השיאים. בחדר יש קוד גיבוי, וכדאי לרשום אותו על פתק לפני היום שבו הוא נחוץ.",
    ],
  },
  notFound: {
    title: "הדף לא נמצא - Ellaz",
    h1: "אין כאן כלום",
    body: "הכתובת הזאת לא קיימת. אולי המשחק עבר, ואולי נפלה טעות בהעתקה.",
    back: "חזרה לכל המשחקים",
  },
  footer: "Ellaz - משחקים חינם בעברית ובאנגלית. אין פרסומות, אין הרשמה, ואין איסוף מידע על ילדים.",
};

const en: SiteCopy = {
  brand: "Ellaz",
  tagline: "Free browser games, no download and no account",
  home: "Home",
  gameHeading: "{title}",
  play: "Play",
  playNote: "Opens the game itself. Nothing to download, nothing to sign up for.",
  noScript: "The game needs JavaScript. The rest of this page does not.",
  loading: "The game loads by itself. Nothing to tap.",
  dataSaver: "Data saver is on, so we wait for your tap instead of downloading on our own.",
  chrome: { back: "All games", fullScreen: "Full screen" },
  headings: {
    howToPlay: "How do you play?",
    about: "About this game",
    teaches: "What does it teach?",
    tips: "Tips",
    ages: "What age is it for?",
    accessibility: "Accessibility",
    together: "Playing together",
    faq: "Common questions",
    related: "More games",
  },
  facts: ["Free", "No ads", "No account", "No download", "Works offline", "Single player"],
  categories: {
    kids: "For kids",
    learn: "Learning",
    think: "Thinking",
    speed: "Speed",
    create: "Creative",
    classics: "Classics",
  },
  homePage: {
    title: "Ellaz - free browser games for kids and grown-ups",
    description:
      "{games} free games that run in the browser. No download, no account, no ads. They work on a phone, a tablet and a computer, and offline after one visit.",
    h1: "Free games in your browser",
    lede: "Every game here is open from the first second, runs in the browser, and keeps working with no connection once you have loaded it.",
    body: [
      "The whole site is built around one question: what can a four-year-old open on their own. There is no reading anywhere, no account to fill in, and no screen asking for something before you get to play. You tap a game and it starts.",
      "There are memory games, thinking games, speed games and drawing, plus a handful of classics a grown-up will happily lose an evening to. Each game keeps its record on the device, and each difficulty keeps its own.",
    ],
  },
  worldPage: {
    title: "My room - Ellaz",
    description:
      "The player's room in Ellaz. Coins earned in the games buy furniture, pets and outfits, and everything is stored on the device.",
    h1: "My room",
    lede: "Every win drops coins into the wallet, and those coins buy things for the room.",
    body: [
      "The room has eight slots to fill: wall, floor, rug, plant, poster, outfit, hat and pet. Every category ships one free item, so the room is complete before a single coin has been earned.",
      "Buying is one tap. No confirm dialog, no details to enter. An item you cannot afford yet gives a small shake and says nothing at all, because being told no is not an error.",
      "Every player is called something too: an adjective and an animal, drawn from a fixed list, with a button to reroll. No child types a name, which is why there is nothing here anyone needs to moderate.",
    ],
  },
  boardsPage: {
    title: "Leaderboards - Ellaz",
    description:
      "The Ellaz leaderboards. Every game keeps a record for every difficulty, and you can see where yours stands against everyone else: today, this week, or ever.",
    h1: "Leaderboards",
    lede: "Your own best in every game, and where it sits among everyone else playing.",
    body: [
      "Each game keeps your best result, one for every difficulty. Some games count points, some count seconds, some count moves, and each of those gets a board of its own. In Sudoku the fastest finish wins. In Memory it is whoever turned over the fewest cards.",
      "The board does not rank everybody, and that is deliberate. Near the top you get a place. Below that you get a percentile, for as long as reading one is still a pleasant thing to do. Everybody else sees their own record and nothing about position at all. No child is ever shown as last.",
      "Names come from a fixed list: one adjective, one animal. Nobody types one, so nothing on the board identifies a child.",
      "What it does not do: all of this lives on the device, so clearing your browser data clears the records with it. There is a backup code in the room, and it is worth writing down before the day you need it.",
    ],
  },
  notFound: {
    title: "Page not found - Ellaz",
    h1: "Nothing here",
    body: "That address does not exist. The game may have moved, or a character may have gone missing from the link.",
    back: "Back to all the games",
  },
  footer:
    "Ellaz - free games in Hebrew and English. No ads, no accounts, and nothing collected about a child.",
};

/**
 * Spanish, written rather than translated — see `game-content-template.md`.
 *
 * Two decisions worth stating because they are not obvious from the English.
 * The imperative is TÚ throughout (`toca`, not `toque`): it is what a child is
 * spoken to in across the whole Spanish-speaking world, and `usted` on a page
 * about a four-year-old tapping balloons would read as a bank letter. And the
 * vocabulary avoids the words that split Spain from Latin America wherever
 * there is a neutral one — `computadora`/`ordenador` is dodged with
 * `en el navegador`, `móvil`/`celular` with `teléfono`.
 */
const es: SiteCopy = {
  brand: "Ellaz",
  tagline: "Juegos gratis en el navegador, sin descargar nada",
  home: "Inicio",
  gameHeading: "{title}",
  play: "Jugar",
  playNote: "Abre el juego. No hay que descargar nada ni crear una cuenta.",
  noScript: "El juego necesita JavaScript. El resto de la página, no.",
  loading: "El juego se carga solo. No hay que tocar nada.",
  dataSaver: "Tienes el ahorro de datos activado, así que esperamos a que toques tú.",
  chrome: { back: "Todos los juegos", fullScreen: "Pantalla completa" },
  headings: {
    howToPlay: "¿Cómo se juega?",
    about: "Sobre el juego",
    teaches: "¿Qué enseña?",
    tips: "Consejos",
    ages: "¿Para qué edad es?",
    accessibility: "Accesibilidad",
    together: "Jugar juntos",
    faq: "Preguntas frecuentes",
    related: "Más juegos",
  },
  facts: [
    "Gratis",
    "Sin anuncios",
    "Sin cuenta",
    "Sin descargas",
    "Funciona sin internet",
    "Un jugador",
  ],
  categories: {
    kids: "Para peques",
    learn: "Aprender",
    think: "Pensar",
    speed: "Rapidez",
    create: "Crear",
    classics: "Clásicos",
  },
  homePage: {
    title: "Ellaz - juegos gratis en el navegador para niños y mayores",
    description:
      "{games} juegos gratis en el navegador. Sin descargas, sin cuenta y sin anuncios. Van en teléfono, tablet y ordenador, y sin conexión tras la primera visita.",
    h1: "Juegos gratis en tu navegador",
    lede: "Todos los juegos se abren desde el primer segundo, funcionan en el navegador y siguen funcionando sin conexión una vez que los has cargado.",
    body: [
      "El sitio entero está construido alrededor de una pregunta: qué puede abrir sola una niña de cuatro años. No hay que leer nada, no hay cuenta que rellenar y no hay ninguna pantalla que pida algo antes de dejarte jugar. Tocas un juego y empieza.",
      "Hay juegos de memoria, de pensar, de rapidez y de dibujar, y al lado unos cuantos clásicos con los que un adulto pierde la tarde encantado. Cada juego guarda su récord en el aparato, y cada nivel guarda el suyo por separado.",
    ],
  },
  worldPage: {
    title: "Mi habitación - Ellaz",
    description:
      "La habitación del jugador en Ellaz. Las monedas que se ganan jugando compran muebles, mascotas y ropa, y todo se guarda en el aparato.",
    h1: "Mi habitación",
    lede: "Cada victoria deja monedas en el monedero, y esas monedas compran cosas para la habitación.",
    body: [
      "La habitación tiene ocho sitios que llenar: pared, suelo, alfombra, planta, póster, ropa, gorro y mascota. En cada categoría hay una cosa gratis desde el principio, así que la habitación está completa antes de ganar una sola moneda.",
      "Comprar es un toque. Ni ventana de confirmación, ni datos que rellenar. Una cosa que todavía no puedes pagar tiembla un poco y no dice nada más, porque que te digan que no todavía no es un error.",
      "Cada jugador se llama de alguna manera: un adjetivo y un animal, sacados de una lista cerrada, con un botón para volver a sortearlo. Ningún niño escribe un nombre, y por eso aquí no hay nada que nadie tenga que moderar.",
    ],
  },
  boardsPage: {
    title: "Récords - Ellaz",
    description:
      "Los récords de Ellaz. Cada juego guarda una marca por nivel, y puedes ver dónde queda la tuya frente a todo el mundo: hoy, esta semana, este mes o siempre.",
    h1: "Récords",
    lede: "Tu mejor marca en cada juego, y dónde queda entre las de todos los demás.",
    body: [
      "Cada juego guarda tu mejor resultado, uno por nivel. Unos cuentan puntos, otros cuentan segundos y otros cuentan movimientos, y cada uno tiene su propia tabla. En el sudoku gana quien termina antes. En el memory, quien da la vuelta a menos cartas.",
      "La tabla no coloca a todo el mundo en una lista, y eso es a propósito. Cerca de la cabeza ves tu puesto exacto. Por debajo ves un percentil, mientras leerlo siga siendo agradable. Los demás ven su propia marca y nada sobre su posición. A ningún niño se le enseña que va el último.",
      "Los nombres salen de una lista cerrada: un adjetivo y un animal. Nadie escribe el suyo, así que en la tabla no hay nada que identifique a un niño.",
      "Lo que la tabla no hace: todo esto vive en el aparato, así que borrar los datos del navegador borra también los récords. En la habitación hay un código de copia, y merece la pena apuntarlo antes del día en que haga falta.",
    ],
  },
  notFound: {
    title: "Página no encontrada - Ellaz",
    h1: "Aquí no hay nada",
    body: "Esta dirección no existe. A lo mejor el juego se ha movido, o se ha perdido una letra al copiar el enlace.",
    back: "Volver a todos los juegos",
  },
  footer:
    "Ellaz - juegos gratis en hebreo, inglés y español. Sin anuncios, sin cuentas y sin recoger nada sobre ningún niño.",
};

/**
 * Keyed by `PageLocale` for the same reason `GameContent.copy` is: promoting a
 * language before its shared copy exists must be a red build here too. The
 * per-game prose and the words wrapped around it are one deliverable, and a
 * language that has 23 articles but no section headings is still a page whose
 * body is partly untranslated.
 */
export const SITE: Record<PageLocale, SiteCopy> = { he, en, es };

/**
 * The home copy with its facts filled in.
 *
 * `homePage.description` carries a `{games}` token rather than a number, because
 * the roster size is a FACT and an author must never type one - the same rule
 * that keeps difficulty tiers and record units out of the per-game files.
 *
 * It was a word ("Twenty-one", "עשרים ואחד") until 2026-08-11, when the roster
 * reached 22 and the page shipped a meta description contradicting its own
 * `ItemList` on the same document. A word reads as prose to every gate here, so
 * nothing caught it; a token cannot go stale because nobody maintains it.
 *
 * Digits, not words, on purpose: "22 free games" is what a search result and an
 * answer engine can quote.
 *
 * Callers pass the count rather than importing the roster, so `src/content`
 * keeps its one-way dependency and stays importable by the build alone.
 */
export function homeCopy(locale: Locale, games: number): SiteCopy["homePage"] {
  const fill = (text: string): string => text.replaceAll("{games}", String(games));
  const copy = SITE[locale].homePage;
  return {
    ...copy,
    title: fill(copy.title),
    description: fill(copy.description),
    h1: fill(copy.h1),
    lede: fill(copy.lede),
    body: copy.body.map(fill),
  };
}
