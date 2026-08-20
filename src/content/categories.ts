/**
 * The words on a CATEGORY page.
 *
 * A category page answers a query a game page cannot. Search Console, read on
 * 2026-08-20, showed "memory games for kids" in the top ten queries reaching
 * this site - a CATEGORY query - against 144 pages of which not one was
 * written to answer it. Every impression it earned landed on a single game's
 * page, which is a page about Memory rather than a page about memory games.
 * `seo-doctrine` SEO16 is the clause: a query already earning impressions that
 * no page is written to answer is the next page to write.
 *
 * SAME SPLIT AS EVERY OTHER PAGE HERE: authors write prose, code supplies
 * facts. Nothing in this file states which games are in a group, how many
 * there are, or what any of them does. The emitter reads that off the roster,
 * so a game moving between categories cannot leave a sentence behind that is
 * quietly wrong. The one number a page may quote is written `{games}` and
 * filled in at render time, exactly as `homeCopy` fills the roster count.
 *
 * ONE ENTRY PER CATEGORY, IN EVERY PAGE LANGUAGE, and both halves of that are
 * types rather than conventions. `Record<PageLocale, ...>` is the same
 * anti-duplicate guarantee `GameContent.copy` carries: promoting a language
 * before its prose exists is a red build. `Record<Category, ...>` is the
 * sibling promise in the other direction - a new category declared in the SDK
 * arrives here or it does not compile, so the home screen can never grow a
 * filter chip whose landing page nobody wrote.
 *
 * Written natively per language, never translated. See
 * `.claude/rules/game-content-template.md` and
 * `.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md`.
 */

import type { Category } from "../sdk/types";
import type { FaqItem, PageLocale } from "./types";

export interface CategoryCopy {
  /** <= 60 chars. Becomes <title> and og:title. */
  metaTitle: string;
  /** 50-160 chars. Becomes the meta description. */
  metaDescription: string;
  h1: string;
  /**
   * The answer, alone, in one sentence. It is the paragraph under the H1 and
   * the og:description, and it is what an answer engine lifts, so it has to
   * survive being read with nothing around it.
   *
   * May contain `{games}` - the number of games in THIS group, filled in by
   * the emitter from the roster. Never type the number.
   */
  lede: string;
  /** The article. Deliberately uneven - `voice.ts` measures the spread. */
  body: string[];
  faq: FaqItem[];
}

/**
 * The smallest group that deserves a page of its own.
 *
 * Not a tuning knob. Below three the page cannot be about a GROUP: at one it
 * is a second copy of that game's own page under a different address, which is
 * the duplicate Google's guidance names, and at two it is a sentence rather
 * than an article. Three is where a list becomes a list.
 *
 * It is applied to the LIVE roster rather than to a hand-kept list of which
 * categories are "ready", so a group crossing the line gets its page - in
 * every language, with its sitemap rows and its share cards - on the next
 * build and with no edit anywhere. `create` holds one game today and is
 * written below regardless: the prose is what would otherwise be missing on
 * the day it qualifies, and writing it now is what stops the page appearing
 * empty later.
 */
export const MIN_GAMES_FOR_A_PAGE = 3;

export type CategoryContent = Record<PageLocale, Record<Category, CategoryCopy>>;

