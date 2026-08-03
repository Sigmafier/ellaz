import type { GameContent } from "../types";

/**
 * Pilot #2 - the thinking game, and the one whose record is a TIME.
 *
 * Its statistic is the one measurement that surprised me: only expert hits the
 * uniqueness wall. Every other level carves down to its exact target, so the
 * "aim for N clues" table reads like six knobs when really it is five settings
 * and one genuine constraint. Nothing in the code says that; the generator had
 * to be run to find out. `scripts/sim/sudoku-clues.mjs`.
 */
export const sudoku: GameContent = {
  id: "sudoku",

  he: {
    metaTitle: "סודוקו לילדים ולמבוגרים - חינם בעברית | Ellaz",
    metaDescription:
      "סודוקו חינמי בדפדפן, מלוח חיות 4×4 לילדים ועד 9×9 למומחים. 6 רמות, שעון, ושיא נפרד לכל רמה.",

    lede: "סודוקו חינם בדפדפן, בשש רמות. מתחילים בלוח חיות של 4×4 שילד בן ארבע פותר, ומסיימים ב-9×9 שיעסיק אתכם רבע שעה.",

    body: [
      "החוק אחד, ולא משתנה בין הרמות: בכל שורה, בכל עמודה ובכל תיבה, כל סמל מופיע פעם אחת בדיוק. זה הכול.",

      "מה שכן משתנה זה כמה מהלוח כבר פתור בשבילכם. הרצנו את המחולל שלנו על 60 לוחות בכל רמה וספרנו: בלוח החיות 4×4 מתוך 16 משבצות אתם ממלאים 7. בקל, מתוך 81 משבצות אתם ממלאים 39. במומחה 56. אותו חוק בדיוק, פי שמונה עבודה.",

      "ובמומחה קרה משהו מעניין שלא ידענו מראש. ביקשנו מהמחולל להוריד את מספר הרמזים ל-24, והוא הצליח בממוצע רק ל-24.7, ולפעמים נעצר ב-27. הסיבה היא שהוא מסרב להוריד רמז שיהפוך את הלוח לפתיר בשתי דרכים, ובסביבות 24 רמזים הוא כבר נתקל בקיר הזה. חמש הרמות האחרות מגיעות ליעד שלהן בדיוק, בלי להתאמץ. כלומר מומחה הוא לא סתם עוד דרגה באותה סקאלה, הוא הנקודה שבה הסודוקו עצמו מתחיל להתנגד.",

      "שני הלוחות הקטנים הם עם חיות ולא עם ספרות, ולא בשביל שיהיה חמוד. ילד בן ארבע לא צריך לדעת מה זה 7 כדי לראות שיש כאן שני כלבים באותה שורה. שש חיות שנבדלות בצורה ולא רק בצבע, כך שגם ילד שלא מבחין בצבעים פותר את הלוח.",

      "יש שעון, והוא רץ. זו הרמה היחידה שבה בחרנו למדוד זמן ולא מהלכים, כי בסודוקו אין מהלך מבוזבז: או שאתם יודעים מה נכנס למשבצת או שאתם עוד לא. השיא נשמר בנפרד לכל רמה, כי לוח חיות של 4×4 ולוח מומחה אינם אותו הישג ואי אפשר להשוות ביניהם.",
    ],

    howToPlay: [
      { title: "בוחרים רמה", body: "שתי שורות: חיות 4×4 ו-6×6 למעלה, ואז קל, בינוני, קשה ומומחה." },
      { title: "נוגעים במשבצת ריקה", body: "היא נבחרת. זהו." },
      { title: "בוחרים סמל", body: "חיה או ספרה, לפי הלוח. אפשר להחליף כמה פעמים שרוצים." },
      { title: "בודקים את השורה, העמודה והתיבה", body: "אם הסמל כבר שם, הוא לא יכול להיכנס שוב." },
      { title: "ממלאים הכול", body: "השעון נעצר, ואם שברתם שיא ברמה הזו הוא נשמר." },
    ],

    tips: [
      {
        title: "התחילו מהצפוף",
        body: "חפשו את השורה או התיבה עם הכי הרבה רמזים. שם נשארו הכי מעט אפשרויות, ושם תמצאו את הצעד הוודאי הראשון.",
      },
      {
        title: "אל תנחשו",
        body: "בסודוקו טוב תמיד יש משבצת אחת שאפשר להוכיח. אם אתם לא מוצאים אותה, לא חסר מזל, פשוט לא סרקתם מספיק.",
      },
      {
        title: "סרקו סמל, לא משבצת",
        body: "במקום לשאול מה נכנס למשבצת הזו, קחו סמל אחד ושאלו איפה הוא יכול להיות בתיבה הזו. לרוב התשובה היא מקום אחד.",
      },
      {
        title: "כשנתקעתם, ספרו",
        body: "בכל שורה יש בדיוק את אותם סמלים. תראו מה חסר בשורה, ואז איפה בשורה הוא יכול לשבת.",
      },
    ],

    teaches: [
      { title: "היסק לוגי", body: "כל משבצת נפתרת בשלילה: מה לא יכול להיות שם. זו חשיבה מתמטית בלי מספר אחד." },
      { title: "סריקה שיטתית", body: "מי שקופץ בין משבצות נתקע. מי שסורק בסדר מוצא. הלוח מלמד את זה בעצמו." },
      { title: "סבלנות", body: "אין פה מזל ואין קיצור דרך. יש רק המשבצת הבאה שאפשר להוכיח." },
      { title: "זיהוי דפוסים", body: "אחרי כמה לוחות העין מתחילה לראות תיבה כמעט מלאה מרחוק." },
    ],

    ages: [
      { title: "4 עד 5", body: "לוח החיות 4×4. שש חיות, 16 משבצות, ו-7 למלא. שיא ראשון בחיים לא רע." },
      { title: "6 עד 8", body: "חיות 6×6, ואז קל. פה מתחילים לסרוק במקום לנחש." },
      { title: "9 ומעלה", body: "בינוני וקשה. הלוח כבר לא נפתר בסיבוב אחד סביבו." },
      { title: "מבוגרים", body: "מומחה. 56 משבצות למלא, ואת החוק אתם כבר יודעים." },
    ],

    accessibility:
      "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה. בלוחות הילדים הסמלים הם חיות שנבדלות בצורה ולא רק בצבע, כך שעיוורון צבעים לא פוגע. הלוח מקבל תמיד ריבוע שלם על המסך ולא נמתח, גם בטלפון בלנדסקייפ. אין שום דבר שנעלם אם מחכים, אין ספירה לאחור ואין מסך אדום. השעון הוא מדידה, לא לחץ: אפשר לעצור באמצע, לחשוב דקה ולחזור.",

    together: [
      { title: "מי מוצא ראשון", body: "בחרו סמל אחד וכל אחד מחפש איפה הוא יושב בתיבה שלו. הראשון שמוכיח, מכניס." },
      {
        title: "תסבירו את המהלך",
        body: "לפני שנוגעים, בקשו לשמוע למה. ילד שיודע להגיד למה זו חייבת להיות שלוש הבין את המשחק, גם אם אחר כך יטעה.",
      },
      { title: "בלי שעון", body: "אפשר פשוט להתעלם ממנו. הוא לא נותן ציון ולא נגמר." },
      { title: "מהסוף להתחלה", body: "פתרו לוח יחד, ואז כסו שתי משבצות ותנו לילד להחזיר אותן. פתירה קלה עם אותו רגע גילוי." },
    ],

    faq: [
      {
        q: "מאיזה גיל אפשר לשחק סודוקו?",
        a: "מארבע, בלוח החיות 4×4. אין שם ספרות בכלל, אז ילד שלא מכיר מספרים פותר אותו בלי בעיה.",
      },
      {
        q: "הסודוקו חינמי?",
        a: "כן. אין תשלום ואין רכישות בתוך המשחק. כל 21 המשחקים באתר פתוחים מהרגע הראשון.",
      },
      {
        q: "כמה רמזים יש בכל רמה?",
        a: "ספרנו על 60 לוחות ברמה: 9 בחיות 4×4, 18 בחיות 6×6, 42 בקל, 34 בבינוני, 28 בקשה ובערך 24.7 במומחה. במומחה זה לא בדיוק 24 כי המחולל מסרב לרדת מתחת לנקודה שבה ללוח יש יותר מפתרון אחד.",
      },
      {
        q: "לכל לוח יש פתרון אחד בלבד?",
        a: "כן, תמיד. המחולל בודק את זה על כל רמז שהוא מוריד, ומחזיר אותו אם הלוח היה נהיה דו-משמעי. אף פעם לא תיתקעו בגלל ניחוש.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. זה רץ בדפדפן, בלי הורדה ובלי חשבון.",
      },
      {
        q: "איך השיא נמדד?",
        a: "בזמן הפתרון, כשמהר יותר זה טוב יותר, ובנפרד לכל רמה. לוח חיות ולוח מומחה לא מתחרים זה בזה.",
      },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד הכול נשמר במכשיר, כולל המחולל, אז הלוחות ממשיכים להיווצר גם בלי קליטה.",
      },
      {
        q: "יש פרסומות?",
        a: "אין. לא באנרים ולא סרטונים בין שלבים.",
      },
      {
        q: "מה קורה אם טעיתי?",
        a: "אפשר להחליף סמל במשבצת כמה פעמים שרוצים. אין עונש, אין ניקוד יורד ואף אחד לא סופר לכם טעויות.",
      },
    ],

    keywords: ["סודוקו", "חשיבה", "היגיון", "לוח", "חיות", "מומחה"],
  },

  en: {
    metaTitle: "Free Sudoku - Kids Animal Boards to Expert 9x9 | Ellaz",
    metaDescription:
      "Free sudoku in your browser, from a 4x4 animal board for four-year-olds to expert 9x9. Six levels, a clock, and a record per level.",

    lede: "Free sudoku in the browser, at six levels. It starts with a 4x4 animal board a four-year-old can finish, and ends with a 9x9 that will hold you for a quarter of an hour.",

    body: [
      "One rule, and it never changes between levels. Every row, every column and every box holds each symbol exactly once. That is the whole game.",

      "What changes is how much of the board is already done for you. We ran our generator over 60 boards at each level and counted. On the 4x4 animal board you fill in 7 of 16 squares. On easy you fill 39 of 81. On expert, 56. Same rule. Eight times the work.",

      "Expert then did something we had not expected. We asked the generator to carve down to 24 clues and it managed 24.7 on average, sometimes stopping at 27, because it refuses to remove a clue that would leave the board solvable two different ways. Around 24 clues it starts hitting that wall. The other five levels reach their targets exactly and without effort. So expert is not one more notch on the same scale. It is the point where sudoku itself starts pushing back.",

      "The two small boards use animals rather than digits. Not for cuteness. A four-year-old does not need to know what a 7 is to see that there are two dogs in the same row. Six animals that differ by shape and not only colour, so a child who cannot separate colours still solves the board.",

      "There is a clock and it runs. This is the one game where we chose to measure time instead of moves, because sudoku has no wasted move: either you can prove what goes in a square or you cannot yet. The record is kept per level, because a 4x4 animal board and an expert grid are not the same achievement and there is nothing to gain from comparing them.",
    ],

    howToPlay: [
      { title: "Pick a level", body: "Two rows: animals 4x4 and 6x6 on top, then easy, medium, hard and expert." },
      { title: "Touch an empty square", body: "It gets selected. That is it." },
      { title: "Pick a symbol", body: "An animal or a digit, depending on the board. Change it as often as you like." },
      { title: "Check the row, column and box", body: "If that symbol is already in any of them, it cannot go in again." },
      { title: "Fill the board", body: "The clock stops, and a record for that level is saved if you beat it." },
    ],

    tips: [
      {
        title: "Start where it is crowded",
        body: "Find the row or box with the most clues already in it. Fewest options left means that is where your first provable move is hiding.",
      },
      {
        title: "Never guess",
        body: "A good sudoku always has one square you can prove. If you cannot find it, you have not run out of luck, you have run out of scanning.",
      },
      {
        title: "Hunt a symbol, not a square",
        body: "Instead of asking what goes in this square, take one symbol and ask where it can possibly sit in this box. Usually the answer is one place.",
      },
      {
        title: "Stuck? Count",
        body: "Every row holds the same set of symbols. See which one is missing, then work out where in the row it can sit.",
      },
    ],

    teaches: [
      { title: "Deduction", body: "Every square is solved by elimination: what cannot go there. That is mathematical thinking with no arithmetic in it." },
      { title: "Working systematically", body: "Jumping around gets you stuck. Scanning in order gets you through. The board teaches that by itself." },
      { title: "Patience", body: "There is no luck here and no shortcut. There is only the next square you can prove." },
      { title: "Pattern recognition", body: "After a few boards the eye starts spotting an almost-full box from across the grid." },
    ],

    ages: [
      { title: "4 to 5", body: "The 4x4 animal board. Six animals, 16 squares, 7 to fill. Not a bad first record." },
      { title: "6 to 8", body: "Animals 6x6, then easy. This is where scanning replaces guessing." },
      { title: "9 and up", body: "Medium and hard. The board stops falling out in one pass around it." },
      { title: "Grown-ups", body: "Expert. 56 squares to fill, and you already know the rule." },
    ],

    accessibility:
      "One tap per action, with no dragging and nothing to hold down. On the children's boards the symbols are animals that differ by shape rather than only by colour, so colour blindness does not get in the way. The grid always gets a true square on screen and is never stretched, including on a phone held sideways. Nothing disappears if you wait, there is no countdown and there is no red screen. The clock is a measurement rather than a pressure: stop in the middle, think for a minute, come back.",

    together: [
      { title: "Who spots it first", body: "Pick one symbol and each of you hunt for where it sits in your own box. Whoever can prove it, plays it." },
      {
        title: "Say why",
        body: "Before they touch a square, ask for the reason. A child who can say why it has to be a three has understood the game, even if the next one is wrong.",
      },
      { title: "Clock off", body: "Just ignore it. It gives no grade and it does not run out." },
      { title: "Backwards", body: "Solve a board together, then cover two squares and let them put those back. An easy solve with the same moment of getting it." },
    ],

    faq: [
      {
        q: "What age can start playing sudoku?",
        a: "Four, on the 4x4 animal board. There are no digits on it at all, so a child who does not know numbers yet solves it without any trouble.",
      },
      {
        q: "Is the sudoku free?",
        a: "Yes. No payment and no in-game purchases. All 21 games on the site are open from the first second.",
      },
      {
        q: "How many clues does each level give you?",
        a: "Counted over 60 boards per level: 9 on animals 4x4, 18 on animals 6x6, 42 on easy, 34 on medium, 28 on hard and about 24.7 on expert. Expert is not exactly 24 because the generator refuses to go below the point where the board would have more than one answer.",
      },
      {
        q: "Does every board have exactly one solution?",
        a: "Always. The generator checks that for every clue it removes and puts it back if the board would become ambiguous. You will never be stuck needing a guess.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No. It runs in the browser, with no download and no account.",
      },
      {
        q: "How is the record measured?",
        a: "By solve time, where faster is better, and separately for each level. An animal board and an expert grid never compete with each other.",
      },
      {
        q: "Can I play offline?",
        a: "Yes. After one visit everything is stored on the device, generator included, so new boards keep appearing with no signal.",
      },
      {
        q: "Are there ads?",
        a: "None. No banners, and nothing that plays between levels.",
      },
      {
        q: "What happens if I get one wrong?",
        a: "Change the symbol in that square as often as you like. There is no penalty, no score going down, and nobody counting your mistakes.",
      },
    ],

    keywords: ["sudoku", "logic", "puzzle", "grid", "animals", "expert"],
  },

  provenance: [
    {
      claim: "clue counts per level: 9 / 18 / 42 / 34 / 28 / 24.7, measured over 60 boards each",
      source: "scripts/sim/sudoku-clues.mjs",
    },
    {
      claim: "expert averages 24.7 against a 24 target and sometimes stops at 27",
      source: "scripts/sim/sudoku-clues.mjs",
    },
    {
      claim: "squares you fill in: 7 of 16 on kids 4x4, 39 of 81 on easy, 56 on expert",
      source: "scripts/sim/sudoku-clues.mjs",
    },
    {
      claim: "six levels on 4x4, 6x6 and 9x9 boards; every board has exactly one solution",
      source: "src/games/sudoku/logic.ts",
    },
    {
      claim: "the record is solve time, lower is better, scoped per level",
      source: "src/games/sudoku/Sudoku.tsx",
    },
  ],
};
