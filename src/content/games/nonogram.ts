import type { GameContent } from "../types";
import { nonogramFr } from "./fr/nonogram";

/**
 * Picture Logic - the puzzle whose fairness is PROVED before the board is
 * shown. `deal` draws the picture first, reads the run lengths off it, and then
 * hands those numbers to a line solver that may only write a cell when every
 * legal arrangement of that line agrees about it. A board it cannot finish is
 * thrown away, so nothing a player meets needs a guess.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and pick different things to be honest about,
 * because a translation carries the source language's rhythm and that rhythm is
 * exactly what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/nonogram-solvable.mjs`, which drives
 * the shipped rules over 4,000 candidate pictures per tier, or from the game's
 * own code. See `provenance` at the bottom.
 *
 * EACH LANGUAGE NAMES ITS OWN ADMISSION, and all four are true of the shipped
 * game rather than chosen for effect. Hebrew takes the SIZE (a cell on the
 * largest grid lands near 18 pixels on a phone, so that tier belongs on a
 * tablet), English takes the SILENCE (nothing tells you a cell is wrong, and on
 * the largest grid the mistake surfaces a long way from where it was made),
 * Spanish takes the CROSSES (they are optional, unchecked notes, and a player
 * who never makes them is doing the hardest tier the hard way), and French
 * takes the DRAG (a swipe paints whatever its first cell became, which empties
 * a row as readily as it fills one).
 */