const en: Record<Category, CategoryCopy> = {
  kids: {
    metaTitle: "Games for Young Children - Free, No Ads - Ellaz",
    metaDescription:
      "Browser games a four-year-old can finish alone. Nothing to read, nothing to lose, no account. Colouring, memory, jigsaws and a way home through a maze.",
    h1: "Games for young children",
    lede: "{games} games a four-year-old can play without help, without reading a word, and without ever being told they got it wrong.",
    body: [
      "Every game in this group can be finished by tapping. Some of them let you drag as well, because dragging is satisfying, but not one of them requires it. A hand that is four years old, on a phone, in the back of a car, cannot reliably hold a gesture across a screen, and neither can anyone using a switch or a head pointer.",
      "Nobody loses here. That is deliberate. A wrong tap gives a small shake and the game waits. There is no timer counting down at a child who is still deciding, no lives to run out of, and no screen that says you failed. What a wrong answer costs is a second, and nothing else.",
      "The pictures are ours. Every animal and every scene is original artwork, drawn as SVG so it stays sharp on any screen.",
    ],
    faq: [
      {
        q: "What age are these games for?",
        a: "Roughly three to six. The targets are large, the instructions are pictures and sounds rather than sentences, and a grown-up does not need to sit and read anything out.",
      },
      {
        q: "Do my children need an account?",
        a: "No. There is nothing to sign up for and nothing to install. Coins, stars and the room they decorate are stored on the device itself, so clearing your browser data clears them too.",
      },
      {
        q: "Are there ads?",
        a: "None, on any page. No adverts, no purchases inside the games, and no tracking identity attached to a child.",
      },
    ],
  },
  learn: {
    metaTitle: "Learning Games for Kids - Letters and Numbers - Ellaz",
    metaDescription:
      "Free browser games for first letters, spelling and mental arithmetic, in Hebrew, English, Spanish and French. No account, no ads, works offline.",
    h1: "Learning games",
    lede: "{games} games for the things a child is learning anyway: which letter a word starts with, how to spell it, and what the sum comes to.",
    body: [
      "The rule these follow is that the game shows the answer and offers to say it, rather than asking a child to identify something they can only hear. Nothing here asks that. Speech in a browser is unreliable in a way nothing can detect from the page: a voice can be installed, be selected, report that it has finished, and produce no sound at all. So the letter is always on the screen, with a speaker button beside it for anyone who wants one.",
      "Difficulty is a row of buttons at the top. The game reopens on whichever one you last chose. No settings screen.",
      "The arithmetic game is pinned left-to-right even when the rest of the site is running in Hebrew. Mirroring it changes the sum. An equation is not a sentence, and the layout rule that is right for prose is wrong for arithmetic, which is the kind of thing you only find out by watching a child read one backwards.",
    ],
    faq: [
      {
        q: "Do these teach reading?",
        a: "They practise pieces of it. First letters, letter sounds, and spelling short words. They are not a reading scheme and nothing here claims to replace one.",
      },
      {
        q: "Which languages are the letters in?",
        a: "The alphabet games follow the language the site is set to. The interface speaks eleven languages; the written pages exist in four.",
      },
      {
        q: "Is there a way to make it harder?",
        a: "Yes. Every game in this group has a difficulty row, and the choice is remembered on the device, so it opens where you left it.",
      },
    ],
  },
  think: {
    metaTitle: "Puzzle and Thinking Games - Free Online - Ellaz",
    metaDescription:
      "Memory, matching, sorting and pattern games that run in the browser. Free, no account, and every one of them works offline once the page has loaded.",
    h1: "Thinking games",
    lede: "{games} puzzles about noticing: what changed, what comes next, what goes where, and what was there a second ago.",
    body: [
      "These are quiet games. Nothing chases you. The whole group can be played one-handed on a phone with the sound off, which is most of how anybody actually plays anything.",
      "What they have in common is that the difficulty comes from the board rather than from the clock. A harder level in this group means more to hold in your head at once - a longer sequence to echo back, more colours to separate, a shape that only fits one way round. It never means less time. That distinction matters more than it sounds: a game that gets faster excludes anybody whose hands are slower than their thinking, and several of these were built for exactly those players.",
      "Boards are kept apart. Each game keeps your best result per difficulty, so an easy run is never quietly ranked against an expert one.",
    ],
    faq: [
      {
        q: "Are these good for adults?",
        a: "Some of them. The shape-fitting and matching games go hard enough to be worth an adult's time; the picture-matching ones are aimed lower and will feel gentle.",
      },
      {
        q: "Do they work offline?",
        a: "Yes. Once a game has loaded once it stays on the device, and the whole site is installable as an app from the browser menu.",
      },
      {
        q: "Is progress saved?",
        a: "Your best score for each difficulty is, and so is the board you were part-way through in the games where returning to one makes sense. All of it lives on the device, not on a server.",
      },
    ],
  },
  speed: {
    metaTitle: "Reaction Games - Test Your Reflexes - Ellaz",
    metaDescription:
      "Short reaction and timing games in the browser. Rounds last seconds, nothing needs installing, and there is no account and no advertising.",
    h1: "Reaction games",
    lede: "{games} games about timing, where a round is over in seconds and starting another one is a single tap.",
    body: [
      "These are the only games on the site where the clock is the point. Everywhere else a timer would be unfair. Here it is the whole measurement, so the rounds are deliberately tiny and there is always a way straight back in, because the interesting part of a reaction test is the tenth attempt rather than the first.",
      "Go too early and the round restarts. Nothing is lost. That is the whole penalty.",
      "None of them can be paused. That is not an oversight. Pausing a reflex test pauses the thing being measured, so the honest version of that button is no button at all. The two games on this site that do have one are the ones with a board you can walk away from and come back to, which is a different situation entirely.",
    ],
    faq: [
      {
        q: "How long is a round?",
        a: "Seconds. These are the shortest games here by a wide margin, which is what makes them the ones to open while a kettle boils.",
      },
      {
        q: "Why can I not pause?",
        a: "Because the timer is what the game measures. A pause button on a reaction test is a control that either does nothing or spoils the result.",
      },
      {
        q: "Do they keep a record?",
        a: "Yes, per difficulty. In these games a lower number wins, and the leaderboards know that, so the fastest reaction sits at the top rather than the slowest.",
      },
    ],
  },
  create: {
    metaTitle: "Making Things - Music and Drawing - Ellaz",
    metaDescription:
      "The games here have no score and nothing to win. Play a tune, fill a picture, and keep whatever comes out of it. Free, in the browser, no account.",
    h1: "Making things",
    lede: "Games with nothing to win, where the point is what you are left with at the end.",
    body: [
      "There is no record kept in this group, on purpose. Ranking a child's drawing is the opposite of what this site is for, so the colouring game is the one game on the whole site with no leaderboard entry of any kind, and it never will have one. Every other game here keeps a best result. That one is the exception, and it is written into the rules rather than left to whoever builds the next screen.",
      "What you make stays on the device. Nothing is uploaded. Nothing is reviewed.",
      "The music toy is built on the same five notes every celebration on the site uses. A pentatonic scale has no leading tone in it, which is a technical way of saying that nothing you play on it can sound wrong. Press any keys, in any order. It sounds fine. It comes out as something a four-year-old is pleased with, which is a low bar that a surprising amount of software for children still manages to miss.",
    ],
    faq: [
      {
        q: "Is there a way to save a drawing?",
        a: "It stays in the game on that device and is there when you come back. There is no upload, because nothing on this site sends a child's work anywhere.",
      },
      {
        q: "Why is there no score?",
        a: "Because there is nothing here to be better or worse at. A score would turn a picture into a test.",
      },
    ],
  },
  classics: {
    metaTitle: "Classic Games Online - Free, No Download - Ellaz",
    metaDescription:
      "Sudoku, minesweeper, snake, falling blocks and 2048 in the browser. Free, no download, no account, and every one plays on a phone.",
    h1: "Classic games",
    lede: "{games} games you already know how to play, rebuilt to work properly on a phone and to cost nothing.",
    body: [
      "Nothing here needs explaining. That is the appeal, and it is also the constraint the group is built under. A classic that has been improved is usually a classic that has been ruined, so the rules are the rules, and the work went into the parts a browser normally gets wrong.",
      "Mostly that means the controls. Falling blocks has a row of buttons rather than a swipe, because a swipe that rotates a piece by accident is worse than no swipe. Snake has a four-way pad with a stick in the middle, and the arrows stay ordinary buttons so it can be played by anyone who cannot drag. Minesweeper flags a square with a long press. None of that is standard.",
      "These are the games on the site with no age band attached. A seven-year-old and their grandmother can share a device and both be playing at the top of their difficulty.",
      "Each keeps a separate record per difficulty. An easy board and an expert one are never compared.",
    ],
    faq: [
      {
        q: "Do I need to download anything?",
        a: "No. They run in the browser, and once loaded they keep working with no connection at all.",
      },
      {
        q: "Are these the real rules?",
        a: "Yes. The names and the artwork are ours rather than anyone else's, but the rules are the ones you already know.",
      },
      {
        q: "Can I play on a phone?",
        a: "All of them. The controls were redesigned for touch rather than mapped onto it, which is where most browser versions of these fall down.",
      },
    ],
  },
};

