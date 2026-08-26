import type { GameContent } from "../types";
import { arrowtapFr } from "./fr/arrowtap";

/**
 * Arrows Out - the puzzle whose selling point is that it cannot be lost, and
 * that is a property of the RULES rather than a promise. A tap only empties a
 * cell, an empty cell blocks nothing, so a lane that was clear stays clear and
 * no order of taps can strand a board.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and pick different jokes, because a translation
 * carries the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * Every figure here comes from `scripts/sim/arrowtap-order.mjs`, which drives
 * the shipped rules over 4,000 dealt boards per level, or from the game's own
 * source. See `provenance` at the bottom.
 */
export const arrowtap: GameContent = {
  id: "arrowtap",

  copy: {
    he: {
      name: "חצים החוצה",
      metaTitle: "חצים החוצה - משחק חצים חינם | Ellaz",
      metaDescription:
        "משחק חצים חינמי בדפדפן. נוגעים בחץ שהדרך שלו לקצה פנויה והוא עף החוצה. שלוש רמות, אי אפשר להיתקע, בלי הרשמה ובלי פרסומות.",

      lede: "לוח מלא בחצים, כל אחד מצביע לכיוון אחר. נוגעים בחץ שהדרך שלו אל הקצה פנויה והוא עף החוצה. מפנים את כל הלוח. השיא נמדד בזמן, והמהיר מנצח.",

      body: [
        "נוגעים בחץ והוא עף לכיוון שאליו הוא מצביע. תנאי אחד. כל המשבצות בינו לבין הקצה חייבות להיות ריקות. זהו.",

        "מה שמפריד בין שלוש הרמות זה לא גודל הלוח אלא כמה ממנו תקוע. ספרנו 4,000 לוחות בכל רמה: ברמה הקלה 5.7 חצים מתוך 8 יכולים לעוף כבר בנגיעה הראשונה, בבינונית 8.8 מתוך 14, ובקשה 12.5 מתוך 22. כלומר קצת יותר מחצי הלוח הקשה פתוח מיד, והשאר מחכה שמישהו יפנה לו מסלול. הפער בין לוח ללוח גדול: בקשה ראינו לוחות שנפתחו עם 7 חצים חופשיים ולוחות שנפתחו עם 18, וההגרלה הזאת קובעת על ההרגשה יותר מהתווית של הרמה.",

        "אי אפשר לתקוע את עצמכם, וזו תכונה של החוקים ולא מזל. נגיעה רק מרוקנת משבצת, ומשבצת ריקה לא חוסמת כלום, אז מסלול שהיה פנוי נשאר פנוי. בדקנו בדרך הגסה. בוט שנוגע באקראי גמור, בלי טיפת מחשבה, סיים 12,000 לוחות מתוך 12,000. אף אחד מהם לא נתקע.",

        "גם המספרים לא זזים. לוח קשה נגמר בנגיעה ה-22, תמיד.",

        "וההודאה. אי אפשר להפסיד כאן, אז הדבר היחיד שנמדד הוא הזמן, והשעון ממשיך לרוץ בזמן שיושבים וחושבים. ילד שאוהב לתכנן לא מקבל על זה שום קרדיט. מי שמחפש חידה שנושכת יסיים את הרמה הקשה ויבקש עוד. פה מנצחת עין מהירה.",
      ],

      howToPlay: [
        { title: "מסתכלים על החוד", body: "כל חץ מראה מאיזה קצה הוא ייצא. הצורה אומרת את הכיוון, הצבע רק מקבץ." },
        {
          title: "נוגעים במסלול פנוי",
          body: "אם כל המשבצות בין החץ לקצה ריקות, הוא עף. אחרת הוא רועד ושום דבר לא זז.",
        },
        {
          title: "מתחילים מהשוליים",
          body: "חץ שכבר עומד על הקצה שאליו הוא מצביע לא חוסם אותו כלום, אז הוא תמיד יכול לצאת.",
        },
        { title: "מרוקנים את הלוח", body: "כשלא נשאר אף חץ הסיבוב נגמר והשעון נעצר." },
      ],

      tips: [
        {
          title: "אל תחשבו, תיגעו",
          body: "שום סדר לא הורס לוח, אז ההיסוס הוא הדבר היחיד שעולה משהו. קחו את החץ הפנוי הראשון שהעין מוצאת.",
        },
        {
          title: "כיוון אחד בכל פעם",
          body: "רדפו אחרי כל החצים באותו צבע לפני שאתם עוברים לצבע הבא. העין סורקת קו אחד במקום לחטט בכל הלוח, והזמן צונח.",
        },
        {
          title: "מקלפים מבחוץ",
          body: "השוליים מתרוקנים מהר וכל יציאה פותחת את המרכז. הלוח אף פעם לא נסגר בחזרה, הוא רק נפתח.",
        },
        {
          title: "סירוב לא עולה כלום",
          body: "חץ חסום לא נספר ולא מוריד כלום. בספק, תיגעו כדי לראות במקום לספור משבצות בעיניים.",
        },
      ],

      teaches: [
        {
          title: "לקרוא כיוון",
          body: "להגיד לאן צורה מצביעה ולעקוב אחרי הקו שלה עד הקצה זו מיומנות מרחבית שהגן מתרגל עם הידיים. כאן היא כל המשחק.",
        },
        {
          title: "לראות מכשול",
          body: "השאלה אף פעם לא החץ אלא מה עומד לפניו. ילד לומד מהר להסתכל על הדרך ולא על החפץ.",
        },
        {
          title: "לסרוק מהר",
          body: "למצוא את אחד מ-12.5 החצים הפנויים בלוח קשה מתוך 22 זה תרגיל בקשב חזותי, והשעון מודד אותו.",
        },
      ],

      ages: [
        {
          title: "4 עד 5",
          body: "קל, 8 חצים על לוח 4 על 4. כמעט שלושה מכל ארבעה חצים יכולים לזוז כבר בהתחלה, אז נגיעה ראשונה כמעט תמיד מצליחה.",
        },
        { title: "6 עד 8", body: "בינוני, 14 חצים, וכאן כבר צריך לעקוב אחרי קו בעיניים לפני שנוגעים." },
        {
          title: "9 ומעלה",
          body: "קשה, 22 חצים על לוח 6 על 6. כל הלוח נכנס למסך והשעון הופך ליריב האמיתי.",
        },
        { title: "מבוגרים", body: "לוח קשה הוא הפסקה של כמה עשרות שניות. השיא נשמר לכל רמה בנפרד." },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד עם אמצעי קלט חלופיים ועם יד קטנה שעדיין לא מדייקת. כל משבצת היא כפתור שאפשר להגיע אליו במקלדת, עם תווית שמכריזה על השורה, העמודה והכיוון של החץ. הצורה נושאת את המידע והצבע רק מקבץ, וארבעת הגוונים מרוחקים זה מזה בבהירות כדי להישאר נבדלים בלי להישען על ראיית צבע. בטלפון של 390 פיקסלים משבצת בלוח הגדול היא בערך 57 פיקסלים. חץ חסום עונה ברעד ולא בצליל שגיאה.",

      together: [
        {
          title: "נגיעה לכל אחד",
          body: "בתורות על אותו לוח. אף אחד לא יכול לקלקל את המשחק של השני, אז התור של היריב נסבל.",
        },
        {
          title: "מכריזים לפני",
          body: "להגיד בקול מאיזה קצה החץ ייצא לפני שנוגעים. ילד שעונה נכון הבין את כל החוק.",
        },
        {
          title: "מרוץ צבעים",
          body: "שחקן אחד מוציא רק חצים בצבע אחד והשני את כל השאר. הלוח מתרוקן בכפול והוויכוח הוא על המשבצות המשותפות.",
        },
        {
          title: "שני מכשירים, שעון אחד",
          body: "אותה רמה, מתחילים ביחד ומשווים זמנים. הלוחות שונים, אז בסיבוב שני מחליפים מקומות.",
        },
      ],

      faq: [
        {
          q: "אפשר להיתקע בלי מוצא?",
          a: "לא. מתוך 12,000 לוחות ששוחקו לגמרי באקראי אף אחד לא נתקע. נגיעה מרוקנת משבצת ומשבצת ריקה לא חוסמת כלום, אז מסלולים פנויים נשארים פנויים.",
        },
        {
          q: "כמה חצים יש בכל רמה?",
          a: "8 על לוח 4 על 4, 14 על לוח 5 על 5, ו-22 על לוח 6 על 6.",
        },
        {
          q: "סדר הנגיעות משנה?",
          a: "לסיום, לא. לשעון, כן. לוח קשה דורש בדיוק 22 נגיעות בכל דרך שתבחרו, אז מה שמשתנה הוא רק זמן החיפוש.",
        },
        {
          q: "איך נמדד השיא?",
          a: "בזמן, כשמהיר יותר עדיף, ובנפרד לכל רמה. לוח של 8 חצים ולוח של 22 אינם אותו הישג.",
        },
        {
          q: "מה קורה כשנוגעים בחץ חסום?",
          a: "הוא רועד וזהו. נגיעה כזאת לא נספרת ולא מופיעה שום הודעה, כי ניחוש סביר לא ראוי לנזיפה.",
        },
        {
          q: "צריך לדעת לקרוא?",
          a: "לא, אין על הלוח אות אחת ולא ספרה אחת. ילד שעדיין לא קורא משחק לבד.",
        },
        {
          q: "המשחק חינמי?",
          a: "כן, לגמרי, בלי פרסומות ובלי חשבון. אחרי ביקור אחד הוא עובד גם בלי קליטה.",
        },
        {
          q: "לוח באמצע נשמר?",
          a: "כן. הלוח והשעון נשמרים במכשיר, אז להניח את הטאבלט לא עולה כלום.",
        },
      ],

      keywords: ["חצים החוצה", "משחק חצים", "פאזל", "חשיבה", "לוגיקה", "בלי קריאה"],
    },

    en: {
      name: "Arrows Out",
      metaTitle: "Arrows Out - free tap puzzle | Ellaz",
      metaDescription:
        "A free arrow puzzle in your browser. Tap an arrow with a clear lane to the edge and it flies off. Three sizes, no dead ends, no sign-up.",

      lede: "A grid full of arrows, each pointing one of four ways. Tap one whose lane to the edge is clear and it flies off the board. Clear the grid. The record is the time, and quicker wins.",

      body: [
        "Tap an arrow and it flies off the way it points. One condition. Every square between it and the edge has to be empty. That is the whole rule.",

        "What separates the three levels is not the size of the grid, it is how much of the grid is stuck. Across 4,000 dealt boards per level, an easy board opens with 5.7 of its 8 arrows already free to go, a medium one with 8.8 of 14, and a hard one with 12.5 of 22. So a little over half of a hard board can move on the first tap and the rest is waiting for somebody to clear a lane. The spread between two hard boards is wide, from 7 free arrows up to 18, and that draw decides more about how a game feels than the difficulty label does.",

        "You cannot trap yourself, and that comes out of the rules rather than out of luck. A tap only empties a square, an empty square blocks nothing, so a lane that was clear stays clear. We checked the blunt way. A bot tapping completely at random, with no thought behind any choice, finished 12,000 boards out of 12,000. None of them jammed.",

        "The count does not move either. A hard board ends on tap 22, every time.",

        "Here is the catch. Nothing can be lost, so the only thing left worth measuring is the clock, and the clock keeps running while you sit and think. A child who likes to plan gets no credit for it here. Anyone hunting a puzzle with teeth will clear hard and want more. Fast eyes win this one.",
      ],

      howToPlay: [
        {
          title: "Read the point",
          body: "Every arrow shows which edge it will leave by. The shape carries the direction and the colour only groups them.",
        },
        {
          title: "Tap a clear lane",
          body: "If every square between the arrow and its edge is empty, it goes. If not, it shakes and nothing moves.",
        },
        {
          title: "Start at the rim",
          body: "An arrow already sitting on the edge it points at has nothing in front of it at all, so it can always leave.",
        },
        {
          title: "Empty the grid",
          body: "The round ends when no arrow is left, and the clock stops on that tap.",
        },
      ],

      tips: [
        {
          title: "Do not think, tap",
          body: "No order spoils a board, so hesitation is the only thing that costs you anything. Take the first free arrow your eye lands on.",
        },
        {
          title: "One direction at a time",
          body: "Chase every arrow of one colour before you switch. Your eye sweeps a single line instead of raking the whole grid, and the time drops.",
        },
        {
          title: "Peel from the outside",
          body: "The rim empties fast and each departure opens the middle. The board never closes back up, it only opens.",
        },
        {
          title: "A refusal is free",
          body: "A blocked arrow costs nothing and counts nothing. When you are unsure, tap to find out instead of counting squares with your eyes.",
        },
      ],

      teaches: [
        {
          title: "Reading a direction",
          body: "Saying where a shape points and following its line to the edge is a spatial skill nurseries practise with hands and hoops. Here it is the whole game.",
        },
        {
          title: "Seeing the obstacle",
          body: "The question is never the arrow, it is what stands in front of it. A child learns quickly to look at the path instead of the object.",
        },
        {
          title: "Scanning quickly",
          body: "Finding one of the 12.5 free arrows on a hard board of 22 is a visual attention exercise, and the clock puts a number on it.",
        },
      ],

      ages: [
        {
          title: "4 to 5",
          body: "Easy, 8 arrows on a 4 by 4 grid. Nearly three arrows in every four can move from the start, so a first tap almost always works.",
        },
        {
          title: "6 to 8",
          body: "Medium, 14 arrows, where following a line with your eyes before tapping starts to pay.",
        },
        {
          title: "9 and up",
          body: "Hard, 22 arrows on a 6 by 6 grid. The whole board fits on the screen and the clock becomes the real opponent.",
        },
        {
          title: "Grown-ups",
          body: "A hard board is a break of a few dozen seconds. The record is kept per level, so there are three marks to beat rather than one.",
        },
      ],

      accessibility:
        "One tap per action, with no dragging and no press-and-hold, so it works with alternative input devices and with a small hand that does not aim well yet. Every square is a button you can reach from the keyboard, labelled with its row, its column and the direction of the arrow on it. The shape carries the information and the colour only groups, and the four hues are spread apart in lightness so they stay distinct without relying on colour vision. On a 390 pixel phone a square of the largest grid measures about 57 pixels. A blocked arrow answers with a shake rather than an error sound.",

      together: [
        {
          title: "One tap each",
          body: "Take turns on the same board. Neither player can spoil the other's game, which makes waiting for a turn bearable.",
        },
        {
          title: "Call it first",
          body: "Say out loud which edge the arrow will leave by before tapping. A child who gets that right has understood the entire rule.",
        },
        {
          title: "The colour race",
          body: "One player takes only the arrows of a single colour and the other takes the rest. The board empties twice as fast and the argument is over the shared squares.",
        },
        {
          title: "Two devices, one clock",
          body: "Same level, start together, compare times. The boards differ, so swap places for the second round.",
        },
      ],

      faq: [
        {
          q: "Can you get stuck with no move left?",
          a: "No. Out of 12,000 boards played entirely at random, not one jammed. A tap empties a square and an empty square blocks nothing, so clear lanes stay clear.",
        },
        {
          q: "How many arrows are there per level?",
          a: "8 on a 4 by 4 grid, 14 on a 5 by 5, and 22 on a 6 by 6.",
        },
        {
          q: "Does the order of taps matter?",
          a: "For finishing, no. For the clock, yes. A hard board takes exactly 22 taps whichever route you pick, so only the searching time changes.",
        },
        {
          q: "How is the record measured?",
          a: "In time, where quicker is better, and separately for each level. A board of 8 arrows and a board of 22 are not the same achievement.",
        },
        {
          q: "What happens if I tap a blocked arrow?",
          a: "It shakes, and that is all. The tap is not counted and no message appears, because a reasonable guess does not deserve a telling-off.",
        },
        {
          q: "Do you need to read to play?",
          a: "No. There is not one letter or digit on the board, so a child who cannot read plays alone.",
        },
        {
          q: "Is it free?",
          a: "Completely, with no ads and no account. After one visit it runs with no signal at all.",
        },
        {
          q: "Is a half-finished board kept?",
          a: "Yes. The grid and the clock are stored on the device, so putting the tablet down costs nothing.",
        },
      ],

      keywords: ["arrows out", "arrow puzzle", "tap puzzle", "logic", "no reading", "brain game"],
    },

    es: {
      name: "Flechas Fuera",
      metaTitle: "Flechas Fuera - puzle gratis | Ellaz",
      metaDescription:
        "Puzle de flechas gratis en el navegador. Toca una flecha con el camino libre hasta el borde y sale volando. Tres tamaños y ningún callejón sin salida.",

      lede: "Un tablero lleno de flechas, cada una apuntando hacia un lado. Tocas una que tenga el camino libre hasta el borde y sale volando. Vacías el tablero. El récord es el tiempo, y gana quien va más rápido.",

      body: [
        "Tocas una flecha y sale volando hacia donde apunta. Una condición. Todas las casillas entre ella y el borde tienen que estar vacías. Ya está.",

        "Lo que separa los tres niveles no es el tamaño del tablero, es cuánto tablero está atascado. Repartimos 4.000 partidas por nivel para contarlo. En el fácil, 5,7 flechas de 8 pueden salir ya en el primer toque. En el medio, 8,8 de 14. En el difícil, 12,5 de 22, algo más de la mitad del tablero abierto de entrada, y el resto esperando a que alguien despeje un carril. La diferencia entre dos tableros difíciles es enorme, de 7 flechas libres a 18, y ese reparto decide más sobre la sensación de la partida que la etiqueta del nivel.",

        "No puedes quedarte encerrado, y eso sale de las reglas y no de la suerte. Un toque solo vacía una casilla, una casilla vacía no bloquea nada, así que un carril despejado sigue despejado. Lo comprobamos a lo bruto. Un robot que toca completamente al azar, sin pensar ni una vez, terminó 12.000 tableros de 12.000. Ninguno se quedó atascado.",

        "El número tampoco cambia. Un tablero difícil acaba en el toque 22, siempre.",

        "Y la parte honesta. Aquí no se puede perder, así que lo único que queda por medir es el reloj, y el reloj corre mientras te paras a pensar. A un niño al que le gusta planear no se le premia nada de eso. Quien busque un puzle con dientes terminará el difícil y pedirá más. Aquí gana el ojo rápido.",
      ],

      howToPlay: [
        {
          title: "Mira la punta",
          body: "Cada flecha enseña por qué borde va a salir. La forma lleva la dirección y el color solo agrupa.",
        },
        {
          title: "Toca un carril libre",
          body: "Si todas las casillas entre la flecha y su borde están vacías, se va. Si no, tiembla y no se mueve nada.",
        },
        {
          title: "Empieza por el filo",
          body: "Una flecha que ya está en el borde al que apunta no tiene nada delante, así que siempre puede salir.",
        },
        {
          title: "Vacía el tablero",
          body: "La ronda acaba cuando no queda ninguna flecha, y el reloj se para en ese toque.",
        },
      ],

      tips: [
        {
          title: "No pienses, toca",
          body: "Ningún orden estropea un tablero, así que dudar es lo único que te cuesta algo. Coge la primera flecha libre que te encuentre el ojo.",
        },
        {
          title: "Una dirección cada vez",
          body: "Persigue todas las flechas de un color antes de cambiar. El ojo recorre una sola línea en vez de rastrear el tablero entero, y el tiempo se desploma.",
        },
        {
          title: "Pela desde fuera",
          body: "El borde se vacía deprisa y cada salida abre el centro. El tablero nunca se vuelve a cerrar, solo se abre.",
        },
        {
          title: "Equivocarse sale gratis",
          body: "Una flecha bloqueada no cuenta ni resta. Ante la duda, toca para verlo en vez de contar casillas con la vista.",
        },
      ],

      teaches: [
        {
          title: "Leer una dirección",
          body: "Decir hacia dónde apunta una forma y seguir su línea hasta el borde es una destreza espacial que en infantil se trabaja con las manos. Aquí es el juego entero.",
        },
        {
          title: "Ver el obstáculo",
          body: "La pregunta nunca es la flecha, es lo que tiene delante. Un niño aprende rápido a mirar el camino y no el objeto.",
        },
        {
          title: "Barrer rápido",
          body: "Encontrar una de las 12,5 flechas libres de un tablero difícil entre 22 es un ejercicio de atención visual, y el reloj le pone número.",
        },
      ],

      ages: [
        {
          title: "4 a 5",
          body: "Fácil, 8 flechas en un tablero de 4 por 4. Casi tres de cada cuatro flechas pueden moverse desde el principio, así que el primer toque casi siempre acierta.",
        },
        {
          title: "6 a 8",
          body: "Medio, 14 flechas, donde ya compensa seguir una línea con la vista antes de tocar.",
        },
        {
          title: "9 en adelante",
          body: "Difícil, 22 flechas en un tablero de 6 por 6. El tablero entero cabe en la pantalla y el reloj pasa a ser el rival de verdad.",
        },
        {
          title: "Adultos",
          body: "Un tablero difícil es una pausa de unas decenas de segundos. El récord se guarda por nivel, así que hay tres marcas que batir.",
        },
      ],

      accessibility:
        "Un toque por acción, sin arrastrar y sin mantener pulsado, de modo que funciona con dispositivos de entrada alternativos y con una mano pequeña que todavía no apunta bien. Cada casilla es un botón al que se llega con el teclado, con una etiqueta que dice su fila, su columna y la dirección de su flecha. La forma lleva la información y el color solo agrupa, y los cuatro tonos están separados en claridad para seguir distinguiéndose sin depender de la visión del color. En un móvil de 390 píxeles, una casilla del tablero grande mide unos 57 píxeles. Una flecha bloqueada responde con una sacudida y no con un sonido de error.",

      together: [
        {
          title: "Un toque cada uno",
          body: "Por turnos en el mismo tablero. Ninguno puede estropear la partida del otro, y eso hace llevadero esperar.",
        },
        {
          title: "Decirlo antes",
          body: "Anunciar en voz alta por qué borde va a salir la flecha antes de tocarla. Un niño que acierta ha entendido la regla entera.",
        },
        {
          title: "La carrera de colores",
          body: "Un jugador saca solo las flechas de un color y el otro se ocupa del resto. El tablero se vacía al doble y la discusión va sobre las casillas compartidas.",
        },
        {
          title: "Dos aparatos, un reloj",
          body: "Mismo nivel, salida a la vez, y se comparan los tiempos. Como los tableros no coinciden, en la segunda ronda se cambian los sitios.",
        },
      ],

      faq: [
        {
          q: "¿Se puede llegar a un callejón sin salida?",
          a: "No. De 12.000 tableros jugados por completo al azar, ninguno se quedó atascado. Un toque vacía una casilla y una casilla vacía no bloquea nada, así que los carriles libres siguen libres.",
        },
        {
          q: "¿Cuántas flechas hay en cada nivel?",
          a: "8 en un tablero de 4 por 4, 14 en uno de 5 por 5, y 22 en uno de 6 por 6.",
        },
        {
          q: "¿Importa el orden de los toques?",
          a: "Para terminar, no. Para el reloj, sí. Un tablero difícil pide exactamente 22 toques por el camino que elijas, así que solo cambia el tiempo de búsqueda.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En tiempo, donde más rápido es mejor, y por separado en cada nivel. Un tablero de 8 flechas y otro de 22 no son el mismo logro.",
        },
        {
          q: "¿Qué pasa si toco una flecha bloqueada?",
          a: "Tiembla y nada más. Ese toque no se cuenta y no sale ningún aviso, porque una suposición razonable no merece una regañina.",
        },
        {
          q: "¿Hace falta saber leer?",
          a: "No. En el tablero no hay ni una letra ni una cifra, así que un niño que todavía no lee juega solo.",
        },
        {
          q: "¿Es gratis?",
          a: "Del todo, sin anuncios y sin cuenta. Después de una visita funciona sin cobertura.",
        },
        {
          q: "¿Se guarda un tablero a medias?",
          a: "Sí. El tablero y el reloj quedan en el aparato, así que dejar la tableta no cuesta nada.",
        },
      ],

      keywords: [
        "flechas fuera",
        "puzle de flechas",
        "juego de tocar",
        "lógica",
        "sin leer",
        "infantil",
      ],
    },

    fr: arrowtapFr,
  },

  provenance: [
    {
      claim: "4,000 dealt boards per level; an easy board opens with 5.7 of its 8 arrows free, medium 8.8 of 14, hard 12.5 of 22",
      source: "scripts/sim/arrowtap-order.mjs",
    },
    {
      claim: "a hard board opens anywhere between 7 and 18 free arrows",
      source: "scripts/sim/arrowtap-order.mjs",
    },
    {
      claim: "a bot tapping at random cleared 12,000 boards out of 12,000, none stranded",
      source: "scripts/sim/arrowtap-order.mjs",
    },
    {
      claim: "clearing a hard board takes exactly 22 taps whatever order is chosen",
      source: "scripts/sim/arrowtap-order.mjs",
    },
    {
      claim: "8 arrows on 4x4, 14 on 5x5, 22 on 6x6, and a blocked tap changes nothing and is not counted",
      source: "src/games/arrowtap/logic.ts",
    },
    {
      claim: "a square of the 6x6 grid measures 57 pixels on a 390 pixel phone, and each cell is a keyboard button labelled with its row, column and direction",
      source: "src/games/arrowtap/ArrowTapGame.tsx",
    },
    {
      claim: "the record is a time, quicker is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
