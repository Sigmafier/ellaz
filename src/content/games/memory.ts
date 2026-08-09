import type { GameContent } from "../types";

/**
 * Pilot #1. The voice every other game page is written to.
 *
 * The English is NOT a translation of the Hebrew. It opens differently, orders
 * its sections differently and makes a different joke, because a translation
 * carries the source language's rhythm and that rhythm is precisely what reads
 * as machine-made. Same facts, written twice.
 *
 * Every number here comes from `scripts/sim/memory-moves.mjs` or from the
 * game's own code. See `provenance` at the bottom, and
 * `.claude/rules/game-content-template.md` for why that field is required.
 */
export const memory: GameContent = {
  id: "memory",

  he: {
    metaTitle: "משחק זיכרון לילדים - חינם בעברית | Ellaz",
    metaDescription:
      "משחק זיכרון חינמי בעברית. הופכים שני קלפים ומחפשים זוג, ב-3 רמות. בלי שעון, בלי הורדה ובלי הרשמה.",

    lede: "משחק זיכרון בעברית, חינם, ישר בדפדפן. הופכים שני קלפים ומחפשים זוג. שלוש רמות, בלי שעון, ובלי שום דרך להפסיד.",

    body: [
      "הלוח מתחיל הפוך. נוגעים בקלף, נוגעים בעוד אחד, ורואים אם הם מתאימים. זהו, אלה כל החוקים. ילד בן ארבע קולט אותם בלי שאף אחד יסביר לו.",

      "וכמה מהלכים זה בעצם תוצאה טובה? לא ידענו, אז בדקנו. הרצנו 20,000 משחקים על הלוחות שלנו עצמם: שחקן שזוכר כל קלף שראה מסיים את הרמה הקלה ב-9.2 מהלכים בממוצע, והמינימום התאורטי, בלי טיפת מזל, הוא 6. שחקן שמנחש לגמרי מגיע ל-36. ברמה הקשה הפער נפתח הרבה יותר: 15.6 מול 104.3. המספרים האלה הם בדיוק הסיבה שהשיא אצלנו נמדד במהלכים ולא בשניות. בין 9 ל-36 יש מרחב עצום להשתפר בתוכו, ואת המרחב הזה שעון עצר פשוט לא רואה.",

      "שעון מלמד ילד למהר. מונה מהלכים מלמד אותו לעצור שנייה ולחשוב איפה הוא כבר ראה את הקלף הזה. אלה שני משחקים שונים לגמרי, ובחרנו בשני. ילד שבוהה בלוח דקה שלמה לא מפסיד פה כלום.",

      "שלוש רמות: 6 זוגות, 8 ו-10. וכאן ההודאה שלנו, כי היא חוסכת לכם ערב שלם: הרמה הקשה מתסכלת ילד בן ארבע. עשרה זוגות זה יותר ממה שהוא מחזיק בראש, אז הוא ינחש, יפספס, וירצה לעזוב אחרי דקה. אל תתחילו שם. תתחילו בקלה, ותנו לו לבקש את הבאה בעצמו. הוא יבקש.",

      "הכול נשמר על המכשיר עצמו. אין חשבון, אין סיסמה ואין מייל למלא. המחיר של זה הוא שטלפון וטאבלט הם שני שחקנים נפרדים עם שני שיאים נפרדים. לא ביקשנו מכם שום פרט מזהה, אז אין לנו איך לחבר ביניהם.",
    ],

    howToPlay: [
      { title: "בוחרים רמה", body: "6, 8 או 10 זוגות. אפשר להחליף באמצע, והלוח מתחיל מחדש." },
      { title: "נוגעים בקלף", body: "הוא מתהפך. זהו." },
      { title: "זוכרים מה ראיתם", body: "גם קלף שלא התאים שווה זהב. הוא יחזור." },
      { title: "נוגעים בקלף שני", body: "זהים? נשארים פתוחים. לא? שניהם נסגרים וממשיכים." },
      { title: "מסיימים את הלוח", body: "קונפטי, מטבעות לארנק, ואם שברתם שיא גם כוכב." },
    ],

    tips: [
      {
        title: "סרקו לפי שורות",
        body: "במקום לקפוץ על הלוח, הפכו קלפים בסדר. אתם בונים מפה במקום לאסוף זיכרונות מפוזרים.",
      },
      {
        title: "הקלף הראשון חינם",
        body: "הוא רק אוסף מידע. את כל המחשבה תשקיעו בשני, כי הוא זה שמחליט אם המהלך הצליח.",
      },
      {
        title: "טעות שווה מידע",
        body: "זוג שלא התאים גילה לכם שני מיקומים חדשים. במהלכים זה עלה אחד, בידע זה הרוויח שניים.",
      },
      {
        title: "כשנשארים ארבעה קלפים",
        body: "בשלב הזה כבר ראיתם כמעט הכול. עצרו שנייה לפני שאתם נוגעים, כי פה נחתכים המהלכים המבוזבזים.",
      },
    ],

    teaches: [
      {
        title: "זיכרון חזותי",
        body: "לזכור מה היה איפה זו מיומנות שמתאמנת, והמשחק הזה מאמן בדיוק אותה ולא שום דבר אחר.",
      },
      { title: "ריכוז לאורך זמן", body: "לוח מלא לוקח כמה דקות של תשומת לב רצופה. אף אחד לא מזרז." },
      { title: "חשיבה לפני פעולה", body: "כשסופרים מהלכים ולא שניות, משתלם לעצור. הכלל מלמד את עצמו." },
      { title: "התמודדות עם טעות", body: "קלף שלא התאים נסגר, וממשיכים. אין ממה להירתע." },
    ],

    ages: [
      { title: "3 עד 4", body: "רמה קלה, ובפעם הראשונה יחד. בגיל הזה הכיף הוא בהיפוך עצמו ולא במציאת הזוג." },
      { title: "5 עד 6", body: "קלה לבד, אחר כך בינונית. זה הגיל שבו מתחילים לזכור מיקומים במקום לנחש." },
      { title: "7 ומעלה", body: "קשה. מכאן המרוץ הוא מול השיא האישי, לא מול הלוח." },
      {
        title: "מבוגרים",
        body: "עשרה זוגות מתחת ל-16 מהלכים זו תוצאה טובה מאוד. הסימולציה שלנו, עם זיכרון מושלם, הגיעה ל-15.6.",
      },
    ],

    accessibility:
      "נגיעה אחת. בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. הקלפים גדולים בכוונה: לפחות 2 על 2 סנטימטרים בכל מסך. הזוגות נבדלים בצורה ולא רק בצבע, כך שעיוורון צבעים לא משנה פה כלום. אין הבהובים מהירים. אפשר לשחק בשקט מוחלט מההתחלה ועד הסוף בלי לאבד שום מידע.",

    together: [
      { title: "תור ותור", body: "כל אחד הופך שניים בתורו. מי שמצא זוג ממשיך. אותו לוח, חוקים אחרים סביבו." },
      {
        title: "בקול רם",
        body: "לפני הקלף השני, שאלו איפה לדעתו נמצא הזוג. זה הופך זיכרון פנימי לשיחה, וזה גם הרגע שבו תגלו כמה הוא באמת זוכר.",
      },
      { title: "בלי לספור", body: "לפעמים פשוט התעלמו מהמונה. הוא לא ילך לשום מקום." },
      { title: "ניחוש עיוור", body: "נסו לנחש מה מתחת לקלף עוד לפני שהופכים. הטעויות פה מצחיקות." },
    ],

    faq: [
      {
        q: "האם משחק הזיכרון חינמי?",
        a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. אין גם גרסה מורחבת בכסף, כי אין גרסה אחרת. כל 22 המשחקים באתר פתוחים מהרגע הראשון.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. זה רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
      },
      {
        q: "כמה מהלכים זו תוצאה טובה?",
        a: "הרצנו 20,000 משחקים כדי לענות על זה. זיכרון מושלם מסיים את הרמה הקלה ב-9.2 מהלכים בממוצע ואת הקשה ב-15.6. ניחוש עיוור מגיע ל-36 ול-104.3. כל מה שביניהם זה משחק אמיתי.",
      },
      {
        q: "מאיזה גיל מתאים?",
        a: "הרמה הקלה מגיל שלוש בערך. אין קריאה בשום מקום במשחק, אז ילד שעדיין לא קורא משחק לבד. הרמה הקשה מעסיקה גם מבוגרים.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "איפה נשמר השיא שלי?",
        a: "על המכשיר בלבד, לא בשום שרת. לכן ניקוי היסטוריית הדפדפן מוחק אותו, ולכן טלפון וטאבלט שומרים שני שיאים נפרדים.",
      },
      {
        q: "איך השיא נמדד?",
        a: "במהלכים, כשפחות זה טוב יותר, ובנפרד לכל רמה. שני קלפים שהפכתם נחשבים מהלך אחד.",
      },
      {
        q: "המשחק אוסף מידע על הילד?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["זיכרון", "משחק זיכרון", "קלפים", "ריכוז", "לגיל הרך", "משחקי חשיבה"],
  },

  en: {
    metaTitle: "Free Memory Game for Kids - Play Online | Ellaz",
    metaDescription:
      "A free memory game in your browser. Flip two cards and find a pair, across three levels. No download and no signup.",

    lede: "A free memory game that runs in your browser. Flip two cards, find a pair, finish in as few moves as you can. Three levels, no timer, and no way to lose.",

    body: [
      "The board starts face down. Touch a card, touch another, see whether they match. That is the whole rule set, and a four-year-old picks it up without being told.",

      "So how many moves is a good score? We did not know either, so we measured it. Across 20,000 simulated games on our own boards, a player who remembers every card they have seen finishes the easy level in 9.2 moves on average. The theoretical floor, with no luck involved at all, is 6. Pure guessing takes 36. On hard the gap opens right up: 15.6 against 104.3. That spread is the reason we count moves instead of seconds. A stopwatch cannot see any of it.",

      "A clock teaches a child to hurry. A move counter teaches them to stop for a second and work out where they saw that card before. Those are two different games, and we picked the second one. Staring at the board for a full minute costs nothing here.",

      "Three levels: 6 pairs, 8, and 10. Here is the honest part, and it will save you an evening. The hard level frustrates a four-year-old. Ten pairs is more than they can hold, so they guess, they miss, and they want to stop after a minute. Do not start there. Start on easy and let them ask for the next one. They will ask.",

      "Everything saves on the device itself. No account, no password, and no email to fill in. What that costs you is that a phone and a tablet are two separate players with two separate records. We never asked you for anything identifying, so we have no way to connect them.",
    ],

    howToPlay: [
      { title: "Pick a level", body: "6, 8 or 10 pairs. Switch mid-game and the board restarts." },
      { title: "Touch a card", body: "It flips. That is it." },
      { title: "Remember what you saw", body: "A card that did not match is worth gold. It comes back." },
      { title: "Touch a second card", body: "Same? They stay open. Different? Both close and you carry on." },
      { title: "Clear the board", body: "Confetti, coins into the wallet, and a star if you beat your record." },
    ],

    tips: [
      {
        title: "Sweep in rows",
        body: "Instead of jumping around, turn cards over in order. You are building a map rather than collecting scattered memories.",
      },
      {
        title: "The first card is free",
        body: "It only gathers information. Spend your thinking on the second one, because that is the card that decides whether the move paid off.",
      },
      {
        title: "A miss is information",
        body: "A pair that did not match just showed you two new positions. In moves it cost one. In knowledge it earned two.",
      },
      {
        title: "When four cards are left",
        body: "By now you have seen nearly everything. Stop for a second before you touch anything, because this is where wasted moves get cut.",
      },
    ],

    teaches: [
      {
        title: "Visual memory",
        body: "Remembering what was where is a skill that trains, and this game trains exactly that and nothing else.",
      },
      { title: "Sustained attention", body: "A full board takes a few minutes of unbroken focus. Nobody is rushing." },
      { title: "Thinking before acting", body: "When moves are counted and seconds are not, pausing pays. The rule teaches itself." },
      { title: "Getting a thing wrong", body: "A card that did not match closes, and you carry on. There is nothing to flinch from." },
    ],

    ages: [
      { title: "3 to 4", body: "Easy level, and together the first time. At this age the flip itself is the fun, not the pair." },
      { title: "5 to 6", body: "Easy alone, then medium. This is when they start remembering positions instead of guessing." },
      { title: "7 and up", body: "Hard. From here the race is against their own record rather than the board." },
      {
        title: "Grown-ups",
        body: "Ten pairs in under 16 moves is a genuinely good run. Our simulation, with perfect recall, managed 15.6.",
      },
    ],

    accessibility:
      "One tap. No dragging and no press-and-hold, which means it works with alternative input devices and with a small hand that does not aim well yet. The cards are deliberately large: at least 2 by 2 centimetres on every screen. Pairs differ by shape and not only by colour, so colour blindness changes nothing here. There are no fast flashes. You can play the whole thing in silence without missing any information.",

    together: [
      { title: "Take turns", body: "Each player flips two. Find a pair and you go again. Same board, different rules around it." },
      {
        title: "Out loud",
        body: "Before the second card, ask them where they think its partner is. It turns private memory into a conversation, and it is also the moment you find out how much they actually remember.",
      },
      { title: "Stop counting", body: "Sometimes just ignore the counter. It is not going anywhere." },
      { title: "Guess blind", body: "Try calling what is under a card before you turn it. The mistakes here are the funny part." },
    ],

    faq: [
      {
        q: "Is the memory game free?",
        a: "Completely. There is no payment and there are no in-game purchases. There is no paid version either, because there is no other version. All 22 games on the site are open from the first second.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No. It runs in the browser, with no download and no account. We do not ask for an email either.",
      },
      {
        q: "What counts as a good number of moves?",
        a: "We ran 20,000 games to answer that. Perfect recall clears the easy level in 9.2 moves on average and hard in 15.6. Blind guessing takes 36 and 104.3. Everything in between is a real game.",
      },
      {
        q: "What age is it for?",
        a: "Easy suits about three and up. There is no reading anywhere in the game, so a child who cannot read yet plays alone. Hard still occupies adults.",
      },
      { q: "Are there ads?", a: "None. No banners, and nothing that plays between levels." },
      {
        q: "Can I play offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "Where is my record kept?",
        a: "On the device only, never on a server. So clearing your browser history erases it, and a phone and a tablet keep two separate records.",
      },
      {
        q: "How is the record measured?",
        a: "In moves, where fewer is better, and separately for each level. Two cards flipped counts as one move.",
      },
      {
        q: "Does the game collect information about my child?",
        a: "No. There is no signup and no name. Nothing records the screen, and nothing targets advertising by behaviour. We count how often a game is opened, with nothing attached that says who opened it.",
      },
    ],

    keywords: ["memory", "matching game", "concentration", "cards", "preschool", "brain training"],
  },

  provenance: [
    {
      claim: "20,000 simulated games; easy 9.2 moves with perfect recall, 36 guessing",
      source: "scripts/sim/memory-moves.mjs",
    },
    {
      claim: "hard 15.6 with perfect recall against 104.3 guessing",
      source: "scripts/sim/memory-moves.mjs",
    },
    {
      claim: "theoretical minimum equals the pair count (6 / 8 / 10)",
      source: "scripts/sim/memory-moves.mjs",
    },
    {
      claim: "three levels at 6, 8 and 10 pairs",
      source: "src/games/memory/Memory.tsx",
    },
    {
      claim: "the record is moves, lower is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
