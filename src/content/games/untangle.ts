import type { GameContent } from "../types";
import { untangleFr } from "./fr/untangle";

/**
 * Untangle - the puzzle whose promise is a property of the CONSTRUCTION rather
 * than a claim about it. `deal` joins the dots without a single crossing FIRST,
 * shortest pair before longest, and only then scrambles where the dots sit. A
 * crossing-free drawing exists before the board is shown, and nothing has to be
 * solved, searched or filtered to know it.
 *
 * The four languages are written, not translated. They open on different
 * things, order their sections differently and make different jokes, because a
 * translation carries the source language's rhythm and that rhythm is exactly
 * what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/untangle-graphs.mjs`, which drives
 * the shipped rules over 3,000 dealt boards per tier plus 500 bot runs, or from
 * the game's own code. See `provenance` at the bottom.
 *
 * EACH LANGUAGE NAMES ITS OWN ADMISSION, and all four are measured. Hebrew
 * takes the dead end (a player who only ever makes the board better unties the
 * biggest board 4.8% of the time and then has nowhere to go), English takes the
 * short game (one dot answers for 90.7% of the crossings on the small board, so
 * it can be over in four moves), Spanish takes the silence (nothing says where
 * a dot should go, and 49.6 crossings at once can read as hopeless), and French
 * takes the pile (two dots stacked look tidy and still count as a crossing).
 */
