import type { GameContent } from "../types";

/**
 * The statistic here answers the question every parent silently asks about a
 * memory game: could they have just guessed that?
 *
 * A sequence game's difficulty is not its pad count, it is pads^length, and
 * that number climbs terrifyingly fast. Six pads and five flashes is one chance
 * in 7,776. `scripts/sim/thinking-levels.mjs` derives it from the real level
 * table.
 */
export const echo: GameContent = {
  id: "echo",

  he: {
    metaTitle: "חזרו אחריי - משחק זיכרון רצפים | Ellaz",
    metaDescription:
      "משחק זיכרון חינם לילדים. המסך מדליק רצף, והילד חוזר עליו. הרצף מתארך בכל סיבוב. בלי הרשמה.",

    lede: "משחק זיכרון חינם שבו לוחות נדלקים ברצף, והילד חוזר על אותו רצף בסדר. כל סיבוב מוסיף עוד אחד, וזה נמשך עד שהזיכרון נגמר.",

    body: [
      "לוח נדלק. אחר כך עוד אחד. חוזרים עליהם באותו סדר.",

      "וכאן המספר ששווה לדעת, כי הוא עונה על מה שכל הורה שואל את עצמו בשקט: האם הוא באמת זכר, או פשוט ניחש? עם ארבעה לוחות ורצף של שלושה יש 64 אפשרויות. עם שישה לוחות ורצף של חמישה יש 7,776. ילד שהגיע לסיבוב חמישי ברמה הקשה לא ניחש, ואי אפשר לנחש שם גם אם רוצים. מהסיבוב השלישי ומעלה המזל כבר לא הסבר.",

      "הרמות משנות כמה לוחות יש, ארבעה, חמישה או שישה, וזהו. אורך הרצף לא נקבע על ידכם אלא על ידי כמה רחוק הגעתם, וזו הסיבה שהמשחק הזה מרגיש אחרת מכל השאר: הרמה קובעת את גודל המרחב, אתם קובעים את העומק.",

      "ההבהוב מתקצר ככל שהרצף מתארך, אבל יש רצפה. הוא מתחיל ב-460 אלפיות שנייה ולא יורד מתחת ל-260, ובין כל שני הבהובים יש 170 אלפיות של חושך. החושך הזה הוא שהופך שני הבהובים על אותו לוח לשני דברים ולא לאחד ארוך, וזה ההבדל בין משחק הוגן למשחק שנראה שבור.",

      "לכל לוח יש גם צליל משלו, ורוב הילדים מגלים תוך שני סיבובים שהם זוכרים את המנגינה טוב יותר משהם זוכרים את המיקומים. אפשר לשחק בלי קול בכלל, אבל שווה לנסות עם.",
    ],

    howToPlay: [
      { title: "בוחרים רמה", body: "ארבעה, חמישה או שישה לוחות. אורך הרצף לא נבחר, הוא נבנה." },
      { title: "מסתכלים", body: "הלוחות נדלקים אחד אחרי השני. מחכים שהרצף ייגמר." },
      { title: "חוזרים בסדר", body: "נוגעים בלוחות באותו סדר בדיוק. אין הגבלת זמן." },
      { title: "ממשיכים", body: "רצף נכון מוסיף לוח אחד לסיבוב הבא, וכך עד שנגמר." },
    ],

    tips: [
      {
        title: "להגיד בקול",
        body: "אדום, כחול, אדום. שמיעה של הרצף מוסיפה זיכרון שני על גבי הזיכרון החזותי.",
      },
      {
        title: "לזמזם את המנגינה",
        body: "לכל לוח יש צליל, והמוח זוכר לחנים טוב יותר משהוא זוכר מיקומים. זו העצה שהכי עובדת פה.",
      },
      {
        title: "לא למהר להשיב",
        body: "אין שעון. שנייה של שקט אחרי הרצף מסדרת אותו בראש הרבה יותר טוב מהתחלה מיידית.",
      },
      {
        title: "לחלק לקבוצות",
        body: "רצף של שישה זכיר יותר כשלוש קבוצות של שניים. זה טריק של מבוגרים והוא עובד גם בגיל שבע.",
      },
    ],

    teaches: [
      { title: "זיכרון עבודה", body: "להחזיק רצף בראש בזמן שמבצעים אותו זו בדיוק המיומנות שנמדדת." },
      { title: "סדר ורצף", body: "לא רק מה היה, אלא באיזה סדר. זה קשה יותר וזה הבסיס לספירה ולקריאה." },
      { title: "קשב בזמן ההצגה", body: "מי שמסתכל הצידה לשנייה מפספס את כל הרצף. אין מה לפצות עליו." },
      {
        title: "לקבל את הגבול",
        body: "הרצף תמיד יגמר בטעות, ומה שנשאר זה כמה רחוק הגעתם. אין פה כישלון, יש עצירה.",
      },
    ],

    ages: [
      { title: "3 עד 4", body: "ארבעה לוחות. רצף של שניים או שלושה זה כבר הישג אמיתי בגיל הזה." },
      { title: "5 עד 6", body: "ארבעה ואז חמישה. פה מגיעים לרצף של ארבעה או חמישה." },
      { title: "7 ומעלה", body: "שישה לוחות, ומכאן זה מרוץ מול השיא של עצמכם." },
      {
        title: "מבוגרים",
        body: "רצף של שבעה על שישה לוחות זה טוב מאוד. שווה לזכור שאחד מכל 279,936 ניחושים היה מצליח.",
      },
    ],

    accessibility:
      "נגיעה אחת בכל לוח, בלי גרירה ובלי החזקה. הלוחות גדולים ומרווחים, כך שנגיעה לא מדויקת עדיין נוחתת על הנכון. לכל לוח יש גם מיקום קבוע וגם צליל משלו, אז אפשר לשחק לפי מיקום בלבד או לפי צליל בלבד, ועיוורון צבעים לא חוסם כלום. אין שעון על התשובה: אפשר לחשוב כמה שרוצים לפני כל נגיעה. אין הבהובים מהירים מ-260 אלפיות שנייה, ואפשר לשחק בשקט מוחלט.",

    together: [
      { title: "רצף בתורות", body: "אחד עושה את הרצף, השני חוזר עליו. אתם המכונה, וזה משנה הכול." },
      {
        title: "להוסיף אחד",
        body: "כל אחד בתורו מוסיף לוח לסוף הרצף וחוזר על הכול. משחק ותיק שעובד בלי מסך בכלל.",
      },
      { title: "לזמזם ביחד", body: "שירו את הרצף במקום לומר אותו. פתאום כולם זוכרים יותר." },
      {
        title: "לנחש כמה",
        body: "לפני שמתחילים, נחשו לאיזה סיבוב תגיעו. לרוב נמוך מדי, וזה מעודד.",
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
        q: "אפשר לנחש את הרצף?",
        a: "כמעט לא. עם ארבעה לוחות ורצף של שלושה יש 64 אפשרויות, ועם שישה לוחות ורצף של חמישה יש 7,776. מהסיבוב השלישי המזל מפסיק להיות הסבר.",
      },
      {
        q: "מה קורה כשטועים?",
        a: "הסיבוב נגמר ורואים כמה רחוק הגעתם, ואפשר להתחיל מיד. אין ניקוד שיורד ואין חיים.",
      },
      { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
      {
        q: "אפשר לשחק בלי אינטרנט?",
        a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
      },
      {
        q: "המשחק עובד בלי קול?",
        a: "כן, לגמרי. לכל לוח יש מיקום קבוע וצליל משלו, ואפשר לשחק לפי כל אחד מהם בנפרד. עם קול זה קל יותר לרוב הילדים.",
      },
      {
        q: "המשחק נעשה מהר מדי?",
        a: "ההבהוב מתקצר עם אורך הרצף אבל לא יורד מתחת ל-260 אלפיות שנייה, ועל התשובה אין שעון בכלל. אפשר לחשוב כמה שצריך.",
      },
      {
        q: "מאיזה גיל זה מתאים?",
        a: "משלוש בערך, עם ארבעה לוחות. אין קריאה בשום מקום וצריך רק לזכור סדר.",
      },
      {
        q: "המשחק אוסף מידע על הילד?",
        a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
      },
    ],

    keywords: ["זיכרון", "רצפים", "סימון", "ריכוז", "משחק חשיבה", "לגיל הרך"],
  },

  en: {
    metaTitle: "Follow Me - Free Memory Sequence Game | Ellaz",
    metaDescription:
      "A free sequence memory game for kids. Pads light up in order and you repeat them. The pattern grows each round. No signup.",

    lede: "A free memory game where pads light up in a sequence and your child repeats it in order. Every correct round adds one more, and it keeps going until memory runs out.",

    body: [
      "A pad lights. Then another. You repeat them in order.",

      "Here is the number worth knowing, because it answers the thing every parent quietly wonders: did they actually remember that, or did they guess? With four pads and a sequence of three there are 64 possibilities. With six pads and a sequence of five there are 7,776. A child who reached round five on hard did not guess it, and could not have if they tried. From about the third round onward, luck stops being an available explanation.",

      "The levels change the number of pads and nothing else. Four, five or six. How long the sequence gets is not something you choose, it is decided by how far you got, which is why this game feels different from the rest: the level sets the size of the space and you set the depth.",

      "The flash gets shorter as the pattern grows, but there is a floor. It starts at 460 milliseconds and never drops below 260, with 170 milliseconds of darkness between any two. That darkness is what makes two flashes on the same pad read as two things rather than one long one, which is the difference between a fair game and one that looks broken.",

      "Each pad has its own tone, and most children work out within two rounds that they remember the tune more reliably than they remember the positions. It plays perfectly well in silence. Try it with sound once anyway.",
    ],

    howToPlay: [
      { title: "Pick a level", body: "Four, five or six pads. Sequence length is not chosen, it is earned." },
      { title: "Watch", body: "The pads light one after another. Wait for the sequence to finish." },
      { title: "Repeat in order", body: "Tap the pads in exactly the same order. There is no time limit." },
      { title: "Keep going", body: "A correct sequence adds one pad to the next round, and on it goes." },
    ],

    tips: [
      {
        title: "Say it out loud",
        body: "Red, blue, red. Hearing the sequence adds a second memory on top of the visual one.",
      },
      {
        title: "Hum the tune",
        body: "Each pad has a tone, and brains hold melodies better than positions. This is the tip that works best here.",
      },
      {
        title: "Do not rush the answer",
        body: "There is no clock. A second of quiet after the sequence organises it far better than starting immediately.",
      },
      {
        title: "Chunk it",
        body: "A sequence of six is easier as three pairs. That is an adult trick and it works fine at seven years old.",
      },
    ],

    teaches: [
      { title: "Working memory", body: "Holding a sequence while performing it is precisely what gets measured here." },
      { title: "Order and sequence", body: "Not just what, but in what order. That is harder, and it underlies counting and reading." },
      { title: "Attention during the show", body: "Look away for a second and the whole sequence is gone. Nothing compensates for it." },
      {
        title: "Accepting a limit",
        body: "The sequence always ends in a mistake, and what remains is how far you got. Not a failure, a stopping point.",
      },
    ],

    ages: [
      { title: "3 to 4", body: "Four pads. A sequence of two or three is a genuine achievement at this age." },
      { title: "5 to 6", body: "Four, then five. This is where sequences of four and five start landing." },
      { title: "7 and up", body: "Six pads, and from here it is a race against your own record." },
      {
        title: "Adults",
        body: "Seven on six pads is very good. Worth noting that one guess in 279,936 would have managed it.",
      },
    ],

    accessibility:
      "One tap per pad, with no dragging and no holding. Pads are large and well separated, so an imprecise tap still lands on the right one. Every pad has both a fixed position and its own tone, so the game can be played by position alone or by sound alone, and colour blindness blocks nothing. There is no clock on the answer, so a child can think as long as they need before each tap. Nothing flashes faster than 260 milliseconds, and the whole game plays in silence.",

    together: [
      { title: "Take turns being the machine", body: "One person makes the sequence, the other repeats it. Being the machine changes everything." },
      {
        title: "Add one each",
        body: "Everyone adds a pad to the end and repeats the whole thing. An old game that needs no screen at all.",
      },
      { title: "Sing it together", body: "Sing the sequence instead of saying it. Everybody suddenly remembers more." },
      {
        title: "Guess your round",
        body: "Before you start, guess how far you will get. Usually too low, which is encouraging.",
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
        q: "Could my child be guessing the sequence?",
        a: "Almost certainly not. Four pads and a sequence of three gives 64 possibilities, and six pads with a sequence of five gives 7,776. By the third round luck stops being an explanation.",
      },
      {
        q: "What happens on a mistake?",
        a: "The round ends, you see how far you got, and another starts immediately. No score drops and there are no lives.",
      },
      { q: "Are there ads?", a: "None. No banners and no video between levels." },
      {
        q: "Does it work offline?",
        a: "Yes. After one visit the game is stored on the device and runs on a plane.",
      },
      {
        q: "Does it work with the sound off?",
        a: "Completely. Every pad has a fixed position as well as its own tone, and either one is enough to play by. Most children find it easier with sound.",
      },
      {
        q: "Does it get too fast?",
        a: "The flash shortens as the sequence grows but never drops below 260 milliseconds, and there is no clock at all on the answer. Thinking time is unlimited.",
      },
      {
        q: "What age is this for?",
        a: "From about three with four pads. There is no reading anywhere and the only requirement is remembering an order.",
      },
      {
        q: "Does it collect data about my child?",
        a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
      },
    ],

    keywords: ["memory", "sequence", "simon", "concentration", "pattern", "kids game"],
  },

  provenance: [
    {
      claim: "64 possible sequences at round 3 on easy, 7,776 at round 5 on hard, 279,936 at round 7",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "the flash runs from 460ms down to a floor of 260ms with a 170ms gap between flashes",
      source: "src/games/echo/logic.ts",
    },
    {
      claim: "four, five or six pads by difficulty, and sequence length grows with progress",
      source: "src/games/echo/logic.ts",
    },
  ],
};
