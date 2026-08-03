import type { GameContent } from "../types";

/**
 * The hidden-object game. Its statistic is the crowd-to-target ratio, which is
 * what "harder" actually means here: 16 objects hiding 3 on easy against 32
 * hiding 5 on hard, so the search space roughly doubles while the number of
 * things to find barely moves.
 *
 * Unlike finddiff, the scene is generated fresh every round rather than drawn
 * from a fixed pool, so this one does not run out of content.
 */
export const hidden: GameContent = {
  id: "hidden",

  he: {
    metaTitle: "מצא אותי - משחק חיפוש חפצים לילדים | Ellaz",
    metaDescription:
      "משחק חיפוש חינם לילדים. מתבקשים למצוא כמה דברים בתוך ערימה, בלי שעון ובלי עונש. בלי הרשמה.",

    lede: "משחק חיפוש חינם לילדים. מסך מלא בחפצים, וכמה מהם מבוקשים. מוצאים אותם בקצב שלכם, בלי שעון ובלי טעויות שעולות משהו.",

    body: [
      "מסך עמוס. כמה דברים מבוקשים. מוצאים אותם.",

      "מה שהרמות משנות פה הוא לא כמה למצוא אלא בתוך כמה לחפש. הקלה פורסת 16 חפצים ומבקשת 3 מהם. הבינונית 24 ומבקשת 4. הקשה 32 ומבקשת 5. כלומר מרחב החיפוש מוכפל בין הקלה לקשה בזמן שמספר המטרות עולה ב-2 בלבד, וזה בדיוק מה שהופך את הקשה לקשה: לא יותר עבודה, אלא יותר מקומות שבהם היא לא נמצאת.",

      "כל סיבוב נבנה מחדש. המיקומים אקראיים והחפצים משתנים, אז אין פה מה לשנן ואין מספר סופי של סצנות שנגמר אחרי שבוע. זה ההבדל המרכזי בינו לבין מצא את ההבדלים, ואם ילד שלכם משחק כל יום, זה המשחק מבין השניים שיחזיק.",

      "אין שעון ואין עונש על נגיעה במקום הלא נכון. אין גם רמז שמופיע אחרי כמה שניות כדי לזרז אתכם. ילד שמסתכל דקה שלמה על אותו רבע מסך עושה בדיוק את מה שהמשחק מבקש.",

      "מונה הסיבובים מתאפס במעבר בין רמות, ולכן גם השיא נשמר בנפרד לכל רמה. סיבוב על 16 חפצים וסיבוב על 32 הם לא אותו הישג.",
    ],

    howToPlay: [
      { title: "בוחרים רמה", body: "16, 24 או 32 חפצים על המסך. משתנה כמה צפוף." },
      { title: "מסתכלים על המבוקשים", body: "3 עד 5 חפצים מוצגים למעלה, גדולים וברורים." },
      { title: "מוצאים ונוגעים", body: "כל אחד מהם נמצא איפשהו בערימה. נגיעה מסמנת אותו." },
      { title: "מסיימים סיבוב", body: "כשמצאתם את כולם מתחיל סיבוב חדש עם פריסה חדשה." },
    ],

    tips: [
      {
        title: "לחפש אחד בכל פעם",
        body: "לא את כל השלושה במקביל. העין מוצאת הרבה יותר מהר כשהיא יודעת מה בדיוק היא מחפשת.",
      },
      {
        title: "לסרוק בשורות",
        body: "משמאל לימין, שורה אחרי שורה. זה נשמע איטי ומוצא מהר יותר מקפיצות אקראיות.",
      },
      {
        title: "לזכור את הצורה, לא את הצבע",
        body: "בערימה צפופה הצבעים מתערבבים. קו המתאר של החפץ בולט יותר.",
      },
      {
        title: "להתחיל ב-16",
        body: "גם ילד גדול שווה שיתחיל ברמה הקלה סיבוב אחד, כדי להבין מה המשחק מבקש.",
      },
    ],

    teaches: [
      { title: "סריקה חזותית", body: "למצוא דבר מוכר בתוך רעש הוא בדיוק מה שקורה כשקוראים, וזה מתאמן פה." },
      { title: "להחזיק מטרה בראש", body: "צריך לזכור מה מחפשים בזמן שסורקים, וזו עבודה של זיכרון עבודה." },
      { title: "התמדה", body: "החפץ האחרון תמיד לוקח זמן. בלי שעון, ילדים ממשיכים במקום לוותר." },
      {
        title: "שיטתיות",
        body: "מי שסורק בסדר מוצא מהר יותר, וילדים מגלים את זה לבד אחרי שני סיבובים.",
      },
    ],

    ages: [
      { title: "3 עד 4", body: "16 חפצים, ורצוי יחד. בגיל הזה גם למצוא אחד זה הישג." },
      { title: "5 עד 6", body: "24. פה מתחילים לסרוק בשיטה במקום לקפוץ." },
      { title: "7 ומעלה", body: "32 חפצים, שזה כבר צפוף גם למבוגר." },
      {
        title: "הורים",
        body: "אין שעון ואין הפסד, אז זה משחק שילד יכול לפתוח ולסגור בלי לקרוא לכם.",
      },
    ],

    accessibility:
      "נגיעה אחת, בלי גרירה ובלי החזקה. החפצים גדולים מ-2 על 2 סנטימטרים ולא חופפים זה את זה, כך שאף פריט אינו מוסתר מאחורי אחר. הזיהוי הוא לפי צורת החפץ ולא לפי צבע, אז עיוורון צבעים לא מפריע. אין שעון, אין ספירה לאחור ואין הבהובים, ואין רמז שמופיע מעצמו כדי לזרז. אין מילה שצריך לקרוא כדי לשחק.",

    together: [
      { title: "לחלק את המסך", body: "אתם על החצי העליון, הילד על התחתון. פתאום זו עבודת צוות." },
      {
        title: "לתאר במקום להצביע",
        body: "מצאתם? תארו איפה זה בלי לגעת. הילד מוצא לפי ההוראה, וזה תרגיל שפה.",
      },
      { title: "לספור לפני", body: "נחשו כמה זמן ייקח למצוא את כולם, ואז בדקו." },
      {
        title: "רמז בחצי",
        body: "כשילד נתקע, אמרו רק באיזה חצי זה נמצא. זה מספיק כמעט תמיד ולא הורס את המציאה.",
      },
    ],

    faq: [
      {
        q: "המשחק חינמי?",
        a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. כל המשחקים באתר פתוחים מהרגע הראשון.",
      },
      {
        q: "צריך להוריד או להירשם?",
        a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
      },
      {
        q: "המשחק נגמר אחרי כמה סצנות?",
        a: "לא. כל סיבוב נבנה מחדש עם מיקומים אקראיים, אז אין מספר סופי של סצנות ואין מה לשנן.",
      },
      {
        q: "מה ההבדל בין הרמות?",
        a: "כמה צפוף. 16 חפצים ו-3 מטרות ברמה הקלה, 24 ו-4 בבינונית, 32 ו-5 בקשה. מרחב החיפוש מוכפל בזמן שמספר המטרות עולה ב-2 בלבד.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "יש שעון או לחץ זמן?",
        a: "אין. גם רמז לא מופיע מעצמו אחרי כמה שניות, כי ילד שמסתכל דקה על אותו אזור עושה בדיוק את מה שהמשחק מבקש.",
      },
      {
        q: "מה קורה כשנוגעים בחפץ הלא נכון?",
        a: "כלום. אין ניקוד שיורד ואין חיים, ואפשר להמשיך לחפש.",
      },
      {
        q: "איך השיא נמדד?",
        a: "בכמה סיבובים עברתם ברצף, כשיותר זה טוב יותר, ובנפרד לכל רמה. סיבוב על 16 חפצים וסיבוב על 32 הם לא אותו הישג.",
      },
      {
        q: "המשחק אוסף מידע על הילד?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["חיפוש חפצים", "מצא אותי", "תשומת לב", "סריקה", "לגיל הרך", "ריכוז"],
  },

  en: {
    metaTitle: "Find Me - Free Hidden Object Game for Kids | Ellaz",
    metaDescription:
      "A free hidden object game for children. Find a few things in a crowd, with no clock and no penalty. No download or signup.",

    lede: "A free searching game for children. A screen full of objects, a few of them wanted. Find them at your own pace, with no clock and no mistakes that cost anything.",

    body: [
      "A crowded screen. A few things wanted. Find them.",

      "What the levels change is not how much to find but how much to search through. Easy scatters 16 objects and asks for 3. Medium scatters 24 and asks for 4. Hard scatters 32 and asks for 5. So the search space doubles between easy and hard while the number of targets rises by only 2, and that is exactly what makes hard hard: not more work, just more places where the thing is not.",

      "Every round is generated fresh. Positions are random and the objects change, so there is nothing to memorise and no finite set of scenes that runs out after a week. That is the main difference between this and spot the difference, and if your child plays daily this is the one of the two that lasts.",

      "There is no clock and no penalty for touching the wrong thing. There is also no hint that appears after a few seconds to hurry you along. A child staring at one quarter of the screen for a full minute is doing precisely what the game asks.",

      "The round counter resets when the difficulty changes, so the record is kept per level too. A round through 16 objects and a round through 32 are not the same achievement.",
    ],

    howToPlay: [
      { title: "Pick a level", body: "16, 24 or 32 objects on screen. What changes is how crowded it gets." },
      { title: "Look at what is wanted", body: "3 to 5 objects are shown at the top, large and clear." },
      { title: "Find and touch", body: "Each of them is somewhere in the pile. A tap marks it found." },
      { title: "Finish the round", body: "Find them all and a new round starts with a fresh scatter." },
    ],

    tips: [
      {
        title: "Search for one at a time",
        body: "Not all three at once. The eye finds things far faster when it knows exactly what it is looking for.",
      },
      {
        title: "Scan in rows",
        body: "Left to right, row after row. It sounds slower and finds things faster than jumping around.",
      },
      {
        title: "Remember the shape, not the colour",
        body: "In a crowded pile the colours blur together. The outline of an object stands out more.",
      },
      {
        title: "Start at 16",
        body: "Even an older child benefits from one round on easy, just to see what the game is asking for.",
      },
    ],

    teaches: [
      { title: "Visual scanning", body: "Finding a known thing inside noise is exactly what happens when reading, and it trains here." },
      { title: "Holding a goal in mind", body: "You have to remember what you are looking for while scanning, which is working memory doing its job." },
      { title: "Persistence", body: "The last object always takes a while. With no clock, children keep going instead of quitting." },
      {
        title: "Being systematic",
        body: "Scanning in order finds things faster, and children discover that themselves after two rounds.",
      },
    ],

    ages: [
      { title: "3 to 4", body: "16 objects, ideally together. Finding one is an achievement at this age." },
      { title: "5 to 6", body: "24. This is where scanning by method replaces jumping around." },
      { title: "7 and up", body: "32 objects, which is crowded even for an adult." },
      {
        title: "Parents",
        body: "No clock and nothing to lose, so a child can open and close this one without calling you.",
      },
    ],

    accessibility:
      "One tap, no dragging and no holding. Objects are larger than 2cm square and do not overlap, so nothing hides behind anything else. Recognition is by object shape rather than colour, so colour blindness does not interfere. No clock, no countdown and nothing flashing, and no hint appears by itself to hurry anybody. There is not one word to read to play.",

    together: [
      { title: "Split the screen", body: "You take the top half, your child takes the bottom. It becomes teamwork." },
      {
        title: "Describe instead of pointing",
        body: "Found one? Describe where without touching. They find it from your directions, which is language practice.",
      },
      { title: "Guess the time", body: "Predict how long finding them all will take, then check." },
      {
        title: "Half a hint",
        body: "When a child is stuck, say only which half it is in. Almost always enough, and it does not spoil the find.",
      },
    ],

    faq: [
      {
        q: "Is the game free?",
        a: "Completely. Nothing to pay and no purchases inside the game. Every game on the site is open from the first second.",
      },
      {
        q: "Do I need to download or sign up?",
        a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
      },
      {
        q: "Does the game run out of scenes?",
        a: "No. Every round is generated fresh with random positions, so there is no finite set of scenes and nothing to memorise.",
      },
      {
        q: "What is the difference between the levels?",
        a: "How crowded it is. 16 objects and 3 targets on easy, 24 and 4 on medium, 32 and 5 on hard. The search space doubles while the number of targets rises by only 2.",
      },
      { q: "Are there ads?", a: "None. No banners and no video between levels." },
      {
        q: "Does it work offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "Is there a timer or time pressure?",
        a: "None. No hint appears by itself after a few seconds either, because a child staring at one area for a minute is doing exactly what the game asks.",
      },
      {
        q: "What happens when they touch the wrong object?",
        a: "Nothing. No score drops and there are no lives, and the searching continues.",
      },
      {
        q: "How is the record measured?",
        a: "By how many rounds you cleared in a row, where higher is better, kept separately per level. A round through 16 objects and a round through 32 are not the same achievement.",
      },
      {
        q: "Does it collect data about my child?",
        a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
      },
    ],

    keywords: ["hidden object", "find me", "searching", "attention", "preschool", "visual scanning"],
  },

  provenance: [
    {
      claim: "16 objects hiding 3 on easy, 24 hiding 4 on medium, 32 hiding 5 on hard",
      source: "src/games/hidden/Hidden.tsx",
    },
    {
      claim: "every round is generated fresh with random positions rather than drawn from a fixed set of scenes",
      source: "src/games/hidden/logic.ts",
    },
    {
      claim: "the record counts rounds cleared, higher is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
