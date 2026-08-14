import type { GameContent } from "../types";

/**
 * The page whose admission is a content limit rather than a difficulty warning:
 * there are 6 scenes and 30 differences in total, and a regular player will see
 * them again. Saying so is better than a parent discovering it in week two and
 * concluding the game is broken.
 *
 * It also carries the trap worth documenting: the record counts CUMULATIVE
 * scenes cleared, not the "Level" the game displays. Level only bumps after a
 * full pass through all four, so recording that would leave most players a
 * permanent record of 1.
 */
export const finddiff: GameContent = {
  id: "finddiff",

  copy: {
    he: {
      metaTitle: "מצא את ההבדלים - משחק חינם לילדים | Ellaz",
      metaDescription:
        "משחק מצא את ההבדלים חינם לילדים. שתי תמונות כמעט זהות, ומוצאים מה שונה. בלי שעון ובלי הרשמה.",

      lede: "משחק מצא את ההבדלים חינם. שתי תמונות שנראות זהות, וכמה דברים קטנים שונים בין אחת לשנייה. בלי שעון, בלי עונש על טעות, ובלי דרך להיתקע.",

      body: [
        "שתי תמונות זו לצד זו. משהו שונה. נוגעים בו.",

        "וההודאה שלנו, כי עדיף שתדעו מראש מאשר תגלו בשבוע השני: יש כרגע 6 סצנות עם 30 הבדלים בסך הכול. ילד שמשחק בקביעות יראה את הגינה ואת עולם המים שוב, ואת ההבדל שכבר מצא הוא ימצא מהר יותר בפעם השנייה. זה משחק תוכן, וכמות התוכן היא בדיוק מה שיש. אנחנו מוסיפים סצנות, וברגע שנוסיף אחת היא תגיע לכל מי שכבר משחק בלי שיצטרך לעשות כלום.",

        "בינתיים זה עדיין עובד בזכות שני דברים. ההבדלים מפוזרים אחרת בכל סיבוב, וילדים בני ארבע לא זוכרים בין יום ליום איפה היה הפרפר. בגיל שבע כן זוכרים, וזו הסיבה שהמשחק הזה טוב יותר לילדים קטנים.",

        "אין שעון בכלל, ואין עונש על נגיעה במקום הלא נכון. אפשר לחפש דקה שלמה, לוותר על הבדל אחד ולהמשיך, ולנסות שוב אחר כך. השלבים ממשיכים בלי סוף ומה שנשמר הוא כמה סצנות ניקיתם בסך הכול.",

        "והמספר הזה הוא סצנות ולא שלבים, בכוונה. המסך מציג שלב, אבל השלב עולה רק אחרי מעבר מלא על כל 6 הסצנות. לשמור את זה כשיא היה משאיר לרוב המשחקים שיא של 1 לתמיד, וזה מספר שלא אומר שום דבר.",
      ],

      howToPlay: [
        { title: "מסתכלים על שתי התמונות", body: "הן כמעט זהות. כמעט." },
        { title: "מוצאים הבדל", body: "צבע שונה, פריט חסר, משהו שזז. 5 הבדלים לכל סצנה." },
        { title: "נוגעים בו", body: "נגיעה במקום הנכון מסמנת אותו. נגיעה במקום אחר לא עולה כלום." },
        { title: "מנקים את הסצנה", body: "כשמצאתם את כולם עוברים לסצנה הבאה, אוטומטית." },
      ],

      tips: [
        {
          title: "לסרוק לפי אזורים",
          body: "חלקו את התמונה בראש לארבעה רבעים ועברו עליהם בסדר. סריקה מסודרת מוצאת יותר מקפיצות.",
        },
        {
          title: "להשוות פריט מול פריט",
          body: "לא את כל התמונה בבת אחת. השמש מול השמש, הענן מול הענן. ההבדל קופץ מיד.",
        },
        {
          title: "לחפש מה חסר",
          body: "הבדלים מסוג חסר קשים יותר מהבדלים מסוג שונה, כי אין מה לתפוס את העין. שווה לחפש אותם במיוחד.",
        },
        {
          title: "לוותר ולחזור",
          body: "אין שעון, אז אפשר להסתכל על משהו אחר ולחזור. העין מוצאת דברים בפעם השנייה.",
        },
      ],

      teaches: [
        { title: "השוואה חזותית", body: "להחזיק שתי תמונות בראש ולהצליב ביניהן זו מיומנות אמיתית, וזה בדיוק מה שמתאמן." },
        { title: "סריקה שיטתית", body: "מי שסורק בסדר מוצא יותר. ילדים מגלים את זה לבד תוך שתי סצנות." },
        { title: "קשב לפרטים", body: "המשחק כולו הוא לשים לב לדבר הקטן, ולא לתמונה הגדולה." },
        {
          title: "התמדה",
          body: "הבדל אחרון תמיד לוקח זמן. בלי שעון ובלי עונש, ילדים ממשיכים לחפש במקום להתייאש.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "יחד בהתחלה. בגיל הזה גם הבדל אחד שנמצא לבד זה הישג." },
        { title: "5 עד 6", body: "לבד, וזה הגיל שהמשחק הזה הכי מתאים לו." },
        { title: "7 ומעלה", body: "עדיין כיף, אבל 15 ההבדלים נזכרים מהר. שווה לבוא לזה בהפסקות." },
        {
          title: "הורים",
          body: "זה משחק טוב לשניים, כי מי שמוצא ראשון לא לוקח כלום ממי שעדיין מחפש.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. אזורי הנגיעה גדולים מהפריט עצמו, אז נגיעה קרובה מספיקה ואין צורך לפגוע במדויק. חלק מההבדלים הם צבע וחלק צורה או נוכחות, אז ילד שלא מפריד בין גוונים עדיין מוצא את רובם. אין שעון, אין ספירה לאחור ואין הבהובים, ואפשר לחפש כמה זמן שרוצים. אין מילה אחת שצריך לקרוא כדי לשחק.",

      together: [
        { title: "מי מוצא ראשון", body: "שניכם על אותו מסך. מי שמוצא ראשון לא לוקח כלום ממי שממשיך לחפש." },
        {
          title: "לתאר במקום להצביע",
          body: "מצאתם הבדל? תארו אותו במילים במקום לגעת. פתאום זה תרגיל שפה.",
        },
        { title: "לספור לפני", body: "נחשו כמה הבדלים יש בסצנה לפני שמתחילים, ואז בדקו." },
        {
          title: "רמז אחד",
          body: "כשילד נתקע, אמרו רק באיזה חצי של התמונה זה נמצא. זה מספיק כמעט תמיד.",
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
          q: "כמה סצנות יש?",
          a: "6 סצנות עם 30 הבדלים בסך הכול. זה משחק תוכן, אז ילד שמשחק בקביעות יראה אותן שוב. אנחנו מוסיפים עוד, וסצנה חדשה מגיעה אליכם בלי שתעשו כלום.",
        },
        {
          q: "מה קורה כשנוגעים במקום הלא נכון?",
          a: "כלום. אין ניקוד שיורד, אין חיים ואין שעון שרץ. אפשר לגעת כמה שרוצים.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "יש שעון או לחץ זמן?",
          a: "אין בכלל. אפשר לחפש הבדל אחד חמש דקות, וזה בדיוק מה שילדים בני ארבע עושים.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בכמה סצנות ניקיתם בסך הכול, כשיותר זה טוב יותר. המסך מציג גם שלב, אבל השלב עולה רק אחרי מעבר מלא על כל 6 הסצנות, ולכן הוא לא המספר שנשמר.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, יחד עם מבוגר, ולבד מגיל חמש. אין קריאה בשום מקום במשחק.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["מצא את ההבדלים", "השוואה", "תשומת לב", "לגיל הרך", "משחק צפייה", "פרטים"],
    },

    en: {
      metaTitle: "Find the Differences - Free Game for Kids | Ellaz",
      metaDescription:
        "A free spot the difference game for children. Two nearly identical pictures, find what changed. No clock and no signup.",

      lede: "A free spot the difference game. Two pictures that look the same, with a few small things changed between them. No clock, no penalty for a wrong touch, and no way to get stuck.",

      body: [
        "Two pictures side by side. Something is different. Touch it.",

        "Here is our admission, and you should have it up front rather than discover it in week two. There are currently 6 scenes with 30 differences between them. A child playing regularly will see the garden and the underwater scene again, and a difference they already found will come faster the second time. This is a content game, and the amount of content is exactly what it is. We add scenes, and a new one reaches everybody already playing without them doing anything.",

        "In the meantime it still works, for two reasons. The differences sit in different places each round, and four-year-olds do not remember from one day to the next where the butterfly was. Seven-year-olds do, which is why this game suits younger children better.",

        "There is no clock at all and no penalty for touching the wrong spot. You can search for a full minute, give up on one difference and come back to it, and try again later. Levels continue without end and what gets kept is how many scenes you cleared in total.",

        "That number counts scenes rather than levels, deliberately. The screen shows a level, but the level only goes up after a full pass through all 6 scenes. Storing that as the record would leave most players on 1 forever, which is a number that says nothing.",
      ],

      howToPlay: [
        { title: "Look at both pictures", body: "They are nearly identical. Nearly." },
        { title: "Find a difference", body: "A changed colour, a missing item, something moved. 5 per scene." },
        { title: "Touch it", body: "Touching the right spot marks it. Touching anywhere else costs nothing." },
        { title: "Clear the scene", body: "Find them all and the next scene arrives automatically." },
      ],

      tips: [
        {
          title: "Scan by quarters",
          body: "Divide the picture into four in your head and work through them in order. Systematic beats jumping around.",
        },
        {
          title: "Compare item against item",
          body: "Not the whole picture at once. Sun against sun, cloud against cloud. The difference jumps straight out.",
        },
        {
          title: "Hunt for what is missing",
          body: "Missing things are harder than changed things, because there is nothing to catch the eye. Worth looking for specifically.",
        },
        {
          title: "Leave it and come back",
          body: "No clock, so look at something else and return. Eyes find things on the second pass.",
        },
      ],

      teaches: [
        { title: "Visual comparison", body: "Holding two pictures in mind and cross-checking them is a real skill, and it is exactly what trains here." },
        { title: "Systematic scanning", body: "Scanning in order finds more. Children work that out themselves within two scenes." },
        { title: "Attention to detail", body: "The whole game is noticing the small thing rather than the big picture." },
        {
          title: "Persistence",
          body: "The last difference always takes a while. With no clock and no penalty, children keep looking instead of giving up.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Together at first. One difference found unaided is an achievement at this age." },
        { title: "5 to 6", body: "Alone, and this is the age the game suits best." },
        { title: "7 and up", body: "Still fun, but 30 differences get memorised quickly. Better in occasional visits." },
        {
          title: "Parents",
          body: "A good two-person game, because whoever finds one first takes nothing away from whoever is still looking.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. The touch areas are larger than the items themselves, so being close is enough and precision is not required. Some differences are colour and others are shape or presence, so a child who does not separate hues still finds most of them. No clock, no countdown and nothing flashing, and you can search for as long as you like. There is not one word to read to play.",

      together: [
        { title: "Who finds it first", body: "Both of you on one screen. Finding one first takes nothing away from the other." },
        {
          title: "Describe instead of pointing",
          body: "Found something? Describe it in words rather than touching. It becomes a language exercise.",
        },
        { title: "Count first", body: "Guess how many differences the scene holds before you start, then check." },
        {
          title: "One hint only",
          body: "When a child is stuck, tell them only which half of the picture it is in. That is almost always enough.",
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
          q: "How many scenes are there?",
          a: "6 scenes with 30 differences in total. This is a content game, so a child playing regularly will see them again. We add more, and a new scene reaches you without you doing anything.",
        },
        {
          q: "What happens on a wrong touch?",
          a: "Nothing. No score drops, no lives, and no clock running. Touch as often as you like.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Is there a timer or time pressure?",
          a: "None at all. You can spend five minutes on one difference, which is exactly what four-year-olds do.",
        },
        {
          q: "How is the record measured?",
          a: "By how many scenes you cleared in total, where higher is better. The screen also shows a level, but that only goes up after a full pass through all 6 scenes, which is why it is not the number stored.",
        },
        {
          q: "What age is this for?",
          a: "From about three with an adult, and alone from five. There is no reading anywhere in the game.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["spot the difference", "find differences", "comparison", "attention", "preschool", "observation"],
    },
    es: {
      metaTitle: "Encuentra las diferencias - juego gratis | Ellaz",
      metaDescription:
        "Juego gratis de encontrar las diferencias para niños. Dos dibujos casi iguales, busca qué cambió. Sin reloj y sin registro.",

      lede: "Un juego gratuito de encontrar las diferencias. Dos dibujos que parecen iguales, con unas cuantas cosas pequeñas cambiadas entre ellos. Sin reloj, sin castigo por tocar donde no era, y sin forma de quedarse atascado.",

      body: [
        "Dos dibujos, uno al lado del otro. Algo cambia. Tócalo.",

        "Aquí va nuestra confesión, y preferimos dárosla por delante a que la descubráis en la segunda semana. Ahora mismo hay 6 escenas con 30 diferencias entre todas. Un niño que juegue a menudo va a volver a ver el jardín y la escena bajo el agua, y una diferencia que ya encontró le va a salir antes la segunda vez. Este es un juego de contenido, y la cantidad de contenido es exactamente la que es. Vamos añadiendo escenas, y una nueva llega a todo el que ya está jugando sin que tenga que hacer nada.",

        "Aun así funciona. Por dos motivos. Las diferencias caen en sitios distintos cada ronda, y los niños de cuatro años no se acuerdan de un día para otro de dónde estaba la mariposa. Los de siete sí, y por eso este juego les va mejor a los pequeños.",

        "No hay reloj de ningún tipo ni castigo por tocar donde no era. Puedes buscar un minuto entero, rendirte con una diferencia y volver a ella, y probar otra vez más tarde. Los niveles siguen sin final y lo que se guarda es cuántas escenas has completado en total.",

        "Ese número cuenta escenas y no niveles, a propósito. La pantalla enseña un nivel, pero el nivel solo sube después de una vuelta completa por las 6 escenas. Guardar eso como récord dejaría a casi todo el mundo en 1 para siempre, que es un número que no dice nada.",
      ],

      howToPlay: [
        { title: "Mira los dos dibujos", body: "Son casi idénticos. Casi." },
        { title: "Busca una diferencia", body: "Un color cambiado, algo que falta, algo movido. 5 por escena." },
        { title: "Tócala", body: "Tocar el sitio correcto la marca. Tocar en cualquier otro no cuesta nada." },
        { title: "Completa la escena", body: "Encuéntralas todas y la escena siguiente llega sola." },
      ],

      tips: [
        {
          title: "Repasa por cuartos",
          body: "Divide el dibujo en cuatro mentalmente y ve por ellos en orden. El método gana a ir dando saltos.",
        },
        {
          title: "Compara cosa contra cosa",
          body: "No el dibujo entero de golpe. Sol contra sol, nube contra nube. La diferencia salta sola.",
        },
        {
          title: "Busca lo que falta",
          body: "Las cosas que faltan cuestan más que las cambiadas, porque no hay nada que llame la atención. Merece la pena buscarlas aparte.",
        },
        {
          title: "Déjala y vuelve",
          body: "No hay reloj, así que mira otra cosa y vuelve. Los ojos encuentran cosas en la segunda pasada.",
        },
      ],

      teaches: [
        { title: "Comparación visual", body: "Sostener dos dibujos en la cabeza y cruzarlos es una habilidad de verdad, y es justo lo que se entrena aquí." },
        { title: "Rastreo con método", body: "Rastrear en orden encuentra más. Los niños lo descubren solos en dos escenas." },
        { title: "Atención al detalle", body: "El juego entero consiste en fijarse en lo pequeño y no en el conjunto." },
        {
          title: "Insistencia",
          body: "La última diferencia siempre tarda. Sin reloj y sin castigo, los niños siguen mirando en vez de rendirse.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Acompañados al principio. Una diferencia encontrada sin ayuda ya es un logro a esta edad." },
        { title: "5 a 6", body: "Solos, y esta es la edad a la que mejor le va el juego." },
        { title: "7 en adelante", body: "Sigue teniendo gracia, pero 30 diferencias se memorizan rápido. Mejor en visitas sueltas." },
        {
          title: "Padres",
          body: "Un buen juego para dos, porque quien encuentra una primero no le quita nada a quien sigue mirando.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. Las zonas que responden son más grandes que las propias cosas, así que basta con acercarse y no hace falta precisión. Unas diferencias son de color y otras de forma o de presencia, de modo que un niño que no separa tonos encuentra igualmente casi todas. Sin reloj, sin cuenta atrás y sin nada que parpadee, y se puede buscar todo el rato que se quiera. No hay ni una palabra que leer para jugar.",

      together: [
        { title: "Quién la ve antes", body: "Los dos en la misma pantalla. Encontrar una primero no le quita nada al otro." },
        {
          title: "Describid en lugar de señalar",
          body: "¿Has visto algo? Descríbelo con palabras en vez de tocarlo. Se convierte en un ejercicio de lenguaje.",
        },
        { title: "Contad primero", body: "Adivinad cuántas diferencias tiene la escena antes de empezar, y después comprobadlo." },
        {
          title: "Una sola pista",
          body: "Cuando un niño se atasque, decidle solo en qué mitad del dibujo está. Con eso basta casi siempre.",
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
          q: "¿Cuántas escenas hay?",
          a: "6 escenas con 30 diferencias en total. Es un juego de contenido, así que un niño que juegue a menudo las va a volver a ver. Vamos añadiendo más, y una escena nueva os llega sin que tengáis que hacer nada.",
        },
        {
          q: "¿Qué pasa si toco donde no era?",
          a: "Nada. No baja ninguna puntuación, no hay vidas y no corre ningún reloj. Toca las veces que quieras.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Hay cronómetro o presión de tiempo?",
          a: "Ninguna en absoluto. Podéis pasar cinco minutos con una sola diferencia, que es exactamente lo que hacen los niños de cuatro años.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por cuántas escenas has completado en total, donde más es mejor. La pantalla también enseña un nivel, pero ese solo sube tras una vuelta completa por las 6 escenas, y por eso no es el número que se guarda.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos tres años con un adulto, y solos a partir de los cinco. En el juego no se lee nada.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["encuentra las diferencias", "siete diferencias", "comparar", "atención", "infantil", "observación"],
    },
  },

  provenance: [
    {
      claim: "6 scenes with 30 differences in total, at 5 per scene",
      source: "src/games/finddiff/scenes.ts",
    },
    {
      claim: "the record counts cumulative scenes cleared, not the displayed level, which only advances after a full pass",
      source: ".claude/rules/score-contract-convention.md",
    },
  ],
};
