// Ellaz UI strings — Hebrew (default) + English. Games carry their own titles in
// their GameModule.meta; this file is portal-shell chrome only.
export type Locale = "he" | "en";

export const LOCALES: Locale[] = ["he", "en"];

export const DIR: Record<Locale, "rtl" | "ltr"> = { he: "rtl", en: "ltr" };

type Dict = Record<string, Record<Locale, string>>;

export const STRINGS: Dict = {
  appName: { he: "אלז", en: "Ellaz" },
  tagline: { he: "משחקים לכל המשפחה", en: "Games for everyone" },
  play: { he: "שחקו", en: "Play" },
  back: { he: "חזרה", en: "Back" },
  restart: { he: "מהתחלה", en: "Restart" },
  score: { he: "ניקוד", en: "Score" },
  best: { he: "שיא", en: "Best" },
  time: { he: "זמן", en: "Time" },
  youWon: { he: "כל הכבוד!", en: "You win!" },
  gameOver: { he: "המשחק נגמר", en: "Game over" },
  loading: { he: "טוען…", en: "Loading…" },
  sound: { he: "צליל", en: "Sound" },
  language: { he: "שפה", en: "Language" },
  rotateHint: { he: "סובבו את המכשיר", en: "Rotate your device" },
  allGames: { he: "כל המשחקים", en: "All games" },
  // Home-grid section titles, one per `Category` (@sdk). Order lives in
  // CATEGORY_ORDER (portal/Home.tsx); a section with no games is skipped, so a
  // key can land here before the first game of that category does.
  forKids: { he: "לילדים", en: "For kids" },
  // Deliberately broader than "letters & numbers": this section also holds the
  // pre-numeric games (size ordering, counting), which a child plays BEFORE
  // letters or numerals mean anything to them.
  learn: { he: "לומדים", en: "Learning" },
  think: { he: "חשיבה", en: "Thinking" },
  speed: { he: "מהירות", en: "Speed" },
  create: { he: "יצירה", en: "Create" },
  classics: { he: "קלאסי", en: "Classics" },
  // Home filter rail + the keep-playing row.
  allCategories: { he: "הכול", en: "All" },
  keepPlaying: { he: "להמשיך לשחק", en: "Keep playing" },
  enterWorld: { he: "כניסה", en: "Enter" },
  worldInvite: { he: "שחקו כדי להרוויח מטבעות", en: "Play to earn coins" },
  noStarsYet: { he: "עוד לא שיחקתם", en: "Not played yet" },
  starsEarned: { he: "כוכבים", en: "stars" },
  // Hebrew takes the SINGULAR at one, so "1 כוכבים" is simply wrong. Both
  // languages need the distinction and both get it, rather than tolerating a
  // grammar error in the app's own default language.
  starEarnedOne: { he: "כוכב", en: "star" },
  // The two ways opening a game can fail. They are deliberately DIFFERENT
  // messages: a game that is not in the catalog will never load however many
  // times you retry, so offering "try again" there would be a lie. A chunk that
  // failed to fetch usually just needs a reload — the common cause is an open
  // tab meeting a new deploy, which is exactly what reloading fixes.
  gameMissing: { he: "לא מצאנו את המשחק", en: "We couldn't find that game" },
  gameLoadFailed: { he: "המשחק לא נטען", en: "The game didn't load" },
  tryAgain: { he: "נסו שוב", en: "Try again" },
  moves: { he: "מהלכים", en: "Moves" },
  pairs: { he: "זוגות", en: "Pairs" },
  pickColor: { he: "בחרו צבע", en: "Pick a color" },
  installHint: {
    he: "הוסיפו למסך הבית למשחק גם בלי אינטרנט",
    en: "Add to home screen to play offline",
  },

  // World / shop — the progression layer. Coins are spent, stars are a trophy
  // count that is never spent and never lost.
  world: { he: "העולם שלי", en: "My world" },
  shop: { he: "חנות", en: "Shop" },
  // The player's name. Nobody types one — it is picked from a word list, so the
  // button says "another one", not "edit".
  yourName: { he: "השם שלי", en: "My name" },
  newName: { he: "שם אחר", en: "Another name" },
  coins: { he: "מטבעות", en: "Coins" },
  stars: { he: "כוכבים", en: "Stars" },
  owned: { he: "יש לך", en: "Owned" },
  locked: { he: "נעול", en: "Locked" },
  buy: { he: "קנו", en: "Buy" },
  wear: { he: "לבשו", en: "Wear" },
  place: { he: "הניחו", en: "Place" },
  needStars: { he: "צריך כוכבים", en: "Needs stars" },

  // Shop slot categories (one equipped item each; every slot has a free default).
  catHat: { he: "כובע", en: "Hat" },
  catOutfit: { he: "בגדים", en: "Outfit" },
  catPet: { he: "חיית מחמד", en: "Pet" },
  catWall: { he: "קיר", en: "Wall" },
  catFloor: { he: "רצפה", en: "Floor" },
  catRug: { he: "שטיח", en: "Rug" },
  catPlant: { he: "צמח", en: "Plant" },
  catPoster: { he: "פוסטר", en: "Poster" },
};

export function makeT(locale: Locale) {
  return (key: string): string => STRINGS[key]?.[locale] ?? key;
}
