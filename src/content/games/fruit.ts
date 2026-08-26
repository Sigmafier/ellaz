import type { GameContent } from "../types";
import { fruitFr } from "./fr/fruit";

/**
 * Fruit Drop - the merge game whose selling point is a MEASUREMENT rather than
 * a promise: a third of every merge in it is set off by another merge, and that
 * share comes out of the shipped physics rather than out of a description of it.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and make different jokes, because a translation
 * carries the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * Every figure here comes from `scripts/sim/fruit-chain.mjs`, which drives
 * `logic.ts`'s own `step` over 240 runs, or from the game's own source. See
 * `provenance` at the bottom.
 */
export const fruit: GameContent = {
  id: "fruit",

  copy: {
    he: {
      name: "מפל פירות",
      metaTitle: "מפל פירות - משחק מיזוג חינם | Ellaz",
      metaDescription:
        "מפילים פירות לקופסה פתוחה. שניים מאותו סוג שנוגעים הופכים לפרי הבא בשרשרת, והערימה מתיישבת מחדש ומפילה עוד מיזוגים. חינם, בלי הרשמה.",

      lede: "משחק מיזוג פירות חינם, ישר בדפדפן. פירות נופלים לקופסה פתוחה, שניים מאותו סוג שנוגעים זה בזה הופכים לפרי הבא בשרשרת, והערימה מתחתיהם מתיישבת מחדש. עשרה שלבים בשרשרת, מאוכמנית ועד אבטיח. הריצה נגמרת כשפרי נעצר מעל הקו שבראש הקופסה.",

      body: [
        "נוגעים בקופסה. פרי נופל. שניים זהים שנוגעים הופכים לאחד גדול יותר, וכל מה שמתחתיהם זז. זה כל החוק.",

        "הפיזיקה כאן כתובה ביד, בקובץ החוקים של המשחק עצמו, בלי מנוע. הכול עיגול. שני עיגולים חופפים בדיוק כשהמרחק בין המרכזים שלהם קטן מסכום הרדיוסים, והדרך להפריד אותם היא לאורך אותו קו בדיוק. אין מצולעים ואין סיבוב. ארבעים שורות חשבון מספיקות, ובגלל שזה חשבון ולא ציור, הצעד הוא פונקציה טהורה: אותה קופסה ואותו פרק זמן מחזירים את אותה ערימה בדיוק, בטלפון ובמחשב. הסימולציה רצה ב-120 תת-צעדים בשנייה, קבוע, והציור מבזבז את הזמן שבאמת עבר. לכן מסך של 60 הרץ ומסך של 120 הרץ מריצים את אותו משחק באותה מהירות.",

        "את המספר הבא הלכנו לחפש בכוונה. מיזוג לא רק מוסיף נקודות, הוא משנה את הצורה של כל מה שמתחתיו, אז הערימה מתיישבת ולפעמים מצמידה עוד שני זוגות שאף אחד לא כיוון. על 240 ריצות מסימולציה, 33.2 אחוז מהמיזוגים של בוט זהיר נגרמו ממיזוג קודם ולא מהנפילה שלו עצמו. בוט שמפיל באקראי הגיע ל-47.5 אחוז. שליש עד חצי מהמשחק הזה משחק את עצמו, וזה בדיוק החלק שמרגיש טוב.",

        "שני בוטים, 40 ריצות לכל קופסה לכל אחד. זה שמפיל באקראי שורד 123.1 פירות בקופסה הרחבה ו-82.0 בצרה, עם 589 ו-378 נקודות. כלל אחד משנה את התמונה: לכוון לתאום שאפשר באמת להגיע אליו, ולהפיל איפה שיוצא כשאין כזה. הבוט הזה שורד 156.8 פירות ומגיע ל-946 נקודות באותה קופסה רחבה.",

        "וההודאה, כי היא נראית לעין. הפותר מריץ חמש העברות הפרדה בכל תת-צעד, וחמש לא מספיקות לערימה עמוקה. מדדנו את הערימה בסוף כל הרגעה ומצאנו שני פירות שקועים זה בזה 1.6 יחידות עולם, חצי מהרדיוס של אוכמנית. גם שום דבר כאן לא מתגלגל, כי לפרי אין סיבוב לשמור. תסתכלו טוב על קופסה עמוסה ותראו את שניהם.",
      ],

      howToPlay: [
        { title: "מכוונים", body: "הפרי הממתין נע עם האצבע לאורך ראש הקופסה. גם חצים במקלדת מזיזים אותו." },
        { title: "מפילים", body: "נגיעה אחת והוא יוצא לדרך. במקלדת זה אנטר או רווח." },
        {
          title: "מצמידים שניים זהים",
          body: "שני פירות מאותו סוג שנוגעים הופכים לשלב הבא. הם לא חייבים לשבת אחד על השני, מספיק שהם נוגעים.",
        },
        {
          title: "שומרים על הראש",
          body: "הריצה נגמרת כשפרי עומד במקום חצי שנייה מעל הקו העליון. כל עוד הוא זז, לא קורה כלום.",
        },
      ],

      tips: [
        {
          title: "גדולים לקירות",
          body: "פרי שגדל דוחף את השכנים שלו. צמוד לקיר הוא דוחף רק לצד אחד, והמקום שהתפנה נשאר במרכז, שם באמת צריך אותו.",
        },
        {
          title: "תאום שאפשר להגיע אליו",
          body: "הבוט שמנצח כאן לא מכוון לפרי קבור מתחת לשלושה אחרים אלא לזה שנפילה ישרה באמת פוגעת בו. ההבדל הקטן הזה שווה 33.7 פירות נוספים בריצה בקופסה הרחבה.",
        },
        {
          title: "אל תסתמו בורות באוכמניות",
          body: "הקופסה מחלקת רק את חמשת השלבים התחתונים ולעולם לא מעליהם. אוכמנית שהנחתם בבור כדי לסגור אותו תישאר שם עד שתגיע אוכמנית שנייה, ובינתיים היא מרימה את הערימה.",
        },
      ],

      teaches: [
        {
          title: "לצפות תגובה",
          body: "שליש מהמיזוגים מגיע ממיזוג אחר. לראות אותו מראש לפני שנוגעים זו חשיבה בשני צעדים, בלי שורת הוראות אחת.",
        },
        {
          title: "סדר לפי גודל",
          body: "עשרה שלבים ברצף, כל אחד גדול מקודמו בערך פי 1.2. ילד לומד את הסדר דרך היד ולא דרך דף.",
        },
        {
          title: "לחיות עם בלגן",
          body: "ערימה כאן אף פעם לא מסתדרת עד הסוף, והמשחק ממשיך בכל זאת. לשחק עם תוצאה לא מושלמת זה שיעור בפני עצמו.",
        },
      ],

      ages: [
        {
          title: "4 עד 5",
          body: "הקופסה הרחבה. אין מה לקרוא, נגיעה אחת מספיקה, והפירות מתמזגים לבד מספיק פעמים כדי שזה ירגיש טוב.",
        },
        {
          title: "6 עד 8",
          body: "הקופסה הבינונית, שבה כיוון מתחיל להשתלם. הבוט הזהיר שורד בה 120.7 פירות מול 98.6 של האקראי.",
        },
        {
          title: "מבוגרים",
          body: "הקופסה הצרה, 52 יחידות רוחב. אבטיח לבדו רחב 35.6, אז שניים לא ישבו זה לצד זה לעולם וסוף השרשרת הופך ליעד אמיתי.",
        },
      ],

      accessibility:
        "נגיעה אחת עושה הכול, וגרירה לכיוון אף פעם לא חובה. הקופסה עצמה היא כפתור אמיתי: חץ ימינה ושמאלה מזיזים את הפרי הממתין, אנטר או רווח מפילים אותו, כך שאפשר לשחק את כל המשחק מהמקלדת בלי עכבר ובלי מסך מגע. לכל שלב בשרשרת יש גוון משלו, גודל משלו וציור משלו, כך שמי שמתקשה בצבעים מזהה את הפירות במשהו אחר. אין שעון בשום מקום. הערימה נעצרת מעצמה, וריצה שהפסקתם באמצע חוזרת בדיוק כמו שהייתה.",

      together: [
        {
          title: "פרי לכל אחד",
          body: "מפילים בתורות לאותה קופסה. הניקוד משותף, אז החלטה גרועה היא של כולם, וזה מצחיק הרבה יותר מלהפסיד לבד.",
        },
        {
          title: "מכריזים על המפל",
          body: "לפני שנוגעים, להגיד כמה מיזוגים הנפילה תפעיל. אחד מכל שלושה מיזוגים גורר עוד אחד, אז הניחוש כמעט אף פעם לא מדויק בפעם הראשונה.",
        },
        {
          title: "ציד האבטיח",
          body: "על 240 ריצות אבטיח הופיע ב-3 מהן בלבד, כולן בקופסה הרחבה, ושני אבטיחים לא נפגשו שם מעולם. בן אדם עושה את זה טוב יותר, וזה שווה ניסיון.",
        },
      ],

      faq: [
        {
          q: "מה קורה כששני אבטיחים נפגשים?",
          a: "שניהם נעלמים ומשאירים מקום ריק. אין שלב מעליהם, אז הזוג שווה 155 נקודות בבת אחת במקום לייצר פרי אחד עשר.",
        },
        {
          q: "כמה סוגי פירות יש?",
          a: "עשרה שלבים. הקופסה מחלקת רק חמישה מהם, הקטנים, בהגרלה שמעדיפה את הקטן מכולם. את החמישה העליונים בונים לבד.",
        },
        {
          q: "מה משתנה בין הרמות?",
          a: "רוחב הקופסה בלבד: 74, 62 או 52 יחידות. הפירות, השרשרת וההגרלה זהים בכולן, אז מעבר בין רמות הוא לא לימוד של משחק אחר.",
        },
        {
          q: "כמה זמן ריצה מחזיקה?",
          a: "בערך 91 פירות בקופסה הצרה ו-157 ברחבה לבוט הטוב שלנו, על 40 ריצות בכל קופסה. התחלה אנושית דומה יותר לאקראי, כלומר 82 ו-123.",
        },
        {
          q: "יש כפתור השהיה?",
          a: "אין, וזה בכוונה. כשהערימה עומדת שום דבר לא זז ושום שעון לא רץ, אז לקום וללכת לא עולה כלום.",
        },
        {
          q: "איך נמדד השיא?",
          a: "בנקודות, כשיותר זה טוב יותר, ובנפרד לכל רוחב קופסה. שתי אוכמניות שוות נקודה אחת, זוג בשלב שמעליהן שווה 3, ומשם זה מטפס.",
        },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן, אחרי ביקור אחד. אין מה להתקין ואין חשבון לפתוח.",
        },
      ],

      keywords: ["מיזוג פירות", "אבטיח", "פיזיקה", "משחק נפילה", "לגיל הרך", "שרשרת"],
    },

    en: {
      name: "Fruit Drop",
      metaTitle: "Fruit Drop - free merge puzzle | Ellaz",
      metaDescription:
        "Drop fruit into an open box. Two of a kind that touch become the next fruit up the chain, and the pile resettles into chain reactions. Free, no account.",

      lede: "A free fruit merge game that runs in your browser. Fruit fall into an open box, two of the same kind that touch become the next one up the chain, and the whole pile resettles underneath them. Ten rungs, blueberry to watermelon. The run ends when something comes to rest above the line at the top.",

      body: [
        "Tap the box. A fruit falls. Two alike that touch turn into one bigger fruit, and everything under them shifts. That is the whole rule.",

        "The physics is written out by hand in the game's own rules file, with no engine behind it, and that is worth knowing because it explains what the box can and cannot do. Everything is a circle. Two circles overlap exactly when the distance between their centres is under the sum of their radii, and the way to push them apart is along that same line. No polygons. No rotation. About forty lines of arithmetic covers it, and because it is arithmetic rather than a canvas the step is a pure function: the same box and the same slice of time give back the same pile, on a phone and on a desktop alike. It runs at a fixed 120 sub-steps a second while the drawing spends whatever real time has passed, so a 60 Hz screen and a 120 Hz screen simulate at one rate.",

        "Here is the number we went looking for. A merge does not only score, it changes the shape of everything beneath it, so the pile resettles and sometimes folds two more pairs together that nobody lined up. Across 240 simulated runs on the shipped physics, 33.2% of a careful bot's merges were set off by an earlier merge rather than by its own drop. A bot dropping at random reached 47.5%. A third to a half of this game plays itself, and that is the part that feels good.",

        "Two bots, 40 runs on each box each. Random aiming survives 123.1 fruit in the wide box and 82.0 in the narrow one, for 589 and 378 points. One rule changes the picture: aim at a twin you can actually reach, and drop wherever when there is none. That bot lasts 156.8 fruit and scores 946 in the same wide box.",

        "The admission, and you can see it with your eyes. The solver runs five separation passes per sub-step, and five is not enough for a deep pile. Measured on the final pile of every settle, two fruit ended up 1.6 world units inside one another, which is half a blueberry's radius. Nothing rolls either, because a fruit has no spin to store. Look closely at a crowded box and both are there.",
      ],

      howToPlay: [
        { title: "Aim", body: "The waiting fruit follows your finger along the top of the box. Arrow keys move it too." },
        { title: "Drop", body: "One tap and it goes. Enter or Space does the same from a keyboard." },
        {
          title: "Touch two alike",
          body: "Two of the same kind that touch become the next rung. They do not have to be stacked, a graze is enough.",
        },
        {
          title: "Watch the top",
          body: "The run ends when a fruit sits still for half a second above the line. While it is still moving, nothing happens.",
        },
      ],

      tips: [
        {
          title: "Big fruit belong on the walls",
          body: "A fruit that grows shoves its neighbours. Against a wall it can only shove one way, so the room it frees stays in the middle, which is where you need it.",
        },
        {
          title: "A reachable twin beats a better one",
          body: "The winning bot never aims at a twin buried under three other fruit. It takes the one a straight drop actually lands on, and that small difference is worth 33.7 extra fruit a run in the wide box.",
        },
        {
          title: "Do not plug holes with blueberries",
          body: "The box only ever deals the bottom five rungs. A blueberry parked in a gap to fill it stays there until a second blueberry arrives, and it lifts the whole pile while it waits.",
        },
      ],

      teaches: [
        {
          title: "Seeing a consequence coming",
          body: "A third of all merges arrive from another merge. Spotting that before you tap is two-step reasoning, learned without a single line of instructions.",
        },
        {
          title: "Ordering by size",
          body: "Ten rungs in a row, each about 1.2 times wider than the last. A child learns the order by handling it rather than by reciting it.",
        },
        {
          title: "Living with a mess",
          body: "A pile here never fully tidies and the game carries on regardless. Playing on with an imperfect result is its own lesson.",
        },
      ],

      ages: [
        {
          title: "4 to 5",
          body: "The wide box. Nothing to read, one tap is the whole control, and fruit merge by themselves often enough to feel rewarding.",
        },
        {
          title: "6 to 8",
          body: "The middle box, where aiming starts to pay. Our careful bot lasts 120.7 fruit there against 98.6 for the random one.",
        },
        {
          title: "Grown-ups",
          body: "The narrow box, 52 units across. One watermelon is 35.6 units wide on its own, so two can never sit side by side and the end of the chain becomes a real target.",
        },
      ],

      accessibility:
        "One tap does everything, and dragging to aim is never required. The box itself is a real button: left and right arrows walk the waiting fruit along the top, Enter or Space lets it go, so the whole game plays from a keyboard with no mouse and no touchscreen. Every rung has its own hue, its own size and its own drawing, so a player who reads colour poorly still tells the fruit apart by something else. There is no clock anywhere. The pile stops moving by itself, and a run you walked away from comes back exactly as you left it.",

      together: [
        {
          title: "One fruit each",
          body: "Take turns dropping into the same box. The score is shared, so a bad choice belongs to everybody, which is far funnier than losing alone.",
        },
        {
          title: "Call the cascade",
          body: "Before the tap, say how many merges the drop will set off. One merge in three brings another, so the guess is rarely right first time.",
        },
        {
          title: "Hunting the watermelon",
          body: "Across 240 simulated runs a watermelon turned up in 3 of them, all in the wide box, and no two of them ever met. A person does better than that, and it is worth the try.",
        },
      ],

      faq: [
        {
          q: "What happens when two watermelons meet?",
          a: "Both vanish and leave the space empty. There is no rung above them, so the pair pays 155 points at once instead of making an eleventh fruit.",
        },
        {
          q: "How many kinds of fruit are there?",
          a: "Ten rungs. The box only ever hands you five of them, the small ones, drawn with the smallest weighted heaviest. The top five have to be built.",
        },
        {
          q: "What changes between the levels?",
          a: "The width of the box and nothing else: 74, 62 or 52 units. The fruit, the chain and the draw are identical across all three, so switching is not learning a different game.",
        },
        {
          q: "How long does a run last?",
          a: "About 91 fruit in the narrow box and 157 in the wide one for our better bot, over 40 runs per box. A human first go looks more like the random one, so 82 and 123.",
        },
        {
          q: "Is there a pause button?",
          a: "No, deliberately. Nothing moves once the pile has settled and no clock is running, so walking away costs you nothing at all.",
        },
        {
          q: "How is the record measured?",
          a: "In points, where more is better, and separately for each box width. Two blueberries are worth 1 point, a pair one rung up is worth 3, and it climbs from there.",
        },
        {
          q: "Does it work offline?",
          a: "Yes, after one visit. Nothing to install and no account to make.",
        },
      ],

      keywords: ["fruit merge", "watermelon game", "physics puzzle", "drop game", "chain reaction", "preschool"],
    },

    es: {
      name: "Lluvia de Frutas",
      metaTitle: "Lluvia de Frutas - juego de fusión | Ellaz",
      metaDescription:
        "Deja caer frutas en una caja abierta. Dos iguales que se tocan forman la siguiente de la cadena y el montón se reacomoda en cascada. Gratis, sin cuenta.",

      lede: "Un juego de fusión de frutas, gratis y en el navegador. Las frutas caen en una caja abierta, dos iguales que se tocan se convierten en la siguiente de la cadena, y todo el montón se reacomoda debajo. Diez escalones, del arándano a la sandía. La partida termina cuando una fruta se queda quieta por encima de la línea de arriba.",

      body: [
        "Tocas la caja. Cae una fruta. Dos iguales que se rozan se vuelven una más grande, y todo lo que hay debajo se mueve. Esa es la regla entera.",

        "La física está escrita a mano en el propio archivo de reglas del juego, sin motor detrás, y eso explica lo que la caja sabe y no sabe hacer. Todo es un círculo. Dos círculos se solapan justo cuando la distancia entre sus centros es menor que la suma de sus radios, y se separan a lo largo de esa misma línea. Ni polígonos ni rotación. Con unas cuarenta líneas de aritmética basta, y como es aritmética y no un dibujo, el paso es una función pura: la misma caja y el mismo trozo de tiempo devuelven el mismo montón, en un móvil y en un ordenador. Corre a 120 subpasos por segundo fijos mientras el dibujo gasta el tiempo que realmente ha pasado, así que una pantalla de 60 Hz y otra de 120 Hz simulan igual.",

        "Este es el número que fuimos a buscar. Una fusión no solo suma puntos, cambia la forma de todo lo que tiene debajo, así que el montón se reacomoda y a veces junta otras dos parejas que nadie había alineado. Sobre 240 partidas simuladas con la física que se publica, el 33,2% de las fusiones de un robot cuidadoso las provocó una fusión anterior y no su propia caída. Un robot que suelta al azar llegó al 47,5%. Entre un tercio y la mitad de este juego se juega solo, y esa es justo la parte que gusta.",

        "Dos robots, 40 partidas por caja cada uno. El que apunta al azar aguanta 123,1 frutas en la caja ancha y 82,0 en la estrecha, con 589 y 378 puntos. Una sola regla cambia el cuadro: apuntar a una gemela a la que de verdad se pueda llegar, y soltar donde salga cuando no hay ninguna. Ese robot aguanta 156,8 frutas y marca 946 puntos en la misma caja ancha.",

        "La parte honesta, y se ve a simple vista. El solucionador hace cinco pasadas de separación por subpaso, y cinco no bastan en un montón profundo. Medido sobre el montón final de cada reposo, dos frutas acabaron metidas una dentro de otra 1,6 unidades, la mitad del radio de un arándano. Tampoco rueda nada, porque una fruta no guarda ningún giro. Mira de cerca una caja llena y verás las dos cosas.",
      ],

      howToPlay: [
        { title: "Apuntar", body: "La fruta en espera sigue tu dedo por el borde de arriba. Las flechas del teclado también la mueven." },
        { title: "Soltar", body: "Un toque y se va. Con teclado es Intro o Espacio." },
        {
          title: "Juntar dos iguales",
          body: "Dos frutas del mismo tipo que se tocan pasan al escalón siguiente. No hace falta apilarlas, basta con que se rocen.",
        },
        {
          title: "Vigilar la parte de arriba",
          body: "La partida acaba cuando una fruta se queda medio segundo parada por encima de la línea. Mientras se mueva, no pasa nada.",
        },
      ],

      tips: [
        {
          title: "Las grandes contra la pared",
          body: "Una fruta que crece empuja a sus vecinas. Pegada a la pared solo empuja hacia un lado, y el sitio que libera queda en el centro, que es donde hace falta.",
        },
        {
          title: "Una gemela alcanzable vale más que una buena",
          body: "El robot que gana nunca apunta a una fruta enterrada bajo otras tres. Elige aquella sobre la que una caída recta aterriza de verdad, y esa diferencia pequeña vale 33,7 frutas más por partida en la caja ancha.",
        },
        {
          title: "No tapes huecos con arándanos",
          body: "La caja solo reparte los cinco escalones de abajo. Un arándano metido en un hueco para cerrarlo se queda ahí hasta que llegue otro arándano, y mientras tanto levanta el montón entero.",
        },
      ],

      teaches: [
        {
          title: "Ver venir una consecuencia",
          body: "Un tercio de las fusiones llega de otra fusión. Adivinarla antes de tocar es razonar en dos pasos, aprendido sin una sola línea de instrucciones.",
        },
        {
          title: "Ordenar por tamaño",
          body: "Diez escalones seguidos, cada uno alrededor de 1,2 veces más ancho que el anterior. Un niño aprende el orden con la mano y no con una ficha.",
        },
        {
          title: "Convivir con el desorden",
          body: "Aquí un montón nunca se ordena del todo y la partida sigue igual. Jugar con un resultado imperfecto es una lección por sí misma.",
        },
      ],

      ages: [
        {
          title: "4 a 5",
          body: "La caja ancha. Nada que leer, un toque es todo el mando, y las frutas se fusionan solas bastantes veces como para dar gusto.",
        },
        {
          title: "6 a 8",
          body: "La caja mediana, donde apuntar empieza a pagar. Nuestro robot cuidadoso aguanta ahí 120,7 frutas frente a 98,6 del azar.",
        },
        {
          title: "Adultos",
          body: "La caja estrecha, 52 unidades de ancho. Una sandía mide 35,6 ella sola, así que dos no caben nunca juntas y el final de la cadena se vuelve un objetivo real.",
        },
      ],

      accessibility:
        "Un toque hace todo, y arrastrar para apuntar nunca es obligatorio. La caja es un botón de verdad: las flechas izquierda y derecha llevan la fruta en espera por el borde, Intro o Espacio la sueltan, así que la partida entera se juega con teclado, sin ratón y sin pantalla táctil. Cada escalón tiene su propio tono, su propio tamaño y su propio dibujo, de manera que quien distingue mal los colores reconoce las frutas por otra cosa. No hay reloj en ninguna parte. El montón se para solo, y una partida que dejaste a medias vuelve tal cual estaba.",

      together: [
        {
          title: "Una fruta cada uno",
          body: "Por turnos en la misma caja. La puntuación es común, así que una mala decisión es de todos, y eso da mucha más risa que perder a solas.",
        },
        {
          title: "Cantar la cascada",
          body: "Antes de tocar, decid cuántas fusiones va a provocar la caída. Una de cada tres arrastra otra, así que la apuesta casi nunca acierta a la primera.",
        },
        {
          title: "La caza de la sandía",
          body: "En 240 partidas simuladas apareció una sandía en 3 de ellas, todas en la caja ancha, y nunca llegaron a encontrarse dos. Una persona lo hace mejor, y merece el intento.",
        },
      ],

      faq: [
        {
          q: "¿Qué pasa cuando se encuentran dos sandías?",
          a: "Desaparecen las dos y dejan el sitio vacío. No hay escalón por encima, así que la pareja paga 155 puntos de golpe en vez de fabricar una undécima fruta.",
        },
        {
          q: "¿Cuántas frutas distintas hay?",
          a: "Diez escalones. La caja solo te entrega cinco, las pequeñas, en un sorteo que carga la mano hacia la más pequeña. Las cinco de arriba hay que construirlas.",
        },
        {
          q: "¿Qué cambia entre los niveles?",
          a: "El ancho de la caja y nada más: 74, 62 o 52 unidades. Las frutas, la cadena y el sorteo son idénticos en los tres, así que cambiar de nivel no es aprender otro juego.",
        },
        {
          q: "¿Cuánto dura una partida?",
          a: "Unas 91 frutas en la caja estrecha y 157 en la ancha con nuestro mejor robot, sobre 40 partidas por caja. Un primer intento humano se parece más al azar, o sea 82 y 123.",
        },
        {
          q: "¿Hay botón de pausa?",
          a: "No, y es a propósito. Con el montón quieto no se mueve nada ni corre ningún reloj, así que levantarse no cuesta nada.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En puntos, donde más es mejor, y por separado para cada ancho de caja. Dos arándanos valen 1 punto, la pareja del escalón de arriba vale 3, y desde ahí sube.",
        },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí, después de la primera visita. Nada que instalar y ninguna cuenta que crear.",
        },
      ],

      keywords: ["fusión de frutas", "sandía", "caída de frutas", "puzle de física", "reacción en cadena", "infantil"],
    },

    fr: fruitFr,
  },

  provenance: [
    {
      claim: "240 simulated runs on the shipped physics, 40 per box for each of two bots",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "33.2% of a one-rule bot's merges are set off by an earlier merge; 47.5% for a random bot",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "a random-dropping bot survives 123.1 fruit in the wide box and 82.0 in the narrow, for 589 and 378 points",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "a one-rule bot survives 156.8 fruit for 946 points wide, 120.7 medium and 91.2 narrow, worth 33.7 more fruit a run",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "the deepest two fruit end a settle 1.6 world units inside one another, half a blueberry's radius",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "a watermelon turned up in 3 of 240 runs, all in the wide box, and no pair ever popped",
      source: "scripts/sim/fruit-chain.mjs",
    },
    {
      claim: "ten rungs about 1.2x apart, the box deals only the bottom five, and a watermelon is 35.6 units wide",
      source: "src/games/fruit/logic.ts",
    },
    {
      claim: "box widths of 74, 62 and 52 world units are the only thing difficulty changes",
      source: "src/games/fruit/logic.ts",
    },
    {
      claim: "a fixed 120 sub-steps a second, and half a second at rest above the line ends the run",
      source: "src/games/fruit/logic.ts",
    },
    {
      claim: "two blueberries score 1 point and two watermelons 155",
      source: "src/games/fruit/logic.ts",
    },
    {
      claim: "the record is points, more is better, scoped per box width",
      source: "src/sdk/score.ts",
    },
  ],
};