export const nonogram: GameContent = {
  id: "nonogram",

  copy: {
    he: {
      name: "ציור לפי מספרים",
      metaTitle: "ציור לפי מספרים - משחק לוגיקה חינם | Ellaz",
      metaDescription:
        "משחק לוגיקה חינמי בדפדפן. המספרים בצד סופרים רצפים של משבצות מלאות, וכשממלאים נכון מתגלה ציור. שלושה גדלים, בלי הרשמה ובלי הורדה.",

      lede: "משחק לוגיקה חינם ישר בדפדפן. לכל שורה ולכל עמודה יש מספרים שסופרים את הרצפים של המשבצות המלאות בה, וכשממלאים את המשבצות הנכונות מתגלה ציור קטן ברשת. אף לוח כאן לא דורש ניחוש אחד.",

      body: [
        "קוראים שורה. המספרים אומרים כמה משבצות מלאות רצופות יש בה, לפי הסדר. ממלאים. זה כל המשחק.",

        "הלוח הזה לא נבנה בפיזור מספרים ובדיקה אחר כך. הוא מתחיל מתמונה. המשחק מצייר אותה, קורא ממנה את אורכי הרצפים, ואז מוסר את המספרים לפותר שמותר לו לכתוב משבצת רק כשכל הסידורים החוקיים של אותה שורה מסכימים עליה. אם הפותר סוגר את כל הרשת, המספרים מכתיבים תמונה אחת בלבד, ושחקן יכול להגיע אליה בלי לנחש אפילו פעם אחת. אם הוא נתקע באמצע, התמונה נזרקת והמשחק מצייר אחרת במקומה. על 4,000 תמונות מועמדות בכל רמה, 87.7 אחוז עוברות את המבחן הזה ברשת הקטנה ו-82.0 אחוז בגדולה, כלומר לוח אחד עולה בערך 1.25 תמונות וחמש במקרה הגרוע שנמדד.",

        "המספר שמסביר איך המשחק מרגיש הוא אחר. מעבר אחד על כל השורות ואז על כל העמודות מסדר לבד 85.3 אחוז מהרשת הקטנה. בגדולה אותו מעבר מסדר 58.2 אחוז, וכל השאר מגיע רק מקריאה של ציר אחד מול השני, על פני 4.15 מעברים בממוצע ועד 12. הצלע גדלה פי שלוש. ההלוך ושוב בין הצירים גדל הרבה יותר.",

        "בערך חצי מהמשבצות נשארות מלאות בכל גודל, וזו החלטה. לוח שמלא שלושה רבעים הוא תמונה כהה יותר ולא חידה עמוקה יותר. הרשת הגדולה נושאת 53 מספרים סביב הקצוות, מול 15 בקטנה.",

        "וההודאה. הרשת הגדולה קטנה על טלפון. המשבצת יורדת שם לכ-18 פיקסלים והמספר שלידה קטן ממנה, אז מי שפותח את הרמה הקשה על מסך צר עובד קשה כדי לקרוא ולא כדי להסיק. סיבוב המכשיר לרוחב עוזר קצת. התשובה הכנה היא שהלוח הגדול נבנה למסך רחב, ושתי הרמות האחרות הן אלה שנכנסות לכיס בנוחות.",
      ],

      howToPlay: [
        { title: "קוראים את המספרים", body: "כל שורה וכל עמודה נושאות את אורכי הרצפים שלהן, לפי הסדר. שורה עם 4 1 אומרת ארבע מלאות, לפחות ריקה אחת, ואז עוד מלאה." },
        { title: "ממלאים משבצת", body: "נגיעה ממלאת אותה. נגיעה נוספת באותו מקום מרוקנת בחזרה, אז חרטה לא דורשת כפתור נפרד." },
        { title: "מסמנים ריק", body: "המצב השני מסמן משבצת כריקה. אלה ההערות שלכם: המשחק לא דורש אותן ולא בודק אותן." },
        { title: "עוקבים אחרי מה שדוהה", body: "המספרים של שורה דוהים ברגע שהשורה אומרת בדיוק מה שהם מבטיחים. זה כל המשוב שהמשחק נותן." },
        { title: "רואים את הציור", body: "כשכל השורות וכל העמודות יוצאות נכון, הציור שלם והשעון נעצר." },
      ],

      tips: [
        {
          title: "מתחילים מהרצף הארוך",
          body: "רצף ארוך מחצי השורה חופף לעצמו בכל מיקום אפשרי, אז חלק ממנו ידוע מיד. ברשת הגדולה הרצף הארוך ביותר מודד 12.8 משבצות בממוצע, כלומר כמעט כל השורה שלו.",
        },
        {
          title: "האפס הוא המספר הכי טוב",
          body: "שורה שכתוב לידה 0 ריקה לגמרי, והיא חוצה כל עמודה שהיא עוברת בה. חפשו אותן לפני כל דבר אחר.",
        },
        {
          title: "סמנו ריק כמו שאתם ממלאים",
          body: "משבצת שידוע שהיא ריקה שווה בדיוק כמו משבצת מלאה, כי היא חוסמת רצף מלהתפשט. המעבר הראשון מסדר 58.2 אחוז מהלוח הגדול, וחלק גדול מהמספר הזה עשוי ממשבצות שסומנו ריקות.",
        },
        {
          title: "מחליפים ציר ברגע שנתקעים",
          body: "שורה שהפסיקה לתת מידע כמעט תמיד נפתחה בינתיים על ידי עמודה. הפותר של המשחק עושה את ההלוך ושוב הזה 4.15 פעמים עד שהוא מסיים.",
        },
        {
          title: "לא מנחשים, אף פעם",
          body: "אף לוח כאן לא דורש הימור. אם מתחשק לנחש, ההיסק שחסר לכם נמצא במקום אחר על הלוח.",
        },
      ],

      teaches: [
        { title: "לקרוא אילוץ", body: "3 1 הוא לא כמות אלא צורה, עם סדר ועם רווח מחויב בתוכה. להבין את זה זה כבר לקרוא סימון." },
        { title: "להצליב שני מקורות", body: "שורה לבדה כמעט אף פעם לא מספיקה. התשובה נולדת מהמפגש בין שורה לעמודה, וזו בדיוק צורתו של היסק מהצלבה." },
        { title: "לרשום מה נפסל", body: "לסמן משבצת כריקה זה לרשום מסקנה כדי לא להסיק אותה שוב. מי שמאמץ את ההרגל הזה מסיים את הרשת הגדולה מהר בהרבה." },
        { title: "להחזיק ודאות", body: "מכיוון ששום דבר כאן לא דורש הימור, כל משבצת שהונחה הוכחה. זו דרך שקטה ללמוד את ההבדל בין לדעת לבין לחשוב." },
      ],

      ages: [
        { title: "6 עד 8", body: "רשת של 25 משבצות עם 15 מספרים סביבה. מעבר אחד מסדר שם כבר 85.3 אחוז, אז ילד מתקדם כמעט בלי להיתקע." },
        { title: "9 עד 12", body: "רשת של 100 משבצות. מספר המספרים לשורה יורד שם ל-1.27 בממוצע, כלומר רצפים ארוכים והיסקים שנושאים רחוק." },
        { title: "13 ומעלה", body: "רשת של 225 משבצות ו-53 מספרים. המעבר הראשון נותן רק 58.2 אחוז, והשאר נקנה ציר אחרי ציר." },
        { title: "מבוגרים", body: "הלוח הגדול בלי לסמן ריק אפילו פעם אחת. זה אפשרי וזה מייגע, וזו דרך טובה להבין למה ההערות קיימות." },
      ],

      accessibility:
        "כל משבצת היא כפתור אמיתי שמכריז על השורה והעמודה שלו, ונגיעה לבדה מספיקה לכל פעולה במשחק. גרירה היא קיצור דרך ולא תנאי, מה שחשוב ליד קטנה שעדיין לא מדייקת ולאמצעי הצבעה חלופיים. מקש אנטר ומקש הרווח ממלאים משבצת בדיוק כמו אצבע, אז אפשר לפתור לוח שלם מהמקלדת. הבחירה בין מילוי לסימון ריק היא זוג כפתורים בגודל רגיל, אף פעם לא לחיצה ארוכה ולא אצבע שנייה. אין שעון שלוחץ ואין ספירה לאחור, ולוח שהשארתם חוזר בדיוק כמו שהיה. משבצת מלאה נבדלת לא רק בצבע: משבצת שסומנה כריקה נושאת איקס, ומשבצת שלא נגעו בה נשארת חלקה.",

      together: [
        { title: "ציר לכל אחד", body: "אחד קורא רק שורות, השני רק עמודות, ומעבירים את האצבע. מגלים מהר שהשני ראה דברים שלא נראו מהצד שלכם." },
        { title: "להגיד לפני שממלאים", body: "לומר בקול למה המשבצת הזאת חייבת להיות מלאה, ורק אז למלא. ילד שיודע לענות משחק את המשחק במקום לעקוב אחרי תחושה." },
        { title: "ההימור על הציור", body: "באמצע הדרך כל אחד מנחש מה הציור מראה. חצי מהמשבצות מלאות בסוף, אז באמצע כבר יש על מה לטעות בכיף." },
        { title: "ציד הריקים", body: "שתי דקות שבהן לא ממלאים כלום ורק מסמנים משבצות שבטוח ריקות. הלוח מתקדם בכל זאת, וזה תמיד מפתיע." },
      ],

      faq: [
        { q: "מה המספרים אומרים?", a: "את אורכי הרצפים של המשבצות המלאות באותה שורה או עמודה, לפי הסדר, כשבין רצף לרצף יש לפחות משבצת ריקה אחת. 4 1 זה ארבע מלאות, חור, ואחת מלאה." },
        { q: "יכולות להיות שתי תשובות ללוח אחד?", a: "לא. כל לוח נבדק לפני שהוא מוצג, ולוח שמתיר שתי תמונות נזרק. ברמה הקשה 18 אחוז מהתמונות שצוירו נזרקות מהסיבה הזאת." },
        { q: "צריך לנחש בשלב כלשהו?", a: "אף פעם. הבדיקה מחמירה יותר מיחידות: היא דורשת שחשיבה שורה אחרי שורה תספיק כדי למלא את כל הרשת." },
        { q: "בשביל מה האיקסים?", a: "כדי לרשום משבצות שידוע שהן ריקות. המשחק לא סופר אותן ולא מבקש אותן, אבל הן מה שפותח את הלוח הגדול." },
        { q: "המשחק אומר לי כשטעיתי?", a: "לא. המספרים של שורה שיצאה נכון דוהים, וזה כל המשוב. משבצת שגויה נשארת במקומה עד שאיזו שורה אחרת מסרבת להסתדר." },
        { q: "כמה זמן לוקח לוח?", a: "הקטן נקרא כמעט במכה אחת. הגדול דורש 4.15 מעברים בין הצירים רק בשביל החלק המכני של ההיסק." },
        { q: "המשחק חינמי?", a: "לגמרי. בלי תשלום, בלי פרסומות ובלי הרשמה." },
        { q: "עובד בלי אינטרנט?", a: "כן, אחרי ביקור אחד. גם הלוח שבאמצע נשמר, אז סגירת הלשונית לא מוחקת אותו." },
        { q: "איך נמדד השיא?", a: "בשעון, כשמהר יותר זה טוב יותר, ובנפרד לכל גודל רשת. ארבע דקות על 225 משבצות וארבע דקות על 25 אינם אותו אחר צהריים." },
      ],

      keywords: ["ציור לפי מספרים", "נונוגרם", "פיקרוס", "לוגיקה", "חידה", "חשיבה"],
    },

    en: {
      name: "Picture Logic",
      metaTitle: "Free Picture Logic Puzzle - Play Online | Ellaz",
      metaDescription:
        "A free nonogram in your browser. Read the run lengths, fill the right cells, and a picture comes out of the grid. Three sizes, tap or drag, no account.",

      lede: "A free picture-logic puzzle that runs in your browser. Every row and every column carries the lengths of its runs of filled cells, and filling the right ones brings a small picture out of the grid. No board here ever needs a guess.",

      body: [
        "Read a row. The numbers say how many filled cells run together in it, in order. Fill those. That is the whole game.",

        "The board is not scattered and then checked. It starts as a picture. The game draws one, reads the run lengths off it, and hands those numbers to a line solver that is only allowed to write a cell when every legal arrangement of that line agrees about it. If the solver finishes the whole grid, the numbers force exactly one picture and a player can reach it without guessing once. If it stalls anywhere, the picture is thrown away and another is drawn. Across 4,000 candidate pictures per tier, 87.7% survive that proof on the smallest grid and 82.0% on the largest, so a dealt board costs about 1.25 pictures on average and five in the worst case measured.",

        "The number that says what the game feels like is a different one. A single sweep of every row and then every column settles 85.3% of the smallest grid by itself. On the largest, that same sweep settles 58.2%, and the rest arrives only by reading one axis against the other, over 4.15 sweeps on average and up to 12. The side of the grid tripled. The amount of cross-referencing did a great deal more than triple.",

        "About half the cells end up filled at every size, which is a decision. A board three quarters black is a darker picture, never a deeper puzzle. The largest grid carries 53 numbers around its edges, against 15 on the smallest.",

        "Now the admission. Nothing here tells you a cell is wrong. A line's numbers fade once that line reads exactly what they promise, and that is the entire feedback; a cell filled in error simply sits there until some other line refuses to work out. On the largest grid that surfaces a long way from where the mistake was made. There is no undo history and no button pointing at the guilty line. The way out is to re-read the row and the column through the cell you doubt, and that is a skill this game does not teach you.",
      ],

      howToPlay: [
        { title: "Read the numbers", body: "Each row and column carries its run lengths in order. A row marked 4 1 means four filled cells, at least one empty, then one more filled." },
        { title: "Fill a cell", body: "A tap fills it. The same tap in the same place empties it again, so changing your mind needs no separate control." },
        { title: "Rule a cell out", body: "The second mode marks a cell as empty. Those are your own notes: the game never asks for them and never checks them." },
        { title: "Watch what fades", body: "A line's numbers dim the moment that line reads exactly what they say. That is all the feedback there is." },
        { title: "See the picture", body: "When every row and every column comes out right, the picture is done and the clock stops." },
      ],

      tips: [
        {
          title: "Start with the long run",
          body: "A run longer than half its line overlaps itself wherever you put it, so part of it is known straight away. The longest run on the largest grid averages 12.8 cells, which is most of a line for free.",
        },
        {
          title: "Zero is the best number",
          body: "A line marked 0 is entirely empty, and it cuts every column it crosses. Look for those before you look at anything else.",
        },
        {
          title: "Rule out as much as you fill",
          body: "A cell you know is empty is worth exactly as much as a filled one, because it stops a run reaching through it. One sweep settles 58.2% of the largest board, and much of that is cells ruled out rather than filled in.",
        },
        {
          title: "Change axis the moment you stall",
          body: "A row that has stopped giving anything has almost always been opened up by a column since you last looked. The game's own solver makes that swap 4.15 times before it is done.",
        },
        {
          title: "Never guess",
          body: "No board dealt here needs a bet. If you feel like taking one, the deduction you are missing is somewhere else on the grid.",
        },
      ],

      teaches: [
        { title: "Reading a constraint", body: "A clue of 3 1 is not a quantity, it is a shape, with an order and a compulsory gap inside it. Understanding that is already reading notation." },
        { title: "Crossing two sources", body: "One row alone is almost never enough. The answer comes out of where a row meets a column, the shape of cross-referenced reasoning." },
        { title: "Writing down what is ruled out", body: "Marking a cell empty records a conclusion so it never has to be reached twice. The habit finishes the big grid far faster." },
        { title: "Holding certainty", body: "Because nothing here calls for a bet, every cell placed has been proved. It is a quiet way to learn the difference between knowing and thinking." },
      ],

      ages: [
        { title: "6 to 8", body: "The 25-cell grid, with 15 numbers around it. One sweep already settles 85.3% of it, so a child rarely stalls." },
        { title: "9 to 12", body: "The 100-cell grid. Numbers per line drop to 1.27 on average there, which means longer runs and deductions that carry further." },
        { title: "13 and up", body: "The 225-cell grid and its 53 numbers. The first sweep gives only 58.2%; the rest is bought one axis at a time." },
        { title: "Grown-ups", body: "The big grid without ruling out a single cell. Possible, and a slog, which is a good way to find out what the notes are for." },
      ],

      accessibility:
        "Every cell is a real button that announces its own row and column, and a tap alone does everything in this game. Dragging is a shortcut rather than a condition, which matters for a small hand and for anyone on an alternative pointer. Enter and the space bar fill a cell exactly as a finger does, so a whole grid can be solved from the keyboard. Choosing between filling and ruling out is a pair of ordinary buttons, never a long press and never a second finger. There is no clock and no countdown, and a board you walk away from comes back as you left it. A filled cell is not told apart by colour alone: a ruled-out cell carries a cross, and an untouched one stays plain.",

      together: [
        { title: "An axis each", body: "One person reads only rows, the other only columns, and you hand the finger back and forth. The other one sees things you could not." },
        { title: "Say it before you fill it", body: "Call out why that cell has to be filled, and only then fill it. A child who can answer is playing the game rather than following a feeling." },
        { title: "Bet on the picture", body: "Halfway through, each of you guesses what the picture shows. Half the cells are filled by the end, so at the midpoint there is plenty to be cheerfully wrong about." },
        { title: "Hunt the empties", body: "Two minutes of filling nothing and marking only cells you are sure are empty. The board moves along anyway, which always surprises people." },
      ],

      faq: [
        { q: "What do the numbers mean?", a: "The lengths of the runs of filled cells in that line, in order, with at least one empty cell between runs. A clue of 4 1 means four filled, a gap, then one filled." },
        { q: "Can a board have two answers?", a: "No. Every board is checked before it is shown, and one that admits two pictures is thrown away. On the largest grid 18% of drawn pictures go in the bin for exactly that." },
        { q: "Do I ever have to guess?", a: "Never. The check is stricter than uniqueness: it demands that line-by-line reasoning alone is enough to fill the entire grid." },
        { q: "What are the crosses for?", a: "For recording cells you know are empty. The game does not count them and does not ask for them, but they are what opens up the big grid." },
        { q: "Does it tell me when I am wrong?", a: "No. A line that reads correctly has its numbers dim, and that is the whole of it. A wrong cell sits there until some other line refuses to come out." },
        { q: "How long does a board take?", a: "The small one reads almost in a single pass. The large one takes 4.15 swaps between the axes for the mechanical part alone." },
        { q: "Is it free?", a: "Completely. There is no payment, no advertising and nothing to sign up for." },
        { q: "Does it work offline?", a: "Yes, after one visit. A board in progress is kept too, so closing the tab does not wipe it." },
        { q: "How is the record measured?", a: "On the clock, faster winning, and separately for each grid size. Four minutes on 225 cells and four minutes on 25 are not the same afternoon." },
      ],

      keywords: ["picture logic", "nonogram", "picross", "logic puzzle", "grid puzzle", "thinking"],
    },

    es: {
      name: "Lógica de dibujo",
      metaTitle: "Nonograma gratis - lógica de dibujo | Ellaz",
      metaDescription:
        "Un nonograma gratuito en el navegador. Los números cuentan las rachas de casillas llenas y aparece un dibujo. Tres tamaños, sin cuenta y sin descargas.",

      lede: "Un juego de lógica gratuito que funciona en el navegador. Cada fila y cada columna lleva las longitudes de sus rachas de casillas llenas, y al rellenar las correctas aparece un pequeño dibujo dentro de la cuadrícula. Ningún tablero de aquí exige adivinar.",

      body: [
        "Se lee una fila. Los números dicen cuántas casillas llenas van seguidas, en ese orden. Se rellena. Ese es el juego entero.",

        "El tablero no se reparte al azar para comprobarlo después. Empieza siendo un dibujo. El juego lo traza, le lee las longitudes de las rachas y entrega esos números a un resolutor que solo puede escribir una casilla cuando todas las colocaciones legales de esa línea coinciden en ella. Si el resolutor termina la cuadrícula completa, los números imponen un único dibujo y quien juega puede llegar hasta él sin adivinar ni una vez. Si se atasca en cualquier punto, el dibujo se descarta y se traza otro. Sobre 4.000 dibujos candidatos por nivel, el 87,7 % supera esa prueba en la cuadrícula pequeña y el 82,0 % en la grande, de modo que un tablero cuesta unos 1,25 dibujos de media y cinco en el peor caso medido.",

        "La cifra que explica cómo se siente el juego es otra. Una sola pasada por todas las filas y luego por todas las columnas resuelve el 85,3 % de la cuadrícula pequeña por sí sola. En la grande, esa misma pasada resuelve el 58,2 %, y el resto llega solo al leer un eje contra el otro, a lo largo de 4,15 pasadas de media y hasta 12. El lado se ha multiplicado por tres. El ir y venir entre ejes se ha multiplicado por mucho más.",

        "Cerca de la mitad de las casillas acaba llena en los tres tamaños, y eso está decidido. Un tablero lleno en tres cuartas partes es un dibujo más oscuro, nunca un puzle más profundo. La cuadrícula grande lleva 53 números en sus bordes, frente a 15 en la pequeña.",

        "La confesión. Las cruces son opcionales y el juego jamás las mira. Se pueden marcar todas las casillas vacías de un tablero y ganar, o no marcar ninguna y ganar igual, porque la victoria se comprueba contra las casillas llenas y nada más. Suena generoso y tiene un precio: quien nunca marca relee la misma línea seis veces en la cuadrícula grande, donde apenas el 58,2 % cae de una pasada. La herramienta que más ayuda es la que el juego nunca pide.",
      ],

      howToPlay: [
        { title: "Leer los números", body: "Cada fila y cada columna llevan sus longitudes de racha, en orden. Una fila marcada 4 1 anuncia cuatro casillas llenas, al menos una vacía y otra llena." },
        { title: "Rellenar una casilla", body: "Un toque la rellena. El mismo toque en el mismo sitio la vacía otra vez, así que rectificar no obliga a buscar ningún botón." },
        { title: "Descartar una casilla", body: "El segundo modo marca una casilla como vacía. Son tus apuntes: el juego ni los exige ni los revisa." },
        { title: "Mirar lo que se apaga", body: "Los números de una línea se atenúan en cuanto esa línea dice exactamente lo que prometen. Ese es todo el aviso que da el juego." },
        { title: "Ver el dibujo", body: "Cuando todas las filas y todas las columnas salen bien, el dibujo está terminado y el reloj se detiene." },
      ],

      tips: [
        {
          title: "Empieza por la racha larga",
          body: "Una racha más larga que media línea se solapa consigo misma la coloques donde la coloques, así que parte de ella se sabe de inmediato. En la cuadrícula grande la racha más larga mide 12,8 casillas de media.",
        },
        {
          title: "El cero es el mejor número",
          body: "Una línea marcada con 0 está vacía entera, y corta todas las columnas que atraviesa. Búscalas antes que ninguna otra cosa.",
        },
        {
          title: "Descarta tanto como rellenas",
          body: "Una casilla que sabes vacía vale igual que una llena, porque impide que una racha se estire por ahí. La primera pasada resuelve el 58,2 % del tablero grande, y buena parte de esa cifra son casillas descartadas.",
        },
        {
          title: "Cambia de eje en cuanto te atasques",
          body: "Una fila que ha dejado de dar información casi siempre la ha desbloqueado una columna mientras mirabas a otro lado. El resolutor del juego hace ese cambio 4,15 veces antes de acabar.",
        },
        {
          title: "No adivines nunca",
          body: "Ningún tablero repartido aquí necesita una apuesta. Si te apetece hacer una, la deducción que te falta está en otro punto de la cuadrícula.",
        },
      ],

      teaches: [
        { title: "Leer una restricción", body: "Un 3 1 no es una cantidad, es una forma, con un orden y un hueco obligatorio dentro. Entenderlo ya es leer notación." },
        { title: "Cruzar dos fuentes", body: "Una fila sola casi nunca basta. La respuesta nace donde una fila se encuentra con una columna, que es la forma exacta del razonamiento cruzado." },
        { title: "Anotar lo descartado", body: "Marcar una casilla como vacía guarda una conclusión para no volver a sacarla. Quien coge la costumbre termina la cuadrícula grande mucho antes." },
        { title: "Sostener la certeza", body: "Como aquí nada obliga a apostar, cada casilla puesta está demostrada. Es una manera silenciosa de aprender la diferencia entre saber y creer." },
      ],

      ages: [
        { title: "De 6 a 8", body: "La cuadrícula de 25 casillas, con 15 números alrededor. Una pasada ya resuelve el 85,3 %, así que el niño avanza casi sin atascarse." },
        { title: "De 9 a 12", body: "La de 100 casillas. Los números por línea bajan ahí a 1,27 de media, lo que significa rachas largas y deducciones que llegan lejos." },
        { title: "De 13 en adelante", body: "La de 225 casillas y sus 53 números. La primera pasada solo da el 58,2 %, y el resto se compra un eje detrás de otro." },
        { title: "Adultos", body: "El tablero grande sin descartar ni una casilla. Se puede y cuesta, que es una buena forma de descubrir para qué sirven los apuntes." },
      ],

      accessibility:
        "Cada casilla es un botón de verdad que anuncia su fila y su columna, y un simple toque basta para todo lo que ocurre en el juego. Arrastrar es un atajo y nunca una condición, lo que importa para una mano pequeña y para cualquier dispositivo de puntero alternativo. La tecla Intro y la barra espaciadora rellenan una casilla igual que un dedo, así que una cuadrícula entera se resuelve desde el teclado. Elegir entre rellenar y descartar son dos botones normales, jamás una pulsación larga ni un segundo dedo. No hay reloj ni cuenta atrás, y un tablero que dejas a medias vuelve tal cual. Una casilla llena no se distingue solo por el color: la descartada lleva una cruz y la intacta queda lisa.",

      together: [
        { title: "Un eje cada uno", body: "Uno lee solo filas, el otro solo columnas, y se van pasando el dedo. El otro ve cosas invisibles desde tu lado." },
        { title: "Decirlo antes de rellenar", body: "Explicar en voz alta por qué esa casilla tiene que estar llena y solo entonces rellenarla. Un niño que sabe responder está jugando y no siguiendo una corazonada." },
        { title: "La apuesta del dibujo", body: "A media partida cada uno adivina qué representa el dibujo. La mitad de las casillas está llena al final, así que a mitad de camino hay margen para equivocarse con alegría." },
        { title: "Caza de vacías", body: "Dos minutos sin rellenar nada, marcando solo casillas seguras de estar vacías. El tablero avanza igualmente, y eso siempre sorprende." },
      ],

      faq: [
        { q: "¿Qué significan los números?", a: "Las longitudes de las rachas de casillas llenas de esa línea, en orden, con al menos una casilla vacía entre racha y racha. Un 4 1 son cuatro llenas, un hueco y una llena." },
        { q: "¿Puede un tablero tener dos respuestas?", a: "No. Cada tablero se comprueba antes de mostrarse, y el que admite dos dibujos se descarta. En el tamaño grande, el 18 % de los dibujos trazados acaba en la papelera por eso." },
        { q: "¿Hay que adivinar en algún momento?", a: "Nunca. La comprobación es más estricta que la unicidad: exige que el razonamiento línea a línea baste para llenar la cuadrícula entera." },
        { q: "¿Para qué sirven las cruces?", a: "Para anotar casillas que sabes vacías. El juego ni las cuenta ni las pide, pero son lo que desatasca la cuadrícula grande." },
        { q: "¿Avisa cuando me equivoco?", a: "No. Los números de una línea correcta se atenúan, y eso es todo. Una casilla equivocada se queda ahí hasta que otra línea se niegue a cuadrar." },
        { q: "¿Cuánto se tarda en un tablero?", a: "El pequeño se lee casi de una vez. El grande pide 4,15 cambios de eje solo para la parte mecánica del razonamiento." },
        { q: "¿Es gratis?", a: "Del todo. No hay pagos, ni anuncios, ni registro." },
        { q: "¿Funciona sin conexión?", a: "Sí, después de una visita. El tablero a medias también se guarda, así que cerrar la pestaña no lo borra." },
        { q: "¿Cómo se mide el récord?", a: "Con el cronómetro, ganando el más rápido, y por separado para cada tamaño. Cuatro minutos sobre 225 casillas y cuatro sobre 25 no son la misma tarde." },
      ],

      keywords: ["nonograma", "picross", "lógica", "puzle", "cuadrícula", "razonamiento"],
    },

    fr: nonogramFr,
  },

  provenance: [
    {
      claim: "4,000 candidate pictures per tier; 87.7% survive the proof on the 5x5 and 82.0% on the 15x15",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "18% of candidate pictures for the largest grid are thrown away for admitting two answers",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "a dealt board costs about 1.25 pictures on the largest grid, five in the worst case measured",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "one sweep of rows then columns settles 85.3% of the 5x5, 75.8% of the 10x10 and 58.2% of the 15x15",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "the largest board takes 4.15 sweeps on average and up to 12",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "about half the cells end up filled at every size: 55.8%, 51.1% and 51.5%",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "the 15x15 carries 53 clue numbers and the 5x5 carries 15; a 10x10 line averages 1.27 of them",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "the longest single run on a 15x15 averages 12.8 cells",
      source: "scripts/sim/nonogram-solvable.mjs",
    },
    {
      claim: "25, 100 and 225 cells, and no board is shown before a line solver has finished it",
      source: "src/games/nonogram/logic.ts",
    },
    {
      claim: "a cell on the largest grid lands near 18 pixels on a 390px phone",
      source: "src/games/nonogram/NonogramGame.tsx",
    },
    {
      claim: "the record is a solve time, faster winning, scoped per grid size",
      source: "src/sdk/score.ts",
    },
  ],
};
