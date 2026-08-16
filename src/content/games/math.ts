import type { GameContent } from "../types";

/**
 * Seven levels that cross a real boundary partway through: the first three are
 * pre-arithmetic (counting things you can point at) and the last four are
 * arithmetic (symbols). That transition is the interesting content here, and it
 * is why the ladder starts before numbers rather than at 1+1.
 *
 * The detail worth stating: `match` stops at 6 while `count` goes to 10, because
 * a child can count a group of 10 by pointing at each item but cannot tell 7
 * from 8 at a glance, and in `match` the groups ARE the answer buttons.
 */
export const math: GameContent = {
  id: "math",

  copy: {
    he: {
      name: "חשבון",
      metaTitle: "חשבון - משחק מתמטיקה חינם לילדים | Ellaz",
      metaDescription:
        "משחק חשבון חינם לילדים. 7 רמות מספירה ועד כפל, עם 3 תשובות לבחירה. בלי שעון ובלי הרשמה.",

      lede: "משחק חשבון חינם לילדים. 7 רמות שמתחילות לפני שהילד מכיר ספרות ונגמרות בכפל, עם 3 תשובות לבחירה בכל שאלה ובלי שעון.",

      body: [
        "שאלה למעלה. 3 תשובות למטה. נוגעים בנכונה.",

        "הסולם כאן חוצה גבול אמיתי באמצע, וזה מה שמייחד אותו. שלוש הרמות הראשונות הן לפני חשבון בכלל: סופרים תפוחים, מתאימים מספר לקבוצה, סופרים תמונות. ילד שעוד לא מכיר את הסימן 4 יכול לספור ארבעה תפוחים ולנצח. ארבע הרמות האחרונות הן חשבון של ממש, עד 5, עד 10, עד 20 וכפל, וכאן כבר צריך לקרוא סימנים. המעבר בין השניים הוא הקפיצה האמיתית בחינוך מתמטי מוקדם, ורוב האפליקציות פשוט מתחילות אחריו.",

        "יש פרט קטן ברמת ההתאמה ששווה להסביר, כי הוא נראה כמו טעות. ספירה הולכת עד 10 והתאמה נעצרת ב-6, למרות ששתיהן על אותו נושא. הסיבה: בספירה הילד מצביע על כל פריט ואפשר לספור עשרה כך בלי בעיה, אבל בהתאמה הקבוצות עצמן הן כפתורי התשובה, וילד בן חמש לא מבדיל בין קבוצה של 7 לקבוצה של 8 במבט. מעל 6 זה היה הופך למשחק ניחושים.",

        "3 תשובות בכל שאלה, אז ניחוש עיוור שווה 33.3%. זה מספיק גבוה כדי שילד לא ייתקע לגמרי, ומספיק נמוך כדי שרצף של עשר תשובות נכונות לא יקרה במקרה.",

        "אין שעון ואין ניקוד שיורד. תשובה שגויה מציגה את הנכונה וממשיכה הלאה, כי לילד בן חמש שנתקע בשאלה אחת אין שום דבר להרוויח מלנסות אותה שוב ושוב.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "7 רמות: ספירה, התאמה, תמונות, עד 5, עד 10, עד 20 וכפל." },
        { title: "קוראים את השאלה", body: "היא מוצגת גדולה, ולפני החשבון גם כתמונות." },
        { title: "בוחרים תשובה", body: "3 אפשרויות. נגיעה אחת." },
        { title: "ממשיכים", body: "שאלה חדשה מיד. הרצף נספר, וטעות מאפסת אותו בלי עונש." },
      ],

      tips: [
        {
          title: "להתחיל לפני החשבון",
          body: "3 הרמות הראשונות לא דורשות לקרוא ספרות. ילד שעוד לא שם יכול לשחק כבר עכשיו.",
        },
        {
          title: "לספור בקול",
          body: "ברמות התמונה, אצבע על כל פריט ומספר בקול. זו הדרך שילדים באמת סופרים.",
        },
        {
          title: "לפסול לפני לבחור",
          body: "מתוך 3 תשובות, לרוב אחת ברורה שאינה נכונה. לפסול אותה משאיר בחירה בין שתיים.",
        },
        {
          title: "לא לקפוץ לכפל",
          body: "כפל כאן הוא עד 5 כפול 5. שווה להגיע אליו אחרי שעד 20 כבר קל, ולא לפני.",
        },
      ],

      teaches: [
        { title: "ספירה", body: "3 רמות שלמות עוסקות בלספור דברים אמיתיים לפני שיש בכלל סימנים." },
        { title: "הבנת כמות", body: "להתאים מספר לקבוצה זה מה שהופך את הסימן 4 למשהו שמשמעותו ארבעה דברים." },
        { title: "חיבור וחיסור", body: "3 טווחים, עד 5, עד 10 ועד 20, כך שההתקדמות היא בקצב של הילד." },
        {
          title: "כפל ראשון",
          body: "עד 5 כפול 5. מספיק כדי להבין מה כפל עושה, בלי לוח כפל לשנן.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "ספירה ותמונות. אין צורך לזהות ספרות בשביל שתי הרמות האלה." },
        { title: "5 עד 6", body: "התאמה ואז עד 5. פה החשבון מתחיל להיות חשבון." },
        { title: "7 עד 8", body: "עד 10 ועד 20." },
        {
          title: "9 ומעלה",
          body: "כפל. הטווח כאן קטן בכוונה, אז זו היכרות ולא אימון.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי הקלדה בשום שלב. 3 כפתורי התשובה גדולים ומרווחים. השאלה מוצגת גם כספרות וגם, ברמות המוקדמות, כתמונות שאפשר לספור, אז ילד שעדיין לא קורא ספרות משחק לפי התמונות. אין שעון על התשובה, אז אפשר לספור באצבע כמה שצריך. אין הבהובים ואפשר לשחק בשקט מוחלט. המשוואה מוצגת משמאל לימין גם בעברית, כי זה סדר הסימון המקובל.",

      together: [
        { title: "לספור באצבע ביחד", body: "ברמות התמונה, ספרו יחד בקול. זו הדרך שילדים לומדים לספור." },
        {
          title: "לשאול איך ידעת",
          body: "אחרי תשובה נכונה, שאלו איך הוא הגיע אליה. לפעמים התשובה מפתיעה.",
        },
        { title: "אתם עונים לפעמים לא נכון", body: "טעות של מבוגר שהילד מתקן שווה עשר תשובות נכונות שלו." },
        {
          title: "חשבון בלי מסך",
          body: "אותה שאלה על אצבעות או על תפוחים בשולחן. המשחק רק מתרגל, הוא לא מלמד לבד.",
        },
      ],

      faq: [
        {
          q: "משחק החשבון חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. כל הרמות פתוחות מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "מאיזה גיל אפשר לשחק?",
          a: "משלוש בערך. 3 מתוך 7 הרמות לא דורשות לזהות ספרות בכלל, אלא רק לספור תמונות, אז ילד שעוד לא מכיר מספרים כתובים משחק בהן.",
        },
        {
          q: "למה רמת ההתאמה נעצרת ב-6 וספירה מגיעה ל-10?",
          a: "כי בספירה אפשר להצביע על כל פריט, וילד סופר עשרה ככה בלי בעיה. בהתאמה הקבוצות הן כפתורי התשובה, וילד בן חמש לא מבדיל בין 7 ל-8 במבט. מעל 6 זה היה ניחוש.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שאלות." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "התשובה הנכונה מוצגת וממשיכים לשאלה הבאה. אין ניקוד שיורד ואין חזרה על אותה שאלה, כי לילד תקוע אין מה להרוויח מזה.",
        },
        {
          q: "יש שעון?",
          a: "אין. אפשר לספור באצבע כמה שצריך, וזו בדיוק הדרך שילדים סופרים.",
        },
        {
          q: "איך השיא נמדד?",
          a: "ברצף התשובות הנכונות הארוך ביותר, כשיותר זה טוב יותר. עם 3 אפשרויות לכל שאלה, ניחוש עיוור שווה 33.3%, אז רצף ארוך לא קורה במקרה.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["חשבון", "מתמטיקה", "ספירה", "חיבור", "כפל", "לגיל הרך"],
    },

    en: {
      name: "Math",
      metaTitle: "Math - Free Maths Game for Kids, Counting to Times | Ellaz",
      metaDescription:
        "A free maths game for children. 7 levels from counting to multiplication, 3 answers per question. No clock and no signup.",

      lede: "A free maths game for children. 7 levels starting before a child knows any digits and finishing at multiplication, with 3 answers to choose from and no clock anywhere.",

      body: [
        "A question above. 3 answers below. Touch the right one.",

        "The ladder here crosses a real boundary halfway up, and that is what makes it unusual. The first three levels are pre-arithmetic: count the apples, match a number to a group, count the pictures. A child who does not recognise the symbol 4 can count four apples and win. The last four levels are actual arithmetic, up to 5, up to 10, up to 20 and multiplication, and those need symbols read. Crossing between the two is the genuine leap in early maths, and most apps simply start after it.",

        "There is a small detail in the matching level worth explaining, because it looks like a mistake. Counting goes to 10 and matching stops at 6, even though they cover the same ground. The reason: when counting, a child points at each item and reaching ten that way is fine, but in matching the groups themselves are the answer buttons, and a five-year-old cannot tell a group of 7 from a group of 8 at a glance. Above 6 it would become a guessing game.",

        "3 answers per question means a blind guess is worth 33.3%. High enough that a child never gets completely stuck, and low enough that a run of ten correct answers does not happen by accident.",

        "There is no clock and no score that falls. A wrong answer shows the right one and moves on, because a five-year-old stuck on one question has nothing at all to gain from being made to try it again.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "7 of them: count, match, pictures, up to 5, to 10, to 20, and times." },
        { title: "Read the question", body: "Shown large, and as pictures too on the pre-arithmetic levels." },
        { title: "Choose an answer", body: "3 options. One tap." },
        { title: "Keep going", body: "A new question straight away. Your run is counted, and a mistake resets it without penalty." },
      ],

      tips: [
        {
          title: "Start before the arithmetic",
          body: "The first 3 levels need no digit reading at all. A child who is not there yet can already play.",
        },
        {
          title: "Count out loud",
          body: "On the picture levels, a finger on each item and a number spoken. That is how children actually count.",
        },
        {
          title: "Eliminate before choosing",
          body: "Out of 3 answers, one is usually obviously wrong. Removing it leaves a choice between two.",
        },
        {
          title: "Do not rush to times",
          body: "Multiplication here goes up to 5 times 5. Worth reaching after up to 20 is easy, not before.",
        },
      ],

      teaches: [
        { title: "Counting", body: "3 whole levels are about counting real things before any symbols exist." },
        { title: "Understanding quantity", body: "Matching a number to a group is what turns the symbol 4 into meaning four things." },
        { title: "Adding and subtracting", body: "3 ranges, up to 5, 10 and 20, so progress happens at the child's pace." },
        {
          title: "First multiplication",
          body: "Up to 5 times 5. Enough to understand what multiplying does, without a times table to memorise.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Counting and pictures. Neither level needs digits recognised." },
        { title: "5 to 6", body: "Matching, then up to 5. This is where the arithmetic becomes arithmetic." },
        { title: "7 to 8", body: "Up to 10 and up to 20." },
        {
          title: "9 and up",
          body: "Multiplication. The range is deliberately small, so this is an introduction rather than drill.",
        },
      ],

      accessibility:
        "One tap, no dragging and no typing at any point. The 3 answer buttons are large and well spaced. Questions appear as digits and, on the early levels, as countable pictures, so a child who cannot read numerals yet plays by the pictures. There is no clock on the answer, so counting on fingers takes as long as it takes. Nothing flashes and it plays fully in silence. The equation runs left to right even in Hebrew, because that is standard notation.",

      together: [
        { title: "Count on fingers together", body: "On the picture levels, count aloud as a pair. That is how children learn to count." },
        {
          title: "Ask how they knew",
          body: "After a correct answer, ask how they got there. The answer is sometimes surprising.",
        },
        { title: "Get one wrong on purpose", body: "An adult mistake a child corrects is worth ten of their own right answers." },
        {
          title: "Maths without the screen",
          body: "The same question on fingers or on apples at the table. The game practises, it does not teach alone.",
        },
      ],

      faq: [
        {
          q: "Is the maths game free?",
          a: "Completely. Nothing to pay and no purchases inside the game. Every level is open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
        },
        {
          q: "What age can start?",
          a: "About three. 3 of the 7 levels need no digit recognition at all, only counting pictures, so a child who does not know written numbers can play those.",
        },
        {
          q: "Why does matching stop at 6 when counting goes to 10?",
          a: "Because when counting you point at each item, and reaching ten that way is fine. In matching the groups are the answer buttons, and a five-year-old cannot tell 7 from 8 at a glance. Above 6 it would be guessing.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between questions." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "The right answer is shown and the game moves on. No score drops and the same question does not repeat, because a stuck child gains nothing from that.",
        },
        {
          q: "Is there a timer?",
          a: "No. Counting on fingers takes as long as it takes, which is exactly how children count.",
        },
        {
          q: "How is the record measured?",
          a: "By your longest run of correct answers, where higher is better. With 3 options per question a blind guess is worth 33.3%, so a long run does not happen by accident.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["math", "maths", "counting", "addition", "multiplication", "kids learning"],
    },
    es: {
      name: "Cuentas",
      metaTitle: "Matemáticas - juego gratis de contar a multiplicar | Ellaz",
      metaDescription:
        "Juego de matemáticas gratis para niños. 7 niveles, de contar a multiplicar, con 3 respuestas por pregunta. Sin reloj y sin registro.",

      lede: "Un juego de matemáticas gratuito para niños. 7 niveles que empiezan antes de que un niño conozca ninguna cifra y terminan en la multiplicación, con 3 respuestas para elegir y sin reloj por ninguna parte.",

      body: [
        "Una pregunta arriba. 3 respuestas abajo. Tocas la correcta.",

        "La escalera de aquí cruza una frontera de verdad a mitad de camino, y eso es lo que la hace poco común. Los tres primeros niveles son previos a la aritmética: cuenta las manzanas, empareja un número con un grupo, cuenta los dibujos. Un niño que no reconoce el símbolo 4 puede contar cuatro manzanas y ganar. Los cuatro últimos son aritmética de verdad, hasta 5, hasta 10, hasta 20 y multiplicar, y ahí sí hay que leer símbolos. Cruzar de un lado al otro es el salto auténtico de las matemáticas tempranas, y la mayoría de las aplicaciones sencillamente empiezan después de él.",

        "Hay un detalle en el nivel de emparejar que merece explicación, porque parece un error. Contar llega hasta 10 y emparejar se para en 6, aunque cubran el mismo terreno. El motivo: al contar, un niño va señalando cada cosa y llegar a diez así no tiene ningún problema, pero al emparejar los grupos son los propios botones de respuesta, y un niño de cinco años no distingue un grupo de 7 de uno de 8 de un vistazo. Por encima de 6 se convertiría en adivinar.",

        "3 respuestas por pregunta significa que adivinar a ciegas vale un 33,3%. Suficiente para que un niño nunca se quede completamente atascado, y poco para que una racha de diez aciertos no salga por casualidad.",

        "No hay reloj ni puntuación que baje. Una respuesta equivocada enseña la correcta y pasa a otra, porque un niño de cinco años atascado en una pregunta no gana absolutamente nada si le obligan a intentarla otra vez.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Hay 7: contar, emparejar, dibujos, hasta 5, hasta 10, hasta 20 y multiplicar." },
        { title: "Lee la pregunta", body: "Sale grande, y también en dibujos en los niveles previos a la aritmética." },
        { title: "Elige una respuesta", body: "3 opciones. Un toque." },
        { title: "Sigue", body: "Otra pregunta al momento. Tu racha se cuenta, y un fallo la reinicia sin castigo." },
      ],

      tips: [
        {
          title: "Empieza antes de la aritmética",
          body: "Los 3 primeros niveles no piden leer ninguna cifra. Un niño que todavía no ha llegado ahí ya puede jugar.",
        },
        {
          title: "Contad en voz alta",
          body: "En los niveles de dibujos, un dedo en cada cosa y un número dicho. Así es como cuentan los niños de verdad.",
        },
        {
          title: "Descarta antes de elegir",
          body: "De 3 respuestas, normalmente hay una claramente equivocada. Quitarla deja una elección entre dos.",
        },
        {
          title: "No corráis a multiplicar",
          body: "Aquí la multiplicación llega hasta 5 por 5. Merece la pena llegar cuando el hasta 20 sea fácil, no antes.",
        },
      ],

      teaches: [
        { title: "Contar", body: "3 niveles enteros van de contar cosas reales antes de que exista ningún símbolo." },
        { title: "Entender la cantidad", body: "Emparejar un número con un grupo es lo que convierte el símbolo 4 en significar cuatro cosas." },
        { title: "Sumar y restar", body: "3 rangos, hasta 5, 10 y 20, así que se avanza al ritmo del niño." },
        {
          title: "Primera multiplicación",
          body: "Hasta 5 por 5. Lo justo para entender qué hace multiplicar, sin ninguna tabla que memorizar.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Contar y dibujos. Ninguno de los dos niveles pide reconocer cifras." },
        { title: "5 a 6", body: "Emparejar y después hasta 5. Aquí es donde la aritmética se vuelve aritmética." },
        { title: "7 a 8", body: "Hasta 10 y hasta 20." },
        {
          title: "9 en adelante",
          body: "Multiplicar. El rango es pequeño a propósito, así que esto es una introducción y no machaque.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin teclear en ningún momento. Los 3 botones de respuesta son grandes y están bien separados. Las preguntas salen en cifras y, en los primeros niveles, también en dibujos que se pueden contar, así que un niño que todavía no lee números juega por los dibujos. No hay reloj sobre la respuesta, de modo que contar con los dedos lleva lo que lleve. Nada parpadea y se juega entero en silencio. La ecuación va de izquierda a derecha incluso en hebreo, porque esa es la notación estándar.",

      together: [
        { title: "Contad con los dedos juntos", body: "En los niveles de dibujos, contad en voz alta los dos. Así aprenden a contar los niños." },
        {
          title: "Preguntad cómo lo ha sabido",
          body: "Después de un acierto, preguntadle cómo ha llegado ahí. La respuesta sorprende a veces.",
        },
        { title: "Fallad a propósito", body: "Un error de un adulto que un niño corrige vale por diez aciertos suyos." },
        {
          title: "Matemáticas sin pantalla",
          body: "La misma pregunta con los dedos o con manzanas en la mesa. El juego entrena, no enseña él solo.",
        },
      ],

      faq: [
        {
          q: "¿El juego de matemáticas es gratis?",
          a: "Del todo. Nada que pagar y ninguna compra dentro del juego. Todos los niveles están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y no pedimos ningún correo.",
        },
        {
          q: "¿A qué edad se puede empezar?",
          a: "Sobre los tres años. 3 de los 7 niveles no piden reconocer ninguna cifra, solo contar dibujos, así que un niño que no conoce los números escritos puede jugar a esos.",
        },
        {
          q: "¿Por qué emparejar se para en 6 si contar llega a 10?",
          a: "Porque al contar vas señalando cada cosa y llegar a diez así va bien. Al emparejar los grupos son los botones de respuesta, y un niño de cinco años no distingue 7 de 8 de un vistazo. Por encima de 6 sería adivinar.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre pregunta y pregunta." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Qué pasa cuando la respuesta es incorrecta?",
          a: "Se enseña la correcta y el juego pasa a otra. No baja ninguna puntuación y la misma pregunta no se repite, porque un niño atascado no gana nada con eso.",
        },
        {
          q: "¿Hay cronómetro?",
          a: "No. Contar con los dedos lleva lo que lleve, que es exactamente como cuentan los niños.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por tu racha más larga de aciertos, donde más es mejor. Con 3 opciones por pregunta, adivinar a ciegas vale un 33,3%, así que una racha larga no sale por casualidad.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["matemáticas", "contar", "sumar", "multiplicar", "cálculo", "aprender jugando"],
    },
  },

  provenance: [
    {
      claim: "7 levels: count 1-10, match 1-6, pictures 1-10, addsub to 5, to 10, to 20, and multiplication to 5x5",
      source: "src/games/math/logic.ts",
    },
    {
      claim: "3 answer choices per question, so a blind guess is worth 33.3%",
      source: "src/games/math/logic.ts",
    },
    {
      claim: "match stops at 6 because groups are the answer buttons and 7 cannot be told from 8 at a glance",
      source: "src/games/math/logic.ts",
    },
  ],
};
