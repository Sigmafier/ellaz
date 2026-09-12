import type { GameContent } from "../types";
import { survivorsFr } from "./fr/survivors";

/**
 * Neon Survival. Every number below is read out of `src/games/survivors/logic.ts` -
 * the run length, the arena size, the starting hearts and the mercy window, the
 * three enemy kinds and their hit counts, the three levels' spawn timing, and
 * the seven upgrades with their caps. Nothing here is simulated; it is all a
 * constant already declared in the file, so a retune either shows up here or
 * this page starts quoting a number the game no longer has.
 */
export const survivors: GameContent = {
  id: "survivors",

  copy: {
    he: {
      name: "הישרדות ניאון",
      metaTitle: "הישרדות ניאון - משחק הישרדות חינם | Ellaz",
      metaDescription:
        "ספינה קטנה יורה לבד על הצורה הקרובה ביותר. בוחרים רק לאן לזוז, אוספים אבנים ובוחרים שדרוגים, ומנסים לשרוד שלוש דקות.",

      lede: "הספינה שלכם יורה לבד, תמיד על הצורה הקרובה ביותר, ואתם קובעים רק לאן לזוז. שורדים שלוש דקות מול צורות זוהרות שנכנסות מכל הכיוונים, ומנצחים את הסיבוב.",

      body: [
        "אין פה כיוונון וירי. הספינה יורה בעצמה, תמיד על מה שהכי קרוב בטווח, וכל מה שנשאר לכם זה לזוז. זה נשמע פשוט. זה לא.",

        "הזירה היא 420 על 560 יחידות, קטנה מספיק שכלום לא באמת בורח מכם. מתחילים עם 3 לבבות. צורה שמגיעה עד הספינה עולה לב אחד ונהרסת תוך כדי כך, אז חמש צורות שמגיעות ביחד עדיין עולות רק לב אחד, לא חמישה. אחרי פגיעה יש 900 מילישניות של חסינות, בדיוק מספיק כדי לצאת מהצפיפות ולא לחזור אליה מיד.",

        "שלושה סוגי צורות נכנסות מהקצוות. משולש קטן ומהיר, ומת מפגיעה אחת. עיגול איטי יותר, וסופג שתיים. יהלום גדול ואיטי מכולם, וצריך חמש פגיעות כדי לפוצץ אותו, אז עדיף למשוך אותו לשטח פתוח מאשר להילחם בו איפה שהוא תפס אתכם. כל צורה שנופלת משאירה אבן, והאבן היא הדבר היחיד שרודפים אחריו בכוונה.",

        "רגוע, רגיל ופרוע משנים רק את הקהל, לא את הספינה שלכם. ברגוע העיגול נכנס אחרי 45 שניות והיהלום אחרי 75, ובפרוע זה קורה כבר ב-18 וב-35. צורות נכנסות כל 1150 מילישניות ברגוע וכל 680 בפרוע, והפער הזה מצטמצם כל הזמן ככל שהשעון רץ, אבל אף פעם לא יורד מתחת ל-320 ברגוע או ל-165 בפרוע. שום דבר בספינה שלכם לא משתנה בין השלושה, ומכאן שהשיא נשמר בנפרד לכל רמה: שדרוג שהרווחתם בפרוע שווה בדיוק את מה שהוא שווה ברגוע.",

        "לאסוף מספיק אבנים מעלה את רמת הכוח. השעון עוצר, ומציעים לכם שלוש מתוך שבעה שדרוגים: ירי מהיר, ירי חזק, כדור נוסף, רגליים מהירות, טווח איסוף רחב יותר, לב נוסף, או ירי שחודר צורה במקום להיעצר בה. לכל שדרוג יש תקרה, אז ריצה אף פעם לא הופכת רק לדבר אחד. שורדים שלוש דקות שלמות ומנצחים. זה כל המשחק.",
      ],

      howToPlay: [
        { title: "גוררים כדי לזוז", body: "נוגעים בזירה וגוררים אצבע, או לוחצים WASD וחצים. הספינה עוקבת; היא אף פעם לא פונה לבד לשום דבר." },
        { title: "היא יורה לבד", body: "כל בערך 620 מילישניות הספינה יורה על הצורה הקרובה ביותר בטווח של 240 יחידות. אין שום כפתור ירי במשחק הזה." },
        { title: "מתחמקים מהקהל", body: "צורות זוהרות נכנסות ישר אליכם מכל קצה. פגיעה עולה לב; לעמוד בפתוח עולה כמה לבבות בבת אחת." },
        { title: "אוספים אבנים", body: "צורה שנופלת משאירה אבן. מתקרבים אליה והיא נמשכת אליכם לבד, מטווח קצר סביב הספינה." },
        { title: "בוחרים שדרוג", body: "מספיק אבנים מעלות את רמת הכוח. השעון עוצר, שלושה קלפים מופיעים, ובוחרים אחד לפני שמשהו זז שוב." },
      ],

      tips: [
        {
          title: "לא לעמוד בפינה",
          body: "צורות נכנסות מכל קצה בבת אחת, אז פינה כולאת אתכם בין שני קירות במקום באף אחד. השליש האמצעי של הזירה נותן הכי הרבה מקום לברוח בו.",
        },
        {
          title: "משאירים את היהלום לסוף",
          body: "יהלום סופג חמש פגיעות וזז הכי לאט מבין השלושה, אז הוא כמעט אף פעם לא הצורה שהורגת אתכם. המשולש שמאחוריו כן, בזמן שהירי שלכם עסוק במשהו גדול יותר.",
        },
        {
          title: "לוקחים שדרוג לב מוקדם בפרוע",
          body: "הקהל בפרוע מתכווץ עד צורה כל 165 מילישניות, וטעות אחת שם קרובה יותר לסוף מאשר אותה טעות ברגוע.",
        },
        {
          title: "שדרוג הטווח משתלם לבד",
          body: "טווח איסוף רחב יותר חוסך נסיעות חזרה אל מה שיהלום השאיר מאחור, ופחות נסיעות זה פחות זמן לעמוד במקום אחד בזמן שהקהל מבין איפה אתם.",
        },
      ],

      teaches: [
        { title: "לקרוא קהל במקום מטרה", body: "אין מה לכוון, אז כל הכישרון הוא להחליט לאיזה כיוון הכי פנוי עכשיו, וזה משתנה כל שנייה." },
        { title: "להחליט תחת לחץ", body: "שלושה קלפי שדרוג, שעון עצור, והחלטה שמעצבת את שאר הריצה. אין ביטול אחרי שהשעון חוזר לרוץ." },
        { title: "לעבוד עם תקרה", body: "לכל שדרוג יש תקרה, משני לבבות נוספים ועד שישה שדרוגי מהירות, אז ריצה תמיד חייבת להיות יותר מדבר אחד." },
        {
          title: "להפסיד בשקט",
          body: "ריצה שנגמרת אחרי תשעים שניות וריצה שנגמרת אחרי שתי דקות וחצי הן אותה צורת סיום בדיוק, ואף אחת מהן היא לא כישלון שצריך לתקן לפני שמנסים שוב.",
        },
      ],

      ages: [
        { title: "6 עד 8", body: "רגוע, שבו צורה שאפשר לפוצץ לוקחת יותר משנייה, והקהל אף פעם לא מבקש יותר מכיוון אחד בכל פעם." },
        { title: "9 עד 11", body: "רגיל, שבו העיגול והיהלום שניהם נכנסים לפני חצי הריצה והבחירה בין שדרוגים כבר באמת משנה משהו." },
        {
          title: "12 ומעלה",
          body: "פרוע מההתחלה. צורה כל 680 מילישניות שמצטמצמת ל-165 היא הנקודה שבה המשחק מפסיק להיות עניין של שימת לב והופך לעניין של החלטה מהירה.",
        },
        { title: "מבוגרים", body: "פרוע, והשיא הנפרד לכל רמה מונע מכם להעמיד פנים שריצה ברגוע וריצה בפרוע מודדות את אותו הדבר." },
      ],

      accessibility:
        "מנווטים בגרירת אצבע בכל מקום בזירה, בחצים, ב-WASD, או בלוח חצים על המסך, וארבע הדרכים שקולות לגמרי. הספינה יורה לבד, אז אין צורך לכוון ואין כפתור ירי. כפתור השהיה נמצא כל הזמן על המסך. שלושת סוגי הצורות נבדלים בגודל ובקו המתאר ולא רק בצבע, ואפשר לשחק את כל המשחק בשקט מלא.",

      together: [
        {
          title: "מעבירים בפגיעה הראשונה",
          body: "מעבירים את הספינה ברגע שנעלם לב, לא ברגע שהריצה נגמרת. כך אף אחד לא מקבל שלוש דקות שלמות לבד, וכולם מגיעים לחלק המעניין.",
        },
        { title: "אחד נוהג, אחד סופר את השעון", body: "אחד מנווט והשני קורא כמה זמן נשאר משלוש הדקות. זה משנה מה מרגיש דחוף." },
        { title: "מתחרים על הרמה, לא על השיא", body: "משחקים את אותה רמה פעמיים ברצף ומשווים מי שרד יותר, במקום לרדוף אחרי מספר שכבר על המסך." },
        { title: "מנחשים את השדרוג ביחד", body: "לפני שהקלפים מופיעים, מסכימים בקול איזה מתוך השבעה תבחרו. לא תמיד תסכימו, וזה בדיוק החלק המצחיק." },
      ],

      faq: [
        { q: "הישרדות ניאון חינמי?", a: "כן. בלי הרשמה, בלי פרסומות ובלי שום דבר לקנות. הוא גם עובד בלי אינטרנט, אחרי שהדף נטען פעם אחת." },
        {
          q: "איך שולטים בספינה?",
          a: "גוררים אצבע בכל מקום בזירה, לוחצים חצים או WASD, או נוגעים בלוח החצים על המסך. נגיעה שנייה על אותו חץ עוצרת אתכם.",
        },
        { q: "צריך לכוון או ללחוץ על ירי?", a: "לא. הספינה יורה לבד על הצורה הקרובה ביותר בטווח. כל מה שאתם עושים רק מזיז את הספינה." },
        { q: "כמה זמן נמשך סיבוב?", a: "שלוש דקות בדיוק. מגיעים לסוף וזה ניצחון, בכל רמה שמשחקים." },
        {
          q: "מה קורה כשצורה מגיעה אליי?",
          a: "מאבדים לב אחד, והצורה נהרסת תוך כדי כך, אז קהל שלם שמגיע ביחד עדיין עולה רק לב אחד. אחר כך יש 900 מילישניות שבהן שום דבר לא נוגע בכם.",
        },
        {
          q: "מה ההבדל בין רגוע, רגיל ופרוע?",
          a: "רק הקהל. העיגול והיהלום נכנסים מוקדם יותר וצורות מגיעות מהר יותר ברמות הקשות, אבל הספינה שלכם זהה בשלושתן.",
        },
        {
          q: "איך נמדד השיא?",
          a: "בצורות שפוצצתם, נשמר בנפרד לרגוע, רגיל ופרוע, כי ריצה עמוסה בפרוע וריצה נינוחה ברגוע הן לא אותו הישג.",
        },
        {
          q: "מה עושים השדרוגים?",
          a: "שבעה שדרוגים: ירי מהיר, ירי חזק, כדור נוסף, רגליים מהירות, טווח איסוף רחב יותר, לב נוסף, וירי שחודר צורה במקום להיעצר בה. לכל אחד יש תקרה, אז ריצה אף פעם לא הופכת רק לדבר אחד.",
        },
      ],

      keywords: ["משחק הישרדות", "יורה אוטומטי", "משחק זירה", "משחק דפדפן", "רוגלייק", "התחמקות מקליעים"],
    },

    en: {
      name: "Neon Survival",
      metaTitle: "Neon Survival - Free Survival Game | Ellaz",
      metaDescription:
        "A free browser game where your ship shoots on its own. Steer around glowing shapes, collect gems, pick upgrades, and survive three minutes to win.",

      lede: "Your ship fires by itself at whatever comes closest, so the only question is where you stand. Survive three minutes against glowing shapes that walk in from every edge, and you win the run.",

      body: [
        "Nobody aims in this one. Your ship shoots on its own, always at the nearest thing in range, and every drag or key press only moves your feet. That sounds like it should feel passive. It does not.",

        "The arena is 420 by 560 units, small enough that nothing ever really escapes you. You start with 3 hearts. Whatever shape finally reaches your ship costs one heart and is destroyed doing it, so five shapes arriving together still only take the one heart, not five. After a hit you get 900 milliseconds where nothing can touch you again, just long enough to get out of the crowd rather than back into it.",

        "Three kinds of shape come at you. A triangle is small and fast, and dies in one hit. A circle is slower and takes two. A diamond is bigger and slower than both, and needs five hits before it pops, so pulling it into open space matters more than fighting it wherever it caught you. Every one of them leaves a gem behind, and a gem is the only thing you ever chase on purpose.",

        "Calm, Normal and Wild change the crowd, never your ship. On Calm the circle shows up after 45 seconds and the diamond after 75; on Wild they arrive at 18 and 35. Shapes start walking in every 1150 milliseconds on Calm and every 680 on Wild, and that gap keeps shrinking as the clock runs, though it never drops below 320 milliseconds on Calm or 165 on Wild. Nothing about your own ship changes between the three, which is exactly why the record is kept separately for each one: an upgrade earned on Wild is worth exactly what it is worth on Calm.",

        "Collecting enough gems raises your power level. The clock stops, and you pick one of three upgrades from a set of seven: faster shots, stronger shots, one more bolt, quicker feet, longer gem reach, one more heart, or shots that punch through instead of stopping. Each one is capped, so a run can never become entirely one trick. Survive the full three minutes and you win. That is the whole game.",
      ],

      howToPlay: [
        { title: "Drag to move", body: "Touch the arena and drag, or push WASD or the arrow keys. Your ship follows; it never turns to face anything on its own." },
        { title: "It shoots itself", body: "Every 620 milliseconds or so your ship fires at the nearest shape inside a 240-unit radius. There is no fire button anywhere in this game." },
        { title: "Dodge the crowd", body: "Glowing shapes walk straight at you from every edge. Getting hit costs a heart; standing in the open can cost several at once." },
        { title: "Grab the gems", body: "A popped shape leaves a gem behind. Get close and it drifts to you on its own, pulled in from a short range around your ship." },
        { title: "Pick an upgrade", body: "Enough gems raise your power level. The clock stops, three cards appear, and you choose one before anything moves again." },
      ],

      tips: [
        {
          title: "Don't stand in a corner",
          body: "Shapes arrive from every edge at once, so a corner traps you against two walls instead of none. The middle third of the arena gives you the most room to slide away.",
        },
        {
          title: "Save the diamond for last",
          body: "A diamond takes five hits and moves the slowest of the three, so it is rarely the shape that kills you. It is the triangle behind it that does, while your shots are busy on something bigger.",
        },
        {
          title: "Take the extra heart early on Wild",
          body: "Wild's crowd tightens down to a shape every 165 milliseconds, and a single mistake there is closer to the end than the same mistake on Calm.",
        },
        {
          title: "The reach upgrade pays for itself",
          body: "A wider gem pull means fewer trips back for what a diamond dropped, and fewer trips is less time standing in one place while the crowd works out where you are.",
        },
      ],

      teaches: [
        { title: "Reading a crowd instead of a target", body: "There is nothing to aim, so the whole skill is deciding which direction is emptiest right now, and that changes every second." },
        { title: "Choosing under pressure", body: "Three upgrade cards, a stopped clock, and a decision that shapes the rest of the run. There is no undo once the clock starts again." },
        { title: "Working with a cap", body: "Every upgrade tops out, from two extra hearts to six speed boosts, so a run always has to become more than one thing." },
        {
          title: "Losing calmly",
          body: "A run that ends after ninety seconds and one that ends after two and a half minutes are the same shape of ending, and neither is a mistake to fix before trying again.",
        },
      ],

      ages: [
        { title: "6 to 8", body: "Calm, where a shape you can pop takes more than a second, and the crowd never asks for more than one direction at a time." },
        { title: "9 to 11", body: "Normal, where the circle and the diamond both show up before the run is half over and choosing an upgrade actually starts to matter." },
        {
          title: "12 and up",
          body: "Wild from the start. A shape every 680 milliseconds tightening to 165 is the point where the game stops being about noticing and starts being about deciding fast.",
        },
        { title: "Grown-ups", body: "Wild, and the record kept per level means there is no pretending a Calm run and a Wild run measure the same thing." },
      ],

      accessibility:
        "Steer by dragging anywhere on the arena, with the arrow keys, WASD, or the on-screen arrow pad, and all four are fully equivalent. Your ship fires on its own, so nothing ever needs aiming or a fire button. A pause button stays on screen at all times. The three enemy shapes differ by size and outline as well as colour, and the whole game can be played through in silence.",

      together: [
        {
          title: "Pass it at the first hit",
          body: "Hand the ship over the moment a heart is lost, not the moment the run ends. Nobody gets a whole three minutes to themselves, and everybody gets a turn near the interesting part.",
        },
        { title: "One steers, one watches the clock", body: "One person moves the ship, the other calls out how much of the three minutes is left. It changes what feels urgent." },
        { title: "Race the level, not the record", body: "Play the same level twice in a row and compare who survived longer, rather than chasing whatever number is already on the screen." },
        { title: "Guess the upgrade together", body: "Before the cards appear, agree out loud on which of the seven you would pick. You will not always agree, and that is the fun part." },
      ],

      faq: [
        { q: "Is Neon Survival free?", a: "Yes. No account, no ads, and nothing to buy. It works offline too, once the page has loaded once." },
        { q: "How do I control the ship?", a: "Drag anywhere on the arena, use the arrow keys or WASD, or tap the on-screen arrow pad. Tapping the same arrow twice stops you." },
        { q: "Do I ever aim or shoot?", a: "No. Your ship fires on its own at the nearest shape within range. Everything you do only moves your ship." },
        { q: "How long is a run?", a: "Three minutes exactly. Reach the end and the run is a win, whichever level you were playing." },
        {
          q: "What happens when a shape reaches me?",
          a: "You lose one heart and the shape is destroyed doing it, so a whole crowd arriving together still only costs one heart. Then you get 900 milliseconds where nothing can touch you again.",
        },
        {
          q: "What's the difference between Calm, Normal and Wild?",
          a: "Only the crowd. The circle and diamond show up sooner and shapes arrive faster on the harder levels, but your own ship is identical on all three.",
        },
        {
          q: "How is the record measured?",
          a: "In shapes popped, kept separately for Calm, Normal and Wild, because a crowded Wild run and a gentle Calm run are not the same achievement.",
        },
        {
          q: "What do the upgrades do?",
          a: "Seven of them: faster shots, stronger shots, an extra bolt, quicker feet, longer gem reach, an extra heart, and shots that pass through a shape instead of stopping. Each one is capped so a run can never be all of one thing.",
        },
      ],

      keywords: ["survival game", "arena shooter", "auto shooter", "browser game", "roguelite", "bullet dodge"],
    },

    es: {
      name: "Supervivencia Neón",
      metaTitle: "Supervivencia Neón - Juego gratis | Ellaz",
      metaDescription:
        "Tu nave dispara sola a la forma más cercana. Tú decides hacia dónde moverte, recoges gemas y eliges mejoras. Sobrevive tres minutos y ganas la partida.",

      lede: "Tu nave dispara sola, siempre a la forma más cercana, y tú solo decides hacia dónde moverte. Sobrevive tres minutos frente a formas que brillan y llegan desde todos los bordes, y ganas la partida.",

      body: [
        "Aquí no se apunta. La nave dispara por su cuenta, siempre a lo que tenga más cerca dentro de su alcance, y lo único que queda en tus manos es dónde pararte. Suena sencillo. No lo es.",

        "El campo mide 420 por 560 unidades, lo bastante pequeño para que nada se te escape de verdad. Empiezas con 3 corazones. La forma que llega hasta tu nave te cuesta un corazón y se destruye al hacerlo, así que cinco formas que llegan juntas siguen costando un solo corazón, no cinco. Después de un golpe tienes 900 milisegundos en los que nada puede tocarte, justo lo necesario para salir del grupo sin volver a meterte en él.",

        "Llegan tres tipos de forma. El triángulo es pequeño y rápido, y muere de un solo golpe. El círculo es más lento y aguanta dos. El diamante es el más grande y el más lento de los tres, y necesita cinco golpes antes de reventar, así que conviene llevarlo a un espacio abierto en vez de pelearlo donde te haya alcanzado. Cada forma que cae deja una gema, y la gema es lo único que persigues a propósito.",

        "Calma, Normal y Salvaje cambian solo el grupo que te rodea, nunca tu nave. En Calma el círculo aparece a los 45 segundos y el diamante a los 75; en Salvaje ya están a los 18 y a los 35. Las formas empiezan llegando cada 1150 milisegundos en Calma y cada 680 en Salvaje, y ese intervalo se acorta según avanza el reloj, aunque nunca baja de 320 en Calma ni de 165 en Salvaje. Nada de tu propia nave cambia entre las tres, y por eso el récord se guarda por separado para cada una: una mejora ganada en Salvaje vale exactamente lo mismo que en Calma.",

        "Recoger suficientes gemas sube tu nivel de poder. El reloj se detiene y te ofrece tres de siete mejoras: disparo más rápido, disparo más fuerte, un proyectil extra, más velocidad, más alcance para las gemas, un corazón extra, o disparos que atraviesan en vez de detenerse. Cada mejora tiene un tope, así que una partida nunca se vuelve solo una cosa. Sobrevive los tres minutos completos y ganas. Eso es todo el juego.",
      ],

      howToPlay: [
        { title: "Arrastra para moverte", body: "Toca el campo y arrastra el dedo, o usa WASD o las flechas. La nave te sigue; nunca gira sola hacia nada." },
        {
          title: "Ella dispara sola",
          body: "Cada 620 milisegundos más o menos, la nave dispara a la forma más cercana dentro de un radio de 240 unidades. No hay ningún botón de disparo en este juego.",
        },
        { title: "Esquiva al grupo", body: "Las formas llegan directas hacia ti desde cada borde. Un golpe cuesta un corazón; quedarte en campo abierto puede costarte varios de golpe." },
        { title: "Recoge las gemas", body: "Una forma reventada deja una gema. Acércate y ella se acerca sola, arrastrada desde un radio corto alrededor de tu nave." },
        { title: "Elige una mejora", body: "Suficientes gemas suben tu nivel de poder. El reloj se detiene, aparecen tres cartas, y eliges una antes de que nada vuelva a moverse." },
      ],

      tips: [
        {
          title: "No te quedes en la esquina",
          body: "Las formas llegan desde todos los bordes a la vez, así que una esquina te encierra entre dos paredes en vez de ninguna. El tercio central del campo es donde más espacio tienes para escapar.",
        },
        {
          title: "Deja el diamante para el final",
          body: "Un diamante aguanta cinco golpes y es el más lento de los tres, así que casi nunca es lo que te mata. El triángulo que viene detrás sí, mientras tu disparo está ocupado con algo más grande.",
        },
        {
          title: "Coge el corazón extra pronto en Salvaje",
          body: "El grupo en Salvaje se aprieta hasta una forma cada 165 milisegundos, y un solo error ahí está más cerca del final que el mismo error en Calma.",
        },
        {
          title: "La mejora de alcance se paga sola",
          body: "Más alcance para las gemas significa menos viajes a buscar lo que dejó un diamante, y menos viajes es menos tiempo parado en un sitio mientras el grupo averigua dónde estás.",
        },
      ],

      teaches: [
        { title: "Leer un grupo en vez de un blanco", body: "No hay nada que apuntar, así que toda la habilidad está en decidir qué dirección está más despejada ahora mismo, y eso cambia cada segundo." },
        { title: "Decidir bajo presión", body: "Tres cartas de mejora, el reloj parado, y una decisión que da forma al resto de la partida. No hay deshacer una vez que el reloj vuelve a correr." },
        { title: "Trabajar con un tope", body: "Cada mejora tiene un límite, desde dos corazones extra hasta seis mejoras de velocidad, así que una partida siempre tiene que ser más de una sola cosa." },
        {
          title: "Perder con calma",
          body: "Una partida que termina a los noventa segundos y otra que termina a los dos minutos y medio son el mismo tipo de final, y ninguna de las dos es un fallo que corregir antes de intentarlo de nuevo.",
        },
      ],

      ages: [
        { title: "6 a 8", body: "Calma, donde una forma que se puede reventar tarda más de un segundo, y el grupo nunca pide más de una dirección a la vez." },
        { title: "9 a 11", body: "Normal, donde el círculo y el diamante aparecen antes de la mitad de la partida y elegir una mejora empieza a importar de verdad." },
        {
          title: "12 en adelante",
          body: "Salvaje desde el principio. Una forma cada 680 milisegundos que se aprieta hasta 165 es el punto donde el juego deja de ser cuestión de fijarse y pasa a ser cuestión de decidir rápido.",
        },
        { title: "Adultos", body: "Salvaje, y el récord guardado por separado en cada nivel evita fingir que una partida en Calma y una en Salvaje miden lo mismo." },
      ],

      accessibility:
        "Se controla arrastrando el dedo por cualquier parte del campo, con las flechas, con WASD o con la cruceta en pantalla, y las cuatro formas son igual de válidas. La nave dispara sola, así que no hace falta apuntar ni hay botón de disparo. El botón de pausa está siempre visible en pantalla. Las tres formas enemigas se distinguen por tamaño y contorno, no solo por color, y se puede jugar entero en silencio completo.",

      together: [
        {
          title: "Se pasa el turno al primer golpe",
          body: "Cede la nave en cuanto se pierde un corazón, no cuando termina la partida. Así nadie se queda los tres minutos enteros para sí, y todos llegan a la parte interesante.",
        },
        { title: "Uno pilota, otro cuenta el reloj", body: "Uno controla la nave y el otro dice cuánto queda de los tres minutos. Cambia lo que se siente urgente." },
        { title: "Compite por el nivel, no por el récord", body: "Juega el mismo nivel dos veces seguidas y compara quién sobrevivió más, en vez de perseguir el número que ya está en pantalla." },
        { title: "Adivinen la mejora juntos", body: "Antes de que aparezcan las cartas, pónganse de acuerdo en voz alta sobre cuál de las siete elegirían. No siempre coincidirán, y esa es la parte divertida." },
      ],

      faq: [
        { q: "¿Supervivencia Neón es gratis?", a: "Sí. No hace falta cuenta, no hay anuncios y no hay nada que comprar. También funciona sin conexión, una vez que la página ha cargado." },
        {
          q: "¿Cómo controlo la nave?",
          a: "Arrastra el dedo por cualquier parte del campo, usa las flechas o WASD, o toca la cruceta en pantalla. Tocar la misma flecha dos veces te detiene.",
        },
        { q: "¿Alguna vez apunto o disparo yo?", a: "No. Tu nave dispara sola a la forma más cercana dentro de su alcance. Todo lo que tú haces solo mueve la nave." },
        { q: "¿Cuánto dura una partida?", a: "Tres minutos exactos. Llegar al final es ganar, en cualquiera de los tres niveles." },
        {
          q: "¿Qué pasa cuando una forma me alcanza?",
          a: "Pierdes un corazón y la forma se destruye al hacerlo, así que un grupo entero que llega junto sigue costando solo un corazón. Después tienes 900 milisegundos en los que nada puede tocarte.",
        },
        {
          q: "¿Qué diferencia hay entre Calma, Normal y Salvaje?",
          a: "Solo el grupo. El círculo y el diamante aparecen antes y las formas llegan más rápido en los niveles duros, pero tu nave es idéntica en los tres.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En formas reventadas, guardado por separado para Calma, Normal y Salvaje, porque una partida cargada en Salvaje y una tranquila en Calma no son el mismo logro.",
        },
        {
          q: "¿Qué hacen las mejoras?",
          a: "Siete en total: disparo más rápido, disparo más fuerte, un proyectil extra, más velocidad, más alcance para las gemas, un corazón extra, y disparos que atraviesan una forma en vez de detenerse. Cada una tiene un tope, así que una partida nunca se vuelve solo una cosa.",
        },
      ],

      keywords: ["juego de supervivencia", "disparo automático", "juego de arena", "juego de navegador", "roguelite", "esquivar proyectiles"],
    },

    fr: survivorsFr,
  },

  provenance: [
    {
      claim: "a run lasts 180,000 ms (three minutes), and surviving it wins",
      source: "src/games/survivors/logic.ts",
    },
    {
      claim: "the arena is 420 by 560 logical units",
      source: "src/games/survivors/logic.ts",
    },
    {
      claim: "the run starts on 3 hearts, with a 900 ms mercy window after a hit",
      source: "src/games/survivors/logic.ts",
    },
    {
      claim: "the runner takes 1 hit, the orb 2, the brute 5",
      source: "src/games/survivors/logic.ts",
    },
    {
      claim:
        "shapes spawn every 1150/900/680 ms on calm/normal/wild, tightening to a floor of 320/230/165 ms; the orb unlocks at 45/30/18s and the brute at 75/55/35s",
      source: "src/games/survivors/logic.ts",
    },
    {
      claim: "seven upgrades, capped at 6/5/3/4/3/2/3",
      source: "src/games/survivors/logic.ts",
    },
  ],
};
