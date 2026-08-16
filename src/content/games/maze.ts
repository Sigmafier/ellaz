import type { GameContent } from "../types";

/**
 * Way Home - the maze whose difficulty sits on PLANNING rather than on the
 * hand. The arrows move the mouse one square at a time, so a four-year-old
 * steers the whole route with big single-tap buttons rather than holding a
 * gesture, and the thing left to be good at is which order to collect the
 * crumbs in.
 *
 * That claim is the page, so it is measured rather than asserted:
 * `scripts/sim/maze-routes.mjs` deals 20,000 fresh mazes per level through the
 * shipped `newMaze` and `tap`, and plays each one three ways - the brute-forced
 * optimum, nearest-crumb-first, and reading order. The gap between them is the
 * size of the skill, in steps.
 *
 * The admission is measured too. `LEVELS.easy.braid` is 0.9, and what that does
 * to a board is a number: 0.35 dead ends survive on an average easy deal, and
 * in 10.3% of them every order of the crumbs costs exactly the same.
 *
 * The three languages are written, not translated. They open on different
 * sentences, run to different lengths and make different asides, because a
 * translation carries the source language's rhythm and that rhythm is exactly
 * what reads as machine-made.
 *
 * See `provenance` at the bottom for where each figure comes from.
 */
export const maze: GameContent = {
  id: "maze",

  copy: {
    he: {
      name: "הדרך הביתה",
      metaTitle: "הדרך הביתה - משחק מבוך חינם | Ellaz",
      metaDescription:
        "משחק מבוך חינמי בדפדפן. מנווטים את העכבר בין הגדרות עם החצים, משבצת בכל לחיצה, ואוספים פירורים בדרך. בלי שעון, בלי חיים, ובלי הרשמה.",

      lede: "משחק מבוך חינם בדפדפן. עכבר, כמה פירורי גבינה ומאורה בתוך גדר חיה. מנווטים את העכבר בין הגדרות עם החצים, משבצת בכל לחיצה, ואוספים כל פירור שהוא עובר עליו. אוספים הכול, מגיעים הביתה, ומבוך חדש מחכה.",

      body: [
        "לוחצים על חץ, והעכבר זז. משבצת אחת בכל לחיצה. אוסף כל פירור שדרך עליו. זהו.",

        "המיומנות כאן היא לבחור סדר, ואת זה אפשר למדוד במקום להבטיח. חילקנו 20,000 מבוכים טריים בכל גודל לוח והשווינו כל אחד מהם לריצה הקצרה ביותר שקיימת לו, כזו שנבדקה מול כל סדר אפשרי של הפירורים. עכבר שהולך תמיד אל הפירור הקרוב, המהלך שנראה מתבקש, קלע לדרך הקצרה ב-92.7 אחוז מהלוחות הקטנים ורק ב-68.6 אחוז מהגדולים. מי שאוסף לפי סדר הקריאה יורד ל-44.6 אחוז. ובלוח הגדול הסדר הגרוע ביותר עולה 84.35 צעדים מול 39.53 בדרך הקצרה, כך שההחלטה שווה יותר מכל ההליכה.",

        "החצים מזיזים את העכבר משבצת אחת בכל לחיצה, ואתם מנווטים אותו לאורך כל הדרך. המסלול שלכם. שום דבר לא מוחזק לחוץ, פשוט לוחצים חץ לכיוון שרוצים ללכת. ילד שהאצבע שלו עוד לא מכוונת משחק בדיוק את אותו משחק.",

        "וההודאה, כדאי לדעת אותה מראש: הלוח הקטן הוא בקושי מבוך. הוא נחצב כמו מבוך אמיתי ואז נפתחות בו תשע מכל עשר סמטאות ללא מוצא, כך שבחלוקה ממוצעת נשארת בו שליש של סמטה אחת, ובעשירית מהחלוקות כל סדר של הפירורים עולה בדיוק אותו מספר צעדים. זו גינה עם גדרות, וזה בכוונה. בן ארבע צריך בדיוק את זה. בן שמונה יגמור אותה תוך דקה, אז אל תתחילו אותו שם.",

        "אין שעון ואין חיים, ואי אפשר להפסיד. מבוך שהלכתם בו סחור סחור עדיין נגמר במאורה, הוא פשוט לא נספר כמושלם.",
      ],

      howToPlay: [
        { title: "בוחרים גודל לוח", body: "5 על 5 עם שני פירורים, 6 על 6 עם שלושה, או 7 על 7 עם ארבעה." },
        { title: "מסתכלים על הלוח", body: "הכול גלוי מהשנייה הראשונה. אין מה לחפש, יש מה להחליט." },
        { title: "מנווטים עם החצים", body: "כל לחיצה מזיזה את העכבר משבצת אחת, ואף פעם לא דרך גדר חיה." },
        { title: "אוספים בדרך", body: "כל פירור שהעכבר דורך עליו נאסף, גם אם לא כיוונתם אליו." },
        { title: "חוזרים למאורה", body: "כשכל הפירורים נאספו, הליכה אל המאורה סוגרת את המבוך והבא מגיע לבד." },
      ],

      tips: [
        {
          title: "הפירור הקרוב הוא לא תמיד הראשון",
          body: "זה המהלך המתבקש והוא מפספס את הדרך הקצרה בכשליש מהלוחות הגדולים. שווה להסתכל איפה הפירור השני יושב לפני שיוצאים אל הראשון.",
        },
        {
          title: "תסתכלו איפה המאורה",
          body: "הריצה נגמרת שם תמיד, אז פירור שנמצא בכיוון שלה כמעט חינם. פירור בכיוון ההפוך צריך לאסוף מוקדם.",
        },
        {
          title: "מסלול אחד, שני פירורים",
          body: "שני פירורים על אותו ציר נאספים בהליכה ישרה אחת. לפני שהולכים אל הקרוב, בדקו אם הרחוק יושב מעבר לו על אותה דרך.",
        },
        {
          title: "המסלול המואר",
          body: "אחרי כל צעד הדרך שנעשתה נשארת מוארת לרגע. שם רואים בדיוק כמה עקיפות היו, וזה הדבר הכי מלמד במסך.",
        },
      ],

      teaches: [
        {
          title: "לתכנן סדר",
          body: "ארבעה פירורים זה 24 סדרים אפשריים, ורובם ארוכים יותר. זו בדיוק כמות הבחירה שאפשר להחזיק בראש.",
        },
        {
          title: "לקרוא מרחב",
          body: "לפני הצעד צריך לראות שדרך קיימת. זו קריאת מפה קטנה, בלי מילה אחת.",
        },
        {
          title: "לעצור לפני שפועלים",
          body: "שום דבר לא זז עד שלוחצים חץ, אז שנייה של מחשבה משנה את התוצאה מיד. זה נדיר במשחק שילדים אוהבים.",
        },
        {
          title: "לחיות עם לא מושלם",
          body: "מבוך עקום נגמר בדיוק כמו ישר. אף אחד לא נענש, והפעם הבאה מחכה ממש שם.",
        },
      ],

      ages: [
        {
          title: "3 עד 4",
          body: "הלוח הקטן. שני פירורים, גדרות מעטות, וכמעט כל צעד מקדם משהו.",
        },
        {
          title: "5 עד 6",
          body: "לוח 6 על 6 ושלושה פירורים. הדרך הקצרה שם היא 24.41 צעדים בממוצע, וכבר משתלם לחשוב על הסדר.",
        },
        {
          title: "7 ומעלה",
          body: "הלוח הגדול. ארבעה פירורים, כמעט שש סמטאות ללא מוצא בממוצע, וריצה מושלמת שדורשת להסתכל על כל הלוח.",
        },
        {
          title: "מבוגרים",
          body: "נסו רצף של מושלמים. הבוט שהולך לקרוב ביותר מגיע ל-68.6 אחוז, וזו רמה נוחה להשוות אליה.",
        },
      ],

      accessibility:
        "החצים הם כפתורים גדולים ללחיצה בודדת, לא מחווה שצריך להחזיק, וכל לחיצה מזיזה את העכבר משבצת אחת. אפשר גם עם מקשי החצים במקלדת. אין שעון ואין ספירה לאחור, אז אפשר לעצור באמצע ולחשוב כמה שרוצים. המשבצות גדולות: בלוח הגדול הן יוצאות בערך 49 פיקסלים על טלפון של 390 פיקסלים, ובלוח הקטן הרבה יותר. כל משבצת נושאת תווית עם מה שיש בה ועם המספרים שלה בשורה ובעמודה, כך שקורא מסך מבחין בין 49 משבצות במקום להקריא אותו דבר 49 פעמים. אפשר לשחק בשקט מוחלט בלי לאבד מידע.",

      together: [
        {
          title: "להצביע לפני שנוגעים",
          body: "שאלו איזה פירור ראשון, ורק אז תנו לגעת. ילד קטן עונה על זה באצבע, וזו כבר תוכנית.",
        },
        {
          title: "מבוך לכל אחד",
          body: "בתורות, מבוך שלם לכל אחד, וסופרים כמה מהם יצאו מושלמים. אין שעון אז אף אחד לא ממהר.",
        },
        {
          title: "לנחש כמה צעדים",
          body: "לפני הנגיעה הראשונה, נחשו כמה צעדים ייקחו. אחרי המבוך משווים למונה שעל המסך.",
        },
        {
          title: "לספר איפה הוא היה",
          body: "העכבר לא זוכר כלום, אז הסיפור שלכם. מי גר במאורה, מי פיזר את הפירורים, ולמה.",
        },
      ],

      faq: [
        {
          q: "אפשר להפסיד?",
          a: "לא. אין שעון, אין חיים ואין מהלך שנגמר רע. הליכה עקומה עדיין מסתיימת במאורה, היא פשוט לא נספרת כמושלמת.",
        },
        {
          q: "אפשר לבחור באיזו דרך העכבר הולך?",
          a: "כן. החצים מזיזים אותו משבצת אחת בכל פעם, אז המסלול כולו שלכם. רוצים לעקוף גדר, פשוט מנווטים סביבה צעד אחרי צעד.",
        },
        {
          q: "מה זה מבוך מושלם?",
          a: "מבוך שנסגר במספר הצעדים המינימלי שהוא מאפשר. את המינימום הזה חישבנו לכל לוח מראש מול כל סדר אפשרי של הפירורים, אז הוא באמת המינימום.",
        },
        {
          q: "כמה צעדים לוקח מבוך?",
          a: "הדרך הקצרה היא 13.58 צעדים בלוח הקטן, 24.41 בבינוני ו-39.53 בגדול, בממוצע על 20,000 חלוקות. עכבר שהולך לפירור הקרוב תמיד מסיים ב-43.91 בגדול.",
        },
        {
          q: "הלוח הקטן קל מדי?",
          a: "כן, בכוונה. תשע מכל עשר סמטאות ללא מוצא נפתחות שם, ובעשירית מהחלוקות כל סדר עולה אותו דבר. הוא נבנה לבן שלוש, לא לבן שמונה.",
        },
        {
          q: "יש כפתור ביטול?",
          a: "אין, וגם אין צורך. אף מהלך לא יכול להרוס מבוך, לכל היותר להאריך אותו. כפתור ההתחלה מחדש מחלק לוח חדש מתי שרוצים.",
        },
        {
          q: "צריך לדעת לקרוא?",
          a: "לא. עכבר, גבינה ובית, וזה כל אוצר המילים. השורה שמתחת ללוח מראה כמה פירורים נשארו כפירורים ולא כמספר.",
        },
        { q: "המשחק חינמי?", a: "כן. בלי תשלום, בלי רכישות בתוך המשחק, ובלי גרסה מורחבת שעולה כסף." },
        { q: "יש פרסומות?", a: "אין. שום באנר ושום סרטון בין מבוכים." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. זה רץ בדפדפן, ואחרי ביקור אחד הוא נשמר במכשיר ועובד גם בלי קליטה.",
        },
        {
          q: "איך השיא נמדד?",
          a: "ברצף המבוכים המושלמים שנסגרו אחד אחרי השני, בנפרד לכל גודל לוח. מבוך אחד עקום מאפס את הרצף ולא לוקח כלום אחר.",
        },
      ],

      keywords: ["מבוך", "עכבר", "תכנון", "מסלול", "לגיל הרך", "בלי שעון"],
    },

    en: {
      name: "Way Home",
      metaTitle: "Way Home - Free Maze Game for Kids | Ellaz",
      metaDescription:
        "A free maze game in your browser. Steer the mouse with the arrows, one square per press, collecting crumbs as it goes. No timer, no lives, nothing to lose.",

      lede: "A free maze game that runs in your browser. There is a mouse, a few crumbs and a burrow, with hedges in between. Steer the mouse through the hedges with the arrows, one square at a time, picking up whatever it passes. Collect them all, get home, and the next maze arrives on its own.",

      body: [
        "Nothing moves until a child presses an arrow. Nothing here can go wrong. Walk a silly route and the maze still ends at the burrow, it is simply not a perfect one, and only perfect runs feed the record.",

        "Which leaves exactly one thing worth being good at: the order. We dealt 20,000 fresh mazes at each board size and compared every deal against its own shortest possible run, brute-forced over every order of the crumbs. Walking to the nearest crumb first, which is the move everybody makes, matched that shortest run on 92.7% of the small boards and on only 68.6% of the big ones. Take them in reading order instead and it falls to 44.6%. And on the big board the worst order of the same four crumbs costs 84.35 steps against a shortest run of 39.53, so deciding is worth more than the entire walk.",

        "The arrows move the mouse one square per press. You steer the whole way. The route is yours. Nothing at all is held down.",

        "Now the part worth knowing before you hand it over. The small board is barely a maze. It is carved properly and then nine out of every ten dead ends are opened back up again, which leaves about a third of one dead end on an average deal, and in one deal out of ten every order of the crumbs costs exactly the same number of steps. That board is a garden with hedges in it, and it is meant to be. A three-year-old needs precisely that. An eight-year-old will be done with it inside a minute, so do not start them there.",
      ],

      howToPlay: [
        { title: "Pick a board", body: "Five by five with two crumbs, six by six with three, or seven by seven with four." },
        { title: "Look at all of it", body: "Everything is visible from the first frame. Nothing is hidden, so nothing has to be hunted." },
        { title: "Steer with the arrows", body: "Each press moves the mouse one square, and never once through a hedge." },
        { title: "Collect on the way", body: "Any crumb the mouse walks onto is picked up, whether or not you were aiming at it." },
        { title: "Head for the burrow", body: "Once the crumbs are gone, walking onto the burrow closes the maze and the next one deals itself." },
      ],

      tips: [
        {
          title: "The nearest crumb is not always first",
          body: "It is the obvious move and it misses the shortest run on roughly a third of the big boards. Look at where the second crumb sits before you set off for the first.",
        },
        {
          title: "Find the burrow early",
          body: "Every run ends there, so a crumb lying in that direction is nearly free. One in the opposite direction wants collecting while you are still out that way.",
        },
        {
          title: "Two crumbs, one walk",
          body: "Crumbs on the same corridor come home on one straight walk. Before you take the near one, check whether the far one is straight past it.",
        },
        {
          title: "Watch the lit trail",
          body: "The route stays lit for a moment after each step. That is where a detour becomes visible, and it teaches more than anything else on the screen.",
        },
      ],

      teaches: [
        {
          title: "Ordering a job",
          body: "Four crumbs is 24 possible orders and most of them are longer. That is about as much choice as fits in a head.",
        },
        {
          title: "Reading a space",
          body: "Before the step you have to see that a route exists. Small-scale map reading, with no words in it.",
        },
        {
          title: "Pausing before acting",
          body: "Nothing moves until you press an arrow, so a second of thought changes the result immediately. That is rare in a game children actually like.",
        },
        {
          title: "Living with imperfect",
          body: "A wandering maze finishes exactly like a tidy one. Nobody is punished, and the next deal is right there.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "The small board. Two crumbs, few hedges, and nearly every step moves something along." },
        { title: "5 to 6", body: "Six by six with three crumbs. The shortest run averages 24.41 steps, which is where order starts to pay." },
        { title: "7 and up", body: "The big board: four crumbs, close to six dead ends per deal, and a perfect run that wants the whole board read." },
        { title: "Grown-ups", body: "Go for a streak of perfect runs. Our nearest-crumb bot manages 68.6%, which is a fair thing to measure yourself against." },
      ],

      accessibility:
        "The arrows are big single-tap targets, not a gesture that has to be held, and each press moves the mouse one square. Arrow keys work too. There is no clock and no countdown, so you can stop and think for as long as you like. The squares are large: on the biggest board they come out around 49 pixels on a 390 pixel phone, and a good deal larger on the small one. Every square is labelled with what is standing on it plus its own column and row, so a screen reader can tell forty-nine of them apart instead of reading the same thing forty-nine times. The whole game plays in silence without losing any information.",

      together: [
        {
          title: "Point before you go",
          body: "Ask which crumb goes first, then let them steer. A small child answers that with a finger, and that is already a plan.",
        },
        {
          title: "One maze each",
          body: "Take turns, a whole maze at a time, and count how many came out perfect. No clock, so nobody is hurried.",
        },
        {
          title: "Guess the number",
          body: "Before you start, guess how many steps it will take. Compare it with the counter afterwards.",
        },
        {
          title: "Say where it has been",
          body: "The mouse remembers nothing, so the story is yours. Who lives in the burrow, who dropped the crumbs, and why.",
        },
      ],

      faq: [
        {
          q: "Can you lose?",
          a: "No. There is no clock, no lives and no move that ends badly. A wandering walk still finishes at the burrow, it just does not count as perfect.",
        },
        {
          q: "Can I choose which way the mouse goes?",
          a: "Yes. The arrows move it one square at a time, so the whole route is yours. To go around a hedge, just steer the mouse around it step by step.",
        },
        {
          q: "What counts as a perfect maze?",
          a: "One finished in the fewest steps that maze allows. We work that minimum out per deal against every possible order of the crumbs, so it really is the minimum.",
        },
        {
          q: "How many steps does a maze take?",
          a: "The shortest run averages 13.58 steps on the small board, 24.41 on the middle one and 39.53 on the big one, over 20,000 deals. A mouse that always heads for the nearest crumb finishes the big one in 43.91.",
        },
        {
          q: "Is the small board too easy?",
          a: "Yes, deliberately. Nine in ten of its dead ends are opened back up, and in a tenth of deals every order costs the same. It was built for a three-year-old rather than an eight-year-old.",
        },
        {
          q: "Is there an undo button?",
          a: "No, and none is needed. No move can ruin a maze, only lengthen it. Restart deals a fresh board whenever you want one.",
        },
        {
          q: "Does a child need to read?",
          a: "Not a word. A mouse, some cheese and a house is the entire vocabulary. The row under the board shows the crumbs left as crumbs rather than as a number.",
        },
        { q: "Is it free?", a: "Yes. No payment, nothing to buy inside the game, and no larger paid edition." },
        { q: "Are there ads?", a: "None. No banners, and nothing playing between mazes." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works with no signal.",
        },
        {
          q: "How is the record measured?",
          a: "By how many perfect mazes were finished in a row, kept separately for each board size. One wandering maze resets the streak and takes nothing else away.",
        },
      ],

      keywords: ["maze game", "mouse", "planning", "pathfinding", "preschool", "no timer"],
    },

    es: {
      name: "El camino a casa",
      metaTitle: "El camino a casa - laberinto gratis | Ellaz",
      metaDescription:
        "Juego de laberinto gratis en el navegador. Guías al ratón entre los setos con las flechas, una casilla por pulsación, recogiendo migas. Sin reloj ni vidas.",

      lede: "Un juego de laberinto gratuito que funciona en el navegador. Hay un ratón, unas migas y una madriguera, con setos en medio. Guías al ratón entre los setos con las flechas, una casilla cada vez, recogiendo lo que pisa. Las juntas todas, llegas a casa y aparece otro laberinto.",

      body: [
        "Aquí no se mueve nada hasta que alguien pulsa una flecha. Y nada puede salir mal.",

        "Un recorrido torpe termina igual en la madriguera; sencillamente no cuenta como perfecto, y solo lo perfecto alimenta el récord. Así que queda una única cosa en la que valga la pena ser bueno: el orden. Repartimos 20.000 laberintos nuevos en cada tamaño de tablero y comparamos cada reparto con su propio recorrido mínimo, calculado a fuerza bruta sobre todos los órdenes posibles de las migas. Ir primero a la miga más cercana, que es lo que hace todo el mundo, coincide con ese mínimo en el 92,7% de los tableros pequeños y solo en el 68,6% de los grandes. Cogerlas en orden de lectura baja al 44,6%.",

        "Y en el tablero grande el peor orden de esas mismas cuatro migas cuesta 84,35 pasos frente a los 39,53 del recorrido mínimo. Decidir vale más que andar.",

        "Las flechas mueven al ratón una casilla por pulsación. Guías tú todo el camino. La ruta es tuya. Nada hay que mantener pulsado.",

        "La parte honesta, mejor saberla antes: el tablero pequeño apenas es un laberinto. Se excava como un laberinto de verdad y luego se le vuelven a abrir nueve de cada diez callejones sin salida, con lo que en un reparto medio queda un tercio de callejón, y en uno de cada diez repartos todos los órdenes cuestan exactamente los mismos pasos. Eso es un jardín con setos, y así se quiso. A un niño de tres años le viene justo eso. Uno de ocho lo agota en un minuto, así que no empecéis ahí.",
      ],

      howToPlay: [
        { title: "Elige tablero", body: "Cinco por cinco con dos migas, seis por seis con tres, o siete por siete con cuatro." },
        { title: "Míralo entero", body: "Todo está a la vista desde el primer momento. No hay nada escondido que buscar." },
        { title: "Guía con las flechas", body: "Cada pulsación mueve al ratón una casilla, y jamás a través de un seto." },
        { title: "Recoge de paso", body: "Cualquier miga que el ratón pise se recoge, aunque no apuntaras a ella." },
        { title: "Vuelve a la madriguera", body: "Cuando ya no quedan migas, llegar a la madriguera cierra el laberinto y aparece el siguiente." },
      ],

      tips: [
        {
          title: "La miga más cercana no siempre va primero",
          body: "Es el movimiento evidente y falla el recorrido mínimo en cerca de un tercio de los tableros grandes. Mira dónde está la segunda antes de salir hacia la primera.",
        },
        {
          title: "Localiza la madriguera",
          body: "Toda partida acaba ahí, así que una miga que caiga en esa dirección sale casi gratis. La que está al otro lado conviene recogerla mientras andas por allí.",
        },
        {
          title: "Dos migas, un paseo",
          body: "Dos migas en el mismo pasillo caen en un solo paseo recto. Antes de coger la cercana, comprueba si la lejana está justo detrás.",
        },
        {
          title: "Mira el rastro",
          body: "El recorrido se queda iluminado un momento después de cada paso. Ahí se ve el rodeo, y eso enseña más que ninguna otra cosa de la pantalla.",
        },
      ],

      teaches: [
        {
          title: "Ordenar una tarea",
          body: "Cuatro migas son 24 órdenes posibles y casi todos salen más largos. Es justo la cantidad de elección que cabe en la cabeza.",
        },
        {
          title: "Leer un espacio",
          body: "Antes de moverte hay que ver que el camino existe. Lectura de mapa en pequeño, sin una sola palabra.",
        },
        {
          title: "Parar antes de actuar",
          body: "Nada se mueve hasta que pulsas una flecha, así que un segundo de reflexión cambia el resultado en el acto.",
        },
        {
          title: "Convivir con lo imperfecto",
          body: "Un laberinto torcido acaba igual que uno limpio. Nadie recibe un castigo, y el siguiente ya está ahí.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "El tablero pequeño. Dos migas, pocos setos, y casi cualquier paso adelanta algo." },
        { title: "5 a 6", body: "Seis por seis con tres migas. El recorrido mínimo ronda los 24,41 pasos y el orden ya se nota." },
        { title: "7 en adelante", body: "El tablero grande: cuatro migas, casi seis callejones sin salida por reparto y una partida perfecta que pide leerlo todo." },
        { title: "Adultos", body: "Id a por una racha de perfectos. Nuestro robot de la miga cercana se queda en el 68,6%." },
      ],

      accessibility:
        "Las flechas son botones grandes de una sola pulsación, no un gesto que haya que mantener, y cada pulsación mueve al ratón una casilla. También valen las teclas de flecha. No hay reloj ni cuenta atrás, así que se puede parar a pensar el rato que haga falta. Las casillas son grandes: en el tablero mayor salen a unos 49 píxeles en un teléfono de 390 píxeles, y bastante más en el pequeño. Cada casilla lleva en la etiqueta lo que hay encima más su columna y su fila, así que un lector de pantalla distingue las cuarenta y nueve en vez de repetir lo mismo cuarenta y nueve veces. Se juega entero en silencio sin perderse información.",

      together: [
        {
          title: "Señalad antes de ir",
          body: "Preguntad qué miga va primero y dejad guiar después. Un niño pequeño responde con el dedo, y eso ya es un plan.",
        },
        {
          title: "Un laberinto cada uno",
          body: "Por turnos, un laberinto entero cada vez, y contad cuántos salieron perfectos. Como no hay reloj, nadie corre.",
        },
        {
          title: "Adivinad los pasos",
          body: "Antes de empezar, adivinad cuántos pasos hará falta. Luego lo comparáis con el contador.",
        },
        {
          title: "Contad dónde ha estado",
          body: "El ratón no recuerda nada, así que la historia es vuestra. Quién vive en la madriguera y quién dejó las migas.",
        },
      ],

      faq: [
        {
          q: "¿Se puede perder?",
          a: "No. Ni reloj, ni vidas, ni un movimiento que acabe mal. Un paseo torpe termina igualmente en la madriguera, solo que no cuenta como perfecto.",
        },
        {
          q: "¿Puedo elegir por dónde va el ratón?",
          a: "Sí. Las flechas lo mueven una casilla cada vez, así que la ruta entera es tuya. Para rodear un seto, lo guías a su alrededor paso a paso.",
        },
        {
          q: "¿Qué es un laberinto perfecto?",
          a: "Uno terminado en los menos pasos que ese laberinto permite. Ese mínimo se calcula por reparto contra todos los órdenes posibles de las migas, así que es el mínimo de verdad.",
        },
        {
          q: "¿Cuántos pasos lleva un laberinto?",
          a: "El recorrido mínimo es de 13,58 pasos en el tablero pequeño, 24,41 en el mediano y 39,53 en el grande, de media sobre 20.000 repartos. Un ratón que va siempre a la miga más cercana termina el grande en 43,91.",
        },
        {
          q: "¿El tablero pequeño es demasiado fácil?",
          a: "Sí, a propósito. Nueve de cada diez callejones sin salida se le abren, y en un décimo de los repartos cualquier orden cuesta lo mismo. Está hecho para tres años, no para ocho.",
        },
        {
          q: "¿Hay botón de deshacer?",
          a: "No, y no hace falta. Ningún movimiento estropea un laberinto, como mucho lo alarga. Reiniciar reparte un tablero nuevo cuando quieras.",
        },
        {
          q: "¿Hace falta saber leer?",
          a: "Ni una palabra. Un ratón, un queso y una casa: ese es todo el vocabulario. La fila de debajo enseña las migas que faltan como migas y no como número.",
        },
        { q: "¿Es gratis?", a: "Sí. Sin pagos, sin compras dentro del juego y sin una edición de pago más grande." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada entre laberinto y laberinto." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, tras una visita, queda guardado en el aparato y va sin cobertura.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por cuántos laberintos perfectos se cerraron seguidos, guardado aparte para cada tamaño de tablero. Uno torcido pone la racha a cero y no quita nada más.",
        },
      ],

      keywords: ["laberinto", "ratón", "planificar", "ruta", "infantil", "sin reloj"],
    },
  },

  provenance: [
    {
      claim: "20,000 fresh mazes dealt per board size",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim:
        "going to the nearest crumb first matches the shortest possible run on 92.7% of small boards and 68.6% of big ones",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim: "collecting the crumbs in reading order matches the shortest run on 44.6% of big boards",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim:
        "on the big board the worst order costs 84.35 steps against a shortest run of 39.53, and a nearest-crumb mouse walks 43.91",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim: "the shortest run averages 13.58 steps on the small board and 24.41 on the middle one",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim:
        "nine in ten dead ends are opened back up on the small board, leaving 0.35 of one per deal, and 10.3% of its deals cost the same in any order",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim: "the big board averages 5.92 dead ends per deal",
      source: "scripts/sim/maze-routes.mjs",
    },
    {
      claim: "five by five with two crumbs, six by six with three, seven by seven with four",
      source: "src/games/maze/logic.ts",
    },
    {
      claim: "four crumbs is 24 possible orders, and par is brute-forced over all of them",
      source: "src/games/maze/logic.ts",
    },
    {
      claim: "squares are about 49 pixels on a 390 pixel phone, each labelled by contents, column and row",
      source: "src/games/maze/MazeGame.tsx",
    },
    {
      claim: "the record is a streak of perfect mazes, in points, scoped per board size",
      source: "src/sdk/score.ts",
    },
  ],
};
