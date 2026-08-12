import type { GameContent } from "../types";

/**
 * The size game, where the difficulty is a RATIO rather than a count, and the
 * three levels are three different tasks.
 *
 * The number worth the page: the smallest size gap ever shipped is 1.25x, and
 * the reason that is the floor is a phone screen rather than a taste call. Below
 * it the round stops being fair. Easy runs at 2.5x, which a toddler cannot get
 * wrong by looking.
 */
export const sortsize: GameContent = {
  id: "sortsize",

  copy: {
    he: {
      metaTitle: "גדול וקטן - משחק גדלים לילדים | Ellaz",
      metaDescription:
        "משחק גדלים חינם לילדים. בוחרים את הגדול, מסדרים לפי סדר, וממיינים. שלוש רמות, בלי הרשמה.",

      lede: "משחק חינם לילדים על גודל. ברמה הראשונה בוחרים את הגדול מבין שלושה, אחר כך מסדרים ארבעה לפי הסדר, ובסוף ממיינים שישה. שלוש רמות, שלוש משימות שונות.",

      body: [
        "פיל וחתול ונמלה. איזה מהם הגדול?",

        "המספר שקובע כאן הוא לא כמה פריטים יש אלא כמה הם קרובים. ברמה הקלה כל שני פריטים רחוקים לפחות פי 2.5 בגודל, וילד בן שנתיים לא יכול לטעות בזה במבט. בבינונית הפער יורד לפי 1.6, ובקשה לפי 1.25, שזה הפער הקטן ביותר שאנחנו שולחים. מתחת לזה הסיבוב מפסיק להיות הוגן על מסך טלפון, וזו החלטה של פיזיקה ולא של טעם: שני דברים שנבדלים ב-15% על מסך של שש אינצ'ים הם ניחוש, לא שאלה.",

        "וכל רמה היא משימה אחרת ולא אותה משימה עם עוד פריטים. הקלה מבקשת לבחור אחד. הבינונית מבקשת לסדר ארבעה לפי הסדר, וזו קפיצה גדולה יותר משנדמה, כי לארבעה פריטים יש 24 סדרים אפשריים ורק אחד נכון. הקשה מבקשת למיין שישה לקבוצות, וזו חשיבה שלישית לגמרי.",

        "אין שעון, אין ניקוד שיורד ואפשר לנסות שוב מיד. הפריטים הם חיות וחפצים מוכרים, אז ילדים אומרים את השמות בקול תוך כדי, וזה בונוס שלא תכננו.",

        "שלב אחרי שלב הגדלים משתנים, אז אותה חיה לא תמיד הגדולה. ילד שלמד שפיל תמיד מנצח יגלה מהר שהמשחק שואל על מה שרואים ולא על מה שיודעים.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "בחירה, סידור או מיון. שלוש משימות שונות, לא אותה אחת בגדלים." },
        { title: "מסתכלים על הגדלים", body: "ההבדל בין הפריטים ברור בכוונה, גם ברמה הקשה." },
        { title: "עונים", body: "נגיעה אחת לבחירה, ובסידור נוגעים לפי הסדר. אין גרירה." },
        { title: "עולים שלב", body: "תשובה נכונה מביאה סיבוב חדש עם גדלים חדשים." },
      ],

      tips: [
        {
          title: "להתחיל מהקצוות",
          body: "בסידור, מצאו קודם את הגדול ביותר ואת הקטן ביותר. מה שנשאר באמצע קל הרבה יותר.",
        },
        {
          title: "להשוות זוגות",
          body: "אל תנסו לראות את כל הארבעה בבת אחת. שניים בכל פעם, וההשוואה הופכת קלה.",
        },
        {
          title: "להתעלם ממה שיודעים",
          body: "פה חתול יכול להיות גדול מפיל. השאלה היא על מה שרואים במסך.",
        },
        {
          title: "אין למהר",
          body: "אין שעון בכלל. ברמה הקשה, שבה הפער הוא פי 1.25 בלבד, שנייה נוספת של הסתכלות שווה הרבה.",
        },
      ],

      teaches: [
        { title: "השוואת גדלים", body: "יותר גדול ויותר קטן הם מושגים שצריך לתרגל, ופה מתרגלים אותם ישירות." },
        {
          title: "סידור לפי סדר",
          body: "לארבעה פריטים יש 24 סדרים ורק אחד נכון. זו מיומנות אחרת מלבחור את הגדול.",
        },
        { title: "מיון לקבוצות", body: "ברמה הקשה לא בוחרים אחד אלא מחלקים את כולם, וזו חשיבה שלישית." },
        {
          title: "לסמוך על העין",
          body: "המשחק שואל על מה שרואים ולא על מה שיודעים על העולם, וזו הבחנה שילדים לומדים כאן.",
        },
      ],

      ages: [
        { title: "2 עד 3", body: "קלה. פער של פי 2.5 בין הפריטים, אז אי אפשר לטעות במבט." },
        { title: "4 עד 5", body: "בינונית, כשסידור של ארבעה מתחיל להיות אפשרי." },
        { title: "6 ומעלה", body: "קשה. שישה פריטים למיון עם פער של פי 1.25 בלבד." },
        {
          title: "הורים",
          body: "אין מה להפסיד ואין שעון, אז אפשר להשאיר את זה פתוח ולחזור.",
        },
      ],

      accessibility:
        "נגיעה בלבד. גם הסידור נעשה בנגיעות לפי הסדר ולא בגרירה, כך שילד קטן או משתמש באמצעי קלט חלופי לא נחסם. הפריטים גדולים מ-2 על 2 סנטימטרים בכל מסך, וגם הקטן שברמה הקשה. השאלה היא על גודל ולא על צבע, אז עיוורון צבעים לא רלוונטי כאן. אין שעון ואין הבהובים, וכל סיבוב מובן מהתמונות בלבד בלי מילה אחת לקרוא.",

      together: [
        { title: "לומר גדול או קטן", body: "בקשו מהילד להשוות בקול לפני הנגיעה. השוואה מדוברת חדה יותר." },
        {
          title: "לסדר צעצועים",
          body: "העמידו חמישה בובות או כוסות בשורה ובקשו לסדר לפי גובה. אותה מיומנות, ביד.",
        },
        { title: "מי יותר גדול בבית", body: "כיסא או שולחן, כף או מזלג. המשחק ממשיך אחרי שסוגרים אותו." },
        {
          title: "לנחש את הסדר",
          body: "לפני שנוגעים, נחשו ביחד את הסדר המלא. ואז בדקו כמה הייתם קרובים.",
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
          q: "מה ההבדל בין הרמות?",
          a: "המשימה עצמה. הקלה מבקשת לבחור אחד מתוך שלושה, הבינונית לסדר ארבעה, והקשה למיין שישה. גם הפער בין הגדלים מצטמצם מפי 2.5 לפי 1.6 ולפי 1.25.",
        },
        {
          q: "הרמה הקשה קשה מדי לילד?",
          a: "פי 1.25 הוא הפער הקטן ביותר שאנחנו שולחים, ומתחת לזה הסיבוב מפסיק להיות הוגן על מסך טלפון. זו החלטה שנקבעה לפי גודל מסך ולא לפי תחושה.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "צריך לגרור פריטים?",
          a: "לא. גם הסידור נעשה בנגיעות לפי הסדר, כי ילד בן ארבע ומשתמש באמצעי קלט חלופי לא תמיד יכולים להחזיק גרירה ממושכת.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "כלום. אין ניקוד שיורד ואין חיים, ואפשר לנסות שוב מיד.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משנתיים בערך, ברמה הקלה. אין קריאה בשום מקום, וההבדל בין הפריטים שם גדול מכדי לטעות.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["גדול וקטן", "גדלים", "מיון", "סידור", "לגיל הרך", "השוואה"],
    },

    en: {
      metaTitle: "Big & Small - Free Size Game for Toddlers | Ellaz",
      metaDescription:
        "A free size game for young children. Pick the biggest, put four in order, sort six. Three levels, no download or signup.",

      lede: "A free game about size. The first level asks which of three is biggest, the second asks you to put four in order, and the third asks you to sort six. Three levels, three different tasks.",

      body: [
        "An elephant, a cat and an ant. Which one is biggest?",

        "The number that decides difficulty here is not how many items there are, it is how close they get. On easy any two items differ by at least 2.5 times in size, which a two-year-old cannot get wrong by looking. Medium narrows the gap to 1.6 times and hard to 1.25, which is the smallest gap we ship. Below that the round stops being fair on a phone screen, and that is a decision made by physics rather than by taste: two things differing by 15% on a six-inch display is a guess, not a question.",

        "Each level is also a different task rather than the same one with more items. Easy asks you to pick one. Medium asks you to put four in order, which is a bigger jump than it sounds, because four items have 24 possible orderings and only one of them is right. Hard asks you to sort six into groups, which is a third kind of thinking again.",

        "No clock. No score that falls. Another try is always available. The items are familiar animals and objects, so children name them out loud while playing, which is a bonus we did not plan.",

        "Sizes change from round to round, so the same animal is not always the biggest. A child who learned that elephants always win discovers quickly that the game asks about what you see rather than what you know.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Choose, order or sort. Three different tasks, not one task at three sizes." },
        { title: "Look at the sizes", body: "The difference is deliberately clear, even on hard." },
        { title: "Answer", body: "One tap to choose, and for ordering you tap in sequence. No dragging." },
        { title: "Move up", body: "A correct answer brings a fresh round with new sizes." },
      ],

      tips: [
        {
          title: "Start at the ends",
          body: "When ordering, find the biggest and the smallest first. What is left in the middle is far easier.",
        },
        {
          title: "Compare in pairs",
          body: "Do not try to see all four at once. Two at a time, and comparison becomes easy.",
        },
        {
          title: "Ignore what you know",
          body: "A cat can be bigger than an elephant here. The question is about what is on the screen.",
        },
        {
          title: "No need to hurry",
          body: "There is no clock at all. On hard, where the gap is only 1.25 times, an extra second of looking is worth a lot.",
        },
      ],

      teaches: [
        { title: "Comparing size", body: "Bigger and smaller are concepts that need practice, and here they get practised directly." },
        {
          title: "Putting things in order",
          body: "Four items have 24 orderings and only one is right. A different skill from picking the biggest.",
        },
        { title: "Sorting into groups", body: "Hard asks you to divide everything rather than pick one, which is a third kind of thinking." },
        {
          title: "Trusting your eyes",
          body: "The game asks about what is visible rather than what you know about the world, and children learn that distinction here.",
        },
      ],

      ages: [
        { title: "2 to 3", body: "Easy. A 2.5 times gap between items, so it cannot be got wrong at a glance." },
        { title: "4 to 5", body: "Medium, once ordering four becomes possible." },
        { title: "6 and up", body: "Hard. Six items to sort at a gap of only 1.25 times." },
        {
          title: "Parents",
          body: "Nothing to lose and no clock, so this one can be left open and returned to.",
        },
      ],

      accessibility:
        "Tapping only. Ordering is done by tapping in sequence rather than by dragging, so a small child or somebody using an alternative input device is not shut out. Items are larger than 2cm square on any screen, including the smallest one on hard. The question is about size rather than colour, so colour blindness is irrelevant here. No clock and nothing flashing, and every round is understandable from the pictures without a word to read.",

      together: [
        { title: "Say bigger or smaller", body: "Ask your child to compare out loud before touching. A spoken comparison is sharper." },
        {
          title: "Sort the toys",
          body: "Line up five dolls or cups and ask them to order by height. Same skill, in hand.",
        },
        { title: "Which is bigger at home", body: "Chair or table, spoon or fork. The game continues after you close it." },
        {
          title: "Guess the order",
          body: "Before touching, guess the full order together. Then check how close you were.",
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
          q: "What is the difference between the levels?",
          a: "The task itself. Easy asks you to pick one of three, medium to order four, and hard to sort six. The gap between sizes also narrows from 2.5 times to 1.6 to 1.25.",
        },
        {
          q: "Is the hard level too hard for a child?",
          a: "1.25 times is the smallest gap we ship, and below it the round stops being fair on a phone screen. That was decided by screen size rather than by feel.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Does my child have to drag items?",
          a: "No. Ordering is done by tapping in sequence, because a four-year-old and somebody using an alternative input device cannot always sustain a drag.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "Nothing. No score drops and there are no lives, and another try is available immediately.",
        },
        {
          q: "What age is this for?",
          a: "From about two on easy. There is no reading anywhere, and the difference between items there is too large to get wrong.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["big and small", "size", "sorting", "ordering", "preschool", "comparison"],
    },
    es: {
      metaTitle: "Grande y pequeño - juego de tamaños gratis | Ellaz",
      metaDescription:
        "Juego gratis de tamaños para niños pequeños. Elige el más grande, ordena cuatro, clasifica seis. Tres niveles, sin descargas ni registro.",

      lede: "Un juego gratuito sobre el tamaño. El primer nivel pregunta cuál de tres es el más grande, el segundo pide ordenar cuatro, y el tercero pide clasificar seis. Tres niveles, tres tareas distintas.",

      body: [
        "Un elefante, un gato y una hormiga. ¿Cuál es el más grande?",

        "El número que decide la dificultad aquí no es cuántas cosas hay, es lo cerca que llegan a estar. En fácil dos cosas cualesquiera se diferencian por lo menos 2,5 veces en tamaño, lo que un niño de dos años no puede fallar mirando. El medio estrecha la distancia a 1,6 veces y el difícil a 1,25, que es la distancia más pequeña que publicamos. Por debajo de eso la ronda deja de ser justa en la pantalla de un móvil, y esa decisión la tomó la física y no el gusto: dos cosas que se diferencian un 15% en una pantalla de seis pulgadas son un juego de adivinar y no una pregunta.",

        "Cada nivel es además una tarea distinta y no la misma con más piezas. El fácil pide elegir una. El medio pide ordenar cuatro, que es un salto mayor de lo que suena, porque cuatro cosas tienen 24 ordenaciones posibles y solo una es la buena. El difícil pide clasificar seis en grupos, que vuelve a ser una tercera manera de pensar.",

        "Sin reloj. Sin puntuación que baje. Siempre se puede volver a probar. Las cosas son animales y objetos conocidos, así que los niños los van nombrando en voz alta mientras juegan, que es un extra que no habíamos planeado.",

        "Los tamaños cambian de una ronda a otra, así que el mismo animal no siempre es el más grande. Un niño que había aprendido que los elefantes ganan siempre descubre enseguida que el juego pregunta por lo que ves y no por lo que sabes.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Elegir, ordenar o clasificar. Tres tareas distintas, no una tarea en tres tamaños." },
        { title: "Mira los tamaños", body: "La diferencia es clara a propósito, incluso en difícil." },
        { title: "Responde", body: "Un toque para elegir, y para ordenar vas tocando en orden. Sin arrastrar." },
        { title: "Sube", body: "Un acierto trae una ronda nueva con otros tamaños." },
      ],

      tips: [
        {
          title: "Empieza por los extremos",
          body: "Al ordenar, busca primero el más grande y el más pequeño. Lo que queda en medio resulta mucho más fácil.",
        },
        {
          title: "Compara de dos en dos",
          body: "No intentes ver las cuatro a la vez. De dos en dos, y comparar se vuelve sencillo.",
        },
        {
          title: "Olvida lo que sabes",
          body: "Aquí un gato puede ser más grande que un elefante. La pregunta es sobre lo que hay en la pantalla.",
        },
        {
          title: "No hace falta correr",
          body: "Aquí no hay ningún reloj. En difícil, donde la distancia es de solo 1,25 veces, un segundo más de mirada vale mucho.",
        },
      ],

      teaches: [
        { title: "Comparar tamaños", body: "Más grande y más pequeño son conceptos que necesitan práctica, y aquí se practican directamente." },
        {
          title: "Poner cosas en orden",
          body: "Cuatro cosas tienen 24 ordenaciones y solo una es la buena. Es otra habilidad distinta de elegir la más grande.",
        },
        { title: "Clasificar en grupos", body: "El difícil pide repartirlo todo en vez de elegir una, que es una tercera forma de pensar." },
        {
          title: "Fiarse de los propios ojos",
          body: "El juego pregunta por lo que se ve y no por lo que se sabe del mundo, y los niños aprenden aquí esa diferencia.",
        },
      ],

      ages: [
        { title: "2 a 3", body: "Fácil. Una distancia de 2,5 veces entre las cosas, así que no se puede fallar de un vistazo." },
        { title: "4 a 5", body: "Medio, cuando ordenar cuatro empiece a ser posible." },
        { title: "6 en adelante", body: "Difícil. Seis cosas que clasificar con una distancia de solo 1,25 veces." },
        {
          title: "Padres",
          body: "Nada que perder y sin reloj, así que este se puede dejar abierto y volver luego.",
        },
      ],

      accessibility:
        "Solo hay que tocar. Ordenar se hace tocando en orden y no arrastrando, así que un niño pequeño o alguien que usa un dispositivo de entrada alternativo no se queda fuera. Las cosas miden más de 2 centímetros de lado en cualquier pantalla, incluida la más pequeña del difícil. La pregunta es sobre el tamaño y no sobre el color, de modo que aquí el daltonismo es irrelevante. Sin reloj y sin nada que parpadee, y cada ronda se entiende con los dibujos sin una palabra que leer.",

      together: [
        { title: "Decid más grande o más pequeño", body: "Pedidle que compare en voz alta antes de tocar. Una comparación dicha es más afilada." },
        {
          title: "Ordenad los juguetes",
          body: "Poned cinco muñecos o vasos en fila y pedidle que los ordene por altura. Misma habilidad, en la mano.",
        },
        { title: "Qué es más grande en casa", body: "La silla o la mesa, la cuchara o el tenedor. El juego sigue después de cerrarlo." },
        {
          title: "Adivinad el orden",
          body: "Antes de tocar, decid juntos el orden completo. Después comprobad cuánto os habéis acercado.",
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
          q: "¿En qué se diferencian los niveles?",
          a: "En la tarea misma. El fácil pide elegir una de tres, el medio ordenar cuatro y el difícil clasificar seis. La distancia entre tamaños también se estrecha de 2,5 veces a 1,6 y a 1,25.",
        },
        {
          q: "¿El nivel difícil es demasiado para un niño?",
          a: "1,25 veces es la distancia más pequeña que publicamos, y por debajo la ronda deja de ser justa en la pantalla de un móvil. Eso lo decidió el tamaño de la pantalla y no una impresión.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Mi hijo tiene que arrastrar cosas?",
          a: "No. Ordenar se hace tocando en orden, porque un niño de cuatro años y alguien que usa un dispositivo de entrada alternativo no siempre pueden mantener un arrastre.",
        },
        {
          q: "¿Qué pasa si la respuesta es incorrecta?",
          a: "Nada. No baja ninguna puntuación y no hay vidas, y se puede volver a probar al momento.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos dos años en fácil. No se lee nada, y la diferencia entre las cosas ahí es demasiado grande como para fallarla.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["grande y pequeño", "tamaño", "clasificar", "ordenar", "infantil", "comparar"],
    },
  },

  provenance: [
    {
      claim: "minimum size ratios of 2.5x, 1.6x and 1.25x by level, and 24 possible orderings of four items",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "three distinct tasks: pick one of three, order four, sort six",
      source: "src/games/sortsize/logic.ts",
    },
    {
      claim: "the record counts levels cleared, higher is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
