import type { GameContent } from "../types";
import { match3Fr } from "./fr/match3";

/**
 * Match Three - the swap puzzle whose difficulty lever is COLOURS, not speed.
 *
 * There is no clock here and no way to lose: `swapAt` shuffles any board that
 * runs out of legal swaps, so the only thing a round asks for is looking. The
 * header of `src/games/match3/logic.ts` carries the rest.
 *
 * The four languages are written, not translated. They open on different
 * sentences, order their paragraphs differently and make different jokes,
 * because a translation carries the source language's rhythm and that rhythm is
 * exactly what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/match3-cascades.mjs`, which drives
 * the shipped reducer over 2,000 rounds per level per bot, or from the game's
 * own code. See `provenance` at the bottom.
 *
 * THE ADMISSION IS THE MEASUREMENT THAT SURPRISED US. Looking at the whole
 * board before swapping is worth 1.27x on easy and only 1.07x on hard, which is
 * the opposite of what a difficulty ladder is supposed to do. Six colours make
 * every swap smaller, so the good move and the ordinary move converge. That is
 * on the page in all four languages.
 */
export const match3: GameContent = {
  id: "match3",

  copy: {
    he: {
      name: "שלושה בשורה",
      metaTitle: "שלושה בשורה - משחק אבנים חינם | Ellaz",
      metaDescription:
        "משחק שלושה בשורה חינמי בדפדפן. מחליפים שתי אבנים שכנות, שלוש באותו צבע נעלמות, והשאר נופל למטה. בלי שעון ובלי הרשמה.",

      lede: "משחק שלושה בשורה חינם, ישר בדפדפן. נוגעים באבן, נוגעים בשכנה שלה, והן מתחלפות. שלוש באותו צבע נעלמות והאבנים מעליהן נופלות למטה. אי אפשר להיתקע ואי אפשר להפסיד.",

      body: [
        "נוגעים באבן. נוגעים בשכנה. הן מתחלפות, ושלוש באותו צבע נעלמות.",

        "מה שקורה אחרי זה הוא כל העניין. האבנים שמעל הנעלמות נופלות למטה, ולפעמים הנפילה הזאת מסדרת שלוש חדשות בלי שאף אחד תכנן אותן, ואז שוב, ושוב. מדדנו את זה על אלפיים סיבובים בכל רמה: ברמה הקלה 59.2 אחוז מההחלפות המוצלחות ממשיכות לשרשרת של שני שלבים לפחות, וברמה הקשה רק 36.2 אחוז. השרשרת הארוכה ביותר שראינו הייתה בת ארבעה עשר שלבים, על לוח קל בגודל שש על שש. הצליל עולה בכל שלב, אז אפשר לשמוע כמה רחוק זה הלך בלי להסתכל.",

        "הרמה לא משנה את המהירות, כי אין כאן מהירות. היא משנה כמה צבעים יש. ארבעה צבעים על לוח שש על שש, חמישה על שבע על שבע, שישה על שמונה על שמונה. ככל שיש יותר צבעים, כך פחות מקרי שמשהו יסתדר לבד, ולכן הרמה הקלה מרגישה כמו זיקוקים והקשה מרגישה כמו עבודה שקטה. ההחלפה הממוצעת מנקה 9.96 אבנים ברמה הקלה ו-5.33 בקשה.",

        "וההודאה, שהיא מדידה שהפתיעה אותנו. הרצנו בוט שבוחר החלפה חוקית אקראית מול בוט שעובר על כל הלוח ובוחר את ההחלפה שמנקה הכי הרבה. ברמה הקלה ההסתכלות שווה פי 1.27, וברמה הקשה פי 1.07 בלבד. כלומר דווקא ברמה שאמורה לדרוש חשיבה, החשיבה מרוויחה הכי פחות: שישה צבעים מקטינים כל החלפה, אז ההחלפה הטובה וההחלפה הרגילה מתקרבות זו לזו. אנחנו כותבים את זה במקום להבטיח שהרמה הקשה חכמה יותר.",

        "לוח שנתקע בלי אף החלפה חוקית מתערבב לבד, עם אותן אבנים בדיוק. זה כמעט אף פעם לא קורה. באלפיים סיבובים ברמה הקשה זה קרה 0.001 פעמים לסיבוב בממוצע, וברמות האחרות בכלל לא. זו רשת ביטחון שרוב הילדים לעולם לא יראו.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קל, בינוני או קשה. ההבדל הוא מספר הצבעים וגודל הלוח, אף פעם לא הזמן." },
        { title: "נוגעים באבן", body: "היא מקבלת מסגרת. נגיעה שנייה באותה אבן מוותרת עליה." },
        { title: "נוגעים בשכנה", body: "למעלה, למטה, ימינה או שמאלה. באלכסון לא נחשב. אפשר גם להחליק אבן לכיוון שכנה במקום שתי נגיעות." },
        { title: "מסתכלים על הנפילה", body: "אם נוצרה שלישייה חדשה בדרך, היא נעלמת גם, והצליל עולה בכל שלב." },
        { title: "סוגרים סיבוב", body: "כל סיבוב מבקש מספר אבנים. הפס הכחול מתחת ללוח מראה כמה נשאר." },
      ],

      tips: [
        {
          title: "תסתכלו למטה, לא למעלה",
          body: "אבן שנעלמת בשורה התחתונה מפילה את כל העמודה מעליה. אותה שלישייה בדיוק בשורה העליונה לא מזיזה כלום.",
        },
        {
          title: "ארבע שוות יותר משלוש",
          body: "החלפה שמסדרת ארבע אבנים באותו צבע מנקה ארבע ולא שלוש, ופותחת חור רחב יותר שדרכו נופלות עוד אבנים.",
        },
        {
          title: "אל תמהרו לראשונה שראיתם",
          body: "אין שעון. ההחלפה הראשונה שקופצת לעין היא בדרך כלל שלישייה פשוטה, ושלושים שניות של הסתכלות מוצאות אחת שממשיכה.",
        },
        {
          title: "ברמה הקשה, פשוט תמשיכו",
          body: "שם ההסתכלות שווה רק שבעה אחוזים. מספר החלפות סביר עדיף על החלפה אחת מושלמת שלקח דקה למצוא.",
        },
      ],

      teaches: [
        { title: "זיהוי תבניות", body: "למצוא שלוש אבנים זהות בין ארבעים ותשע זה בדיוק מה שקריאה מוקדמת דורשת מהעין." },
        { title: "לחשוב צעד קדימה", body: "האבנים שנופלות אחרי ההחלפה הן תוצאה שאפשר לחזות. ילד שלומד לחזות אותה משחק אחרת." },
        { title: "סבלנות", body: "אין פה כלום שממהר. אפשר להסתכל על הלוח דקה שלמה." },
        { title: "לקבל מזל", body: "שרשרת ארוכה היא לפעמים תכנון ולפעמים סתם נפילה מוצלחת. שתיהן בסדר." },
      ],

      ages: [
        { title: "4 עד 5", body: "רמה קלה. ארבעה צבעים ולוח קטן, וכמעט כל החלפה מסתדרת." },
        { title: "6 עד 7", body: "בינוני. חמישה צבעים על לוח שבע על שבע, וכבר צריך לחפש." },
        { title: "8 ומעלה", body: "קשה. שישה צבעים, וההחלפה הממוצעת מנקה 5.33 אבנים בלבד." },
        { title: "מבוגרים", body: "אותו משחק בדיוק. הרמה הקשה מבקשת ארבעים אבנים בסיבוב הראשון ועוד עשר בכל סיבוב אחריו." },
      ],

      accessibility:
        "אפשר לשחק את כל המשחק בנגיעות בלבד, בלי החזקה ממושכת. החלקה מחליפה שתי אבנים בתנועה אחת למי שנוח לו כך, אבל היא תמיד רק קיצור דרך, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. לכל צבע יש גם צורה משלו, מעוין, עיגול, ריבוע, משולש, כוכב ומשושה, כי כאחד מכל שנים עשר בנים לא מפריד בין אדום לירוק, ומשחק שכל הסימן שלו הוא גוון הוא משחק שהם לא יכולים לשחק בכלל. אין שעון ואין ספירה לאחור, אז אפשר לעצור באמצע ולחשוב כמה שרוצים. החלפה שלא יוצרת שלישייה עונה במסגרת כתומה ולא בצליל שגיאה, והלוח נשאר בדיוק כפי שהיה. כל משבצת בלוח נושאת תווית עם מספר העמודה והשורה שלה, כך שקורא מסך מבחין ביניהן במקום להקריא ארבעים ותשע פעמים אותו דבר. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "מי מוצא קודם", body: "מסתכלים על אותו לוח, ומי שמזהה החלפה ראשון מצביע. הילד יזהה לפניכם יותר פעמים משתצפו." },
        { title: "תנחשו את הנפילה", body: "לפני הנגיעה, בקשו לנחש אם תיווצר שרשרת. אחר כך תראו יחד." },
        { title: "סיבוב לכל אחד", body: "בתורות, החלפה אחת כל אחד, על אותו מכשיר. הסיבוב נסגר מהר יותר משנדמה." },
        { title: "רק שרשראות", body: "נסו סיבוב שבו מחפשים אך ורק החלפות שממשיכות. הוא לוקח הרבה יותר זמן, וזה בדיוק הרעיון." },
      ],

      faq: [
        {
          q: "אפשר להפסיד?",
          a: "לא. אין שעון, אין מספר החלפות מוגבל, והלוח מתערבב לבד אם נגמרות ההחלפות החוקיות. הדבר היחיד שקורה הוא שהסיבוב נסגר ומתחיל אחד גדול יותר.",
        },
        {
          q: "למה החלפה מסוימת לא עובדת?",
          a: "כי היא לא יוצרת שלוש באותו צבע. המשחק מחזיר את האבנים למקום, מסמן במסגרת כתומה ולא לוקח כלום. אפשר לנסות מיד שוב.",
        },
        {
          q: "מה ההבדל בין הרמות?",
          a: "מספר הצבעים וגודל הלוח. ארבעה צבעים על שש על שש, חמישה על שבע על שבע, שישה על שמונה על שמונה. הזמן אף פעם לא משתנה, כי אין זמן.",
        },
        {
          q: "מה נשמר כשיוצאים?",
          a: "הלוח, הסיבוב והניקוד. חוזרים בדיוק לאותו מקום, על אותו מכשיר, בלי לשאול כלום.",
        },
        {
          q: "מה השיא מודד?",
          a: "את הסיבוב הגבוה ביותר שהגעתם אליו, בנפרד לכל רמה. סיבוב על לוח של שישה צבעים הוא לא אותו הישג כמו סיבוב על לוח של ארבעה.",
        },
        {
          q: "למה הצליל עולה?",
          a: "כל שלב בשרשרת מנגן תו אחד גבוה יותר, על סולם פנטטוני, כדי שאפשר יהיה לשמוע כמה רחוק הנפילה הלכה בלי להסתכל. הסולם נעצר בראש במקום להתחיל מלמטה, כי ילד שהצליח הרגע לא צריך לשמוע שהוא חזר להתחלה.",
        },
      ],

      keywords: ["שלושה בשורה", "משחק אבנים", "משחק חינם", "פאזל", "משחק לילדים", "בלי הורדה"],
    },

    en: {
      name: "Match Three",
      metaTitle: "Match Three - free browser gem puzzle | Ellaz",
      metaDescription:
        "Free match three game in your browser. Swap two neighbouring gems, clear a line of one colour, watch the rest fall. No clock, no account, works offline.",

      lede: "A free match three puzzle that runs in the browser. Tap a gem, tap one next to it, and they trade places. Three of a colour in a line clear, and everything above them falls into the gap. There is no clock and no way to lose.",

      body: [
        "Tap a gem. Tap its neighbour. They trade, and a line of three disappears.",

        "What happens next is the reason anyone plays this. Gems above the gap fall into it, and sometimes that fall lines up three more that nobody planned, and then three more after those. We measured it across 2,000 rounds per level: on easy, 59.2% of successful swaps carry on into a chain of at least two steps, and on hard only 36.2% do. The longest chain we recorded ran to fourteen steps on a six by six board. Each step of a chain sounds a note higher than the last, so you can hear how far it went without watching.",

        "The difficulty here is colours, not speed. Four colours on a six by six board, five on seven by seven, six on eight by eight. More colours means less lands by accident, which is why easy feels like fireworks and hard feels like quiet work. The average swap clears 9.96 gems on easy and 5.33 on hard.",

        "Now the part that surprised us. We ran a bot that takes any legal swap against a bot that checks the whole board and takes the biggest one. On easy, looking is worth 1.27 times as much progress per round. On hard it is worth 1.07 times. So the level that is supposed to reward thinking rewards it least, because six colours shrink every swap until the clever move and the ordinary move are nearly the same move. We would rather write that down than claim hard is the thinking level.",

        "A board with no legal swap left shuffles itself, keeping the same gems. It almost never happens. Across 2,000 hard rounds it fired 0.001 times per round, and on the other two levels it never fired at all.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. The difference is how many colours are in play and how big the board is." },
        { title: "Tap a gem", body: "It gets a ring around it. Tapping the same gem again puts it back down." },
        { title: "Tap a neighbour", body: "Up, down, left or right. Diagonals do not count. Sliding a gem towards a neighbour does the same trade in one go." },
        { title: "Watch it fall", body: "If the falling gems line up three more, those clear too, and the note goes up a step." },
        { title: "Finish the round", body: "Each round asks for a number of gems. The bar under the board shows what is left." },
      ],

      tips: [
        {
          title: "Look at the bottom row",
          body: "Clearing three gems near the floor drops the whole column above them. The same three at the top move almost nothing.",
        },
        {
          title: "Four beats three",
          body: "A swap that lines up four clears four, and it opens a wider gap for the gems above to fall through, which is where chains start.",
        },
        {
          title: "Do not take the first swap you see",
          body: "There is no clock. The swap that jumps out is usually a plain three, and half a minute of looking often finds one that keeps going.",
        },
        {
          title: "On hard, just keep going",
          body: "Looking is worth only 7% there. A steady stream of ordinary swaps beats one perfect swap that took a minute to find.",
        },
      ],

      teaches: [
        { title: "Spotting patterns", body: "Finding three matching gems among forty-nine is the same visual search that early reading asks for." },
        { title: "Thinking one step ahead", body: "What falls after a swap is predictable. A child who starts predicting it is playing a different game from one who is not." },
        { title: "Patience", body: "Nothing here is in a hurry. Stare at the board." },
        { title: "Taking luck well", body: "A long chain is sometimes a plan and sometimes a lucky drop. Both are fine." },
      ],

      ages: [
        { title: "4 to 5", body: "Easy only. Four colours on a small board, so almost any swap works." },
        { title: "6 to 7", body: "Medium. Five colours on seven by seven, and now you have to hunt." },
        { title: "8 and up", body: "Hard. Six colours, and the average swap clears 5.33 gems." },
        { title: "Grown-ups", body: "The same game. Hard asks for forty gems in the first round and ten more in every round after it." },
      ],

      accessibility:
        "The whole game is reachable with taps, and nothing has to be held down. A swipe trades two gems in one motion for anyone who prefers that, but it is only ever a shortcut, so the game still works with alternative input and with a small hand that does not aim well yet. Every colour also has its own shape, a diamond, a circle, a square, a triangle, a star and a hexagon, because roughly one boy in twelve cannot separate the red gem from the green one and a match three whose only signal is hue is a game they cannot play at all. There is no clock and no countdown, so you can stop in the middle and think for as long as you want. A swap that makes no line answers with an orange ring rather than an error sound, and the board stays exactly as it was. Every square carries its own column and row in its label, so a screen reader can tell them apart instead of reading the same word forty-nine times. The whole game can be played in silence with nothing lost.",

      together: [
        { title: "Who sees it first", body: "Look at the same board and point when you find a swap. The child will beat you more often than you expect." },
        { title: "Guess the fall", body: "Before the tap, ask whether this one will chain. Then watch together." },
        { title: "One swap each", body: "Take turns on the same device, one swap at a time. A round closes faster than it sounds." },
        { title: "Chains only", body: "Try a round where you only take swaps you think will keep going. It takes much longer, which is the point." },
      ],

      faq: [
        {
          q: "Can you lose this game?",
          a: "No. There is no clock, no limit on swaps, and the board shuffles itself if it ever runs out of legal ones. The only thing that happens is that a round closes and a slightly bigger one opens.",
        },
        {
          q: "Why did my swap not work?",
          a: "Because it did not put three of a colour in a line. The gems go back, an orange ring appears, and nothing is taken away. You can try again straight away.",
        },
        {
          q: "What changes between the levels?",
          a: "The number of colours and the size of the board. Four colours on six by six, five on seven by seven, six on eight by eight. The speed never changes, because there is no speed.",
        },
        {
          q: "Does it remember where I was?",
          a: "Yes. The board, the round and the score come back exactly as you left them, on that device, without asking you anything.",
        },
        {
          q: "What does the record measure?",
          a: "The highest round you have reached, kept separately for each level. A round on a six-colour board is not the same achievement as a round on a four-colour one.",
        },
        {
          q: "Why does the sound climb?",
          a: "Each step of a chain plays one note higher, on a five-note scale, so you can hear how far the fall carried without watching it. The scale stops at the top rather than starting over, because a child who is doing well should not suddenly hear themselves back at the beginning.",
        },
      ],

      keywords: ["match three", "gem puzzle", "free browser game", "puzzle game", "games for kids", "no download"],
    },

    es: {
      name: "Tres en Línea",
      metaTitle: "Tres en Línea - juego de gemas gratis | Ellaz",
      metaDescription:
        "Juego de tres en línea gratis en el navegador. Intercambia dos gemas vecinas, alinea tres del mismo color y mira caer el resto. Sin reloj y sin cuenta.",

      lede: "Un juego de tres en línea gratis, directamente en el navegador. Tocas una gema, tocas otra al lado y cambian de sitio. Tres del mismo color desaparecen y todo lo que había encima cae al hueco. No hay reloj y no se puede perder.",

      body: [
        "Tocas una gema. Tocas la de al lado. Cambian, y tres del mismo color desaparecen.",

        "Lo que pasa después es la parte buena. Las gemas de arriba caen al hueco, y a veces esa caída alinea otras tres que nadie había planeado, y luego otras tres más. Lo medimos en 2.000 rondas por nivel: en fácil, el 59,2% de los intercambios que funcionan siguen en una cadena de al menos dos pasos, y en difícil solo el 36,2%. La cadena más larga que registramos llegó a catorce pasos en un tablero de seis por seis. Cada paso suena una nota más alta que el anterior, así que se oye lo lejos que ha llegado sin mirar.",

        "Aquí la dificultad son los colores, nunca la velocidad. Cuatro colores en un tablero de seis por seis, cinco en uno de siete por siete, seis en uno de ocho por ocho. Cuantos más colores, menos cosas salen solas, y por eso el nivel fácil parece fuegos artificiales y el difícil parece trabajo tranquilo. El intercambio medio limpia 9,96 gemas en fácil y 5,33 en difícil.",

        "Y ahora la parte que nos sorprendió. Pusimos a competir un programa que elige cualquier intercambio válido contra otro que revisa el tablero entero y elige el mayor. En fácil, mirar bien vale 1,27 veces más avance por ronda. En difícil vale 1,07. O sea que el nivel que debería premiar el pensar es el que menos lo premia, porque seis colores encogen cada intercambio hasta que la jugada lista y la jugada normal casi coinciden. Preferimos escribirlo a decir que el difícil es el nivel inteligente.",

        "Un tablero sin ningún intercambio válido se mezcla solo, con las mismas gemas. Casi nunca ocurre. En 2.000 rondas difíciles saltó 0,001 veces por ronda, y en los otros dos niveles no saltó ni una vez.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, media o difícil. Lo que cambia es cuántos colores hay y cómo de grande es el tablero." },
        { title: "Toca una gema", body: "Se le pone un borde. Si la vuelves a tocar, la sueltas." },
        { title: "Toca una vecina", body: "Arriba, abajo, izquierda o derecha. En diagonal no vale. Deslizar una gema hacia su vecina hace el mismo cambio de una vez." },
        { title: "Mira la caída", body: "Si al caer se alinean otras tres, también desaparecen y la nota sube un escalón." },
        { title: "Cierra la ronda", body: "Cada ronda pide un número de gemas. La barra bajo el tablero dice cuántas faltan." },
      ],

      tips: [
        {
          title: "Mira la fila de abajo",
          body: "Limpiar tres gemas cerca del suelo hace caer toda la columna que tienen encima. Las mismas tres arriba del todo casi no mueven nada.",
        },
        {
          title: "Cuatro vale más que tres",
          body: "Un intercambio que alinea cuatro limpia cuatro y abre un hueco más ancho por el que caen más gemas, que es donde empiezan las cadenas.",
        },
        {
          title: "No cojas el primero que veas",
          body: "No hay reloj. El intercambio que salta a la vista suele ser un tres normal, y medio minuto mirando encuentra otro que continúa.",
        },
        {
          title: "En difícil, sigue jugando",
          body: "Ahí mirar bien solo vale un 7%. Una racha de intercambios normales rinde más que uno perfecto que tardó un minuto en aparecer.",
        },
      ],

      teaches: [
        { title: "Ver patrones", body: "Encontrar tres gemas iguales entre cuarenta y nueve es la misma búsqueda visual que pide aprender a leer." },
        { title: "Pensar un paso más", body: "Lo que cae después de un intercambio se puede prever. Un niño que empieza a preverlo juega a otra cosa." },
        { title: "Paciencia", body: "Aquí nada corre. Mira el tablero." },
        { title: "Aceptar la suerte", body: "Una cadena larga a veces es un plan y a veces una caída afortunada. Las dos valen." },
      ],

      ages: [
        { title: "4 a 5", body: "Solo fácil. Cuatro colores y tablero pequeño, así que casi cualquier intercambio funciona." },
        { title: "6 a 7", body: "Media. Cinco colores en siete por siete, y ya hay que buscar." },
        { title: "8 en adelante", body: "Difícil. Seis colores, y el intercambio medio limpia 5,33 gemas." },
        { title: "Adultos", body: "El mismo juego. El difícil pide cuarenta gemas en la primera ronda y diez más en cada ronda siguiente." },
      ],

      accessibility:
        "El juego entero se puede jugar a base de toques, sin mantener pulsado. Deslizar cambia dos gemas de un solo gesto, para quien lo prefiera, pero siempre es un atajo y nunca la única vía, así que el juego funciona con entradas alternativas y con una mano pequeña que todavía no apunta bien. Cada color tiene además su propia forma, un rombo, un círculo, un cuadrado, un triángulo, una estrella y un hexágono, porque aproximadamente uno de cada doce niños no distingue la gema roja de la verde y un tres en línea cuyo único aviso es el tono es un juego que no pueden jugar. No hay reloj ni cuenta atrás, así que se puede parar a mitad y pensar todo lo que haga falta. Un intercambio que no forma línea responde con un borde naranja y no con un sonido de error, y el tablero se queda igual que estaba. Cada casilla lleva su columna y su fila en la etiqueta, para que un lector de pantalla las distinga en vez de leer cuarenta y nueve veces lo mismo. Se puede jugar en silencio absoluto sin perder nada.",

      together: [
        { title: "Quién lo ve antes", body: "Mirad el mismo tablero y señalad al encontrar un intercambio. El niño ganará más veces de las que esperáis." },
        { title: "Adivina la caída", body: "Antes de tocar, preguntad si esta va a encadenar. Luego lo veis juntos." },
        { title: "Un intercambio cada uno", body: "Por turnos en el mismo aparato, uno cada vez. La ronda se cierra antes de lo que parece." },
        { title: "Solo cadenas", body: "Probad una ronda buscando únicamente intercambios que continúen. Tarda mucho más, y esa es la gracia." },
      ],

      faq: [
        {
          q: "¿Se puede perder?",
          a: "No. No hay reloj, no hay límite de intercambios y el tablero se mezcla solo si alguna vez se queda sin jugadas válidas. Lo único que pasa es que se cierra una ronda y se abre otra un poco mayor.",
        },
        {
          q: "¿Por qué no funciona mi intercambio?",
          a: "Porque no deja tres del mismo color en línea. Las gemas vuelven a su sitio, aparece un borde naranja y no se quita nada. Puedes probar otra vez enseguida.",
        },
        {
          q: "¿Qué cambia entre niveles?",
          a: "El número de colores y el tamaño del tablero. Cuatro colores en seis por seis, cinco en siete por siete, seis en ocho por ocho. La velocidad no cambia nunca, porque no hay velocidad.",
        },
        {
          q: "¿Recuerda dónde iba?",
          a: "Sí. El tablero, la ronda y la puntuación vuelven tal cual los dejaste, en ese aparato, sin preguntarte nada.",
        },
        {
          q: "¿Qué mide el récord?",
          a: "La ronda más alta a la que has llegado, guardada por separado en cada nivel. Una ronda en un tablero de seis colores no es el mismo logro que una en uno de cuatro.",
        },
        {
          q: "¿Por qué sube el sonido?",
          a: "Cada paso de una cadena toca una nota más alta, en una escala de cinco notas, para que se oiga hasta dónde llegó la caída sin mirarla. La escala se queda arriba en vez de volver a empezar, porque a un niño que lo está haciendo bien no hay que decirle de golpe que ha vuelto al principio.",
        },
      ],

      keywords: ["tres en línea", "juego de gemas", "juego gratis", "puzzle", "juegos para niños", "sin descargar"],
    },

    fr: match3Fr,
  },

  provenance: [
    {
      claim: "on easy 59.2% of successful swaps chain to at least two steps, and on hard 36.2%",
      source: "scripts/sim/match3-cascades.mjs",
    },
    {
      claim: "the longest chain recorded ran to fourteen steps on a six by six board",
      source: "scripts/sim/match3-cascades.mjs",
    },
    {
      claim: "the average swap clears 9.96 gems on easy and 5.33 on hard",
      source: "scripts/sim/match3-cascades.mjs",
    },
    {
      claim:
        "looking at the whole board is worth 1.27x on easy and 1.07x on hard, measured against a bot taking any legal swap",
      source: "scripts/sim/match3-cascades.mjs",
    },
    {
      claim:
        "the no-legal-move shuffle fired 0.001 times per round on hard and never on the other two levels",
      source: "scripts/sim/match3-cascades.mjs",
    },
    {
      claim:
        "four colours on six by six, five on seven by seven, six on eight by eight, and the first hard round asks for forty gems with ten more each round after",
      source: "src/games/match3/logic.ts",
    },
    {
      claim: "a cascade step is worth ten points per gem times its depth, capped at five",
      source: "src/games/match3/logic.ts",
    },
    {
      claim:
        "every colour carries its own shape, and every square is labelled by column and row",
      source: "src/games/match3/Match3Game.tsx",
    },
    {
      claim: "the record is the round reached, where more is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
