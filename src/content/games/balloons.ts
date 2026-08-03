import type { GameContent } from "../types";

/**
 * The page's admission and its statistic are both about the same design choice:
 * a colour game that a colour-blind child can play, because every colour also
 * carries a shape.
 *
 * The other number worth the page is the bounded gap. A probability alone cannot
 * promise a four-year-old that the colour they were asked for will actually turn
 * up - a fair coin runs cold - so after two non-targets the next balloon IS the
 * target. `FORCE_TARGET_AFTER` is that promise in code.
 */
export const balloons: GameContent = {
  id: "balloons",

  he: {
    metaTitle: "פוצצו בלונים - משחק צבעים לילדים | Ellaz",
    metaDescription:
      "משחק בלונים חינם לילדים בעברית. מבקשים צבע, ופוצצים רק את הבלונים שלו. בלי הורדה ובלי הרשמה.",

    lede: "משחק בלונים חינם לילדים. המסך מבקש צבע, בלונים בכל הצבעים עולים למעלה, והילד פוצץ רק את אלה שמתאימים. לחיצה על הצבע הלא נכון לא עולה כלום.",

    body: [
      "בלונים עולים. כתוב איזה צבע מבקשים. נוגעים בהם, והם מתפוצצים.",

      "הבטחה אחת מחזיקה את המשחק הזה: הבלון שביקשנו תמיד יגיע. זה נשמע מובן מאליו עד שחושבים על מטבע הוגן, שיכול בקלות להוציא שמונה בלונים כחולים ברצף לילד שביקשו ממנו אדום. ילד בן ארבע מול מסך שאין בו כלום לעשות לא חושב שהוא צריך סבלנות, הוא חושב שהמשחק שבור. אז אחרי שני בלונים שאינם המבוקש, הבא הוא המבוקש. לא בהסתברות גבוהה, אלא בוודאות. הפער חסום, וזו ההבטחה, לא הקצב.",

      "וכל צבע נושא גם צורה. כוכב, נקודות, פסים, לב וזיגזג מצוירים על גוף הבלון, אחד לכל צבע. בערך ילד אחד מכל שנים עשר בנים לא מפריד בין הגוונים האלה, ומשחק שכל השאלה שלו היא איזה צבע זה היה נשאר בשבילו בלתי אפשרי בזמן שהוא נראה מצוין לכל מי שבודק אותו. עם הצורה הוא פשוט משחק.",

      "אין ניקוד שיורד ואין לב שנשבר. שום מונה במשחק הזה לא יודע לרדת, וזה לא מדיניות אלא מבנה. ילד שנוגע בבלון הלא נכון רואה אותו מתפוצץ וממשיך.",

      "שלוש רמות שמשנות שני דברים: כמה בלונים צריך לפוצץ כדי לסיים סיבוב, חמישה, שבעה או תשעה, וכמה זמן כל בלון נשאר על המסך. גם ברמה הקשה יש 2.4 שניות לראות בלון, להחליט ולהגיע אליו, ובקלה יש 4.2. הסיבובים ממשיכים בלי סוף והמספר שנשמר הוא כמה רחוק הגעתם.",
    ],

    howToPlay: [
      { title: "מסתכלים על הבקשה", body: "למעלה כתוב וגם מצויר איזה צבע מחפשים עכשיו." },
      { title: "נוגעים בבלון המתאים", body: "נגיעה אחת מפוצצת אותו. אין צורך להחזיק או לגרור." },
      { title: "ממשיכים לפי הצורה", body: "אם הצבעים מתבלבלים, הסימן שעל הבלון אומר את אותו דבר." },
      { title: "מסיימים סיבוב", body: "כשפוצצתם מספיק בלונים מהצבע המבוקש, הסיבוב נגמר ומתחיל אחד חדש." },
    ],

    tips: [
      {
        title: "לחכות שהוא יגיע",
        body: "הבלון המבוקש חייב להופיע בתוך שניים. אפשר פשוט להסתכל במקום לרדוף אחרי מה שיש.",
      },
      {
        title: "להסתכל על הסימן",
        body: "הצורה על הבלון מהירה יותר לזיהוי מהגוון, גם למי שרואה צבעים מצוין.",
      },
      {
        title: "לתפוס למטה",
        body: "בלון בתחתית המסך נשאר זמין הכי הרבה זמן. מי שנוגע בו מיד מרוויח שנייה שלמה.",
      },
      {
        title: "להתחיל בקל",
        body: "ברמה הקלה בלון נשאר 4.2 שניות מול 2.4 בקשה. זה ההבדל בין לחשוב לבין להספיק.",
      },
    ],

    teaches: [
      { title: "שמות צבעים", body: "הבקשה חוזרת בכל סיבוב, אז השם והגוון נצמדים זה לזה מעצמם." },
      {
        title: "לעצור לפני שנוגעים",
        body: "יש בלונים שאסור לפוצץ, וזה הופך את המשחק לתרגיל בשליטה ולא במהירות.",
      },
      { title: "מעקב בעיניים", body: "בלון שעולה דורש עין שזזה איתו ואצבע שמגיעה לאן שהוא יהיה." },
      {
        title: "לזהות לפי צורה",
        body: "הסימן שעל הבלון מלמד לקרוא תכונה שנייה של אותו אובייקט, וזו מיומנות שימושית.",
      },
    ],

    ages: [
      { title: "2 עד 3", body: "רמה קלה, ורצוי בחיק של מבוגר. בגיל הזה הכיף הוא בהתפוצצות עצמה." },
      { title: "4 עד 5", body: "קלה לבד. כאן שמות הצבעים באמת נדבקים." },
      { title: "6 ומעלה", body: "בינונית או קשה, בשביל הקצב." },
      {
        title: "הורים",
        body: "אין פה שום דבר לאבד, אז אפשר להשאיר ילד לבד עם המסך בלי לחזור לבכי.",
      },
    ],

    accessibility:
      "נגיעה אחת, בלי גרירה ובלי החזקה ממושכת, כך שגם אמצעי קלט חלופי או יד קטנה שעדיין לא מדייקת מספיקים. כל בלון גדול מ-2 על 2 סנטימטרים בכל מסך. כל צבע נושא צורה משלו, אז עיוורון צבעים לא חוסם את המשחק בשום רמה, וזו הסיבה שהצורות קיימות מלכתחילה. אין הבהובים מהירים, אין שעון ואין רעש הכרחי. הבקשה מופיעה גם כטקסט וגם כציור, אז ילד שעדיין לא קורא מבין אותה לבד.",

    together: [
      { title: "להכריז את הצבע", body: "בקשו מהילד להגיד את שם הצבע בקול לפני הנגיעה. זה הופך משחק לשיעור." },
      {
        title: "לתפוס רק אתם",
        body: "הילד מכריז ואתם נוגעים. פתאום מתברר אם הוא באמת מזהה או פשוט מנחש.",
      },
      { title: "לספור ביחד", body: "כמה בלונים אדומים עלו בסיבוב הזה? התשובה פחות חשובה מהספירה." },
      {
        title: "לצוד צורה",
        body: "שחקו סיבוב שבו מחפשים את הכוכב ולא את האדום. אותו משחק, שאלה אחרת לגמרי.",
      },
    ],

    faq: [
      {
        q: "משחק הבלונים חינמי?",
        a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. כל המשחקים באתר פתוחים מהרגע הראשון.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
      },
      {
        q: "מה קורה אם הילד נוגע בצבע הלא נכון?",
        a: "הבלון מתפוצץ וזהו. אין ניקוד שיורד, אין חיים שנגמרים ואין צליל של טעות. שום מונה במשחק לא יודע לרדת.",
      },
      {
        q: "הילד שלי מתקשה להבחין בין אדום לירוק. אפשר לשחק?",
        a: "כן, וזו הסיבה שכל בלון נושא גם צורה. כוכב, נקודות, פסים, לב או זיגזג, אחד לכל צבע, ואפשר לשחק את כל המשחק לפי הסימן בלבד.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "מה אם הצבע שביקשו לא מגיע?",
        a: "הוא חייב להגיע. אחרי שני בלונים שאינם המבוקש, הבא הוא המבוקש בוודאות. זו לא הסתברות גבוהה אלא כלל.",
      },
      {
        q: "מאיזה גיל זה מתאים?",
        a: "מגיל שנתיים בערך עם מבוגר, ומארבע לבד. אין קריאה הכרחית: הבקשה מופיעה גם כציור.",
      },
      {
        q: "איך השיא נמדד?",
        a: "בכמה סיבובים הצלחתם לעבור ברצף, כשיותר זה טוב יותר, ובנפרד לכל רמה. הרמות משנות את מספר הבלונים לסיבוב ואת הקצב, אז הן לא ניתנות להשוואה.",
      },
      {
        q: "המשחק אוסף מידע על הילד?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["בלונים", "צבעים", "לגיל הרך", "משחק לילדים", "נגיעה", "לימוד צבעים"],
  },

  en: {
    metaTitle: "Pop the Balloons - Free Colour Game for Kids | Ellaz",
    metaDescription:
      "A free balloon popping game for young children. A colour is named, balloons drift up, pop the matching ones. No signup.",

    lede: "A free balloon game for young children. The screen asks for a colour, balloons of every colour drift upward, and your child pops only the matching ones. Touching the wrong one costs nothing at all.",

    body: [
      "Balloons rise. A colour is named. Touch them and they pop.",

      "One promise holds this game together, and it sounds obvious until you think about a fair coin. A fair coin will happily produce eight blue balloons in a row for a child who was asked for red. A four-year-old looking at a screen with nothing to do on it does not conclude that patience is required, they conclude the game is broken. So after two balloons that are not the one asked for, the next one is. Not with high probability. With certainty. The bounded gap is the promise, and the rate is not.",

      "Every colour also carries a shape. A star, dots, stripes, a heart and a zigzag, drawn on the balloon body, one per colour. Roughly one boy in twelve cannot reliably separate these hues, and a game whose entire question is which colour that was would be unplayable for him while looking perfectly fine to everybody testing it. With the shape, he simply plays.",

      "There is no score that falls and no heart that breaks. Not one counter in this game knows how to go down, which is structure rather than policy. A child who touches the wrong balloon watches it pop and carries on.",

      "Three levels change two things: how many balloons finish a round, five, seven or nine, and how long each balloon stays on screen. Even on hard there are 2.4 seconds to spot a balloon, decide, and reach it, and on easy there are 4.2. Rounds continue without end, and the number kept is how far you got.",
    ],

    howToPlay: [
      { title: "Read the request", body: "The colour being asked for is written and drawn at the top." },
      { title: "Touch a matching balloon", body: "One tap pops it. No holding and no dragging." },
      { title: "Use the shape if you prefer", body: "If the colours blur, the mark on the balloon says the same thing." },
      { title: "Finish the round", body: "Pop enough of the right colour and the round ends and another starts." },
    ],

    tips: [
      {
        title: "Wait for it",
        body: "The colour you were asked for has to appear within two balloons. You can watch instead of chasing whatever is there.",
      },
      {
        title: "Read the mark",
        body: "The shape on the balloon is faster to recognise than the hue, even for people with perfect colour vision.",
      },
      {
        title: "Catch them low",
        body: "A balloon near the bottom of the screen stays reachable longest. Touching it straight away buys you a whole second.",
      },
      {
        title: "Start on easy",
        body: "Easy leaves a balloon up for 4.2 seconds against 2.4 on hard. That is the difference between thinking and rushing.",
      },
    ],

    teaches: [
      { title: "Colour names", body: "The request repeats every round, so the word and the hue attach to each other by themselves." },
      {
        title: "Stopping before touching",
        body: "Some balloons must be left alone, which makes this an exercise in control rather than speed.",
      },
      { title: "Eye tracking", body: "A rising balloon needs an eye that follows it and a finger that arrives where it will be." },
      {
        title: "Reading a second property",
        body: "The mark teaches a child that one object can be identified two ways, which turns out to be useful everywhere.",
      },
    ],

    ages: [
      { title: "2 to 3", body: "Easy, and usually on a lap. At this age the popping is the fun." },
      { title: "4 to 5", body: "Easy alone. This is where the colour names actually stick." },
      { title: "6 and up", body: "Medium or hard, for the pace." },
      {
        title: "Parents",
        body: "Nothing here can be lost, so you can hand over the screen and not come back to tears.",
      },
    ],

    accessibility:
      "One tap, no dragging and no sustained press, so an alternative input device or a small imprecise hand both work. Every balloon is larger than 2cm square on any screen. Each colour carries its own shape, so colour blindness does not block the game at any level, which is why the shapes exist at all. Nothing flashes quickly, there is no clock, and no sound is required. The request appears as a picture as well as text, so a child who cannot read yet understands it alone.",

    together: [
      { title: "Say the colour", body: "Ask your child to name the colour out loud before touching. It turns a game into a lesson." },
      {
        title: "You do the popping",
        body: "They call it, you tap. You find out quickly whether they are recognising or guessing.",
      },
      { title: "Count together", body: "How many red ones came up that round? The answer matters less than the counting." },
      {
        title: "Hunt the shape",
        body: "Play a round looking for the star instead of the red. Same game, completely different question.",
      },
    ],

    faq: [
      {
        q: "Is the balloon game free?",
        a: "Completely. Nothing to pay and no purchases inside the game. Every game on the site is open from the first second.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
      },
      {
        q: "What happens if my child pops the wrong colour?",
        a: "It pops, and that is all. No score drops, no lives run out, and there is no error sound. Not one counter in this game knows how to go down.",
      },
      {
        q: "My child struggles to tell red from green. Can they play?",
        a: "Yes, and that is exactly why every balloon carries a shape as well. A star, dots, stripes, a heart or a zigzag, one per colour, and the entire game can be played by the mark alone.",
      },
      { q: "Are there ads?", a: "None. No banners and no video between levels." },
      {
        q: "Does it work offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "What if the colour we were asked for never appears?",
        a: "It has to appear. After two balloons that are not it, the next one is, guaranteed rather than merely likely.",
      },
      {
        q: "What age is this for?",
        a: "From about two with an adult, and from four alone. No reading is required because the request is drawn as well as written.",
      },
      {
        q: "How is the record measured?",
        a: "By how many rounds you cleared in a row, where higher is better, kept separately per level. The levels change both the balloons per round and the pace, so they are not comparable.",
      },
      {
        q: "Does it collect data about my child?",
        a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
      },
    ],

    keywords: ["balloons", "colours", "toddler game", "preschool", "tapping", "learn colours"],
  },

  provenance: [
    {
      claim: "a balloon stays on screen 4.2s on easy, 3.2s on medium and 2.4s on hard",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "after two non-target balloons the next one is the target, with certainty",
      source: "src/games/balloons/logic.ts",
    },
    {
      claim: "five colours, each carrying a distinct shape cue; round goals of 5, 7 and 9",
      source: "src/games/balloons/logic.ts",
    },
    {
      claim: "the record counts rounds cleared, higher is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
