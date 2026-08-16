import type { GameContent } from "../types";

/**
 * The falling-block game, and the one whose statistic is about the PIECES
 * rather than the clock.
 *
 * `scripts/sim/blocks-rows.mjs` plays the real engine with two throwaway
 * policies. A bot places instantly, so the drop speed is invisible to it, and
 * what is left is the piece pool: a tidy policy survives every 1000-piece run
 * on the two gentler pools and dies on all 300 hard ones. That is the honest
 * version of "fast is harder", and no line of the code states it.
 */
export const blocks: GameContent = {
  id: "blocks",

  copy: {
    he: {
      name: "קוביות נופלות",
      metaTitle: "קוביות נופלות - משחק חינם בעברית | Ellaz",
      metaDescription:
        "משחק קוביות נופלות חינמי בדפדפן. מסובבים צורות, ממלאים שורה, והיא נעלמת. שלוש רמות, לוח 8 על 14 או 10 על 18.",

      lede: "משחק הקוביות הנופלות, חינם בדפדפן. הצורות יורדות, אתם מסובבים ומזיזים, ושורה שהתמלאה נעלמת. שלוש רמות: 4 צורות ברגוע, 9 ברגיל ו-11 במהיר.",

      body: [
        "צורה יורדת. מסובבים, מזיזים לצד, מחכים שתנחת. שורה שהתמלאה עד הקצה נעלמת, וכל מה שמעליה מתיישב למטה.",

        "מה שבאמת מפריד בין שלוש הרמות זה לא המהירות אלא מלאי הצורות, וזה מספר שאפשר למדוד. הרצנו בוט פשוט שמנסה כל עמודה וכל סיבוב ובוחר את המקום שמשאיר הכי מעט חורים קבורים. בוט כזה לא מסתכל בשעון בכלל, כי הוא מניח מיד. ברגוע הוא שרד את כל אלף הצורות בכל אחת מ-300 הריצות, ברגיל ב-99.3 אחוז מהן, ובמהיר הוא מת בכל ריצה אחת ויחידה אחרי 78 שורות בחציון. שתי הצורות בנות חמש המשבצות שנכנסות רק במהיר עושות את זה, לא הקצב. בשביל השוואה, בוט שמפיל את הצורות במקום אקראי מסיים ריצה רגילה אחרי 20 צורות בערך, בלי שורה אחת.",

        "מתחת לצורה היורדת יש צל מקווקו במקום שבו היא תנחת. הוא שם כדי שלא תצטרכו לספור עמודות. כפתור ההפלה שולח אותה ישר לשם, ומוסיף נקודה לכל שורה שהיא עברה בדרך.",

        "הניקוד מעדיף סבלנות. שורה בודדת שווה 10 נקודות, שתיים יחד 30, שלוש 60 וארבע 100. כלומר ארבע שורות במכה אחת שוות יותר מפי שניים מארבע שורות בנפרד. זאת הסיבה היחידה להשאיר תעלה פתוחה בצד ולחכות לצורה הארוכה, וזה גם מה שהופך את הרגע שהיא מגיעה למשהו.",

        "כל חמש שורות נכנסים מטבעות לארנק, בלי קונפטי ובלי לעצור את הריצה. השיא נמדד פעם אחת, בסוף, ובנפרד לכל רמה: לוח של 8 עמודות ולוח של 10 הם לא אותו משחק, וריצה ברגוע לא אמורה לדרוס שיא במהיר.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "רגוע, רגיל או מהיר. אפשר להחליף מתי שרוצים, וזה מתחיל ריצה חדשה." },
        { title: "מזיזים לצד", body: "כפתורי החצים בתחתית, או החלקה על הלוח, או חצים במקלדת." },
        { title: "מסובבים", body: "כפתור הסיבוב, נגיעה על הלוח, או חץ למעלה. ליד קיר הצורה נדחפת פנימה לבד." },
        { title: "מפילים", body: "הכפתור התחתון מוריד את הצורה מיד למקום הצל. אפשר גם רק לחכות." },
        { title: "ממלאים שורה", body: "שורה שלמה נעלמת. המשחק נגמר כשלערימה אין יותר מקום להיכנס מלמעלה." },
      ],

      tips: [
        {
          title: "חור קבור עולה יותר מגובה",
          body: "ערימה גבוהה ושטוחה עדיין ניתנת לתיקון. משבצת אחת שנקברה מתחת לצורה אחרת חוסמת את כל השורה שלה עד שמפרקים הכול מעליה. אם צריך לבחור, תמיד עדיף גבוה ונקי.",
        },
        {
          title: "תעלה אחת בצד",
          body: "השאירו עמודה אחת ריקה בקצה ומלאו את השאר עד גובה שלוש או ארבע. כשהצורה הישרה מגיעה היא מנקה ארבע שורות בבת אחת, וזה 100 נקודות במקום 40.",
        },
        {
          title: "הצורה הבאה כבר מוצגת",
          body: "למעלה מופיעה הצורה שתגיע אחרי הנוכחית. תסתכלו עליה לפני שאתם מניחים את זו שביד, כי חצי מההחלטות משתנות בגללה.",
        },
        {
          title: "הפילו מוקדם",
          body: "בהתחלה כדאי להשתמש בכפתור ההפלה כל הזמן. הוא נותן נקודה לשורה, אבל חשוב יותר שהוא מקצר את ההמתנה ומאפשר לכם לשחק פי שלושה יותר צורות באותו זמן, וככה לומדים מהר יותר.",
        },
        {
          title: "אל תתחילו במהיר",
          body: "צורת הפלוס במהיר לא יכולה לשבת שטוח על שום דבר. היא כמעט תמיד משאירה חור. זאת רמה לאנשים שכבר יודעים לנקות שלוש שורות ברצף.",
        },
      ],

      teaches: [
        { title: "סיבוב במרחב", body: "לראות בראש איך צורה תיראה אחרי רבע סיבוב, לפני שמסובבים אותה בפועל." },
        { title: "תכנון קדימה", body: "כל הנחה קובעת אילו הנחות יישארו אפשריות. הצורה הבאה מוצגת בדיוק בשביל זה." },
        { title: "לוותר בכוונה", body: "לפעמים המקום הכי טוב פשוט לא קיים, וצריך לבחור את הפחות גרוע ולהמשיך." },
        { title: "סבלנות מול מיידיות", body: "שורה אחת עכשיו או ארבע בעוד רגע. זאת אותה שאלה שחוזרת בכל ריצה." },
      ],

      ages: [
        { title: "5 עד 6", body: "רגוע, בלי לדבר על ניקוד. ארבע צורות זה כל מה שצריך, והכפתורים גדולים." },
        { title: "7 עד 9", body: "רגוע ואז רגיל. פה מתחילים להסתכל על הצורה הבאה במקום רק על זו שיורדת." },
        { title: "10 ומעלה", body: "רגיל. תעלה בצד וארבע שורות במכה זה היעד הראשון שכדאי להציב." },
        { title: "מבוגרים", body: "מהיר, אחרי כמה ריצות ברגיל. 140 מילישניות לצעד זה פחות זמן ממה שנשמע." },
      ],

      accessibility:
        "כל מה שהמשחק דורש הוא נגיעות בודדות. חמישה כפתורים גדולים בתחתית המסך עושים הכול, ואין שום פעולה שמחייבת גרירה או החזקה ממושכת של האצבע. מי שמעדיף יכול להחליק על הלוח או להשתמש בחצים במקלדת, ושלוש הדרכים שקולות לגמרי. הצל המקווקו מראה איפה הצורה תנחת, כך שאין צורך לספור עמודות בעין. כל צורה בצבע משלה וגם בצורה משלה, אז אפשר לזהות אותן בלי להסתמך על הצבע. אין הבהובים מהירים ואין צליל שהמשחק תלוי בו.",

      together: [
        { title: "אחד מסובב ואחד מזיז", body: "שני אנשים, אותו טלפון. מצחיק בערך שלוש ריצות, ואז נהיה תחרותי." },
        { title: "תור בכל ריצה", body: "מחליפים כשהערימה נגמרת. הכי הרבה שורות בערב לוקח." },
        { title: "יעד קטן", body: "עשר שורות ברגוע. יעד קרוב עדיף על שיא רחוק לילד שרק התחיל." },
        { title: "בלי הפלה", body: "ריצה שלמה בלי כפתור ההפלה, רק עם ההמתנה. משחק אחר לגמרי." },
      ],

      faq: [
        {
          q: "משחק הקוביות הנופלות חינמי?",
          a: "כן. אין תשלום, אין רכישות בתוך המשחק ואין הרשמה. כל המשחקים באתר פתוחים מהרגע הראשון.",
        },
        {
          q: "איך משחקים בטלפון?",
          a: "חמישה כפתורים בתחתית: שמאלה, סיבוב, ימינה, למטה והפלה. אפשר גם להחליק על הלוח עצמו ולגעת בו כדי לסובב.",
        },
        {
          q: "מה ההבדל בין הרמות?",
          a: "מלאי הצורות בעיקר. ברגוע יש 4 צורות ולוח 8 על 14, ברגיל 9 צורות ולוח 10 על 18, ובמהיר נוספות שתי צורות בנות חמש משבצות שקשה להשכיב. הקצב גם עולה: מ-1000 מילישניות לצעד ברגוע עד 140 במהיר.",
        },
        {
          q: "כמה שווה שורה?",
          a: "שורה אחת 10 נקודות, שתיים יחד 30, שלוש 60 וארבע 100. הפלה מוסיפה נקודה לכל שורה שהצורה עברה.",
        },
        {
          q: "המשחק נהיה מהיר יותר?",
          a: "כן, לפי שורות שניקיתם. ברגוע כל 6 שורות עד רצפה של 620 מילישניות, ברגיל כל 5 עד 260, ובמהיר כל 4 עד 140.",
        },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם בלי קליטה.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בנקודות, כשיותר זה טוב יותר, ובנפרד לכל רמה. הוא נבדק פעם אחת בסוף הריצה.",
        },
        {
          q: "מאיזה גיל מתאים?",
          a: "מחמש בערך, ברמה הרגועה. אין קריאה בשום מקום במשחק, אז ילד שעדיין לא קורא משחק לבד.",
        },
        {
          q: "יש פרסומות?",
          a: "אין. לא באנרים ולא סרטונים בין ריצות.",
        },
      ],

      keywords: ["קוביות נופלות", "בלוקים", "לוגיקה", "ארקייד", "קלאסי", "אינסופי"],
    },

    en: {
      name: "Falling Blocks",
      metaTitle: "Falling Blocks - Free Online Block Game | Ellaz",
      metaDescription:
        "A free falling-block game in your browser. Turn the shapes, fill a row, watch it go. Three levels, eleven shapes, and big touch buttons.",

      lede: "A free falling-block game you play in the browser. Shapes come down, you turn them and slide them, and a full row disappears. Four shapes on Calm, nine on Normal, eleven on Fast.",

      body: [
        "Turn it, slide it, let it land. A row that fills all the way across vanishes and everything above it drops down. That is the whole game, and it has been the whole game for forty years.",

        "Our shapes are not the famous seven. There are eleven, from three cells up to five, and which ones you get is what the level actually decides. Calm stocks four gentle ones. Fast adds a plus and a cup, and neither of those can lie flat on anything.",

        "We measured that rather than asserting it. A bot that tries every column and rotation and keeps whichever leaves the fewest buried holes ran 300 games per level: it survived the full 1000 pieces in every Calm run, in 99.3 percent of Normal runs, and in none at all on Fast, where it died after a median of 78 rows. The bot places instantly, so the drop speed never entered that result. Two pieces did. A bot dropping into random columns, for comparison, is dead after about 20 pieces having cleared nothing.",

        "Scoring rewards waiting. One row pays 10, two together pay 30, three pay 60, four pay 100. So the long piece you have been holding a channel open for is worth more than double what those same four rows would have paid one at a time. Coins land in the wallet every five rows. The record is taken once, when the stack tops out, and each level keeps its own.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Calm, Normal or Fast. Switching starts a clean board at that level." },
        { title: "Move it sideways", body: "The arrow buttons under the board, a swipe across it, or the arrow keys." },
        { title: "Turn it", body: "The rotate button, a tap on the board, or the up arrow. Against a wall it nudges itself clear." },
        { title: "Drop it", body: "The last button sends it straight to the dashed shadow. Waiting works too." },
        { title: "Fill a row", body: "It disappears. The run ends when the next shape has no room to come in." },
      ],

      tips: [
        {
          title: "A hole costs more than height",
          body: "A tall flat stack is still fixable. One cell buried under another shape locks its whole row until you dismantle everything above it. Given the choice, go high and clean.",
        },
        {
          title: "Keep one channel open",
          body: "Leave an end column empty and build the rest to three or four high. When the straight piece arrives it clears four rows at once, which is 100 points instead of 40.",
        },
        {
          title: "The next shape is already showing",
          body: "Above the board is the one arriving after this one. Look at it before you commit, because roughly half your decisions change once you have.",
        },
        {
          title: "Drop early and often",
          body: "Use the drop button constantly while you are learning. The point is not the extra point per row. It is that you get through three times as many shapes in the same ten minutes.",
        },
        {
          title: "Skip Fast for now",
          body: "The plus shape leaves a hole almost every time it lands, and Fast is the only level that stocks it. Come back once clearing three rows in one go feels routine.",
        },
      ],

      teaches: [
        { title: "Mental rotation", body: "Seeing what a shape becomes after a quarter turn, before turning it." },
        { title: "Planning ahead", body: "Every placement decides which placements remain. That is why the next shape is on screen." },
        { title: "Choosing the least bad option", body: "Sometimes the good square does not exist. Pick, place, carry on." },
        { title: "Patience against impulse", body: "One row now or four in a moment. The same question, over and over." },
      ],

      ages: [
        { title: "5 to 6", body: "Calm, and say nothing about score. Four shapes is plenty and the buttons are large." },
        { title: "7 to 9", body: "Calm, then Normal. This is where the preview starts getting looked at." },
        { title: "10 and up", body: "Normal. A side channel and a four-row clear is the first target worth naming." },
        { title: "Grown-ups", body: "Fast, after a few Normal runs. 140 milliseconds a step is less time than it sounds." },
      ],

      accessibility:
        "Everything here is single taps. Five large buttons under the board do all of it, and nothing in the game requires a drag or a held finger. Swiping the board and the keyboard arrows both work if you prefer them, and all three routes are equivalent. The dashed shadow marks the landing square so nobody has to line up columns by eye. Every shape has its own colour and its own outline, so they stay distinguishable without relying on colour. There are no rapid flashes and no sound the game depends on.",

      together: [
        { title: "One turns, one slides", body: "Two people, one phone. Funny for about three runs, then competitive." },
        { title: "Swap every run", body: "Hand it over when the stack tops out. Most rows of the evening takes it." },
        { title: "Name a small target", body: "Ten rows on Calm. A near target beats a distant record for a child who just started." },
        { title: "No dropping", body: "A whole run using only the falling speed. Completely different pacing." },
      ],

      faq: [
        {
          q: "Is this block game free?",
          a: "Yes. Nothing to pay, nothing to buy inside it, and no sign-up. Every game on the site is open from the first second.",
        },
        {
          q: "How do I play it on a phone?",
          a: "Five buttons under the board: left, rotate, right, down and drop. You can also swipe across the board and tap it to turn the shape.",
        },
        {
          q: "What is different about each level?",
          a: "Mostly which shapes it stocks. Calm has 4 shapes on an 8 by 14 board, Normal has 9 on a 10 by 18, and Fast adds two five-cell shapes that are awkward to lay flat. The pace differs too, from 1000 milliseconds a step down to 140.",
        },
        {
          q: "How many points is a row?",
          a: "One row is 10, two together are 30, three are 60 and four are 100. Dropping a shape adds a point for every row it fell past.",
        },
        {
          q: "Does it speed up?",
          a: "Yes, based on rows cleared. Calm speeds up every 6 rows down to a floor of 620 milliseconds, Normal every 5 down to 260, Fast every 4 down to 140.",
        },
        {
          q: "Can I play offline?",
          a: "Yes. After one visit it is stored on the device and runs with no signal.",
        },
        {
          q: "How is the record measured?",
          a: "In points, where higher wins, and separately for each level. It is read once when a run ends.",
        },
        {
          q: "What age is it for?",
          a: "About five and up on Calm. There is no reading anywhere in the game, so a child who cannot read yet plays alone.",
        },
        {
          q: "Are there ads?",
          a: "None. No banners, and nothing playing between runs.",
        },
      ],

      keywords: ["falling blocks", "block puzzle", "arcade", "classic", "endless", "rotation"],
    },
    es: {
      name: "Bloques que caen",
      metaTitle: "Bloques que caen - juego gratis online | Ellaz",
      metaDescription:
        "Juego gratis de bloques que caen en el navegador. Gira las piezas, completa una fila y desaparece. Tres niveles, once formas y botones grandes.",

      lede: "Un juego gratuito de bloques que caen y se juega en el navegador. Bajan formas, las giras y las desplazas, y una fila completa desaparece. Cuatro formas en Calma, nueve en Normal y once en Rápido.",

      body: [
        "Gírala, muévela, déjala caer. Una fila que se llena de lado a lado se esfuma y todo lo que había encima baja. Ese es el juego entero, y lo lleva siendo cuarenta años.",

        "Nuestras formas no son las siete famosas. Hay once, desde tres casillas hasta cinco, y cuáles te tocan es lo que decide de verdad el nivel. Calma reparte cuatro suaves. Rápido añade una cruz y una copa, y ninguna de las dos se puede tumbar plana encima de nada.",

        "Eso lo medimos en lugar de afirmarlo. Un bot que prueba todas las columnas y todos los giros y se queda con lo que deje menos huecos enterrados jugó 300 partidas por nivel: sobrevivió a las 1000 piezas completas en todas las partidas de Calma, en el 99,3 por ciento de las de Normal, y en ninguna de Rápido, donde murió tras una mediana de 78 filas. El bot coloca al instante, así que la velocidad de caída no entró en ese resultado. Dos piezas sí. Un bot que suelta en columnas al azar, para comparar, está muerto a las 20 piezas sin haber despejado nada.",

        "La puntuación premia esperar. Una fila da 10, dos juntas dan 30, tres dan 60 y cuatro dan 100. Así que la pieza larga para la que llevas rato guardando un canal vale más del doble de lo que habrían pagado esas mismas cuatro filas de una en una. Cada cinco filas caen monedas en la cartera. El récord se toma una vez, cuando la torre llega arriba, y cada nivel guarda el suyo.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Calma, Normal o Rápido. Cambiar arranca un tablero limpio en ese nivel." },
        { title: "Muévela de lado", body: "Los botones de flecha bajo el tablero, un deslizamiento encima, o las flechas del teclado." },
        { title: "Gírala", body: "El botón de giro, un toque en el tablero, o la flecha arriba. Pegada a una pared se aparta sola." },
        { title: "Suéltala", body: "El último botón la manda directa a la sombra de rayas. Esperar también vale." },
        { title: "Completa una fila", body: "Desaparece. La partida acaba cuando la siguiente forma ya no tiene sitio para entrar." },
      ],

      tips: [
        {
          title: "Un hueco cuesta más que la altura",
          body: "Una torre alta y lisa todavía tiene arreglo. Una casilla enterrada bajo otra forma bloquea su fila entera hasta que desmontes todo lo de encima. Puestos a elegir, alto y limpio.",
        },
        {
          title: "Guarda un canal abierto",
          body: "Deja una columna del extremo vacía y construye el resto hasta tres o cuatro de alto. Cuando llegue la pieza recta despeja cuatro filas de golpe, que son 100 puntos en vez de 40.",
        },
        {
          title: "La siguiente forma ya está a la vista",
          body: "Encima del tablero está la que llega después de esta. Míralo antes de decidir, porque más o menos la mitad de tus decisiones cambian cuando lo haces.",
        },
        {
          title: "Suelta pronto y a menudo",
          body: "Usa el botón de soltar sin parar mientras aprendes. La gracia no es el punto extra por fila. Es que pasas por el triple de formas en los mismos diez minutos.",
        },
        {
          title: "Deja Rápido para más adelante",
          body: "La cruz deja un hueco casi siempre que aterriza, y Rápido es el único nivel que la reparte. Volved cuando despejar tres filas de una os salga sin pensar.",
        },
      ],

      teaches: [
        { title: "Rotación mental", body: "Ver en qué se convierte una forma tras un cuarto de vuelta, antes de girarla." },
        { title: "Planificar", body: "Cada colocación decide qué colocaciones quedan. Por eso la forma siguiente está en pantalla." },
        { title: "Elegir la opción menos mala", body: "A veces la casilla buena no existe. Eliges, colocas y sigues." },
        { title: "Paciencia contra impulso", body: "Una fila ahora o cuatro dentro de un rato. La misma pregunta, una y otra vez." },
      ],

      ages: [
        { title: "5 a 6", body: "Calma, y sin decir nada de la puntuación. Cuatro formas son de sobra y los botones son grandes." },
        { title: "7 a 9", body: "Calma y después Normal. Aquí es donde empiezan a mirar la vista previa." },
        { title: "10 en adelante", body: "Normal. Un canal lateral y un despeje de cuatro filas es el primer objetivo con nombre propio." },
        { title: "Adultos", body: "Rápido, después de unas cuantas partidas en Normal. 140 milisegundos por paso es menos tiempo del que parece." },
      ],

      accessibility:
        "Aquí todo son toques sueltos. Cinco botones grandes bajo el tablero hacen absolutamente todo, y nada del juego pide arrastrar ni mantener el dedo. Deslizar por el tablero y las flechas del teclado también funcionan si os van más, y los tres caminos son equivalentes. La sombra de rayas marca la casilla de aterrizaje, así que nadie tiene que alinear columnas a ojo. Cada forma tiene su propio color y su propio contorno, de modo que se siguen distinguiendo sin depender del color. No hay destellos rápidos ni ningún sonido del que dependa el juego.",

      together: [
        { title: "Uno gira, otro mueve", body: "Dos personas, un móvil. Divertido durante unas tres partidas y competitivo a partir de ahí." },
        { title: "Cambio en cada partida", body: "Pasadlo cuando la torre llegue arriba. Se lo lleva quien más filas haga en la tarde." },
        { title: "Poned un objetivo pequeño", body: "Diez filas en Calma. Para un niño que acaba de empezar, un objetivo cercano vale más que un récord lejano." },
        { title: "Sin soltar", body: "Una partida entera usando solo la velocidad de caída. El ritmo cambia por completo." },
      ],

      faq: [
        {
          q: "¿Este juego de bloques es gratis?",
          a: "Sí. Nada que pagar, nada que comprar dentro y ningún registro. Todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Cómo se juega en el móvil?",
          a: "Cinco botones bajo el tablero: izquierda, girar, derecha, bajar y soltar. También puedes deslizar por el tablero y tocarlo para girar la forma.",
        },
        {
          q: "¿Qué cambia en cada nivel?",
          a: "Sobre todo qué formas reparte. Calma tiene 4 formas en un tablero de 8 por 14, Normal tiene 9 en uno de 10 por 18, y Rápido añade dos formas de cinco casillas incómodas de tumbar. El ritmo también cambia, de 1000 milisegundos por paso a 140.",
        },
        {
          q: "¿Cuántos puntos vale una fila?",
          a: "Una fila son 10, dos juntas son 30, tres son 60 y cuatro son 100. Soltar una forma suma un punto por cada fila que se salta al caer.",
        },
        {
          q: "¿El juego acelera?",
          a: "Sí, según las filas despejadas. Calma acelera cada 6 filas hasta un suelo de 620 milisegundos, Normal cada 5 hasta 260 y Rápido cada 4 hasta 140.",
        },
        {
          q: "¿Se puede jugar sin conexión?",
          a: "Sí. Después de una visita queda guardado en el aparato y funciona sin cobertura.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En puntos, donde gana el más alto, y por separado en cada nivel. Se lee una vez, cuando termina la partida.",
        },
        {
          q: "¿Para qué edad es?",
          a: "A partir de unos cinco años en Calma. En el juego no se lee nada, así que un niño que todavía no lee juega solo.",
        },
        {
          q: "¿Tiene anuncios?",
          a: "Ninguno. Ni banners ni nada que se ponga entre partida y partida.",
        },
      ],

      keywords: ["bloques que caen", "puzle de bloques", "arcade", "clásico", "infinito", "rotación"],
    },
  },

  provenance: [
    {
      claim: "a tidy bot survives 100% of Calm runs, 99.3% of Normal, 0% of Fast (median 78 rows)",
      source: "scripts/sim/blocks-rows.mjs",
    },
    {
      claim: "random placement ends a Normal run after about 20 pieces with no row cleared",
      source: "scripts/sim/blocks-rows.mjs",
    },
    {
      claim: "4 / 9 / 11 shapes, boards 8x14 and 10x18, drop 1000ms down to 140ms",
      source: "src/games/blocks/logic.ts",
    },
    {
      claim: "a row pays 10, two 30, three 60, four 100; a drop pays a point per row fallen",
      source: "src/games/blocks/logic.ts",
    },
    {
      claim: "coins every five rows, and the record is points, higher is better, per level",
      source: "src/sdk/score.ts",
    },
  ],
};
