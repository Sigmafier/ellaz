import type { Locale } from "./types";

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
      "The Ellaz leaderboards. Every game keeps a record for every difficulty, and you can see where yours stands against everyone else playing: today, this week, this month, or ever.",
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

export const SITE: Record<Locale, SiteCopy> = { he, en };

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