const he: Record<Category, CategoryCopy> = {
  kids: {
    metaTitle: "משחקים לגיל הרך - חינם, בלי פרסומות - Ellaz",
    metaDescription:
      "משחקים שילד בן ארבע מסיים לבד, בלי לקרוא מילה ובלי להפסיד. צביעה, זיכרון, פאזלים ודרך הביתה במבוך. חינם בדפדפן, בלי הרשמה.",
    h1: "משחקים לגיל הרך",
    lede: "{games} משחקים שילד בן ארבע משחק לבד, בלי לקרוא מילה ובלי שאף אחד יגיד לו שטעה.",
    body: [
      "כל משחק בקבוצה הזאת אפשר לסיים בהקשה. בחלק מהם אפשר גם לגרור, כי גרירה זה כיף, אבל אף אחד מהם לא דורש את זה. יד של ילד בן ארבע, על טלפון, במושב האחורי של האוטו, לא תמיד מצליחה להחזיק תנועה רצופה על המסך, וגם לא יד שמשתמשת במתג או במצביע ראש.",
      "כאן לא מפסידים. זאת החלטה. הקשה לא נכונה מזיזה את הציור קצת והמשחק ממשיך לחכות. אין שעון שסופר לאחור לילד שעדיין חושב, אין חיים שנגמרים, ואין מסך שאומר נכשלת. מה שטעות עולה זה שנייה אחת, וזהו.",
      "הציורים שלנו. כל חיה וכל סצנה מצוירות במיוחד, כווקטור, ולכן הן חדות בכל גודל מסך.",
    ],
    faq: [
      {
        q: "לאיזה גיל המשחקים האלה?",
        a: "בערך שלוש עד שש. הכפתורים גדולים, ההסבר הוא תמונה וצליל ולא משפט כתוב, ולא צריך מבוגר שיישב ויקריא.",
      },
      {
        q: "צריך להירשם?",
        a: "לא. אין הרשמה ואין מה להתקין. המטבעות, הכוכבים והחדר נשמרים על המכשיר עצמו, ולכן ניקוי נתוני הדפדפן מוחק אותם יחד עם השאר.",
      },
      {
        q: "יש פרסומות?",
        a: "אין, בשום דף. בלי פרסומות, בלי רכישות בתוך המשחק ובלי זיהוי של הילד לצורכי מעקב.",
      },
    ],
  },
  learn: {
    metaTitle: "משחקי למידה לילדים - אותיות וחשבון - Ellaz",
    metaDescription:
      "משחקים לאות ראשונה, לאיות ולחשבון בראש, בעברית ובאנגלית. חינם בדפדפן, בלי הרשמה, ועובדים גם בלי אינטרנט.",
    h1: "משחקי למידה",
    lede: "{games} משחקים לדברים שילד לומד ממילא: באיזו אות מתחילה מילה, איך כותבים אותה, וכמה יוצא.",
    body: [
      "הכלל שהמשחקים האלה עובדים לפיו הוא שהמשחק מראה את התשובה ומציע להקריא אותה, במקום לבקש מילד לזהות משהו שהוא רק שומע. פה לא מבקשים את זה. דיבור בדפדפן לא אמין בצורה ששום קוד לא יכול לזהות מתוך הדף: קול יכול להיות מותקן, להיבחר, לדווח שסיים, ולא להשמיע כלום. לכן האות תמיד על המסך, ולידה כפתור רמקול למי שרוצה.",
      "רמת הקושי היא שורת כפתורים למעלה. המשחק נפתח ברמה האחרונה שבחרת. אין מסך הגדרות.",
      "משחק החשבון מיושר משמאל לימין גם כשכל שאר האתר בעברית. שיקוף משנה את התרגיל. תרגיל הוא לא משפט, וכלל הפריסה שנכון לטקסט שגוי לחשבון, וזה מהדברים שמגלים רק כשרואים ילד קורא תרגיל הפוך.",
    ],
    faq: [
      {
        q: "המשחקים האלה מלמדים לקרוא?",
        a: "הם מתרגלים חלקים מזה. אות ראשונה, צליל של אות, ואיות של מילים קצרות. זאת לא שיטת קריאה ואנחנו לא טוענים שהיא מחליפה אחת.",
      },
      {
        q: "באילו שפות האותיות?",
        a: "משחקי האותיות הולכים לפי השפה שהאתר מוגדר בה. הממשק מדבר אחת עשרה שפות, והדפים הכתובים קיימים בארבע.",
      },
      {
        q: "אפשר להקשות?",
        a: "כן. לכל משחק בקבוצה יש שורת רמות, והבחירה נשמרת על המכשיר, כך שהמשחק נפתח איפה שעזבת.",
      },
    ],
  },
  think: {
    metaTitle: "משחקי חשיבה וחידות - חינם באינטרנט - Ellaz",
    metaDescription:
      "משחקי זיכרון, התאמה, מיון ורצפים שרצים בדפדפן. חינם, בלי הרשמה, וכולם ממשיכים לעבוד גם בלי חיבור לאינטרנט.",
    h1: "משחקי חשיבה",
    lede: "{games} חידות על שימת לב: מה השתנה, מה בא אחר כך, מה הולך לאן, ומה היה כאן לפני רגע.",
    body: [
      "אלה משחקים שקטים. שום דבר לא רודף. אפשר לשחק בכל הקבוצה ביד אחת, על טלפון, בלי צליל, וכך רוב האנשים באמת משחקים.",
      "המשותף להם הוא שהקושי מגיע מהלוח ולא מהשעון. רמה קשה כאן היא יותר דברים להחזיק בראש בבת אחת: רצף ארוך יותר לחזור עליו, יותר צבעים להפריד ביניהם, צורה שנכנסת רק בכיוון אחד. אף פעם לא פחות זמן. ההבדל הזה חשוב יותר משהוא נשמע, כי משחק שנעשה מהיר יותר מוציא מהמשחק כל מי שהידיים שלו איטיות מהמחשבה שלו, וכמה מהמשחקים האלה נבנו בדיוק בשבילם.",
      "הלוחות מופרדים. כל משחק שומר את התוצאה הכי טובה שלך לכל רמה בנפרד, כך שריצה קלה אף פעם לא מושווית בשקט לריצה קשה.",
    ],
    faq: [
      {
        q: "המשחקים האלה מתאימים למבוגרים?",
        a: "חלקם. משחקי ההתאמה והצורות מגיעים לרמה ששווה את הזמן של מבוגר; אלה שמבוססים על תמונות מכוונים נמוך יותר ויירגישו עדינים.",
      },
      {
        q: "הם עובדים בלי אינטרנט?",
        a: "כן. אחרי טעינה אחת המשחק נשאר על המכשיר, ואת כל האתר אפשר להתקין כאפליקציה מתוך תפריט הדפדפן.",
      },
      {
        q: "ההתקדמות נשמרת?",
        a: "התוצאה הכי טובה בכל רמה נשמרת, וגם הלוח שהיית באמצע שלו במשחקים שבהם יש טעם לחזור אליו. הכול על המכשיר, לא על שרת.",
      },
    ],
  },
  speed: {
    metaTitle: "משחקי תגובה ומהירות - Ellaz",
    metaDescription:
      "משחקי תגובה קצרים בדפדפן. סיבוב נמשך שניות, אין מה להתקין, ואין הרשמה ואין פרסומות.",
    h1: "משחקי תגובה",
    lede: "{games} משחקים על תזמון, שבהם סיבוב נגמר תוך שניות והתחלה של עוד אחד היא הקשה אחת.",
    body: [
      "אלה המשחקים היחידים באתר שבהם השעון הוא כל העניין. בכל מקום אחר שעון היה לא הוגן. כאן הוא כל המדידה, ולכן הסיבובים קצרים בכוונה ותמיד יש דרך מיידית חזרה פנימה, כי החלק המעניין במבחן תגובה הוא הניסיון העשירי ולא הראשון.",
      "מקדימים מדי והסיבוב מתחיל מחדש. לא מאבדים כלום. זה כל העונש.",
      "אי אפשר להשהות אותם. זאת לא שכחה. השהיה של מבחן תגובה משהה את מה שנמדד, ולכן הגרסה הכנה של הכפתור הזה היא בלי כפתור. שני המשחקים באתר שיש להם כפתור כזה הם אלה שיש בהם לוח שאפשר לקום ממנו ולחזור, וזה מצב אחר לגמרי.",
    ],
    faq: [
      {
        q: "כמה זמן נמשך סיבוב?",
        a: "שניות. אלה המשחקים הקצרים באתר בהפרש גדול, ולכן הם אלה שפותחים בזמן שהקומקום רותח.",
      },
      {
        q: "למה אי אפשר להשהות?",
        a: "כי השעון הוא מה שהמשחק מודד. כפתור השהיה במבחן תגובה הוא כפתור שאו לא עושה כלום או הורס את התוצאה.",
      },
      {
        q: "נשמרת תוצאה?",
        a: "כן, לכל רמה בנפרד. במשחקים האלה מספר נמוך יותר מנצח, והטבלאות יודעות את זה, ולכן התגובה המהירה יושבת למעלה ולא האיטית.",
      },
    ],
  },
  create: {
    metaTitle: "ליצור - מוזיקה וציור - Ellaz",
    metaDescription:
      "במשחקים כאן אין ניקוד ואין מה לנצח. לנגן מנגינה, למלא ציור, ולהישאר עם מה שיצא. חינם בדפדפן, בלי הרשמה.",
    h1: "ליצור",
    lede: "משחקים שאין בהם מה לנצח, שבהם העיקר הוא מה שנשאר בסוף.",
    body: [
      "בקבוצה הזאת לא נשמרת תוצאה, בכוונה. לדרג ציור של ילד זה ההפך ממה שהאתר הזה בשביל, ולכן משחק הצביעה הוא המשחק היחיד באתר שאין לו שורה בטבלאות מכל סוג שהוא, ולא תהיה לו. כל משחק אחר כאן שומר תוצאה. הוא היוצא מן הכלל, וזה כתוב בכללים ולא נשאר לשיקול של מי שיבנה את המסך הבא.",
      "מה שיוצא נשאר על המכשיר. שום דבר לא נשלח. שום דבר לא נבדק.",
      "תיבת הנגינה בנויה על אותם חמישה צלילים שכל רגע ניצחון באתר משתמש בהם. בסולם פנטטוני אין רגישה, וזאת דרך טכנית לומר ששום דבר שתנגן בו לא יכול להישמע שגוי. אפשר ללחוץ על כל מקש, בכל סדר. זה יוצא בסדר. יוצא מזה משהו שילד בן ארבע מרוצה ממנו, וזה רף נמוך שכמות מפתיעה של תוכנה לילדים עדיין מפספסת.",
    ],
    faq: [
      {
        q: "אפשר לשמור ציור?",
        a: "הוא נשאר בתוך המשחק על המכשיר הזה ומחכה כשחוזרים. אין העלאה, כי שום דבר באתר הזה לא שולח לשום מקום את מה שילד יצר.",
      },
      {
        q: "למה אין ניקוד?",
        a: "כי אין כאן במה להיות טוב יותר או פחות. ניקוד היה הופך ציור למבחן.",
      },
    ],
  },
  classics: {
    metaTitle: "משחקי קלאסיקה אונליין - חינם, בלי הורדה - Ellaz",
    metaDescription:
      "סודוקו, שולה מוקשים, נחש, קוביות נופלות ו-2048 בדפדפן. חינם, בלי הורדה, בלי הרשמה, וכולם עובדים על טלפון.",
    h1: "משחקי קלאסיקה",
    lede: "{games} משחקים שאתם כבר יודעים לשחק, שנבנו מחדש כדי לעבוד באמת על טלפון ולא לעלות כלום.",
    body: [
      "אין כאן מה להסביר. זה היופי, וזאת גם המגבלה שהקבוצה נבנתה תחתיה. קלאסיקה שעברה שיפור היא בדרך כלל קלאסיקה שנהרסה, ולכן החוקים הם החוקים, והעבודה הושקעה בחלקים שדפדפן בדרך כלל עושה לא נכון.",
      "בעיקר מדובר בשליטה. לקוביות הנופלות יש שורת כפתורים ולא החלקה, כי החלקה שמסובבת חלק בטעות גרועה מלא לאפשר החלקה בכלל. לנחש יש צלב של ארבעה כיוונים עם ג׳ויסטיק באמצע, והחצים נשארו כפתורים רגילים כדי שגם מי שלא יכול לגרור יוכל לשחק. בשולה מוקשים מסמנים משבצת בלחיצה ארוכה. זה לא מובן מאליו.",
      "אלה המשחקים באתר בלי טווח גיל. ילד בן שבע וסבתא שלו יכולים לחלוק מכשיר ושניהם לשחק ברמה הכי גבוהה שלהם.",
      "כל אחד שומר תוצאה נפרדת לכל רמה. לוח קל ולוח מומחה אף פעם לא מושווים.",
    ],
    faq: [
      {
        q: "צריך להוריד משהו?",
        a: "לא. הם רצים בדפדפן, ואחרי טעינה אחת הם ממשיכים לעבוד בלי שום חיבור.",
      },
      {
        q: "אלה החוקים המקוריים?",
        a: "כן. השמות והציורים שלנו ולא של אף אחד אחר, אבל החוקים הם אלה שאתם מכירים.",
      },
      {
        q: "אפשר לשחק בטלפון?",
        a: "בכולם. השליטה תוכננה מחדש למגע ולא הותאמה אליו בדיעבד, וזה המקום שבו רוב הגרסאות בדפדפן נופלות.",
      },
    ],
  },
};

