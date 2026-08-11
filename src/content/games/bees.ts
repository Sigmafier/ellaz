import type { GameContent } from "../types";

/**
 * The game whose ladder runs backwards, and the page says so.
 *
 * Harder here means FEWER bees, not faster ones, because the skill being asked
 * for is telling two things apart rather than moving quickly. That is genuinely
 * counterintuitive and it is the most interesting thing about the game.
 *
 * The statistic is one nobody could guess from the code: the declared bee ratio
 * is not the mix a child sees. A cap of three in a row pulls the realised share
 * toward even every time it fires, so 65% comes out at 59%.
 * `scripts/sim/spawn-ladder.mjs` measures it against the game's own closed form
 * and refuses to print either number if they disagree.
 */
export const bees: GameContent = {
  id: "bees",

  copy: {
    he: {
      metaTitle: "רק דבורים - משחק ריכוז לילדים | Ellaz",
      metaDescription:
        "משחק חינם לילדים: דבורים ופרפרים עפים בשמיים, ונוגעים רק בדבורים. בלי ניקוד שיורד, בלי הרשמה.",

      lede: "משחק חינם לילדים שבו דבורים ופרפרים חוצים את השמיים במשך ארבעים שניות, והילד נוגע רק בדבורים. פרפר שנגעו בו לא עולה כלום, ודבורה שהתפספסה גם לא.",

      body: [
        "שמיים, ובהם שני סוגי יצורים. נוגעים בדבורים. את הפרפרים מניחים לעוף.",

        "וכאן הרמות עובדות הפוך ממה שמצפים. קשה יותר פירושו פחות דבורים, לא מהר יותר. המשחק הזה לא מודד מהירות אלא את היכולת לעצור ולבדוק, וכשכמעט כל מה שעף הוא דבורה הילד נכנס לקצב של נגיעה בכל דבר תוך שניות ומפסיק להסתכל. זו בדיוק ההרגל שהמשחק קיים כדי לשבור. אז היחס יורד מ-65% דבורים בקלה ל-50% בקשה, והפרפר הופך מהפרעה נדירה לחצי מהשמיים.",

        "המספר שהקוד מבקש הוא לא המספר שהילד רואה, וזה מפתיע. יש כלל שאוסר יותר משלושה יצורים זהים ברצף, וכל פעם שהוא נכנס לפעולה הוא מושך את התערובת לכיוון האמצע. הרצנו 1,500 סיבובים לכל רמה: 65% המבוקשים מגיעים בפועל ל-59%, ו-60% מגיעים ל-56%. ברמה הקשה שני המספרים נפגשים על 50% בדיוק, כי תערובת שכבר מאוזנת אין לאן למשוך אותה.",

        "סיבוב הוא ארבעים שניות, וזה מספיק זמן. ברמה הקלה חוצים את השמיים 28 יצורים ומתוכם בערך 17 דבורים. בקשה עוברים 57 יצורים ובערך 29 מהם דבורים, אז גם כשהיחס נמוך יותר יש יותר דבורים לתפוס, פשוט צריך לבחור אותן.",

        "אין פה מה להפסיד. אין ניקוד שיורד, אין חיים ואין צליל של טעות, והמונה היחיד במשחק הוא כמה דבורים נתפסו. הסיבוב תמיד נגמר בסיום, גם אם הילד לא נגע באף אחת.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. ההבדל הוא כמה פרפרים יעופו." },
        { title: "מחכים לדבורה", body: "היצורים חוצים את המסך משמאל לימין ומימין לשמאל." },
        { title: "נוגעים רק בדבורים", body: "נגיעה אחת. הפרפר היפה אף פעם לא המטרה." },
        { title: "מסיימים סיבוב", body: "אחרי ארבעים שניות רואים כמה דבורים נתפסו, ואפשר מיד עוד סיבוב." },
      ],

      tips: [
        {
          title: "להסתכל על הכנפיים",
          body: "צורת הכנף מבדילה מהר יותר מהצבע, וגם ברור יותר כשהיצור זז.",
        },
        {
          title: "לא לנגוע אוטומטית",
          body: "רוב הדבורים שמפספסים נובעות מנגיעה מהירה מדי בפרפר. שבריר שנייה של בדיקה מרוויח יותר ממה שהוא עולה.",
        },
        {
          title: "לתפוס באמצע",
          body: "יצור באמצע המסך נשאר זמין הכי הרבה זמן. מי שמחכה לקצה מפסיד שנייה.",
        },
        {
          title: "לנסות את הקשה דווקא",
          body: "פחות דבורים נשמע מתסכל ובפועל זה נעים יותר, כי יש זמן לחשוב בין אחת לשנייה.",
        },
      ],

      teaches: [
        {
          title: "לעצור לפני שפועלים",
          body: "המשחק כולו הוא תרגיל בלעצור את היד. זו מיומנות שמתאמנת ממש כמו כל אחרת.",
        },
        { title: "להבחין בין שניים דומים", body: "דבורה ופרפר עפים אותו דבר. ההבדל בפרטים, וצריך להסתכל." },
        { title: "ריכוז לאורך זמן", body: "ארבעים שניות של תשומת לב רצופה זה הרבה בגיל ארבע, וזה מתארך." },
        {
          title: "לקבל החמצה",
          body: "דבורה שעפה בלי שנגעו בה לא עושה כלום. ילדים לומדים כאן שלא כל הזדמנות צריך לתפוס.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "רמה קלה. הרבה דבורים, אז כמעט כל נגיעה מצליחה וזה מספיק." },
        { title: "5 עד 6", body: "בינונית. פה מתחילים באמת לבדוק לפני שנוגעים." },
        { title: "7 ומעלה", body: "קשה, שבה חצי מהשמיים אסור לנגיעה." },
        {
          title: "הורים",
          body: "אין פה מה להפסיד, אז המשחק מתאים גם לרגעים שבהם אתם לא יכולים לשבת ליד.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. היצורים גדולים ועפים בנתיבים קבועים ולא בקפיצות מפתיעות, כך שאפשר לעקוב אחריהם גם בעין שעדיין מתאמנת. דבורה ופרפר נבדלים בצורת הכנף ולא רק בצבע, אז עיוורון צבעים לא מפריע. השעון מפסיק כשמניחים את המכשיר, ולכן הפסקה באמצע לא עולה כלום. אין הבהובים ואפשר לשחק בשקט מוחלט.",

      together: [
        {
          title: "אחד סופר, אחד נוגע",
          body: "מי שסופר אומר דבורה או פרפר בקול לפני שהיד זזה. פתאום שומעים אם יש בכלל הבחנה.",
        },
        { title: "סיבוב בלי לגעת", body: "ארבעים שניות שבהן רק מסתכלים וסופרים דבורות. תרגיל ריכוז בלי אצבעות." },
        { title: "מי מוצא פרפר", body: "הפכו את המשחק ומצאו את הפרפרים בקול. אותה הבחנה, מהצד השני." },
        {
          title: "לנחש מראש",
          body: "לפני שהיצור הבא נכנס למסך, נחשו מה הוא יהיה. אף אחד לא צודק יותר מדי.",
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
          q: "מה קורה אם נוגעים בפרפר?",
          a: "כלום. הוא ממשיך לעוף, אין ניקוד שיורד ואין צליל של טעות. המונה היחיד במשחק סופר דבורים שנתפסו.",
        },
        {
          q: "למה ברמה הקשה יש פחות דבורים?",
          a: "כי המיומנות פה היא להבחין, לא למהר. כשכמעט הכול דבורה הילד נכנס לקצב של נגיעה בכל דבר ומפסיק להסתכל, וזה בדיוק ההרגל שהמשחק מנסה לשבור.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "כמה זמן לוקח סיבוב?",
          a: "ארבעים שניות. השעון עוצר אם מניחים את המכשיר, אז הפסקה באמצע לא גוזלת מהסיבוב.",
        },
        {
          q: "כמה דבורים אפשר לתפוס בסיבוב?",
          a: "תלוי ברמה. בקלה עוברים 28 יצורים ובערך 17 מהם דבורים, ובקשה עוברים 57 ובערך 29 מהם דבורים.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, ברמה הקלה. אין קריאה בשום מקום במשחק וצריך רק להבחין בין שני יצורים.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["דבורים", "פרפרים", "ריכוז", "לגיל הרך", "שליטה עצמית", "משחק נגיעה"],
    },

    en: {
      metaTitle: "Bees Only - Free Focus Game for Kids | Ellaz",
      metaDescription:
        "A free game for children: bees and butterflies cross the sky and you tap only the bees. Nothing to lose, no signup.",

      lede: "A free game where bees and butterflies cross the sky for forty seconds and your child taps only the bees. Tapping a butterfly costs nothing. Missing a bee costs nothing either.",

      body: [
        "A sky with two kinds of creature in it. Tap the bees. Let the butterflies go.",

        "The levels here run backwards from what you would expect. Harder means fewer bees, not faster ones. This game does not measure speed, it measures the ability to stop and check, and when nearly everything in the sky is a bee a child settles into a tap-everything rhythm within seconds and stops looking. That is the exact habit the game exists to interrupt. So the mix falls from 65% bees on easy to 50% on hard, and the butterfly stops being a rare nuisance and becomes half the sky.",

        "The number the code asks for is not the number a child sees, which surprised us too. A rule forbids more than three identical creatures in a row, and every time it fires it pulls the mix back toward even. Over 1,500 rounds per level, a requested 65% comes out at 59%, and 60% comes out at 56%. On hard the two numbers meet exactly at 50%, because a mix that is already even has nowhere to be pulled.",

        "A round is forty seconds. That is enough. On easy 28 creatures cross the sky and roughly 17 are bees. On hard 57 cross and roughly 29 are bees, so the harder level actually offers more bees to catch. You just have to pick them out.",

        "There is nothing to lose here. No score that drops, no lives, no error sound, and the only counter in the game is how many bees were caught. The round always ends in a completion. Even if your child touched none of them.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. The difference is how many butterflies fly." },
        { title: "Wait for a bee", body: "Creatures cross the screen in both directions along fixed lanes." },
        { title: "Tap bees only", body: "One tap each. The pretty one is never the target." },
        { title: "Finish the round", body: "After forty seconds you see the count, and another round is one tap away." },
      ],

      tips: [
        {
          title: "Watch the wings",
          body: "Wing shape separates them faster than colour does, and stays clearer while the creature is moving.",
        },
        {
          title: "Do not tap on reflex",
          body: "Most missed bees come from tapping a butterfly too fast. A fraction of a second of checking earns back more than it costs.",
        },
        {
          title: "Catch them mid-screen",
          body: "A creature in the middle stays reachable longest. Waiting for the edge throws away a second.",
        },
        {
          title: "Try hard anyway",
          body: "Fewer bees sounds frustrating and is actually calmer, because there is thinking time between them.",
        },
      ],

      teaches: [
        {
          title: "Stopping before acting",
          body: "The whole game is an exercise in holding your hand back, and that trains like anything else.",
        },
        { title: "Telling two similar things apart", body: "Bees and butterflies fly the same way. The difference is in the detail." },
        { title: "Sustained attention", body: "Forty seconds of continuous focus is a lot at four, and it stretches." },
        {
          title: "Letting one go",
          body: "A bee that flies past untouched does nothing at all. Children learn here that not every opportunity has to be taken.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Easy. Plenty of bees, so almost every tap works, and that is enough." },
        { title: "5 to 6", body: "Medium. This is where checking before tapping actually starts." },
        { title: "7 and up", body: "Hard, where half the sky is off limits." },
        {
          title: "Parents",
          body: "Nothing can be lost, so this one suits the moments when you cannot sit alongside.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. Creatures are large and fly along fixed lanes rather than jumping unpredictably, so an eye still learning to track can follow them. Bees and butterflies differ in wing shape rather than only colour, so colour blindness does not interfere. The clock pauses when the device is put down, which means a break mid-round costs nothing. Nothing flashes and the game plays fully in silence.",

      together: [
        {
          title: "One calls, one taps",
          body: "The caller says bee or butterfly out loud before the hand moves. You hear straight away whether there is a distinction.",
        },
        { title: "A round with no touching", body: "Forty seconds of just watching and counting bees. Focus practice without fingers." },
        { title: "Find the butterfly", body: "Invert the game and call the butterflies instead. Same distinction, other side." },
        {
          title: "Call it early",
          body: "Guess what the next creature will be before it enters the screen. Nobody is right very often.",
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
          q: "What happens if my child taps a butterfly?",
          a: "Nothing. It keeps flying, no score drops, and there is no error sound. The only counter in the game counts bees caught.",
        },
        {
          q: "Why does the hard level have fewer bees?",
          a: "Because the skill here is discrimination rather than speed. When almost everything is a bee a child settles into tapping everything and stops looking, which is the habit this game tries to interrupt.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "How long is a round?",
          a: "Forty seconds. The clock stops when the device is put down, so an interruption does not eat into the round.",
        },
        {
          q: "How many bees can be caught in one round?",
          a: "Depends on the level. Easy sends 28 creatures past with roughly 17 bees among them, and hard sends 57 with roughly 29 bees.",
        },
        {
          q: "What age is this for?",
          a: "From about three on easy. There is no reading anywhere in the game and the only requirement is telling two creatures apart.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["bees", "butterflies", "focus", "self control", "preschool", "attention game"],
    },
  },

  provenance: [
    {
      claim: "a requested 65% bee share is realised as 59%, and 60% as 56%, over 1,500 rounds per level",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "28 creatures with about 17 bees on easy, 57 with about 29 bees on hard, in a 40 second round",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "the declared bee ratios are 0.65, 0.60 and 0.50, and no more than three identical creatures appear in a row",
      source: "src/games/bees/logic.ts",
    },
    {
      claim: "the record is bees caught, higher is better, on one board across levels",
      source: "src/sdk/score.ts",
    },
  ],
};
