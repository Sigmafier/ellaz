import type { GameContent } from "../types";
import { flowFr } from "./fr/flow";

/**
 * Pipe Flow - the puzzle whose promise is a property of the CONSTRUCTION rather
 * than a claim about it. `deal` builds one walk that visits every square of the
 * grid exactly once, then cuts it into a segment per colour, so the segments
 * cover the board and cannot overlap. A solution exists before the board is
 * shown, and nothing has to be solved to check.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and make different jokes, because a translation
 * carries the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * Every figure here comes from `scripts/sim/flow-routes.mjs`, which drives the
 * shipped rules over 4,000 dealt boards per level, or from the game's own code.
 * See `provenance` at the bottom.
 *
 * EACH LANGUAGE NAMES ITS OWN ADMISSION, and all four are measured. Hebrew and
 * Spanish take the stranding (shortest-first play walls a colour in on 29.5% of
 * hard boards), English takes the coverage (joining every pair leaves nearly
 * four squares in ten bare and the board refuses to end), and French takes the
 * undo (a committed pipe cannot be stepped back, only redrawn whole).
 *
 * THE PREVIOUS ADMISSION IS GONE ON PURPOSE AND MUST NOT COME BACK. Until
 * 2026-08-25 all four pages said the hard board's answer had the same shape
 * every time, because the walk came from a budgeted search that gave up on
 * 91.17% of hard deals and fell back to a fixed row-by-row zigzag. That was
 * true when it was written and measured twice over. `logic.ts` replaced the
 * search with backbite, the same script now reads 0% on medium and hard, and a
 * stale admission is worse than no admission - it is the one paragraph a reader
 * trusts. The four "follow the rows" tips it justified went with it.
 */
