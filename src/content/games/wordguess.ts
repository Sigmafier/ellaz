import type { GameContent } from "../types";

/**
 * The English is NOT a translation of the Hebrew. It opens on a different
 * example, quotes the English list's own numbers rather than converting the
 * Hebrew ones, and makes its admission from a different angle. Same facts,
 * written twice.
 *
 * Every figure here comes from `scripts/sim/wordguess-openers.mjs`, which
 * parses the real word lists out of `src/games/wordguess/words.ts` and replays
 * the game's own two-pass marking rule. Change a list and the numbers move.
 */
export const wordguess: GameContent = {
  id: "wordguess",

  he: {
    metaTitle: "נחשו מילה - משחק מילים בעברית חינם | Ellaz",
    metaDescription:
      "משחק ניחוש מילים בעברית, חינם בדפדפן. 6 ניסיונות, מילים של 4, 5 או 6 אותיות. בלי הורדה ובלי הרשמה.",

    lede: "משחק ניחוש מילים בעברית, חינם, ישר בדפדפן. יש לכם 6 ניסיונות לגלות את המילה, וכל ניחוש צובע את האותיות: ירוק אומר במקום הנכון, סגול אומר נמצאת במילה אבל לא כאן.",

    body: [
      "בוחרים אורך מילה, מקלידים ניחוש, ולוחצים בדיקה. האותיות נצבעות. זהו. משם זו כבר עבודת בילוש: מה שהצבעים גילו מצמצם את הרשימה, וכל שורה נוספת מצמצמת אותה עוד.",

      "ומה זו בעצם פתיחה טובה? בדקנו. הרצנו כל מילה ברשימה שלנו כניחוש ראשון נגד כל התשובות האפשריות, וספרנו כמה מילים נשארות עומדות אחרי שהצבעים חוזרים. ברשימה של 4 אותיות יש 69 מילים. הפתיחה מורה מצמצמת אותן ל-6.19 בממוצע, והיא הטובה ביותר שיש לנו. הגרועה ביותר היא פרפר, שמשאירה 33.23 מילים על השולחן, כלומר כמעט חצי מהרשימה. ההבדל ביניהן הוא לא אורך והוא לא מזל. פרפר משתמשת בארבע אותיות אבל רק בשתיים שונות, אז היא שואלת חצי שאלה. מורה שואלת ארבע.",

      "עברית מוסיפה כאן פיתול משלה. אות סופית היא אותה אות בדיוק: ם היא מ, ן היא נ. המקלדת מציעה רק את הצורה הרגילה, וכשהמילה נסגרת האות משנה צורה בעצמה. אתם לא צריכים לחשוב על זה.",

      "וההודאה שלנו, כי היא תחסוך לכם אכזבה: רשימת שש האותיות קצרה. יש בה 21 מילים בסך הכול, אז אחרי כמה סיבובים תפגשו מילה שכבר ניחשתם. אנחנו יודעים. רשימה ארוכה יותר בעברית דורשת מילים נדירות יותר, ומילה נדירה בלי ניקוד היא מילה שילד לא יכול להגות, ולכן גם לא יכול לנחש. העדפנו רשימה קצרה שכולה מילים שבאמת משתמשים בהן. הרמה של 4 אותיות היא המקום להתחיל בו.",

      "הכול נשמר על המכשיר עצמו. סגרתם באמצע מילה? היא מחכה בדיוק איפה שהשארתם אותה, עם הרצף שצברתם.",
    ],

    howToPlay: [
      { title: "בוחרים אורך", body: "4, 5 או 6 אותיות. אפשר להחליף מתי שרוצים, והרצף מתחיל מחדש." },
      { title: "מקלידים ניחוש", body: "כל מילה באורך הנכון מתקבלת. אין רשימה סודית שפוסלת אתכם." },
      { title: "קוראים את הצבעים", body: "ירוק במקום, סגול נמצאת אבל במקום אחר, אפור לא במילה." },
      { title: "מצמצמים", body: "הניחוש הבא צריך לבדוק אותיות שעוד לא בדקתם, לא לחזור על מה שכבר ידוע." },
      { title: "מגלים", body: "פתרתם? הרצף עולה באחד, ומגיעה מילה חדשה. פספסתם 6 פעמים? המילה מתגלה והרצף מתאפס." },
    ],

    tips: [
      {
        title: "אל תבזבזו אות פעמיים",
        body: "פרפר היא הפתיחה הגרועה ברשימה שלנו בדיוק בגלל זה. ארבע משבצות, שתי אותיות. פתחו במילה שכל האותיות בה שונות.",
      },
      {
        title: "ו ו-י הן כמעט תמיד שם",
        body: "בעברית בלי ניקוד האותיות האלה נושאות את התנועות, אז הן מופיעות בהמון מילים. זה הופך אותן לזולות לבדוק ויקרות להתעלם מהן.",
      },
      {
        title: "סגול הוא מידע, לא כישלון",
        body: "אות סגולה אומרת לכם שני דברים בבת אחת: היא במילה, והמקום שניסיתם שגוי. זה שני חלקי מידע ממשבצת אחת.",
      },
      {
        title: "השורה השנייה חשובה מהראשונה",
        body: "אחרי הניחוש הראשון נשארות בממוצע 6 מילים ברמה הקלה. שם המשחק נחתך, לא בשורה האחרונה.",
      },
    ],

    teaches: [
      {
        title: "איות",
        body: "כדי לנחש צריך להרכיב מילה שלמה מאותיות, שוב ושוב. זה בדיוק התרגיל, והוא נעים מספיק כדי שיחזרו אליו.",
      },
      {
        title: "אותיות סופיות",
        body: "המשחק כותב אותן נכון לבד בכל פעם שמילה נסגרת, אז ילד רואה את הכלל עשרות פעמים בלי שאף אחד לימד אותו.",
      },
      {
        title: "הסקה מראיות",
        body: "כל שורה היא ראיה, והשורה הבאה היא מה שעשיתם איתה. זו חשיבה לוגית בתחפושת של משחק מילים.",
      },
      {
        title: "סבלנות",
        body: "6 ניסיונות זה הרבה. אין שעון, ואף אחד לא ממהר אתכם.",
      },
    ],

    ages: [
      {
        title: "מגיל 7 ומעלה",
        body: "צריך לדעת לקרוא ולכתוב מילים פשוטות. מתחת לזה המשחק פשוט לא נגיש, ולכן הוא לא מסומן כמשחק לגיל הרך.",
      },
      {
        title: "כיתות ב עד ד",
        body: "הרמה של 4 אותיות בנויה בדיוק להם. כל המילים ברשימה הן דברים מהבית, מהכיתה ומהצלחת.",
      },
      {
        title: "מבוגרים",
        body: "6 אותיות זה אתגר אמיתי גם למבוגר, במיוחד כשמנסים לשבור רצף ארוך.",
      },
    ],

    accessibility:
      "כל המקשים גדולים מ-44 פיקסלים, אפשר לשחק במקלדת פיזית או במקלדת שעל המסך, והצבעים נבחרו כך שירוק וסגול נבדלים גם בבהירות ולא רק בגוון. אחרי פתרון המשחק גם מקריא את המילה בקול, כתוספת ולא כתחליף: המילה תמיד כתובה על המסך.",

    together: [
      {
        title: "תורות",
        body: "כל אחד מציע ניחוש בתורו. הילד מקליד, המבוגר מסביר למה דווקא המילה הזאת.",
      },
      {
        title: "לנחש בקול",
        body: "לפני שלוחצים בדיקה, אמרו למה בחרתם. זה הופך ניחוש למחשבה, וזה החלק שנשאר.",
      },
      {
        title: "לשבור שיא ביחד",
        body: "הרצף נשמר לפי רמה. נסו לעבור את השיא של אתמול בלי להוריד רמה, זה הכלל היחיד.",
      },
    ],

    faq: [
      {
        q: "המשחק בחינם?",
        a: "כן. אין תשלום, אין פרסומות ואין הרשמה. פותחים ומשחקים.",
      },
      {
        q: "צריך להוריד אפליקציה?",
        a: "לא. הכול רץ בדפדפן, גם בטלפון וגם במחשב, וגם בלי אינטרנט אחרי הביקור הראשון.",
      },
      {
        q: "אפשר לנחש מילה שלא ברשימה?",
        a: "כן, וזה מכוון. כל מילה באורך הנכון מתקבלת ונצבעת. הרשימה קובעת מה יכולה להיות התשובה, לא מה מותר לכם לנסות.",
      },
      {
        q: "איך כותבים אות סופית?",
        a: "לא כותבים. מקלידים את הצורה הרגילה, והמשחק הופך אותה לסופית כשהיא נופלת בסוף המילה.",
      },
      {
        q: "מה נשמר, ואיפה?",
        a: "המילה שבאמצע, הרצף הנוכחי והשיא לכל רמה, הכול על המכשיר עצמו. אין חשבון, ולכן טלפון וטאבלט הם שני שחקנים נפרדים.",
      },
      {
        q: "מה קורה כשנגמרים הניסיונות?",
        a: "המילה מתגלה, הרצף מתאפס, ומתחילה מילה חדשה. אין עונש מעבר לזה.",
      },
    ],

    keywords: [
      "משחק מילים בעברית",
      "ניחוש מילים",
      "משחק מילים חינם",
      "משחקי מילים אונליין",
      "משחק אותיות",
      "חידות מילים",
    ],
  },

  en: {
    metaTitle: "Word Guess - free online word game | Ellaz",
    metaDescription:
      "A free word-guessing game in your browser. Six tries, words of 4, 5 or 6 letters, in English or Hebrew. No download, no account.",

    lede: "Guess the hidden word in six tries. Every guess colours its letters: green means right letter, right place, and purple means the letter is in the word but somewhere else.",

    body: [
      "Pick a length. Type a word. Read the colours. That is the whole game, and it takes about ten seconds to learn.",

      "The interesting question is which word to open with, so we measured it rather than guessing. Every word in a list was played as a first guess against every possible answer, and we counted how many candidates survive once the colours come back. Our 4-letter English list holds 53 words. Opening with road cuts that to 4.81 on average, the best we have. Opening with plum leaves 20.36 standing, which is well over a third of the list. The gap has nothing to do with how common the words are. Plum spends its four tiles on four different letters but three of them are rare; road spends its on letters that actually split the list in half.",

      "Repeated letters are the expensive mistake. Banana looks like a fine six-letter opener and leaves 7 words standing where planet leaves 1.27, because banana is really only asking about three letters. Pizza does the same thing at five.",

      "Here is the honest limit, and it will save you a mild disappointment: the lists are short. Fifty-three four-letter words, 47 at five, 37 at six. Play for twenty minutes and a word will come round again. We chose that on purpose. A longer list means reaching for words a child has never met, and a word you cannot read is a word you cannot guess, so we kept every entry to something concrete that turns up in an ordinary day.",

      "Nothing leaves the device. Close the tab mid-word and it is waiting where you left it, streak included.",
    ],

    howToPlay: [
      { title: "Choose a length", body: "Four, five or six letters. Switch whenever you like; the streak restarts." },
      { title: "Type a guess", body: "Any word of the right length is accepted. There is no secret dictionary rejecting you." },
      { title: "Read the tiles", body: "Green is in place, purple is in the word elsewhere, grey is not in the word at all." },
      { title: "Narrow it down", body: "Spend the next guess on letters you have not tested yet, rather than confirming what you already know." },
      { title: "Solve it", body: "A solve adds one to your streak and deals a new word. Six misses reveals the answer and resets the streak to zero." },
    ],

    tips: [
      {
        title: "Never spend a letter twice",
        body: "Banana is the worst six-letter opener we have for exactly this reason. Six tiles, three letters. Open with a word whose letters are all different.",
      },
      {
        title: "Vowels are cheap information",
        body: "They turn up in almost everything, so testing them early costs one guess and rules out a great deal. Road and rain both score well on this alone.",
      },
      {
        title: "Purple is a gift",
        body: "It tells you two things from one tile: the letter belongs, and the position you tried is wrong. Grey only ever tells you one.",
      },
      {
        title: "Guess two decides the game",
        body: "After a good opener at four letters you are down to roughly 5 candidates. That is where a round is won, not on the last row.",
      },
    ],

    teaches: [
      {
        title: "Spelling under pressure",
        body: "You have to assemble a whole word from letters, then do it again with better information. That is the drill, and it does not feel like one.",
      },
      {
        title: "Deduction",
        body: "Each row is evidence and the next row is what you did with it. Word game on the surface, logic underneath.",
      },
      {
        title: "Letter frequency",
        body: "Play a while and you start to feel which letters earn their place in an opener. Nobody teaches this. The scoreboard does.",
      },
      {
        title: "Patience",
        body: "Six tries is generous. There is no clock.",
      },
    ],

    ages: [
      {
        title: "Seven and up",
        body: "Reading and spelling simple words is the entry requirement, which is why this one is not filed under our pre-reading games.",
      },
      {
        title: "School age",
        body: "The four-letter level is built for this group. Every answer is a concrete everyday thing: food, animals, weather, things in a room.",
      },
      {
        title: "Grown-ups",
        body: "Six letters is a real puzzle, particularly once you are protecting a long streak.",
      },
    ],

    accessibility:
      "Every key clears 44 pixels, the game takes a physical keyboard as happily as the on-screen one, and green and purple were picked to differ in lightness as well as hue so they stay distinguishable to a colour-blind player. A solved word is also read aloud, as a bonus rather than a requirement: the word is always on screen in letters.",

    together: [
      {
        title: "Alternate guesses",
        body: "One guess each. The child types, the adult explains why that word and not another.",
      },
      {
        title: "Say it before you press",
        body: "Announce what the guess is testing before submitting. It turns a hunch into reasoning, and the reasoning is the part that sticks.",
      },
      {
        title: "Chase one streak",
        body: "The record is kept per length. Beat yesterday's without dropping to an easier level.",
      },
    ],

    faq: [
      {
        q: "Is it free?",
        a: "Yes. No payment, no ads, no sign-up. Open it and play.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. It runs in the browser on a phone, tablet or computer, and it keeps working offline after your first visit.",
      },
      {
        q: "Can I guess a word that is not in the list?",
        a: "Yes, and that is deliberate. Any word of the right length is marked. The list decides what the answer can be, never what you are allowed to try.",
      },
      {
        q: "Does it work in Hebrew?",
        a: "Yes, and the Hebrew is not a translation of the English. It has its own word lists, its own keyboard, and it handles final letters for you.",
      },
      {
        q: "What gets saved?",
        a: "The word in progress, your current streak and your best streak per length, all on the device. There is no account, so a phone and a tablet keep separate records.",
      },
      {
        q: "What happens when I run out of guesses?",
        a: "The word is revealed, the streak goes back to zero, and a new word is dealt. That is the whole penalty.",
      },
    ],

    keywords: [
      "word guessing game",
      "free word game",
      "online word game",
      "guess the word",
      "letter game",
      "word puzzle browser",
    ],
  },

  provenance: [
    { claim: "4-letter Hebrew list holds 69 words", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "מורה narrows 69 Hebrew words to 6.19 on average", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "פרפר leaves 33.23 Hebrew words standing", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "6-letter Hebrew list holds 21 words", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "English lists hold 53, 47 and 37 words", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "road cuts 53 English words to 4.81", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "plum leaves 20.36 English words standing", source: "scripts/sim/wordguess-openers.mjs" },
    { claim: "banana leaves 7 where planet leaves 1.27", source: "scripts/sim/wordguess-openers.mjs" },
  ],
};
