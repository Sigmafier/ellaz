import type { GameContent } from "../types";

/**
 * Merge - the endless one, and the page whose best number is arithmetic rather
 * than a simulation.
 *
 * A rung is made of two of the rung below, so the top of the ladder costs
 * 2^(rungs-1) of the bottom one. That is exact at any rung, it comes out of
 * `LADDER.length` and `tierPoints` rather than out of anybody's head, and it is
 * the honest answer to "can my child finish this". The tap counts beside it are
 * measured, by a bot driving the shipped reducer.
 *
 * Three languages, written natively rather than translated, so they open
 * differently and carry different asides. Same facts.
 *
 * Figures: `scripts/sim/merge-ladder.mjs` and the game's own code. See
 * `provenance` at the bottom.
 */
export const merge: GameContent = {
  id: "merge",

  copy: {
    he: {
      name: "שניים לאחד",
      metaTitle: "שניים לאחד - משחק חיבור חינם | Ellaz",
      metaDescription:
        "משחק חיבור חינמי בדפדפן. נוגעים בשני יצורים זהים והם הופכים לאחד גדול יותר, מזחל ועד דרקון. שלוש רמות, בלי הרשמה ובלי פרסומות.",

      lede: "משחק חיבור חינם בדפדפן, בנגיעה אחת. שני יצורים זהים נוגעים זה בזה והופכים ליצור אחד מהשלב הבא, מזחל ועד דרקון. סולם של 14 שלבים, ואף פעם לא נגמר.",

      body: [
        "נוגעים ביצור, נוגעים בזהה לו, ומקבלים אחד גדול יותר. זה כל המנגנון.",

        "הסולם הוא 14 שלבים וכל שלב עשוי משניים מזה שמתחתיו, אז את המחיר של הפסגה אפשר פשוט לחשב. דרקון אחד הוא 8,192 זחלים ו-8,191 חיבורים, והדרך אליו שווה 212,992 נקודות. המספרים האלה לא יצאו מהרצה אלא מהכלל עצמו, ולכן הם נכונים גם אם אף ילד בעולם לא הגיע לשם. באמצע הסולם זה נשמע הרבה יותר ידידותי: פרפר הוא ארבעה זחלים, צפרדע שמונה, ופינגווין 64.",

        "חיבור עולה שתי נגיעות, אחת להרים ואחת להניח, אז ספרנו נגיעות ולא חיבורים. בוט שמחבר תמיד את הזוג הקטן ביותר שהוא רואה הגיע לצפרדע הראשונה שלו אחרי 18 נגיעות בלוח הרגוע, ולאריה אחרי 1,530. דווקא בלוח העמוס זה לוקח לו יותר: 50 נגיעות לצפרדע ו-3,136 לאריה. הלוח שמזרים יצורים בחינם מזרים אותם קטנים, אז רוב העבודה חוזרת להתחלה של הסולם.",

        "ואת זה כדאי לדעת מראש: הפסגה לא בהישג יד. הלוויתן לבדו עלה לבוט 12,282 נגיעות, והדרקון רחוק ממנו עוד פי שניים. אף אחד לא מסיים אותו בערב. וזה בסדר. השיא נמדד בנקודות, והנקודות מגיעות בכל הדרך.",

        "אי אפשר כמעט להיתקע. לוח נתקע רק אם בכל משבצת שאינה דרקון יושב שלב אחר, ובלוח של 4 על 4 זה דורש שלושה דרקונים בבת אחת. עד אז תמיד נשאר זוג, ותמיד אפשר להוריד יצור חדש על משבצת ריקה. ב-150 הרצות שהרצנו אף אחת לא נתקעה.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "לוח רגוע 5 על 5, או לוח 4 על 4 שמזרים יצורים אחרי כל חיבור." },
        { title: "נוגעים במשבצת ריקה", body: "יצור חדש קטן נוחת שם. ככה מזינים את הלוח." },
        { title: "נוגעים ביצור", body: "הוא מורם ליד. נגיעה נוספת עליו מניחה אותו בחזרה." },
        { title: "נוגעים בתאום שלו", body: "השניים הופכים לאחד מהשלב הבא, והנקודות נכנסות." },
        { title: "ממשיכים לטפס", body: "כל שלב חדש שווה כפול מהקודם, וכל שלב שלישי מביא גם מטבע בפעם הראשונה שמגיעים אליו בריצה." },
      ],

      tips: [
        {
          title: "אל תפזרו קטנים",
          body: "כל זחל שמונח לבד תופס משבצת שלמה. עדיף להוריד שניים ולחבר אותם מיד מאשר להוריד חמישה ולחפש אחר כך.",
        },
        {
          title: "פינה אחת לגדולים",
          body: "החזיקו את היצורים הגדולים באותו אזור של הלוח. הם מחכים הכי הרבה זמן לתאום, וכשהוא מגיע קל למצוא אותם.",
        },
        {
          title: "הקטן קודם",
          body: "כשיש כמה זוגות אפשריים, חברו את הנמוך ביותר. זה משחרר משבצת עכשיו ומזין את השלב הבא ממילא.",
        },
        {
          title: "בלוח העמוס, אל תמלאו",
          body: "כל חיבור מחזיר לכם יצור או שניים, אז המשבצות מתמלאות בלעדיכם. שם כדאי לגעת בריק רק כשבאמת אין זוג.",
        },
      ],

      teaches: [
        { title: "הכפלה", body: "שניים עושים אחד, וזה אחד גדול פי שניים בשווי. ילד סופר את זה הרבה לפני שהוא יודע לקרוא לזה כפל." },
        { title: "סדר גודל", body: "הסולם מטפס לפי גודל, מזחל ועד דרקון, אז מי גדול ממי נקרא מהתמונה בלי מילה אחת." },
        { title: "ניהול מקום", body: "לוח של 16 משבצות נגמר מהר. איפה להניח משהו זו החלטה, לא פרט טכני." },
        { title: "הסתכלות קדימה", body: "חיבור אחד מכין את הבא. אחרי כמה ריצות מתחילים לראות שרשרת ולא צעד." },
      ],

      ages: [
        { title: "3 עד 4", body: "הלוח הרגוע. אין לחץ, אין מילוי, וההצלחה היא היצור החדש שהופיע." },
        { title: "5 עד 6", body: "אותו לוח, ועכשיו עם מטרה: להגיע לצפרדע. זה 18 נגיעות, וזה מרגיש כמו הישג." },
        { title: "7 ומעלה", body: "הלוחות שמזרימים יצורים. פה המקום נגמר וצריך להחליט איפה שמים דברים." },
        { title: "מבוגרים", body: "אריה זה כבר טיפוס אמיתי. לבוט שלנו זה לקח בין 1,010 ל-3,136 נגיעות, תלוי ברמה." },
      ],

      accessibility:
        "נגיעה, ועוד נגיעה. אין גרירה בשום מקום במשחק, וזה לא מקרה: ילד בן חמש בטלפון, וכל מי שמשתמש באמצעי קלט חלופי, לא מצליח להחזיק תנועה רציפה על המסך. המשבצות גדולות בכוונה, לפחות 2 על 2 סנטימטרים בכל מסך. היצורים נבדלים בצורה ולא רק בצבע. אין שעון, אין ספירה לאחור ואין מסך שנעלם אם מחכים. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "נגיעה לכל אחד", body: "בתורות. פתאום כל חיבור נהיה החלטה משותפת ולא רק תנועה מהירה." },
        {
          title: "לאן מגיעים היום",
          body: "בחרו יצור מהסולם והגיעו אליו יחד. יעד קטן הופך ריצה בלי סוף למשהו עם התחלה וסוף.",
        },
        { title: "מי הבא", body: "לפני החיבור, שאלו איזה יצור עומד לצאת. הסולם נלמד ככה תוך כמה סיבובים." },
        { title: "לספר סיפור", body: "לזחל שהפך לפרפר יש סיפור אמיתי. לפינגווין שהפך לשועל אין, וזה החלק המצחיק." },
      ],

      faq: [
        {
          q: "כמה יצורים צריך בשביל דרקון?",
          a: "8,192 זחלים ו-8,191 חיבורים, כי כל שלב עשוי משניים מזה שמתחתיו ויש 14 שלבים. זה חישוב ולא הערכה.",
        },
        {
          q: "אפשר להפסיד במשחק?",
          a: "כמעט לא. לוח מלא נתקע רק אם בכל משבצת שאינה דרקון יושב שלב אחר, וזה דורש שלושה דרקונים בבת אחת בלוח של 4 על 4. ב-150 הרצות אף אחת לא הגיעה לשם.",
        },
        {
          q: "כמה זמן לוקח להגיע לצפרדע?",
          a: "לבוט שלנו זה לקח 18 נגיעות בלוח הרגוע ו-13 בלוח הבינוני. חיבור עולה שתי נגיעות, אחת להרים ואחת להניח.",
        },
        {
          q: "יש גרירה במשחק?",
          a: "אין, וזו החלטה. נוגעים ביצור ואז נוגעים ביעד. ילד קטן ומי שמשתמש בקלט חלופי לא תמיד מצליחים להחזיק גרירה עד הסוף.",
        },
        { q: "המשחק חינמי?", a: "כן. אין תשלום, אין רכישות בתוך המשחק ואין גרסה מורחבת." },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, ואחרי ביקור אחד נשמר במכשיר ועובד גם בלי אינטרנט.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בנקודות, כשיותר זה טוב יותר, ובנפרד לכל רמה. כל שלב חדש שווה כפול מהקודם, אז הטיפוס הוא כל הסיפור.",
        },
        {
          q: "מאיזה גיל מתאים?",
          a: "משלוש בערך, בלוח הרגוע. אין מילים לקרוא ואין שעון, אז ילד שעדיין לא קורא משחק לבד.",
        },
      ],

      keywords: ["חיבור", "יצורים", "סולם", "חשיבה", "לגיל הרך", "אבולוציה"],
    },

    en: {
      name: "Two Make One",
      metaTitle: "Two Make One - Free Merge Game | Ellaz",
      metaDescription:
        "A free tap-to-merge game in your browser. Touch two matching creatures and they become the next one up, caterpillar to dragon. Three levels, no signup.",

      lede: "A free merge game you play with single taps. Touch one creature, touch its twin, and the two become one from the next rung up. Fourteen rungs, caterpillar to dragon, and the run never ends.",

      body: [
        "Tap a creature. Tap its twin. You get a bigger one. There is nothing else to the mechanic, and a three-year-old works it out by accident within about four taps.",

        "Because each rung is made of two of the rung below, the price of the top is arithmetic rather than a guess. One dragon is 8,192 caterpillars and 8,191 separate merges, and the whole climb is worth 212,992 points. Neither number came out of a run. They fall out of the rule, so they hold whether or not anybody ever gets there. Lower down the ladder the same arithmetic sounds much friendlier: a butterfly is four caterpillars, a frog is eight, a penguin is 64.",

        "So we counted taps, and a merge costs two of them, one to lift and one to place. A bot that always combines the smallest pair it can see reached its first frog after 18 taps on the calm board and its first lion after 1,530. On the crowded board it was slower, not faster: 50 taps to that frog and 3,136 to the lion. A board that hands you free creatures hands you small ones, so most of the work lands back at the bottom of the ladder.",

        "Here is what to expect, plainly. The top of the ladder is out of reach in an evening. The whale alone cost our bot 12,282 taps and the dragon is twice as far again, so treat the ladder as a direction rather than a finish line. Running out of moves is nearly impossible: a board jams only when every square that is not a dragon holds a different rung, which on the 4 by 4 takes three dragons at once. Across 150 simulated runs, none ever got there.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "A calm 5 by 5 board, or a 4 by 4 that feeds you creatures after every merge." },
        { title: "Tap an empty square", body: "A small creature arrives there. That is how you feed the board." },
        { title: "Tap a creature", body: "It comes up into your hand. Tap it again to put it back." },
        { title: "Tap its twin", body: "The two become one from the next rung, and the points go in." },
        { title: "Keep climbing", body: "Each rung is worth double the one below, and every third rung pays a coin the first time a run reaches it." },
      ],

      tips: [
        {
          title: "Do not scatter the small ones",
          body: "Every lone caterpillar takes a whole square. Better to drop two and combine them straight away than to drop five and go looking afterwards.",
        },
        {
          title: "One corner for the big ones",
          body: "Keep the large creatures in the same area. They wait longest for a partner, and when it turns up you want to find them fast.",
        },
        {
          title: "Smallest pair first",
          body: "When several merges are available, take the lowest. It frees a square now and feeds the rung above anyway.",
        },
        {
          title: "On the busy board, stop feeding",
          body: "Every merge hands you back one or two creatures, so the squares fill without your help. Tap an empty square there only when no pair exists.",
        },
      ],

      teaches: [
        { title: "Doubling", body: "Two make one, and that one is worth twice as much. Children count this long before anyone calls it multiplication." },
        { title: "Ordering by size", body: "The ladder climbs by size, caterpillar to dragon, so which is bigger reads off the picture with no words involved." },
        { title: "Managing space", body: "Sixteen squares go quickly. Where to put a thing becomes a decision rather than a detail." },
        { title: "Looking ahead", body: "One merge sets up the next. After a few runs you start seeing a chain instead of a step." },
      ],

      ages: [
        { title: "3 to 4", body: "The calm board. No pressure, no filling up, and the reward is the new creature appearing." },
        { title: "5 to 6", body: "Same board with a target: reach the frog. That is 18 taps, and it feels like something." },
        { title: "7 and up", body: "The feeding boards. Space runs out and where things go starts to matter." },
        { title: "Grown-ups", body: "A lion is a real climb. It took our bot between 1,010 and 3,136 taps depending on the level." },
      ],

      accessibility:
        "A tap, then another tap. There is no dragging anywhere in this game and that is deliberate: a five-year-old on a phone, and anybody using an alternative input device, cannot reliably hold a continuous gesture on a screen. The squares are deliberately large, at least 2 by 2 centimetres on any screen, and the creatures differ by shape rather than only by colour. Nothing counts down, nothing disappears if you wait, and the whole game plays in silence without losing any information.",

      together: [
        { title: "One tap each", body: "Take turns. Every merge turns into a shared decision instead of a quick reflex." },
        {
          title: "Pick a destination",
          body: "Choose a creature from the ladder and get there together. A small target turns an endless run into something with a beginning and an end.",
        },
        { title: "Guess the next one", body: "Before the merge, ask what is about to appear. The ladder gets learned in a couple of rounds this way." },
        { title: "Tell the story", body: "A caterpillar becoming a butterfly has a real story behind it. A penguin becoming a fox does not, which is the funny part." },
      ],

      faq: [
        {
          q: "How many creatures does a dragon take?",
          a: "8,192 caterpillars and 8,191 merges, because each rung is two of the rung below and there are fourteen rungs. That is calculated, not estimated.",
        },
        {
          q: "Can you lose?",
          a: "Very nearly not. A full board jams only when every square that is not a dragon holds a different rung, which needs three dragons at once on the 4 by 4, and until then you can always add a creature by tapping an empty square. Across 150 simulated runs, none ever jammed.",
        },
        {
          q: "How long does the frog take?",
          a: "Our bot took 18 taps on the calm board and 13 on the middle one. A merge costs two taps, one to lift and one to place.",
        },
        {
          q: "Is there any dragging?",
          a: "None, and that is a decision. You tap a creature, then tap where it goes. Small children and people using alternative input cannot always hold a drag to the end.",
        },
        { q: "Is it free?", a: "Yes. No payment, no in-game purchases, and no larger paid version." },
        { q: "Are there ads?", a: "None. No banners, and nothing that plays between levels." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works offline.",
        },
        {
          q: "How is the record measured?",
          a: "In points, where more is better, and separately per level. Each rung is worth double the one below, so the climb is the whole story.",
        },
        {
          q: "What age is it for?",
          a: "About three and up on the calm board. There are no words to read and no clock, so a child who cannot read plays alone.",
        },
      ],

      keywords: ["merge", "combine", "creatures", "ladder", "preschool", "evolution"],
    },

    es: {
      name: "Dos en uno",
      metaTitle: "Dos en uno - juego de combinar gratis | Ellaz",
      metaDescription:
        "Juego de combinar gratis en el navegador. Tocas dos criaturas iguales y se convierten en la siguiente, de oruga a dragón. Tres niveles, sin registro.",

      lede: "Un juego de combinar gratuito que se juega a toques. Tocas una criatura, tocas su gemela y las dos se convierten en una del escalón siguiente. Catorce escalones, de oruga a dragón, y la partida no se acaba nunca.",

      body: [
        "Tocas una criatura. Tocas la igual. Sale una más grande, y ya está.",

        "Como cada escalón se hace con dos del anterior, lo que cuesta llegar arriba no hay que estimarlo: se calcula. Un dragón son 8.192 orugas y 8.191 combinaciones, y el camino completo vale 212.992 puntos. Ninguna de esas cifras salió de una partida, salen de la propia regla, así que valen igual aunque nadie llegue nunca hasta allí. A media escalera la cuenta suena mucho más amable: una mariposa son cuatro orugas, una rana ocho y un pingüino 64.",

        "Así que contamos toques, y una combinación cuesta dos, uno para levantar y otro para soltar. Un robot que junta siempre la pareja más pequeña que ve llegó a su primera rana a los 18 toques en el tablero tranquilo y a su primer león a los 1.530. En el tablero lleno tardó más, no menos: 50 toques hasta la rana y 3.136 hasta el león. Un tablero que te regala criaturas te las regala pequeñas, de modo que casi todo el trabajo vuelve al pie de la escalera.",

        "Conviene decirlo claro. Lo de arriba queda lejos. La ballena sola le costó al robot 12.282 toques y el dragón está al doble de distancia, así que la escalera es una dirección y no una meta. Quedarse sin jugadas es casi imposible: un tablero se atasca solo si cada casilla que no es un dragón guarda un escalón distinto, y en el de 4 por 4 eso pide tres dragones a la vez. En 150 partidas simuladas no llegó ninguna.",

        "El récord se guarda en puntos, y los puntos llegan durante todo el camino.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Un tablero tranquilo de 5 por 5, o uno de 4 por 4 que suelta criaturas tras cada combinación." },
        { title: "Toca una casilla vacía", body: "Aparece ahí una criatura pequeña. Así se alimenta el tablero." },
        { title: "Toca una criatura", body: "Se te queda en la mano. Si la tocas otra vez, la sueltas donde estaba." },
        { title: "Toca su gemela", body: "Las dos se convierten en una del escalón siguiente y entran los puntos." },
        { title: "Sigue subiendo", body: "Cada escalón vale el doble que el anterior, y uno de cada tres deja además una moneda la primera vez que la partida llega a él." },
      ],

      tips: [
        {
          title: "No repartas las pequeñas",
          body: "Cada oruga suelta ocupa una casilla entera. Sale mejor soltar dos y juntarlas al momento que soltar cinco y buscarlas luego.",
        },
        {
          title: "Una esquina para las grandes",
          body: "Guarda las criaturas grandes en la misma zona. Son las que más esperan a su pareja, y cuando llega conviene encontrarlas rápido.",
        },
        {
          title: "Primero la pareja pequeña",
          body: "Cuando hay varias combinaciones posibles, haz la más baja. Libera una casilla ahora y alimenta el escalón de arriba igualmente.",
        },
        {
          title: "En el tablero lleno, no alimentes",
          body: "Cada combinación te devuelve una criatura o dos, así que las casillas se llenan solas. Ahí toca una casilla vacía únicamente si no queda ninguna pareja.",
        },
      ],

      teaches: [
        { title: "Duplicar", body: "Dos hacen una, y esa una vale el doble. Un niño lo cuenta mucho antes de que nadie lo llame multiplicar." },
        { title: "Ordenar por tamaño", body: "La escalera sube por tamaño, de oruga a dragón, así que quién es mayor se lee en el dibujo sin una sola palabra." },
        { title: "Gestionar el sitio", body: "Dieciséis casillas se acaban enseguida. Dónde poner algo pasa a ser una decisión." },
        { title: "Mirar adelante", body: "Una combinación prepara la siguiente. Tras unas partidas se empieza a ver una cadena en vez de un paso." },
      ],

      ages: [
        { title: "3 a 4", body: "El tablero tranquilo. Ni prisa ni tablero que se llena, y el premio es la criatura nueva que aparece." },
        { title: "5 a 6", body: "El mismo tablero con un objetivo: llegar a la rana. Son 18 toques y sabe a logro." },
        { title: "7 en adelante", body: "Los tableros que sueltan criaturas. El sitio se acaba y hay que decidir dónde va cada cosa." },
        { title: "Adultos", body: "Un león ya es una subida de verdad. Al robot le costó entre 1.010 y 3.136 toques según el nivel." },
      ],

      accessibility:
        "Un toque, y otro toque. En este juego no hay que arrastrar nada en ningún momento, y es a propósito: un niño de cinco años con un móvil, y cualquiera que use un dispositivo de entrada alternativo, no puede sostener un gesto continuo sobre la pantalla. Las casillas son grandes a propósito, al menos 2 por 2 centímetros en cualquier pantalla, y las criaturas se distinguen por forma y no solo por color. Nada va en cuenta atrás, nada desaparece si esperas, y se juega entero en silencio sin perderse información.",

      together: [
        { title: "Un toque cada uno", body: "Por turnos. Cada combinación se vuelve una decisión compartida en lugar de un reflejo." },
        {
          title: "Elegid destino",
          body: "Escoged una criatura de la escalera y llegad juntos. Un objetivo pequeño convierte una partida infinita en algo con principio y final.",
        },
        { title: "Adivina la siguiente", body: "Antes de combinar, preguntad qué va a salir. La escalera se aprende así en dos rondas." },
        { title: "Contad la historia", body: "Una oruga que se hace mariposa tiene una historia de verdad. Un pingüino que se hace zorro no, y ahí está la gracia." },
      ],

      faq: [
        {
          q: "¿Cuántas criaturas hacen falta para un dragón?",
          a: "8.192 orugas y 8.191 combinaciones, porque cada escalón son dos del anterior y hay catorce escalones. Está calculado, no estimado.",
        },
        {
          q: "¿Se puede perder?",
          a: "Casi nunca. Un tablero lleno se atasca solo si cada casilla que no es un dragón guarda un escalón distinto, algo que en el de 4 por 4 pide tres dragones a la vez, y hasta entonces siempre puedes añadir una criatura tocando una casilla vacía. En 150 partidas simuladas no se atascó ninguna.",
        },
        {
          q: "¿Cuánto se tarda en llegar a la rana?",
          a: "Al robot le costó 18 toques en el tablero tranquilo y 13 en el intermedio. Una combinación cuesta dos toques, uno para levantar y otro para soltar.",
        },
        {
          q: "¿Hay que arrastrar?",
          a: "No, y es una decisión. Tocas una criatura y después tocas dónde va. Los más pequeños y quien usa entrada alternativa no siempre aguantan un arrastre hasta el final.",
        },
        { q: "¿Es gratis?", a: "Sí. Ni pagos ni compras dentro del juego, y tampoco hay una versión de pago." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada entre nivel y nivel." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, tras una visita, queda guardado en el aparato y va sin conexión.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En puntos, donde más es mejor, y por separado en cada nivel. Cada escalón vale el doble que el anterior, así que subir es toda la historia.",
        },
        {
          q: "¿Para qué edad es?",
          a: "A partir de los tres años en el tablero tranquilo. No hay palabras que leer ni reloj, así que un niño que todavía no lee juega solo.",
        },
      ],

      keywords: ["combinar", "criaturas", "escalera", "lógica", "infantil", "evolución"],
    },
  },

  provenance: [
    {
      claim: "a dragon is 8,192 caterpillars, 8,191 merges and 212,992 points",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "a butterfly is 4 caterpillars, a frog 8, a penguin 64",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "first frog at 18 taps on easy, 13 on medium, 50 on hard; first lion at 1,530 / 1,010 / 3,136",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "the whale cost 12,282 taps on the calm board",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "0 of 150 simulated runs ran out of moves",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "a 4x4 board jams only with three top-rung creatures at once",
      source: "scripts/sim/merge-ladder.mjs",
    },
    {
      claim: "fourteen rungs, a 5x5 board with no pressure and 4x4 boards that spawn per merge",
      source: "src/games/merge/logic.ts",
    },
    {
      claim: "the record is points, higher is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