const es: Record<Category, CategoryCopy> = {
  kids: {
    metaTitle: "Juegos para niños pequeños - Gratis, sin anuncios",
    metaDescription:
      "Juegos que un niño de cuatro años termina solo, sin leer nada y sin perder nunca. Colorear, memoria, puzzles y un laberinto. Gratis en el navegador.",
    h1: "Juegos para niños pequeños",
    lede: "{games} juegos que un niño de cuatro años juega sin ayuda, sin leer una palabra y sin que nadie le diga que se ha equivocado.",
    body: [
      "Todos los juegos de este grupo se terminan tocando la pantalla. Algunos permiten arrastrar, porque arrastrar gusta, pero ninguno lo exige. Una mano de cuatro años, en un móvil, en el asiento de atrás del coche, no siempre mantiene un gesto de un lado a otro de la pantalla; tampoco la mano de quien usa un conmutador o un puntero de cabeza.",
      "Aquí no se pierde. Es una decisión. Un toque equivocado mueve el dibujo un poco y el juego sigue esperando. No hay reloj contando hacia atrás mientras un niño se lo piensa, no hay vidas que se acaben, y no hay pantalla que diga que has fallado. Equivocarse cuesta un segundo y nada más.",
      "Los dibujos son nuestros. Cada animal y cada escena están dibujados a mano, en vectores, y por eso se ven nítidos en cualquier pantalla.",
    ],
    faq: [
      {
        q: "¿Para qué edad son estos juegos?",
        a: "De tres a seis años, más o menos. Los botones son grandes, las instrucciones son dibujos y sonidos en lugar de frases, y no hace falta que un adulto se siente a leer nada en voz alta.",
      },
      {
        q: "¿Hay que registrarse?",
        a: "No. No hay registro ni nada que instalar. Las monedas, las estrellas y la habitación se guardan en el propio dispositivo, así que borrar los datos del navegador los borra también.",
      },
      {
        q: "¿Hay anuncios?",
        a: "Ninguno, en ninguna página. Sin publicidad, sin compras dentro del juego y sin ninguna identidad de seguimiento asociada a un niño.",
      },
    ],
  },
  learn: {
    metaTitle: "Juegos para aprender letras y números - Ellaz",
    metaDescription:
      "Juegos de primera letra, deletreo y cálculo mental en el navegador, en español, inglés, hebreo y francés. Gratis, sin registro y funcionan sin conexión.",
    h1: "Juegos para aprender",
    lede: "{games} juegos sobre lo que un niño está aprendiendo de todos modos: por qué letra empieza una palabra, cómo se escribe y cuánto suma.",
    body: [
      "La regla que siguen estos juegos es que el juego enseña la respuesta y ofrece decirla, en lugar de pedirle a un niño que identifique algo que solo puede oír. Aquí eso no se pide. El habla en un navegador falla de una forma que ninguna línea de código detecta desde la página: una voz puede estar instalada, estar seleccionada, avisar de que ha terminado y no sonar. Por eso la letra está siempre en pantalla, con un botón de altavoz al lado para quien lo quiera.",
      "La dificultad es una fila de botones arriba. El juego se abre en la última que elegiste. No hay pantalla de ajustes.",
      "El juego de cálculo va de izquierda a derecha aunque el resto del sitio esté en hebreo. Reflejarlo cambia la cuenta. Una operación no es una frase, y la regla de maquetación que vale para un texto no vale para la aritmética, que es de esas cosas que solo se descubren viendo a un niño leer una suma al revés.",
    ],
    faq: [
      {
        q: "¿Enseñan a leer?",
        a: "Practican partes de ello. Primera letra, sonido de la letra y deletreo de palabras cortas. No son un método de lectura y aquí nadie dice que sustituyan a uno.",
      },
      {
        q: "¿En qué idioma están las letras?",
        a: "Los juegos de alfabeto siguen el idioma en el que esté puesto el sitio. La interfaz habla once idiomas; las páginas escritas existen en cuatro.",
      },
      {
        q: "¿Se puede poner más difícil?",
        a: "Sí. Todos los juegos del grupo tienen una fila de niveles, y la elección se guarda en el dispositivo, así que el juego se abre donde lo dejaste.",
      },
    ],
  },
  think: {
    metaTitle: "Juegos de pensar y puzzles - Gratis online - Ellaz",
    metaDescription:
      "Juegos de memoria, parejas, ordenar y series que funcionan en el navegador. Gratis, sin registro, y todos siguen funcionando sin conexión.",
    h1: "Juegos de pensar",
    lede: "{games} puzzles sobre fijarse: qué ha cambiado, qué viene después, qué va dónde y qué había hace un segundo.",
    body: [
      "Son juegos tranquilos. Nada te persigue. Todo el grupo se juega con una mano, en un móvil y sin sonido, que es como la gente juega de verdad a casi todo.",
      "Lo que tienen en común es que la dificultad viene del tablero y no del reloj. Un nivel difícil aquí significa más cosas que sostener en la cabeza a la vez: una serie más larga que repetir, más colores que separar, una pieza que solo encaja en una posición. Nunca significa menos tiempo. Esa diferencia importa más de lo que parece, porque un juego que se acelera deja fuera a cualquiera cuyas manos vayan más despacio que su cabeza, y varios de estos se hicieron precisamente para esas personas.",
      "Los tableros van por separado. Cada juego guarda tu mejor resultado por nivel, así que una partida fácil nunca se compara en silencio con una difícil.",
    ],
    faq: [
      {
        q: "¿Sirven para adultos?",
        a: "Algunos. Los de encajar piezas y hacer parejas llegan a un nivel que merece el tiempo de un adulto; los de imágenes apuntan más abajo y resultarán suaves.",
      },
      {
        q: "¿Funcionan sin conexión?",
        a: "Sí. Una vez cargado, el juego se queda en el dispositivo, y el sitio entero se instala como aplicación desde el menú del navegador.",
      },
      {
        q: "¿Se guarda el progreso?",
        a: "Tu mejor resultado en cada nivel sí, y también el tablero a medias en los juegos donde volver a uno tiene sentido. Todo en el dispositivo, no en un servidor.",
      },
    ],
  },
  speed: {
    metaTitle: "Juegos de reflejos y reacción - Ellaz",
    metaDescription:
      "Juegos cortos de reacción en el navegador. Una ronda dura segundos, no hay nada que instalar, y no hay registro ni publicidad.",
    h1: "Juegos de reflejos",
    lede: "{games} juegos sobre el momento justo, donde una ronda acaba en segundos y empezar otra es un solo toque.",
    body: [
      "Son los únicos juegos del sitio donde el reloj es el asunto. En cualquier otro sitio un cronómetro sería injusto. Aquí es toda la medida, así que las rondas son diminutas a propósito y siempre hay una vuelta inmediata hacia dentro, porque lo interesante de una prueba de reflejos es el décimo intento y no el primero.",
      "Si te adelantas, la ronda vuelve a empezar. No se pierde nada. Ese es todo el castigo.",
      "No se pueden pausar. No es un olvido. Pausar una prueba de reflejos pausa lo que se está midiendo, así que la versión honesta de ese botón es no ponerlo. Los dos juegos del sitio que sí lo tienen son los que dejan un tablero al que puedes volver, y eso es otra situación completamente distinta.",
    ],
    faq: [
      {
        q: "¿Cuánto dura una ronda?",
        a: "Segundos. Son los juegos más cortos de aquí con diferencia, y por eso son los que se abren mientras hierve el agua.",
      },
      {
        q: "¿Por qué no puedo pausar?",
        a: "Porque el reloj es lo que el juego mide. Un botón de pausa en una prueba de reflejos o no hace nada o estropea el resultado.",
      },
      {
        q: "¿Guardan récord?",
        a: "Sí, uno por nivel. En estos juegos gana el número más bajo, y las tablas lo saben, así que arriba se sienta la reacción rápida y no la lenta.",
      },
    ],
  },
  create: {
    metaTitle: "Crear - Música y dibujo - Ellaz",
    metaDescription:
      "Aquí no hay puntuación ni nada que ganar. Tocar una melodía, rellenar un dibujo, y quedarse con lo que salga. Gratis en el navegador, sin registro.",
    h1: "Crear",
    lede: "Juegos sin nada que ganar, donde lo que importa es con qué te quedas al final.",
    body: [
      "En este grupo no se guarda récord, a propósito. Puntuar el dibujo de un niño es lo contrario de para lo que existe este sitio, así que el juego de colorear es el único de toda la web sin ninguna entrada en las tablas, y nunca la tendrá. Todos los demás juegos guardan un mejor resultado. Ese es la excepción, y está escrita en las reglas en vez de quedar al criterio de quien construya la próxima pantalla.",
      "Lo que haces se queda en el dispositivo. No se sube nada. Nadie lo revisa.",
      "La caja de música está construida sobre las mismas cinco notas que usa cada celebración del sitio. Una escala pentatónica no tiene sensible, que es la forma técnica de decir que nada de lo que toques puede sonar mal. Pulsa las teclas que quieras, en el orden que quieras. Suena bien. Sale algo que deja contento a un niño de cuatro años, que es un listón bajo y que una cantidad sorprendente de software infantil sigue sin alcanzar.",
    ],
    faq: [
      {
        q: "¿Se puede guardar un dibujo?",
        a: "Se queda dentro del juego en ese dispositivo y está ahí cuando vuelves. No hay subida, porque nada de este sitio envía a ningún lado lo que hace un niño.",
      },
      {
        q: "¿Por qué no hay puntuación?",
        a: "Porque aquí no hay nada en lo que ser mejor o peor. Una puntuación convertiría un dibujo en un examen.",
      },
    ],
  },
  classics: {
    metaTitle: "Juegos clásicos online - Gratis, sin descargar",
    metaDescription:
      "Sudoku, buscaminas, snake, bloques que caen y 2048 en el navegador. Gratis, sin descargar, sin registro, y todos se juegan en el móvil.",
    h1: "Juegos clásicos",
    lede: "{games} juegos que ya sabes jugar, rehechos para funcionar de verdad en un móvil y para no costar nada.",
    body: [
      "Aquí no hay nada que explicar. Ese es el atractivo, y también la limitación bajo la que se construyó el grupo. Un clásico mejorado suele ser un clásico estropeado, así que las reglas son las reglas, y el trabajo se fue a las partes que un navegador normalmente hace mal.",
      "Sobre todo, los controles. Los bloques que caen llevan una fila de botones en lugar de deslizar, porque un deslizamiento que gira una pieza sin querer es peor que no tener deslizamiento. Snake lleva una cruz de cuatro direcciones con una palanca en medio, y las flechas siguen siendo botones normales para que pueda jugar quien no puede arrastrar. En buscaminas se marca una casilla con una pulsación larga. Nada de eso es estándar.",
      "Son los juegos del sitio sin franja de edad. Un niño de siete años y su abuela pueden compartir un dispositivo y jugar los dos en su nivel más alto.",
      "Los tableros van aparte. Cada juego guarda un récord por nivel, y un tablero fácil nunca se compara con uno experto.",
    ],
    faq: [
      {
        q: "¿Hay que descargar algo?",
        a: "No. Funcionan en el navegador, y una vez cargados siguen funcionando sin ninguna conexión.",
      },
      {
        q: "¿Son las reglas de siempre?",
        a: "Sí. Los nombres y los dibujos son nuestros y de nadie más, pero las reglas son las que ya conoces.",
      },
      {
        q: "¿Puedo jugar en el móvil?",
        a: "En todos. Los controles se rediseñaron para el táctil en lugar de adaptarse a él después, que es donde fallan casi todas las versiones de navegador de estos juegos.",
      },
    ],
  },
};

