import type { GameContent } from "../types";

/**
 * The page where the fairness rule is the statistic.
 *
 * The total study window GROWS with the board while the per-item budget
 * SHRINKS, and that split is the whole difficulty design: you cannot encode six
 * characters in the time it takes to encode three, so the total has to grow, but
 * the per-item budget falling from 2.33s to 1.5s is what makes hard hard.
 * `scripts/sim/thinking-levels.mjs` throws rather than printing if a retune ever
 * pushes a level below the declared floor.
 */
export const vanish: GameContent = {
  id: "vanish",

  copy: {
    he: {
      metaTitle: "מה נעלם - משחק זיכרון חזותי לילדים | Ellaz",
      metaDescription:
        "משחק זיכרון חינם לילדים. מסתכלים על כמה דברים, שמיכה יורדת, ואחד נעלם. שלוש רמות, בלי הרשמה.",

      lede: "משחק זיכרון חינם לילדים. כמה דברים מופיעים על המסך, שמיכה מכסה אותם לרגע, ואז חוזרים בלי אחד. השאלה היחידה היא מה נעלם.",

      body: [
        "כמה דברים על המסך. שמיכה יורדת. משהו חסר.",

        "וכאן יש כלל הוגנות שאפשר למדוד, וששווה להסביר. זמן ההסתכלות גדל עם הלוח: שבע שניות לשלושה פריטים, שמונה לארבעה, תשע לשישה. אבל התקציב לכל פריט יורד, מ-2.33 שניות ל-2 ול-1.5. זה בדיוק ההפך ממה שמשחק זיכרון עצלן היה עושה, כלומר לתת אותן שבע שניות לשישה פריטים ולקרוא לזה קשה. אי אפשר לקודד שישה דברים בזמן שלוקח לקודד שלושה, אז הזמן הכולל חייב לגדול. מה שהופך את הקשה לקשה הוא התקציב לכל פריט, ויש לו רצפה של שנייה וחצי שאף רמה לא יורדת מתחתיה.",

        "הסיבה לרצפה היא שהמשחק הזה הוא מבחן זיכרון ולא מבחן מהירות. ילד בן חמש שמקבל פחות משנייה וחצי לפריט לא נכשל בזיכרון, הוא פשוט לא הספיק להסתכל, וזה מודד משהו אחר לגמרי.",

        "הרמות משנות כמה דברים יש: שלושה, ארבעה או שישה. ניחוש עיוור שווה 33.3%, 25% ו-16.7% בהתאמה, אז גם ברמה הקשה ילד שמנחש יצדק פעם בשש, מספיק כדי לא לתקוע אותו לגמרי.",

        "הלוח מוצג משמאל לימין גם בעברית. המיקומים כאן הם חלק מהשאלה, ולוח שהתהפך היה משנה את מה שהילד זכר.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "שלושה, ארבעה או שישה פריטים. הזמן הכולל גדל עם הלוח." },
        { title: "מסתכלים", body: "שבע עד תשע שניות של הסתכלות. אין מה למהר, אין מה ללחוץ." },
        { title: "מחכות לשמיכה", body: "היא מכסה את הלוח לרגע קצר, ואז מתרוממת." },
        { title: "אומרים מה נעלם", body: "נוגעים בפריט החסר מתוך האפשרויות. טעות לא עולה כלום." },
      ],

      tips: [
        {
          title: "לומר בקול מה יש",
          body: "תפוח, כלב, כדור. אמירה של הרשימה בקול מוסיפה זיכרון מילולי על גבי החזותי, וזה מכפיל את הסיכוי.",
        },
        {
          title: "לזכור לפי מקום",
          body: "לא מה היה אלא איפה. הרבה ילדים מגלים שקל להם יותר לזכור פינה ריקה מאשר חפץ חסר.",
        },
        {
          title: "לנצל את כל הזמן",
          body: "אין בונוס על להסתכל פחות. תשע שניות זה תשע שניות, ורוב הילדים מסתכלים שלוש.",
        },
        {
          title: "להתחיל בשלושה",
          body: "שלושה פריטים נשמעים מעט ובגיל ארבע זה בדיוק המספר הנכון. שישה זה קפיצה גדולה.",
        },
      ],

      teaches: [
        { title: "זיכרון חזותי לטווח קצר", body: "להחזיק תמונה שלמה בראש לכמה שניות זו המיומנות שנמדדת פה, ורק היא." },
        { title: "סריקה שיטתית", body: "ילד שמסתכל לפי סדר זוכר יותר מילד שקופץ. המשחק מלמד את זה מעצמו." },
        { title: "אוצר מילים", body: "כל סיבוב מציג כמה חפצים או חיות, וילדים אומרים את השמות בקול." },
        {
          title: "לשים לב לחסר",
          body: "לזהות מה איננו קשה יותר מלזהות מה יש, וזו דרך חשיבה שימושית מאוד.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "שלושה פריטים, ורצוי יחד בהתחלה. בגיל הזה גם שניים נכונים זה מצוין." },
        { title: "5 עד 6", body: "ארבעה. פה מתחילים לומר את הרשימה בקול בלי שביקשו." },
        { title: "7 ומעלה", body: "שישה, עם שנייה וחצי לכל אחד. זה כבר מאתגר גם מבוגרים." },
        {
          title: "מבוגרים",
          body: "שישה פריטים בתשע שניות זה קל, עד שמנסים בסוף יום ארוך. אז זה פתאום לא.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. הפריטים גדולים ומרווחים, ואף אחד לא מסתיר אחר. הזיהוי הוא לפי צורת החפץ ולא לפי צבע, אז עיוורון צבעים לא משפיע. אין שעון על התשובה עצמה, רק על ההסתכלות, ולזה יש רצפה של שנייה וחצי לכל פריט שאף רמה לא יורדת מתחתיה. השמיכה יורדת בתנועה אחת חלקה ולא בהבהוב. אפשר לשחק בשקט מוחלט.",

      together: [
        { title: "לומר את הרשימה בקול", body: "ביחד, לפני שהשמיכה יורדת. פתאום שניכם זוכרים יותר." },
        {
          title: "המשחק על השולחן",
          body: "שימו חמישה חפצים אמיתיים, כסו במגבת, והוציאו אחד. אותו משחק בדיוק, בלי מסך.",
        },
        { title: "הילד בוחר", body: "תנו לו לבחור מה נעלם ואתם תנחשו. הצד השני קשה יותר משנדמה." },
        {
          title: "לזכור בסדר",
          body: "אתגר נוסף: אחרי שהשמיכה ירדה, נסו למנות את כל הפריטים לפי הסדר משמאל לימין.",
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
          q: "כמה זמן יש להסתכל?",
          a: "שבע שניות לשלושה פריטים, שמונה לארבעה ותשע לשישה. הזמן הכולל גדל עם הלוח, כי אי אפשר לקודד שישה דברים בזמן שלוקח לקודד שלושה.",
        },
        {
          q: "המשחק נעשה מהיר מדי ברמה הקשה?",
          a: "יש רצפה של שנייה וחצי לכל פריט שאף רמה לא יורדת מתחתיה. זה מבחן זיכרון ולא מבחן מהירות, וילד שלא הספיק להסתכל לא נכשל בזיכרון.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "כלום. אין ניקוד שיורד ואין חיים. הסיבוב הבא מתחיל וממשיכים.",
        },
        {
          q: "למה הלוח לא מתהפך בעברית?",
          a: "כי המיקומים הם חלק מהשאלה. ילד שזוכר שהכלב היה בפינה השמאלית צריך למצוא אותו שם גם אחרי שהשמיכה עלתה.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, עם שלושה פריטים. אין קריאה בשום מקום וצריך רק לזהות חפצים מוכרים.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["זיכרון", "מה נעלם", "חזותי", "ריכוז", "לגיל הרך", "משחק חשיבה"],
    },

    en: {
      metaTitle: "What Disappeared - Visual Memory Game for Kids | Ellaz",
      metaDescription:
        "A free visual memory game for children. Study a few things, a blanket covers them, one is gone. Three levels, no signup.",

      lede: "A free memory game for children. A few things appear, a blanket covers them for a moment, and they come back with one missing. The only question is which one.",

      body: [
        "A few things on screen. The blanket falls. Something is gone.",

        "There is a fairness rule here that can be measured, and it is worth explaining. The study window grows with the board: seven seconds for three items, eight for four, nine for six. The per-item budget falls, though, from 2.33 seconds to 2 to 1.5. That is the opposite of what a lazy memory game would do, which is to give six items the same seven seconds and call it hard. You cannot encode six things in the time it takes to encode three, so the total has to grow. What makes hard hard is the per-item budget, and it has a floor of a second and a half that no level goes below.",

        "The floor exists because this is a memory test and not a speed test. A five-year-old given less than a second and a half per item has not failed at remembering, they have failed to finish looking, and that measures something else entirely.",

        "The levels change how many things there are: three, four or six. A blind guess is worth 33.3%, 25% and 16.7% respectively, so even on hard a child who guesses is right one time in six. Enough to keep them from getting stuck.",

        "The board runs left to right even in Hebrew. Positions are part of the question here, and a mirrored board would change what the child had memorised.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Three, four or six items. The total time grows with the board." },
        { title: "Study", body: "Seven to nine seconds of looking. Nothing to rush and nothing to press." },
        { title: "Wait for the blanket", body: "It covers the board briefly, then lifts." },
        { title: "Say what went", body: "Touch the missing item among the choices. A mistake costs nothing." },
      ],

      tips: [
        {
          title: "Say the list out loud",
          body: "Apple, dog, ball. Naming them adds a verbal memory on top of the visual one, which roughly doubles the odds.",
        },
        {
          title: "Remember by position",
          body: "Not what was there but where. Many children find an empty corner easier to notice than a missing object.",
        },
        {
          title: "Use all the time",
          body: "There is no bonus for looking less. Nine seconds is nine seconds, and most children look for three.",
        },
        {
          title: "Start with three",
          body: "Three items sounds like very few and at four years old it is exactly right. Six is a big jump.",
        },
      ],

      teaches: [
        { title: "Short-term visual memory", body: "Holding a whole picture in your head for a few seconds is the skill measured here, and the only one." },
        { title: "Systematic scanning", body: "A child who looks in order remembers more than one who jumps around. The game teaches that by itself." },
        { title: "Vocabulary", body: "Each round shows several objects or animals, and children name them out loud unprompted." },
        {
          title: "Noticing an absence",
          body: "Spotting what is not there is harder than spotting what is, and it is a genuinely useful habit of mind.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Three items, ideally together at first. Two correct is excellent at this age." },
        { title: "5 to 6", body: "Four. This is when they start reciting the list out loud without being asked." },
        { title: "7 and up", body: "Six, at a second and a half each. That challenges adults too." },
        {
          title: "Adults",
          body: "Six items in nine seconds is easy until you try it at the end of a long day. Then it suddenly is not.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. Items are large and well spaced, and none hides another. Recognition is by object shape rather than colour, so colour blindness has no effect. There is no clock on the answer itself, only on the studying, and that has a floor of a second and a half per item that no level goes below. The blanket falls in one smooth movement rather than a flash. The whole game plays in silence.",

      together: [
        { title: "Recite the list", body: "Together, before the blanket falls. You both suddenly remember more." },
        {
          title: "Play it on the table",
          body: "Put five real objects down, cover with a towel, remove one. Exactly the same game with no screen.",
        },
        { title: "Let them choose", body: "They pick what disappears and you guess. The other side is harder than it looks." },
        {
          title: "Recall in order",
          body: "An extra challenge: after the blanket falls, try naming every item in order from left to right.",
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
          q: "How long is there to study?",
          a: "Seven seconds for three items, eight for four and nine for six. The total grows with the board, because you cannot encode six things in the time it takes to encode three.",
        },
        {
          q: "Does the hard level get too fast?",
          a: "There is a floor of a second and a half per item that no level goes below. This is a memory test rather than a speed test, and a child who did not finish looking has not failed at remembering.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "Nothing. No score drops and there are no lives. The next round starts and play continues.",
        },
        {
          q: "Why does the board not mirror in Hebrew?",
          a: "Because the positions are part of the question. A child who remembers the dog was in the left corner needs to find it there when the blanket lifts.",
        },
        {
          q: "What age is this for?",
          a: "From about three with three items. There is no reading anywhere and the only requirement is recognising familiar objects.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["memory", "what disappeared", "visual memory", "concentration", "preschool", "attention"],
    },
    es: {
      metaTitle: "¿Qué falta? - memoria visual para niños | Ellaz",
      metaDescription:
        "Juego gratis de memoria visual para niños. Miras unas cosas, una manta las tapa y falta una. Tres niveles, sin registro.",

      lede: "Un juego de memoria gratuito para niños. Aparecen unas cuantas cosas, una manta las tapa un momento, y vuelven con una menos. La única pregunta es cuál.",

      body: [
        "Unas cosas en pantalla. Cae la manta. Falta algo.",

        "Aquí hay una regla de justicia que se puede medir, y merece explicación. La ventana para mirar crece con el tablero: siete segundos para tres cosas, ocho para cuatro, nueve para seis. El presupuesto por cosa baja, en cambio, de 2,33 segundos a 2 y a 1,5. Eso es lo contrario de lo que haría un juego de memoria perezoso, que sería dar a seis cosas los mismos siete segundos y llamarlo difícil. No se pueden guardar seis cosas en el tiempo que cuesta guardar tres, así que el total tiene que crecer. Lo que hace difícil al difícil es el presupuesto por cosa, y tiene un suelo de segundo y medio por debajo del cual no baja ningún nivel.",

        "Ese suelo existe porque esto es una prueba de memoria y no de velocidad. Un niño de cinco años al que le dan menos de segundo y medio por cosa no ha fallado en recordar, ha fallado en terminar de mirar, y eso mide algo completamente distinto.",

        "Los niveles cambian cuántas cosas hay: tres, cuatro o seis. Adivinar a ciegas vale un 33,3%, un 25% y un 16,7% respectivamente, así que incluso en difícil un niño que adivina acierta una de cada seis veces. Lo justo para que no se quede atascado.",

        "El tablero va de izquierda a derecha incluso en hebreo. Aquí las posiciones forman parte de la pregunta, y un tablero reflejado cambiaría lo que el niño acababa de memorizar.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Tres, cuatro o seis cosas. El tiempo total crece con el tablero." },
        { title: "Mira", body: "De siete a nueve segundos mirando. Nada que correr y nada que pulsar." },
        { title: "Espera la manta", body: "Tapa el tablero un momento y se levanta." },
        { title: "Di qué se fue", body: "Toca la cosa que falta entre las opciones. Fallar no cuesta nada." },
      ],

      tips: [
        {
          title: "Di la lista en voz alta",
          body: "Manzana, perro, pelota. Nombrarlas añade una memoria verbal encima de la visual, lo que más o menos dobla las probabilidades.",
        },
        {
          title: "Recuerda por posición",
          body: "No qué había sino dónde. A muchos niños les resulta más fácil notar una esquina vacía que un objeto que falta.",
        },
        {
          title: "Usa todo el tiempo",
          body: "No hay ninguna bonificación por mirar menos. Nueve segundos son nueve segundos, y la mayoría de los niños miran tres.",
        },
        {
          title: "Empieza con tres",
          body: "Tres cosas suenan a muy pocas y a los cuatro años son exactamente las que tocan. Seis es un salto grande.",
        },
      ],

      teaches: [
        { title: "Memoria visual a corto plazo", body: "Sostener una imagen entera en la cabeza unos segundos es la habilidad que se mide aquí, y la única." },
        { title: "Mirar con método", body: "Un niño que mira en orden recuerda más que uno que va dando saltos. El juego lo enseña solo." },
        { title: "Vocabulario", body: "Cada ronda enseña varios objetos o animales, y los niños los nombran en voz alta sin que nadie se lo pida." },
        {
          title: "Notar una ausencia",
          body: "Ver lo que no está cuesta más que ver lo que sí, y es una costumbre mental de verdad útil.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Tres cosas, y a poder ser acompañados al principio. Dos aciertos son excelentes a esta edad." },
        { title: "5 a 6", body: "Cuatro. Aquí es cuando empiezan a recitar la lista en voz alta sin que nadie se lo pida." },
        { title: "7 en adelante", body: "Seis, a segundo y medio cada una. Eso también reta a un adulto." },
        {
          title: "Adultos",
          body: "Seis cosas en nueve segundos es fácil hasta que lo probáis al final de un día largo. Entonces de repente no lo es.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. Las cosas son grandes y están bien separadas, y ninguna tapa a otra. Se reconocen por la forma del objeto y no por el color, así que el daltonismo no influye. No hay reloj sobre la respuesta, solo sobre el rato de mirar, y ese tiene un suelo de segundo y medio por cosa que ningún nivel baja. La manta cae en un movimiento suave y no en un destello. El juego entero se juega en silencio.",

      together: [
        { title: "Recitad la lista", body: "Juntos, antes de que caiga la manta. De repente los dos recordáis más." },
        {
          title: "Jugadlo en la mesa",
          body: "Poned cinco objetos de verdad, tapadlos con una toalla y quitad uno. Exactamente el mismo juego sin pantalla.",
        },
        { title: "Que elijan ellos", body: "Él elige qué desaparece y tú adivinas. El otro lado cuesta más de lo que parece." },
        {
          title: "Recordad en orden",
          body: "Un reto extra: cuando caiga la manta, intentad nombrar todas las cosas en orden de izquierda a derecha.",
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
          q: "¿Cuánto tiempo hay para mirar?",
          a: "Siete segundos para tres cosas, ocho para cuatro y nueve para seis. El total crece con el tablero, porque no se pueden guardar seis cosas en el tiempo que cuesta guardar tres.",
        },
        {
          q: "¿El nivel difícil se pone demasiado rápido?",
          a: "Hay un suelo de segundo y medio por cosa que ningún nivel baja. Esto es una prueba de memoria y no de velocidad, y un niño que no terminó de mirar no ha fallado en recordar.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Qué pasa si la respuesta es incorrecta?",
          a: "Nada. No baja ninguna puntuación y no hay vidas. Empieza la ronda siguiente y se sigue jugando.",
        },
        {
          q: "¿Por qué el tablero no se refleja en hebreo?",
          a: "Porque las posiciones forman parte de la pregunta. Un niño que recuerda que el perro estaba en la esquina izquierda necesita encontrarlo ahí cuando se levante la manta.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos tres años con tres cosas. No se lee nada y lo único que hace falta es reconocer objetos conocidos.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["memoria", "qué falta", "memoria visual", "concentración", "infantil", "atención"],
    },
  },

  provenance: [
    {
      claim: "study windows of 7s, 8s and 9s for 3, 4 and 6 items, giving 2.33s, 2s and 1.5s per item",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "a floor of 1.5 seconds per item and 5 seconds overall that no level may go below",
      source: "src/games/vanish/logic.ts",
    },
    {
      claim: "a blind guess is worth 33.3%, 25% and 16.7% by level",
      source: "scripts/sim/thinking-levels.mjs",
    },
  ],
};
