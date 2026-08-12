import type { GameContent } from "../types";

/**
 * The reaction game, and the page whose statistic quantifies a design claim.
 *
 * "Harder means less guessable, not longer" is easy to assert. The measurable
 * version: if a child stops watching and taps at a fixed moment, the best fixed
 * moment is the middle of the band and their average error is a quarter of its
 * width. That error grows 2.4x from easy to hard while the average wait grows
 * only 1.7x, which is the ladder in one number.
 * `scripts/sim/reaction-wait.mjs` derives it twice, from the arithmetic and from
 * sampling the real code, and refuses to publish if the two disagree.
 */
export const reaction: GameContent = {
  id: "reaction",

  copy: {
    he: {
      metaTitle: "אור ירוק - מבחן זמן תגובה לילדים | Ellaz",
      metaDescription:
        "משחק זמן תגובה חינם לילדים. מחכים לאור הירוק ונוגעים מהר. נגיעה מוקדמת לא נחשבת הפסד. בלי הרשמה.",

      lede: "משחק זמן תגובה חינם. אור אדום דולק לזמן שאי אפשר לנחש, ואז הופך לירוק, ונוגעים מהר ככל האפשר. נגיעה מוקדמת מדי פשוט מתחילה את ההמתנה מחדש.",

      body: [
        "אור אדום. מחכים. הוא הופך לירוק, ונוגעים.",

        "וההמתנה חייבת להיות בלתי צפויה, אחרת המספר שיוצא הוא לא זמן תגובה אלא ציון על ניחוש. אז כמה שווה לנחש כאן? מדדנו. אם ילד מפסיק להסתכל ופשוט נוגע ברגע קבוע, הרגע הטוב ביותר שהוא יכול לבחור הוא אמצע הטווח, והוא יפספס אותו בממוצע ב-400 אלפיות שנייה ברמה הקלה, ב-675 בבינונית וב-951 בקשה. זה כמעט שנייה שלמה של טעות, וזמן תגובה אמיתי הוא חצי שנייה. הניחוש פשוט לא משתלם.",

        "בגלל זה הרמות פה מתרחבות במקום להתארך. הטווח הקל הוא שנייה עד 2.6 שניות, והקשה שנייה ורבע עד חמש. ההמתנה הממוצעת גדלה פי 1.72 בלבד בין שתיהן, אבל רוחב הטווח גדל פי 2.38. המיומנות שמתאמנת היא לעמוד בלי לזוז מול חוסר ודאות, ולא לשבת יותר זמן.",

        "נגיעה לפני הירוק היא לא הפסד. האור פשוט אומר עדיין לא ומתחיל המתנה חדשה, ואין במשחק הזה שלב של כישלון להגיע אליו. ההמתנה החדשה גם לא יכולה להיות קצרצרה, כדי שילד שמקיש בלי הפסקה לא יקבל בטעות מספר שנראה כמו תגובה מהירה.",

        "כל תוצאה היא שבח. מתחת ל-350 אלפיות שנייה זה ברק, מתחת ל-550 מהיר ומתחת ל-900 טוב, וכל השאר יציב. אין דירוג של איטי מדי, כי תגובה של ילד בן חמש רחוקה מאוד מרבע שנייה של מבוגר, ואין שום סיבה לספר לו על זה.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. משתנה כמה קשה לנחש מתי זה יקרה." },
        { title: "מתחילים", body: "האור נדלק באדום ומתחילה המתנה שאי אפשר לחזות." },
        { title: "מחכים", body: "לא נוגעים. נגיעה מוקדמת מתחילה המתנה חדשה ולא עולה כלום." },
        { title: "נוגעים על ירוק", body: "מהר ככל האפשר. המסך מראה בכמה אלפיות שנייה הגבתם." },
      ],

      tips: [
        {
          title: "להסתכל, לא לספור",
          body: "ספירה בראש נראית כמו תכנון והיא בדיוק מה שהמשחק מנטרל. הניחוש הטוב ביותר מפספס בכמעט שנייה בקשה.",
        },
        {
          title: "אצבע קרובה למסך",
          body: "המרחק שהיד עוברת הוא חלק מהזמן. אצבע שמרחפת מעל המסך חוסכת עשרות אלפיות.",
        },
        {
          title: "להירגע בין ניסיונות",
          body: "כתף מתוחה מאטה תגובה. שני ניסיונות רצופים אחרי מנוחה קצרה טובים משישה ברצף.",
        },
        {
          title: "להתחיל בקלה",
          body: "טווח צר יותר פירושו פחות זמן להתפזר בו. אחרי כמה ניסיונות שם, הקשה מרגישה הגיונית.",
        },
      ],

      teaches: [
        {
          title: "לעכב תגובה",
          body: "רוב המשחק הוא לא לזוז. זו שליטה עצמית, והיא מתאמנת בדיוק כמו מהירות.",
        },
        { title: "קשב מתמשך", body: "חמש שניות של מבט על מסך שלא משתנה זה הרבה, וזה מתארך עם הגיל." },
        { title: "להבין מדידה", body: "המספר על המסך הוא זמן אמיתי באלפיות שנייה, וילדים אוהבים לנסות לשפר אותו." },
        {
          title: "שטעות לא עולה",
          body: "נגיעה מוקדמת לא מענישה, אז ילד לומד לנסות שוב במקום להיזהר יותר מדי.",
        },
      ],

      ages: [
        { title: "4 עד 5", body: "רמה קלה. חמש שניות של המתנה זה הרבה בגיל הזה, והטווח הצר עוזר." },
        { title: "6 עד 8", body: "בינונית. פה מתחילים באמת לנסות לשפר את המספר." },
        { title: "9 ומעלה", body: "קשה, עם הטווח הרחב ביותר." },
        {
          title: "מבוגרים",
          body: "תגובה חזותית פשוטה של מבוגר היא בערך 250 אלפיות שנייה. מתחת ל-350 נחשב ברק גם כאן.",
        },
      ],

      accessibility:
        "נגיעה אחת בכל מקום על המסך, בלי גרירה ובלי צורך לפגוע במטרה קטנה. האור נבדל בצורה ובמיקום ולא רק בגוון, אז עיוורון צבעים לא מפריע לדעת מתי להגיב. אין הבהובים מהירים ואין רעש הכרחי, והמעבר לירוק הוא שינוי אחד ולא הבזק. נגיעה מוקדמת לא מייצרת צליל של טעות. אין הגבלת זמן על התגובה עצמה, וכל תוצאה מקבלת מילה טובה.",

      together: [
        { title: "שניים בתורות", body: "עשרה ניסיונות כל אחד והשוו ממוצע. הכי הוגן זה ממוצע ולא הכי מהיר." },
        {
          title: "ילד מול מבוגר",
          body: "המבוגר כמעט תמיד מהיר יותר, אז שחקו על מי משתפר יותר לאורך עשרה ניסיונות.",
        },
        { title: "בלי להסתכל על היד", body: "עיניים רק על האור. פתאום מבינים כמה מסתכלים על האצבע." },
        {
          title: "לנחש לפני",
          body: "לפני כל ניסיון, נחשו כמה זמן האדום יידלק. אף אחד לא מדייק, וזו כל הנקודה.",
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
          q: "מה קורה אם נוגעים לפני הירוק?",
          a: "האור אומר עדיין לא ומתחיל המתנה חדשה. אין ניקוד שיורד ואין שלב של כישלון במשחק הזה בכלל.",
        },
        {
          q: "אפשר לנחש מתי האור יתחלף?",
          a: "לא בכדאיות. אם תנחשו ברגע הטוב ביותר האפשרי, תפספסו בממוצע ב-400 אלפיות שנייה ברמה הקלה וב-951 בקשה. תגובה אמיתית מהירה יותר מזה.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "מה זמן תגובה טוב לילד?",
          a: "מבוגר מגיע לכ-250 אלפיות שנייה בתגובה חזותית פשוטה, וילד בן חמש רחוק מזה. במשחק כל תוצאה מקבלת שבח, ומתחת ל-900 כבר נחשב טוב.",
        },
        {
          q: "מה ההבדל בין הרמות?",
          a: "רוחב טווח ההמתנה. הקלה היא שנייה עד 2.6 שניות והקשה שנייה ורבע עד חמש. הממוצע גדל פי 1.72 בלבד ורוחב הטווח פי 2.38, כי המיומנות היא לעמוד מול אי ודאות.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "מארבע בערך, ברמה הקלה. אין קריאה בשום מקום וצריך רק לחכות ולגעת.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["זמן תגובה", "אור ירוק", "מהירות", "ריכוז", "משחק לילדים", "רפלקסים"],
    },

    en: {
      metaTitle: "Green Light - Free Reaction Time Test for Kids | Ellaz",
      metaDescription:
        "A free reaction time game for children. Wait for green, then tap fast. Tapping early is never a loss. No download, no signup.",

      lede: "A free reaction time game. A red light stays on for a length of time you cannot predict, turns green, and you tap as fast as you can. Tapping too early simply restarts the wait.",

      body: [
        "Red light. You wait. It turns green, and you tap.",

        "The wait has to be unpredictable or the number that comes out is not a reaction time, it is a score for guessing well. So what is guessing actually worth here? We measured it. If a child stops watching and taps at a fixed moment, the best fixed moment available is the middle of the band, and they will miss it by an average of 400 milliseconds on easy, 675 on medium and 951 on hard. That last one is nearly a full second of error against a real reaction of about half a second. Guessing does not pay.",

        "Which is why the levels widen rather than lengthen. The easy band runs from one second to 2.6, and the hard band from 1.2 to five. The average wait grows only 1.72 times between them while the width of the band grows 2.38 times. The skill being trained is holding still through uncertainty, not sitting for longer.",

        "Tapping before green is not a loss. The light says not yet and starts a fresh wait, and there is no failure state in this game to arrive at. The fresh wait also cannot be very short, so a child mashing the screen cannot accidentally land a tap that gets recorded as a fast reaction.",

        "Every result is praise. Under 350 milliseconds is lightning, under 550 is quick, under 900 is good, and everything else is steady. There is no rating for too slow, because a five-year-old's reaction is nowhere near an adult's quarter of a second and there is no reason to tell them so.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. What changes is how hard the moment is to predict." },
        { title: "Start", body: "The light goes red and an unpredictable wait begins." },
        { title: "Wait", body: "Do not tap. An early tap starts a fresh wait and costs nothing." },
        { title: "Tap on green", body: "As fast as you can. The screen shows your time in milliseconds." },
      ],

      tips: [
        {
          title: "Watch, do not count",
          body: "Counting in your head feels like planning and is exactly what the game neutralises. The best possible guess misses by almost a second on hard.",
        },
        {
          title: "Keep your finger close",
          body: "The distance your hand travels is part of the time. A finger hovering above the screen saves tens of milliseconds.",
        },
        {
          title: "Relax between attempts",
          body: "A tense shoulder slows a reaction down. Two attempts after a short rest beat six in a row.",
        },
        {
          title: "Start on easy",
          body: "A narrower band gives your attention less room to wander. After a few there, hard makes sense.",
        },
      ],

      teaches: [
        {
          title: "Withholding a response",
          body: "Most of this game is not moving. That is self control, and it trains exactly like speed does.",
        },
        { title: "Sustained attention", body: "Five seconds watching a screen that does not change is a long time, and it stretches with age." },
        { title: "Understanding measurement", body: "The number is a real time in milliseconds, and children enjoy trying to improve it." },
        {
          title: "That mistakes are free",
          body: "An early tap is not punished, so a child learns to try again rather than to become overly careful.",
        },
      ],

      ages: [
        { title: "4 to 5", body: "Easy. Five seconds of waiting is a lot at this age, and the narrow band helps." },
        { title: "6 to 8", body: "Medium. This is where improving the number becomes the point." },
        { title: "9 and up", body: "Hard, with the widest band." },
        {
          title: "Adults",
          body: "An adult's simple visual reaction is around 250 milliseconds. Under 350 counts as lightning here too.",
        },
      ],

      accessibility:
        "One tap anywhere on the screen, with no dragging and no small target to hit. The light differs by shape and position as well as hue, so colour blindness does not affect knowing when to respond. Nothing flashes quickly, no sound is required, and the change to green is a single transition rather than a flicker. An early tap produces no error sound. There is no time limit on the response itself, and every result gets a kind word.",

      together: [
        { title: "Take turns", body: "Ten attempts each and compare averages. An average is fairer than a best." },
        {
          title: "Child against adult",
          body: "The adult almost always wins, so play for who improves most across ten attempts instead.",
        },
        { title: "No looking at your hand", body: "Eyes on the light only. You find out how much you were watching your finger." },
        {
          title: "Guess the wait",
          body: "Before each attempt, guess how long the red will last. Nobody is close, which is the whole point.",
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
          q: "What happens if my child taps before green?",
          a: "The light says not yet and starts a fresh wait. No score drops, and this game has no failure state at all.",
        },
        {
          q: "Can you predict when the light will change?",
          a: "Not usefully. Guessing at the best possible moment still misses by an average of 400 milliseconds on easy and 951 on hard. A real reaction is faster than that.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "What is a good reaction time for a child?",
          a: "An adult reaches about 250 milliseconds on a simple visual reaction and a five-year-old is a long way from that. Every result here is praised, and under 900 already counts as good.",
        },
        {
          q: "What is the difference between the levels?",
          a: "The width of the wait band. Easy runs one second to 2.6 and hard runs 1.2 to five. The average only grows 1.72 times while the width grows 2.38 times, because the skill is standing still through uncertainty.",
        },
        {
          q: "What age is this for?",
          a: "From about four on easy. There is no reading anywhere and the only requirement is waiting and then touching.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["reaction time", "green light", "reflexes", "speed", "kids game", "attention"],
    },
    es: {
      metaTitle: "Luz verde - test de reflejos gratis para niños | Ellaz",
      metaDescription:
        "Juego gratis de tiempo de reacción para niños. Espera al verde y toca rápido. Tocar antes nunca es perder. Sin descargas ni registro.",

      lede: "Un juego de tiempo de reacción gratuito. Una luz roja se queda encendida durante un rato que no puedes predecir, se pone verde, y tocas lo más rápido que puedas. Tocar antes de tiempo simplemente reinicia la espera.",

      body: [
        "Luz roja. Esperas. Se pone verde y tocas.",

        "La espera tiene que ser impredecible o el número que sale no es un tiempo de reacción, es una nota por adivinar bien. ¿Y cuánto vale adivinar exactamente? Lo medimos. Si un niño deja de mirar y toca en un momento fijo, el mejor momento fijo disponible es el centro de la banda, y va a fallarlo por 400 milisegundos de media en fácil, 675 en medio y 951 en difícil. Ese último es casi un segundo entero de error contra una reacción real de medio segundo. Adivinar no compensa.",

        "Por eso los niveles se ensanchan en lugar de alargarse. La banda del fácil va de un segundo a 2,6, y la del difícil de 1,2 a cinco. La espera media solo crece 1,72 veces entre las dos mientras la anchura de la banda crece 2,38 veces. La habilidad que se entrena es aguantar quieto dentro de la incertidumbre, y no estar sentado más rato.",

        "Tocar antes del verde no es perder. La luz dice todavía no y arranca una espera nueva, y en este juego no hay ningún estado de fracaso al que llegar. La espera nueva tampoco puede ser muy corta, así que un niño aporreando la pantalla no puede colar sin querer un toque que quede registrado como una reacción rápida.",

        "Todos los resultados son elogios. Por debajo de 350 milisegundos es un rayo, por debajo de 550 es rápido, por debajo de 900 es bueno, y todo lo demás es constante. No hay ninguna categoría para demasiado lento, porque la reacción de un niño de cinco años no se parece al cuarto de segundo de un adulto y no hay motivo para decírselo.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, medio o difícil. Lo que cambia es lo difícil que es predecir el momento." },
        { title: "Empieza", body: "La luz se pone roja y arranca una espera impredecible." },
        { title: "Espera", body: "No toques. Un toque temprano arranca otra espera y no cuesta nada." },
        { title: "Toca en verde", body: "Lo más rápido que puedas. La pantalla enseña tu tiempo en milisegundos." },
      ],

      tips: [
        {
          title: "Mira, no cuentes",
          body: "Contar mentalmente parece que es planificar y es justo lo que el juego neutraliza. La mejor conjetura posible falla por casi un segundo en difícil.",
        },
        {
          title: "Ten el dedo cerca",
          body: "La distancia que recorre tu mano forma parte del tiempo. Un dedo flotando encima de la pantalla ahorra decenas de milisegundos.",
        },
        {
          title: "Relájate entre intentos",
          body: "Un hombro tenso frena la reacción. Dos intentos tras un descanso corto valen más que seis seguidos.",
        },
        {
          title: "Empieza en fácil",
          body: "Una banda más estrecha le da menos margen a la atención para irse. Después de unos cuantos ahí, el difícil tiene sentido.",
        },
      ],

      teaches: [
        {
          title: "Contener una respuesta",
          body: "Casi todo este juego consiste en no moverse. Eso es autocontrol, y se entrena exactamente igual que la velocidad.",
        },
        { title: "Atención sostenida", body: "Cinco segundos mirando una pantalla que no cambia son mucho rato, y se estiran con la edad." },
        { title: "Entender una medida", body: "El número es un tiempo real en milisegundos, y a los niños les gusta intentar mejorarlo." },
        {
          title: "Que los errores salen gratis",
          body: "Un toque temprano no se castiga, así que un niño aprende a volver a intentarlo en vez de volverse excesivamente prudente.",
        },
      ],

      ages: [
        { title: "4 a 5", body: "Fácil. Cinco segundos esperando son muchos a esta edad, y la banda estrecha ayuda." },
        { title: "6 a 8", body: "Medio. Aquí es donde mejorar el número se convierte en el objetivo." },
        { title: "9 en adelante", body: "Difícil, con la banda más ancha." },
        {
          title: "Adultos",
          body: "La reacción visual simple de un adulto ronda los 250 milisegundos. Bajar de 350 cuenta como un rayo también aquí.",
        },
      ],

      accessibility:
        "Un toque en cualquier punto de la pantalla, sin arrastrar y sin ningún objetivo pequeño al que acertar. La luz se distingue por forma y posición además de por tono, así que el daltonismo no afecta a saber cuándo responder. Nada parpadea deprisa, no hace falta ningún sonido, y el cambio a verde es una transición única y no un titileo. Un toque temprano no produce ningún sonido de error. No hay límite de tiempo sobre la respuesta en sí, y todos los resultados reciben una palabra amable.",

      together: [
        { title: "Por turnos", body: "Diez intentos cada uno y comparad medias. Una media es más justa que un mejor tiempo." },
        {
          title: "Niño contra adulto",
          body: "El adulto gana casi siempre, así que jugad mejor a quién mejora más a lo largo de diez intentos.",
        },
        { title: "Sin mirarse la mano", body: "Los ojos solo en la luz. Descubrís cuánto estabais mirándoos el dedo." },
        {
          title: "Adivina la espera",
          body: "Antes de cada intento, decid cuánto va a durar el rojo. Nadie se acerca, que es justo la gracia.",
        },
      ],

      faq: [
        {
          q: "¿El juego es gratis?",
          a: "Del todo. Nada que pagar y ninguna compra dentro del juego. Todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y no pedimos ningún correo.",
        },
        {
          q: "¿Qué pasa si mi hijo toca antes del verde?",
          a: "La luz dice todavía no y arranca otra espera. No baja ninguna puntuación, y este juego no tiene ningún estado de fracaso.",
        },
        {
          q: "¿Se puede predecir cuándo cambia la luz?",
          a: "No de forma útil. Adivinar en el mejor momento posible sigue fallando por 400 milisegundos de media en fácil y 951 en difícil. Una reacción de verdad es más rápida que eso.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Cuál es un buen tiempo de reacción para un niño?",
          a: "Un adulto llega a unos 250 milisegundos en una reacción visual simple y un niño de cinco años queda muy lejos de eso. Aquí todos los resultados se elogian, y bajar de 900 ya cuenta como bueno.",
        },
        {
          q: "¿En qué se diferencian los niveles?",
          a: "En la anchura de la banda de espera. El fácil va de un segundo a 2,6 y el difícil de 1,2 a cinco. La media solo crece 1,72 veces mientras la anchura crece 2,38, porque la habilidad es aguantar quieto dentro de la incertidumbre.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos cuatro años en fácil. No se lee nada y lo único que hace falta es esperar y después tocar.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["tiempo de reacción", "luz verde", "reflejos", "velocidad", "juego para niños", "atención"],
    },
  },

  provenance: [
    {
      claim: "the best fixed guess is off by 400ms on easy, 675ms on medium and 951ms on hard",
      source: "scripts/sim/reaction-wait.mjs",
    },
    {
      claim: "from easy to hard the average wait grows 1.72x while the band width grows 2.38x",
      source: "scripts/sim/reaction-wait.mjs",
    },
    {
      claim: "wait bands of 1000-2600ms, 1100-3800ms and 1200-5000ms",
      source: "src/games/reaction/logic.ts",
    },
    {
      claim: "praise thresholds at 350ms, 550ms and 900ms, with no rating for too slow",
      source: "src/games/reaction/logic.ts",
    },
  ],
};