const fr: Record<Category, CategoryCopy> = {
  kids: {
    metaTitle: "Jeux pour les tout-petits - Gratuit, sans publicité",
    metaDescription:
      "Des jeux qu'un enfant de quatre ans termine seul, sans rien lire et sans jamais perdre. Coloriage, memory, puzzles et labyrinthe. Gratuit dans le navigateur.",
    h1: "Jeux pour les tout-petits",
    lede: "{games} jeux qu'un enfant de quatre ans mène seul, sans lire un mot et sans que personne lui dise qu'il s'est trompé.",
    body: [
      "Tous les jeux de ce groupe se terminent en touchant l'écran. Certains acceptent aussi le glissement, parce que glisser fait plaisir, mais aucun ne l'impose. Une main de quatre ans, sur un téléphone, à l'arrière d'une voiture, ne tient pas toujours un geste d'un bout à l'autre de l'écran ; celle de quelqu'un qui utilise un contacteur ou un pointeur de tête non plus.",
      "Ici, on ne perd pas. C'est une décision. Une touche à côté fait bouger le dessin un peu et le jeu continue d'attendre. Aucun compte à rebours pendant qu'un enfant réfléchit, aucune vie à épuiser, aucun écran qui annonce un échec. Se tromper coûte une seconde, et rien d'autre.",
      "Les dessins sont les nôtres. Chaque animal et chaque décor sont dessinés à la main, en vectoriel, donc nets sur n'importe quel écran.",
    ],
    faq: [
      {
        q: "À quel âge s'adressent ces jeux ?",
        a: "Trois à six ans, à peu près. Les boutons sont grands, les consignes sont des images et des sons plutôt que des phrases, et aucun adulte n'a besoin de s'asseoir pour lire quoi que ce soit à voix haute.",
      },
      {
        q: "Faut-il créer un compte ?",
        a: "Non. Rien à créer, rien à installer. Les pièces, les étoiles et la chambre sont gardées sur l'appareil lui-même, donc effacer les données du navigateur les efface aussi.",
      },
      {
        q: "Y a-t-il de la publicité ?",
        a: "Aucune, sur aucune page. Pas de publicité, pas d'achat dans les jeux, et aucune identité de suivi attachée à un enfant.",
      },
    ],
  },
  learn: {
    metaTitle: "Jeux pour apprendre les lettres et les nombres",
    metaDescription:
      "Des jeux de première lettre, d'orthographe et de calcul mental dans le navigateur. Gratuit, sans compte, et ça marche même sans connexion.",
    h1: "Jeux pour apprendre",
    lede: "{games} jeux sur ce qu'un enfant apprend de toute façon : par quelle lettre commence un mot, comment il s'écrit, et combien ça fait.",
    body: [
      "La règle que suivent ces jeux, c'est que le jeu montre la réponse et propose de la dire, au lieu de demander à un enfant de reconnaître quelque chose qu'il ne fait qu'entendre. On ne demande pas ça. La synthèse vocale d'un navigateur échoue d'une manière qu'aucune ligne de code ne détecte depuis la page : une voix peut être installée, être sélectionnée, signaler qu'elle a fini, et ne rien produire du tout. La lettre reste donc toujours à l'écran, avec un bouton haut-parleur à côté pour qui en veut un.",
      "La difficulté est une rangée de boutons en haut. Le jeu rouvre sur celle que vous avez choisie la dernière fois. Aucun écran de réglages.",
      "Le jeu de calcul reste de gauche à droite même quand le reste du site tourne en hébreu. Le miroir change l'opération. Un calcul n'est pas une phrase, et la règle de mise en page qui vaut pour un texte ne vaut pas pour l'arithmétique, ce genre de chose qu'on ne découvre qu'en regardant un enfant lire une addition à l'envers.",
    ],
    faq: [
      {
        q: "Est-ce que ça apprend à lire ?",
        a: "Ça en travaille des morceaux. La première lettre, le son d'une lettre, l'orthographe de mots courts. Ce n'est pas une méthode de lecture et personne ici ne prétend qu'elle en remplace une.",
      },
      {
        q: "Dans quelle langue sont les lettres ?",
        a: "Les jeux d'alphabet suivent la langue dans laquelle le site est réglé. L'interface parle onze langues ; les pages rédigées existent en quatre.",
      },
      {
        q: "Peut-on rendre ça plus difficile ?",
        a: "Oui. Chaque jeu du groupe a sa rangée de niveaux, et le choix est gardé sur l'appareil, donc le jeu rouvre là où vous l'aviez laissé.",
      },
    ],
  },
  think: {
    metaTitle: "Jeux de réflexion et casse-tête - Gratuit en ligne",
    metaDescription:
      "Jeux de memory, de paires, de tri et de suites logiques dans le navigateur. Gratuit, sans compte, et tous continuent de marcher hors connexion.",
    h1: "Jeux de réflexion",
    lede: "{games} casse-tête sur l'attention : ce qui a changé, ce qui vient après, ce qui va où, et ce qui était là il y a une seconde.",
    body: [
      "Ce sont des jeux calmes. Rien ne vous poursuit. Tout le groupe se joue d'une main, sur un téléphone, sans le son, ce qui est la façon dont les gens jouent vraiment à presque tout.",
      "Leur point commun, c'est que la difficulté vient du plateau et pas de l'horloge. Un niveau difficile ici veut dire plus de choses à tenir en tête en même temps : une suite plus longue à répéter, plus de couleurs à séparer, une pièce qui n'entre que dans un sens. Jamais moins de temps. La distinction compte plus qu'elle n'en a l'air, parce qu'un jeu qui accélère écarte quiconque a les mains plus lentes que la tête, et plusieurs de ceux-ci ont été faits exactement pour ces joueurs.",
      "Les plateaux restent séparés. Chaque jeu garde votre meilleur résultat par niveau, donc une partie facile n'est jamais comparée en douce à une partie difficile.",
    ],
    faq: [
      {
        q: "Est-ce que c'est bien pour des adultes ?",
        a: "Certains, oui. Ceux d'assemblage et de paires montent assez haut pour mériter le temps d'un adulte ; ceux à base d'images visent plus bas et paraîtront doux.",
      },
      {
        q: "Ça marche sans connexion ?",
        a: "Oui. Une fois chargé, le jeu reste sur l'appareil, et le site entier s'installe comme application depuis le menu du navigateur.",
      },
      {
        q: "La progression est-elle gardée ?",
        a: "Votre meilleur résultat à chaque niveau, oui, ainsi que le plateau commencé dans les jeux où y revenir a du sens. Tout sur l'appareil, pas sur un serveur.",
      },
    ],
  },
  speed: {
    metaTitle: "Jeux de réflexes et de rapidité - Ellaz",
    metaDescription:
      "Des jeux de réaction courts dans le navigateur. Une manche dure quelques secondes, rien à installer, ni compte ni publicité.",
    h1: "Jeux de réflexes",
    lede: "{games} jeux sur le bon moment, où une manche se termine en quelques secondes et où en relancer une tient en une touche.",
    body: [
      "Ce sont les seuls jeux du site où l'horloge est le sujet. Partout ailleurs un chronomètre serait injuste. Ici il est toute la mesure, donc les manches sont minuscules exprès et il y a toujours un retour immédiat, parce que ce qui est intéressant dans un test de réflexes, c'est la dixième tentative et pas la première.",
      "Trop tôt et la manche recommence. Rien n'est perdu. Voilà toute la punition.",
      "Aucun ne se met en pause. Ce n'est pas un oubli. Mettre en pause un test de réflexes met en pause ce qui est mesuré, donc la version honnête de ce bouton, c'est pas de bouton. Les deux jeux du site qui en ont un sont ceux qui laissent un plateau où l'on peut revenir, et c'est une situation tout à fait différente.",
    ],
    faq: [
      {
        q: "Une manche dure combien de temps ?",
        a: "Quelques secondes. Ce sont de loin les jeux les plus courts d'ici, et donc ceux qu'on ouvre pendant que l'eau chauffe.",
      },
      {
        q: "Pourquoi je ne peux pas mettre en pause ?",
        a: "Parce que l'horloge est ce que le jeu mesure. Un bouton pause sur un test de réflexes, ou bien il ne fait rien, ou bien il gâche le résultat.",
      },
      {
        q: "Y a-t-il un record ?",
        a: "Oui, un par niveau. Dans ces jeux le nombre le plus bas gagne, et les classements le savent, donc c'est la réaction rapide qui se retrouve en haut et pas la lente.",
      },
    ],
  },
  create: {
    metaTitle: "Créer - Musique et dessin - Ellaz",
    metaDescription:
      "Ici il n'y a ni score ni rien à gagner. Jouer un air, remplir un dessin, et garder ce qui en sort. Gratuit, dans le navigateur, sans compte.",
    h1: "Créer",
    lede: "Des jeux sans rien à gagner, où ce qui compte est ce qu'il vous reste à la fin.",
    body: [
      "Dans ce groupe aucun record n'est gardé, volontairement. Noter le dessin d'un enfant est le contraire de ce pour quoi ce site existe, donc le coloriage est le seul jeu de tout le site sans la moindre entrée dans les classements, et il n'en aura jamais. Tous les autres gardent un meilleur résultat. Celui-là est l'exception, et c'est écrit dans les règles plutôt que laissé au jugement de qui construira le prochain écran.",
      "Ce que vous faites reste sur l'appareil. Rien n'est envoyé. Rien n'est relu.",
      "La boîte à musique est bâtie sur les cinq mêmes notes que chaque moment de victoire du site. Une gamme pentatonique n'a pas de sensible, ce qui est la façon technique de dire que rien de ce que vous y jouerez ne peut sonner faux. Appuyez sur les touches que vous voulez, dans l'ordre que vous voulez. Ça sonne bien. Il en sort quelque chose dont un enfant de quatre ans est content, ce qui est une barre basse qu'une quantité surprenante de logiciels pour enfants rate encore.",
    ],
    faq: [
      {
        q: "Peut-on garder un dessin ?",
        a: "Il reste dans le jeu, sur cet appareil, et il est là au retour. Aucun envoi, parce que rien sur ce site n'expédie où que ce soit ce qu'un enfant a fait.",
      },
      {
        q: "Pourquoi il n'y a pas de score ?",
        a: "Parce qu'il n'y a rien ici où être meilleur ou moins bon. Un score transformerait un dessin en épreuve.",
      },
    ],
  },
  classics: {
    metaTitle: "Jeux classiques en ligne - Gratuit, sans téléchargement",
    metaDescription:
      "Sudoku, démineur, snake, blocs qui tombent et 2048 dans le navigateur. Gratuit, sans téléchargement, sans compte, et tout se joue au téléphone.",
    h1: "Jeux classiques",
    lede: "{games} jeux que vous savez déjà jouer, refaits pour marcher vraiment sur un téléphone et pour ne rien coûter.",
    body: [
      "Il n'y a rien à expliquer ici. C'est l'attrait, et c'est aussi la contrainte sous laquelle le groupe a été construit. Un classique amélioré est en général un classique abîmé, donc les règles sont les règles, et le travail est allé dans les parties qu'un navigateur rate d'habitude.",
      "Surtout les commandes. Les blocs qui tombent ont une rangée de boutons plutôt qu'un glissement, parce qu'un glissement qui fait pivoter une pièce par erreur est pire que pas de glissement du tout. Snake a une croix à quatre directions avec un manche au milieu, et les flèches restent des boutons ordinaires pour que quelqu'un qui ne peut pas glisser puisse jouer. Au démineur, on marque une case par un appui long. Rien de ça n'est standard.",
      "Ce sont les jeux du site sans tranche d'âge. Un enfant de sept ans et sa grand-mère peuvent partager un appareil et jouer chacun à son plus haut niveau.",
      "Les plateaux restent séparés. Chaque jeu garde un record par niveau, et un plateau facile n'est jamais comparé à un plateau expert.",
    ],
    faq: [
      {
        q: "Faut-il télécharger quelque chose ?",
        a: "Non. Ils tournent dans le navigateur, et une fois chargés ils continuent de marcher sans aucune connexion.",
      },
      {
        q: "Ce sont les vraies règles ?",
        a: "Oui. Les noms et les dessins sont les nôtres et ceux de personne d'autre, mais les règles sont celles que vous connaissez.",
      },
      {
        q: "Puis-je jouer au téléphone ?",
        a: "À tous. Les commandes ont été repensées pour le tactile au lieu d'y être adaptées après coup, et c'est là que presque toutes les versions navigateur de ces jeux échouent.",
      },
    ],
  },
};

