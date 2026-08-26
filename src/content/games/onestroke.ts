import type { GameContent } from "../types";
import { oneStrokeFr } from "./fr/onestroke";

/**
 * One Stroke - the puzzle whose promise is a property of the CONSTRUCTION
 * rather than a claim about it. `deal` stirs one walk that visits every square
 * of the grid, then takes the walls off the ENDS of that walk, so what is left
 * is still a single unbroken line over exactly the squares that remain. An
 * answer exists before the board is drawn, and nothing had to be solved to know
 * it.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and make different jokes, because a translation
 * carries the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * Every figure here comes from `scripts/sim/onestroke-paths.mjs`, which drives
 * the shipped rules over 2,000 dealt boards per level, or from the game's own
 * code. See `provenance` at the bottom.
 *
 * EACH LANGUAGE NAMES ITS OWN ADMISSION, and all four are measured. Hebrew
 * takes the one-square-at-a-time step back, English takes the unmarked dead
 * ends, Spanish takes the silence of a board that never says which route was
 * the wrong one, and French takes the clock - a player who likes to think can
 * never place on their own board.
 */
export const onestroke: GameContent = {
  id: "onestroke",

  copy: {
    he: {
      name: "קו אחד",
      metaTitle: "קו אחד - משחק חשיבה חינם | Ellaz",
      metaDescription:
        "מותחים קו רצוף אחד שעובר בכל משבצת פנויה, בלי להרים ובלי לחזור. שלוש רשתות, נגיעה או גרירה, בלי הרשמה ובלי פרסומות.",

      lede: "משחק חשיבה חינמי, ישר בדפדפן. משבצת אחת מסומנת, ומשם מותחים קו רצוף אחד שעובר בכל משבצת פנויה על הרשת. אסור להצטלב עם עצמכם, ואסור לעבור פעמיים באותה משבצת.",

      body: [
        "הקו כבר עומד על המשבצת המסומנת. נוגעים במשבצת שלידה. אחר כך בזו שאחריה. ממשיכים עד שלא נשארה משבצת ריקה. גרירה עושה את אותו הדבר מהר יותר, והיא אף פעם לא חובה.",

        "הלוח לא נבנה בפיזור קירות ותקווה, אלא הפוך, וסדר הפעולות הוא כל העניין. תחילה נמתח טיול אחד שעובר בכל משבצת של המלבן בדיוק פעם אחת, ואז מערבבים אותו: ברשת הקשה הוא מתקפל 6,813 פעמים, וכל קיפול משאיר אותו עובר בכל משבצת פעם אחת בלבד. רק אז נלקחים הקירות, ותמיד משני הקצוות של הטיול ולא מאמצעו. מה שנשאר הוא עדיין קו רצוף אחד על בדיוק המשבצות שנותרו, והמשבצת המסומנת היא המקום שבו הקו הזה מתחיל. התשובה קיימת לפני שראיתם את הלוח, ואיש לא חיפש אותה כדי לדעת זאת. הטור שסופר לוחות שנשארו על הזיגזג ההתחלתי מראה 0 אחוז, והוא נמצא שם כדי להישאר כך.",

        "שלוש רשתות, ומספר המשבצות הפנויות הוא המידה האמיתית: 23 בקלה, 30 בבינונית ו-38 בקשה, שהם 77.6 אחוז מהלוח אחרי 11 קירות. כל משבצת פנויה מתכסה פעם אחת בלבד, ולכן כל תשובה ללוח קשה מודדת בדיוק 37 צעדים. לא פחות ולא יותר. מי שהולך למשבצת הפנויה הראשונה שהוא רואה מסיים 6.3 אחוז מהלוחות הקשים בלבד; מי שמכוון תמיד למשבצת הצפופה ביותר, זו עם הכי מעט שכנות פנויות, מסיים 50.7 אחוז.",

        "וההודאה, שנמדדה ולא נוחשה. החזרה אחורה היא משבצת אחת בכל לחיצה, וזה הכול. ילד שהגיע לצעד השלושים וגילה שהטעות קרתה בצעד החמישי צריך ללחוץ עשרים וחמש פעמים או להתחיל מחדש, והמשחק לא מציע שום קיצור בין שתי האפשרויות. בחרנו בזה במודע: כפתור שמוחק הכול בנגיעה אחת היה מוחק בטעות עבודה של דקה שלמה, ואין שום דרך להחזיר אותה.",
      ],

      howToPlay: [
        { title: "מתחילים בסימון", body: "משבצת אחת עוטה טבעת. הקו כבר עומד עליה, והוא לא יכול להתחיל בשום מקום אחר." },
        { title: "מתקדמים משבצת", body: "כל נגיעה נוספת מזיזה משבצת אחת לצד, למעלה או למטה. אלכסון לא נחשב, וקיר בכלל לא." },
        { title: "אף פעם לא פעמיים", body: "משבצת שכבר עברתם בה נדחית. הלוח רועד קלות ושום דבר לא זז, כך שנגיעה מוטעית לא עולה כלום." },
        { title: "חוזרים צעד", body: "הכפתור מתחת ללוח מסיר את המשבצת האחרונה. נגיעה במשבצת שממנה הגעתם עושה בדיוק אותו דבר." },
        { title: "מכסים את הכול", body: "הלוח נסגר כשהקו תופס כל משבצת פנויה. משבצת ריקה אחת מספיקה כדי שיישאר פתוח." },
      ],

      tips: [
        {
          title: "לצפופה קודם",
          body: "כשיש שתי אפשרויות, לכו לזו שמובילה למשבצת עם הכי מעט שכנות פנויות. הכלל הזה לבדו מסיים 50.7 אחוז מהלוחות הקשים מול 6.3 אחוז להליכה אקראית.",
        },
        {
          title: "מבוי סתום נשמר לסוף",
          body: "משבצת עם שכנה פנויה אחת בלבד יכולה להיות רק סוף הקו. ב-40.6 אחוז מהלוחות הקשים יש כזו, אז כדאי לאתר אותה לפני הצעד הראשון.",
        },
        {
          title: "השוליים ראשונים",
          body: "משבצות הקצה נוגעות בפחות שכנות, ולכן יש פחות הזדמנויות לחזור אליהן. בליעה מוקדמת שלהן משאירה את המרכז פתוח, והמרכז סלחני.",
        },
        {
          title: "לא לחצות את הלוח",
          body: "קו שחוצה את הרשת מקצה לקצה מותיר שני חצאים מנותקים. הקו יכול לבקר רק באחד מהם, והשני יישאר ריק בכל מקרה.",
        },
        {
          title: "צעד אחורה הוא לא כישלון",
          body: "כפתור החזרה לא עולה כלום ואינו מופיע בשום מקום בשיא. הרבה לוחות טובים נסגרים אחרי שלוש או ארבע חזרות.",
        },
      ],

      teaches: [
        { title: "לכסות בלי חורים", body: "למלא משטח בלי לפספס משבצת ובלי לעבור פעמיים היא מחשבה גאומטרית שהמשחק מלמד באצבע לפני שיודעים לקרוא לה בשם." },
        { title: "להסתכל לפני שזזים", body: "הקו נקבע קצת מראש או שהוא נתקע. אחרי כמה לוחות ילד סופר את השכנות הפנויות של משבצת במקום לעקוב אחרי האצבע שלו." },
        { title: "לבטל בשקט", body: "שום דבר פה אינו סופי. צעד אחורה, ועוד אחד, והקו יוצא לדרך אחרת בלי שאיש הפסיד משהו." },
        { title: "לספור באמת", body: "לדעת שנשארו שש משבצות לכסות ושבפינה יש ארבע מהן הוא חשבון, והוא משמש מיד." },
      ],

      ages: [
        { title: "5 עד 6", body: "רשת 5x5 עם 2 קירות. עשרים ושלוש משבצות לכסות, והטבעת הפותחת נראית מרחוק." },
        { title: "7 עד 9", body: "רשת 6x6 עם 30 משבצות פנויות. שישה קירות מספיקים כדי ליצור פינות שצריך לתכנן מראש." },
        { title: "10 ומעלה", body: "רשת 7x7, 38 משבצות, 37 צעדים. הסדר שבו בולעים את הפינות מכריע את כל הסוף." },
        { title: "מבוגרים", body: "לוח קשה בניסיון אחד, בלי אף חזרה אחורה. זה נדיר יותר משזה נשמע." },
      ],

      accessibility:
        "כל משבצת פנויה היא כפתור אמיתי שמכריז על השורה והעמודה שלו, ונגיעה לבדה מספיקה לכל פעולה במשחק. גרירה היא קיצור דרך ולא תנאי, מה שחשוב ליד קטנה שעדיין לא מדייקת ולאמצעי הצבעה חלופיים. מקש אנטר ומקש הרווח מקדמים את הקו בדיוק כמו אצבע, אז אפשר לשחק את כל הלוח מהמקלדת. הקו כולו בצבע אחד, כך ששום מידע כאן לא תלוי בגוון. תנועה שאינה חוקית עונה בניעור קטן ולא בצליל שגיאה, כי סירוב הוא לא נזיפה. כפתור החזרה נשאר לחיץ גם כשאין מה להסיר ממנו.",

      together: [
        { title: "לסירוגין", body: "משבצת לכל אחד, בתורות, על אותו קו. מגלים מהר שהשני בדיוק סגר את הדרך שאליה כיוונתם." },
        { title: "להגיד לפני שנוגעים", body: "לומר בקול לאן הקו הולך עכשיו ורק אז לגעת. ילד שיודע לענות משחק את המשחק ולא עוקב אחרי האצבע שלו." },
        { title: "ציד מבואות סתומים", body: "לפני שמתחילים, חפשו יחד משבצות עם שכנה פנויה אחת בלבד. ב-40.6 אחוז מהלוחות הקשים יש כאלה, והן מכריעות את הסוף." },
        { title: "שני מכשירים ושעון", body: "אותה רמה לכל אחד על המכשיר שלו, ומשווים זמנים. הלוחות שונים, אורך התשובה זהה." },
      ],

      faq: [
        {
          q: "כל לוח באמת פתיר?",
          a: "כן, וזו בנייה ולא בדיקה. הקירות נלקחים משני הקצוות של טיול שכבר ביקר בכל משבצת, אז מה שנשאר הוא עדיין קו שלם.",
        },
        {
          q: "צריך לסיים במשבצת מסוימת?",
          a: "לא. רק ההתחלה מסומנת, אז כל קו שמכסה הכול מנצח, גם אם הוא נראה שונה לגמרי מזה שלנו.",
        },
        {
          q: "מה עושים כשהקו נתקע?",
          a: "חוזרים אחורה עם הכפתור, משבצת בכל פעם, עד מקום שנפתחת ממנו דרך אחרת. כפתור ההתחלה מחדש מחזיר את אותו לוח ריק.",
        },
        {
          q: "חייבים לגרור?",
          a: "לא. נגיעה משבצת אחרי משבצת עושה בדיוק אותו דבר, וגם המקלדת.",
        },
        {
          q: "כמה צעדים זו תוצאה טובה?",
          a: "תמיד אותו מספר: 22, 29 או 37 לפי הרשת. מה שמבדיל בין שני שחקנים הוא הזמן ולא מספר הצעדים.",
        },
        { q: "המשחק חינמי?", a: "לגמרי. אין תשלום, אין פרסומות ואין הרשמה." },
        {
          q: "עובד בלי אינטרנט?",
          a: "כן, אחרי ביקור אחד. גם הלוח שבאמצע נשמר, אז סגירת הלשונית לא מוחקת אותו.",
        },
        {
          q: "איך נמדד השיא?",
          a: "בזמן, כשמהר יותר זה טוב יותר, ובנפרד לכל רשת. 5x5 ו-7x7 אינם אותו הישג.",
        },
      ],

      keywords: ["קו אחד", "משחק חשיבה", "פאזל", "לוגיקה", "משחק רשת", "ציור בקו אחד"],
    },

    en: {
      name: "One Stroke",
      metaTitle: "Free One Stroke Puzzle - Play Online | Ellaz",
      metaDescription:
        "A free one-line puzzle in your browser. Start on the marked square and cover every open square without lifting or crossing. Three grids, tap or drag.",

      lede: "A free line puzzle that runs in your browser. One square carries a mark. From there you draw a single unbroken line through every open square on the grid, never crossing yourself and never using a square twice.",

      body: [
        "The line is already standing on the marked square. Touch the square beside it. Then the next one. Keep going until nothing is left bare.",

        "The board is not scattered and then hoped over. It is made backwards, and the order of operations is the whole trick. A walk is drawn first, one that visits every square of the rectangle exactly once, and then it is stirred rather than searched for: on the hard grid it folds 6,813 times, and each fold leaves it still visiting every square once. Only then do the walls come out, and they come off the two ENDS of that walk rather than out of the middle of it. What is left is therefore still one unbroken line over exactly the squares that remain, and the marked square is where that line begins. An answer exists before the board is drawn, and nobody had to go looking for it to know that. The column counting boards still sitting on the starting zigzag reads 0%, and it is there to stay that way.",

        "Three grids, and the count of open squares is the real measure. Easy leaves 23, medium 30 and hard 38, which is 77.6% of the board once the 11 walls are in. Every open square takes exactly one step to cover, so every answer to a hard board is 37 steps long. No shorter, no longer.",

        "Walking into whichever square happens to be free almost never works. A bot doing that finishes 6.3% of hard boards and leaves the board 60% covered. Always aiming for the tightest square instead, the one with fewest free neighbours of its own, finishes 50.7%.",

        "Now the admission, measured rather than guessed. Some squares have only one open neighbour, which means the line can enter them at the very end or never at all, and 40.6% of hard boards hold at least one. Nothing marks them. There is no hint button anywhere and the board gives no warning as you walk past the last chance to take that corner; it simply stops accepting taps some twenty squares later, when the line has run out of room and the reason is far behind you.",
      ],

      howToPlay: [
        { title: "Start on the mark", body: "One square wears a ring. The line is already there, and it cannot begin anywhere else." },
        { title: "Move one square", body: "Each further touch steps one square sideways, up or down. Diagonals do not count, and walls never do." },
        { title: "Never twice", body: "A square the line has already used is refused. The board gives a small shake and nothing moves, so a misjudged touch costs nothing." },
        { title: "Step back", body: "The button under the board removes the last square. Touching the square you came from does precisely the same thing, one at a time." },
        { title: "Cover it all", body: "The board is finished when the line holds every open square. One empty square is enough to leave it unfinished." },
      ],

      tips: [
        {
          title: "Tightest square first",
          body: "Given two directions, take the one leading to the square with fewest free neighbours. That rule alone finishes 50.7% of hard boards against 6.3% for wandering.",
        },
        {
          title: "Dead ends go last",
          body: "A square with a single free neighbour can only ever be the end of the line. On 40.6% of hard boards there is one, so find it before your first step.",
        },
        {
          title: "Eat the edges early",
          body: "Border squares touch fewer neighbours, which means fewer chances to come back for them later. Taking them first leaves the middle open, and the middle forgives.",
        },
        {
          title: "Never cut the board in half",
          body: "A line running from one side clean across to the other leaves two separated halves. The line can only visit one of them, and the other stays bare whatever you do next.",
        },
        {
          title: "A step back is not a failure",
          body: "The back button costs nothing at all and appears nowhere in the record. Plenty of good boards get finished after three or four of them.",
        },
      ],

      teaches: [
        { title: "Covering with no gaps", body: "Filling a surface without missing a square and without using one twice is a piece of geometry this game puts under a finger long before anyone can name it." },
        { title: "Looking before moving", body: "The line has to be decided slightly in advance or it jams. After a few boards a child counts a square's free neighbours instead of following their own finger." },
        { title: "Undoing calmly", body: "Nothing here is final. One step back, then another, and the line sets off somewhere else with nobody having lost anything." },
        { title: "Counting for real", body: "Knowing six squares are left and that four of them sit in one corner is arithmetic, and it pays off within the second." },
      ],

      ages: [
        { title: "5 to 6", body: "The 5x5 grid with 2 walls. Twenty-three squares to cover, and the opening ring is visible from across the room." },
        { title: "7 to 9", body: "The 6x6 and its 30 open squares. Six walls are enough to make corners that have to be planned for." },
        { title: "10 and up", body: "The 7x7, 38 squares, 37 steps. The order you swallow the corners in decides the whole ending." },
        { title: "Grown-ups", body: "A hard board first try, without a single step backwards. That is rarer than it sounds." },
      ],

      accessibility:
        "Every open square is a real button that announces its own row and column, and a touch alone does everything in the game. Dragging is a shortcut rather than a condition, which matters for a small hand that does not aim well yet and for anyone on an alternative pointer. Enter and the space bar advance the line exactly as a finger does, so a whole board can be played from the keyboard. The line is one colour throughout, so nothing here depends on telling two hues apart. A move that is not allowed answers with a small shake instead of an error sound, because a refusal is not a telling-off. The back button stays pressable even when there is nothing to remove.",

      together: [
        { title: "Take turns", body: "One square each, in turn, on the same line. You find out quickly that the other person just closed the way you were heading." },
        { title: "Say it before you touch it", body: "Call out where the line is going next, then go. A child who can answer that is playing the game rather than following their own finger." },
        { title: "Hunt the dead ends", body: "Before you start, look together for squares with only one free neighbour. There are some on 40.6% of hard boards, and they decide the ending." },
        { title: "Two devices, one clock", body: "The same level each on your own device, then compare the times. The boards differ; the length of the answer does not." },
      ],

      faq: [
        {
          q: "Is every board really solvable?",
          a: "Yes, and it is built rather than tested. The walls are taken off the two ends of a walk that had already visited every square, so what remains is still a complete line.",
        },
        {
          q: "Do I have to finish on a particular square?",
          a: "No. Only the start is marked, so any line that covers everything wins, even one that looks nothing like ours.",
        },
        {
          q: "What do I do when the line gets stuck?",
          a: "Go back with the button, one square at a time, until you reach a place where another direction opens. The restart button gives you the same board, empty.",
        },
        {
          q: "Do I have to drag?",
          a: "No. Touching square after square does exactly the same thing, and so does the keyboard.",
        },
        {
          q: "How many steps is a good score?",
          a: "Always the same number: 22, 29 or 37 depending on the grid. What separates two players is the time, not the count.",
        },
        { q: "Is it free?", a: "Completely. No payment, no advertising, and nothing to sign up for." },
        {
          q: "Does it work offline?",
          a: "Yes, after one visit. A board in progress comes back as you left it if you close the tab.",
        },
        {
          q: "How is the record measured?",
          a: "In time, where faster wins, and separately per grid. A 5x5 and a 7x7 are not the same achievement.",
        },
      ],

      keywords: ["one stroke", "one line puzzle", "hamiltonian path game", "logic", "grid game", "draw without lifting"],
    },

    es: {
      name: "Un Trazo",
      metaTitle: "Un Trazo - puzle de línea gratis | Ellaz",
      metaDescription:
        "Traza una sola línea que pase por todas las casillas libres, sin levantar el dedo ni repetir casilla. Tres rejillas, con el dedo o el teclado.",

      lede: "Un puzle de trazo gratis y en el navegador. Una casilla lleva una marca, y desde ahí tiras una única línea continua que tiene que pasar por todas las casillas libres de la rejilla, sin cruzarse consigo misma y sin repetir ninguna.",

      body: [
        "La línea ya está sobre la casilla marcada. Tocas la casilla de al lado. Luego la siguiente. Se sigue hasta que no queda ninguna vacía, y arrastrar el dedo hace lo mismo más rápido.",

        "El tablero no se siembra al azar para después cruzar los dedos. Se fabrica al revés, y el orden de los pasos lo es todo. Primero se traza un paseo que pasa una vez por cada casilla del rectángulo, y después se remueve en lugar de buscarse: en la rejilla difícil se dobla 6.813 veces, y cada doblez lo deja pasando aún una sola vez por cada casilla. Solo entonces salen los muros, y salen de los DOS EXTREMOS de ese paseo, nunca de su mitad. Lo que queda sigue siendo una línea continua sobre exactamente las casillas que sobreviven, y la casilla marcada es donde esa línea empieza. La respuesta existe antes de que el tablero aparezca. La columna que cuenta tableros que siguen en el zigzag inicial marca un 0%, y está ahí para seguir marcándolo.",

        "Tres rejillas, y el número de casillas libres es la medida de verdad: 23 en fácil, 30 en media y 38 en difícil, un 77,6% del tablero con los 11 muros puestos. Cada casilla libre se cubre una vez y solo una, así que toda respuesta a un tablero difícil mide 37 pasos exactos. Ni uno más.",

        "Ir a la primera casilla libre que aparece casi nunca funciona: así se terminan el 6,3% de los tableros difíciles y el tablero queda cubierto al 60%. Apuntar siempre a la casilla más apretada, la que menos vecinas libres tiene, termina el 50,7%.",

        "Y la parte honesta, medida en vez de supuesta. El tablero no dice nada. No hay pista, no hay aviso y no hay ningún color que señale por dónde se torció la cosa; la línea simplemente deja de aceptar toques veinte casillas después, cuando ya no queda salida. A un niño que todavía no ha entendido que el fallo estaba muy atrás el tablero le parece roto en vez de perdido, y esa confusión dura hasta que alguien se lo explica una vez.",
      ],

      howToPlay: [
        { title: "Empieza en la marca", body: "Una casilla lleva un anillo. La línea ya está ahí, y no puede nacer en ningún otro sitio." },
        { title: "Avanza una casilla", body: "Cada toque siguiente se mueve una casilla al lado, arriba o abajo. La diagonal no cuenta, y un muro menos aún." },
        { title: "Nunca dos veces", body: "Una casilla por la que ya pasaste queda rechazada. El tablero da una sacudida pequeña y nada se mueve, así que un toque mal calculado no cuesta nada." },
        { title: "Da un paso atrás", body: "El botón bajo el tablero quita la última casilla. Tocar la casilla de la que vienes hace exactamente lo mismo, de una en una." },
        { title: "Cúbrelo todo", body: "El tablero se cierra cuando la línea ocupa cada casilla libre. Una casilla vacía basta para dejarlo sin terminar." },
      ],

      tips: [
        {
          title: "Primero la más apretada",
          body: "Entre dos direcciones, coge la que lleva a la casilla con menos vecinas libres. Esa regla sola termina el 50,7% de los tableros difíciles frente al 6,3% de ir a lo que salga.",
        },
        {
          title: "Los callejones, al final",
          body: "Una casilla con una única vecina libre solo puede ser el final de la línea. En el 40,6% de los tableros difíciles hay alguna, así que búscala antes del primer paso.",
        },
        {
          title: "Cómete los bordes pronto",
          body: "Las casillas del borde tocan menos vecinas, o sea que hay menos ocasiones de volver luego a por ellas. Cogerlas pronto deja el centro abierto, y el centro perdona.",
        },
        {
          title: "No partas el tablero",
          body: "Una línea que cruza la rejilla de lado a lado deja dos mitades incomunicadas. La línea solo puede visitar una, y la otra se queda vacía hagas lo que hagas.",
        },
        {
          title: "Retroceder no es perder",
          body: "El botón de vuelta atrás no cuesta absolutamente nada y no sale por ninguna parte en el récord. Muchos tableros buenos se cierran tras tres o cuatro.",
        },
      ],

      teaches: [
        { title: "Cubrir sin huecos", body: "Llenar una superficie sin saltarse casilla y sin repetir ninguna es una idea de geometría que este juego pone bajo el dedo mucho antes de saber nombrarla." },
        { title: "Mirar antes de moverse", body: "La línea se decide un poco por adelantado o se atasca. Tras unos cuantos tableros un niño cuenta las vecinas libres de una casilla en lugar de seguir su propio dedo." },
        { title: "Deshacer con calma", body: "Aquí nada es definitivo. Un paso atrás, luego otro, y la línea arranca hacia otra parte sin que nadie haya perdido nada." },
        { title: "Contar de verdad", body: "Saber que quedan seis casillas y que cuatro están en el mismo rincón es una cuenta, y sirve en el acto." },
      ],

      ages: [
        { title: "5 a 6", body: "La rejilla 5x5 con 2 muros. Veintitrés casillas que cubrir, y el anillo de salida se ve desde lejos." },
        { title: "7 a 9", body: "La 6x6 y sus 30 casillas libres. Con seis muros ya aparecen rincones que hay que haber previsto." },
        { title: "10 en adelante", body: "La 7x7, 38 casillas, 37 pasos. El orden en que te comes los rincones decide todo el final." },
        { title: "Adultos", body: "Un tablero difícil al primer intento y sin un solo paso atrás. Pasa menos de lo que parece." },
      ],

      accessibility:
        "Cada casilla libre es un botón de verdad que anuncia su fila y su columna, y con tocar basta para hacer todo lo que hay en el juego. Arrastrar es un atajo y no una condición, algo que importa para una mano pequeña que todavía no apunta bien y para cualquier puntero alternativo. La tecla Intro y la barra espaciadora avanzan la línea igual que un dedo, así que el tablero entero se juega desde el teclado. La línea es de un solo color, de modo que aquí nada depende de distinguir tonos. Un movimiento que no se permite responde con una sacudida pequeña y no con un sonido de error, porque negarse no es una regañina. El botón de vuelta atrás sigue pulsable aunque no haya nada que quitar.",

      together: [
        { title: "Por turnos", body: "Una casilla cada uno, alternando, sobre la misma línea. Se descubre enseguida que el otro acaba de cerrar el camino que llevabas." },
        { title: "Dilo antes de tocar", body: "Contar en voz alta por dónde va a seguir la línea y tocar después. Un niño que sabe responder está jugando y no siguiendo su propio dedo." },
        { title: "Caza de callejones", body: "Antes de empezar, buscad juntos las casillas con una sola vecina libre. Hay en el 40,6% de los tableros difíciles, y deciden el final." },
        { title: "Dos aparatos, un reloj", body: "El mismo nivel cada uno en su aparato y luego se comparan los tiempos. Los tableros cambian; lo que mide la respuesta no." },
      ],

      faq: [
        {
          q: "¿Todos los tableros tienen solución?",
          a: "Sí, y está construida en vez de comprobada. Los muros salen de los dos extremos de un paseo que ya había visitado cada casilla, así que lo que queda sigue siendo una línea entera.",
        },
        {
          q: "¿Hay que terminar en una casilla concreta?",
          a: "No. Solo está marcada la salida, así que gana cualquier línea que lo cubra todo, aunque no se parezca en nada a la nuestra.",
        },
        {
          q: "¿Qué hago cuando la línea se atasca?",
          a: "Volver atrás con el botón, de casilla en casilla, hasta un sitio donde se abra otra dirección. El botón de reiniciar devuelve el mismo tablero vacío.",
        },
        {
          q: "¿Hace falta arrastrar?",
          a: "No. Tocar casilla a casilla hace exactamente lo mismo, y el teclado también.",
        },
        {
          q: "¿Cuántos pasos son un buen resultado?",
          a: "Siempre el mismo número: 22, 29 o 37 según la rejilla. Lo que separa a dos jugadores es el tiempo y no la cuenta.",
        },
        { q: "¿Es gratis?", a: "Del todo. Ni pagos, ni anuncios, ni registro." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí, después de la primera visita. El tablero a medias vuelve tal cual si cierras la pestaña.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En tiempo, donde más rápido gana, y por separado en cada rejilla. Un 5x5 y un 7x7 no son el mismo logro.",
        },
      ],

      keywords: ["un trazo", "puzle de línea", "juego de lógica", "camino", "juego de rejilla", "trazar sin levantar"],
    },

    fr: oneStrokeFr,
  },

  provenance: [
    {
      claim: "2,000 dealt boards per level, and no dealt board is still sitting on the starting zigzag",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "the hard grid's walk folds 6,813 times before the walls come off",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "23, 30 and 38 open squares, and 38 of 49 is 77.6% of a hard board",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "every answer is one step per open square, so 22, 29 or 37 steps by grid",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "walking into the first free square finishes 6.3% of hard boards and covers 60% of one",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "always taking the tightest square finishes 50.7% of hard boards",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "40.6% of hard boards hold a square with only one open neighbour",
      source: "scripts/sim/onestroke-paths.mjs",
    },
    {
      claim: "5x5 with 2 walls, 6x6 with 6, 7x7 with 11, and the line may never reuse a square",
      source: "src/games/onestroke/logic.ts",
    },
    {
      claim: "the record is a time, faster is better, scoped per grid",
      source: "src/sdk/score.ts",
    },
  ],
};
