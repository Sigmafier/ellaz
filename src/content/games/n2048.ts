import type { GameContent } from "../types";

/**
 * 2048. Note the id is "2048" while the directory is `n2048` - a directory
 * cannot start with a digit and stay importable, so the URL is /games/2048/.
 * Getting that wrong produces a 404 nothing else would catch.
 *
 * The statistic here comes from `scripts/sim/n2048-reach.mjs`, which plays the
 * real move engine rather than a description of it. The finding worth the page:
 * the kids board is the only one a random player wins, 94% of the time, while
 * the classic board is not within a factor of ten of its own target under any
 * strategy simple enough to describe.
 */
export const n2048: GameContent = {
  id: "2048",

  he: {
    metaTitle: "2048 - משחק חינם בעברית באינטרנט | Ellaz",
    metaDescription:
      "2048 חינם בדפדפן, בשלושה גדלי לוח. מחליקים, מחברים מספרים זהים ומגיעים ליעד. בלי הורדה ובלי הרשמה.",

    lede: "2048 חינם, ישר בדפדפן. מחליקים את הלוח לכיוון אחד, שני מספרים זהים שנפגשים מתחברים לאחד גדול, וממשיכים עד שנגמר המקום. שלושה גדלי לוח, כולל אחד לילדים.",

    body: [
      "החלקה אחת מזיזה את כל הלוח. שני אריחים זהים שנפגשים בדרך הופכים לאחד כפול, ואחרי כל תנועה נולד אריח חדש במקום פנוי. זהו.",

      "מה באמת מפריד בין שלושת הלוחות? לא הגודל, אלא כמה מקום נשאר לכם לעבוד בו. אריח 2048 בנוי משני 1024, שכל אחד מהם שני 512, וכך עד למטה: 1,024 אריחי 2 חייבים להיוולד ולהתחבר, על לוח של 16 משבצות. זה 64 לידות לכל משבצת. הרצנו את מנוע המשחק האמיתי על 1,500 משחקים לכל לוח: שחקן שמחליק לגמרי אקראית מגיע בממוצע לאריח 105, ואסטרטגיית הפינה, כלומר כל העצה העממית שיש, מכפילה אותו ל-198. שניהם רחוקים מ-2048 פי עשרה ויותר. הפער הזה הוא המשחק.",

      "ובלוח הילדים המספרים מתהפכים לגמרי. 5 על 5 עם יעד 256 דורש 128 לידות על 25 משבצות, קצת יותר מחמש לכל אחת, ושחקן אקראי לגמרי מנצח שם ב-94% מהמשחקים. זו לא רמה קלה יותר. זו הרמה היחידה שאפשר לנצח בה גם כשמשחקים רע, וזה בדיוק מה שילד בן חמש צריך בפעם הראשונה.",

      "הלוח הקשה, 3 על 3, לא מבקש מכם מספר גדול יותר. הוא נותן לכם פחות מקום לטעות בו. משחק אקראי נגמר שם אחרי 30 מהלכים בממוצע, מול 116 על הלוח הקלאסי ו-509 על לוח הילדים. תשע משבצות מתמלאות מהר.",

      "אין הפסד אמיתי כאן. כשנגמרות התנועות המשחק פשוט נעצר ומראה לכם כמה צברתם, ואפשר להתחיל מיד מחדש. גם אחרי שמגיעים ליעד אפשר להמשיך, כי בשלב הזה כבר לא היעד מעניין אלא כמה רחוק אפשר למתוח את זה.",

      "הלוח מוצג משמאל לימין גם בעברית, בכוונה. כיוון ההחלקה חייב להתאים למה שהעיניים רואות, ולוח שהתהפך לימין היה הופך כל החלקה ימינה לתנועה שמאלה.",
    ],

    howToPlay: [
      { title: "בוחרים לוח", body: "ילדים, קלאסי או קשה. הבחירה מתחילה משחק נקי." },
      { title: "מחליקים", body: "אצבע לכל כיוון, או חצים במקלדת. כל הלוח זז יחד." },
      { title: "מחברים", body: "שני מספרים זהים שנפגשים בתנועה הופכים לאחד כפול." },
      { title: "מרוויחים נקודות", body: "כל חיבור מוסיף את ערך האריח החדש לניקוד." },
      { title: "ממשיכים", body: "כשמגיעים ליעד אפשר לעצור או להמשיך. הלוח לא נסגר." },
    ],

    tips: [
      {
        title: "בחרו פינה והישארו בה",
        body: "החזיקו את האריח הגדול בפינה אחת קבועה והחליקו רק לשני הכיוונים שמובילים אליה. במדידה שלנו זה לבדו הכפיל את התוצאה.",
      },
      {
        title: "הכיוון הרביעי הוא מלכודת",
        body: "ההחלקה שמרחיקה את הגדול מהפינה נראית מפתה כשהלוח נתקע. היא זו שהורסת את הסדר שבניתם.",
      },
      {
        title: "בנו שורה יורדת",
        body: "אריחים מסודרים מגדול לקטן לאורך קצה מתחברים כמו שרשרת. זו הסיבה שהפינה עובדת מלכתחילה.",
      },
      {
        title: "אל תרדפו אחרי חיבורים קטנים",
        body: "שני 4 בקצה הלא נכון של הלוח שווים פחות ממה שהם עולים לכם בסדר.",
      },
    ],

    teaches: [
      { title: "תכנון קדימה", body: "כל תנועה משנה את כל הלוח. מי שחושב מהלך אחד קדימה מגיע רחוק יותר." },
      {
        title: "חזקות של שתיים",
        body: "2, 4, 8, 16 ומעלה. אחרי משחק אחד ילד מכיר את הסדרה הזאת בעל פה בלי שאף אחד לימד אותו.",
      },
      { title: "ויתור על רווח מיידי", body: "המהלך שנותן נקודות עכשיו הוא לא תמיד המהלך שמשאיר לוח טוב." },
      {
        title: "לסבול סוף",
        body: "המשחק תמיד נגמר. ללמוד להתחיל מחדש בלי תסכול זו חצי המיומנות.",
      },
    ],

    ages: [
      { title: "5 עד 6", body: "לוח הילדים. היעד נמוך והלוח רחב, אז גם החלקות אקראיות מתקדמות." },
      { title: "7 עד 9", body: "עדיין ילדים, ואז קלאסי. פה מתחילים לשמור על פינה במקום להחליק לאן שבא." },
      { title: "10 ומעלה", body: "קלאסי, ובשביל האתגר האמיתי הלוח הקטן." },
      {
        title: "מבוגרים",
        body: "אריח 2048 על הלוח הקלאסי דורש 1,024 אריחי 2 שנולדים ומתחברים. זו לא תוצאה של ערב אחד.",
      },
    ],

    accessibility:
      "החלקה או חצים במקלדת, ואף פעם לא גרירה מדויקת של אריח בודד. אפשר לשחק ביד אחת ובלי החזקה ממושכת של האצבע. האריחים נבדלים במספר שכתוב עליהם ולא רק בצבע הרקע, כך שעיוורון צבעים לא משנה כלום, וכל אריח נושא גם תווית קולית לקוראי מסך. הלוח מתכווץ לגודל המסך ותמיד נשאר ריבועי. אין הבהובים, אין שעון ואין לחץ זמן בשום שלב.",

    together: [
      { title: "החלקה בתורות", body: "כל אחד מזיז פעם אחת על אותו לוח. הניקוד משותף, וההאשמות גם." },
      {
        title: "להכריז לפני",
        body: "אמרו בקול לאן אתם הולכים ולמה, לפני האצבע. פתאום שומעים אם יש בכלל תוכנית.",
      },
      { title: "מרוץ שני מכשירים", body: "אותו לוח, שני טלפונים, מי מגיע ל-256 קודם." },
      {
        title: "ציד המספר",
        body: "עם ילד קטן, בקשו למצוא את ה-16 על הלוח. זה הופך את המשחק לתרגיל קריאה של מספרים.",
      },
    ],

    faq: [
      {
        q: "המשחק 2048 חינמי?",
        a: "כן, לגמרי. אין תשלום, אין רכישות בתוך המשחק ואין גרסה מורחבת בכסף. כל המשחקים באתר פתוחים מיד.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
      },
      {
        q: "אפשר להמשיך אחרי שמגיעים ל-2048?",
        a: "כן. היעד עוצר את המשחק לרגע כדי לחגוג, ואז ממשיכים על אותו לוח. מכאן זה מרוץ מול הניקוד ולא מול היעד.",
      },
      {
        q: "מה ההבדל בין שלושת הלוחות?",
        a: "כמה מקום נשאר לכם. לוח הילדים הוא 5 על 5 עד 256, הקלאסי 4 על 4 עד 2048 והקשה 3 על 3 עד 512. בסימולציה שלנו שחקן אקראי מנצח ב-94% מהמשחקים על לוח הילדים ואף פעם על השניים האחרים.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "למה הלוח לא מתהפך בעברית?",
        a: "כי כיוון ההחלקה חייב להתאים למה שרואים. לוח שמתהפך לימין היה הופך כל החלקה ימינה לתנועה שמאלה, וזה בדיוק הסוג של באג ששובר משחק שלם.",
      },
      {
        q: "איך השיא נמדד?",
        a: "בנקודות, כשיותר זה טוב יותר. השיא הוא מספר אחד לכל שלושת הלוחות, ולא אחד לכל לוח, כי הוא קיים כאן מלפני שהפרדנו רמות ופיצול שלו היה מוחק אותו לכל מי שכבר שיחק.",
      },
      {
        q: "מאיזה גיל זה מתאים?",
        a: "לוח הילדים מגיל חמש בערך, אם הילד מזהה מספרים. אין קריאה בשום מקום במשחק. הלוח הקלאסי מעסיק גם מבוגרים.",
      },
      {
        q: "המשחק אוסף מידע?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["2048", "משחק מספרים", "חשיבה", "אריחים", "לוח", "משחק חינם"],
  },

  en: {
    metaTitle: "2048 - Play Free Online, No Download | Ellaz",
    metaDescription:
      "Play 2048 free in your browser on three board sizes, including a kids board. Slide, merge matching numbers, no signup.",

    lede: "2048, free and in your browser. Slide the whole board one way, two matching numbers that meet become one bigger number, and you keep going until the board fills up. Three board sizes, one of them built for young children.",

    body: [
      "One swipe moves everything. Two matching tiles that collide become one tile of double the value, and a new tile appears in a free cell after every move. That is the whole game.",

      "What actually separates the three boards is not their size, it is how much room they leave you. A 2048 tile is built from two 1024s, each of those from two 512s, all the way down: 1,024 individual 2-tiles have to be born and merged, on a board of 16 cells. Sixty-four spawns per cell. We ran the real move engine over 1,500 games per board and a player swiping purely at random averages a best tile of 105. The corner strategy, which is the entire body of folk advice about this game, roughly doubles it to 198. Both are more than ten times short of 2048, and that distance is the game.",

      "On the kids board the numbers invert completely. A 5x5 with a target of 256 needs 128 spawns across 25 cells, barely five each, and a player swiping at random reaches the target in 94% of games. That is not a slightly easier level. It is the only one you can win while playing badly, which is exactly what a five-year-old needs on their first go.",

      "The hard board, 3x3, is not asking for a bigger number. It is giving you less room to be wrong in. A random game ends there after 30 moves on average, against 116 on the classic board and 509 on the kids one. Nine cells fill up fast.",

      "Nothing here is really a loss. When no move is left the game stops and shows you what you built, and a new one starts instantly. You can also keep playing past the target, because by then the target is no longer the interesting question.",

      "The board runs left to right even in Hebrew, deliberately. Swipe direction has to match what your eyes see, and a mirrored board would turn every rightward swipe into leftward movement.",
    ],

    howToPlay: [
      { title: "Pick a board", body: "Kids, classic or hard. Choosing starts a clean game." },
      { title: "Swipe", body: "A finger in any direction, or arrow keys. The whole board moves at once." },
      { title: "Merge", body: "Two matching numbers that meet during a move become one doubled tile." },
      { title: "Score", body: "Every merge adds the new tile's value to your score." },
      { title: "Keep going", body: "Hitting the target pauses to celebrate, then hands the board back." },
    ],

    tips: [
      {
        title: "Pick a corner and stay",
        body: "Keep your biggest tile in one fixed corner and only swipe the two directions that feed it. In our measurement that one habit doubled the result.",
      },
      {
        title: "The fourth direction is a trap",
        body: "The swipe that pulls your big tile away from its corner looks tempting when the board jams. It is the one that undoes the structure you built.",
      },
      {
        title: "Build a descending row",
        body: "Tiles ordered large to small along an edge chain together on a single swipe. That is why the corner works at all.",
      },
      {
        title: "Skip cheap merges",
        body: "Two 4s at the wrong end of the board are worth less than the mess they cost you.",
      },
    ],

    teaches: [
      { title: "Thinking a move ahead", body: "Every swipe changes the entire board, so one move of foresight goes a long way." },
      {
        title: "Powers of two",
        body: "2, 4, 8, 16 and upward. After one game a child knows that sequence by heart without anyone teaching it.",
      },
      { title: "Delaying a reward", body: "The move that scores now is often not the move that leaves a workable board." },
      {
        title: "Handling an ending",
        body: "The game always ends. Learning to start again without frustration is half the skill.",
      },
    ],

    ages: [
      { title: "5 to 6", body: "The kids board. Low target, wide board, so even aimless swiping makes progress." },
      { title: "7 to 9", body: "Kids first, then classic. This is where a corner replaces swiping wherever." },
      { title: "10 and up", body: "Classic, and the small board when they want a real fight." },
      {
        title: "Adults",
        body: "A 2048 tile on the classic board requires 1,024 separate 2-tiles to spawn and merge. That is not one evening's work.",
      },
    ],

    accessibility:
      "Swipe or arrow keys, never a precise drag of an individual tile. It plays one-handed and needs no sustained press. Tiles are told apart by the number printed on them rather than only by background colour, so colour blindness changes nothing, and each tile carries a spoken label for screen readers. The board shrinks to fit any screen and stays square. Nothing flashes, there is no clock, and no part of the game is timed.",

    together: [
      { title: "Alternate swipes", body: "One move each on the same board. Shared score, shared blame." },
      {
        title: "Say it first",
        body: "Announce where you are going and why before your finger moves. You hear immediately whether there was a plan.",
      },
      { title: "Two-device race", body: "Same board size, two phones, first to 256." },
      {
        title: "Number hunt",
        body: "With a young child, ask them to find the 16 on the board. It turns the game into number reading.",
      },
    ],

    faq: [
      {
        q: "Is 2048 free here?",
        a: "Completely. Nothing to pay, no purchases inside the game, no paid version with extra boards. Every game on the site is open immediately.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
      },
      {
        q: "Can I keep playing after reaching 2048?",
        a: "Yes. The target pauses the game to celebrate and then gives the board back. From there you are racing your score rather than the target.",
      },
      {
        q: "What is the difference between the three boards?",
        a: "How much room you get. Kids is 5x5 to 256, classic is 4x4 to 2048, hard is 3x3 to 512. In our simulation a random player wins 94% of kids games and never wins on the other two.",
      },
      { q: "Are there ads?", a: "None. No banners and no video between levels." },
      {
        q: "Does it work offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "Why does the board not mirror in Hebrew?",
        a: "Because swipe direction has to match what you see. A mirrored board would turn every rightward swipe into leftward movement, which is exactly the kind of bug that breaks a whole game.",
      },
      {
        q: "How is the record measured?",
        a: "In points, where higher is better. It is one record across all three boards rather than one per board, because it predates the split and separating it would have erased the score of everyone who already played.",
      },
      {
        q: "What age is this for?",
        a: "The kids board from about five, if the child recognises numbers. There is no reading anywhere in the game. The classic board holds adults fine.",
      },
      {
        q: "Does it collect data about my child?",
        a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
      },
    ],

    keywords: ["2048", "number game", "puzzle", "tiles", "merge", "free game"],
  },

  provenance: [
    {
      claim: "random play averages best tile 105 classic / 517 kids / 28 hard; corner strategy 198 / 714 / 46; 1,500 games per board",
      source: "scripts/sim/n2048-reach.mjs",
    },
    {
      claim: "a random player reaches the kids target in 94% of games and the other two targets never",
      source: "scripts/sim/n2048-reach.mjs",
    },
    {
      claim: "average game length 509 kids / 116 classic / 30 hard moves under random play",
      source: "scripts/sim/n2048-reach.mjs",
    },
    {
      claim: "board sizes and targets: 5x5 to 256, 4x4 to 2048, 3x3 to 512; 1,024 spawns needed for a 2048 tile",
      source: "src/games/n2048/logic.ts",
    },
    {
      claim: "the record is points, higher is better, on the default board across all three levels",
      source: "src/sdk/score.ts",
    },
  ],
};