/**
 * The two section headings a category page needs and no other page has.
 *
 * Here rather than in `SITE` because they are this page kind's own words, and
 * because one heading per language beats the same heading repeated inside all
 * six `CategoryCopy` entries - six chances to disagree with each other for no
 * gain. `Record<PageLocale, ...>` for the usual reason: a language arrives
 * with its own words or the build refuses it.
 */
export const CATEGORY_CHROME: Record<PageLocale, { games: string; more: string }> = {
  he: { games: "המשחקים", more: "קבוצות נוספות" },
  en: { games: "The games", more: "Other groups" },
  es: { games: "Los juegos", more: "Otros grupos" },
  fr: { games: "Les jeux", more: "Autres groupes" },
};

/**
 * Every category's page copy, in every language that has pages.
 *
 * The double `Record` is the whole guarantee. A new page language reds all six
 * entries here until somebody writes them, and a new category in the SDK reds
 * all four languages - so the home screen can grow neither a chip nor a filter
 * whose landing page does not exist.
 */
export const CATEGORY_CONTENT: CategoryContent = { he, en, es, fr };

/**
 * One category's copy with its one derived number filled in.
 *
 * The same shape and the same reason as `homeCopy`: the size of a group is a
 * FACT, and an author must never type one. It was a word on the home page
 * until 2026-08-11, when the roster reached 22 and the meta description
 * contradicted the `ItemList` on its own document - a word reads as prose to
 * every gate here, so nothing caught it.
 *
 * The caller passes the count rather than importing the roster, which is what
 * keeps `src/content` a leaf the build reads and the app cannot
 * (`no-app-imports.test.ts`).
 */
export function categoryCopy(
  locale: PageLocale,
  category: Category,
  games: number,
): CategoryCopy {
  const copy = CATEGORY_CONTENT[locale][category];
  const fill = (t: string): string => t.replaceAll("{games}", String(games));
  return {
    ...copy,
    metaTitle: fill(copy.metaTitle),
    metaDescription: fill(copy.metaDescription),
    h1: fill(copy.h1),
    lede: fill(copy.lede),
    body: copy.body.map(fill),
    faq: copy.faq.map((f) => ({ q: fill(f.q), a: fill(f.a) })),
  };
}
