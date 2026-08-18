import type { GameContent } from "../types";
import { jigsawFr } from "./fr/jigsaw";

/**
 * Jigsaw - the puzzle whose pictures are this catalogue's own key art.
 *
 * `src/games/jigsaw/logic.ts` holds a permutation and never sees the drawing,
 * which is what keeps it importable in node and what makes another picture cost
 * one line in `pictures.ts` rather than a rule change.
 *
 * The four languages are written, not translated. They open on different
 * sentences, order their paragraphs differently and make different jokes,
 * because a translation carries the source language's rhythm and that rhythm is
 * exactly what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/jigsaw-arrangements.mjs`, which
 * drives the shipped reducer over 20,000 runs per cut, or from the game's own
 * code. The blind-play number is worth reading twice: the simulation says 13.5,
 * 44.9 and 115.2 placements, and the closed form n(n+3)/4 says 13.5, 45 and
 * 115. Two methods, one answer.
 */
export const jigsaw: GameContent = {
  id: "jigsaw",

  copy: {
    he: {
      name: "פאזל",
      metaTitle: "פאזל - משחק הרכבת תמונה חינם | Ellaz",
      metaDescription:
        "פאזל חינמי בדפדפן לילדים. נוגעים בחלק, נוגעים במקום שלו, והתמונה מתחברת. שישה, שנים עשר או עשרים חלקים. בלי גרירה ובלי הרשמה.",

      lede: "פאזל חינם, ישר בדפדפן. נוגעים בחלק במגש, נוגעים במשבצת בלוח, והוא נוחת שם. אפשר לשים חלק במקום הלא נכון ואפשר להרים אותו בחזרה. התמונה נגמרת כשכל חלק יושב במקום שלו.",

      body: [
        "נוגעים בחלק. נוגעים במקום. זהו.",

        "אין כאן גרירה בכלל, ולא בגלל עצלנות. יד של בת ארבע לא מחזיקה מסלול רציף על מסך, וגם מי שמשתמש באמצעי קלט חלופי לא מחזיק. שני מגעים עושים בדיוק את אותה עבודה ועובדים לכולם, אז זה מה שיש כאן. אפשר יהיה להוסיף גרירה מעל זה בעתיד, אבל היא לעולם לא תחליף את המגע.",

        "משבצת לא נכונה מקבלת את החלק. זו החלטה, לא באג. פאזל נפתר בדיוק בזה, שמנסים חלק במקום ורואים שהוא לא שייך, ומשחק שמסרב היה הופך את זה לבוחן. כמה זה עולה? הרצנו עשרים אלף ריצות עם בוט שלא מסתכל על התמונה בכלל אלא רק זוכר מה כבר ניסה: שש חלקים דורשים ממנו 13.5 הנחות בממוצע, שנים עשר דורשים 44.9, ועשרים דורשים 115.2. ילד שמסתכל על התמונה גומר בשש, שתים עשרה או עשרים הנחות בדיוק. ההסתכלות שווה פי 2.3 ברמה הקלה ופי 5.8 בקשה.",

        "המספר הזה יצא פעמיים, בשתי דרכים שונות, וזו הסיבה שאפשר לצטט אותו. הסימולציה הריצה את המשחק עצמו. הנוסחה אומרת שמציאת החלק הנכון מבין k חלקים דורשת בממוצע (k+1)/2 ניסיונות, כלומר n(n+3)/4 ללוח שלם, שזה 13.5, 45 ו-115. השתיים נפגשות.",

        "התמונות הן ציורי המפתח של משחקים אחרים כאן. יש שמונה כאלה, וזו ההודאה: ילד שיפתור עשרה פאזלים יראה תמונה חוזרת. בחרנו את זה במודע, כי ציור חדש לכל פאזל היה מוסיף משקל לכל ביקור ראשון באתר, גם של מי שלא נכנס למשחק הזה בכלל.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "שישה חלקים, שנים עשר או עשרים. החלפה פותחת תמונה חדשה." },
        { title: "נוגעים בחלק", body: "אחד מהחלקים במגש שמתחת ללוח. הוא מקבל מסגרת." },
        { title: "נוגעים במשבצת", body: "החלק נוחת שם, גם אם זה לא המקום שלו." },
        { title: "מרימים בחזרה", body: "נגיעה בחלק שכבר בלוח מרימה אותו למגש ומחזיקה אותו ביד." },
        { title: "מחליפים", body: "חלק ביד ונגיעה במשבצת תפוסה מחליפה ביניהם. הישן חוזר למגש." },
      ],

      tips: [
        {
          title: "פינות קודם",
          body: "ארבע הפינות הן היחידות עם שני צדדים חלקים, אז הן הכי קלות לזיהוי ומקבעות את הכיוון של כל השאר.",
        },
        {
          title: "תחפשו קו שנקטע",
          body: "קו ארוך בציור, קצה של גבעה או של שולחן, ממשיך בדיוק לתוך החלק השכן. זה הרמז הכי חזק בלוח.",
        },
        {
          title: "צבע גדול הוא רמז חלש",
          body: "חלק שכולו רקע בצבע אחד מתאים כמעט בכל מקום. השאירו אותו לסוף, כשנשארו לו שתי אפשרויות.",
        },
        {
          title: "עשרים חלקים אחרי שנים עשר",
          body: "הקפיצה מ-44.9 הנחות ל-115.2 בלי הסתכלות היא בדיוק הפער שהמראה שלכם צריך לכסות. אל תדלגו על הרמה האמצעית.",
        },
      ],

      teaches: [
        { title: "חשיבה מרחבית", body: "לסובב תמונה בראש ולהחליט לאן היא הולכת זו אותה יכולת שגאומטריה תבקש בהמשך." },
        { title: "התמדה", body: "עשרים חלקים לוקחים זמן. לוח שלא נגמר בשלושים שניות מלמד להישאר." },
        { title: "חלק ושלם", body: "לראות שהתמונה בנויה מחתיכות זה השלב שלפני שברים." },
        { title: "לתקן בלי להתחיל מחדש", body: "חלק במקום הלא נכון לא הורס כלום. מרימים אותו ומנסים שוב." },
      ],

      ages: [
        { title: "3 עד 4", body: "שישה חלקים. אפשר לפתור בשש הנחות, וגם בוט עיוור גומר ב-13.5." },
        { title: "5 עד 6", body: "שנים עשר. עדיין מתחבר לבד אחרי כמה נסיונות, אבל כבר משתלם להסתכל." },
        { title: "7 ומעלה", body: "עשרים. יש 2,432,902,008,176,640,000 דרכים לסדר אותם ואחת מהן היא התמונה." },
        { title: "מבוגרים", body: "עשרים הנחות בעשרים חלקים זה מושלם. הרבה יותר קשה ממה שזה נשמע." },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה בכלל, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. זו לא גרסה מקוצרת של הפאזל אלא הדרך היחידה לשחק בו כאן. אין שעון ואין ספירה לאחור, אז אפשר לעצור באמצע ולחשוב כמה שרוצים. שום הנחה אינה שגויה, אז אין צליל שגיאה ואין מה לאבד, והמונה מראה כמה חלקים כבר יושבים במקומם. כל משבצת בלוח נושאת תווית עם מספר העמודה והשורה שלה ועם החלק שיושב בה, כך שקורא מסך מבחין ביניהן במקום להקריא עשרים פעמים אותו דבר. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "מחצית כל אחד", body: "אחד לוקח את השורה העליונה והשני את התחתונה. פתאום צריך לדבר." },
        { title: "תספרו את ההנחות", body: "אותה רמה, שני מכשירים, וסופרים כמה הנחות לקח. המספר הכי נמוך האפשרי הוא מספר החלקים." },
        { title: "תסבירו את הפינה", body: "בקשו לשמוע איך ידעתם שהחלק הזה הוא פינה. ילד שיודע לענות כבר קורא את התמונה." },
        { title: "הפוך", body: "נסו לפרק תמונה מוכנה ולהרכיב אותה שוב מהסוף להתחלה." },
      ],

      faq: [
        {
          q: "צריך לגרור את החלקים?",
          a: "לא, ואי אפשר. נוגעים בחלק ואז נוגעים במקום. שתי נגיעות עושות את אותה עבודה בדיוק ועובדות גם ליד קטנה וגם לאמצעי קלט חלופי.",
        },
        {
          q: "מה קורה אם שמתי חלק במקום הלא נכון?",
          a: "כלום. הוא יושב שם עד שתרימו אותו. אין צליל שגיאה, לא נלקחות נקודות, והתמונה פשוט עוד לא שלמה.",
        },
        {
          q: "כמה תמונות יש?",
          a: "שמונה, וכולן ציורי המפתח של משחקים אחרים באתר. אחרי עשרה פאזלים תראו תמונה חוזרת.",
        },
        {
          q: "מה השיא מודד?",
          a: "כמה הנחות לקח לסיים, ופחות זה טוב יותר. הרצפה היא מספר החלקים, כלומר שש, שתים עשרה או עשרים.",
        },
        {
          q: "מה נשמר כשיוצאים?",
          a: "התמונה, החלקים שכבר במקום, ומה שנשאר במגש. חוזרים בדיוק לאותו מקום, על אותו מכשיר.",
        },
        {
          q: "אפשר לסובב חלקים?",
          a: "אין צורך. כל חלק כבר בכיוון הנכון, אז השאלה היחידה היא לאן הוא הולך. זה מוריד שלב שלם מפאזל של ילד בן שלוש, ומשאיר את החלק שבאמת מלמד, לקרוא את התמונה.",
        },
      ],

      keywords: ["פאזל", "פאזל לילדים", "הרכבת תמונה", "משחק חינם", "בלי הורדה", "משחק לגיל הרך"],
    },

    en: {
      name: "Jigsaw",
      metaTitle: "Jigsaw - free picture puzzle for kids | Ellaz",
      metaDescription:
        "A free jigsaw puzzle in your browser. Tap a piece, tap where it goes, and the picture comes together. Six, twelve or twenty pieces. No dragging, no account.",

      lede: "A free jigsaw that runs in the browser. Tap a piece in the tray, tap a space on the board, and it lands there. A wrong space takes the piece anyway, and you can lift it back out. The picture is finished when every piece is home.",

      body: [
        "Tap a piece. Tap a space. That is it.",

        "There is no dragging here at all, and that is not laziness. A four-year-old's hand does not hold a continuous path across a screen, and neither does anyone using alternative input. Two taps do the identical job and work for everybody, so two taps is what this game has. Drag may be layered on top later, but it will never replace this.",

        "A wrong space accepts the piece. That is a decision rather than a bug: trying a piece somewhere and seeing that it does not belong is exactly how a jigsaw gets solved, and refusing the placement would turn the puzzle into a quiz. What does that cost? We ran 20,000 games with a bot that never looks at the picture and only remembers what it has already tried. Six pieces take it 13.5 placements on average, twelve take 44.9, and twenty take 115.2. A child who looks finishes in six, twelve or twenty exactly. So looking is worth 2.3 times on the small cut and 5.8 times on the big one.",

        "That number came out twice, by two different methods, which is why it is quotable. The simulation played the real game. The arithmetic says finding the right piece among k takes (k+1)/2 tries on average, so a whole board is n(n+3)/4, which gives 13.5, 45 and 115. They meet.",

        "The pictures are the key art of other games on this site. There are eight of them, and that is the admission: a child who solves ten puzzles will see one come round again. We chose it deliberately, because bespoke art for every puzzle would add weight to every first visit to the site, including visits by people who never open this game.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Six pieces, twelve or twenty. Switching also deals a new picture." },
        { title: "Tap a piece", body: "One of the pieces in the tray under the board. It gets a ring around it." },
        { title: "Tap a space", body: "The piece lands there, even when that is not where it belongs." },
        { title: "Lift it back", body: "Tapping a piece already on the board returns it to the tray and hands it to you." },
        { title: "Swap", body: "Holding a piece and tapping an occupied space trades them. The old one goes back to the tray." },
      ],

      tips: [
        {
          title: "Corners first",
          body: "The four corners are the only pieces with two flat sides, so they are the easiest to recognise and they fix the orientation of everything else.",
        },
        {
          title: "Follow a line that stops",
          body: "A long line in the drawing, the edge of a hill or a table, carries straight on into the piece next door. It is the strongest clue on the board.",
        },
        {
          title: "A big flat colour is a weak clue",
          body: "A piece that is all one background colour fits almost anywhere. Save it for the end, when only two spaces are left for it.",
        },
        {
          title: "Do not skip twelve",
          body: "Blind play jumps from 44.9 placements to 115.2 between the two cuts, and that gap is exactly the amount your eye has to cover. The middle level is where it learns to.",
        },
      ],

      teaches: [
        { title: "Spatial reasoning", body: "Turning an image over in your head and deciding where it belongs is the ability geometry will ask for later." },
        { title: "Persistence", body: "Twenty pieces take a while. A board that does not end in thirty seconds teaches staying with it." },
        { title: "Part and whole", body: "Seeing that a picture is made of pieces is the step before fractions." },
        { title: "Fixing without restarting", body: "A piece in the wrong place breaks nothing. Lift it out and try again." },
      ],

      ages: [
        { title: "3 to 4", body: "Six pieces. Solvable in six placements, and even a blind bot finishes in 13.5." },
        { title: "5 to 6", body: "Twelve. Still comes together after a few tries, but looking starts to pay." },
        { title: "7 and up", body: "Twenty. There are 2,432,902,008,176,640,000 ways to lay them out and one of them is the picture." },
        { title: "Grown-ups", body: "Twenty placements on twenty pieces is perfect. It is harder than it sounds." },
      ],

      accessibility:
        "One tap per action and no dragging anywhere, so the game works with alternative input and with a small hand that does not aim well yet. This is not a reduced version of the puzzle, it is the only way to play it here. There is no clock and no countdown, so you can stop in the middle and think for as long as you want. No placement is ever wrong, so there is no error sound and nothing to lose, and a counter shows how many pieces are already home. Every space carries its column, its row and the piece sitting in it as its label, so a screen reader can tell them apart instead of reading the same word twenty times. The whole game can be played in silence with nothing lost.",

      together: [
        { title: "Half each", body: "One takes the top row and one takes the bottom. Suddenly you have to talk to each other." },
        { title: "Count the placements", body: "Same level, two devices, and count how many it took. The lowest possible number is the number of pieces." },
        { title: "Explain the corner", body: "Ask how you knew that piece was a corner. A child who can answer is reading the picture." },
        { title: "Backwards", body: "Take a finished picture apart and put it back together from the last piece to the first." },
      ],

      faq: [
        {
          q: "Do I have to drag the pieces?",
          a: "No, and you cannot. Tap a piece, then tap a space. Two taps do the identical job and they work for a small hand and for alternative input.",
        },
        {
          q: "What happens if I put a piece in the wrong place?",
          a: "Nothing. It sits there until you lift it out. There is no error sound, no points are taken, and the picture is simply not finished yet.",
        },
        {
          q: "How many pictures are there?",
          a: "Eight, and all of them are the key art of other games on this site. After ten puzzles you will see one come round again.",
        },
        {
          q: "What does the record measure?",
          a: "How many placements it took to finish, where fewer is better. The floor is the number of pieces, so six, twelve or twenty.",
        },
        {
          q: "Does it remember where I was?",
          a: "Yes. The picture, the pieces already home and what is left in the tray all come back, on that device, exactly as you left them.",
        },
        {
          q: "Can I turn the pieces round?",
          a: "There is no need to. Every piece is already the right way up, so the only question is where it goes. That takes a whole step out of the puzzle for a three-year-old and leaves the part that teaches, which is reading the picture.",
        },
      ],

      keywords: ["jigsaw", "jigsaw for kids", "picture puzzle", "free browser game", "no download", "preschool game"],
    },

    es: {
      name: "Rompecabezas",
      metaTitle: "Rompecabezas - juego de piezas gratis | Ellaz",
      metaDescription:
        "Rompecabezas gratis en el navegador para niños. Toca una pieza, toca su hueco y la imagen se arma. Seis, doce o veinte piezas. Sin arrastrar y sin cuenta.",

      lede: "Un rompecabezas gratis, directamente en el navegador. Tocas una pieza de la bandeja, tocas un hueco del tablero y la pieza aterriza ahí. Un hueco equivocado también la acepta, y siempre puedes sacarla. La imagen termina cuando cada pieza está en su sitio.",

      body: [
        "Tocas una pieza. Tocas un hueco. Ya está.",

        "Aquí no se arrastra nada, y no es por pereza. La mano de un niño de cuatro años no mantiene un trazo continuo sobre una pantalla, y quien usa entradas alternativas tampoco. Dos toques hacen exactamente el mismo trabajo y le sirven a todo el mundo, así que dos toques es lo que hay. Se podrá añadir el arrastre encima más adelante, pero nunca sustituirá a esto.",

        "Un hueco equivocado acepta la pieza. Es una decisión, no un fallo: probar una pieza en un sitio y ver que no encaja es justo la forma en que se resuelve un rompecabezas, y rechazar la jugada lo convertiría en un examen. ¿Cuánto cuesta eso? Hicimos 20.000 partidas con un programa que nunca mira la imagen y solo recuerda lo que ya ha probado. Seis piezas le cuestan 13,5 colocaciones de media, doce le cuestan 44,9 y veinte le cuestan 115,2. Un niño que mira termina en seis, doce o veinte exactas. Mirar vale 2,3 veces en el corte pequeño y 5,8 veces en el grande.",

        "Ese número salió dos veces por caminos distintos, y por eso se puede citar. La simulación jugó el juego real. La aritmética dice que encontrar la pieza correcta entre k cuesta (k+1)/2 intentos de media, o sea n(n+3)/4 para el tablero entero, lo que da 13,5, 45 y 115. Coinciden.",

        "Las imágenes son el dibujo principal de otros juegos de esta web. Hay ocho, y esa es la confesión: un niño que resuelva diez rompecabezas verá alguna repetida. Lo elegimos a propósito, porque un dibujo nuevo por rompecabezas añadiría peso a cada primera visita a la web, incluida la de quien nunca abra este juego.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Seis piezas, doce o veinte. Cambiar de nivel reparte además una imagen nueva." },
        { title: "Toca una pieza", body: "Una de las de la bandeja, debajo del tablero. Se le pone un borde." },
        { title: "Toca un hueco", body: "La pieza aterriza ahí, aunque no sea su sitio." },
        { title: "Sácala otra vez", body: "Al tocar una pieza ya colocada vuelve a la bandeja y se queda en tu mano." },
        { title: "Intercambia", body: "Con una pieza en la mano, tocar un hueco ocupado las cambia. La antigua vuelve a la bandeja." },
      ],

      tips: [
        {
          title: "Las esquinas primero",
          body: "Las cuatro esquinas son las únicas piezas con dos lados lisos, así que son las más fáciles de reconocer y fijan la orientación de todo lo demás.",
        },
        {
          title: "Sigue una línea cortada",
          body: "Una línea larga del dibujo, el borde de una colina o de una mesa, continúa exactamente dentro de la pieza vecina. Es la pista más fuerte del tablero.",
        },
        {
          title: "Un color plano es mala pista",
          body: "Una pieza que es todo fondo de un solo color encaja casi en cualquier sitio. Déjala para el final, cuando solo le queden dos huecos.",
        },
        {
          title: "No te saltes el de doce",
          body: "El juego a ciegas pasa de 44,9 colocaciones a 115,2 entre un corte y el otro, y ese salto es justo lo que tu ojo tiene que cubrir. El nivel medio es donde aprende.",
        },
      ],

      teaches: [
        { title: "Razonamiento espacial", body: "Girar una imagen en la cabeza y decidir dónde va es la misma habilidad que pedirá la geometría más adelante." },
        { title: "Constancia", body: "Veinte piezas llevan un rato. Un tablero que no acaba en treinta segundos enseña a quedarse." },
        { title: "Parte y todo", body: "Ver que una imagen está hecha de trozos es el paso previo a las fracciones." },
        { title: "Arreglar sin empezar de cero", body: "Una pieza mal puesta no rompe nada. La sacas y pruebas otra vez." },
      ],

      ages: [
        { title: "3 a 4", body: "Seis piezas. Se resuelve en seis colocaciones, y hasta un programa ciego acaba en 13,5." },
        { title: "5 a 6", body: "Doce. Todavía se arma a base de intentos, pero mirar ya compensa." },
        { title: "7 en adelante", body: "Veinte. Hay 2.432.902.008.176.640.000 formas de colocarlas y una de ellas es la imagen." },
        { title: "Adultos", body: "Veinte colocaciones con veinte piezas es perfecto. Cuesta más de lo que parece." },
      ],

      accessibility:
        "Un toque por acción y nada de arrastrar, así que el juego funciona con entradas alternativas y con una mano pequeña que todavía no apunta bien. No es una versión reducida del rompecabezas, es la única manera de jugarlo aquí. No hay reloj ni cuenta atrás, se puede parar a mitad y pensar todo lo que haga falta. Ninguna colocación está mal, así que no hay sonido de error ni nada que perder, y un contador dice cuántas piezas están ya en su sitio. Cada hueco lleva su columna, su fila y la pieza que lo ocupa en la etiqueta, para que un lector de pantalla los distinga en vez de leer veinte veces lo mismo. Se puede jugar en silencio absoluto sin perder nada.",

      together: [
        { title: "Mitad cada uno", body: "Uno se queda la fila de arriba y otro la de abajo. De pronto hay que hablarse." },
        { title: "Contad las colocaciones", body: "Mismo nivel, dos aparatos, y contad cuántas hicieron falta. El mínimo posible es el número de piezas." },
        { title: "Explica la esquina", body: "Preguntad cómo supo que esa pieza era una esquina. Un niño que sabe responder ya está leyendo la imagen." },
        { title: "Al revés", body: "Deshaced una imagen terminada y volvedla a armar de la última pieza a la primera." },
      ],

      faq: [
        {
          q: "¿Hay que arrastrar las piezas?",
          a: "No, y no se puede. Tocas una pieza y luego tocas un hueco. Dos toques hacen el mismo trabajo y sirven para una mano pequeña y para entradas alternativas.",
        },
        {
          q: "¿Qué pasa si pongo una pieza donde no va?",
          a: "Nada. Se queda ahí hasta que la saques. No hay sonido de error, no se restan puntos y la imagen simplemente aún no está terminada.",
        },
        {
          q: "¿Cuántas imágenes hay?",
          a: "Ocho, y todas son el dibujo principal de otros juegos de la web. Después de diez rompecabezas verás alguna repetida.",
        },
        {
          q: "¿Qué mide el récord?",
          a: "Cuántas colocaciones costó terminar, y menos es mejor. El suelo es el número de piezas, o sea seis, doce o veinte.",
        },
        {
          q: "¿Recuerda dónde iba?",
          a: "Sí. La imagen, las piezas ya colocadas y lo que queda en la bandeja vuelven tal cual, en ese aparato.",
        },
        {
          q: "¿Se pueden girar las piezas?",
          a: "No hace falta. Cada pieza ya está derecha, así que la única pregunta es dónde va. Eso le quita un paso entero al rompecabezas de un niño de tres años y deja la parte que enseña, que es leer la imagen.",
        },
      ],

      keywords: ["rompecabezas", "puzzle para niños", "armar imagen", "juego gratis", "sin descargar", "juego infantil"],
    },

    fr: jigsawFr,
  },

  provenance: [
    {
      claim:
        "a bot that never looks at the picture needs 13.5, 44.9 and 115.2 placements on the six, twelve and twenty piece cuts",
      source: "scripts/sim/jigsaw-arrangements.mjs",
    },
    {
      claim:
        "the closed form n(n+3)/4 gives 13.5, 45 and 115, agreeing with the simulation",
      source: "scripts/sim/jigsaw-arrangements.mjs",
    },
    {
      claim: "looking at the picture is worth 2.3 times on six pieces and 5.8 times on twenty",
      source: "scripts/sim/jigsaw-arrangements.mjs",
    },
    {
      claim: "twenty pieces have 2,432,902,008,176,640,000 arrangements and one of them is the picture",
      source: "scripts/sim/jigsaw-arrangements.mjs",
    },
    {
      claim: "the cuts are three by two, four by three and five by four",
      source: "src/games/jigsaw/logic.ts",
    },
    {
      claim: "a wrong space accepts the piece, and lifting one back out is not counted",
      source: "src/games/jigsaw/logic.ts",
    },
    {
      claim: "there are eight pictures, all of them other games' key art",
      source: "src/games/jigsaw/pictures.ts",
    },
    {
      claim: "every space is labelled by column, row and the piece sitting in it",
      source: "src/games/jigsaw/JigsawGame.tsx",
    },
    {
      claim: "the record is placements, where fewer is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
