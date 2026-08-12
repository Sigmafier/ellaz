import type { GameContent } from "../types";

/**
 * The honest page. Evolution is 2048's engine wearing a creature skin, and
 * saying so plainly is better than letting a parent discover it and wonder what
 * else we were vague about.
 *
 * What makes it a separate game rather than a theme toggle is the ladder: ten
 * named creatures from egg to T-Rex, so the tile a child is chasing is a
 * dinosaur rather than a number. For a five-year-old that is not a cosmetic
 * difference, it is the difference between a game about arithmetic and a game
 * about growing something.
 */
export const evolve: GameContent = {
  id: "evolve",

  copy: {
    he: {
      metaTitle: "התפתחות - משחק חיות שמתפתחות | Ellaz",
      metaDescription:
        "משחק חינם לילדים. מחברים שתי חיות זהות והן הופכות לחיה גדולה יותר, מביצה ועד טי-רקס. בלי הרשמה.",

      lede: "משחק חינם שבו מחברים שתי חיות זהות והן הופכות לאחת מפותחת יותר. מתחילים מביצה ומטפסים בסולם של 10 יצורים עד לטי-רקס.",

      body: [
        "ביצה ועוד ביצה זה זחל. זחל ועוד זחל זו דבורה. וכך למעלה.",

        "וכדאי שנאמר את זה מראש: מתחת למכסה זה בדיוק המנוע של 2048. אותה החלקה, אותו חיבור, אותם שלושה גדלי לוח. מה שהוחלף הוא מה שכתוב על האריח, ו-10 היצורים בסולם הם ביצה, זחל, דבורה, צפרדע, צב, לטאה, נחש, תנין, דינוזאור וטי-רקס. אנחנו לא מתחבאים מזה. אנחנו כן חושבים שזה משנה: ילד בן חמש שמנסה להגיע ל-2048 מנסה להגיע למספר, וילד שמנסה להגיע לטי-רקס מנסה להגיע לטי-רקס.",

        "בגלל זה זה משחק נפרד ולא כפתור בתוך 2048. השיא נשמר בנפרד, אז ילד שמטפס בסולם החיות לא מתחרה בשיא שמישהו קבע במספרים, והלוח שלו הוא שלו.",

        "החיבור עדיין חשבוני מתחתיו, וזה בונוס ולא מטרה. כל דרגה היא בדיוק כפליים מהקודמת, אז ילד שמטפס מביצה לטי-רקס עבר את 2, 4, 8 ועד 1024 בלי שאף אחד קרא לזה תרגיל.",

        "אין הפסד אמיתי. כשנגמרות התנועות המשחק נעצר ומראה כמה גבוה הגעתם, ואפשר להתחיל מיד. גם אחרי שמגיעים ליעד אפשר להמשיך.",
      ],

      howToPlay: [
        { title: "בוחרים לוח", body: "3 גדלים, בדיוק כמו ב-2048. הקטן הוא הקשה." },
        { title: "מחליקים", body: "אצבע לכל כיוון או חצים במקלדת. כל הלוח זז יחד." },
        { title: "מחברים", body: "שתי חיות זהות שנפגשות הופכות לאחת מהדרגה הבאה." },
        { title: "מטפסים", body: "10 דרגות מביצה עד טי-רקס. אפשר להמשיך גם אחרי שהגעתם." },
      ],

      tips: [
        {
          title: "פינה אחת קבועה",
          body: "החזיקו את החיה הגדולה בפינה והחליקו רק לשני הכיוונים שמובילים אליה. זו העצה שמכפילה תוצאה.",
        },
        {
          title: "לשיר את הסולם",
          body: "ביצה, זחל, דבורה, צפרדע. ילדים לומדים את הסדר תוך משחק אחד ואז יודעים מה בא אחר כך.",
        },
        {
          title: "לא לרדוף אחרי חיבורים קטנים",
          body: "שתי ביצים בקצה הלא נכון של הלוח שוות פחות מהסדר שהן הורסות.",
        },
        {
          title: "להתחיל בלוח הגדול",
          body: "הלוח הרחב סלחני, וילד מגיע שם לצב או ללטאה כבר במשחק הראשון.",
        },
      ],

      teaches: [
        { title: "הכפלה", body: "כל דרגה היא כפליים מהקודמת, אז הסולם עצמו הוא סדרת הכפלות." },
        { title: "תכנון קדימה", body: "כל תנועה מזיזה את כל הלוח, וזה מלמד לחשוב מהלך אחד קדימה." },
        { title: "סדר וסדרה", body: "10 היצורים תמיד באותו סדר, אז המשחק הוא גם תרגיל ברצף." },
        {
          title: "לוותר על רווח מיידי",
          body: "החיבור שזמין עכשיו הוא לא תמיד החיבור שמשאיר לוח טוב.",
        },
      ],

      ages: [
        { title: "4 עד 6", body: "הלוח הגדול. יעד נמוך ומקום לטעות, אז החיות מתקדמות גם בהחלקות אקראיות." },
        { title: "7 עד 9", body: "הלוח הרגיל, שבו הפינה מתחילה להיות חשובה." },
        { title: "10 ומעלה", body: "הלוח הקטן, שהוא באמת קשה." },
        {
          title: "הורים",
          body: "אם אתם מכירים 2048, אתם מכירים את זה. ההבדל הוא שהילד שלכם דווקא יבקש לשחק בו.",
        },
      ],

      accessibility:
        "החלקה או חצים במקלדת, ואף פעם לא גרירה מדויקת של אריח בודד. אפשר לשחק ביד אחת. כל חיה נבדלת בצורה שלה ולא רק ברקע, ולכל אריח יש שם קולי לקוראי מסך, אז אפשר לשחק בלי להבחין בין הגוונים. הלוח מתכווץ לגודל המסך ונשאר ריבועי, ומוצג משמאל לימין גם בעברית כדי שכיוון ההחלקה יתאים למה שרואים. אין שעון, אין הבהובים ואין לחץ זמן בשום שלב.",

      together: [
        { title: "החלקה בתורות", body: "כל אחד מזיז פעם אחת על אותו לוח. הסולם משותף וגם ההאשמות." },
        {
          title: "לנחש מה הבא",
          body: "לפני שמחברים, שאלו איזו חיה תצא. ילדים לומדים את הסולם ככה בלי לשנן.",
        },
        { title: "מרוץ לצפרדע", body: "שני מכשירים, מי מגיע לצפרדע קודם. יעד קרוב מספיק לילדים קטנים." },
        {
          title: "לספר על החיה",
          body: "כשמגיעים לתנין, שאלו מה הוא אוכל. המשחק הופך לשיחה על בעלי חיים.",
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
          q: "זה בעצם 2048?",
          a: "כן, אותו מנוע בדיוק. מה שהשתנה הוא שהאריחים הם 10 יצורים מביצה עד טי-רקס במקום מספרים. לילד בן חמש זה הבדל גדול, ולכן זה משחק נפרד עם שיא נפרד.",
        },
        {
          q: "מה סדר החיות?",
          a: "ביצה, זחל, דבורה, צפרדע, צב, לטאה, נחש, תנין, דינוזאור וטי-רקס. 10 דרגות, וכל אחת שווה כפליים מהקודמת.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "אפשר להמשיך אחרי שמגיעים לסוף?",
          a: "כן. היעד עוצר לרגע כדי לחגוג ואז מחזיר לכם את הלוח, ומכאן זה מרוץ מול הניקוד.",
        },
        {
          q: "השיא משותף עם 2048?",
          a: "לא. השיאים נפרדים לגמרי, אז ילד שמטפס בסולם החיות לא מתחרה במספר שמישהו קבע במשחק השני.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "מארבע בערך, על הלוח הגדול. אין קריאה בשום מקום וצריך רק לזהות שתי חיות זהות.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["התפתחות", "חיות", "דינוזאור", "חיבור", "לגיל הרך", "משחק אריחים"],
    },

    en: {
      metaTitle: "Evolution - Merge Creatures from Egg to T-Rex | Ellaz",
      metaDescription:
        "A free merging game for children. Combine two identical creatures to evolve them, from egg all the way to T-Rex. No signup.",

      lede: "A free game where two identical creatures merge into a more evolved one. You start at an egg and climb a ladder of 10 creatures up to a T-Rex.",

      body: [
        "An egg plus an egg is a caterpillar. Caterpillar plus caterpillar is a bee. And upward from there.",

        "We should say this plainly: under the hood this is exactly the 2048 engine. Same swipe, same merge, same three board sizes. What changed is what is printed on the tile, and the 10 creatures on the ladder are egg, caterpillar, bee, frog, turtle, lizard, snake, crocodile, dinosaur and T-Rex. We are not hiding that. We do think it matters: a five-year-old chasing 2048 is chasing a number, and a five-year-old chasing a T-Rex is chasing a T-Rex.",

        "Which is why it is a separate game rather than a button inside 2048. The record is kept separately, so a child climbing the creature ladder is not competing against a score somebody set in numbers, and their board is theirs.",

        "The merging is still arithmetic underneath, and that is a bonus rather than the point. Each rung is exactly double the one below, so a child climbing from egg to T-Rex has passed through 2, 4, 8 and on to 1024 without anybody calling it practice.",

        "Nothing here is really a loss. When no move is left the game stops and shows how high you climbed. A new one starts immediately. You can also keep playing past the top.",
      ],

      howToPlay: [
        { title: "Pick a board", body: "3 sizes, exactly as in 2048. The small one is the hard one." },
        { title: "Swipe", body: "A finger in any direction or arrow keys. The whole board moves together." },
        { title: "Merge", body: "Two identical creatures that meet become one of the next rung up." },
        { title: "Climb", body: "10 rungs from egg to T-Rex. You can continue after reaching the top." },
      ],

      tips: [
        {
          title: "One fixed corner",
          body: "Keep your biggest creature in a corner and only swipe the two directions that feed it. This is the tip that doubles results.",
        },
        {
          title: "Sing the ladder",
          body: "Egg, caterpillar, bee, frog. Children learn the order in one game and then know what is coming.",
        },
        {
          title: "Skip cheap merges",
          body: "Two eggs at the wrong end of the board are worth less than the order they destroy.",
        },
        {
          title: "Start on the big board",
          body: "The wide board is forgiving, and a child reaches a turtle or a lizard in their first game.",
        },
      ],

      teaches: [
        { title: "Doubling", body: "Every rung is double the one below, so the ladder itself is a doubling sequence." },
        { title: "Thinking ahead", body: "Each move shifts the whole board, which teaches looking one move forward." },
        { title: "Order and sequence", body: "The 10 creatures always come in the same order, so the game is sequencing practice too." },
        {
          title: "Delaying a reward",
          body: "The merge available now is not always the merge that leaves a workable board.",
        },
      ],

      ages: [
        { title: "4 to 6", body: "The big board. Low target and room to be wrong, so creatures advance even on aimless swipes." },
        { title: "7 to 9", body: "The standard board, where the corner starts to matter." },
        { title: "10 and up", body: "The small board, which is genuinely hard." },
        {
          title: "Parents",
          body: "If you know 2048, you know this. The difference is that your child will actually ask to play it.",
        },
      ],

      accessibility:
        "Swipe or arrow keys, never a precise drag of an individual tile. It plays one-handed. Each creature differs by its own shape rather than only its background, and every tile carries a spoken label for screen readers, so it plays without distinguishing hues. The board shrinks to fit any screen and stays square, and runs left to right even in Hebrew so swipe direction matches what you see. No clock, nothing flashing, and no timed section anywhere.",

      together: [
        { title: "Alternate swipes", body: "One move each on the same board. Shared ladder, shared blame." },
        {
          title: "Guess the next one",
          body: "Before merging, ask which creature will come out. Children learn the ladder without memorising it.",
        },
        { title: "Race to the frog", body: "Two devices, first to a frog. A target close enough for young children." },
        {
          title: "Talk about the animal",
          body: "When a crocodile appears, ask what it eats. The game becomes a conversation about animals.",
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
          q: "Is this just 2048?",
          a: "Yes, exactly the same engine. What changed is that the tiles are 10 creatures from egg to T-Rex instead of numbers. To a five-year-old that is a large difference, which is why it is a separate game with a separate record.",
        },
        {
          q: "What is the order of the creatures?",
          a: "Egg, caterpillar, bee, frog, turtle, lizard, snake, crocodile, dinosaur and T-Rex. 10 rungs, each worth double the one below it.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Can I keep playing after reaching the top?",
          a: "Yes. The target pauses to celebrate and then hands the board back, and from there you are racing your score.",
        },
        {
          q: "Is the record shared with 2048?",
          a: "No. The records are entirely separate, so a child climbing the creature ladder is not competing with a number somebody set in the other game.",
        },
        {
          q: "What age is this for?",
          a: "From about four on the big board. There is no reading anywhere and the only requirement is spotting two identical creatures.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["evolution", "merge", "creatures", "dinosaur", "doubling", "kids game"],
    },
    es: {
      metaTitle: "Evolución - une criaturas del huevo al T-Rex | Ellaz",
      metaDescription:
        "Juego gratis de unir para niños. Combina dos criaturas iguales para evolucionarlas, desde el huevo hasta el T-Rex. Sin registro.",

      lede: "Un juego gratuito en el que dos criaturas iguales se funden en una más evolucionada. Empiezas en un huevo y subes una escalera de 10 criaturas hasta un T-Rex.",

      body: [
        "Un huevo más un huevo es una oruga. Oruga más oruga es una abeja. Y hacia arriba desde ahí.",

        "Vamos a decirlo claro: por debajo esto es exactamente el motor del 2048. Mismo deslizamiento, misma unión, mismos tres tamaños de tablero. Lo que ha cambiado es lo que va impreso en la ficha, y las 10 criaturas de la escalera son huevo, oruga, abeja, rana, tortuga, lagartija, serpiente, cocodrilo, dinosaurio y T-Rex. No lo estamos escondiendo. Y sí creemos que importa: un niño de cinco años persiguiendo un 2048 persigue un número, y uno persiguiendo un T-Rex persigue un T-Rex.",

        "Por eso es un juego aparte y no un botón dentro del 2048. El récord se guarda por separado, así que un niño subiendo la escalera de criaturas no compite contra una puntuación que alguien hizo en números, y su tablero es suyo.",

        "Unir sigue siendo aritmética por debajo, y eso es un extra y no el objetivo. Cada peldaño vale exactamente el doble que el de abajo, así que un niño que sube del huevo al T-Rex ha pasado por el 2, el 4, el 8 y hasta el 1024 sin que nadie lo llamara práctica.",

        "Aquí nada es realmente perder. Cuando ya no queda movimiento la partida se detiene y enseña hasta dónde subiste. Arranca otra al momento. También puedes seguir jugando pasada la cima.",
      ],

      howToPlay: [
        { title: "Elige tablero", body: "3 tamaños, exactamente como en el 2048. El pequeño es el difícil." },
        { title: "Desliza", body: "Un dedo en cualquier dirección o las flechas. El tablero entero se mueve junto." },
        { title: "Une", body: "Dos criaturas iguales que se encuentran se convierten en una del peldaño siguiente." },
        { title: "Sube", body: "10 peldaños del huevo al T-Rex. Puedes continuar después de llegar arriba." },
      ],

      tips: [
        {
          title: "Una esquina fija",
          body: "Mantén tu criatura más grande en una esquina y desliza solo en las dos direcciones que la alimentan. Este es el consejo que dobla los resultados.",
        },
        {
          title: "Canta la escalera",
          body: "Huevo, oruga, abeja, rana. Los niños se aprenden el orden en una partida y a partir de ahí saben qué viene.",
        },
        {
          title: "Sáltate las uniones baratas",
          body: "Dos huevos en el extremo equivocado del tablero valen menos que el orden que destrozan.",
        },
        {
          title: "Empezad en el tablero grande",
          body: "El tablero ancho perdona, y un niño llega a una tortuga o a una lagartija en su primera partida.",
        },
      ],

      teaches: [
        { title: "Duplicar", body: "Cada peldaño vale el doble que el de abajo, así que la escalera misma es una serie de duplicaciones." },
        { title: "Pensar por delante", body: "Cada movimiento desplaza el tablero entero, lo que enseña a mirar un movimiento hacia adelante." },
        { title: "Orden y secuencia", body: "Las 10 criaturas salen siempre en el mismo orden, así que el juego también es práctica de secuenciar." },
        {
          title: "Aplazar la recompensa",
          body: "La unión disponible ahora no siempre es la que deja un tablero manejable.",
        },
      ],

      ages: [
        { title: "4 a 6", body: "El tablero grande. Objetivo bajo y sitio para equivocarse, así que las criaturas avanzan incluso deslizando sin plan." },
        { title: "7 a 9", body: "El tablero estándar, donde la esquina empieza a importar." },
        { title: "10 en adelante", body: "El tablero pequeño, que es difícil de verdad." },
        {
          title: "Padres",
          body: "Si conocéis el 2048, conocéis esto. La diferencia es que vuestro hijo os va a pedir jugar a este.",
        },
      ],

      accessibility:
        "Se juega deslizando o con las flechas, nunca arrastrando una ficha concreta con precisión. Se maneja con una mano. Cada criatura se distingue por su propia forma y no solo por el fondo, y cada ficha lleva una etiqueta hablada para lectores de pantalla, así que se juega sin distinguir tonos. El tablero se encoge para caber en cualquier pantalla y se mantiene cuadrado, y va de izquierda a derecha incluso en hebreo para que la dirección del deslizamiento coincida con lo que ves. Sin reloj, sin nada que parpadee, y sin ninguna parte contrarreloj.",

      together: [
        { title: "Deslizamientos alternos", body: "Un movimiento cada uno en el mismo tablero. Escalera compartida y culpa compartida." },
        {
          title: "Adivina la siguiente",
          body: "Antes de unir, preguntad qué criatura va a salir. Los niños se aprenden la escalera sin memorizarla.",
        },
        { title: "Carrera hasta la rana", body: "Dos aparatos, el primero que llegue a una rana. Un objetivo lo bastante cercano para los pequeños." },
        {
          title: "Hablad del animal",
          body: "Cuando salga un cocodrilo, preguntad qué come. La partida se convierte en una conversación sobre animales.",
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
          q: "¿Esto es el 2048 y ya está?",
          a: "Sí, exactamente el mismo motor. Lo que ha cambiado es que las fichas son 10 criaturas del huevo al T-Rex en lugar de números. Para un niño de cinco años esa es una diferencia grande, y por eso es un juego aparte con un récord aparte.",
        },
        {
          q: "¿Cuál es el orden de las criaturas?",
          a: "Huevo, oruga, abeja, rana, tortuga, lagartija, serpiente, cocodrilo, dinosaurio y T-Rex. 10 peldaños, cada uno del doble que el de abajo.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Puedo seguir jugando después de llegar arriba?",
          a: "Sí. El objetivo hace una pausa para celebrarlo y después te devuelve el tablero, y desde ahí compites contra tu marcador.",
        },
        {
          q: "¿El récord se comparte con el 2048?",
          a: "No. Los récords están completamente separados, así que un niño subiendo la escalera de criaturas no compite con un número que alguien hizo en el otro juego.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos cuatro años en el tablero grande. No se lee nada y lo único que hace falta es ver dos criaturas iguales.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["evolución", "unir", "criaturas", "dinosaurio", "duplicar", "juego para niños"],
    },
  },

  provenance: [
    {
      claim: "10 creature rungs from egg to T-Rex, each worth double the one below, spanning 2 to 1024",
      source: "src/games/evolve/skin.ts",
    },
    {
      claim: "it runs the 2048 engine and its three board sizes under a creature skin",
      source: "src/games/evolve/index.ts",
    },
    {
      claim: "records are namespaced per game, so evolve and 2048 keep separate ones",
      source: "src/sdk/score.ts",
    },
  ],
};
