import type { GameContent } from "../types";

/**
 * The page where the statistic and the admission are the same sentence.
 *
 * Everyone who has played Minesweeper has lost a board to a coin flip and
 * quietly assumed they missed something. Usually they did not, and
 * `scripts/sim/minesweeper-guessfree.mjs` says by how much: on our hard board,
 * seven boards in eight eventually stop being solvable by logic. That is the
 * most useful thing this page can tell a player, and no other site says it
 * because nobody else ran the solver against these exact boards.
 *
 * The English is written natively, not translated. See
 * `.claude/rules/game-content-template.md`.
 */
export const minesweeper: GameContent = {
  id: "minesweeper",

  copy: {
    he: {
      metaTitle: "שולה מוקשים - משחק חינם בעברית | Ellaz",
      metaDescription:
        "שולה מוקשים חינם בדפדפן, בשלוש רמות. ההקלקה הראשונה תמיד בטוחה. בלי הורדה ובלי הרשמה.",

      lede: "שולה מוקשים חינם, ישר בדפדפן. חושפים משבצות, קוראים את המספרים, ומסמנים את המוקשים בלי לדרוך על אחד. שלוש רמות, וההקלקה הראשונה תמיד בטוחה.",

      body: [
        "לוח מכוסה, ומתחתיו מוקשים. ההקלקה הראשונה תמיד בטוחה. מכאן כל מספר שנחשף אומר כמה מוקשים נוגעים בו, וזה כל המידע שתקבלו.",

        "וכמה פעמים הפסדתם ללוח שפשוט דרש ניחוש, והאשמתם את עצמכם? בדקנו. בנינו פותר שמבצע אך ורק מהלכים שהוא יכול להוכיח, ועצר ברגע שנשאר בלי הוכחה, והרצנו אותו על 2,000 לוחות בכל רמה. ברמה הקלה 79.8% מהלוחות נפתרים בלוגיקה טהורה מההתחלה ועד הסוף. בבינונית זה יורד ל-44.4%. ברמה הקשה נשארים 12.3% בלבד, כלומר שבעה לוחות מכל שמונה יבקשו מכם בשלב כלשהו להטיל מטבע. זה לא כישלון שלכם. זו צפיפות של 40 מוקשים על 196 משבצות, והיא עושה בדיוק את מה שהיא עושה בכל גרסה אחרת של המשחק.",

        "הפותר מכיר שני כללים בלבד, אותם שניים שכל שחקן מפעיל בלי לקרוא להם בשם: משבצת שהמספר שלה כבר מסומן במלואו, וחפיפה בין שתי משבצות שמגלה מה נמצא בהפרש ביניהן. פותר חזק יותר היה מפצח עוד כמה לוחות. לכן המספרים למעלה הם רצפה, לא תקרה, ולכן אפשר לצטט אותם.",

        "השיא נמדד בזמן, והזמן מתחיל בהקלקה הראשונה ולא ברגע שהמסך נטען. אין קנס על סימון שגוי ואפשר לבטל אותו, כי דגל הוא מחשבה ולא התחייבות. כל רמה שומרת שיא נפרד, מפני שתשע דקות על לוח 9 על 9 ותשע דקות על 14 על 14 הן שתי תוצאות שונות לגמרי.",

        "שלוש רמות: 9 על 9 עם 10 מוקשים, 12 על 12 עם 24, ו-14 על 14 עם 40. הצפיפות עולה מ-12.3% ל-16.7% ול-20.4%, וזה השינוי היחיד. אין טיימר סמוי, אין מוקשים שזזים והמספרים אומרים תמיד את האמת.",

        "הכול נשמר על המכשיר. אין חשבון ואין סיסמה, ולכן טלפון וטאבלט הם שני שחקנים עם שני שיאים.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. הלוח נבנה מחדש בכל בחירה." },
        { title: "מקליקים איפשהו", body: "הראשונה בטוחה תמיד, וגם השכנות שלה. פותחים באמצע ומקבלים שטח גדול." },
        { title: "קוראים את המספרים", body: "מספר סופר את המוקשים בשמונה המשבצות שסביבו, כולל האלכסונים." },
        { title: "מסמנים בדגל", body: "לחיצה ארוכה או הכפתור שבצד מסמנת משבצת כמוקש. אפשר לבטל." },
        { title: "מנקים את הלוח", body: "כשכל המשבצות הבטוחות חשופות, השעון נעצר ורואים אם נשבר שיא." },
      ],

      tips: [
        {
          title: "התחילו במרכז",
          body: "משבצת פינתית נוגעת בשלוש שכנות בלבד. משבצת מרכזית נוגעת בשמונה, ולכן פותחת שטח גדול פי כמה בהקלקה אחת.",
        },
        {
          title: "עבדו על הקצה",
          body: "כמעט כל מידע חדש יושב על הגבול בין החשוף למכוסה. סריקה של הגבול מוצאת מהלכים שסריקה של הלוח מפספסת.",
        },
        {
          title: "1-2-1 לאורך קיר",
          body: "הרצף הזה על שורה ישרה נפתר תמיד באותה צורה: מוקש, בטוח, מוקש. שווה לזהות אותו בעין.",
        },
        {
          title: "כשאין מה להוכיח",
          body: "נחשו מהמקום עם הכי מעט שכנים מכוסים, בדרך כלל פינה. אתם לא מקטינים את הסיכון, אתם מקטינים את מה שהוא לוקח אתו.",
        },
      ],

      teaches: [
        {
          title: "הסקה מתוך מידע חלקי",
          body: "אף מספר לבדו לא מספיק. התשובה יושבת תמיד בהצלבה של שניים או שלושה, וזו מיומנות שמתאמנת.",
        },
        {
          title: "להבדיל בין ודאי לסביר",
          body: "המשחק מלמד לשאול אם אתם יודעים או רק מנחשים. זו שאלה שימושית הרבה מעבר ללוח.",
        },
        { title: "סבלנות", body: "לוח קשה לוקח דקות. אין דרך לזרז אותו והזירוז הוא שהורג." },
        {
          title: "לקבל שיש מזל",
          body: "לפעמים אין מהלך מוכח וצריך לבחור. ילדים לומדים כאן שהפסד לא תמיד אומר שטעיתם.",
        },
      ],

      ages: [
        { title: "7 עד 9", body: "רמה קלה, ורצוי יחד בפעם הראשונה. הרעיון שמספר מדבר על השכנים שלו הוא הקפיצה כאן." },
        { title: "10 עד 12", body: "בינונית. בגיל הזה כבר מזהים תבניות במקום לחשב כל משבצת מחדש." },
        { title: "13 ומעלה", body: "קשה. מכאן זה מרוץ מול השעון של עצמכם." },
        {
          title: "מבוגרים",
          body: "לוח קשה מתחת לשלוש דקות זו תוצאה טובה מאוד. שווה לזכור ש-87.7% מהלוחות ברמה הזאת ידרשו מכם ניחוש אחד לפחות.",
        },
      ],

      accessibility:
        "נגיעה אחת לחשיפה, לחיצה ארוכה או כפתור ייעודי לדגל, בלי גרירה בשום מקום. המשבצות גדולות מספיק לאצבע גם בלוח הקשה, והלוח מתכווץ לגודל המסך במקום לגלוש ממנו. המספרים נבדלים בצורת הספרה ולא רק בצבע, כך שעיוורון צבעים לא מפריע לקריאה. אין הבהובים ואין ספירה לאחור מלחיצה. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע, והשעון רץ בלי להשמיע דבר.",

      together: [
        {
          title: "אחד מסביר, אחד מקליק",
          body: "מי שמסביר חייב לנמק כל מהלך לפני הלחיצה. זו הדרך המהירה ביותר ללמד את המשחק.",
        },
        {
          title: "עצירה לפני ניחוש",
          body: "כשמגיעים לרגע שאין בו הוכחה, עצרו והכריזו עליו. פתאום ברור שהמשחק בנוי משני חלקים שונים.",
        },
        { title: "אותו לוח, שני שעונים", body: "שחקו את אותה רמה בתורות והשוו זמנים. הלוח שונה, האתגר זהה." },
        {
          title: "ציד תבניות",
          body: "תנו פרס קטן על זיהוי 1-2-1 לפני השני. פתאום כולם מסתכלים על הקצה.",
        },
      ],

      faq: [
        {
          q: "שולה מוקשים חינם?",
          a: "כן, לגמרי. אין תשלום, אין רכישות בתוך המשחק וגם לא גרסה מורחבת בכסף. כל המשחקים באתר פתוחים מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "האם ההקלקה הראשונה יכולה לפוצץ אותי?",
          a: "לא. המוקשים נפרסים רק אחרי שהקלקתם, והמשבצת שבחרתם וכל שכנותיה מוחרגות. לכן ההתחלה תמיד פותחת שטח ולא מסיימת את המשחק.",
        },
        {
          q: "למה יש לוחות שאי אפשר לפתור בלי לנחש?",
          a: "כי צפיפות המוקשים יוצרת מצבים שבהם שתי אפשרויות נשארות שקולות. מדדנו את זה: 79.8% מהלוחות הקלים נפתרים בלוגיקה בלבד, מול 12.3% ברמה הקשה. הסימולציה נמצאת בקוד הפתוח שלנו.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "איך מסמנים דגל בטלפון?",
          a: "לחיצה ארוכה על משבצת, או הכפתור שבצד הלוח שמחליף בין חשיפה לסימון. אין קנס על דגל שגוי ואפשר להוריד אותו.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בזמן, כשמהר יותר זה טוב יותר, ובנפרד לכל רמה. השעון מתחיל בהקלקה הראשונה ולא בטעינת המסך.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "בערך משבע, ברמה הקלה. צריך להבין שמספר מדבר על השכנים שלו, וזה הרעיון היחיד שדורש הסבר. אין קריאה בשום מקום במשחק.",
        },
        {
          q: "המשחק אוסף מידע?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["שולה מוקשים", "מוקשים", "משחק חשיבה", "משחק לוח", "קלאסי", "היגיון"],
    },

    en: {
      metaTitle: "Free Minesweeper - Play Online, No Download | Ellaz",
      metaDescription:
        "Play Minesweeper free in your browser across three levels. The first click is always safe. No download and no signup.",

      lede: "Free Minesweeper in your browser. Uncover squares, read the numbers, flag the mines without stepping on one. Three levels, and the first click is always safe.",

      body: [
        "A covered board with mines under it. Your first click is safe, always. After that every number you uncover tells you how many mines touch it, and that is the entire information you get.",

        "Here is the question nobody answers. How often have you lost a board that simply required a guess, and assumed you had missed something? We measured it. We built a solver that only ever makes moves it can prove, stops the instant it runs out of proof, and ran it over 2,000 boards per level. On easy, 79.8% of boards can be cleared by pure logic from first click to last square. Medium drops to 44.4%. Hard leaves 12.3%, which means seven boards in eight will eventually ask you to flip a coin. That is not you playing badly. That is 40 mines across 196 squares, and it does the same thing in every version of this game ever written.",

        "Our solver knows two rules, the same two every player uses without naming them. A number whose mines are all accounted for, and the overlap between two numbers that reveals what sits in the difference. A stronger solver would crack a few more boards, so those percentages are a floor rather than a ceiling. That is the honest direction for them to be wrong in.",

        "The record is a time, and the clock starts on your first click rather than when the page loads. Flags cost nothing and come back off, because a flag is a thought and not a commitment. Each level keeps its own record, since nine minutes on a 9x9 and nine minutes on a 14x14 are not the same achievement in any sense.",

        "Three levels: 9x9 with 10 mines, 12x12 with 24, and 14x14 with 40. Density climbs from 12.3% to 16.7% to 20.4%, and nothing else changes. No hidden timer. No mines that move. The numbers never lie to you.",

        "Everything saves on the device. No account, no password, which also means your phone and your tablet keep two separate records.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. Choosing rebuilds the board from scratch." },
        { title: "Click anywhere", body: "The first square is safe and so are its neighbours. Open near the middle for a bigger reveal." },
        { title: "Read the numbers", body: "A number counts mines in the eight squares around it, diagonals included." },
        { title: "Flag what you know", body: "Long press, or the toggle beside the board. Flags come back off freely." },
        { title: "Clear the board", body: "When every safe square is open the clock stops and you find out about the record." },
      ],

      tips: [
        {
          title: "Open in the middle",
          body: "A corner square touches three neighbours. A middle one touches eight, so it opens several times as much ground for the same click.",
        },
        {
          title: "Work the frontier",
          body: "Almost every new deduction lives on the border between opened and covered. Scanning that edge finds moves that scanning the whole board misses.",
        },
        {
          title: "Learn 1-2-1",
          body: "Three numbers in a straight line along a wall always resolve the same way: mine, safe, mine. Spot it by eye and stop calculating it.",
        },
        {
          title: "When nothing is provable",
          body: "Guess from wherever has the fewest covered neighbours, usually a corner. You are not lowering the odds, you are lowering what a wrong answer takes with it.",
        },
      ],

      teaches: [
        {
          title: "Reasoning from partial information",
          body: "No single number is ever enough. The answer always lives in two or three of them crossed against each other.",
        },
        {
          title: "Certain against likely",
          body: "The game constantly asks whether you know this or merely believe it. That question is useful a long way from the board.",
        },
        { title: "Patience", body: "A hard board takes minutes. Rushing is what kills you, every time." },
        {
          title: "Accepting luck",
          body: "Sometimes no proven move exists and you have to pick. Losing is not always evidence that you were wrong.",
        },
      ],

      ages: [
        { title: "7 to 9", body: "Easy, and sit with them the first time. The leap is understanding that a number talks about its neighbours." },
        { title: "10 to 12", body: "Medium. This is the age where patterns replace recalculating every square." },
        { title: "13 and up", body: "Hard. From here you are racing your own clock." },
        {
          title: "Adults",
          body: "Under three minutes on hard is a genuinely good time. Worth remembering that 87.7% of boards at that level will make you guess at least once.",
        },
      ],

      accessibility:
        "One tap to uncover, a long press or a dedicated toggle to flag, and no dragging anywhere. Squares stay finger-sized even on the hard board, which shrinks to fit the screen rather than overflowing it. Numbers are distinguished by their shape and not only by colour, so colour blindness does not affect reading them. Nothing flashes and nothing counts down from a click. You can play the whole game in silence without losing any information, and the clock runs without making a sound.",

      together: [
        {
          title: "One explains, one clicks",
          body: "Whoever explains has to justify each move out loud before it happens. Fastest way to teach the game there is.",
        },
        {
          title: "Call the guess",
          body: "When you hit a position with no proof, stop and say so. Suddenly it is obvious the game has two separate halves.",
        },
        { title: "Same level, two clocks", body: "Take turns on the same difficulty and compare times. Different board, identical challenge." },
        {
          title: "Pattern hunt",
          body: "Small prize for spotting a 1-2-1 before the other person. Everyone starts watching the frontier.",
        },
      ],

      faq: [
        {
          q: "Is Minesweeper free here?",
          a: "Completely. Nothing to pay, nothing to buy inside the game, and no paid version with extra levels because there is no other version. Every game on the site is open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "Neither. It runs in the browser with no download and no account. We do not ask for an email either.",
        },
        {
          q: "Can the first click hit a mine?",
          a: "No. Mines are placed after you click, and the square you chose plus all its neighbours are excluded. That is why an opening click always reveals ground instead of ending the game.",
        },
        {
          q: "Why are some boards impossible without guessing?",
          a: "Mine density creates positions where two possibilities stay exactly balanced, and no amount of logic separates them. We measured how often: 79.8% of easy boards are solvable by pure logic against 12.3% of hard ones. The simulation is in our open source.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "How do I flag on a phone?",
          a: "Long press a square, or use the toggle beside the board that switches between uncovering and flagging. Wrong flags cost nothing and come straight back off.",
        },
        {
          q: "How is the record measured?",
          a: "As a time, where faster is better, kept separately per level. The clock starts on your first click rather than when the screen loads.",
        },
        {
          q: "What age is this for?",
          a: "Around seven, on easy. The one idea that needs explaining is that a number describes its neighbours. There is no reading anywhere in the game.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["minesweeper", "logic game", "puzzle", "classic game", "deduction", "board game"],
    },
  },

  provenance: [
    {
      claim: "79.8% easy / 44.4% medium / 12.3% hard of boards clear by pure logic, 2,000 boards per level",
      source: "scripts/sim/minesweeper-guessfree.mjs",
    },
    {
      claim: "board sizes and mine counts: 9x9/10, 12x12/24, 14x14/40, densities 12.3% / 16.7% / 20.4%",
      source: "src/games/minesweeper/logic.ts",
    },
    {
      claim: "the first click and its neighbours are excluded from mine placement",
      source: "src/games/minesweeper/logic.ts",
    },
    {
      claim: "the record is a time, lower is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
