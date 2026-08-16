import type { GameContent } from "../types";

/**
 * Colour sort - the puzzle whose whole selling point is a property of the
 * CONSTRUCTION rather than a promise: `deal` walks backwards from the finished
 * board, so a solution exists by definition and no child is ever handed a lie.
 *
 * The three languages are written, not translated. They open differently, order
 * their sections differently and make different jokes, because a translation
 * carries the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * Every figure here comes from `scripts/sim/sort-tubes.mjs`, which drives the
 * shipped rules over 4,000 dealt boards per level, or from the game's own code.
 * See `provenance` at the bottom.
 */
export const sort: GameContent = {
  id: "sort",

  copy: {
    he: {
      name: "מיון צבעים",
      metaTitle: "מיון צבעים - משחק חשיבה חינם | Ellaz",
      metaDescription:
        "משחק מיון צבעים חינמי בדפדפן. מרימים כדורים ממבחנה אחת ושופכים לשנייה עד שכל צבע לבד. שלוש רמות, החזרה בלי הגבלה, בלי הרשמה.",

      lede: "משחק מיון צבעים חינם, ישר בדפדפן. מרימים את הכדורים העליונים ממבחנה אחת ושופכים אותם לשנייה, עד שבכל מבחנה יושב צבע אחד בלבד. שלוש רמות, בלי שעון, וכל לוח שיוצא לכם פתיר.",

      body: [
        "נוגעים במבחנה והכדורים העליונים באותו צבע עולים ליד. נוגעים במבחנה אחרת והם יורדים לשם. זהו כל המשחק.",

        "הלוח הזה לא מעורבב ואז נבדק, הוא נבנה אחורה. המשחק מתחיל מהלוח הפתור ומתרחק ממנו בצעדים לאחור עד שנגמרים לו הצעדים החוקיים, בממוצע 21.8 ברמה הקלה ו-34.6 בקשה. כל צעד כזה הוא צעד שמהלך חוקי קדימה מבטל, אז המסלול חזרה קיים תמיד. זו תכונה של הבנייה, לא הבטחה שלנו. ואז בדקנו כמה הוא נוח: הרצנו 4,000 לוחות בכל רמה, ובוט ששופך באקראי גמור סיים 99.7 אחוז מהלוחות הקלים. ברמה הקשה אותו בוט נתקע ב-10.2 אחוז מהם, בלי שנשארה לו שפיכה חוקית אחת.",

        "שתי מבחנות ריקות בכל רמה, גם בקלה וגם בקשה. הקושי הוא מספר הצבעים לעקוב אחריהם, ארבעה או שישה או שמונה, ולא כמות מקום התמרון. בוט שמשחק לפי כלל אחד פשוט, לסגור מבחנה כשאפשר ולשפוך על צבע תואם אחרת, מסיים לוח קל ב-11 שפיכות ולוח קשה ב-19.4. כלומר חצי מהשביל שהערבוב עצמו השאיר.",

        "וההודאה, כי היא תחסוך לכם ריב: ברמה הקשה אין רמז ואין כפתור שפותר בשבילכם. כשלוח מסתבך הדרך היחידה אחורה היא כפתור החזרה, שפיכה אחת בכל לחיצה, ולפעמים זה הרבה לחיצות. ילד בן חמש שמתחיל שם ייתקע. תתחילו בקל.",

        "החזרה לא עולה כלום. המונה יורד יחד עם הכדורים, כי מהלך שביטלתם הוא לא מהלך שעשיתם, והשיא נמדד בשפיכות כשפחות זה טוב יותר. הכול נשמר על המכשיר, בלי חשבון ובלי שם.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "ארבעה, שישה או שמונה צבעים. החלפה באמצע מחלקת לוח חדש." },
        { title: "נוגעים במבחנה", body: "כל הכדורים העליונים באותו צבע עולים ליד ביחד." },
        { title: "נוגעים ביעד", body: "מבחנה ריקה, או כזו שהצבע העליון שלה זהה. אחרת שום דבר לא זז." },
        { title: "נתקעתם? חזרה", body: "לחיצה מחזירה שפיכה אחת. אין הגבלה על כמה פעמים." },
        { title: "סוגרים את הלוח", body: "כל מבחנה מלאה בצבע אחד או ריקה לגמרי, וזהו." },
      ],

      tips: [
        {
          title: "מבחנה ריקה היא כסף",
          body: "יש לכם שתיים ואי אפשר לייצר עוד. כדור בודד שהחניתם באחת מהן עולה לכם את כל המרחב שהיא נותנת.",
        },
        {
          title: "תסגרו לפני שתפזרו",
          body: "אם שפיכה משלימה מבחנה לארבעה כדורים באותו צבע, עשו אותה עכשיו. מבחנה סגורה יוצאת מהמשחק ומפסיקה להפריע.",
        },
        {
          title: "תסתכלו מה מתחת",
          body: "לפני ששופכים ריצה שלמה, שאלו איזה צבע ייחשף מתחתיה. זה מה שקובע אם השפיכה פתחה מהלך או סתמה אחד.",
        },
        {
          title: "הכי צפוף קודם",
          body: "מבחנה עם שלושה כדורים מאותו צבע כמעט מוכנה. חפשו את הרביעי לפני שאתם מתחילים פרויקט חדש.",
        },
      ],

      teaches: [
        { title: "תכנון קדימה", body: "כל שפיכה פותחת אפשרות אחת וסוגרת אחרת. אחרי כמה לוחות מתחילים לראות את זה מראש." },
        { title: "מיון לפי תכונה", body: "לאסוף את כל מה שדומה למקום אחד זו מיומנות שהגן קורא לה מיון, וכאן היא עצם המשחק." },
        { title: "לתקן בלי להיבהל", body: "טעות פה לא מסיימת שום דבר. לוחצים חזרה וממשיכים מאותה נקודה." },
        { title: "סבלנות", body: "אין שעון ואין לחץ. לוח שלא זז חמש דקות נשאר בדיוק כמו שהוא." },
      ],

      ages: [
        { title: "4 עד 5", body: "רמה קלה, ארבעה צבעים. בגיל הזה הכיף הוא בשפיכה עצמה, והסידור מגיע אחריה." },
        { title: "6 עד 7", body: "בינונית. שישה צבעים זה הרגע שבו כדאי להסתכל שנייה לפני שנוגעים." },
        { title: "8 ומעלה", body: "קשה. שמונה צבעים ושתי מבחנות פנויות, ופה כבר צריך תוכנית." },
        { title: "מבוגרים", body: "לוח קשה מתחת ל-19 שפיכות זו תוצאה טובה. הבוט שלנו מגיע ל-19.4 בממוצע." },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. המבחנות רחבות בכוונה, לפחות 2 על 2 סנטימטרים בכל מסך. אין שעון ואין ספירה לאחור, אז אפשר לעצור באמצע לחשוב כמה שרוצים. שפיכה שאינה חוקית עונה בניעור עדין ולא בצליל שגיאה, כי סירוב הוא לא נזיפה. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "שפיכה לכל אחד", body: "בתורות. הכלל הזה לבדו הופך את המשחק לשיחה על מה כדאי לעשות עכשיו." },
        {
          title: "תגידו למה",
          body: "לפני שנוגעים, בקשו לשמוע מה ייחשף מתחת. ילד שיודע לענות על זה כבר משחק את המשחק ולא רק נוגע במסך.",
        },
        { title: "לוח בלי החזרה", body: "נסו סיבוב אחד בלי ללחוץ חזרה בכלל. פתאום כל שפיכה נשקלת." },
        { title: "מי בפחות", body: "אותה רמה, שני מכשירים, וסופרים שפיכות. אין שעון אז אף אחד לא ממהר." },
      ],

      faq: [
        {
          q: "כל לוח באמת פתיר?",
          a: "כן, וזה לא בדיקה אלא בנייה. המשחק יוצא מהלוח הפתור ומרחיק אותו ממנו בצעדים שמהלך חוקי קדימה מחזיר, אז המסלול חזרה קיים לפני שהלוח הוצג לכם.",
        },
        {
          q: "מה עושים כשנתקעים?",
          a: "לוחצים חזרה. אין הגבלה על מספר הפעמים, והמונה יורד יחד עם הכדורים, אז החזרה לא עולה לכם בשיא.",
        },
        {
          q: "אפשר להיתקע בלי מוצא?",
          a: "אפשר להגיע למצב בלי אף שפיכה חוקית. בוט ששופך באקראי הגיע לשם ב-10.2 אחוז מהלוחות הקשים ובכ-0.2 אחוז מהקלים. בגלל זה כפתור החזרה בלי הגבלה.",
        },
        {
          q: "כמה שפיכות זו תוצאה טובה?",
          a: "בוט עם כלל אחד פשוט סוגר לוח קל ב-11 שפיכות, בינוני ב-15.5 וקשה ב-19.4. מתחת למספרים האלה אתם משחקים ממש טוב.",
        },
        { q: "המשחק חינמי?", a: "כן, לגמרי. אין תשלום, אין רכישות בתוך המשחק ואין גרסה מורחבת." },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. זה רץ בדפדפן, ואחרי ביקור אחד הוא נשמר במכשיר ועובד גם בלי קליטה.",
        },
        {
          q: "מאיזה גיל מתאים?",
          a: "מארבע בערך, ברמה הקלה. אין במשחק אף מילה לקרוא, אז ילד שעדיין לא קורא משחק לבד.",
        },
        {
          q: "איך השיא נמדד?",
          a: "במספר השפיכות, כשפחות זה טוב יותר, ובנפרד לכל רמה. ארבעה צבעים ושמונה צבעים אינם אותו הישג.",
        },
      ],

      keywords: ["מיון צבעים", "מבחנות", "פאזל", "חשיבה", "לוגיקה", "לגיל הרך"],
    },

    en: {
      name: "Color Sort",
      metaTitle: "Free Color Sort Puzzle - Play Online | Ellaz",
      metaDescription:
        "A free colour sort puzzle in your browser. Lift the top balls from one tube, pour them into another, until each colour sits alone. Unlimited undo.",

      lede: "A free colour sorting puzzle that runs in your browser. Lift the top run of one colour out of a tube, pour it into another, and keep going until every tube holds a single colour. Three levels, unlimited undo, and every board can be finished.",

      body: [
        "Tap a tube. The matching balls on top come into your hand, and the next tube you tap is where they land. Nothing else to learn.",

        "That last claim is the interesting one, so here is how it is kept. The board is never shuffled and then checked for a solution. It is built the other way round: the game starts from the finished board and steps away from it until it runs out of legal backwards steps, 21.8 of them on average on easy and 34.6 on hard. Every one is a step a legal forward pour puts back, so retracing them wins. Solvability is a property of how the board was made rather than something we tested for and hope holds.",

        "Being solvable and being kind are different things. Over 4,000 dealt boards per level, a bot pouring completely at random finished 99.7% of easy boards, and on hard it painted itself into a corner with no legal pour left 10.2% of the time. A bot following one rule instead, close a tube whenever a pour closes one and stack onto a matching colour otherwise, clears easy in 11 pours and hard in 19.4. Eleven is about half the trail the scramble itself left, which tells you how much the wandering costs. Two spare tubes at every level, and you cannot make more.",

        "The admission. There is no hint here, and nothing solves a board for you. When a hard board goes wrong the way back is the undo button, one pour per press, and that can be a lot of pressing. A five-year-old who starts on hard will get stuck and will not know why. Start on easy.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Four, six or eight colours. Switching deals a fresh board." },
        { title: "Tap a tube", body: "Every ball of the same colour on top comes up together." },
        { title: "Tap where it goes", body: "An empty tube, or one showing that colour. Anything else and nothing moves." },
        { title: "Stuck? Undo", body: "One press takes back one pour. There is no limit on how many." },
        { title: "Finish the board", body: "Each tube full of one colour, or empty. That is the whole win condition." },
      ],

      tips: [
        {
          title: "An empty tube is money",
          body: "You get two and you cannot make a third. Parking one lonely ball in one of them spends all the room it was worth.",
        },
        {
          title: "Close before you spread",
          body: "If a pour fills a tube with four of the same colour, make that pour now. A closed tube leaves the puzzle and stops being in the way.",
        },
        {
          title: "Look underneath",
          body: "Before you move a whole run, ask what colour it uncovers. That is what decides whether the pour opened something up or sealed it shut.",
        },
        {
          title: "Crowded first",
          body: "A tube already holding three of one colour is nearly done. Find the fourth ball before you start anything new.",
        },
      ],

      teaches: [
        { title: "Planning ahead", body: "Every pour opens one option and shuts another. After a few boards you start seeing that before you tap." },
        { title: "Sorting by a property", body: "Gathering everything alike into one place is the skill nurseries call sorting. Here it is the entire game." },
        { title: "Fixing a mistake", body: "A wrong pour ends nothing. Press undo and carry on from the same spot." },
        { title: "Patience", body: "No clock, no pressure. A board left alone for five minutes is exactly where you left it." },
      ],

      ages: [
        { title: "4 to 5", body: "Easy, four colours. At this age the pour itself is the fun and the tidying comes second." },
        { title: "6 to 7", body: "Medium. Six colours is where looking before tapping starts to pay." },
        { title: "8 and up", body: "Hard. Eight colours and two spare tubes, which needs an actual plan." },
        { title: "Grown-ups", body: "A hard board under 19 pours is a good run. Our rule-following bot averages 19.4." },
      ],

      accessibility:
        "One tap per action, with no dragging and no press-and-hold, so it works with alternative input devices and with a small hand that does not aim well yet. The tubes are deliberately wide: at least 2 by 2 centimetres on any screen. There is no clock and no countdown, so you can stop and think for as long as you like. A pour that is not allowed answers with a gentle shake rather than an error sound, because a refusal is not a telling-off. The whole thing plays in silence without losing any information.",

      together: [
        { title: "One pour each", body: "Take turns. That single rule turns the board into a conversation about what to do next." },
        {
          title: "Say why",
          body: "Before the tap, ask what colour is going to appear underneath. A child who can answer that is playing the game rather than touching the screen.",
        },
        { title: "A board with no undo", body: "Try one round without pressing undo at all. Suddenly every pour gets weighed." },
        { title: "Fewest pours", body: "Same level, two devices, count the pours. There is no clock, so nobody is rushing." },
      ],

      faq: [
        {
          q: "Is every board really solvable?",
          a: "Yes, and it is built rather than tested. The game starts from a finished board and walks away from it in steps that a legal forward pour reverses, so the route back exists before the board is ever shown to you.",
        },
        {
          q: "What do I do when I get stuck?",
          a: "Press undo. There is no limit on how many times, and the move counter comes back down with the balls, so undoing costs you nothing on the record.",
        },
        {
          q: "Can you reach a dead end?",
          a: "You can reach a position with no legal pour at all. A random-pouring bot got there on 10.2% of hard boards and about 0.2% of easy ones. That is exactly what the unlimited undo is for.",
        },
        {
          q: "How many pours is a good score?",
          a: "A bot following one simple rule closes easy in 11 pours, medium in 15.5 and hard in 19.4. Under those numbers you are playing well.",
        },
        { q: "Is it free?", a: "Completely. No payment, no in-game purchases, and no bigger paid version." },
        { q: "Are there ads?", a: "None. No banners, and nothing that plays between levels." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works with no signal.",
        },
        {
          q: "What age is it for?",
          a: "About four and up on the easy level. There is not a single word to read in the game, so a child who cannot read plays alone.",
        },
        {
          q: "How is the record measured?",
          a: "In pours, where fewer is better, and separately per level. Four colours and eight colours are not the same achievement.",
        },
      ],

      keywords: ["color sort", "ball sort", "tubes", "puzzle", "logic", "preschool"],
    },

    es: {
      name: "Ordenar Colores",
      metaTitle: "Ordenar colores - puzle gratis | Ellaz",
      metaDescription:
        "Puzle de ordenar colores gratis en el navegador. Levantas las bolas de arriba de un tubo y las viertes en otro hasta dejar cada color solo.",

      lede: "Un puzle de ordenar colores, gratis y en el navegador. Levantas las bolas de arriba de un tubo, las viertes en otro y sigues hasta que cada tubo guarda un solo color. Tres niveles, deshacer sin límite, y todos los tableros tienen salida.",

      body: [
        "Tocas un tubo y las bolas del mismo color que están arriba se te quedan en la mano. Tocas otro tubo y caen ahí. Ya está.",

        "Lo de que todos tienen salida conviene explicarlo, porque no es una promesa nuestra. El tablero no se mezcla al azar para después comprobar si se puede resolver. Se construye al revés: el juego parte del tablero terminado y se aleja a pasos hacia atrás hasta quedarse sin pasos legales, 21,8 de media en el fácil y 34,6 en el difícil, y cada uno de ellos es un paso que un movimiento legal hacia delante deshace. Recorrerlos en orden inverso gana la partida. La solución existe antes de que nadie vea el tablero.",

        "Que tenga salida y que sea cómodo son cosas distintas, así que lo medimos. Sobre 4.000 tableros repartidos por nivel, un robot que vierte completamente al azar terminó el 99,7% de los fáciles, y en difícil se quedó sin ningún movimiento legal en el 10,2% de las partidas. Otro robot con una sola regla, cerrar un tubo siempre que pueda y verter sobre un color igual el resto del tiempo, resuelve el fácil en 11 vertidos y el difícil en 19,4.",

        "Dos tubos vacíos en todos los niveles, ni uno más. La dificultad está en cuántos colores hay que seguir, no en el sitio para maniobrar.",

        "Y la parte honesta. Aquí no hay pistas y nada resuelve el tablero por ti. Cuando un tablero difícil se tuerce, la única vuelta atrás es el botón de deshacer, un vertido por pulsación, y a veces son muchas pulsaciones. Un niño de cinco años que empiece ahí se va a atascar. Empezad por el fácil.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Cuatro, seis u ocho colores. Cambiar reparte un tablero nuevo." },
        { title: "Toca un tubo", body: "Suben juntas todas las bolas del mismo color que hay arriba." },
        { title: "Toca el destino", body: "Un tubo vacío, o uno que muestre ese color. Si no, no se mueve nada." },
        { title: "¿Atascado? Deshacer", body: "Una pulsación devuelve un vertido, y no hay límite de veces." },
        { title: "Termina el tablero", body: "Cada tubo lleno de un color, o vacío. No hay más." },
      ],

      tips: [
        {
          title: "Un tubo vacío vale oro",
          body: "Tienes dos y no se pueden fabricar más. Dejar ahí una bola suelta gasta todo el margen que ese tubo te daba.",
        },
        {
          title: "Cierra antes de repartir",
          body: "Si un vertido deja un tubo con cuatro bolas iguales, hazlo ya. Un tubo cerrado sale del puzle y deja de estorbar.",
        },
        {
          title: "Mira lo que hay debajo",
          body: "Antes de mover un grupo entero, pregúntate qué color va a quedar a la vista. Eso decide si el vertido abre una jugada o la cierra.",
        },
        {
          title: "Primero lo apretado",
          body: "Un tubo con tres bolas iguales está casi hecho. Busca la cuarta antes de empezar nada nuevo.",
        },
      ],

      teaches: [
        { title: "Planificar", body: "Cada vertido abre una posibilidad y cierra otra. Después de unos tableros eso se ve antes de tocar." },
        { title: "Clasificar", body: "Juntar en un sitio todo lo que se parece es lo que en infantil llaman clasificar. Aquí es el juego entero." },
        { title: "Arreglar un error", body: "Un vertido equivocado no acaba con nada. Pulsas deshacer y sigues desde el mismo punto." },
        { title: "Paciencia", body: "Ni reloj ni prisa. Un tablero abandonado cinco minutos sigue igual que estaba." },
      ],

      ages: [
        { title: "4 a 5", body: "Fácil, cuatro colores. A esta edad la gracia está en verter, y ordenar viene después." },
        { title: "6 a 7", body: "Medio. Con seis colores empieza a compensar mirar antes de tocar." },
        { title: "8 en adelante", body: "Difícil. Ocho colores y dos tubos libres, que ya pide un plan." },
        { title: "Adultos", body: "Un tablero difícil por debajo de 19 vertidos está bien jugado. Nuestro robot se queda en 19,4." },
      ],

      accessibility:
        "Un toque por acción, sin arrastrar y sin mantener pulsado, así que funciona con dispositivos de entrada alternativos y con una mano pequeña que todavía no apunta bien. Los tubos son anchos a propósito: al menos 2 por 2 centímetros en cualquier pantalla. No hay reloj ni cuenta atrás, de modo que se puede parar a pensar el rato que haga falta. Un vertido que no está permitido responde con una sacudida suave y no con un sonido de error, porque negarse no es una regañina. Se juega entero en silencio sin perderse ninguna información.",

      together: [
        { title: "Un vertido cada uno", body: "Por turnos. Esa regla sola convierte el tablero en una conversación." },
        {
          title: "Di por qué",
          body: "Antes de tocar, preguntad qué color va a aparecer debajo. Un niño que sabe responder eso está jugando y no solo tocando la pantalla.",
        },
        { title: "Una partida sin deshacer", body: "Probad una ronda sin pulsar deshacer. De pronto cada vertido se piensa." },
        { title: "Quién en menos", body: "Mismo nivel, dos aparatos, y a contar vertidos. Como no hay reloj, nadie corre." },
      ],

      faq: [
        {
          q: "¿Todos los tableros tienen solución?",
          a: "Sí, y está construida en vez de comprobada. El juego parte de un tablero terminado y se aleja con pasos que un movimiento legal deshace, así que el camino de vuelta existe antes de que nadie vea el tablero.",
        },
        {
          q: "¿Qué hago si me atasco?",
          a: "Pulsar deshacer. No hay límite de veces, y el contador baja junto con las bolas, así que deshacer no te cuesta nada en el récord.",
        },
        {
          q: "¿Se puede llegar a un callejón sin salida?",
          a: "Se puede llegar a una posición sin ningún vertido legal. Un robot que vierte al azar acabó ahí en el 10,2% de los tableros difíciles y en un 0,2% de los fáciles. Para eso está el deshacer sin límite.",
        },
        {
          q: "¿Cuántos vertidos son un buen resultado?",
          a: "Un robot con una sola regla cierra el fácil en 11 vertidos, el medio en 15,5 y el difícil en 19,4. Por debajo de esas cifras estás jugando muy bien.",
        },
        { q: "¿Es gratis?", a: "Del todo. Ni pagos ni compras dentro del juego, y tampoco hay una versión de pago." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada entre nivel y nivel." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, después de una visita, queda guardado en el aparato y va sin cobertura.",
        },
        {
          q: "¿Para qué edad es?",
          a: "A partir de los cuatro años en el nivel fácil. En el juego no hay ni una palabra que leer, así que un niño que todavía no lee juega solo.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En vertidos, donde menos es mejor, y por separado en cada nivel. Cuatro colores y ocho colores no son el mismo logro.",
        },
      ],

      keywords: ["ordenar colores", "tubos", "puzle", "lógica", "infantil", "clasificar"],
    },
  },

  provenance: [
    {
      claim: "4,000 dealt boards per level; a random-pouring bot finishes 99.7% of easy boards",
      source: "scripts/sim/sort-tubes.mjs",
    },
    {
      claim: "a random-pouring bot reaches a position with no legal pour on 10.2% of hard boards, 0.2% of easy",
      source: "scripts/sim/sort-tubes.mjs",
    },
    {
      claim: "a one-rule bot clears easy in 11 pours, medium in 15.5, hard in 19.4",
      source: "scripts/sim/sort-tubes.mjs",
    },
    {
      claim: "the scramble's own trail back averages 21.8 pours on easy and 34.6 on hard",
      source: "scripts/sim/sort-tubes.mjs",
    },
    {
      claim: "four, six or eight colours with two spare tubes at every level",
      source: "src/games/sort/logic.ts",
    },
    {
      claim: "the record is pours, fewer is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
