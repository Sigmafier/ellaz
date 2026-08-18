import type { GameContent } from "../types";
import { bubbleshooterFr } from "./fr/bubbleshooter";

/**
 * Bubble Shooter - the one page here whose most interesting number came back
 * ZERO, and stayed in because of it.
 *
 * The obvious claim to make about a bubble shooter is that the walls open up
 * shots you could not otherwise take. `scripts/sim/bubbleshooter-shots.mjs`
 * fired 121 angles at 40 opening boards per level and found that on a FRESH
 * board the walls buy nothing at all: every resting place a bounced shot
 * reaches, a straight shot reaches too. It is only once the board has holes in
 * it that a bounce reaches anywhere new. The page says both halves, because the
 * first draft was about to say only the flattering one.
 *
 * The other number that moved: an early bot took immediate pops only and made
 * hard look impossible (a median run of 17 shots). That was the bot. Teaching
 * it to park a bubble against its own colour when nothing pops - which is what
 * a person does - moved the same level to 58, and the level table was tuned
 * against the second figure rather than the first.
 *
 * Four languages, written natively rather than translated, so they open
 * differently and carry different asides. Same facts.
 */
export const bubbleshooter: GameContent = {
  id: "bubbleshooter",

  copy: {
    en: {
      name: "Bubble Shooter",
      metaTitle: "Bubble Shooter - free, in your browser | Ellaz",
      metaDescription:
        "Aim, bounce off a wall, and pop three bubbles of a colour. A free bubble shooter in the browser, three levels, no account, and it works offline.",

      lede: "A free bubble shooter that runs in your browser. Aim the launcher, fire, and three bubbles of one colour burst. Whatever was hanging from them falls, and a bubble that falls is worth double one that pops.",

      body: [
        "Point at a gap, shoot, and three of a colour go. You already know this game. What you probably do not know is how much of the board is behind a wall.",

        "An easy board opens with 38 bubbles: 4 rows, 4 colours. Medium is 48 bubbles over 5 rows and 5 colours, hard is 57 over 6 rows and 6 colours, and every colour added makes a group of three that much rarer. The ceiling is the clock. It pushes a new row down every 12 shots on easy, every 9 on medium and every 6 on hard, so if you popped nothing whatsoever you would get 96 shots on easy and 36 on hard before the bubbles arrive at the line across the bottom. Popping is the only thing that buys that room back.",

        "We measured the walls, and the first answer was zero. Firing 121 angles at 40 opening boards per level, every resting place a bounced shot could reach was reachable by a straight shot as well, on every board, at every level. A full board has no shadows in it. Forty shots later that changes: on a played board, between one and four of the roughly fifteen places you can still reach are behind a wall and nowhere else.",

        "Then we built a bot to find out how long a run lasts. It pops when anything pops and otherwise parks the bubble against one of its own colour, which is roughly what a person does after ten minutes. On easy and medium it never lost a run: 300 shots, twenty runs each, still going at the cut-off, clearing board after board. Hard is a different game. There the median run died after 58 shots, and only 5 runs in 20 ever cleared a board at all. If hard feels unreasonable, that is the level and not you.",

        "Clear every bubble and you get a fresh board with your score intact. That is the only happy ending here.",
      ],

      howToPlay: [
        {
          title: "Aim",
          body: "Touch the board and hold, or move the mouse. A dashed line shows the flight, walls included, and a ring shows the exact cell the bubble will end in.",
        },
        {
          title: "Shoot",
          body: "Lift your finger. On a keyboard the arrow keys sweep the aim and the space bar fires; the two buttons under the board do the same thing.",
        },
        {
          title: "Make three",
          body: "Three touching bubbles of one colour burst. Two do not, so the second one you park is an investment.",
        },
        {
          title: "Cut the supports",
          body: "Every bubble hangs from the ceiling through its neighbours. Break the chain and everything under it drops, at 20 points a bubble against 10 for a pop.",
        },
        {
          title: "Watch the line",
          body: "The dashed red line near the bottom is the end of the run. A bubble that settles on it or past it finishes the game.",
        },
      ],

      tips: [
        {
          title: "Shoot at the wall on purpose",
          body: "The gap tucked under an overhang has no straight line to it, and a shot that grazes the wall arrives at an angle no direct shot can. This is the one skill this game has that a grid puzzle does not.",
        },
        {
          title: "Take the ceiling row seriously",
          body: "Bubbles hanging off the top row are the supports for everything below. One well-placed pop up there can drop a dozen bubbles that you never touched.",
        },
        {
          title: "Park, then pop",
          body: "With nothing to pop, do not dump the bubble in the nearest hole. Put it beside its own colour. The bot that started doing exactly that went from dying in 17 shots on hard to surviving 58.",
        },
        {
          title: "Keep the sides short",
          body: "The board reaches the line at its lowest point, and that is usually a column at the edge. Clearing the edges buys more time than clearing the middle.",
        },
        {
          title: "The launcher is fair",
          body: "It only ever hands you a colour still on the board, so there is no shot that could not have been useful. Being handed a colour you cannot use is not a thing that happens here.",
        },
      ],

      teaches: [
        {
          title: "Angles",
          body: "The bounce is a reflection, and a few hundred shots teach it better than a diagram does. Aim high on the wall and the shot lands short.",
        },
        {
          title: "Consequences",
          body: "A bubble placed now decides what is possible three shots later. This is the game's real subject and children pick it up without being told.",
        },
        {
          title: "Counting to three",
          body: "The threshold is three, always, at every level. A four-year-old can hold that rule in their head while doing something else.",
        },
        {
          title: "Patience under a clock",
          body: "The ceiling advances whatever you do, so a rushed shot and a considered one cost exactly the same. That is a useful thing to find out.",
        },
      ],

      ages: [
        {
          title: "4 to 5",
          body: "Easy, and no talk of scores. Four colours and a new row only every 12 shots gives a small child room to miss a lot and still see bubbles burst.",
        },
        {
          title: "6 to 8",
          body: "Easy to medium. This is where the wall bounce clicks, usually by accident first.",
        },
        {
          title: "9 and up",
          body: "Medium, then hard when medium stops ending. Our bot cleared 79 boards across 20 medium runs and only 5 across 20 hard ones.",
        },
        {
          title: "Grown-ups",
          body: "Hard. Six colours over 57 bubbles with a row arriving every 6 shots is a genuine fight, and the score is the point rather than survival.",
        },
      ],

      accessibility:
        "Every bubble carries a shape as well as a colour: a dot, a ring, a triangle, a star, a diamond or a cross. That is deliberate, because roughly one boy in twelve cannot separate the red from the green here, and a matching game played on hue alone would not be difficult for them, it would be impossible. The whole game can be played from a keyboard, with the arrow keys sweeping the aim and the space bar firing, and the two buttons under the board do the same job for anyone who cannot hold a steady finger on a moving target. Nothing is timed against a stopwatch, and the aiming line shows exactly where a shot will land before it costs anything.",

      together: [
        {
          title: "Call the shot",
          body: "One person names the gap, the other aims for it. Missing is funnier when somebody else picked the target.",
        },
        {
          title: "One shot each",
          body: "Alternate. It turns a quiet game into an argument about which support to cut, which is the good kind of argument.",
        },
        {
          title: "Bank shots only",
          body: "Agree that every shot has to touch a wall first. Scores collapse, and the geometry gets learned properly.",
        },
        {
          title: "Guess the drop",
          body: "Before a shot that cuts a support, both of you guess how many bubbles fall. The score tells you who was right.",
        },
      ],

      faq: [
        {
          q: "Is this bubble shooter free?",
          a: "Yes, and there is nothing to buy inside it. No account, no download, and no advertising.",
        },
        {
          q: "Do I need to install anything?",
          a: "No. It runs in the browser on a phone, a tablet or a computer. Adding the site to your home screen also makes it work with no connection.",
        },
        {
          q: "How do you win?",
          a: "By clearing every bubble off the board. You then get a fresh board and keep your score, so a long run is a stack of cleared boards rather than one ending.",
        },
        {
          q: "How many colours are there?",
          a: "Four on easy, five on medium and six on hard. The launcher only ever gives you a colour that is still on the board.",
        },
        {
          q: "Why did those bubbles fall without popping?",
          a: "They were hanging from the ones you popped. Anything no longer connected to the ceiling drops, and each of those is worth 20 points against 10 for a popped one.",
        },
        {
          q: "Can I bounce a shot off the wall?",
          a: "Yes, and on a board with holes in it some places can be reached no other way. The aiming line draws the bounce for you.",
        },
        {
          q: "Does it save my game?",
          a: "Yes. Leave in the middle of a board and it is waiting where you left it, on that device, with the score and the shot count intact.",
        },
        {
          q: "Is it suitable for a four-year-old?",
          a: "On easy, yes. There is no reading, the touch targets are large, and the shapes on the bubbles mean colour vision is not required.",
        },
      ],

      keywords: ["bubble shooter", "bubble pop", "arcade", "aim", "colour matching", "classic"],
    },

    he: {
      name: "ירי בועות",
      metaTitle: "ירי בועות - משחק חינם בדפדפן | Ellaz",
      metaDescription:
        "מכוונים, מקפיצים מהקיר, ושלוש בועות באותו צבע מתפוצצות. משחק ירי בועות חינמי בדפדפן, שלוש רמות, בלי הרשמה ועובד גם בלי אינטרנט.",

      lede: "משחק ירי בועות חינמי שרץ בדפדפן. מכוונים את המשגר, יורים, ושלוש בועות באותו צבע מתפוצצות. מה שהיה תלוי עליהן נופל, ובועה שנופלת שווה כפול מבועה שמתפוצצת.",

      body: [
        "מכוונים לחור, יורים, ושלוש בועות באותו צבע נעלמות. את המשחק הזה כבר ראיתם. מה שכנראה לא ידעתם זה כמה מהלוח מסתתר מאחורי הקיר.",

        "לוח קל נפתח עם 38 בועות בארבע שורות ובארבעה צבעים. בינוני הוא 48 בועות בחמש שורות, קשה הוא 57 בשש, וכל צבע שמתווסף הופך שלישייה לנדירה יותר. התקרה היא השעון: היא דוחפת שורה חדשה כל 12 יריות בקל, כל 9 בבינוני וכל 6 בקשה. מי שלא יפוצץ שום דבר בכלל יקבל 96 יריות בקל ו-36 בקשה עד שהבועות מגיעות לקו התחתון. פיצוץ הוא הדבר היחיד שקונה את המקום הזה בחזרה.",

        "מדדנו את הקירות והתשובה הראשונה היתה אפס. ירינו 121 זוויות על 40 לוחות פתיחה בכל רמה, וכל מקום שאליו הגיעה ירייה מוקפצת היה נגיש גם לירייה ישרה. בלוח מלא אין צללים. אחרי ארבעים יריות זה משתנה: בלוח משוחק, בין אחד לארבעה מתוך כחמישה עשר המקומות שנשארו נגישים יושבים מאחורי קיר ובשום דרך אחרת.",

        "אחר כך בנינו בוט כדי לראות כמה זמן שורדת ריצה. הוא מפוצץ כשאפשר, וכשאי אפשר הוא מצמיד את הבועה לבועה מאותו צבע, בערך מה שאדם עושה אחרי עשר דקות. בקל ובבינוני הוא לא הפסיד אף פעם: 300 יריות, עשרים ריצות בכל רמה, ועדיין באוויר כשעצרנו אותו. קשה זה משחק אחר. שם ריצת החציון מתה אחרי 58 יריות, ורק 5 ריצות מתוך 20 ניקו לוח בכלל. אם קשה מרגיש לא הוגן, זו הרמה ולא אתם.",

        "מנקים את כל הבועות ומקבלים לוח חדש עם הניקוד שנשמר. זה הסוף הטוב היחיד כאן.",
      ],

      howToPlay: [
        {
          title: "מכוונים",
          body: "נוגעים בלוח ומחזיקים, או מזיזים את העכבר. קו מקווקו מראה את המסלול כולל הקפצות מהקיר, וטבעת מסמנת בדיוק לאיזו משבצת הבועה תגיע.",
        },
        {
          title: "יורים",
          body: "מרימים את האצבע. במקלדת החצים מזיזים את הכוונת והרווח יורה, ושני הכפתורים מתחת ללוח עושים בדיוק את אותו הדבר.",
        },
        {
          title: "עושים שלוש",
          body: "שלוש בועות נוגעות באותו צבע מתפוצצות. שתיים לא, ולכן הבועה השנייה שמניחים היא השקעה.",
        },
        {
          title: "חותכים את התמיכה",
          body: "כל בועה תלויה בתקרה דרך השכנות שלה. שוברים את השרשרת וכל מה שמתחת נופל, 20 נקודות לבועה שנופלת מול 10 לבועה שמתפוצצת.",
        },
        {
          title: "שומרים על הקו",
          body: "הקו האדום המקווקו בתחתית הוא סוף הריצה. בועה שנחה עליו או מתחתיו מסיימת את המשחק.",
        },
      ],

      tips: [
        {
          title: "יורים לקיר בכוונה",
          body: "לחור שמסתתר מתחת לבליטה אין קו ישר, וירייה שמלטפת את הקיר מגיעה בזווית שאף ירייה ישירה לא מגיעה בה. זו המיומנות היחידה כאן שאין לאף פאזל על לוח משבצות.",
        },
        {
          title: "השורה העליונה היא המנוף",
          body: "הבועות שנוגעות בתקרה מחזיקות את כל מה שמתחתיהן. פיצוץ אחד מדויק שם מפיל תריסר בועות שלא נגעתם בהן.",
        },
        {
          title: "קודם מצמידים, אחר כך מפוצצים",
          body: "כשאין מה לפוצץ, אל תזרקו את הבועה לחור הקרוב. הצמידו אותה לצבע שלה. הבוט שהתחיל לעשות בדיוק את זה עבר מלמות אחרי 17 יריות בקשה לשרוד 58.",
        },
        {
          title: "מקצרים את הצדדים",
          body: "הלוח מגיע לקו בנקודה הנמוכה ביותר שלו, ובדרך כלל זו עמודה בשוליים. ניקוי הקצוות קונה יותר זמן מניקוי המרכז.",
        },
        {
          title: "המשגר הוגן",
          body: "הוא נותן רק צבע שעדיין נמצא על הלוח, ולכן אין ירייה שלא היה אפשר לעשות בה משהו. לקבל צבע שאין בו שימוש זה לא דבר שקורה כאן.",
        },
      ],

      teaches: [
        {
          title: "זוויות",
          body: "ההקפצה היא החזרה, וכמה מאות יריות מלמדות אותה טוב יותר משרטוט. מכוונים גבוה על הקיר והירייה נוחתת קרוב.",
        },
        {
          title: "השלכות",
          body: "בועה שמניחים עכשיו קובעת מה אפשרי בעוד שלוש יריות. זה הנושא האמיתי של המשחק, וילדים קולטים אותו בלי שמסבירים.",
        },
        {
          title: "לספור עד שלוש",
          body: "הסף הוא שלוש, תמיד, בכל רמה. ילד בן ארבע מחזיק את הכלל הזה בראש בזמן שהוא עסוק במשהו אחר.",
        },
        {
          title: "סבלנות מול שעון",
          body: "התקרה יורדת בכל מקרה, ולכן ירייה חפוזה וירייה שקולה עולות בדיוק אותו הדבר. זה גילוי שימושי.",
        },
      ],

      ages: [
        {
          title: "4 עד 5",
          body: "קל, ובלי לדבר על ניקוד. ארבעה צבעים ושורה חדשה רק כל 12 יריות נותנים לילד קטן מקום להחטיא הרבה ועדיין לראות בועות מתפוצצות.",
        },
        {
          title: "6 עד 8",
          body: "קל ואז בינוני. כאן ההקפצה מהקיר נופלת לראש, בדרך כלל קודם במקרה.",
        },
        {
          title: "9 ומעלה",
          body: "בינוני, ואז קשה כשבינוני מפסיק להיגמר. הבוט שלנו ניקה 79 לוחות ב-20 ריצות בינוני ורק 5 ב-20 ריצות קשה.",
        },
        {
          title: "מבוגרים",
          body: "קשה. שישה צבעים על 57 בועות עם שורה שיורדת כל 6 יריות הם קרב אמיתי, והניקוד הוא העניין ולא ההישרדות.",
        },
      ],

      accessibility:
        "כל בועה נושאת צורה ולא רק צבע: נקודה, טבעת, משולש, כוכב, מעוין או צלב. זו החלטה ולא קישוט, כי בערך ילד אחד מתוך שנים עשר לא מפריד כאן בין האדום לירוק, ומשחק התאמה שנשען על גוון בלבד לא היה קשה עבורו אלא בלתי אפשרי. אפשר לשחק את כל המשחק מהמקלדת, כשהחצים מזיזים את הכוונת והרווח יורה, ושני הכפתורים מתחת ללוח עושים את אותה עבודה עבור מי שלא מצליח להחזיק אצבע יציבה על מטרה נעה. שום דבר לא נמדד בסטופר, וקו הכיוון מראה בדיוק לאן הירייה תגיע לפני שהיא עולה משהו.",

      together: [
        {
          title: "מכריזים על היעד",
          body: "אחד מצביע על החור, השני מכוון אליו. להחטיא מצחיק יותר כשמישהו אחר בחר את המטרה.",
        },
        {
          title: "ירייה לכל אחד",
          body: "בתורות. זה הופך משחק שקט לוויכוח על איזו תמיכה לחתוך, וזה הוויכוח הטוב.",
        },
        {
          title: "רק דרך הקיר",
          body: "מסכימים שכל ירייה חייבת לגעת בקיר קודם. הניקוד קורס, והגאומטריה נלמדת כמו שצריך.",
        },
        {
          title: "מנחשים כמה יפלו",
          body: "לפני ירייה שחותכת תמיכה, שניכם מנחשים כמה בועות ייפלו. הניקוד אומר מי צדק.",
        },
      ],

      faq: [
        {
          q: "המשחק חינמי?",
          a: "כן, ואין בתוכו שום דבר לקנות. בלי הרשמה, בלי הורדה ובלי פרסומות.",
        },
        {
          q: "צריך להתקין משהו?",
          a: "לא. המשחק רץ בדפדפן בטלפון, בטאבלט ובמחשב. הוספה של האתר למסך הבית גם מאפשרת לשחק בלי חיבור לאינטרנט.",
        },
        {
          q: "איך מנצחים?",
          a: "מנקים את כל הבועות מהלוח. אז מקבלים לוח חדש והניקוד נשמר, כך שריצה ארוכה היא ערימה של לוחות שנוקו ולא סיום אחד.",
        },
        {
          q: "כמה צבעים יש?",
          a: "ארבעה בקל, חמישה בבינוני ושישה בקשה. המשגר נותן רק צבע שעדיין נמצא על הלוח.",
        },
        {
          q: "למה הבועות האלה נפלו בלי להתפוצץ?",
          a: "הן היו תלויות על אלה שפוצצתם. כל מה שכבר לא מחובר לתקרה נופל, וכל אחת מהן שווה 20 נקודות מול 10 של בועה שהתפוצצה.",
        },
        {
          q: "אפשר להקפיץ ירייה מהקיר?",
          a: "כן, ובלוח עם חורים יש מקומות שאי אפשר להגיע אליהם אחרת. קו הכיוון משרטט את ההקפצה מראש.",
        },
        {
          q: "המשחק נשמר?",
          a: "כן. יוצאים באמצע לוח והוא מחכה בדיוק איפה שהשארתם אותו, במכשיר הזה, עם הניקוד ומונה היריות.",
        },
        {
          q: "מתאים לבן ארבע?",
          a: "בקל, כן. אין קריאה, המטרות גדולות, והצורות על הבועות אומרות שראיית צבעים אינה תנאי.",
        },
      ],

      keywords: ["ירי בועות", "בועות", "ארקייד", "כיוון", "התאמת צבעים", "קלאסי"],
    },

    es: {
      name: "Tiro de burbujas",
      metaTitle: "Tiro de burbujas - gratis en el navegador | Ellaz",
      metaDescription:
        "Apunta, rebota en la pared y revienta tres burbujas del mismo color. Juego gratis en el navegador, tres niveles, sin cuenta y funciona sin conexión.",

      lede: "Un juego de tiro de burbujas gratis que funciona en el navegador. Apunta el lanzador, dispara, y tres burbujas del mismo color revientan. Lo que colgaba de ellas se cae, y una burbuja que cae vale el doble que una que revienta.",

      body: [
        "Apuntas a un hueco, disparas, y tres del mismo color desaparecen. Este juego ya lo conoces. Lo que quizá no sabes es cuánto del tablero está escondido detrás de una pared.",

        "Un tablero fácil abre con 38 burbujas repartidas en 4 filas y 4 colores. El medio son 48 burbujas en 5 filas, el difícil son 57 en 6, y cada color que se añade vuelve más rara una pareja que se pueda cerrar. El techo hace de reloj: baja una fila nueva cada 12 disparos en fácil, cada 9 en medio y cada 6 en difícil. Quien no reventara absolutamente nada tendría 96 disparos en fácil y 36 en difícil antes de que las burbujas lleguen a la línea de abajo. Reventar es lo único que recupera ese espacio.",

        "Medimos las paredes y la primera respuesta fue cero. Cero excepciones. Disparamos 121 ángulos contra 40 tableros de salida por nivel, y cada sitio al que llegaba un tiro rebotado también lo alcanzaba un tiro recto. Un tablero lleno no tiene sombras. A los cuarenta disparos eso cambia: en un tablero ya jugado, entre uno y cuatro de los quince sitios que aún puedes alcanzar están detrás de una pared y en ningún otro sitio.",

        "Después montamos un bot para ver cuánto dura una partida. Revienta cuando puede y, si no puede, pega la burbuja a otra de su color, que es más o menos lo que hace una persona a los diez minutos. En fácil y en medio no perdió nunca: 300 disparos, veinte partidas por nivel, y seguía vivo al cortarlo. El difícil es otro juego. Ahí la partida mediana murió a los 58 disparos y solo 5 de 20 llegaron a limpiar un tablero. Si el difícil parece injusto, es el nivel y no tú.",

        "Limpia todas las burbujas y llega un tablero nuevo con tu puntuación intacta. Es el único final feliz.",
      ],

      howToPlay: [
        {
          title: "Apuntar",
          body: "Toca el tablero y mantén, o mueve el ratón. Una línea de puntos dibuja el recorrido con los rebotes incluidos, y un aro marca la casilla exacta donde acabará la burbuja.",
        },
        {
          title: "Disparar",
          body: "Levanta el dedo. Con teclado, las flechas mueven la puntería y la barra espaciadora dispara; los dos botones de debajo del tablero hacen lo mismo.",
        },
        {
          title: "Juntar tres",
          body: "Tres burbujas del mismo color que se tocan revientan. Dos no, así que la segunda que colocas es una inversión.",
        },
        {
          title: "Cortar el apoyo",
          body: "Cada burbuja cuelga del techo a través de sus vecinas. Rompe la cadena y todo lo que hay debajo se cae, a 20 puntos por burbuja frente a 10 por reventarla.",
        },
        {
          title: "Vigilar la línea",
          body: "La raya roja discontinua de abajo es el final de la partida. Una burbuja que se queda encima o por debajo la termina.",
        },
      ],

      tips: [
        {
          title: "Dispara a la pared a propósito",
          body: "Al hueco metido bajo un saliente no le llega ninguna línea recta, y un tiro que roza la pared entra con un ángulo que ningún tiro directo consigue. Es la única destreza de este juego que un rompecabezas de casillas no tiene.",
        },
        {
          title: "La fila de arriba es la palanca",
          body: "Las burbujas pegadas al techo sostienen todo lo que hay debajo. Un solo tiro bien puesto ahí tira una docena de burbujas que ni tocaste.",
        },
        {
          title: "Primero pega, luego revienta",
          body: "Cuando no hay nada que reventar, no tires la burbuja al primer hueco. Ponla junto a su color. El bot que empezó a hacer eso pasó de morir a los 17 disparos en difícil a aguantar 58.",
        },
        {
          title: "Acorta los lados",
          body: "El tablero llega a la línea por su punto más bajo, y casi siempre es una columna del borde. Limpiar los bordes compra más tiempo que limpiar el centro.",
        },
        {
          title: "El lanzador juega limpio",
          body: "Solo te da un color que siga en el tablero, así que no existe el disparo con el que no se pudiera hacer nada. Aquí no pasa eso de recibir un color inservible.",
        },
      ],

      teaches: [
        {
          title: "Ángulos",
          body: "El rebote es una reflexión, y unos cientos de disparos la enseñan mejor que un dibujo. Apunta alto en la pared y el tiro cae corto.",
        },
        {
          title: "Consecuencias",
          body: "Una burbuja colocada ahora decide qué será posible tres disparos más tarde. Ese es el tema real del juego, y los niños lo pillan sin que nadie se lo cuente.",
        },
        {
          title: "Contar hasta tres",
          body: "El umbral es tres, siempre, en todos los niveles. Un niño de cuatro años sostiene esa regla en la cabeza mientras hace otra cosa.",
        },
        {
          title: "Paciencia con reloj",
          body: "El techo baja hagas lo que hagas, así que un disparo apresurado y uno pensado cuestan exactamente igual. Eso es útil descubrirlo.",
        },
      ],

      ages: [
        {
          title: "4 a 5",
          body: "Fácil, y sin hablar de puntuación. Cuatro colores y una fila nueva solo cada 12 disparos dan a un niño pequeño margen para fallar mucho y aun así ver burbujas reventar.",
        },
        {
          title: "6 a 8",
          body: "Fácil y luego medio. Aquí es donde encaja el rebote en la pared, casi siempre por accidente la primera vez.",
        },
        {
          title: "9 en adelante",
          body: "Medio, y difícil cuando el medio deja de acabarse. Nuestro bot limpió 79 tableros en 20 partidas de medio y solo 5 en 20 de difícil.",
        },
        {
          title: "Personas adultas",
          body: "Difícil. Seis colores sobre 57 burbujas con una fila cayendo cada 6 disparos es una pelea de verdad, y ahí la puntuación importa más que sobrevivir.",
        },
      ],

      accessibility:
        "Cada burbuja lleva una forma además de un color: un punto, un aro, un triángulo, una estrella, un rombo o una cruz. Es una decisión y no un adorno, porque aproximadamente uno de cada doce niños no separa aquí el rojo del verde, y un juego de emparejar que dependiera solo del tono no le resultaría difícil sino imposible. El juego entero se puede jugar con el teclado, con las flechas moviendo la puntería y la barra espaciadora disparando, y los dos botones de debajo del tablero hacen ese mismo trabajo para quien no pueda mantener el dedo firme sobre un objetivo en movimiento. Nada se mide con cronómetro, y la línea de puntería enseña dónde caerá el disparo antes de que cueste nada.",

      together: [
        {
          title: "Cantar el tiro",
          body: "Una persona señala el hueco y la otra apunta. Fallar tiene más gracia cuando el objetivo lo eligió otro.",
        },
        {
          title: "Un disparo cada uno",
          body: "Por turnos. Convierte un juego callado en una discusión sobre qué apoyo cortar, que es de las discusiones buenas.",
        },
        {
          title: "Solo tiros con pared",
          body: "Acordad que cada disparo tiene que tocar una pared antes. Las puntuaciones se hunden y la geometría se aprende de verdad.",
        },
        {
          title: "Adivinar la caída",
          body: "Antes de un tiro que corta un apoyo, los dos decís cuántas burbujas creéis que van a caer. La puntuación dice quién acertó.",
        },
      ],

      faq: [
        {
          q: "¿Este juego de burbujas es gratis?",
          a: "Sí, y dentro no hay nada que comprar. Sin cuenta, sin descarga y sin publicidad.",
        },
        {
          q: "¿Hay que instalar algo?",
          a: "No. Funciona en el navegador del móvil, la tableta o el ordenador. Añadir la web a la pantalla de inicio también permite jugar sin conexión.",
        },
        {
          q: "¿Cómo se gana?",
          a: "Limpiando todas las burbujas del tablero. Entonces llega uno nuevo y conservas la puntuación, así que una partida larga es un montón de tableros limpiados y no un final.",
        },
        {
          q: "¿Cuántos colores hay?",
          a: "Cuatro en fácil, cinco en medio y seis en difícil. El lanzador solo entrega colores que sigan en el tablero.",
        },
        {
          q: "¿Por qué se cayeron esas burbujas sin reventar?",
          a: "Colgaban de las que reventaste. Todo lo que deja de estar unido al techo se cae, y cada una de esas vale 20 puntos frente a los 10 de una reventada.",
        },
        {
          q: "¿Se puede rebotar en la pared?",
          a: "Sí, y en un tablero con huecos hay sitios a los que no se llega de otra forma. La línea de puntería dibuja el rebote antes de disparar.",
        },
        {
          q: "¿Guarda la partida?",
          a: "Sí. Sal a mitad de un tablero y estará esperando donde lo dejaste, en ese aparato, con la puntuación y los disparos que quedaban.",
        },
        {
          q: "¿Sirve para un niño de cuatro años?",
          a: "En fácil, sí. No hay que leer, los objetivos son grandes, y las formas de las burbujas hacen que la visión del color no sea un requisito.",
        },
      ],

      keywords: ["tiro de burbujas", "burbujas", "arcade", "puntería", "colores", "clásico"],
    },

    fr: bubbleshooterFr,
  },

  provenance: [
    {
      claim: "38 bubbles in 4 rows on easy, 48 in 5 on medium, 57 in 6 on hard",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "a new row every 12 / 9 / 6 shots, and 96 / 63 / 36 shots to the line if nothing pops",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "121 angles at 40 opening boards per level found 0 landing places reachable only off a wall",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "on a played board, 1 to 4 of about 15 reachable places need a bounce",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "the bot survived 300 shots on easy and medium, and died at a median of 58 on hard",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "5 of 20 hard runs cleared a board, against 79 boards over 20 medium runs",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "an immediate-pop-only bot died after 17 shots on hard before it learned to build",
      source: "scripts/sim/bubbleshooter-shots.mjs",
    },
    {
      claim: "10 points for a popped bubble and 20 for one knocked loose, three of a colour to pop",
      source: "src/games/bubbleshooter/logic.ts",
    },
    {
      claim: "the record is points, higher is better, scoped per level",
      source: "src/sdk/score.ts",
    },
  ],
};
