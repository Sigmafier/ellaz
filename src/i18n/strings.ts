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
  // Cloud backup. The copy is deliberately plain about what the code is and
  // what it does — this is the one place the app asks something of a grown-up,
  // and pretending it is magic would be how a family loses a room.
  keepProgress: { he: "לשמור את ההתקדמות", en: "Keep your progress" },
  backupHint: {
    he: "רשמו את הקוד על פתק. אם המכשיר יימחק, או שתרצו את החדר גם בטאבלט, הקוד מחזיר הכול.",
    en: "Write this code down. If this device is wiped, or you want your room on another one, this code brings it back.",
  },
  backupOffline: { he: "אין חיבור כרגע", en: "No connection right now" },
  // Shown INSTEAD of the "write this down" hint when the save did not land. A
  // code with nothing behind it restores nothing, and the family would only
  // find that out on the day they needed it.
  backupUnsaved: {
    he: "לא הצלחנו לשמור כרגע. הקוד יעבוד רק אחרי שמירה.",
    en: "We couldn't save just now. The code only works once it saves.",
  },
  backupRetry: { he: "נסו שוב", en: "Try again" },
  haveCode: { he: "יש לי קוד", en: "I have a code" },
  enterCode: { he: "הקלידו את הקוד", en: "Enter the code" },
  lookUp: { he: "חיפוש", en: "Look up" },
  codeNotFound: { he: "לא מצאנו את הקוד הזה", en: "We couldn't find that code" },
  restoreFound: { he: "בקוד הזה:", en: "In this code:" },
  // Both sides, always. The old copy named only what was ARRIVING, so the one
  // thing a parent could actually lose — whatever this device already had —
  // was the one thing the screen never showed them.
  restoreHere: { he: "במכשיר הזה עכשיו:", en: "On this device now:" },
  restoreReplaces: {
    he: "שחזור יחליף את מה שיש במכשיר הזה עכשיו.",
    en: "Restoring replaces what is on this device now.",
  },
  restoreConfirm: { he: "שחזרו", en: "Restore" },
  restoreCancel: { he: "ביטול", en: "Cancel" },
  restoreDone: { he: "שוחזר!", en: "Restored!" },
  restoreUndo: { he: "בטלו את השחזור", en: "Undo the restore" },
  restoreUndone: { he: "הוחזר למה שהיה", en: "Put back the way it was" },
  restoreFailed: { he: "השחזור לא נשמר", en: "The restore didn't save" },
  coinsLabel: { he: "מטבעות", en: "coins" },
  itemsLabel: { he: "פריטים", en: "items" },
  // Personal bests. Counted on the restore screen because they are the half of
  // a transfer that used to vanish without saying anything.
  recordsLabel: { he: "שיאים", en: "records" },
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
