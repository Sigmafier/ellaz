import type { GameContent } from "../types";

/**
 * Pattern completion, and a page whose interesting content is the taxonomy: the
 * eight families are real, distinct kinds of pattern, and which three a level
 * draws from is what the difficulty actually means.
 *
 * The honest wrinkle is that two of the hard families do not repeat at all -
 * GROW and NUMBER have period 0 - so a child who has learned to count the cycle
 * has to notice that counting has stopped working. That is a genuinely
 * different cognitive step and the page says so.
 */
export const sequence: GameContent = {
  id: "sequence",

  copy: {
    he: {
      name: "מה בא אחר כך?",
      metaTitle: "מה בא אחר כך - משחק דפוסים לילדים | Ellaz",
      metaDescription:
        "משחק דפוסים חינם לילדים. רואים סדרה ומשלימים את הבא בתור. שמונה סוגי דפוסים, בלי הרשמה.",

      lede: "משחק חינם שבו מופיעה סדרה של צורות או צבעים, והילד בוחר מה בא אחריה. שלוש רמות, ובכל אחת סוגים אחרים של דפוסים.",

      body: [
        "סדרה על המסך. אדום, כחול, אדום, כחול. מה עכשיו?",

        "מאחורי המשחק הזה יש 8 משפחות של דפוסים, וכל רמה שואבת מ-3 מהן. הקלה נותנת ABAB ו-AAB, כלומר מחזורים באורך 2 ו-3. הבינונית מוסיפה ABC, AABB ודפוס שמשנה גודל במקום צבע, במחזורים של 3, 4 ו-2. הקשה עוברת ל-ABBA, מחזור באורך 4 עם היפוך באמצע, ולשתי משפחות שאין להן מחזור בכלל: אחת שגדלה ואחת שסופרת. ילד שלמד לספור את המחזור צריך לגלות שהספירה הפסיקה לעבוד, וזו קפיצה מחשבתית אחרת לגמרי מלמידה של מחזור ארוך יותר.",

        "יש 6 צבעים בסך הכול, לא יותר. שני גוונים שילד בן חמש לא מפריד ביניהם על מסך קטן הופכים משחק דפוסים למשחק ניחושים, אז אין פה אדום שני ואין כחול שני. ניחוש עיוור שווה 1 מתוך 6, כלומר 16.7%, ולא משנה כמה הדפוס מתוחכם.",

        "אין שעון, ואין עונש על טעות. אפשר להסתכל על הסדרה כמה שרוצים, לומר אותה בקול, ולנסות שוב. השלבים ממשיכים בלי סוף ומה שנשמר הוא כמה רחוק הגעתם ברמה הזאת.",

        "זה אחד המשחקים הבודדים כאן שילדים באמת פותרים בקול. הם אומרים אדום כחול אדום כחול ואז עוצרים, וזו בדיוק המחשבה קורית בקול רם.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. משתנים סוגי הדפוסים ולא רק אורכם." },
        { title: "קוראים את הסדרה", body: "היא מוצגת שמאלה לימינה, גדולה וברורה." },
        { title: "בוחרים את הבא", body: "נוגעים באפשרות שלדעתכם ממשיכה. טעות לא עולה כלום." },
        { title: "עולים שלב", body: "תשובה נכונה מביאה דפוס חדש, לפעמים ממשפחה אחרת." },
      ],

      tips: [
        {
          title: "לומר את הסדרה בקול",
          body: "אדום, כחול, אדום. השמיעה חושפת את המחזור הרבה לפני שהעין מוצאת אותו.",
        },
        {
          title: "לספור את המחזור",
          body: "רוב הדפוסים חוזרים כל 2, 3 או 4 פריטים. מציאת האורך פותרת את השאר לבד.",
        },
        {
          title: "ברמה הקשה, לבדוק אם זה בכלל חוזר",
          body: "2 מתוך 3 המשפחות שם לא חוזרות אף פעם. אחת גדלה ואחת סופרת, ושתיהן נראות שבורות עד שמבינים.",
        },
        {
          title: "להסתכל על הגודל",
          body: "יש דפוס שמשנה גודל ולא צבע. ילדים מפספסים אותו כי הם מסתכלים על הצבע בלבד.",
        },
      ],

      teaches: [
        { title: "זיהוי דפוס", body: "המיומנות שמתחת לכל מתמטיקה שבאה אחר כך, ופה היא נלמדת בלי מספרים." },
        { title: "חיזוי", body: "לא מה יש, אלא מה יהיה. זו קפיצה אמיתית בחשיבה של ילד בן חמש." },
        { title: "לספור מחזורים", body: "כל דפוס חוזר הוא תרגיל ספירה מוסווה, וילדים סופרים אותו בלי שאמרו להם." },
        {
          title: "לגלות שכלל השתנה",
          body: "שתי משפחות ברמה הקשה לא מתנהגות כמו האחרות. לזהות שהשיטה הישנה לא עובדת זו מיומנות בפני עצמה.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "קלה. ABAB זה בדיוק הדפוס הראשון שילדים קולטים, ורובם קולטים אותו כאן." },
        { title: "5 עד 6", body: "קלה ואז בינונית. פה מתחילים לראות דפוסים של שלושה ושל גודל." },
        { title: "7 ומעלה", body: "קשה, עם המשפחות שגדלות וסופרות." },
        {
          title: "הורים",
          body: "אין שעון ואין עונש, אז ילד שנתקע פשוט מסתכל עוד. שווה לשבת לידו בקשה.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. האפשרויות גדולות ומרווחות. 6 הצבעים נבחרו רחוקים זה מזה בכוונה, ולכל צורה יש גם מתאר משלה, אז אפשר לשחק לפי צורה ולא לפי גוון. אין שעון על התשובה, אז אפשר להסתכל על הסדרה כמה זמן שרוצים. אין הבהובים ואפשר לשחק בשקט מוחלט. הסדרה מוצגת שמאלה לימינה גם בעברית, כי סדר קריאה של דפוס הוא חלק מהשאלה.",

      together: [
        { title: "לומר ביחד", body: "קראו את הסדרה בקול בתורות, פריט לכל אחד. המחזור נשמע מיד." },
        {
          title: "דפוס על השולחן",
          body: "בנו סדרה מכפתורים או מקוביות ובקשו מהילד להמשיך. אותו משחק בדיוק ביד.",
        },
        { title: "הילד בונה", body: "תנו לו להמציא דפוס ואתם תמשיכו. להמציא קשה יותר מלפתור." },
        {
          title: "לחפש דפוסים בבית",
          body: "אריחים, גדר, פסים על חולצה. אחרי סיבוב אחד ילדים מתחילים לראות אותם בכל מקום.",
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
          q: "אילו סוגי דפוסים יש?",
          a: "8 משפחות, 3 בכל רמה. הקלה נותנת ABAB ו-AAB במחזורים של 2 ו-3, הבינונית ABC, AABB ודפוס גודל, והקשה ABBA ו-2 משפחות שלא חוזרות בכלל.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "כלום. אין ניקוד שיורד ואין חיים, ואפשר לנסות שוב מיד. אין גם שעון על התשובה.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "למה יש רק שישה צבעים?",
          a: "כי 2 גוונים שילד בן 5 לא מפריד ביניהם על מסך קטן היו הופכים משחק דפוסים למשחק ניחושים. אין פה אדום שני ואין כחול שני, בכוונה.",
        },
        {
          q: "הילד לא יודע לקרוא. זה בעיה?",
          a: "לא. אין מילה שצריך לקרוא, והדפוסים בנויים מצורות וצבעים בלבד.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, ברמה הקלה. ABAB הוא הדפוס הראשון שילדים קולטים, בדרך כלל לפני שהם סופרים.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["דפוסים", "סדרות", "מה בא אחר כך", "חשיבה", "לגיל הרך", "היגיון"],
    },

    en: {
      name: "What Comes Next",
      metaTitle: "What Comes Next - Free Pattern Game for Kids | Ellaz",
      metaDescription:
        "A free pattern game for children. See a sequence and pick what continues it. Eight kinds of pattern, no download or signup.",

      lede: "A free game where a sequence of shapes or colours appears and your child picks what comes next. Three levels, each drawing on different kinds of pattern.",

      body: [
        "A sequence on screen. Red, blue, red, blue. What now?",

        "Behind this game sit 8 families of pattern, and each level draws on 3 of them. Easy gives you ABAB and AAB, cycles of length 2 and 3. Medium adds ABC, AABB and a pattern that changes size instead of colour, at lengths 3, 4 and 2. Hard moves to ABBA, a cycle of 4 with a reversal in the middle, and to 2 families with no cycle at all: one that grows and one that counts. A child who has learned to count the cycle has to work out that counting has stopped working, and that is a completely different mental step from learning a longer cycle.",

        "There are 6 colours in total and no more. Two hues a five-year-old cannot separate on a small screen would turn a pattern game into a guessing game, so there is no second red and no second blue here. A blind guess is worth 1 in 6, or 16.7%, however clever the pattern happens to be.",

        "There is no clock and no penalty for a wrong answer. You can stare at the sequence as long as you like, say it out loud, and try again. Levels continue without end and what gets kept is how far you got at that difficulty.",

        "This is one of the few games here that children genuinely solve out loud. They say red blue red blue and then stop, and that pause is thinking happening audibly.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. The kinds of pattern change, not just their length." },
        { title: "Read the sequence", body: "It runs left to right, large and clear." },
        { title: "Pick what continues", body: "Touch the option you think comes next. A mistake costs nothing." },
        { title: "Move up", body: "A correct answer brings a new pattern, sometimes from a different family." },
      ],

      tips: [
        {
          title: "Say the sequence out loud",
          body: "Red, blue, red. Hearing it exposes the cycle long before the eye finds it.",
        },
        {
          title: "Count the cycle",
          body: "Most patterns repeat every 2, 3 or 4 items. Finding that length solves the rest by itself.",
        },
        {
          title: "On hard, check whether it repeats at all",
          body: "2 of the 3 families there never repeat. One grows and one counts, and both look broken until you see it.",
        },
        {
          title: "Watch the size",
          body: "One pattern family changes size rather than colour. Children miss it because they are only looking at colour.",
        },
      ],

      teaches: [
        { title: "Pattern recognition", body: "The skill underneath all the mathematics that comes later, learned here without numbers." },
        { title: "Prediction", body: "Not what is there but what will be. That is a real leap in a five-year-old's thinking." },
        { title: "Counting cycles", body: "Every repeating pattern is counting practice in disguise, and children do it unprompted." },
        {
          title: "Noticing a changed rule",
          body: "Two hard families behave unlike the others. Recognising that your method stopped working is a skill of its own.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Easy. ABAB is the first pattern children grasp, and most of them grasp it right here." },
        { title: "5 to 6", body: "Easy then medium. This is where three-part and size patterns start landing." },
        { title: "7 and up", body: "Hard, with the families that grow and count." },
        {
          title: "Parents",
          body: "No clock and no penalty, so a stuck child simply looks longer. Worth sitting alongside for hard.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. The options are large and well spaced. The 6 colours were chosen far apart on purpose and every shape has its own outline as well, so the game can be played by shape rather than hue. There is no clock on the answer, so the sequence can be studied for as long as needed. Nothing flashes and it plays fully in silence. The sequence runs left to right even in Hebrew, because reading order is part of the question.",

      together: [
        { title: "Say it together", body: "Read the sequence aloud in turns, one item each. The cycle becomes audible immediately." },
        {
          title: "Patterns on the table",
          body: "Build a sequence from buttons or blocks and ask your child to continue it. Exactly the same game, in hand.",
        },
        { title: "Let them invent", body: "They make a pattern and you continue it. Inventing is harder than solving." },
        {
          title: "Spot patterns at home",
          body: "Tiles, fences, stripes on a shirt. After one round children start seeing them everywhere.",
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
          q: "What kinds of pattern are there?",
          a: "8 families, 3 per level. Easy has ABAB and AAB at cycle lengths 2 and 3, medium has ABC, AABB and a size pattern, and hard has ABBA plus 2 families that never repeat at all.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "Nothing. No score drops and there are no lives, and another try is available immediately. There is no clock on the answer either.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Why only six colours?",
          a: "Because 2 hues a five-year-old cannot separate on a small screen would turn a pattern game into a guessing game. There is no second red and no second blue, deliberately.",
        },
        {
          q: "My child cannot read yet. Is that a problem?",
          a: "No. There is not a word to read, and the patterns are built from shapes and colours only.",
        },
        {
          q: "What age is this for?",
          a: "From about three on easy. ABAB is the first pattern children grasp, usually before they can count.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["patterns", "sequences", "what comes next", "logic", "preschool", "thinking"],
    },
    es: {
      name: "¿Qué viene ahora?",
      metaTitle: "¿Qué viene después? - juego de patrones gratis | Ellaz",
      metaDescription:
        "Juego de patrones gratis para niños. Aparece una secuencia y hay que elegir qué la continúa. Ocho tipos de patrón, sin descargas ni registro.",

      lede: "Un juego gratuito en el que aparece una secuencia de formas o colores y tu hijo elige qué viene después. Tres niveles, cada uno tirando de tipos de patrón distintos.",

      body: [
        "Una secuencia en pantalla. Rojo, azul, rojo, azul. ¿Y ahora?",

        "Detrás de este juego hay 8 familias de patrón, y cada nivel tira de 3 de ellas. El fácil te da ABAB y AAB, ciclos de longitud 2 y 3. El medio añade ABC, AABB y un patrón que cambia de tamaño en lugar de color, con longitudes 3, 4 y 2. El difícil pasa a ABBA, un ciclo de 4 con una inversión en medio, y a 2 familias sin ningún ciclo: una que crece y otra que cuenta. Un niño que ha aprendido a contar el ciclo tiene que darse cuenta de que contar ha dejado de funcionar, y ese es un paso mental completamente distinto de aprenderse un ciclo más largo.",

        "Hay 6 colores en total y ni uno más. Dos tonos que un niño de cinco años no puede separar en una pantalla pequeña convertirían un juego de patrones en un juego de adivinar, así que aquí no hay un segundo rojo ni un segundo azul. Adivinar a ciegas vale 1 entre 6, o sea un 16,7%, por listo que sea el patrón.",

        "No hay reloj ni castigo por fallar. Puedes quedarte mirando la secuencia todo lo que quieras, decirla en voz alta y volver a probar. Los niveles siguen sin final y lo que se guarda es hasta dónde llegaste en esa dificultad.",

        "Este es de los pocos juegos de aquí que los niños resuelven de verdad en voz alta. Dicen rojo azul rojo azul y después se paran, y esa pausa es el pensamiento ocurriendo donde se oye.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, medio o difícil. Cambian los tipos de patrón, no solo su longitud." },
        { title: "Lee la secuencia", body: "Va de izquierda a derecha, grande y clara." },
        { title: "Elige qué continúa", body: "Toca la opción que creas que viene después. Un fallo no cuesta nada." },
        { title: "Sube", body: "Un acierto trae un patrón nuevo, a veces de otra familia." },
      ],

      tips: [
        {
          title: "Di la secuencia en voz alta",
          body: "Rojo, azul, rojo. Oírla saca el ciclo a la luz mucho antes de que lo encuentre el ojo.",
        },
        {
          title: "Cuenta el ciclo",
          body: "Casi todos los patrones se repiten cada 2, 3 o 4 elementos. Encontrar esa longitud resuelve el resto sola.",
        },
        {
          title: "En difícil, comprueba si se repite siquiera",
          body: "2 de las 3 familias de ahí no se repiten nunca. Una crece y otra cuenta, y las dos parecen rotas hasta que lo ves.",
        },
        {
          title: "Mira el tamaño",
          body: "Una familia de patrones cambia de tamaño y no de color. Los niños se la saltan porque solo están mirando el color.",
        },
      ],

      teaches: [
        { title: "Reconocer patrones", body: "La habilidad que hay debajo de todas las matemáticas posteriores, aprendida aquí sin números." },
        { title: "Predecir", body: "No qué hay sino qué habrá. Eso es un salto de verdad en la cabeza de un niño de cinco años." },
        { title: "Contar ciclos", body: "Todo patrón que se repite es práctica de contar disfrazada, y los niños lo hacen sin que nadie se lo pida." },
        {
          title: "Notar que la regla cambió",
          body: "Dos familias del difícil se comportan distinto de las demás. Darse cuenta de que tu método ha dejado de funcionar es una habilidad aparte.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Fácil. ABAB es el primer patrón que pillan los niños, y la mayoría lo pillan justo aquí." },
        { title: "5 a 6", body: "Fácil y después medio. Aquí empiezan a entrar los patrones de tres partes y los de tamaño." },
        { title: "7 en adelante", body: "Difícil, con las familias que crecen y que cuentan." },
        {
          title: "Padres",
          body: "Sin reloj y sin castigo, así que un niño atascado simplemente mira más rato. Merece la pena sentarse al lado en difícil.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. Las opciones son grandes y están bien separadas. Los 6 colores se eligieron muy distantes entre sí a propósito y cada forma lleva además su propio contorno, así que el juego se puede jugar por forma y no por tono. No hay reloj sobre la respuesta, de modo que la secuencia se puede estudiar todo lo que haga falta. Nada parpadea y se juega entero en silencio. La secuencia va de izquierda a derecha incluso en hebreo, porque el orden de lectura forma parte de la pregunta.",

      together: [
        { title: "Decidla juntos", body: "Leed la secuencia en voz alta por turnos, un elemento cada uno. El ciclo se vuelve audible al momento." },
        {
          title: "Patrones en la mesa",
          body: "Construid una secuencia con botones o bloques y pedidle que la continúe. Exactamente el mismo juego, en la mano.",
        },
        { title: "Que lo inventen ellos", body: "Él hace un patrón y tú lo continúas. Inventar cuesta más que resolver." },
        {
          title: "Buscad patrones en casa",
          body: "Baldosas, vallas, las rayas de una camiseta. Después de una ronda los niños empiezan a verlos por todas partes.",
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
          q: "¿Qué tipos de patrón hay?",
          a: "8 familias, 3 por nivel. El fácil tiene ABAB y AAB con ciclos de 2 y 3, el medio tiene ABC, AABB y un patrón de tamaño, y el difícil tiene ABBA más 2 familias que no se repiten nunca.",
        },
        {
          q: "¿Qué pasa si la respuesta es incorrecta?",
          a: "Nada. No baja ninguna puntuación y no hay vidas, y se puede volver a probar al momento. Tampoco hay reloj sobre la respuesta.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Por qué solo seis colores?",
          a: "Porque 2 tonos que un niño de cinco años no puede separar en una pantalla pequeña convertirían un juego de patrones en uno de adivinar. No hay un segundo rojo ni un segundo azul, a propósito.",
        },
        {
          q: "Mi hijo todavía no lee. ¿Es un problema?",
          a: "No. No hay ni una palabra que leer, y los patrones están hechos solo de formas y colores.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos tres años en fácil. ABAB es el primer patrón que pillan los niños, normalmente antes de saber contar.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["patrones", "secuencias", "qué viene después", "lógica", "infantil", "razonar"],
    },
  },

  provenance: [
    {
      claim: "eight pattern families, three per level; easy has cycles of 2 and 3, hard includes two with no cycle",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "six colours in the palette, so a blind guess is worth 16.7%",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "the record counts levels cleared, higher is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