export const untangle: GameContent = {
  id: "untangle",

  copy: {
    he: {
      name: "סבך",
      metaTitle: "סבך - משחק התרת קווים חינם | Ellaz",
      metaDescription:
        "משחק סבך חינמי בדפדפן. נקודות מחוברות בקווים שמצטלבים, ומזיזים אותן עד שאף שני קווים לא נחתכים. שלושה לוחות, נגיעה או גרירה, בלי הרשמה.",

      lede: "משחק סבך חינם, ישר בדפדפן. הנקודות יושבות על מעגל, קווים ישרים מחברים ביניהן, והקווים חותכים זה את זה. מזיזים את הנקודות עד שאף שני קווים לא נחתכים יותר, וזה הלוח כולו.",

      body: [
        "גוררים נקודה. או נוגעים בה, ואז נוגעים במקום שאליו היא הולכת. שתי הדרכים עושות בדיוק אותו דבר, וגם ארבעת החצים במקלדת.",

        "הלוח הזה לא נבנה בפיזור נקודות ותקווה. המשחק מסדר קודם את הנקודות על רשת גסה, אחת בכל תא, ואז מחבר ביניהן זוג אחר זוג מהקצר אל הארוך. חיבור נשמר רק כשהוא לא חוצה שום קו שכבר נמתח ולא עובר דרך נקודה שלישית. מה שיוצא מזה הוא ציור בלי הצטלבות אחת, והוא נבדק באותה פונקציה בדיוק ששופטת אתכם אחר כך. רק בשלב האחרון המשחק מפזר את הנקודות על מעגל בסדר אקראי. במילים אחרות הפתרון היה קיים לפני שראיתם את הלוח. אין כאן פותר שמנסה ומוותר, אין רשימת לוחות מוכנה מראש, ולכן גם אין לוח שאי אפשר להתיר.",

        "המספרים נמדדו על 3,000 לוחות בכל רמה. הלוח הקטן הוא 6 נקודות ו-9 קווים, הבינוני 9 ו-15, והגדול 12 נקודות ו-21 קווים. הגדול פותח עם 49.6 הצטלבויות בממוצע, ולפעמים הרבה יותר: הגרוע ביותר שנמדד הוא 88. דווקא הלוח הקטן הוא הצפוף מכולם, כי בו 60 אחוז מזוגות הנקודות מחוברים בקו, לעומת 31.8 אחוז בגדול.",

        "לנצח זה פשוט. אף שני קווים לא נחתכים. אין ניקוד על צורה יפה ואין דרך להפסיד.",

        "וההודאה, שנמדדה ולא נוחשה. כתבנו בוט שעושה את הדבר ההגיוני: הוא תופס את הנקודה שמעורבת בהכי הרבה הצטלבויות, מנסה עשרים מקומות אקראיים, ולוקח רק מקום שמשפר את המצב. על הלוח הקטן זה מספיק ב-53.2 אחוז מהלוחות. על הגדול זה מספיק ב-4.8 אחוז בלבד, וברוב הפעמים הבוט פשוט נתקע: לא נשאר לו שום צעד שמשפר, והלוח עדיין מסובך. כלומר לפעמים חייבים להזיז נקודה למקום שנראה גרוע יותר לפני שהוא נעשה טוב יותר. המשחק לא מספר את זה, ולא מסמן איזו נקודה. ילד שנתקע מול לוח שנראה כמעט מסודר יכול לשבת מולו דקה שלמה.",
      ],

      howToPlay: [
        { title: "בוחרים נקודה", body: "נגיעה בנקודה מסמנת אותה. אפשר גם פשוט לגרור אותה מיד, בלי לסמן קודם." },
        { title: "מניחים אותה", body: "נגיעה שנייה במקום ריק מעבירה לשם את הנקודה המסומנת. נגיעה חוזרת בנקודה עצמה מבטלת את הסימון." },
        { title: "קוראים את הקווים", body: "קו שנחתך בקו אחר נצבע אחרת וגם נמתח עבה יותר. קו דק ושקט הוא קו שכבר בסדר." },
        { title: "עוקבים אחרי המספר", body: "בשורה העליונה כתוב כמה הצטלבויות נשארו על הלוח. זה המספר היחיד שצריך לרדת." },
        { title: "מסיימים", body: "כשהמספר מגיע לאפס הלוח נגמר. כפתור ההתחלה מחדש מחלק לוח אחר באותו גודל." },
      ],

      tips: [
        {
          title: "התחילו מהנקודה הרועשת",
          body: "בלוח הקטן יש תמיד נקודה אחת שמעורבת ב-90.7 אחוז מההצטלבויות בממוצע. למצוא אותה ולהזיז אותה ראשונה זה כמעט כל הפתרון, וזו גם הסיבה שהלוח הקטן נגמר מהר.",
        },
        {
          title: "מושכים החוצה לפני שמסדרים",
          body: "כל הנקודות מתחילות על מעגל, אז השטח הריק נמצא באמצע. נקודה שמושכים לתוך המרכז כמעט תמיד מקצרת שני קווים בבת אחת.",
        },
        {
          title: "לספור, לא להסתכל",
          body: "לוח יכול להיראות מבולגן ולהיות במרחק צעד אחד מהסוף, והפוך. המספר בשורה העליונה יודע את התשובה והעין לא.",
        },
        {
          title: "מותר להחמיר",
          body: "בוט שמזיז נקודה רק כשהמצב משתפר מיד מתיר את הלוח הגדול ב-4.8 אחוז מהמקרים ונתקע בכל השאר. מהלך שנראה גרוע לרגע הוא לרוב הדרך היחידה קדימה.",
        },
        {
          title: "כמעט הכול זז",
          body: "בלוח הגדול צריך להעביר 11 נקודות מתוך 12 לפני שההצטלבות האחרונה נעלמת, ובקטן 4 מתוך 6. מי שמחפש את הנקודה האחת שתפתור הכול מחפש משהו שלא קיים.",
        },
      ],

      teaches: [
        { title: "לראות מבנה", body: "אותם קווים בדיוק, בסידור אחר, נראים כמו רשת מסובכת או כמו ציור פשוט. זו התובנה שהמשחק מוכר, והיא נכנסת דרך האצבע לפני שיודעים לקרוא לה בשם." },
        { title: "לתכנן שני צעדים", body: "נקודה שמזיזים משנה רק את הקווים שנוגעים בה. מי שקולט את זה מפסיק לנסות ומתחיל לבדוק." },
        { title: "לסבול נסיגה", body: "המצב חייב לפעמים להיראות גרוע יותר לפני שהוא נפתר. זה שריר שקשה לאמן, ופה הוא עולה בדיוק כלום." },
        { title: "לתקן בלי עונש", body: "אין מהלך שאי אפשר לבטל. נקודה שהונחה במקום גרוע פשוט נגררת שוב, וניסיון לא עולה שום דבר." },
      ],

      ages: [
        { title: "5 עד 6", body: "הלוח של 6 נקודות. יש בו 5.7 הצטלבויות בממוצע בהתחלה, ורוב הילדים מסיימים אותו בארבע הזזות." },
        { title: "7 עד 9", body: "הלוח של 9 נקודות ו-15 קווים. פה כבר צריך להזיז 8 נקודות בממוצע, וסדר ההזזות מתחיל להשפיע." },
        { title: "10 ומעלה", body: "הלוח של 12 נקודות. 49.6 הצטלבויות פתוחות בהתחלה, ואי אפשר לסדר אותן אחת אחת בלי להסתכל על השלם." },
        { title: "מבוגרים", body: "אותו לוח גדול, בלי לחשוב בקול. השאלה היחידה היא כמה זמן לוקח למצוא את הצורה שהייתה שם מלכתחילה." },
      ],

      accessibility:
        "כל נקודה היא כפתור אמיתי עם שם משלה, ואפשר לסמן אותה במקש אנטר או ברווח ואז להזיז אותה בארבעת החצים, כך שכל הלוח נפתר מהמקלדת בלבד. גרירה היא קיצור דרך ולא תנאי, מה שחשוב ליד קטנה שעדיין לא מדייקת ולאמצעי הצבעה חלופיים: נגיעה בנקודה ואז נגיעה במקום פותרות את אותו לוח. שטח הנגיעה של כל נקודה גדול מהעיגול שרואים, כדי שאצבע לא תפספס. קו שנחתך מסומן גם בעובי ולא רק בצבע, אז אפשר לקרוא את הלוח בלי להבחין בין הגוונים. יש שעון והוא רק סופר: שום דבר לא נגמר כשהוא מתקדם, ולוח שהשארתם באמצע ממתין בדיוק כמו שהיה.",

      together: [
        { title: "נקודה לכל אחד", body: "בתורות, כל אחד מזיז נקודה אחת. מגלים מהר שהמהלך של השני פתח בדיוק את מה שתכננתם לסגור." },
        { title: "להגיד לפני שמזיזים", body: "לומר בקול לאן הנקודה הולכת ולמה, ורק אז להזיז. ילד שיודע לענות משחק את המשחק ולא עוקב אחרי האצבע שלו." },
        { title: "ניחוש הסוף", body: "לפני ההזזה הראשונה, כל אחד מנחש כמה נקודות יזוזו עד הסוף. בלוח הגדול התשובה היא 11 מתוך 12, וזה כמעט תמיד מפתיע." },
        { title: "לספור יחד", body: "אחרי כל הזזה, לקרוא בקול את מספר ההצטלבויות. ילדים קטנים לומדים ככה מה עשה מה, בלי שאף אחד יסביר." },
      ],

      faq: [
        {
          q: "כל לוח באמת פתיר?",
          a: "כן, וזו בנייה ולא בדיקה. המשחק מחבר את הנקודות בלי הצטלבות אחת ורק אחר כך מפזר אותן, אז הציור הנקי היה קיים לפני שהלוח הוצג.",
        },
        {
          q: "צריך לגרור?",
          a: "לא. נגיעה בנקודה ואז נגיעה במקום עושות אותו דבר, וכך גם החצים במקלדת. גרירה היא רק מהירה יותר.",
        },
        {
          q: "מה קורה אם שתי נקודות יושבות זו על זו?",
          a: "הקווים שיוצאים מהן נפגשים באותה נקודה, וזה נספר כהצטלבות. הלוח ייראה מסודר וימשיך לסרב להיגמר, אז עדיף לפזר.",
        },
        {
          q: "יש הגבלת זמן?",
          a: "אין. השעון סופר בלבד, ולוח שנשאר פתוח נשאר בדיוק כמו שהיה גם אחרי שסוגרים את הדפדפן.",
        },
        {
          q: "המשחק חינם?",
          a: "כן, וגם בלי פרסומות, בלי הרשמה ובלי הורדה. הוא נטען בדפדפן וממשיך לעבוד גם בלי חיבור לרשת.",
        },
        {
          q: "מאיזה גיל?",
          a: "הלוח הקטן עובד כבר בגיל חמש, כי מספיק להזיז ארבע נקודות בממוצע. הלוח הגדול מעניין גם מבוגרים.",
        },
        {
          q: "אפשר להיתקע?",
          a: "אפשר להרגיש תקוע, כי לפעמים חייבים להזיז נקודה למצב שנראה גרוע יותר. אף לוח לא ננעל באמת, וכל הזזה ניתנת לביטול על ידי הזזה נוספת.",
        },
      ],

      keywords: ["סבך", "משחק היגיון", "התרת קווים", "פאזל", "משחק חשיבה", "משחק חינם"],
    },

    en: {
      name: "Untangle",
      metaTitle: "Untangle - free line puzzle in your browser | Ellaz",
      metaDescription:
        "A free untangle puzzle. Dots joined by straight lines that cross each other, and you move the dots until nothing crosses. Three sizes, drag or tap.",

      lede: "A free untangle puzzle that runs in the browser. Dots sit around a ring, straight lines join them, and those lines cut across each other. Move the dots until no two lines cross. That is the whole game.",

      body: [
        "Drag a dot. Or tap it, then tap the spot it should go to. The arrow keys do the same job, one step at a time.",

        "Nothing here is scattered and checked afterwards. The board is drawn backwards: dots first, one to a cell of a coarse grid, then lines added a pair at a time from the shortest to the longest, and a line is kept only when it cuts across nothing already drawn and runs through no third dot. What comes out of that is a picture with zero crossings in it, tested by the very same function that later judges you. Only then do the dots get thrown onto a ring in a random order. So the answer existed before the puzzle did. That matters more than it sounds: a puzzle generator that scatters and hopes has to run a solver to check its own work, and a solver that gives up under a budget says the same thing about a board with no answer as it does about a board that is merely deep.",

        "Measured over 3,000 dealt boards per size. The small board is 6 dots and 9 lines, the middle one 9 and 15, the big one 12 dots and 21 lines. Density runs the other way from what you would guess: 60% of all possible dot pairs carry a line on the small board and only 31.8% on the big one, which is why the big board looks like a mess and the small one looks like a knot.",

        "The big board opens with 49.6 crossings on average. The worst deal had 88. That count only ever falls.",

        "The admission, and it belongs to the small board rather than the big one. On six dots, a single dot is caught up in 90.7% of the crossings on average, so finding it and moving it once is most of the answer. Four moves clear that board on average, out of six dots. For a five-year-old that is exactly right and it is the reason the size exists. For anybody older it can be finished before it starts, and the honest advice is to skip it.",
      ],

      howToPlay: [
        { title: "Pick up a dot", body: "Tap a dot and it lights up. Dragging it straight away works too, with no tap first." },
        { title: "Put it down", body: "A second tap on empty space moves the lit dot there. Tapping the dot again puts it down where it was." },
        { title: "Read the lines", body: "A line caught in a crossing changes colour and gets thicker. A thin quiet line is one that is already fine." },
        { title: "Watch the count", body: "The number in the top row is how many crossings are left. It is the only number that has to come down." },
        { title: "Finish", body: "Zero crossings ends the board. The restart button deals a different board of the same size." },
      ],

      tips: [
        {
          title: "Pull toward the middle",
          body: "Every dot starts on the ring, so all the empty room is in the centre. A dot dragged inward usually shortens two lines at once, and short lines cross less.",
        },
        {
          title: "Follow the thick lines",
          body: "Ignore the picture and follow the heavy ones. They are the only lines in trouble, and every crossing you can see has two of them.",
        },
        {
          title: "One dot, then look again",
          body: "Moving a dot changes only the lines that touch it, and nothing else on the board. That makes this a puzzle you can check rather than one you have to guess at.",
        },
        {
          title: "Let it get worse",
          body: "A move that helps right now is not always a move that helps. Our own bot, which only ever accepts an immediate improvement, clears the big board 4.8% of the time and stalls on the rest.",
        },
        {
          title: "Expect to move nearly everything",
          body: "The big board needs 11 of its 12 dots put somewhere new before the last crossing goes. Hunting for the one dot that fixes everything is hunting for something that is not there.",
        },
      ],

      teaches: [
        { title: "Same thing, different shape", body: "The lines never change. Only where the dots sit changes, and that turns a tangle into a clean drawing. Children meet that idea here years before anyone gives it a name." },
        { title: "Local effects", body: "A dot only touches the lines that touch it. Working that out is the moment the game stops being about luck." },
        { title: "Going backwards on purpose", body: "Sometimes the board has to look worse before it comes right, and here that costs nothing at all. Practising it is the point." },
        { title: "Reading a number", body: "The crossing count answers a question the eye gets wrong. Learning to trust it over the picture is a real skill." },
      ],

      ages: [
        { title: "5 to 6", body: "The six-dot board. It opens with 5.7 crossings and usually falls in four moves, which is short enough to finish in one sitting." },
        { title: "7 to 9", body: "Nine dots and 15 lines. Eight dots have to move on average, so the order you move them in starts to matter." },
        { title: "10 and up", body: "Twelve dots, 21 lines and around 50 crossings on the table at once. This is where the game stops being tidying up." },
        { title: "Grown-ups", body: "The same big board, played against the clock rather than against the puzzle. The shape was always there, and the only question is how fast you see it." },
      ],

      accessibility:
        "Every dot is a real button with a name of its own, so Enter or Space picks one up and the four arrow keys walk it around: the whole board can be solved from the keyboard alone. Dragging is a shortcut and never a requirement, which matters for a small hand that does not aim well yet and for anyone using an alternative pointer, because tapping a dot and then tapping a destination solves exactly the same board. The area a finger has to hit is larger than the circle it draws. Lines caught in a crossing are drawn thicker as well as in another colour, so the board can be read without telling the two hues apart. There is a clock and it only counts: nothing ends when it moves, and a board left half-finished waits exactly as it was.",

      together: [
        { title: "One dot each", body: "Take turns, one dot per turn. You find out quickly that the other player just opened the crossing you were about to close." },
        { title: "Say it first", body: "Name where the dot is going and why, then move it. A child who can answer is playing the game rather than following their own finger." },
        { title: "Guess the ending", body: "Before the first move, everybody guesses how many dots will end up somewhere new. On the big board it is 11 of 12, and that guess is almost always low." },
        { title: "Read the count out", body: "Call the crossing number aloud after every move. Younger children work out what caused what without anybody explaining it." },
      ],

      faq: [
        {
          q: "Is every board really solvable?",
          a: "Yes, and by construction rather than by checking. The lines are drawn without a single crossing first, and the dots are scrambled afterwards, so a clean picture existed before the board appeared.",
        },
        {
          q: "Do I have to drag?",
          a: "No. Tap a dot, then tap where it goes. The arrow keys work too. Dragging is only faster.",
        },
        {
          q: "What if two dots end up on the same spot?",
          a: "The lines leaving them meet at that point, and that counts as a crossing. The board will look tidy and refuse to finish, so spread them out.",
        },
        {
          q: "Is there a time limit?",
          a: "No. The clock counts and nothing else, and an unfinished board is still there after you close the browser.",
        },
        {
          q: "Does it cost anything?",
          a: "It is free, with no ads, no sign-up and no download. It loads in the browser and keeps working with no connection.",
        },
        {
          q: "Why does the small board feel so easy?",
          a: "Because one dot is usually caught in 90.7% of its crossings, so moving that dot is most of the answer. Older players should start on the bigger board.",
        },
        {
          q: "Can I get stuck?",
          a: "You can feel stuck, because sometimes a dot has to go somewhere that looks worse before the board comes right. No board ever locks, and any move is undone by making another one.",
        },
      ],

      keywords: ["untangle", "planarity", "line puzzle", "logic game", "free puzzle", "brain game"],
    },

    es: {
      name: "Desenreda",
      metaTitle: "Desenreda - juego de líneas gratis | Ellaz",
      metaDescription:
        "Puzle gratis en el navegador. Puntos unidos por líneas rectas que se cruzan, y hay que moverlos hasta que ningún par se corte. Tres tableros.",

      lede: "Un puzle gratuito en el navegador. Los puntos empiezan repartidos sobre un anillo, unas líneas rectas los unen, y esas líneas se cortan entre sí. Hay que mover los puntos hasta que ningún par de líneas se cruce.",

      body: [
        "Arrastra un punto. O tócalo y luego toca el sitio adonde va. Las flechas del teclado hacen lo mismo.",

        "La pregunta que se hace cualquiera al tercer tablero es si de verdad todos tienen solución. La tienen, y no porque alguien lo compruebe después. El tablero se construye al revés: primero se colocan los puntos, uno por celda de una cuadrícula ancha, y luego se van uniendo por parejas de la más corta a la más larga, guardando una línea solo cuando no corta ninguna anterior y no pasa por encima de un tercer punto. Lo que sale es un dibujo con cero cruces, medido con la misma función que después te juzga a ti. El anillo llega al final: los puntos se reparten en orden aleatorio y el enredo aparece de golpe. La respuesta ya existía.",

        "Los números salen de 3.000 tableros repartidos por tamaño. El pequeño tiene 6 puntos y 9 líneas, el mediano 9 y 15, y el grande 12 puntos con 21 líneas. El grande empieza con 49,6 cruces de media, aunque el peor reparto medido llegó a 88.",

        "Ganar es sencillo. Ninguna línea corta a otra. No hay puntuación por elegancia.",

        "Y la confesión. El juego no dice nunca adónde hay que llevar un punto. Lo único que ofrece es el color: una línea metida en un cruce se dibuja más gruesa y de otro tono, y el resto es tuyo. En el tablero grande eso significa casi cincuenta líneas marcadas en la primera pantalla, todas a la vez, y muchos jugadores lo leen como imposible antes de tocar nada. No lo es, y basta con mover un punto para verlo, pero esa primera imagen desanima y no hay ninguna ayuda que la suavice.",
      ],

      howToPlay: [
        { title: "Coge un punto", body: "Al tocar un punto queda marcado. También puedes arrastrarlo directamente, sin marcarlo antes." },
        { title: "Suéltalo", body: "Un segundo toque en un hueco vacío lleva allí el punto marcado. Tocar otra vez el punto quita la marca." },
        { title: "Lee las líneas", body: "Una línea metida en un cruce cambia de color y se dibuja más gruesa. Una línea fina ya está bien donde está." },
        { title: "Mira el número", body: "Arriba aparece cuántos cruces quedan. Es el único número que tiene que bajar." },
        { title: "Termina", body: "Cero cruces y el tablero se acaba. El botón de reinicio reparte otro del mismo tamaño." },
      ],

      tips: [
        {
          title: "Tira hacia el centro",
          body: "Todos los puntos salen del anillo, así que el hueco libre está en medio. Un punto llevado al centro suele acortar dos líneas de una vez.",
        },
        {
          title: "Sigue lo grueso",
          body: "Olvida el dibujo entero y mira solo las líneas marcadas. Son las únicas con problema, y cada cruce que ves tiene dos.",
        },
        {
          title: "Un punto y vuelve a mirar",
          body: "Mover un punto cambia únicamente las líneas que lo tocan. Por eso este puzle se comprueba en vez de adivinarse.",
        },
        {
          title: "Deja que empeore",
          body: "Un bot nuestro que solo acepta mejoras inmediatas resuelve el tablero grande en el 4,8% de los repartos y se atasca en el resto. Casi siempre hay que pasar por un tablero peor.",
        },
        {
          title: "Se mueve casi todo",
          body: "En el tablero grande hay que recolocar 11 de los 12 puntos antes de que desaparezca el último cruce. En el pequeño son 4 de 6.",
        },
      ],

      teaches: [
        { title: "La forma no es el dibujo", body: "Las líneas son siempre las mismas y solo cambia dónde se sientan los puntos. Ese salto se aprende aquí con el dedo antes de saber nombrarlo." },
        { title: "Efectos locales", body: "Un punto afecta a las líneas que lo tocan y a ninguna más. Entenderlo es el momento en que el juego deja de depender de la suerte." },
        { title: "Retroceder a propósito", body: "A veces hay que empeorar el tablero para arreglarlo, y aquí eso no cuesta nada. Practicarlo es el objetivo." },
        { title: "Fiarse de un número", body: "La cuenta de cruces contesta lo que el ojo falla. Aprender a creerle antes que a la imagen es una destreza real." },
      ],

      ages: [
        { title: "5 a 6", body: "El tablero de 6 puntos. Empieza con 5,7 cruces y se resuelve en cuatro movimientos de media." },
        { title: "7 a 9", body: "Nueve puntos y 15 líneas. Hay que recolocar 8 puntos de media, y ahí empieza a importar el orden." },
        { title: "10 en adelante", body: "Doce puntos, 21 líneas y unos cincuenta cruces abiertos a la vez. Aquí ya no vale ordenar de uno en uno." },
        { title: "Adultos", body: "El mismo tablero grande contra el reloj. La figura siempre estuvo ahí, y la única pregunta es cuánto tardas en verla." },
      ],

      accessibility:
        "Cada punto es un botón de verdad con su propio nombre, así que se marca con Enter o con la barra espaciadora y se mueve con las cuatro flechas: el tablero entero se resuelve solo con el teclado. Arrastrar es un atajo y nunca un requisito, algo que importa para una mano pequeña que todavía no afina y para cualquier puntero alternativo, porque tocar un punto y luego tocar un hueco resuelve el mismo tablero. La zona que hay que acertar con el dedo es mayor que el círculo dibujado. Las líneas metidas en un cruce se marcan también con el grosor y no solo con el color, de modo que el tablero se lee sin distinguir tonos. Hay un reloj y únicamente cuenta: nada se acaba porque avance, y un tablero dejado a medias espera igual que estaba.",

      together: [
        { title: "Un punto cada uno", body: "Por turnos, un punto por turno. Se descubre enseguida que el otro acaba de abrir el cruce que tú ibas a cerrar." },
        { title: "Decirlo antes", body: "Di en voz alta adónde va el punto y por qué, y muévelo después. Quien sabe contestar está jugando y no siguiendo su propio dedo." },
        { title: "Apostar el final", body: "Antes del primer movimiento, cada uno dice cuántos puntos acabarán en otro sitio. En el grande son 11 de 12 y casi nadie apuesta tan alto." },
        { title: "Contar en voz alta", body: "Leed el número de cruces después de cada movimiento. Los pequeños deducen así qué causó qué, sin que nadie lo explique." },
      ],

      faq: [
        {
          q: "¿Todos los tableros tienen solución?",
          a: "Sí, por construcción y no por comprobación. Las líneas se trazan sin un solo cruce y los puntos se reparten después, así que el dibujo limpio existía antes que el tablero.",
        },
        {
          q: "¿Hace falta arrastrar?",
          a: "No. Tocar un punto y luego tocar el destino hace lo mismo, y las flechas del teclado también. Arrastrar solo es más rápido.",
        },
        {
          q: "¿Y si dos puntos quedan encima del mismo sitio?",
          a: "Las líneas que salen de ellos se tocan ahí, y eso cuenta como cruce. El tablero parecerá ordenado y seguirá sin terminar, así que conviene separarlos.",
        },
        {
          q: "¿Hay tiempo límite?",
          a: "No. El reloj solo cuenta, y un tablero a medias sigue ahí después de cerrar el navegador.",
        },
        {
          q: "¿Cuesta algo?",
          a: "Es gratis, sin anuncios, sin registro y sin descarga. Se carga en el navegador y sigue funcionando sin conexión.",
        },
        {
          q: "¿Desde qué edad?",
          a: "El tablero de 6 puntos funciona desde los cinco años, porque bastan cuatro movimientos de media. El grande interesa también a un adulto.",
        },
        {
          q: "¿Puedo quedarme atascado?",
          a: "Puedes sentirte atascado, porque a veces hay que llevar un punto a un sitio que parece peor. Ningún tablero se bloquea de verdad y cualquier movimiento se deshace con otro.",
        },
      ],

      keywords: ["desenreda", "puzle de líneas", "juego de lógica", "planaridad", "juego gratis", "puzle mental"],
    },

    fr: untangleFr,
  },

  provenance: [
    { claim: "6 dots and 9 lines, 9 and 15, 12 dots and 21 lines", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "60% of dot pairs carry a line on the small board, 31.8% on the big one", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "49.6 crossings on average on the big board, worst deal 88", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "5.7 crossings on average on the small board", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "one dot is caught in 90.7% of the small board's crossings", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "4 of 6 dots move on the small board, 8 of 9, 11 of 12 on the big one", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "the improve-only bot clears the big board 4.8% of the time, the small one 53.2%", source: "scripts/sim/untangle-graphs.mjs" },
    { claim: "3,000 dealt boards per tier", source: "scripts/sim/untangle-graphs.mjs" },
  ],
};
