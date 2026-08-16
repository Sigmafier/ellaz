import type { GameContent } from "../types";
import { fitFr } from "./fr/fit";

/**
 * Shape Fit - the placement puzzle whose whole selling point is an ABSENCE.
 *
 * Nothing on the screen moves until a child touches it, the shapes cannot be
 * turned, and the run ends only when none of the three offered shapes fits
 * anywhere. So the skill is looking ahead rather than reacting in time, which
 * is the opposite of `blocks`, and the header of `src/games/fit/logic.ts`
 * carries the full comparison.
 *
 * The three languages are written, not translated. They open on different
 * sentences, order their paragraphs differently and make different jokes,
 * because a translation carries the source language's rhythm and that rhythm is
 * exactly what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/fit-lookahead.mjs`, which drives the
 * shipped reducer over 3,000 runs per level per bot, or from the game's own
 * code. See `provenance` at the bottom.
 */
export const fit: GameContent = {
  id: "fit",

  copy: {
    he: {
      name: "צורות מתאימות",
      metaTitle: "צורות מתאימות - פאזל חשיבה חינם | Ellaz",
      metaDescription:
        "פאזל צורות חינמי בדפדפן. שלוש צורות במגש, נוגעים באחת ומניחים אותה על הלוח, ושורה או עמודה מלאה נעלמת. בלי שעון, בלי הרשמה.",

      lede: "פאזל צורות חינם, ישר בדפדפן. שלוש צורות מחכות במגש, נוגעים באחת ואז במשבצת, והיא נוחתת שם. שורה מלאה נעלמת, וגם עמודה מלאה. שום דבר לא זז עד שנוגעים בו.",

      body: [
        "שלוש צורות מחכות במגש. נוגעים באחת, נוגעים במשבצת, והיא נוחתת שם. שורה מלאה נעלמת. עמודה מלאה נעלמת גם. זהו.",

        "אין שעון ואין כוח משיכה כאן, אז המיומנות היא להסתכל קדימה ולא להספיק, ואת זה אפשר למדוד במקום להבטיח. הרצנו 3,000 ריצות בכל רמה עם שני בוטים. אחד מהם מניח צורה במקום חוקי אקראי, והשני עובר על כל ההנחות החוקיות של שלוש הצורות ובוחר את הלוח שמנקה הכי הרבה קווים ומשאיר הכי מעט משבצות בודדות כלואות. ברמה הקלה הבוט שמסתכל קדימה שרד 112.7 הנחות מול 21.8 של האקראי, כלומר פי 5.17. ברמה הקשה אותו בוט בדיוק מגיע ל-19.3 מול 12.5, פי 1.54 בלבד. מה שמפריד בין הרמות הוא מלאי הצורות ולא קצב: הקלה מחלקת מעשר צורות קצרות על לוח 6 על 6, והקשה מכל תשע עשרה, כולל מוטות באורך חמש וריבוע 3 על 3 שצריך לתכנן להם מקום כמה הנחות מראש.",

        "ריצה נגמרת בדרך אחת בלבד: אף אחת משלוש הצורות במגש כבר לא נכנסת לשום מקום. אז מדדנו כמה הלוח היה מלא בדיוק ברגע הזה, וברמה הקשה התשובה היא 50.2 אחוז. חצי לוח ריק. ב-45.3 אחוז מהריצות נשאר יותר מחצי לוח פנוי. לא נגמר לכם המקום, נגמרה לכם הצורה המתאימה.",

        "כשצורה ביד, כל משבצת שהיא יכולה לשבת עליה מקבלת נקודה לבנה קטנה. אין מה לקרוא. הנקודות מתמעטות ככל שהלוח מתמלא, וברגע מסוים הן מפסיקות להיות קישוט ומתחילות להיות התשובה.",

        "וההודאה. ברמה הקלה המשחק משתדל לחלק צורה שנכנסת, והוא בודק אותה מול הלוח כפי שהוא באותו רגע, בזמן ששתי הצורות האחרות במגש עומדות לשנות בדיוק את הלוח הזה. זו הערכה, לא הבטחה. גם ריצה קלה נגמרת. אין כאן כפתור ביטול, אז הנחה היא סופית, וההתחלה מחדש היא הדרך היחידה ללוח נקי.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קל על לוח 6 על 6, בינוני וקשה על 8 על 8. החלפה פותחת ריצה חדשה." },
        { title: "נוגעים בצורה", body: "אחת משלוש במגש. תמיד יש אחת ביד, אז אי אפשר להישאר בלי כלום." },
        { title: "הולכים אחרי הנקודות", body: "הנקודות הלבנות מסמנות בדיוק איפה הפינה השמאלית העליונה של הצורה יכולה לנחות." },
        { title: "נוגעים בלוח", body: "נגיעה שלא מתאימה מקבלת מסגרת מקווקוות. הצורה נשארת ביד ושום דבר לא נלקח." },
        { title: "סוגרים קו", body: "שורה או עמודה מלאה מתפנה. השתיים ביחד שוות פי שלושה מאחת לבד." },
      ],

      tips: [
        {
          title: "המוט הארוך קודם",
          body: "מוט בן חמש משבצות נכנס רק כשיש שורה או עמודה כמעט ריקה. תניחו אותו בזמן שיש לו מקום, ולא כשכבר אין.",
        },
        {
          title: "אל תשאירו משבצת בודדה",
          body: "חור אחד שכל שכניו מלאים אפשר לסתום רק בעזרת הריבוע הקטן, והוא לא תמיד מגיע. עדיף אזור פנוי אחד גדול משלושה קטנים.",
        },
        {
          title: "תסתכלו על שלושתן",
          body: "החלטה נכונה על הצורה הראשונה לפעמים חוסמת את השלישית. לפני ההנחה הראשונה, בדקו איפה שתי האחרות היו יושבות.",
        },
        {
          title: "פינה משותפת",
          body: "משבצת שנמצאת גם בשורה כמעט מלאה וגם בעמודה כמעט מלאה שווה יותר מכל משבצת אחרת בלוח, כי הנחה אחת מפילה שם שני קווים.",
        },
      ],

      teaches: [
        { title: "תכנון קדימה", body: "כל הנחה משנה מה יוכל להיכנס אחריה. שלוש צורות בבת אחת זו בדיוק כמות הבחירה שאפשר להחזיק בראש." },
        { title: "מרחב וסיבוב", body: "הצורות לא מסתובבות, אז צריך לזהות איפה כל אחת מתאימה כמו שהיא. זו חשיבה מרחבית ולא ניסוי וטעייה." },
        { title: "לחשוב לפני הפעולה", body: "אין פה כלום שממהר. ילד שלומד לעצור שנייה לפני הנגיעה משפר את התוצאה מיד." },
        { title: "לקבל סוף", body: "כשנגמרות ההנחות אף אחד לא נענש. לוחצים התחלה מחדש ומתחילים ריצה חדשה." },
      ],

      ages: [
        { title: "4 עד 5", body: "רמה קלה בלבד. הלוח קטן והצורות קצרות, אז כמעט כל נגיעה מצליחה." },
        { title: "6 עד 7", body: "בינוני. לוח 8 על 8 וגם צורות בנות ארבע וחמש משבצות, וכבר משתלם להסתכל על כל המגש." },
        { title: "8 ומעלה", body: "קשה. הריבוע הגדול והמוטות הארוכים דורשים תוכנית, לא רק זריזות עין." },
        { title: "מבוגרים", body: "מעל 20 הנחות ברמה הקשה זו תוצאה טובה. הבוט שמסתכל קדימה מגיע ל-19.3 בממוצע." },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. שלושת התאים במגש בגובה 96 פיקסלים, הרבה מעל שני סנטימטרים בכל מסך. אין שעון ואין ספירה לאחור, אז אפשר לעצור באמצע ולחשוב כמה שרוצים. הנחה שאינה חוקית עונה במסגרת מקווקוות ולא בצליל שגיאה, כי סירוב הוא לא נזיפה, ושום דבר לא נלקח. כל משבצת בלוח נושאת תווית עם מספר העמודה והשורה שלה, כך שקורא מסך מבחין ביניהן במקום להקריא שישים וארבע פעמים אותו דבר. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "צורה לכל אחד", body: "בתורות, שלוש הנחות למגש. פתאום כל אחד רואה מה השני השאיר לו." },
        {
          title: "תגידו איפה ולמה",
          body: "לפני הנגיעה, בקשו לשמוע איזה קו ההנחה הזו מקרבת. ילד שיודע לענות כבר משחק ולא רק נוגע במסך.",
        },
        { title: "מי שרד יותר", body: "אותה רמה, שני מכשירים, וסופרים הנחות. אין שעון אז אף אחד לא ממהר." },
        { title: "לוח בלי מוטות", body: "נסו סיבוב שבו אתם מניחים את המוטות הארוכים ראשונים תמיד. הריצה נראית אחרת לגמרי." },
      ],

      faq: [
        {
          q: "אפשר לסובב את הצורות?",
          a: "לא, וזה בכוונה. צורה שאי אפשר להפוך צריך לתכנן לה מקום לפני שהיא מגיעה, ולא לתקן אחרי שהיא כבר ביד. בגלל זה כל כיוון של מוט או פינה הוא צורה נפרדת בערכה.",
        },
        {
          q: "למה המשחק נגמר כשיש עוד מקום בלוח?",
          a: "כי המקום שנשאר לא בצורה הנכונה. מדדנו את זה: ברמה הקשה הלוח מלא 50.2 אחוז בממוצע ברגע שנגמרות ההנחות, וב-45.3 אחוז מהריצות נשאר יותר מחצי לוח ריק.",
        },
        {
          q: "יש כפתור ביטול?",
          a: "אין. הנחה היא סופית, וזו הסיבה שכדאי להסתכל על כל שלוש הצורות לפני הראשונה. כפתור ההתחלה מחדש פותח לוח נקי מתי שרוצים.",
        },
        {
          q: "מה קורה כשנוגעים במקום שלא מתאים?",
          a: "מופיעה מסגרת מקווקוות והצורה נשארת ביד. לא נלקחות נקודות ולא מסתיים תור, כי סירוב הוא לא טעות.",
        },
        {
          q: "כמה הנחות זו תוצאה טובה?",
          a: "בוט שבודק את כל ההנחות החוקיות מגיע ל-112.7 הנחות ברמה הקלה ול-19.3 בקשה. מעל המספרים האלה אתם משחקים ממש טוב.",
        },
        {
          q: "כדאי לנקות שורה מיד?",
          a: "לא תמיד. שורה ועמודה שנופלות יחד שוות פי שלושה משורה בודדת, אז לפעמים משתלם להחזיק קו כמעט מלא עוד הנחה אחת ולסגור את שניהם.",
        },
        { q: "המשחק חינמי?", a: "לגמרי. אין תשלום, אין רכישות בתוך המשחק וגם לא גרסה מורחבת בכסף." },
        { q: "יש פרסומות?", a: "אין. לא באנרים וגם לא סרטונים בין ריצות." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. זה רץ בדפדפן, ואחרי ביקור אחד הוא נשמר במכשיר ועובד גם בלי קליטה.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בנקודות, כשיותר זה טוב יותר, ובנפרד לכל רמה. לוח 6 על 6 ולוח 8 על 8 אינם אותו הישג.",
        },
      ],

      keywords: ["פאזל צורות", "בלוקים", "חשיבה מרחבית", "לוגיקה", "תכנון", "משחק שקט"],
    },

    en: {
      name: "Shape Fit",
      metaTitle: "Free Block Fit Puzzle - Play Online | Ellaz",
      metaDescription:
        "A free block fit puzzle in your browser. Three shapes wait in a tray, you tap one onto the board, and a full row or column clears. No timer, no falling.",

      lede: "A free shape-fitting puzzle that runs in your browser. Three shapes wait in a tray. Tap one, tap a square, and it lands there. A full row clears, and so does a full column, and nothing on the board moves until you touch it.",

      body: [
        "Nothing falls. Nothing is timed. You tap a shape, you tap a square, and it stays exactly where you put it until a line takes it away.",

        "The shapes cannot be turned, and that one rule is what makes this a planning game instead of a reaction game. A bar you cannot rotate has to be planned for before it arrives rather than fixed once it is in your hand.",

        "So the skill here is looking ahead, and that is a claim you can put a number on. We ran 3,000 runs per level with two bots. One drops a shape on a random legal square. The other checks every legal placement of all three offered shapes and keeps the board that clears the most lines. On easy the looking-ahead bot survived 112.7 placements against 21.8 for the random tapper, which is 5.17 times as long. On hard the same bot manages only 19.3 against 12.5, a gain of 1.54. What separates the levels is the shape pool rather than speed: easy deals from ten short shapes onto a six by six board, hard from all nineteen, including five-long bars and a three by three block that want room reserved several placements ahead.",

        "A run ends one way only. Not one of the three shapes in the tray fits anywhere. We measured how full the board was at that moment, and on hard the answer is 50.2%. Half of it empty. In 45.3% of hard runs more than half the board was still free when the last shape refused. You do not run out of room here. You run out of the right shape.",

        "The admission. Easy tries to deal you a shape that fits, and it judges that against the board as it stands, while the other two shapes in the tray are about to change that board. It is an approximation and meant to be one. Easy runs still end. There is no undo anywhere in this game either, so a placement is permanent and restart is the only way back to a clean board.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy is six by six, medium and hard are eight by eight. Switching starts a fresh run." },
        { title: "Tap a shape", body: "One of the three in the tray. One is always held, so you can never end up holding nothing." },
        { title: "Follow the dots", body: "Faint white dots mark every square the held shape's top left corner can legally land on." },
        { title: "Tap the board", body: "A tap that does not fit answers with a dashed ring. The shape stays in your hand." },
        { title: "Close a line", body: "A full row or a full column clears. Both at once are worth three times one." },
      ],

      tips: [
        {
          title: "Long bars first",
          body: "A five-square bar only fits while a row or a column is nearly empty. Place it while it still has somewhere to go, not once it has nowhere.",
        },
        {
          title: "Never strand a single square",
          body: "A hole with filled squares on every side can only be closed by the single dot, and the dot does not always come. One big open area beats three small ones.",
        },
        {
          title: "Read all three",
          body: "The right home for the first shape sometimes locks out the third. Before you place anything, check where the other two would have sat.",
        },
        {
          title: "Hunt the crossing square",
          body: "A square sitting in both a nearly full row and a nearly full column beats every other square on the board, because one placement drops two lines there.",
        },
      ],

      teaches: [
        { title: "Planning ahead", body: "Every placement changes what can follow it. Three shapes at once is about as much choice as fits in a head." },
        { title: "Spatial reasoning", body: "Shapes never rotate, so you have to see where each one belongs as it is. That is looking, not trial and error." },
        { title: "Thinking before acting", body: "Nothing here is in a hurry. A child who learns to pause before tapping improves immediately." },
        { title: "Accepting an ending", body: "When the placements run out nobody is punished. Press restart and a new run begins." },
      ],

      ages: [
        { title: "4 to 5", body: "Easy only. The board is small and the shapes are short, so nearly every tap works." },
        { title: "6 to 7", body: "Medium. Eight by eight, with four and five-square shapes, and now the whole tray is worth reading." },
        { title: "8 and up", body: "Hard. The big square and the long bars want a plan rather than a quick eye." },
        { title: "Grown-ups", body: "More than 20 placements on hard is a good run. Our looking-ahead bot averages 19.3." },
      ],

      accessibility:
        "One tap per action, with no dragging and no press-and-hold, so it works with alternative input devices and with a small hand that does not aim well yet. The three tray slots are 96 pixels tall, comfortably over two centimetres on any screen. There is no clock and no countdown, so you can stop and think for as long as you like. A placement that is not allowed answers with a dashed outline rather than an error sound, because a refusal is not a telling-off. Every square on the board carries its own column and row in its label, so a screen reader can tell sixty-four of them apart. The whole thing plays in silence without losing any information.",

      together: [
        { title: "One shape each", body: "Take turns, three placements to a tray. Suddenly you each care what the other left behind." },
        {
          title: "Say where and why",
          body: "Before the tap, ask which line that placement brings closer. A child who can answer is playing the game rather than touching the screen.",
        },
        { title: "Who lasted longer", body: "Same level, two devices, count the placements. No clock, so nobody is rushing." },
        { title: "Bars first, always", body: "Try a run where the long bars go down before anything else. It plays like a different game." },
      ],

      faq: [
        {
          q: "Can I rotate the shapes?",
          a: "No, and that is the design. A bar you cannot turn has to be planned for before it arrives instead of fixed once it is in your hand, which is why every orientation is its own shape in the set.",
        },
        {
          q: "Why did the game end when there was still space?",
          a: "Because the space left was the wrong shape. On hard the board is 50.2% full on average when the placements run out, and in 45.3% of runs more than half of it is still empty.",
        },
        {
          q: "Is there an undo button?",
          a: "There is not. A placement is permanent, which is why reading all three shapes before the first one pays. Restart opens a clean board whenever you want one.",
        },
        {
          q: "What happens when I tap somewhere it does not fit?",
          a: "A dashed ring appears and the shape stays in your hand. Nothing is deducted, because a refusal is not a mistake.",
        },
        {
          q: "How many placements is a good run?",
          a: "A bot checking every legal placement reaches 112.7 on easy and 19.3 on hard. Above those numbers you are playing well.",
        },
        {
          q: "Should I clear a line as soon as I can?",
          a: "Not always. A row and a column falling together are worth three times a single row, so it is often worth holding a nearly full line one more placement.",
        },
        { q: "Is it free?", a: "Completely. No payment, no in-game purchases, and no larger paid edition." },
        { q: "Are there ads?", a: "None at all. No banners, and nothing playing between runs." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works with no signal.",
        },
        {
          q: "How is the record measured?",
          a: "In points, where more is better, and separately per level. A six by six board and an eight by eight board are not the same achievement.",
        },
      ],

      keywords: ["block fit", "shape puzzle", "spatial", "logic", "planning", "quiet game"],
    },

    es: {
      name: "Encaja Formas",
      metaTitle: "Encaja formas - puzle gratis | Ellaz",
      metaDescription:
        "Puzle de encajar formas gratis en el navegador. Tres figuras esperan en la bandeja: tocas una, tocas una casilla y cae ahí. Una fila o columna llena se vacía.",

      lede: "Un puzle de encajar formas, gratis y en el navegador. Tres figuras esperan en la bandeja: tocas una, tocas una casilla y ahí se queda. Una fila llena desaparece, y una columna llena también. Nada se mueve hasta que alguien toca la pantalla.",

      body: [
        "No cae nada y no corre ningún reloj. Tocas una figura, tocas una casilla y la figura se queda exactamente donde la pusiste.",

        "Las figuras no giran. Esa única regla convierte el juego en un ejercicio de previsión: una barra que no puedes girar hay que preverla antes de que llegue, no arreglarla cuando ya la tienes en la mano.",

        "Y como la habilidad es mirar hacia delante, se puede medir en lugar de prometerla. Lanzamos 3.000 partidas por nivel con dos robots. Uno coloca la figura en una casilla legal cualquiera; el otro repasa todas las colocaciones legales de las tres figuras y se queda con el tablero que limpia más líneas. En fácil el robot que mira hacia delante aguantó 112,7 colocaciones frente a 21,8 del que juega al azar, es decir 5,17 veces más. En difícil ese mismo robot llega solo a 19,3 frente a 12,5, una mejora de 1,54. Lo que separa los niveles es el surtido de figuras y no la velocidad: el fácil reparte entre diez figuras cortas sobre un tablero de 6 por 6, y el difícil entre las diecinueve, con barras de cinco casillas y un cuadrado de 3 por 3 que exigen reservarles sitio varias jugadas antes.",

        "Una partida termina de una sola manera: ninguna de las tres figuras cabe ya en ningún sitio. Medimos cuánto tablero había ocupado en ese instante y en difícil la respuesta es el 50,2%. Medio tablero vacío. En el 45,3% de las partidas quedaba más de la mitad libre. No te quedas sin sitio, te quedas sin la forma que encaja.",

        "Y la parte honesta. El nivel fácil intenta repartir una figura que quepa, y la comprueba contra el tablero tal y como está en ese momento, mientras las otras dos están a punto de cambiar ese mismo tablero. Es una aproximación y quiere serlo. Las partidas fáciles también terminan. Tampoco hay botón para deshacer, así que una colocación es definitiva y reiniciar es la única vuelta a un tablero limpio.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil es 6 por 6; medio y difícil, 8 por 8. Cambiar empieza una partida nueva." },
        { title: "Toca una figura", body: "Una de las tres de la bandeja. Siempre hay una en la mano, así que nunca te quedas sin nada." },
        { title: "Sigue los puntos", body: "Unos puntos blancos marcan cada casilla donde puede aterrizar la esquina superior izquierda." },
        { title: "Toca el tablero", body: "Si ahí no cabe, aparece un borde de rayas y la figura sigue en tu mano." },
        { title: "Cierra una línea", body: "Una fila o una columna llena se vacía. Las dos a la vez valen el triple que una sola." },
      ],

      tips: [
        {
          title: "Las barras largas, primero",
          body: "Una barra de cinco casillas solo entra mientras queda una fila o una columna casi vacía. Colócala cuando todavía tiene sitio, no cuando ya no lo tiene.",
        },
        {
          title: "Nunca dejes una casilla suelta",
          body: "Un hueco rodeado de casillas llenas solo lo cierra la figura de un cuadradito, y esa no siempre llega. Una zona libre grande vale más que tres pequeñas.",
        },
        {
          title: "Lee las tres",
          body: "El mejor sitio para la primera figura a veces deja fuera a la tercera. Antes de colocar nada, mira dónde habrían cabido las otras dos.",
        },
        {
          title: "Busca el cruce",
          body: "Una casilla que está a la vez en una fila casi llena y en una columna casi llena vale más que ninguna otra, porque una sola colocación tira dos líneas.",
        },
      ],

      teaches: [
        { title: "Anticipar", body: "Cada colocación cambia lo que puede venir después. Tres figuras a la vez es justo lo que cabe en la cabeza." },
        { title: "Razonamiento espacial", body: "Las figuras no giran, así que hay que ver dónde encaja cada una tal cual. Eso es mirar, no probar." },
        { title: "Pensar antes de actuar", body: "Aquí nada corre. Un niño que aprende a parar un segundo antes de tocar mejora enseguida." },
        { title: "Aceptar un final", body: "Cuando se acaban las jugadas nadie recibe un castigo. Se pulsa reiniciar y empieza otra partida." },
      ],

      ages: [
        { title: "4 a 5", body: "Solo fácil. El tablero es pequeño y las figuras son cortas, así que casi cualquier toque funciona." },
        { title: "6 a 7", body: "Medio. Tablero de 8 por 8 y figuras de cuatro y cinco casillas: ya compensa leer toda la bandeja." },
        { title: "8 en adelante", body: "Difícil. El cuadrado grande y las barras largas piden un plan, no buen ojo." },
        { title: "Adultos", body: "Pasar de 20 colocaciones en difícil está bien jugado. Nuestro robot previsor se queda en 19,3." },
      ],

      accessibility:
        "Un toque por acción, sin arrastrar y sin mantener pulsado, así que funciona con dispositivos de entrada alternativos y con una mano pequeña que todavía no apunta bien. Las tres casillas de la bandeja miden 96 píxeles de alto, bastante más de dos centímetros en cualquier pantalla. No hay reloj ni cuenta atrás, de modo que se puede parar a pensar el rato que haga falta. Una colocación que no está permitida responde con un borde de rayas y no con un sonido de error, porque negarse no es una regañina. Cada casilla del tablero lleva su columna y su fila en la etiqueta, así que un lector de pantalla distingue las sesenta y cuatro. Se juega entero en silencio sin perderse ninguna información.",

      together: [
        { title: "Una figura cada uno", body: "Por turnos, tres colocaciones por bandeja. De repente importa lo que te ha dejado el otro." },
        {
          title: "Di dónde y por qué",
          body: "Antes de tocar, preguntad qué línea acerca esa jugada. Un niño que sabe responder está jugando y no solo tocando la pantalla.",
        },
        { title: "Quién aguanta más", body: "Mismo nivel, dos aparatos, y a contar colocaciones. Como no hay reloj, nadie corre." },
        { title: "Partida de barras", body: "Probad una partida colocando siempre las barras largas antes que nada. Se juega distinto." },
      ],

      faq: [
        {
          q: "¿Se pueden girar las figuras?",
          a: "No, y es intencionado. Una barra que no se puede girar hay que preverla antes de que llegue en lugar de arreglarla cuando ya la tienes, y por eso cada orientación es una figura distinta.",
        },
        {
          q: "¿Por qué se acaba la partida si todavía queda sitio?",
          a: "Porque el sitio que queda tiene la forma equivocada. En difícil el tablero está ocupado al 50,2% de media cuando se acaban las jugadas, y en el 45,3% de las partidas queda más de medio tablero libre.",
        },
        {
          q: "¿Hay botón de deshacer?",
          a: "No lo hay. Una colocación es definitiva, y por eso compensa leer las tres figuras antes de mover la primera. Reiniciar abre un tablero limpio cuando quieras.",
        },
        {
          q: "¿Qué pasa si toco donde no cabe?",
          a: "Aparece un borde de rayas y la figura se queda en tu mano. No se resta nada, porque negarse no es un error.",
        },
        {
          q: "¿Cuántas colocaciones son un buen resultado?",
          a: "Un robot que repasa todas las colocaciones legales llega a 112,7 en fácil y a 19,3 en difícil. Por encima de esas cifras estás jugando muy bien.",
        },
        {
          q: "¿Conviene limpiar una línea en cuanto se puede?",
          a: "No siempre. Una fila y una columna que caen juntas valen el triple que una fila sola, así que a menudo compensa aguantar una línea casi llena una jugada más.",
        },
        { q: "¿Es gratis?", a: "Del todo. Ni pagos ni compras dentro del juego, y tampoco existe una edición de pago." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada entre partida y partida." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, después de una visita, queda guardado en el aparato y va sin cobertura.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En puntos, donde más es mejor, y por separado en cada nivel. Un tablero de 6 por 6 y uno de 8 por 8 no son el mismo logro.",
        },
      ],

      keywords: ["encajar formas", "bloques", "puzle", "lógica", "espacial", "sin reloj"],
    },

    fr: fitFr,
  },

  provenance: [
    {
      claim: "3,000 runs per level per bot",
      source: "scripts/sim/fit-lookahead.mjs",
    },
    {
      claim:
        "a bot checking every legal placement survives 112.7 placements on easy against 21.8 for a random tapper, 5.17 times as long",
      source: "scripts/sim/fit-lookahead.mjs",
    },
    {
      claim: "on hard the same two bots reach 19.3 and 12.5, a gain of only 1.54",
      source: "scripts/sim/fit-lookahead.mjs",
    },
    {
      claim:
        "on hard the board is 50.2% full when the run ends, and 45.3% of runs end with more than half of it empty",
      source: "scripts/sim/fit-lookahead.mjs",
    },
    {
      claim: "three shapes offered at a time, nineteen in the set, easy drawing from ten of them",
      source: "src/games/fit/logic.ts",
    },
    {
      claim: "easy is a six by six board, medium and hard are eight by eight",
      source: "src/games/fit/logic.ts",
    },
    {
      claim: "two lines cleared together are worth three times a single line",
      source: "src/games/fit/logic.ts",
    },
    {
      claim: "the tray slots are 96 pixels tall and every board square is labelled by column and row",
      source: "src/games/fit/FitGame.tsx",
    },
    {
      claim: "the record is points, where more is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