export const flow: GameContent = {
  id: "flow",

  copy: {
    he: {
      name: "צינורות",
      metaTitle: "צינורות - משחק חיבור נקודות חינם | Ellaz",
      metaDescription:
        "משחק צינורות חינמי בדפדפן. מותחים צינור מכל נקודה אל התאומה שלה, ומכסים את כל הלוח. שלוש רשתות, נגיעה או גרירה, בלי הרשמה.",

      lede: "משחק צינורות חינם, ישר בדפדפן. על הרשת יושבים זוגות של נקודות צבעוניות, ואתם מותחים צינור מנקודה אחת אל התאומה שלה דרך משבצות שנוגעות זו בזו. הלוח נסגר כשכל הזוגות חוברו וגם כל משבצת מכוסה.",

      body: [
        "נוגעים בנקודה, אחר כך במשבצת שלידה, ועוד אחת, עד לנקודה באותו צבע. זהו כל המשחק. גרירה היא קיצור דרך ולא חובה.",

        "הלוח הזה לא נבנה בפיזור נקודות ותקווה. המשחק מתחיל ממסלול אחד שעובר בכל משבצת של הרשת בדיוק פעם אחת, חותך אותו לקטעים, קטע לכל צבע, ושני הקצוות של כל קטע הופכים לזוג נקודות. הקטעים האלה מתחלקים ביניהם במסלול שכבר כיסה את כל הלוח, אז הם מכסים כל משבצת ואין להם דרך להצטלב. הפתרון קיים לפני שראיתם את הלוח. את המסלול עצמו המשחק גם לא מחפש אלא מערבב: הוא מתחיל מזיגזג פשוט של שורה והלוך חזור ומקפל אותו 9,800 פעמים ברשת הגדולה, וכל קיפול משאיר אותו עובר בכל משבצת בדיוק פעם אחת. הרצנו 4,000 לוחות בכל רמה: צינור מודד 6.3 משבצות בממוצע ברשת הקטנה, 7.2 בבינונית ו-8.2 בגדולה.",

        "אבל המספר המעניין הוא אחר. ברשת הגדולה המרחק הישר בין שתי נקודות של זוג הוא 5.1 משבצות, והצינור שמחבר אותן רץ 8.2. פי 1.61. הפער הזה הוא המשחק עצמו, כי המשבצות שהקו הישר עוקף חייבות להתמלא במשהו, והמשהו הזה הוא בדרך כלל הצינור שחשבתם שיהיה קצר. שתי נקודות של אותו זוג גם לא צמודות אף פעם, לא באחד מ-24,000 הזוגות שספרנו ברמה הקשה.",

        "לחבר זה לא לנצח. בוט שמחבר כל זוג בדרך הקצרה ביותר מכסה 61.2 אחוז מהלוח הקשה, כלומר כמעט ארבע משבצות מכל עשר נשארות ריקות, והלוח פשוט לא נסגר.",

        "וההודאה, שנמדדה ולא נוחשה. מי שלוקח כל זוג בדרך הקצרה תוקע צבע בלי שום מסלול פנוי ב-29.5 אחוז מהלוחות הקשים, וב-17.5 אחוז מהקלים. המשחק לא מזהיר מראש ולא מסמן איזה צבע אשם. הוא פשוט לא נסגר. הדרך החוצה היא למחוק צבע ולמתוח אותו מחדש, וילד שעוד לא הבין את זה יכול לשבת מול לוח תקוע דקה שלמה.",
      ],

      howToPlay: [
        { title: "מתחילים בנקודה", body: "נוגעים בנקודה צבעונית. צינור יכול להתחיל רק שם ולא באמצע הלוח." },
        { title: "מתקדמים משבצת", body: "כל נגיעה נוספת מזיזה משבצת אחת לצד, למעלה או למטה. אלכסון לא נחשב." },
        { title: "סוגרים על התאומה", body: "הגעתם לנקודה באותו צבע והצינור נסגר. הוא נספר כמהלך אחד, בין אם אורכו שלוש משבצות או אחת עשרה." },
        { title: "מתחרטים בחינם", body: "נגיעה חוזרת בנקודה של צבע מוחקת את הצינור שלו. מעבר דרך צינור אחר חותך אותו במקום הפגישה במקום לחסום אתכם." },
        { title: "ממלאים את האחרונה", body: "כל הזוגות מחוברים וכל המשבצות תפוסות. משבצת ריקה אחת מספיקה כדי שהלוח יישאר פתוח." },
      ],

      tips: [
        {
          title: "תתחילו מהפינות",
          body: "לפינה יש שתי שכנות בלבד, אז צינור שעובר בה חייב להסתובב שם. זה מסלול של שתי משבצות שקיבלתם בלי לנחש כלום.",
        },
        {
          title: "החורים הם הרמז",
          body: "כשהכול מחובר ונשארה משבצת ריקה, היא מצביעה על האשם. הצבע שעובר לידה הוא כמעט תמיד זה שהלך ישר מדי.",
        },
        {
          title: "הדרך הקצרה היא המלכודת",
          body: "חיבור כל זוג במסלול הקצר ביותר משאיר צבע בלי שום דרך לצאת ב-29.5 אחוז מהלוחות הקשים. כשלמסלול יש בחירה, קחו את זה שבולע משבצת שאף אחד אחר לא מגיע אליה.",
        },
        {
          title: "אל תפחדו לחתוך",
          body: "מעבר דרך צינור אחר לא נחסם, הוא מקצר אותו. לרוב מהר יותר לעבור ואז לחדש את הצבע השני מאשר לחשוב על הסדר המושלם.",
        },
        {
          title: "צבע אחד שווה רבע",
          body: "הצינור הארוך בלוח קשה מודד 11.2 משבצות בממוצע, שהם 22.8 אחוז מהרשת. מי שמוצא אותו ראשון קבע את שאר הלוח.",
        },
      ],

      teaches: [
        { title: "לכסות שטח", body: "למלא משטח בלי להשאיר חור ובלי לעבור פעמיים היא מחשבה גאומטרית שהמשחק מלמד באצבע לפני שיודעים לקרוא לה בשם." },
        { title: "לתכנן מסלול", body: "צינור מוכרעים עליו לפני שמותחים אותו. אחרי כמה לוחות מסתכלים איפה יהיה חייב לעבור ולא על הקו הישר שקופץ לעין." },
        { title: "לתקן בלי עונש", body: "שום טעות פה אינה סופית. חוזרים לנקודה, הצינור נעלם, וניסיון עולה בדיוק אפס." },
        { title: "לספור באמת", body: "לדעת שנשארו ארבע משבצות לכסות ושהצינור שביד תופס כבר שש הוא חשבון, והוא משמש מיד." },
      ],

      ages: [
        { title: "5 עד 6", body: "רשת 5x5 עם 4 זוגות. המסלולים שם באורך 6.3 משבצות בממוצע, וזה נכנס לראש בגיל הזה." },
        { title: "7 עד 9", body: "רשת 6x6. חמישה צבעים, והרגע שבו מבינים שהמשבצת הריקה בפינה שווה בדיוק כמו הזוג המתבקש." },
        { title: "10 ומעלה", body: "רשת 7x7 עם 6 זוגות. צינור אחד יכול לרוץ שם על אחת עשרה משבצות, והסדר שבו מניחים מתחיל להכריע." },
        { title: "מבוגרים", body: "לוח קשה ב-6 מהלכים, כלומר מסלול אחד לכל צבע ואפס חרטות. זה נדיר יותר משזה נשמע." },
      ],

      accessibility:
        "כל משבצת היא כפתור אמיתי שמכריז על השורה והעמודה שלו, ונגיעה לבדה מספיקה לכל פעולה במשחק. גרירה היא קיצור דרך ולא תנאי, מה שחשוב ליד קטנה שעדיין לא מדייקת ולאמצעי הצבעה חלופיים. מקש אנטר ומקש הרווח מניחים צינור בדיוק כמו אצבע, אז אפשר לשחק את כל הלוח מהמקלדת. אין שעון ואין ספירה לאחור, ולוח שהשארתם נשאר בדיוק כמו שהיה. תנועה שאינה חוקית עונה בניעור קטן ולא בצליל שגיאה, כי סירוב הוא לא נזיפה. שמונת הצבעים פרושים גם על סולם הבהירות ולא רק על הגוון, כך ששני צינורות שנראים זהים לעין עיוורת צבעים נשארים אחד בהיר ואחד כהה.",

      together: [
        { title: "צבע לכל אחד", body: "בתורות, צבע אחד לכל שחקן. מגלים מהר שהמסלול של השני עבר בדיוק במקום שתכננתם ללכת אליו." },
        {
          title: "להגיד לפני שמותחים",
          body: "לומר בקול איפה הצינור יעבור ורק אז למתוח אותו. ילד שיודע לענות משחק את המשחק ולא עוקב אחרי האצבע שלו.",
        },
        { title: "ציד חורים", body: "חברו הכול איך שיוצא, ואז חפשו יחד את המשבצות שנשארו ריקות. ברשת הגדולה הן כמעט ארבע מכל עשר, וכל אחת מספרת את הטעות." },
        { title: "ההימור על הארוך", body: "לפני שמתחילים, כל אחד מנחש לאיזה צבע יהיה הצינור הארוך ביותר. זו שאלה של קריאת לוח, והתשובה מתבררת בסוף." },
      ],

      faq: [
        {
          q: "כל לוח באמת פתיר?",
          a: "כן, וזו בנייה ולא בדיקה. המשחק חותך מסלול שכבר ביקר בכל משבצת, אז הקטעים מכסים את הרשת ואין ביניהם הצטלבות.",
        },
        {
          q: "למה הלוח לא נסגר אם חיברתי הכול?",
          a: "כי נשארה משבצת ריקה. חיבור כל הזוגות בדרך הקצרה מכסה רק 61.2 אחוז מהלוח הקשה, והמשחק מחכה למשבצות שאף צינור לא נגע בהן.",
        },
        {
          q: "מה קורה כשאני עובר דרך צינור אחר?",
          a: "הוא נחתך במקום הפגישה ואתם ממשיכים. שום דבר לא נחסם, פשוט הצבע השני צריך להימתח מחדש.",
        },
        {
          q: "חייבים לגרור?",
          a: "לא. נגיעה משבצת אחרי משבצת עושה בדיוק אותו דבר, וגם המקלדת, וצינור של אחת עשרה משבצות נספר כמהלך אחד בשתי הדרכים.",
        },
        {
          q: "כמה מהלכים זו תוצאה טובה?",
          a: "כמספר הזוגות, כלומר 4, 5 או 6 לפי הרשת. כל צינור שנמתח מעבר למספר הזה הוא חרטה.",
        },
        { q: "המשחק חינמי?", a: "לגמרי. אין תשלום, אין פרסומות ואין הרשמה." },
        {
          q: "עובד בלי אינטרנט?",
          a: "כן, אחרי ביקור אחד. גם הלוח שבאמצע נשמר, אז סגירת הלשונית לא מוחקת אותו.",
        },
        {
          q: "איך נמדד השיא?",
          a: "במהלכים, כשפחות זה טוב יותר, ובנפרד לכל רשת. אחת עשרה על 5x5 ואחת עשרה על 7x7 אינם אותו הישג.",
        },
      ],

      keywords: ["צינורות", "חיבור נקודות", "פאזל", "לוגיקה", "חשיבה", "משחק רשת"],
    },

    en: {
      name: "Pipe Flow",
      metaTitle: "Free Pipe Flow Puzzle - Play Online | Ellaz",
      metaDescription:
        "A free pipe puzzle in your browser. Join every pair of coloured dots and cover every square. Three grids, tap or drag, no account and no download.",

      lede: "A free pipe puzzle that runs in your browser. Pairs of coloured dots sit on a square grid, and you draw a pipe from one dot to its twin through squares that touch. The board is finished when every pair is joined and every square is covered.",

      body: [
        "Touch a dot. Touch the square beside it, then the next one, until you reach the matching dot. Dragging is a shortcut, never a requirement.",

        "The board is not scattered and then hoped over. It starts from an answer. The game traces a single walk that visits every square of the grid exactly once, chops that walk into pieces, one per colour, and the two ends of each piece become a pair of dots. Because those pieces share out a walk that had already covered the whole grid, they cover every square and they have no way to cross. A solution exists before the board is drawn, and nobody had to solve anything to check. The walk is not searched for either. It starts life as a plain row-by-row zigzag and is then folded 9,800 times on the large grid, each fold leaving it still visiting every square exactly once. Across 4,000 dealt boards per level, one pipe runs 6.3 squares on the small grid, 7.2 on the middle one and 8.2 on the large.",

        "The number worth knowing is a different one. On the large grid the two dots of a pair sit 5.1 squares apart as the crow flies, and the pipe that joins them runs 8.2. A detour of 1.61 times. That gap is the puzzle: the squares a straight run skips have to be filled by somebody, and the somebody is usually the pipe you thought would be short. No pair ever has its dots side by side either, in none of the 24,000 hard pairs we counted.",

        "Taking the short way is worse than it looks. A bot that joins each pair by its own shortest route walls a colour in with no free route left on 29.5% of hard boards, and on 17.5% of the easy ones. So the free-looking route is the one to think twice about.",

        "Now the admission. Measured, not guessed. That same shortest-route bot covers 61.2% of a hard board, which leaves nearly four squares in ten bare and the game flatly refuses to end. All it says is that squares are still empty. It does not name the colour that went too straight, there is no hint button anywhere, and a player who has not yet worked out that covering is half the job will read a board that looks finished as a board that is broken.",
      ],

      howToPlay: [
        { title: "Start on a dot", body: "Touch a coloured dot. A pipe can only begin there, never in the middle of the board." },
        { title: "Move one square", body: "Each further touch steps one square sideways, up or down. Diagonals do not count as touching." },
        { title: "Close on the twin", body: "Reach the dot of the same colour and the pipe closes. It counts as one move whether it ran three squares or eleven." },
        { title: "Change your mind free", body: "Touch a colour's dot again and its pipe disappears. Running through another colour cuts that one at the meeting point rather than blocking you." },
        { title: "Fill the last square", body: "Every pair joined and every square taken. One empty square is enough to leave the board unfinished." },
      ],

      tips: [
        {
          title: "Corners first",
          body: "A corner has two neighbours and no more, so a pipe passing through one has to turn there. That is two squares of route you were handed without guessing anything.",
        },
        {
          title: "The holes are the clue",
          body: "When everything is joined and a square is still bare, that square names the culprit. The colour running past it is almost always the one that went too straight.",
        },
        {
          title: "The short way is a trap",
          body: "Joining every pair by its shortest route strands a colour with nowhere left to go on 29.5% of hard boards. When a route has a choice, take the one that swallows a square nothing else can reach.",
        },
        {
          title: "Cut without fear",
          body: "Going through another pipe blocks nothing, it shortens that pipe. Crossing and then redrawing the other colour is usually faster than working out a perfect order.",
        },
        {
          title: "One colour is a quarter",
          body: "The longest pipe on a hard board measures 11.2 squares on average, which is 22.8% of the grid. Whoever finds that one first has decided most of the board.",
        },
      ],

      teaches: [
        { title: "Covering a space", body: "Filling a surface with no hole and no square used twice is a piece of geometry this game puts under a finger long before anyone can name it." },
        { title: "Planning a route", body: "A pipe is decided before it is drawn. After a few boards you start looking at where it will have to go rather than at the straight line that jumps out." },
        { title: "Fixing without cost", body: "No mistake here is final. Go back to the dot, the pipe vanishes, and trying something costs exactly nothing." },
        { title: "Counting for real", body: "Knowing four squares are left to cover and the pipe in hand already holds six is arithmetic, and it pays off within the second." },
      ],

      ages: [
        { title: "5 to 6", body: "The 5x5 grid with 4 pairs. Routes there average 6.3 squares, which fits in a head of that age." },
        { title: "7 to 9", body: "The 6x6. Five colours, and the moment a child works out that the bare square in the corner matters as much as the obvious pair." },
        { title: "10 and up", body: "The 7x7 with 6 pairs. A single pipe can run eleven squares here, and the order you lay them in starts to decide the board." },
        { title: "Grown-ups", body: "A hard board in 6 moves, meaning one route per colour and not a single regret. That is rarer than it sounds." },
      ],

      accessibility:
        "Every square is a real button that announces its own row and column, and a touch alone does everything in the game. Dragging is a shortcut rather than a condition, which matters for a small hand that does not aim well yet and for anyone on an alternative pointer. Enter and the space bar lay a pipe exactly as a finger does, so a whole board can be played from the keyboard. There is no clock and no countdown, and a board you walk away from is exactly where you left it. A move that is not allowed answers with a small shake instead of an error sound, because a refusal is not a telling-off. The eight colours are spread across lightness as well as hue, so two pipes a colour-blind player reads as one hue are still a pale one and a dark one.",

      together: [
        { title: "A colour each", body: "Take turns, one colour per player. You find out quickly that the other person's route went exactly where you were heading." },
        {
          title: "Say it before you draw it",
          body: "Call out where the pipe is going, then draw it. A child who can answer that is playing the game rather than following their own finger.",
        },
        { title: "Hunt the holes", body: "Join everything any old way, then look together for the squares left bare. On the large grid it is nearly four in ten, and each one tells the story." },
        { title: "Bet on the longest", body: "Before you start, each of you guesses which colour will end up with the longest pipe. It is a question about reading a grid, and the answer arrives at the end." },
      ],

      faq: [
        {
          q: "Is every board really solvable?",
          a: "Yes, and it is built rather than tested. The game cuts up a walk that had already visited every square, so the pieces cover the grid and cannot cross each other.",
        },
        {
          q: "Why won't the board finish when everything is joined?",
          a: "Because a square is still empty. Joining every pair the short way covers only 61.2% of a hard board, and the game is waiting for the ones nothing reached.",
        },
        {
          q: "What happens if I run through another pipe?",
          a: "It gets cut at the meeting point and you carry on. Nothing is blocked; the other colour simply has to be drawn again.",
        },
        {
          q: "Do I have to drag?",
          a: "No. Tapping square by square does exactly the same thing, and so does the keyboard, and a pipe of eleven squares counts as one move either way.",
        },
        {
          q: "How many moves is a good score?",
          a: "As many as there are pairs, so 4, 5 or 6 depending on the grid. Every pipe drawn beyond that count is a change of mind.",
        },
        { q: "Is it free?", a: "Completely. No payment, no ads, and nothing to sign up for." },
        {
          q: "Does it work offline?",
          a: "Yes, after one visit. A board in progress is kept too, so closing the tab does not throw it away.",
        },
        {
          q: "How is the record measured?",
          a: "In moves, where fewer is better, and separately per grid. Eleven on a 5x5 and eleven on a 7x7 are not the same achievement.",
        },
      ],

      keywords: ["pipe flow", "connect the dots", "puzzle", "logic", "grid game", "colour pipes"],
    },

    es: {
      name: "Tuberías",
      metaTitle: "Tuberías - puzle gratis de unir colores | Ellaz",
      metaDescription:
        "Puzle de tuberías gratis en el navegador. Une cada pareja de puntos y cubre todas las casillas. Tres rejillas, con el dedo o con el teclado.",

      lede: "Un puzle de tuberías gratis y en el navegador. Sobre una rejilla hay parejas de puntos de colores, y tú llevas una tubería de un punto a su gemelo pasando por casillas que se tocan. El tablero se cierra cuando todas las parejas están unidas y no queda ni una casilla vacía.",

      body: [
        "Tocas un punto. Luego la casilla de al lado, luego la siguiente, hasta el punto del mismo color. Arrastrar es un atajo y nunca una obligación.",

        "El tablero no se siembra al azar para después cruzar los dedos. Se construye desde la respuesta. El juego traza un recorrido que pasa por cada casilla exactamente una vez, lo corta en trozos, uno por color, y los dos extremos de cada trozo se convierten en una pareja de puntos. Como esos trozos se reparten un recorrido que ya había cubierto la rejilla entera, la cubren toda y no tienen manera de cruzarse. La solución existe antes de que el tablero aparezca. El recorrido tampoco se busca. Nace como un zigzag corriente de fila en fila y luego se dobla 9.800 veces en la rejilla grande, y cada doblez lo deja pasando aún por cada casilla una sola vez. Sobre 4.000 tableros repartidos por nivel, una tubería mide 6,3 casillas de media en la rejilla pequeña, 7,2 en la mediana y 8,2 en la grande.",

        "El dato que importa es otro. En la rejilla grande los dos puntos de una pareja están a 5,1 casillas en línea recta, y la tubería que los une recorre 8,2. Un rodeo de 1,61 veces. Ese hueco es el juego entero, porque las casillas que el camino recto se salta las tiene que llenar alguien, y ese alguien suele ser la tubería que dabas por corta. Tampoco hay nunca una pareja con los dos puntos pegados, ni una sola de las 24.000 parejas difíciles que contamos.",

        "Unir no es ganar. Un robot que une cada pareja por su camino más corto cubre el 61,2% del tablero difícil, o sea que casi cuatro casillas de cada diez se quedan peladas y el tablero no se cierra.",

        "Y la parte honesta, medida en vez de supuesta. Quien tira siempre por el camino corto acaba encerrando un color sin ningún recorrido libre en el 29,5% de los tableros difíciles y en el 24,6% de los medianos. El juego no avisa antes ni señala después qué color se equivocó. Simplemente no se cierra. La salida es borrar un color y volver a trazarlo, y a un niño que aún no ha caído en eso el tablero le parece roto.",
      ],

      howToPlay: [
        { title: "Empieza en un punto", body: "Toca un punto de color. Una tubería solo puede nacer ahí, nunca en mitad del tablero." },
        { title: "Avanza una casilla", body: "Cada toque siguiente se mueve una casilla a un lado, arriba o abajo. La diagonal no cuenta como tocarse." },
        { title: "Cierra en el gemelo", body: "Llegas al punto del mismo color y la tubería se cierra. Cuenta como un movimiento tanto si midió tres casillas como si midió once." },
        { title: "Cambia de idea gratis", body: "Vuelve a tocar el punto de un color y su tubería desaparece. Pasar por encima de otro color lo corta en el punto del encuentro en vez de cerrarte el paso." },
        { title: "Llena la última", body: "Todas las parejas unidas y todas las casillas ocupadas. Una casilla vacía basta para que el tablero siga sin terminar." },
      ],

      tips: [
        {
          title: "Las esquinas primero",
          body: "Una esquina tiene dos vecinas y nada más, así que la tubería que pase por ella está obligada a girar ahí. Son dos casillas de recorrido regaladas.",
        },
        {
          title: "Los huecos son la pista",
          body: "Cuando está todo unido y queda una casilla pelada, esa casilla señala al culpable. El color que pasa a su lado casi siempre es el que fue demasiado recto.",
        },
        {
          title: "El camino corto es la trampa",
          body: "Unir cada pareja por su ruta más corta deja un color sin salida en el 29,5% de los tableros difíciles. Cuando una ruta puede elegir, coge la que se traga una casilla a la que no llega nadie más.",
        },
        {
          title: "Corta sin miedo",
          body: "Atravesar otra tubería no bloquea nada, la acorta. Cruzar y rehacer luego el otro color suele salir más rápido que dar con el orden perfecto.",
        },
        {
          title: "Un color vale un cuarto",
          body: "La tubería más larga de un tablero difícil mide 11,2 casillas de media, un 22,8% de la rejilla. Quien la encuentra primero ha decidido casi todo el tablero.",
        },
      ],

      teaches: [
        { title: "Cubrir un espacio", body: "Llenar una superficie sin dejar hueco y sin repetir casilla es una idea de geometría que este juego pone bajo el dedo mucho antes de saber nombrarla." },
        { title: "Planificar un recorrido", body: "Una tubería se decide antes de trazarla. Tras unos cuantos tableros se mira por dónde tendrá que pasar y no la recta que salta a la vista." },
        { title: "Corregir sin castigo", body: "Aquí ningún error es definitivo. Vuelves al punto, la tubería se borra, y probar cuesta exactamente cero." },
        { title: "Contar de verdad", body: "Saber que quedan cuatro casillas por cubrir y que la tubería en la mano ya ocupa seis es una cuenta, y sirve en el acto." },
      ],

      ages: [
        { title: "5 a 6", body: "La rejilla 5x5 con 4 parejas. Los recorridos miden ahí 6,3 casillas de media, que es lo que cabe en una cabeza de esa edad." },
        { title: "7 a 9", body: "La 6x6. Cinco colores, y el momento en que se entiende que la casilla vacía del rincón vale igual que la pareja evidente." },
        { title: "10 en adelante", body: "La 7x7 con 6 parejas. Una sola tubería puede correr once casillas, y el orden en que se colocan empieza a decidir." },
        { title: "Adultos", body: "Un tablero difícil en 6 movimientos, o sea un recorrido por color y ni un arrepentimiento. Pasa menos de lo que parece." },
      ],

      accessibility:
        "Cada casilla es un botón de verdad que anuncia su fila y su columna, y con tocar basta para hacer todo lo que hay en el juego. Arrastrar es un atajo y no una condición, algo que importa para una mano pequeña que todavía no apunta bien y para cualquier puntero alternativo. La tecla Intro y la barra espaciadora colocan tubería igual que un dedo, así que el tablero entero se juega desde el teclado. No hay reloj ni cuenta atrás, y un tablero que dejas a medias sigue tal cual lo dejaste. Un movimiento que no se permite responde con una sacudida pequeña y no con un sonido de error, porque negarse no es una regañina. Los ocho colores están repartidos también en claridad y no solo en tono, de modo que dos tuberías que un jugador daltónico lee igual siguen siendo una clara y una oscura.",

      together: [
        { title: "Un color cada uno", body: "Por turnos, un color por persona. Se descubre enseguida que el recorrido del otro pasaba justo por donde ibas tú." },
        {
          title: "Dilo antes de trazarlo",
          body: "Contar en voz alta por dónde va a ir la tubería y trazarla después. Un niño que sabe responder está jugando y no siguiendo su propio dedo.",
        },
        { title: "Caza de huecos", body: "Unid todo como salga y buscad luego juntos las casillas que quedaron vacías. En la rejilla grande son casi cuatro de cada diez, y cada una cuenta el error." },
        { title: "La apuesta del más largo", body: "Antes de empezar, cada uno adivina qué color acabará con la tubería más larga. Es una pregunta sobre leer la rejilla, y se comprueba al final." },
      ],

      faq: [
        {
          q: "¿Todos los tableros tienen solución?",
          a: "Sí, y está construida en vez de comprobada. El juego corta un recorrido que ya había visitado cada casilla, así que los trozos cubren la rejilla y no pueden cruzarse.",
        },
        {
          q: "¿Por qué no se cierra el tablero si está todo unido?",
          a: "Porque queda una casilla vacía. Unir cada pareja por el camino corto cubre solo el 61,2% de un tablero difícil, y el juego espera las que no ha tocado nadie.",
        },
        {
          q: "¿Qué pasa si atravieso otra tubería?",
          a: "Se corta en el punto del encuentro y tú sigues. No se bloquea nada, simplemente hay que volver a trazar el otro color.",
        },
        {
          q: "¿Hace falta arrastrar?",
          a: "No. Tocar casilla a casilla hace exactamente lo mismo, y el teclado también, y una tubería de once casillas cuenta como un movimiento de las dos maneras.",
        },
        {
          q: "¿Cuántos movimientos son un buen resultado?",
          a: "Tantos como parejas, o sea 4, 5 o 6 según la rejilla. Cada tubería trazada por encima de esa cifra es un arrepentimiento.",
        },
        { q: "¿Es gratis?", a: "Del todo. Ni pagos, ni anuncios, ni registro." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí, después de la primera visita. El tablero a medias también se guarda, así que cerrar la pestaña no lo tira.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En movimientos, donde menos es mejor, y por separado en cada rejilla. Once en una 5x5 y once en una 7x7 no son el mismo logro.",
        },
      ],

      keywords: ["tuberías", "unir puntos", "puzle", "lógica", "juego de rejilla", "tuberías de colores"],
    },

    fr: flowFr,
  },

  provenance: [
    {
      claim: "4,000 dealt boards per level; a pipe runs 6.3 squares on easy, 7.2 on medium and 8.2 on hard",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "on hard the two dots of a pair sit 5.1 squares apart while the pipe runs 8.2, a detour of 1.61x",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "no pair has adjacent dots, across 24,000 hard pairs",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "the longest pipe on a hard board averages 11.2 squares, 22.8% of the grid",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "joining every pair by its shortest route covers 61.2% of a hard board and leaves nearly four squares in ten bare",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "shortest-route play walls a colour in with no route left on 29.5% of hard boards, 24.6% of medium and 17.5% of easy",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "the walk is a row-by-row seed stirred by 200 backbite folds per cell, 9,800 on the 7x7, and no medium or hard deal is still recognisable as that seed",
      source: "scripts/sim/flow-routes.mjs",
    },
    {
      claim: "5x5 with four pairs, 6x6 with five, 7x7 with six, and no pipe shorter than three squares",
      source: "src/games/flow/logic.ts",
    },
    {
      claim: "the record is moves, fewer is better, scoped per grid",
      source: "src/sdk/score.ts",
    },
  ],
};
