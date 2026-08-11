import type { GameContent } from "../types";

/**
 * The one game on this platform with no score, ever, and the page exists partly
 * to say why out loud.
 *
 * `score-contract-convention.md` records it as a deliberate permanent exception:
 * ranking a child's drawing is the opposite of this platform's premise. Twenty
 * of twenty-one games keep a record. This one never will, and that is worth a
 * paragraph rather than a footnote.
 *
 * Note there is no derived statistic from a simulation here, because there is
 * nothing to simulate - a drawing has no outcome. The numbers on this page are
 * counts of what ships, and their provenance is the picture file itself.
 */
export const coloring: GameContent = {
  id: "coloring",

  copy: {
    he: {
      metaTitle: "צביעה - דפי צביעה דיגיטליים לילדים | Ellaz",
      metaDescription:
        "משחק צביעה חינם לילדים בדפדפן. 13 ציורים ו-12 צבעים, בלי ניקוד ובלי דרך לטעות. בלי הרשמה.",

      lede: "משחק צביעה חינם לילדים. בוחרים ציור, בוחרים צבע, נוגעים באזור והוא נצבע. אין ניקוד, אין שעון ואי אפשר לצבוע לא נכון.",

      body: [
        "ציור בקווים. 12 צבעים בצד. נוגעים, וזה נצבע.",

        "זה המשחק היחיד באתר שלא שומר שיא, ולא נשמור לו אחד גם בעתיד. לכל 20 המשחקים האחרים יש שיא, כי אפשר להשוות זמן פתרון או אורך רצף לזמן ולרצף של אתמול. ציור של ילד הוא לא זה. לדרג אותו פירושו לומר לו שהיה יכול לעשות את זה יותר טוב, ובגיל ארבע זה בדיוק המשפט שגורם לילדים להפסיק לצייר. אין פה נכון ולא נכון, אז אין מה לספור.",

        "13 ציורים בסך הכול: בית, דג, פרפר, פרח ועוד. כל אחד מחולק לאזורים סגורים, ואפשר לצבוע כל אזור בכל צבע כמה פעמים שרוצים. שמיים ורודים זו בחירה ולא טעות, ואף הודעה לא תופיע כדי לומר אחרת.",

        "אין מברשת ואין גרירה. נוגעים באזור והוא מתמלא, מה שאומר שגם יד קטנה שרועדת מקבלת בדיוק את התוצאה שהתכוונה אליה. זו החלטה מכוונת: כלי ציור חופשי היה נותן שליטה גדולה יותר לילד בן שבע ותסכול לילד בן שלוש.",

        "העבודה נשמרת על המכשיר בזמן אמת, אז אפשר לסגור ולחזור. אין שמירה בענן ואין חשבון, אז ניקוי היסטוריית הדפדפן מוחק את הציורים, וזה המחיר של לא לבקש מכם שום פרט.",
      ],

      howToPlay: [
        { title: "בוחרים ציור", body: "13 ציורים, כולם פתוחים מההתחלה. אין נעילות." },
        { title: "בוחרים צבע", body: "12 צבעים בסרגל הצד. נגיעה אחת בוחרת." },
        { title: "נוגעים באזור", body: "האזור מתמלא בצבע הנבחר. בלי גרירה ובלי דיוק." },
        { title: "משנים דעה", body: "צובעים שוב באותו אזור בצבע אחר. אין הגבלה." },
      ],

      tips: [
        {
          title: "להתחיל מהגדול",
          body: "רקע ושמיים קודם, פרטים אחר כך. ככה הציור נראה שלם מוקדם והילד לא מתייאש באמצע.",
        },
        {
          title: "לצבוע לא לפי המציאות",
          body: "פיל סגול הוא בחירה טובה. המשחק הזה לא מתקן אף אחד, וזו כל הנקודה שלו.",
        },
        {
          title: "לחזור לציור ישן",
          body: "העבודה נשמרת, אז אפשר להשאיר ציור באמצע ולהמשיך מחר.",
        },
        {
          title: "לתת לילד לבחור את הציור",
          body: "הבחירה עצמה היא חצי מהעניין, במיוחד לילדים שלא רגילים שנותנים להם.",
        },
      ],

      teaches: [
        { title: "שמות צבעים", body: "12 צבעים שחוזרים בכל ציור, וילדים מתחילים לבקש אותם בשם מעצמם." },
        { title: "דיוק בנגיעה", body: "אזורים קטנים דורשים אצבע מכוונת, וזה מתאמן בלי שאף אחד קורא לזה תרגיל." },
        { title: "תכנון", body: "איזה צבע לאן זו החלטה, ורוב הילדים מתחילים לתכנן אחרי הציור השני." },
        {
          title: "שאין תשובה נכונה",
          body: "זה נשמע קטן והוא לא. משחק שבו אי אפשר לטעות הוא חוויה נדירה לילד שכל השאר מודדים אותו.",
        },
      ],

      ages: [
        { title: "2 עד 3", body: "מושלם. נגיעה אחת ממלאת אזור שלם, אז אין תסכול מוטורי בכלל." },
        { title: "4 עד 6", body: "פה מתחילים לבחור צבעים בכוונה ולא באקראי." },
        { title: "7 ומעלה", body: "עדיין נעים, אבל ילדים בגיל הזה לרוב רוצים כלי חופשי יותר." },
        {
          title: "הורים",
          body: "זה המשחק שאפשר לתת בלי לחשוב פעמיים. אין שעון ואין ניקוד, ואין רגע שבו הילד קורא לכם.",
        },
      ],

      accessibility:
        "נגיעה אחת למילוי אזור, בלי גרירה ובלי החזקה, אז יד רועדת או אמצעי קלט חלופי מקבלים בדיוק את התוצאה שהתכוונו אליה. האזורים גדולים והקווים עבים. 12 הצבעים נבדלים גם בבהירות ולא רק בגוון, ולכל אחד יש שם קולי לקוראי מסך, כך שאפשר לבחור צבע גם בלי לראות אותו. אין שעון ואין הבהובים, ואי אפשר להגיע למצב של טעות שדורש הודעה.",

      together: [
        { title: "ציור אחד, שניים", body: "כל אחד צובע אזור בתורו. הציור יוצא מוזר וזה החלק הטוב." },
        {
          title: "לבחור אחד לשני",
          body: "אתם בוחרים את הצבע והילד בוחר את האזור. פתאום כולם צריכים להסביר.",
        },
        { title: "לספר על הציור", body: "כשגמרתם, בקשו סיפור על מה שקורה בתמונה. הצביעה הופכת לפתיחה." },
        {
          title: "אותו ציור פעמיים",
          body: "צבעו את אותו ציור בשתי ערכות צבעים שונות והשוו. אותם קווים, שתי תמונות.",
        },
      ],

      faq: [
        {
          q: "משחק הצביעה חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות. גם ציור שנפתח בכסף אין כאן: כל 13 הציורים פתוחים מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "למה אין ניקוד במשחק הזה?",
          a: "כי אין פה נכון ולא נכון. לכל 20 המשחקים האחרים באתר יש שיא, וזה היחיד שלא יהיה לו אף פעם. לדרג ציור של ילד זה לומר לו שהיה יכול לעשות את זה יותר טוב.",
        },
        {
          q: "אפשר לצבוע מחוץ לקווים?",
          a: "לא, וזה בכוונה. נגיעה ממלאת אזור שלם, אז ילד בן שלוש מקבל בדיוק את התוצאה שהתכוון אליה בלי לדרוש שליטה מוטורית שאין לו עדיין.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין ציורים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "הציורים נשמרים?",
          a: "כן, על המכשיר עצמו ובזמן אמת. אין שמירה בענן ואין חשבון, אז ניקוי היסטוריית הדפדפן מוחק אותם.",
        },
        {
          q: "כמה ציורים וכמה צבעים יש?",
          a: "13 ציורים ו-12 צבעים. כל ציור מחולק לאזורים סגורים ואפשר לצבוע כל אזור מחדש כמה פעמים שרוצים.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משנתיים בערך. אין קריאה, אין דיוק נדרש ואין מצב שבו משהו משתבש.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["צביעה", "דפי צביעה", "ציור", "יצירה", "לגיל הרך", "צבעים"],
    },

    en: {
      metaTitle: "Coloring - Free Digital Coloring Pages for Kids | Ellaz",
      metaDescription:
        "A free coloring game in your browser. 13 pictures and 12 colours, with no score and no way to get it wrong. No signup.",

      lede: "A free coloring game for children. Pick a picture, pick a colour, touch an area and it fills. No score, no clock, and no way to colour something incorrectly.",

      body: [
        "A line drawing. 12 colours down the side. Touch, and it fills.",

        "This is the only game on the site that keeps no record, and it never will. The other 20 all have one, because a solve time or a streak length can honestly be compared to yesterday's. A child's drawing is not that. Ranking it means telling them they could have done it better, and at four years old that is the exact sentence that makes children stop drawing. There is no right and wrong here, so there is nothing to count.",

        "13 pictures in total: a house, a fish, a butterfly, a flower and more. Each is divided into closed areas, and any area takes any colour as many times as you like. A pink sky is a choice rather than a mistake, and no message will ever appear to suggest otherwise.",

        "There is no brush and no dragging. You touch an area and it fills, which means a small unsteady hand gets exactly the result it intended. That is deliberate: a free drawing tool would give a seven-year-old more control and a three-year-old nothing but frustration.",

        "Work saves to the device as you go, so you can close it and come back. There is no cloud save and no account, which means clearing browser history erases the drawings. That is the price of not asking you for anything.",
      ],

      howToPlay: [
        { title: "Pick a picture", body: "13 of them, all open from the start. Nothing is locked." },
        { title: "Pick a colour", body: "12 colours in the side bar. One tap selects." },
        { title: "Touch an area", body: "It fills with the selected colour. No dragging and no precision needed." },
        { title: "Change your mind", body: "Touch the same area again in another colour. No limit." },
      ],

      tips: [
        {
          title: "Start with the big areas",
          body: "Background and sky first, details after. The picture looks whole early, so a child does not give up halfway.",
        },
        {
          title: "Colour it wrong on purpose",
          body: "A purple elephant is a good choice. This game corrects nobody, and that is the entire point of it.",
        },
        {
          title: "Come back to an old one",
          body: "Work is saved, so a half-finished picture can wait until tomorrow.",
        },
        {
          title: "Let them pick the picture",
          body: "The choosing is half of it, especially for children who rarely get to choose.",
        },
      ],

      teaches: [
        { title: "Colour names", body: "12 colours recurring across every picture, and children start asking for them by name." },
        { title: "Touch accuracy", body: "Small areas need an aimed finger, and that practises without anybody calling it an exercise." },
        { title: "Planning", body: "Which colour goes where is a decision, and most children start planning by their second picture." },
        {
          title: "That there is no right answer",
          body: "It sounds small and it is not. A game where you cannot be wrong is a rare experience for a child everything else measures.",
        },
      ],

      ages: [
        { title: "2 to 3", body: "Ideal. One tap fills a whole area, so there is no motor frustration at all." },
        { title: "4 to 6", body: "This is where colours start being chosen deliberately rather than at random." },
        { title: "7 and up", body: "Still pleasant, though children this age usually want a freer tool." },
        {
          title: "Parents",
          body: "The one you can hand over without a second thought. No clock and no score, and no moment where they call you.",
        },
      ],

      accessibility:
        "One tap fills an area, with no dragging and no holding, so an unsteady hand or an alternative input device gets exactly the intended result. Areas are large and the lines are thick. The 12 colours differ in brightness as well as hue, and each carries a spoken name for screen readers, so a colour can be chosen without seeing it. No clock and nothing flashing, and there is no error state to warn about because one cannot occur.",

      together: [
        { title: "One picture, two people", body: "Take turns filling an area each. The result is strange and that is the good part." },
        {
          title: "Choose for each other",
          body: "You pick the colour, they pick the area. Suddenly everybody has to explain themselves.",
        },
        { title: "Tell the story", body: "When it is done, ask what is happening in the picture. The colouring becomes the opening." },
        {
          title: "Same picture twice",
          body: "Colour one drawing with two different palettes and compare. Same lines, two pictures.",
        },
      ],

      faq: [
        {
          q: "Is the coloring game free?",
          a: "Completely. Nothing to pay, no purchases, and no pictures unlocked by money. All 13 are open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
        },
        {
          q: "Why is there no score in this game?",
          a: "Because there is no right and wrong here. The other 20 games on the site all keep a record and this is the one that never will. Ranking a child's drawing means telling them they could have done it better.",
        },
        {
          q: "Can you colour outside the lines?",
          a: "No, and that is deliberate. A tap fills a whole area, so a three-year-old gets exactly what they intended without needing motor control they do not have yet.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between pictures." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Are the drawings saved?",
          a: "Yes, on the device itself and as you go. There is no cloud save and no account, so clearing browser history erases them.",
        },
        {
          q: "How many pictures and colours are there?",
          a: "13 pictures and 12 colours. Each picture is divided into closed areas and any area can be recoloured as often as you like.",
        },
        {
          q: "What age is this for?",
          a: "From about two. No reading, no precision required, and no state in which anything goes wrong.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["coloring", "coloring pages", "drawing", "creative", "preschool", "colours"],
    },
  },

  provenance: [
    {
      claim: "13 pictures and a 12-colour palette",
      source: "src/games/coloring/pictures.ts",
    },
    {
      claim: "this is the only game of the 21 that keeps no record, permanently and by design",
      source: ".claude/rules/score-contract-convention.md",
    },
    {
      claim: "20 of the other games do keep a record",
      source: "src/sdk/score.ts",
    },
  ],
};
