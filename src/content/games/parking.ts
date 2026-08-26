import type { GameContent } from "../types";
import { parkingFr } from "./fr/parking";

/**
 * Escape the Jam - the sliding car park whose selling point is a property of
 * the CONSTRUCTION rather than a promise: `deal` walks backwards from the
 * solved board, so a solution exists before the board is drawn, and because
 * every slide is reversible nothing a player does can wedge it.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and each names a DIFFERENT true limit, because a
 * translation carries the source language's rhythm and that rhythm is exactly
 * what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/parking-jams.mjs`, which drives the
 * shipped rules over 400 dealt boards per level and searches the real
 * position space for a shortest solution, or from the game's own code. See
 * `provenance` at the bottom.
 */
export const parking: GameContent = {
  id: "parking",

  copy: {
    he: {
      name: "לצאת מהחניון",
      metaTitle: "לצאת מהחניון - משחק חניון חינם | Ellaz",
      metaDescription:
        "משחק חניון חינם בדפדפן. כל מכונית נעה רק על הציר שלה. מפנים את הדרך ומוציאים את המכונית הכתומה דרך הפרצה בקיר הימני. שלוש רמות, החזרה בלי הגבלה.",

      lede: "משחק פאזל חניון חינם, ישר בדפדפן. חניון של שש על שש, כל מכונית נוסעת רק קדימה ואחורה על הציר שלה, והכתומה צריכה להגיע לפרצה בקיר הימני. השיא נמדד במהלכים, ופחות זה טוב יותר.",

      body: [
        "נוגעים במכונית והיא עולה ליד. נקודות נדלקות על כל משבצת שהיא יכולה להגיע אליה. נוגעים באחת. היא נוסעת לשם.",

        "את המספרים מדדנו ולא הערכנו. חיפוש רוחב על מרחב המצבים האמיתי של 400 לוחות בכל רמה מחזיר את הפתרון הקצר ביותר עצמו: 4.2 מהלכים ברמה הקלה ו-5.4 בקשה. לפני שהמספרים האלה נשמעים קטנים, שימו לב מה נספר כאן כמהלך. נגיעה שולחת מכונית עד המשבצת שנגעתם בה, אז מעבר של ארבע משבצות עולה מהלך אחד ולא ארבעה. במשחקי הפקק הקלאסיים סופרים משבצת אחר משבצת, ולכן פתרון שנראה שם באורך חמישה עשר הוא בערך חמישה כאן. הטיול שבנה את הלוח הוא סיפור אחר: 56.1 צעדים בקלה ו-73 בקשה, בערך פי שלושה עשר מהפתרון הקצר.",

        "חלק מהתנועה על המסך הוא באמת נוף. בפתרון הקצר ביותר זזות 5.3 מכוניות מתוך 12 ברמה הקשה, אז כשבע מהן לא זזות בכלל. בוט שנוגע באקראי יוצא בסוף מ-85 אחוז מהלוחות הקשים, ולוקח לו 122.9 מהלכים כשהוא מצליח.",

        "וההודאה. תשע מכוניות ושתים עשרה דורשות מהלוח בדיוק את אותו עומק מינימלי, חמישה מהלכים, וזה כתוב ברצפות שבקוד עצמו. הסיבה מעניינת יותר מהמספר: התקרה שייכת לפריסה ולא לערבוב. המחולל לא מרוויח עומק מכך שיערבב זמן רב יותר, אלא מכך שהוא בונה פריסה אחרי פריסה, מודד בכל אחת כמה מהלכים היא באמת דורשת, ועוצר ברגע שאחת מגיעה לרצפה. עד 250 פריסות, ואם אף אחת לא הגיעה, הוא מוסר את העמוקה שנמדדה. אז שתים עשרה מכוניות לא מייצרות פאזל עמוק יותר מתשע, הן מייצרות פאזל עמוס יותר, 5.2 מול 5.4 מהלכים במדידה שלנו. מי שמצפה שהרמה הקשה תכפיל את הבינונית יקבל בעיקר יותר מכוניות לעבור עליהן.",

        "להיתקע פה אי אפשר. כל הזזה הפיכה, אז לכל מצב שהגעתם אליו נשאר לפחות המהלך שהביא אתכם לשם, והלכנו 480,000 מצבים בלי למצוא אחד סתום. כפתור החזרה מוריד גם את המונה, כי מהלך שביטלתם הוא לא מהלך שעשיתם.",
      ],

      howToPlay: [
        {
          title: "מרימים מכונית",
          body: "נגיעה אחת מרימה אותה. הנקודות שנדלקות הן בדיוק המשבצות שהיא יכולה להגיע אליהן, לא יותר ולא פחות.",
        },
        {
          title: "מזיזים אותה",
          body: "נוגעים במשבצת פנויה שנמצאת על הציר שלה. החזית של המכונית עוצרת בדיוק על המשבצת שנגעתם בה.",
        },
        {
          title: "מתחרטים",
          body: "נגיעה במכונית אחרת מרימה אותה במקום. נגיעה במכונית שבידיים מניחה אותה. שום דבר מזה לא נספר כמהלך.",
        },
        {
          title: "יוצאים",
          body: "המכונית הכתומה צריכה להגיע לקיר הימני בשורת הפרצה. המספר השני בשורה סופר כמה מכוניות עדיין חוסמות אותה.",
        },
        {
          title: "צעד אחורה",
          body: "כל לחיצה מבטלת הזזה אחת, בלי הגבלה על מספר הפעמים, והמונה יורד יחד איתה.",
        },
      ],

      tips: [
        {
          title: "תסתכלו קודם על השורה",
          body: "המספר השני סופר כמה מכוניות עומדות בינכם ובין הפרצה, בדרך כלל אחת עד שלוש. כל אחת מהן חייבת לזוז לפחות פעם אחת ואתם חייבים לנסוע לפחות פעם אחת, אז המספר הזה ועוד אחד הוא הרצפה של הפתרון שלכם.",
        },
        {
          title: "תשאלו לאן היא יכולה ללכת",
          body: "מכונית מאונכת צריכה משבצת פנויה מעליה או מתחתיה. אם שתיהן תפוסות, השאלה משתנה למי יפנה את המשבצת הזאת, וכאן מתחילים הלוחות בני שלושה מהלכים.",
        },
        {
          title: "אל תסדרו את החניון",
          body: "להזיז מכונית כי היא נראית חונה עקום עולה מהלך ולא מקדם כלום. כשבע מתוך שתים עשרה לא זזות בכלל בפתרון הטוב.",
        },
        {
          title: "תשחקו את אותו לוח שוב",
          body: "החזרה מגיעה עד החלוקה עצמה. לרדת לשלושה מהלכים על לוח שכבר סיימתם מלמד יותר מעשרה לוחות חדשים.",
        },
      ],

      teaches: [
        {
          title: "להפריד חשוב מבולט",
          body: "שתים עשרה מכוניות על המסך, חמש שקובעות. לחפש את מה שבאמת מפריע במקום לסרוק הכול זו הרגלה ששווה הרבה מעבר לחניון מצויר.",
        },
        {
          title: "לחבר שני צעדים",
          body: "לפעמים כדי לפנות את החוסמת צריך קודם לדחוף מישהי אחרת. שני מהלכים קשורים זה החשיבה הרב-שלבית הראשונה של ילד.",
        },
        {
          title: "לטעות בלי מחיר",
          body: "החזרה חינם ובלי הגבלה. ילד שיודע ששום נגיעה לא הורסת כלום מנסה הרבה יותר, וזה בדיוק מה שמבקשים ממנו כאן.",
        },
        {
          title: "כיוונים",
          body: "מכונית שוכבת אף פעם לא עולה, מכונית עומדת אף פעם לא זזה הצידה. הכלל האחד הזה הוא כל הגאומטריה של המשחק.",
        },
      ],

      ages: [
        {
          title: "4 עד 5",
          body: "רמה קלה, שש מכוניות. המחולל דוחה כל לוח שנפתר בפחות מארבעה מהלכים, אז גם הקל שבהם מבקש רצף קצר של צעדים.",
        },
        {
          title: "6 עד 8",
          body: "בינונית, תשע מכוניות. מספיק תנועה כדי שיהיה צריך לחפש את החוסמת, ולא מספיק כדי לייאש.",
        },
        {
          title: "9 ומעלה",
          body: "קשה, שתים עשרה מכוניות. הכיף עובר מלצאת אל לצאת בחמישה מהלכים במקום בחמישים.",
        },
        {
          title: "מבוגרים",
          body: "לוח קשה שנסגר בחמישה או שישה מהלכים הוא לוח שנקרא נכון. הגרוע ביותר מתוך 400 חלוקות דרש 11.",
        },
      ],

      accessibility:
        "הכול נעשה בנגיעות ולא בגרירה, וכל משבצת בחניון היא מטרה באותו גודל בלי קשר למי חונה עליה. המכונית של השחקן לא מזוהה רק לפי הצבע: יש עליה חץ לכיוון היציאה ומסגרת עבה יותר, בשביל ילד שמתקשה להבחין בין הכתום לכחול. אין שעון ואין תקרת מהלכים, אז אפשר להניח את הטאבלט באמצע מחשבה ולחזור. הזזה שאינה חוקית עונה ברעידה קטנה ובלי צליל שגיאה, כי סירוב הוא לא נזיפה.",

      together: [
        {
          title: "מהלך לכל אחד",
          body: "בתורות על אותו לוח. המונה המשותף הופך כל מהלך מיותר לגלוי לכולם, וזה כל מה שצריך כדי שתתחיל שיחה.",
        },
        {
          title: "להגיד לפני שנוגעים",
          body: "לומר בקול איזו מכונית מפריעה ולמה, לפני ההזזה. ילד שיודע לענות על זה קורא את הלוח ולא מתקתק עליו.",
        },
        {
          title: "הימור על שניים",
          body: "נחשו ביחד אם הלוח נסגר בדיוק בחמישה מהלכים. ברמה הקשה זה קורה ב-73.8 אחוז מהמקרים, מה שהופך את ההימור למשעשע בעיקר כשמפסידים אותו.",
        },
        {
          title: "אותה רמה, שני מכשירים",
          body: "כל אחד משחק את הלוח שלו וסופרים מהלכים בסוף. אין שעון, אז אף אחד לא ממהר.",
        },
      ],

      faq: [
        {
          q: "כל לוח באמת פתיר?",
          a: "כן, וזו בנייה ולא בדיקה. המשחק יוצא מהמצב הפתור ומתרחק ממנו בהזזות שהזזה חוקית מחזירה, אז המסלול חזרה קיים עוד לפני שהלוח הוצג.",
        },
        {
          q: "אפשר להיתקע בלי אף מהלך?",
          a: "לא. כל הזזה הפיכה, אז בכל מצב נשאר לפחות מהלך חוקי אחד. עברנו 480,000 מצבים ולא היה אף מבוי סתום.",
        },
        {
          q: "כמה מהלכים זו תוצאה טובה?",
          a: "הפתרון הקצר ביותר עומד על 4.2 מהלכים בקלה ו-5.4 בקשה, והמחולל דוחה לוח שנפתר בפחות מארבעה בקלה או מחמישה בקשה. לרדת אל הרצפה עצמה זו התוצאה הטובה ביותר שהלוח מרשה.",
        },
        {
          q: "החזרה פוגעת בשיא?",
          a: "לא. המונה יורד בכל לחיצה על צעד אחורה, כי מהלך שבוטל אינו מהלך שנעשה.",
        },
        {
          q: "מה ההבדל בין קל לקשה?",
          a: "מספר המכוניות, שש מול שתים עשרה, על אותו חניון של שש על שש. הפתרון הקצר מתארך רק במעט: 4.2 מול 5.4 מהלכים.",
        },
        {
          q: "המשחק חינמי?",
          a: "לגמרי. שלוש הרמות, ללא תשלום, ללא רכישות בתוך המשחק וללא גרסה מורחבת.",
        },
        {
          q: "יש פרסומות?",
          a: "אין. לא באנרים ולא סרטונים בין לוחות.",
        },
        {
          q: "מאיזה גיל?",
          a: "מארבע בערך ברמה הקלה. אין במשחק שום דבר שצריך לקרוא כדי לשחק, אז ילד שעדיין לא קורא משחק לבד.",
        },
      ],

      keywords: ["משחק חניון", "פקק", "פאזל מכוניות", "חשיבה", "לוגיקה", "משחק הזזה"],
    },

    en: {
      name: "Escape the Jam",
      metaTitle: "Escape the Jam - Free Car Park Puzzle | Ellaz",
      metaDescription:
        "A free sliding car puzzle in your browser. Every car is stuck on one axis. Clear the lane and drive the orange car out through the gap in the wall.",

      lede: "A free car park puzzle that runs in your browser. Six squares by six, every car locked to a single axis, and yours is the orange one that has to reach the gap in the right-hand wall. Three levels, unlimited undo, and the record is the fewest moves you managed.",

      body: [
        "Tap a car. It lifts. Dots appear on every square it can reach, and tapping one drives it there. That is the whole control scheme.",

        "The interesting question is how short the way out really is, so it was measured rather than guessed. A breadth-first search over the real position space of 400 dealt boards per level returns the true minimum instead of an estimate of it: 4.2 moves on easy and 5.4 on hard. Before those numbers sound small, look at what counts as a move. A tap sends a car all the way to the square you touched, so crossing four squares costs one move rather than four, where the classic wooden traffic-jam puzzles count one move per square. A fifteen-move board in that unit is roughly five in this one, and mixing the two up is the easiest way to misread everything else here. The walk that built the board is a different story: 56.1 steps on easy and 73 on hard, about thirteen times the shortest line.",

        "Some of that traffic really is scenery. A shortest solution moves 5.3 of the 12 cars on hard, so about seven are never touched. A bot sliding uniformly at random does eventually escape 85% of hard boards, taking 122.9 moves when it manages it. Your first board will land nearer that number than the other one.",

        "The admission. Nothing here tells you what the shortest line was. Finish a hard board in fifty moves and the confetti is exactly the same confetti, because the game keeps one number per level and only ever compares it with your own. No par is printed anywhere, there is no star rating, and there is no hint button. The only way to find out whether a board had a five-move answer is to undo back to the deal and look again.",

        "You cannot wedge this. Every slide is reversible, so any position you reach still offers at least the move that got you into it - 480,000 positions walked, zero dead ends. Undo brings the counter down with the car.",
      ],

      howToPlay: [
        {
          title: "Pick a car up",
          body: "One tap lifts it. The dots that appear are exactly the squares it can reach, no more and no fewer.",
        },
        {
          title: "Slide it",
          body: "Tap a free square in line with it. The car's nose stops on the square you touched, and a tap off its axis just makes it twitch.",
        },
        {
          title: "Change your mind",
          body: "Tapping a different car picks that one up instead. Tapping the car in your hand puts it down. Neither counts as a move.",
        },
        {
          title: "Get out",
          body: "The orange car has to reach the right-hand wall on the row with the gap in it. The second counter tracks how many cars are still across the lane.",
        },
        {
          title: "Step back",
          body: "Undo takes back one slide per press, as many times as you like, and the move counter comes back down with it.",
        },
      ],

      tips: [
        {
          title: "Read the lane first",
          body: "The second counter says how many cars stand between you and the gap, usually one to three. Every one of them has to move at least once and so do you, so that number plus one is the floor under your own solution.",
        },
        {
          title: "Ask where the blocker can go",
          body: "A vertical car needs a free square above or below it. When both are taken the question becomes who will free one, and that is where three-move boards start.",
        },
        {
          title: "Do not tidy the car park",
          body: "Moving a car because it looks badly parked costs a move and buys nothing. Ten of the twelve never move in the best line.",
        },
        {
          title: "Replay the same board",
          body: "Undo reaches all the way back to the deal. Cutting a board you have already finished down to three moves teaches more than ten fresh ones.",
        },
      ],

      teaches: [
        {
          title: "Sorting what matters from what is loud",
          body: "Twelve cars on screen and five that decide it. Looking for what is genuinely in the way instead of scanning everything is a habit worth far more than a drawn car park.",
        },
        {
          title: "Chaining two ideas",
          body: "Clearing the blocker sometimes needs another car pushed aside first. Two linked moves is a child's first real piece of multi-step reasoning.",
        },
        {
          title: "Being wrong for free",
          body: "Undo is unlimited and costs nothing. A child who knows no tap can break anything tries far more of them, which is precisely what is being asked here.",
        },
        {
          title: "Axes",
          body: "A car lying down never climbs, a car standing up never shifts sideways. That single rule is the whole geometry of the board.",
        },
      ],

      ages: [
        {
          title: "4 to 5",
          body: "Easy, six cars. The generator refuses any board that comes apart in under four moves, so even the gentlest one asks for a short sequence.",
        },
        {
          title: "6 to 8",
          body: "Medium, nine cars. Enough traffic that the blocker has to be found, not enough to put anyone off.",
        },
        {
          title: "9 and up",
          body: "Hard, twelve cars. The fun moves from getting out to getting out in five moves rather than fifty.",
        },
        {
          title: "Grown-ups",
          body: "A hard board closed in five or six moves is a board that was read properly. The worst of 400 needed eleven.",
        },
      ],

      accessibility:
        "Everything is a tap, never a drag, and every square of the car park is a target of the same size whatever happens to be parked on it. The player's car is not identified by colour alone: it carries an arrow pointing at the exit and a heavier outline, for a child who cannot easily separate the orange one from the blue ones. There is no clock and no move limit, so a tablet can be put down in the middle of a thought. An impossible slide answers with a small shake and no error sound, because a refusal is not a telling-off.",

      together: [
        {
          title: "One move each",
          body: "Take turns on the same board. The shared counter makes a wasted move visible to everybody, which is all it takes to start an argument worth having.",
        },
        {
          title: "Say it before you tap",
          body: "Name the car that is in the way and why, out loud, before moving it. A child who can answer that is reading the board rather than drumming on it.",
        },
        {
          title: "Bet on two",
          body: "Guess together whether the board closes in exactly five. On hard it does 73.8% of the time, which makes the bet fun mostly when you lose it.",
        },
        {
          title: "Same level, two devices",
          body: "Everyone plays their own deal and the move counts get compared at the end. There is no clock, so nobody is hurrying.",
        },
      ],

      faq: [
        {
          q: "Is every board solvable?",
          a: "Yes, and it is built rather than tested. The game starts from the finished position and walks away from it in slides that a legal slide puts back, so the route out exists before the board is drawn.",
        },
        {
          q: "Can you get stuck with no legal move?",
          a: "No. Every slide is reversible, so any position keeps at least one legal move. We walked 480,000 positions and found no dead end.",
        },
        {
          q: "How many moves is a good score?",
          a: "The true shortest solution averages 4.2 moves on easy and 5.4 on hard, and the generator refuses anything under four on easy or five on hard. Reaching that floor is as good as a board allows.",
        },
        {
          q: "Does undo hurt my record?",
          a: "No. The counter drops by one on every step back, because a move you took back is not a move you made.",
        },
        {
          q: "What is the difference between easy and hard?",
          a: "The number of cars, six against twelve, on the same six by six car park. The shortest solution lengthens only a little: 4.2 moves against 5.4.",
        },
        {
          q: "Is it free?",
          a: "Completely. All three levels, no payment, no in-game purchases and no bigger paid version.",
        },
        {
          q: "Are there ads?",
          a: "None. No banners, and nothing playing between boards.",
        },
        {
          q: "What age is it for?",
          a: "About four and up on easy. Nothing has to be read in order to play, so a child who cannot read plays alone.",
        },
      ],

      keywords: ["car park puzzle", "traffic jam game", "sliding block puzzle", "logic", "unblock the car", "free puzzle"],
    },

    es: {
      name: "Salir del Atasco",
      metaTitle: "Salir del atasco - puzle de coches | Ellaz",
      metaDescription:
        "Puzle de coches gratis en el navegador. Cada coche va solo por su eje. Despeja el carril y saca el coche naranja por el hueco del muro derecho.",

      lede: "Un puzle de coches, gratis y en el navegador. Un aparcamiento de 6 por 6, cada coche atrapado en su propio eje, y el tuyo es el naranja que tiene que alcanzar el hueco del muro de la derecha. El récord cuenta movimientos, y menos es mejor.",

      body: [
        "Tocas un coche. Se levanta. Aparecen puntos en las casillas a las que puede ir, y tocar uno lo lleva allí.",

        "El tablero no se revuelve al azar para comprobar después si tiene salida. Se construye al revés: la partida arranca en la posición ganadora, con el coche naranja ya aparcado en el hueco, y se aleja de ella movimiento a movimiento anotando el inverso de cada uno. Como todo deslizamiento se deshace con el deslizamiento contrario, recorrer ese camino al revés gana. La solución existe antes de que nadie vea el tablero.",

        "Ese camino de fabricación es largo, y ahí está la gracia. Medido sobre 400 tableros repartidos por nivel, el mezclado ocupa 56,1 movimientos en fácil y 73 en difícil, mientras que la mejor solución cabe en 4,2 y 5,4 respectivamente. Ese mínimo es exacto: una búsqueda en anchura recorre el espacio real de posiciones en lugar de estimarlo. Un factor de trece separa las dos cifras. Y conviene mirar qué cuenta como movimiento, porque un toque manda el coche hasta la casilla tocada: cruzar cuatro casillas cuesta uno y no cuatro, mientras que los juegos de atasco clásicos cuentan casilla por casilla y por eso sus cifras son casi el triple.",

        "La parte honesta, y ahora es otra. Antes de repartir, el juego levanta un aparcamiento tras otro, mide en cada uno cuántos movimientos exige de verdad y se detiene en el primero que alcanza el suelo de su nivel; prueba hasta 250 y, si ninguno llega, entrega el más profundo que haya medido. Eso cuesta tiempo, y en un teléfono lento se nota: reiniciar o cambiar de nivel no sale instantáneo. Es lo que se paga por no repartir un tablero que se abre en dos toques, y se paga en un botón que alguien ha pulsado a propósito, nunca en mitad de una jugada.",

        "Atascarse del todo es imposible. Cada deslizamiento se deshace, así que toda posición conserva al menos el movimiento que llevó hasta ella, y en 480.000 posiciones recorridas no apareció ninguna cerrada. Deshacer baja también el contador.",
      ],

      howToPlay: [
        {
          title: "Coge un coche",
          body: "Un toque lo levanta. Los puntos que se encienden son exactamente las casillas a las que puede llegar, ni una más.",
        },
        {
          title: "Deslízalo",
          body: "Toca un hueco alineado con él. El morro del coche se detiene justo en la casilla que has tocado; un toque fuera de su eje solo lo hace temblar.",
        },
        {
          title: "Cambia de idea",
          body: "Tocar otro coche coge ese en su lugar. Tocar el que llevas en la mano lo suelta. Nada de eso cuenta como movimiento.",
        },
        {
          title: "Sal",
          body: "El coche naranja tiene que llegar al muro derecho por la fila del hueco. El segundo contador dice cuántos coches siguen cruzados.",
        },
        {
          title: "Un paso atrás",
          body: "Deshacer devuelve un deslizamiento por pulsación, sin límite de veces, y el contador de movimientos baja con él.",
        },
      ],

      tips: [
        {
          title: "Lee primero la fila",
          body: "El segundo contador dice cuántos coches hay entre el tuyo y el hueco, normalmente entre uno y tres. Cada uno tiene que moverse al menos una vez, y tú también, así que esa cifra más uno es el suelo de tu propia solución.",
        },
        {
          title: "Pregunta adónde puede irse el que estorba",
          body: "Un coche vertical necesita una casilla libre arriba o abajo. Si las dos están ocupadas, la pregunta pasa a ser quién va a liberarlas, y ahí empiezan los tableros de tres movimientos.",
        },
        {
          title: "No ordenes el aparcamiento",
          body: "Mover un coche porque parece mal aparcado cuesta un movimiento y no aporta nada. Unos siete de los doce no se tocan en la mejor solución.",
        },
        {
          title: "Repite el mismo tablero",
          body: "Deshacer llega hasta el reparto. Bajar a tres movimientos un tablero que ya has terminado enseña más que diez tableros nuevos.",
        },
      ],

      teaches: [
        {
          title: "Separar lo importante de lo llamativo",
          body: "Doce coches en pantalla y cinco que deciden. Buscar lo que de verdad estorba en lugar de repasarlo todo es una costumbre que vale mucho más que un aparcamiento dibujado.",
        },
        {
          title: "Encadenar dos ideas",
          body: "Despejar al que bloquea a veces exige apartar antes a otro. Dos movimientos encadenados son el primer razonamiento de varios pasos de un niño.",
        },
        {
          title: "Equivocarse gratis",
          body: "Deshacer es ilimitado y no cuesta nada. Un niño que sabe que ningún toque rompe nada prueba muchísimo más, que es justo lo que aquí se le pide.",
        },
        {
          title: "Los ejes",
          body: "Un coche tumbado nunca sube y uno de pie nunca se desplaza de lado. Esa única regla es toda la geometría del juego.",
        },
      ],

      ages: [
        {
          title: "4 a 5",
          body: "Fácil, seis coches. El generador rechaza cualquier tablero que se resuelva en menos de cuatro movimientos, así que hasta el más suave pide una secuencia corta.",
        },
        {
          title: "6 a 8",
          body: "Medio, nueve coches. Bastante tráfico para tener que buscar al que estorba, no tanto como para desanimar.",
        },
        {
          title: "9 en adelante",
          body: "Difícil, doce coches. La gracia pasa de salir a salir en cinco movimientos en vez de en cincuenta.",
        },
        {
          title: "Adultos",
          body: "Un tablero difícil cerrado en cinco o seis movimientos está bien leído. El peor de 400 pedía once.",
        },
      ],

      accessibility:
        "Todo se juega tocando, nunca arrastrando, y cada casilla del aparcamiento es un objetivo del mismo tamaño con independencia de lo que haya aparcado encima. El coche del jugador no se distingue solo por el color: lleva una flecha hacia la salida y un contorno más grueso, pensando en un niño al que le cuesta separar el naranja del azul. No hay reloj ni tope de movimientos, de modo que se puede dejar la tableta en mitad de una idea. Un deslizamiento imposible responde con una sacudida pequeña y sin sonido de error.",

      together: [
        {
          title: "Un movimiento cada uno",
          body: "Por turnos en el mismo tablero. El contador compartido deja a la vista de todos cada movimiento tirado, que es cuanto hace falta para que empiece la conversación.",
        },
        {
          title: "Dilo antes de tocar",
          body: "Nombrad en voz alta qué coche estorba y por qué, antes de moverlo. Un niño que sabe responder está leyendo el tablero y no tecleando sobre él.",
        },
        {
          title: "La apuesta de los dos",
          body: "Adivinad juntos si el tablero se cierra en exactamente cinco. En difícil ocurre el 73,8% de las veces, lo que hace divertida la apuesta sobre todo cuando se pierde.",
        },
        {
          title: "Mismo nivel, dos aparatos",
          body: "Cada uno juega su reparto y al final se comparan los contadores. Como no hay reloj, nadie corre.",
        },
      ],

      faq: [
        {
          q: "¿Todos los tableros tienen solución?",
          a: "Sí, y está construida en lugar de comprobada. El juego parte de la posición ganadora y se aleja con movimientos que un movimiento legal deshace, así que el camino de vuelta existe antes de dibujar el tablero.",
        },
        {
          q: "¿Se puede uno quedar sin ningún movimiento?",
          a: "No. Cada deslizamiento se deshace, así que toda posición conserva al menos un movimiento legal. Recorrimos 480.000 posiciones sin encontrar ninguna cerrada.",
        },
        {
          q: "¿Cuántos movimientos son un buen resultado?",
          a: "La solución más corta ronda los 4,2 movimientos en fácil y los 5,4 en difícil, y el generador rechaza cualquiera por debajo de cuatro en fácil o de cinco en difícil. Llegar a ese suelo es lo mejor que permite el tablero.",
        },
        {
          q: "¿Deshacer perjudica al récord?",
          a: "No. El contador baja uno en cada paso atrás, porque un movimiento que has deshecho no es un movimiento que hayas hecho.",
        },
        {
          q: "¿Qué cambia entre fácil y difícil?",
          a: "El número de coches, seis frente a doce, en el mismo aparcamiento de 6 por 6. La solución más corta se alarga poco: 4,2 movimientos frente a 5,4.",
        },
        {
          q: "¿Es gratis?",
          a: "Del todo. Los tres niveles, sin pagos, sin compras dentro del juego y sin versión ampliada.",
        },
        {
          q: "¿Tiene anuncios?",
          a: "Ninguno. Ni banners ni cortes entre tableros.",
        },
        {
          q: "¿Desde qué edad?",
          a: "Desde los cuatro años en el nivel fácil. No hace falta leer nada para jugar, así que un niño que aún no lee juega solo.",
        },
      ],

      keywords: ["puzle de coches", "atasco", "aparcamiento", "lógica", "desbloquear el coche", "juego de deslizar"],
    },

    fr: parkingFr,
  },

  provenance: [
    {
      claim: "the true shortest solution averages 4.2 moves on easy, 5.2 on medium and 5.4 on hard",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "73.8% of hard boards close in exactly five moves, the floor its tier declares",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "the worst board in 400 needed 11 moves on hard, 10 on medium, 9 on easy",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "the walk that built the board runs 56.1 moves on easy and 73 on hard, about 13 times the shortest line",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "a shortest solution moves 5.3 of the 12 cars on hard, so about seven never move",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "a bot sliding at random escapes 85% of hard boards, taking 122.9 moves when it does",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "one to three cars stand in the lane at the deal, 1.8 on average on hard",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      claim: "zero dead ends in 480,000 positions walked, because every slide is reversible",
      source: "scripts/sim/parking-jams.mjs",
    },
    {
      // Declared by the game rather than measured here: `LEVELS` carries a
      // `floor` per tier and `deal` refuses a board under it, medium and hard
      // sharing 5. The same file records that a floor of 5 on easy was tried
      // and refused because roughly one easy layout in five could not meet it.
      claim:
        "the generator refuses a board under 4 moves on easy and 5 on medium and hard, grading layouts until one clears that floor, up to 250, and taking the deepest graded if none does",
      source: "src/games/parking/logic.ts",
    },
    {
      claim: "a move is a whole slide, where the classic puzzles count one per square",
      source: "src/games/parking/logic.ts",
    },
    {
      claim: "six, nine or twelve cars on the same 6x6 car park, with the exit on the third row",
      source: "src/games/parking/logic.ts",
    },
    {
      claim: "the record is moves, fewer is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
