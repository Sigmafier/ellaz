import type { GameContent } from "../types";

/**
 * The letters-and-numbers game, and the page where the interesting decision is
 * a Hebrew one: the five final forms are deliberately absent from the pool.
 *
 * A sofit is the same letter in a different position, not a different letter.
 * Floating a ם past a child who was asked for מ teaches a distinction that does
 * not exist, and accepting both would give one prompt two right answers, which
 * is worse. That is the kind of decision an English-first content pipeline never
 * even encounters, which is exactly why the Hebrew page is written first.
 */
export const bubbles: GameContent = {
  id: "bubbles",

  copy: {
    he: {
      metaTitle: "תפסו בועות - אותיות ומספרים לילדים | Ellaz",
      metaDescription:
        "משחק חינם ללימוד אותיות ומספרים בעברית. מבקשים אות, ותופסים את הבועה שנושאת אותה. בלי הרשמה.",

      lede: "משחק חינם שבו בועות עולות ועל כל אחת אות או ספרה. המסך מבקש אחת מהן, והילד תופס את הבועות שנושאות אותה. שלוש רמות, בלי שעון ובלי דרך להפסיד.",

      body: [
        "בועות עולות. על כל אחת אות או ספרה. המסך מבקש אחת, ונוגעים בה.",

        "החלטה אחת בעברית מעצבת את המשחק הזה, ואף אתר לא יספר עליה: חמש האותיות הסופיות לא נמצאות בבריכה. ך, ם, ן, ף וץ פשוט לא צפות. סופית היא אותה אות במקום אחר במילה, לא אות אחרת, וילד שביקשו ממנו מ ורואה ם עף מולו לומד הבדל שאינו קיים. האפשרות ההגונה השנייה, לקבל את שתיהן, גרועה יותר, כי אז לשאלה אחת יש שתי תשובות נכונות. סופיות לומדים אחרי שמכירים את האלף בית, ומשחק אותיות ראשון הוא לא המקום.",

        "והרמות פה לא בנויות על מהירות אלא על דמיון. ברמה הקלה שום בועה בסיבוב לא יכולה להתבלבל עם המבוקשת, וזו לא נטייה סטטיסטית אלא כלל: נבדק על 120 סיבובים לכל שפה ויצא אפס בדיוק. בבינונית אותיות דומות מגיעות כשהן מגיעות. ברמה הקשה הן נזרעות בכוונה, והסיבוב עצמו הוא תרגיל ההבחנה. ילד שעדיין לומד שב וכ הן שתי אותיות לא אמור להצטרך להפריד ביניהן כדי בכלל לשחק.",

        "בריכת התוכן היא עשר ספרות ועשרים ושתיים אותיות עבריות. באנגלית זה עשרים ושש אותיות גדולות בלבד, כי A ו-a לא צריכות להיות אותה שאלה לילד שלומד לקרוא.",

        "כמה זמן יש? בקלה בועה נשארת 4.2 שניות ובקשה 2.4. הסיבוב נגמר אחרי ארבע עד שש בועות נכונות לפי הרמה, והרמות ממשיכות בלי סוף.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. ההבדל הוא כמה אותיות דומות יופיעו." },
        { title: "קוראים את הבקשה", body: "למעלה מופיעה האות או הספרה שמחפשים עכשיו, גדולה וברורה." },
        { title: "נוגעים בבועה הנכונה", body: "נגיעה אחת מפוצצת אותה. בועה לא נכונה לא עולה כלום." },
        { title: "מסיימים שלב", body: "אחרי מספיק תפיסות נכונות עולים שלב, ומופיעה בקשה חדשה." },
      ],

      tips: [
        {
          title: "לקרוא לפני שנוגעים",
          body: "רוב הטעויות הן אצבע שהקדימה את העין. שבריר שנייה של קריאה חוסך את רובן.",
        },
        {
          title: "להתחיל בספרות",
          body: "ספרות מוכרות לרוב הילדים לפני האותיות, אז סיבוב שמבקש 3 הוא כניסה קלה יותר.",
        },
        {
          title: "לתפוס נמוך",
          body: "בועה בתחתית המסך נשארת זמינה הכי הרבה זמן, במיוחד ברמה הקשה.",
        },
        {
          title: "להישאר בקלה",
          body: "אם הילד עדיין מתבלבל בין אותיות דומות, הרמה הקלה מבטיחה שהוא לא ייתקל בהן בכלל.",
        },
      ],

      teaches: [
        { title: "זיהוי אותיות", body: "הבקשה חוזרת ומופיעה גדולה, אז הצורה של האות נצרבת בלי שינון." },
        { title: "זיהוי ספרות", body: "עשר הספרות מעורבבות פנימה, אז אותו משחק מכסה גם אותן." },
        {
          title: "להבחין בין דומים",
          body: "ב וכ, ר וד, ה וח. הרמה הקשה קיימת בדיוק בשביל האימון הזה, וגם מגנה מפניו בקלה.",
        },
        { title: "עין ואצבע ביחד", body: "בועה שעולה דורשת מבט שעוקב ויד שמגיעה לאן שהיא תהיה." },
      ],

      ages: [
        { title: "3 עד 4", body: "רמה קלה, ורצוי עם ספרות בהתחלה. פה מזהים צורה, לא קוראים." },
        { title: "5 עד 6", body: "קלה לבד ואז בינונית. זה הגיל שבו האותיות מתחילות להיות מוכרות באמת." },
        { title: "7 ומעלה", body: "קשה, שבה הדמיון בין האותיות הוא כל האתגר." },
        {
          title: "הורים",
          body: "אין פה מה להפסיד ואין שעון, אז ילד שנתקע פשוט מסתכל עוד רגע.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. הבועות גדולות מ-2 על 2 סנטימטרים בכל מסך ועולות בעמודות קבועות, כך שאף בועה לא מסתתרת מאחורי אחרת. האות עצמה היא המידע ולא הצבע של הבועה, אז עיוורון צבעים לא משפיע בכלל. אין שעון ואין לחץ זמן, ואין הבהובים. הבקשה מוצגת גדולה בראש המסך לאורך כל הסיבוב, כך שאפשר לחזור ולהסתכל בה בכל רגע.",

      together: [
        { title: "להגיד את האות", body: "בקשו מהילד לומר את שם האות בקול לפני הנגיעה. ככה שומעים אם הוא מזהה." },
        {
          title: "לחפש את האות שלו",
          body: "חכו לאות הראשונה של שמו. פתאום למשחק יש משמעות אישית.",
        },
        { title: "אתם קוראים, הוא נוגע", body: "הקריאו את הבקשה בקול במקום שיקרא אותה. עובד גם לפני שיודעים לקרוא." },
        {
          title: "לספור מה עלה",
          body: "כמה בועות עלו בסיבוב הזה? זו ספירה אמיתית בתוך משחק אחר.",
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
          q: "למה אין אותיות סופיות?",
          a: "כי סופית היא אותה אות במקום אחר במילה ולא אות אחרת. ם שעף מול ילד שביקשו ממנו מ מלמד הבדל שלא קיים, ולקבל את שתיהן היה נותן לשאלה אחת שתי תשובות נכונות.",
        },
        {
          q: "מה קורה כשנוגעים בבועה הלא נכונה?",
          a: "כלום. אין ניקוד שיורד ואין חיים שנגמרים. הבועה מתפוצצת וממשיכים.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "מה בדיוק ההבדל בין הרמות?",
          a: "כמה אותיות דומות יופיעו. בקלה אף בועה בסיבוב לא דומה למבוקשת, ובדקנו את זה על 120 סיבובים לכל שפה. בבינונית הן מגיעות באקראי ובקשה הן נזרעות בכוונה.",
        },
        {
          q: "יש גם אותיות באנגלית?",
          a: "כן, לפי שפת האתר. באנגלית מופיעות עשרים ושש אותיות גדולות בלבד, כי A ו-a לא צריכות להיות אותה שאלה.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, ברמה הקלה. הילד לא צריך לדעת לקרוא, רק להתאים צורה לצורה, והבקשה מוצגת גדולה בראש המסך.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["בועות", "אותיות", "מספרים", "לימוד קריאה", "אלף בית", "לגיל הרך"],
    },

    en: {
      metaTitle: "Catch the Bubbles - Letters & Numbers Game | Ellaz",
      metaDescription:
        "A free letters and numbers game for children. A character is named, catch the bubble carrying it. No download, no signup.",

      lede: "A free game where bubbles rise carrying letters and numbers. The screen asks for one and your child catches the bubbles that have it. Three levels, no clock, and no way to lose.",

      body: [
        "Bubbles rise. Each carries a letter or a digit. One is named, and you touch it.",

        "The levels here are built around lookalikes rather than around speed, which is the decision worth explaining. Speed is the easy lever and the wrong one, because a slow round full of characters a child cannot yet separate is still a reading test. So on easy, no bubble in the round can be confused with the one asked for. That is a rule and not a tendency, checked across 120 rounds per language and coming back at exactly zero. Medium lets lookalikes turn up when the draw produces them. Hard seeds them deliberately, and the round becomes the discrimination exercise itself.",

        "Which characters appear is a decision too. The English pool is twenty-six capitals and nothing else, because A and a should never be the same question for somebody learning to read. In Hebrew the pool is the twenty-two base letters, and the five final forms are deliberately left out: a final form is the same letter in a different position rather than a different letter, and teaching a distinction that does not exist is worse than teaching nothing.",

        "Ten digits sit in the pool alongside the letters. One game, both jobs. Most children recognise numbers before letters, which makes a round asking for 3 a gentler way in than one asking for W.",

        "How much time is there? Easy leaves a bubble up for 4.2 seconds and hard for 2.4. A round ends after four to six correct catches depending on the level, and the levels continue without end.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. The difference is how many lookalikes appear." },
        { title: "Read the request", body: "The letter or digit being asked for sits large at the top." },
        { title: "Touch the right bubble", body: "One tap pops it. A wrong bubble costs nothing." },
        { title: "Clear the level", body: "Enough correct catches moves you up and a new character is asked for." },
      ],

      tips: [
        {
          title: "Read before touching",
          body: "Most mistakes are a finger arriving ahead of an eye. A fraction of a second of reading removes most of them.",
        },
        {
          title: "Start with digits",
          body: "Numbers are familiar to most children before letters, so a round asking for 3 is an easier way in.",
        },
        {
          title: "Catch them low",
          body: "A bubble near the bottom stays reachable longest, which matters most on hard.",
        },
        {
          title: "Stay on easy",
          body: "If your child still mixes up similar letters, easy guarantees they will not meet any.",
        },
      ],

      teaches: [
        { title: "Letter recognition", body: "The request repeats and shows large, so the shape sticks without drilling." },
        { title: "Number recognition", body: "Ten digits are mixed into the same pool, so one game covers both." },
        {
          title: "Telling lookalikes apart",
          body: "b and d, p and q, M and N. Hard exists for that practice, and easy exists to protect against it.",
        },
        { title: "Hand and eye together", body: "A rising bubble needs a gaze that follows and a hand that arrives ahead of it." },
      ],

      ages: [
        { title: "3 to 4", body: "Easy, ideally with digits at first. This is shape matching rather than reading." },
        { title: "5 to 6", body: "Easy alone, then medium. This is when letters start being genuinely familiar." },
        { title: "7 and up", body: "Hard, where the resemblance between characters is the whole challenge." },
        {
          title: "Parents",
          body: "Nothing to lose and no clock, so a child who gets stuck simply looks for another moment.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. Bubbles are larger than 2cm square on any screen and rise in fixed columns, so none hides behind another. The character itself carries the information rather than the bubble colour, so colour blindness has no effect. There is no clock and no time pressure, and nothing flashes. The request stays large at the top of the screen for the whole round, so it can be checked again at any moment.",

      together: [
        { title: "Say the letter", body: "Ask your child to name it out loud before touching. You hear whether they recognised it." },
        {
          title: "Hunt their initial",
          body: "Wait for the first letter of their name. The game suddenly becomes personal.",
        },
        { title: "You read, they tap", body: "Read the request aloud instead of having them read it. Works well before reading starts." },
        {
          title: "Count what rose",
          body: "How many bubbles went past that round? Real counting inside a different game.",
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
          q: "What exactly is the difference between the levels?",
          a: "How many lookalike characters appear. On easy no bubble in the round resembles the one asked for, verified across 120 rounds per language. Medium lets them arrive at random and hard seeds them on purpose.",
        },
        {
          q: "What happens when my child taps the wrong bubble?",
          a: "Nothing. No score drops and no lives run out. The bubble pops and play continues.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Are there Hebrew letters too?",
          a: "Yes, following the site language. Hebrew uses the twenty-two base letters, and the five final forms are left out on purpose because a final form is the same letter in a different position rather than a different letter.",
        },
        {
          q: "Why only capital letters in English?",
          a: "Because A and a should not be the same question for a child learning to read. Lowercase is a second shape for the same letter and belongs after the first one is known.",
        },
        {
          q: "What age is this for?",
          a: "From about three on easy. Reading is not required, only matching one shape to another, and the request stays visible at the top throughout.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["bubbles", "letters", "numbers", "learn to read", "alphabet", "preschool"],
    },
  },

  provenance: [
    {
      claim: "easy produces exactly zero lookalike bubbles across 120 rounds per language",
      source: "src/games/bubbles/logic.test.ts",
    },
    {
      claim: "a bubble stays on screen 4.2s on easy and 2.4s on hard",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "the pool is ten digits plus twenty-two Hebrew base letters or twenty-six English capitals; final forms are excluded",
      source: "src/games/bubbles/logic.ts",
    },
    {
      claim: "four, five or six correct catches finish a level depending on difficulty",
      source: "src/games/bubbles/logic.ts",
    },
  ],
};
