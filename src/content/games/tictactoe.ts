import type { GameContent } from "../types";

/**
 * The page that tells a player one opponent cannot be beaten, and proves it
 * rather than asserting it.
 *
 * "Unbeatable minimax" is a claim about code, and claims about code are worth
 * what a run of the code says. `scripts/sim/tictactoe-odds.mjs` plays the real
 * `chooseMove` and returns 0 wins in 3,000 games against hard. It also solves
 * the full tree - 255,168 playouts - and confirms perfect play is a draw, which
 * is a fact about the game rather than about our AI.
 *
 * That is why this game's hard record may honestly stay empty forever, and the
 * page says so instead of leaving a child to wonder what they are doing wrong.
 */
export const tictactoe: GameContent = {
  id: "tictactoe",

  he: {
    metaTitle: "איקס עיגול - משחק חינם נגד המחשב | Ellaz",
    metaDescription:
      "איקס עיגול חינם בדפדפן נגד המחשב, בשלוש רמות. הרמה הקשה לא ניתנת לניצחון. בלי הורדה ובלי הרשמה.",

    lede: "איקס עיגול חינם נגד המחשב, ישר בדפדפן. אתם מתחילים, שלושה ברצף מנצחים, ושלוש רמות של יריב שההבדל ביניהן אמיתי ולא קוסמטי.",

    body: [
      "לוח שלוש על שלוש. אתם איקס ואתם פותחים. שלושה ברצף בכל כיוון וזכיתם.",

      "והנה הדבר שאף אתר אחר לא יגיד לכם: את הרמה הקשה אי אפשר לנצח. לא קשה לנצח, אי אפשר. הרצנו 3,000 משחקים מול היריב האמיתי, עם שחקן שמשחק במהלכים אקראיים, והתוצאה הייתה 0 ניצחונות, 21.7% תיקו ו-78.3% הפסד. ואז פתרנו את המשחק כולו, כל 255,168 המהלכים האפשריים עד הסוף, וגם שם אין קו אחד שמנצח יריב מושלם. איקס עיגול הוא תיקו כששני הצדדים משחקים נכון. זו תכונה של המשחק, לא של הקוד שלנו.",

      "לכן שיא ברמה הקשה עשוי להישאר ריק לתמיד, וזה בסדר גמור. השיא כאן סופר רצף ניצחונות מול אותה רמה, אז ברמה הקשה הוא פשוט לא יזוז. תיקו מול יריב שלא ניתן להביס הוא ההישג, ואם ילד הבין את זה הוא הבין את המשחק.",

      "שתי הרמות האחרות הן יריבים אחרים לגמרי. הקלה בוחרת משבצת אקראית, וגם מולה שחקן אקראי מנצח רק ב-58.8% מהמשחקים, כי מי שפותח פשוט נהנה מיתרון מובנה. הבינונית משחקת נכון בערך בחצי מהמהלכים, ומול שחקן אקראי היא כבר מנצחת ב-54.3%. אותו לוח, אותם חוקים, שלושה משחקים.",

      "המעבר בין רמות מאפס את הרצף. יריב אחר הוא הישג אחר, ולא היה הגיוני לצבור ניצחונות מול היריב האקראי ולספור אותם באותו מונה כמו ניצחונות מול המחשב שמנסה.",
    ],

    howToPlay: [
      { title: "בוחרים יריב", body: "קל, בינוני או קשה. הבחירה מתחילה לוח נקי ומאפסת את הרצף." },
      { title: "נוגעים במשבצת", body: "אתם איקס ואתם תמיד ראשונים. המחשב עונה מיד." },
      { title: "בונים שלושה", body: "שורה, עמודה או אלכסון. הקו המנצח נצבע." },
      { title: "מתחילים שוב", body: "אחרי כל משחק הלוח מתאפס בלחיצה, והרצף ממשיך מאיפה שהיה." },
    ],

    tips: [
      {
        title: "קחו את המרכז",
        body: "המרכז נמצא בארבעה קווים מנצחים, פינה בשלושה וצלע בשניים בלבד. אם המרכז פנוי, זה המהלך.",
      },
      {
        title: "מלכודת המזלג",
        body: "שתי פינות נגדיות יוצרות שני איומים בו זמנית, והיריב יכול לחסום רק אחד. זו הדרך המעשית לנצח את הרמה הבינונית.",
      },
      {
        title: "לחסום לפני לבנות",
        body: "בכל תור בדקו קודם אם ליריב יש שניים ברצף. איום לא חסום גומר את המשחק מיד.",
      },
      {
        title: "מול הקשה, כוונו לתיקו",
        body: "מרכז, ואז חסימה עקבית. תיקו מול יריב מושלם הוא התוצאה הטובה ביותר שקיימת.",
      },
    ],

    teaches: [
      { title: "לחשוב תור קדימה", body: "כל מהלך פותח וסוגר אפשרויות לשני הצדדים. זה השיעור הראשון באסטרטגיה." },
      {
        title: "לזהות איום",
        body: "שניים ברצף עם משבצת פנויה הם איום. לראות את זה מהר יותר מהיריב זו כל המיומנות.",
      },
      { title: "שיש משחקים שנגמרים בתיקו", body: "לא לכל תחרות יש מנצח, וזה רעיון ששווה להיתקל בו מוקדם." },
      {
        title: "להפסיד בלי דרמה",
        body: "משחק לוקח עשרים שניות. אפשר להפסיד ולהתחיל שוב מיד, וזה מוריד את המחיר של טעות כמעט לאפס.",
      },
    ],

    ages: [
      { title: "4 עד 5", body: "רמה קלה, ולרוב יחד. בגיל הזה עוד לומדים מה זה בכלל שלושה ברצף." },
      { title: "6 עד 7", body: "קלה לבד, ואז בינונית. פה מגלים את המרכז ואת החסימה." },
      { title: "8 ומעלה", body: "בינונית לרצף ארוך, וקשה בשביל להבין למה אי אפשר." },
      {
        title: "מבוגרים",
        body: "נסו להוציא תיקו מול הקשה חמש פעמים ברצף. 21.7% מהמשחקים האקראיים מגיעים לתיקו, אז זה פחות טריוויאלי משזה נשמע.",
      },
    ],

    accessibility:
      "נגיעה אחת במשבצת, בלי גרירה ובלי החזקה. תשע משבצות גדולות שתופסות את רוב המסך, אז גם אצבע קטנה או אמצעי קלט חלופי מדייקים בלי מאמץ. איקס ועיגול נבדלים בצורה ולא בצבע, כך שעיוורון צבעים לא משפיע, וגם הקו המנצח מסומן בצורה ולא רק בגוון. אין שעון ואין לחץ זמן, אז אפשר לחשוב כמה שרוצים. אין הבהובים ואפשר לשחק בשקט מלא.",

    together: [
      {
        title: "שניים על מכשיר אחד",
        body: "שחקו זה מול זה בתורות במקום מול המחשב. אותו לוח, יריב שאפשר להסתכל עליו.",
      },
      {
        title: "מי מגיע לתיקו",
        body: "שניכם מול הרמה הקשה, וסופרים מי הוציא יותר תיקו מעשרה משחקים. זה משנה את כל ההגדרה של הצלחה.",
      },
      { title: "להסביר מהלך", body: "לפני כל נגיעה, משפט אחד על למה שם. ילדים מגלים ככה שהייתה להם סיבה." },
      {
        title: "לוותר על המרכז",
        body: "משחק אחד שבו אסור לקחת את המרכז. פתאום מבינים כמה הוא היה שווה.",
      },
    ],

    faq: [
      {
        q: "איקס עיגול נגד המחשב חינם?",
        a: "כן, לגמרי. אין תשלום, אין רכישות בתוך המשחק ואין גרסה מורחבת בכסף. כל המשחקים באתר פתוחים מיד.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
      },
      {
        q: "אפשר לנצח את הרמה הקשה?",
        a: "לא, ובכוונה. היא מחשבת את כל המשך המשחק לפני כל מהלך. בדקנו את זה ב-3,000 משחקים והתוצאה הייתה 0 ניצחונות, ופתרנו גם את כל 255,168 המהלכים האפשריים. תיקו הוא התוצאה הטובה ביותר שקיימת מולה.",
      },
      {
        q: "מה ההבדל בין הרמות?",
        a: "הקלה בוחרת משבצת אקראית. הבינונית משחקת נכון בערך בחצי מהמהלכים. הקשה מחשבת את המהלך המושלם בכל פעם. מול שחקן אקראי הן מנצחות ב-29%, ב-54.3% וב-78.3% מהמשחקים.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "אפשר לשחק שניים על אותו מכשיר?",
        a: "לא במצב ייעודי, אבל אין מה שמונע מכם לתת אחד לשני את המכשיר בתורות ולהתעלם מהמחשב.",
      },
      {
        q: "איך השיא נמדד?",
        a: "ברצף הניצחונות הארוך ביותר מול אותה רמה, כשיותר זה טוב יותר. מעבר בין רמות מאפס את הרצף, כי כל רמה היא יריב אחר. ברמה הקשה השיא עשוי להישאר ריק לנצח, וזה תקין.",
      },
      {
        q: "מאיזה גיל זה מתאים?",
        a: "מארבע בערך, ברמה הקלה ובעזרת מבוגר בהתחלה. אין קריאה בשום מקום, וצריך רק להבין מה זה שלושה ברצף.",
      },
      {
        q: "המשחק אוסף מידע?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["איקס עיגול", "נגד המחשב", "משחק לוח", "אסטרטגיה", "קלאסי", "שני שחקנים"],
  },

  en: {
    metaTitle: "Tic-Tac-Toe - Free Online vs Computer | Ellaz",
    metaDescription:
      "Play Tic-Tac-Toe free against the computer on three levels. Hard cannot be beaten, and we counted. No download, no signup.",

    lede: "Free Tic-Tac-Toe against the computer, in your browser. You go first, three in a row wins, and the three opponents are genuinely three different opponents rather than one with a label on it.",

    body: [
      "A three by three grid. You are X and you open. Three in a line, any direction, and it is over.",

      "Now the thing no other site will tell you. The hard opponent cannot be beaten. Not hard to beat, cannot. We played 3,000 games against the real opponent with a player making random moves and got 0 wins, 21.7% draws and 78.3% losses. Then we solved the game outright, all 255,168 complete playouts, and there is no line anywhere in it that beats perfect play. Tic-tac-toe is a draw when both sides play correctly. That is a property of the game, not of our code.",

      "Which means a hard record here may stay empty forever, and that is fine. The record counts your longest run of wins against one opponent, so against hard it simply never moves. A draw against something that cannot lose is the achievement, and a child who works that out has understood the game.",

      "The other two are different opponents entirely. Easy picks a random square, and even against that a random player only wins 58.8% of the time, because going first is worth something all by itself. Medium plays correctly about half the time and already beats a random player in 54.3% of games. Same board, same rules, three games.",

      "Switching level resets the run. A different opponent is a different achievement, and it made no sense to pile up wins against the random one in the same counter as wins against the machine that is actually trying.",
    ],

    howToPlay: [
      { title: "Choose an opponent", body: "Easy, medium or hard. Choosing clears the board and resets the run." },
      { title: "Tap a square", body: "You are X and you always move first. The computer answers immediately." },
      { title: "Make three", body: "Row, column or diagonal. The winning line is highlighted." },
      { title: "Go again", body: "One tap resets the board, and your run carries over." },
    ],

    tips: [
      {
        title: "Take the centre",
        body: "The centre sits on four winning lines, a corner on three, an edge on only two. If the centre is open, that is the move.",
      },
      {
        title: "Build a fork",
        body: "Two opposite corners create two threats at once and your opponent can only block one. This is the practical way to beat medium.",
      },
      {
        title: "Block before you build",
        body: "Every turn, check whether they have two in a row first. An unblocked threat ends the game immediately.",
      },
      {
        title: "Against hard, play for the draw",
        body: "Centre, then block consistently. A draw against a perfect opponent is the best result that exists.",
      },
    ],

    teaches: [
      { title: "Thinking a turn ahead", body: "Every move opens and closes options for both sides. First lesson in strategy there is." },
      {
        title: "Spotting a threat",
        body: "Two in a row with a free square is a threat. Seeing it faster than the other player is the entire skill.",
      },
      { title: "That draws exist", body: "Not every contest has a winner, which is a useful idea to meet early." },
      {
        title: "Losing without drama",
        body: "A game takes twenty seconds. You can lose and restart instantly, which drops the cost of a mistake to almost nothing.",
      },
    ],

    ages: [
      { title: "4 to 5", body: "Easy, usually together. At this age three in a row is itself the new idea." },
      { title: "6 to 7", body: "Easy alone, then medium. This is where the centre and blocking get discovered." },
      { title: "8 and up", body: "Medium for a long run, hard to find out why it cannot be done." },
      {
        title: "Adults",
        body: "Try drawing against hard five times running. Only 21.7% of random games reach a draw, so it is less trivial than it sounds.",
      },
    ],

    accessibility:
      "One tap per square, no dragging and no press-and-hold. Nine large squares fill most of the screen, so a small finger or an alternative input device hits them without effort. X and O differ in shape rather than colour, so colour blindness changes nothing, and the winning line is marked by a drawn stroke rather than only a tint. No clock and no time pressure, so you can think as long as you like. Nothing flashes and the whole game plays in silence.",

    together: [
      {
        title: "Two on one device",
        body: "Take turns against each other and ignore the computer. Same board, opponent you can look at.",
      },
      {
        title: "Race to a draw",
        body: "Both of you against hard, counting who drew more out of ten. It changes the definition of winning.",
      },
      { title: "Say the reason", body: "One sentence before each tap about why there. Children discover they had one." },
      {
        title: "Centre is banned",
        body: "Play one game where nobody may take the middle. You find out fast what it was worth.",
      },
    ],

    faq: [
      {
        q: "Is Tic-Tac-Toe against the computer free?",
        a: "Completely. Nothing to pay, no purchases inside the game, no paid version. Every game on the site is open immediately.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
      },
      {
        q: "Can the hard level be beaten?",
        a: "No, and that is deliberate. It calculates the rest of the game before every move. We tested it across 3,000 games for 0 wins, and separately solved all 255,168 possible playouts. A draw is the best result that exists against it.",
      },
      {
        q: "What is the difference between the levels?",
        a: "Easy picks a random square. Medium plays correctly about half the time. Hard calculates the perfect move every time. Against a random player they win 29%, 54.3% and 78.3% of games respectively.",
      },
      { q: "Are there ads?", a: "None. No banners and no video between levels." },
      {
        q: "Does it work offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "Can two people play on one device?",
        a: "There is no dedicated two-player mode, but nothing stops you passing the device back and forth and ignoring the computer entirely.",
      },
      {
        q: "How is the record measured?",
        a: "As your longest run of wins against one opponent, where higher is better. Switching level resets the run, because each level is a different opponent. On hard the record may stay empty forever, which is correct.",
      },
      {
        q: "What age is this for?",
        a: "From about four on easy, with an adult for the first few. There is no reading anywhere and the only idea needed is three in a row.",
      },
      {
        q: "Does it collect data about my child?",
        a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
      },
    ],

    keywords: ["tic tac toe", "noughts and crosses", "vs computer", "strategy", "classic game", "two player"],
  },

  provenance: [
    {
      claim: "0 wins in 3,000 games against hard; 21.7% draws, 78.3% losses",
      source: "scripts/sim/tictactoe-odds.mjs",
    },
    {
      claim: "against a random player easy loses 29%, medium wins 54.3%, hard wins 78.3%; random beats easy 58.8%",
      source: "scripts/sim/tictactoe-odds.mjs",
    },
    {
      claim: "255,168 complete playouts exist and perfect play is a draw",
      source: "scripts/sim/tictactoe-odds.mjs",
    },
    {
      claim: "easy is a random move, medium is optimal about half the time, hard is full minimax",
      source: "src/games/tictactoe/logic.ts",
    },
    {
      claim: "the record is the longest win streak per difficulty and resets on a difficulty change",
      source: "src/games/tictactoe/TicTacToe.tsx",
    },
  ],
};
