import type { GameContent } from "../types";

/**
 * Pilot #3 - the classic, and the one whose record is points.
 *
 * Its statistic is the speed ramp, which is arithmetic rather than simulation
 * and says so: all three starting speeds converge on the same 60 ms tick, so
 * the choice is how long the ramp is, not how fast the game ends up. Nothing in
 * the code states that. `scripts/sim/snake-speed.mjs` derives it from the
 * scene's own constants.
 */
export const snake: GameContent = {
  id: "snake",

  copy: {
    he: {
      metaTitle: "משחק נחש - סנייק חינם בעברית | Ellaz",
      metaDescription:
        "משחק נחש חינמי בדפדפן, על לוח 17×17. שלוש מהירויות פתיחה, בלי שלבים ובלי סוף. עובד בהחלקה על הטלפון.",

      lede: "משחק הנחש הקלאסי, חינם בדפדפן. אוכלים, מתארכים, ולא נוגעים בעצמכם. לוח 17×17, שלוש מהירויות פתיחה, ובלי סוף.",

      body: [
        "מחליקים באצבע או לוחצים על חץ, והנחש פונה. הוא לא זז עד שנוגעים, אז הוא לא מת לפני שהסתכלתם.",

        "הלוח הוא 17 על 17, כלומר 289 משבצות, והנחש מתחיל באורך שלוש. מכאן נובע המספר היחיד שבאמת חוסם: 286 תפוחים ואין לאן לגדול. אף אחד לא יגיע לשם, וזה בסדר. זה הגבול, לא היעד.",

        "המהירות עולה לבד. כל חמישה תפוחים הנחש מתקצר בשמונה מילישניות לצעד, עד רצפה של 60. וכאן מסתתר הדבר שכדאי לדעת לפני שבוחרים: שלוש המהירויות מגיעות לאותה רצפה בדיוק. במהיר זה קורה אחרי 20 תפוחים, ברגיל אחרי 45, ובאיטי אחרי 70. חציית הלוח מתחילה ב-2.9 שניות באיטי וב-1.5 במהיר, ואצל כולם נגמרת באותה שנייה אחת עגולה. הבחירה היא לא כמה מהר המשחק ייגמר, אלא כמה זמן יש לכם עד שהוא מגיע לשם.",

        "אחרי הנקודה הזו שום דבר במשחק לא נהיה קשה יותר. רק אתם. הנחש שלכם הוא כבר המכשול הגדול בלוח, והוא מתארך בכל תפוח.",

        "כל חמישה תפוחים נכנסים מטבעות לארנק, בלי קונפטי ובלי לעצור את הריצה. השיא נמדד פעם אחת בלבד, ברגע שנגמר, כי בנחש הניקוד רק עולה ואין טעם לשאול את אותה שאלה שלושים פעם בריצה אחת.",
      ],

      howToPlay: [
        { title: "נוגעים כדי להתחיל", body: "הנחש מחכה לכם. הוא לא זז לפני זה." },
        { title: "מחליקים לכיוון", body: "או חצים במקלדת. אי אפשר לפנות אחורה לתוך עצמכם." },
        { title: "אוכלים את התפוח", body: "הנחש מתארך באחד, ותפוח חדש מופיע במקום פנוי." },
        { title: "לא נוגעים בקיר ולא בעצמכם", body: "כל אחד מהשניים מסיים את הריצה מיד." },
        { title: "נוגעים שוב", body: "מתחילים מחדש. אותה מהירות שבחרתם, לוח נקי." },
      ],

      tips: [
        {
          title: "שמרו על השוליים",
          body: "נחש שרץ במרכז חוסם את עצמו משני צדדים. נחש שרץ בהיקף משאיר לעצמו את כל האמצע.",
        },
        {
          title: "אל תרדפו אחרי התפוח",
          body: "הדרך הקצרה אליו היא לא תמיד הנכונה. שאלו קודם איפה תהיו אחריו, ואז בחרו את הדרך שמשאירה לכם יציאה.",
        },
        {
          title: "הזנב זז גם הוא",
          body: "המשבצת שהזנב עומד עליה תתפנה בצעד הבא, אז מעבר שנראה חסום לפעמים פתוח בדיוק בזמן. זה הטריק שמפריד בין 30 ל-80.",
        },
        {
          title: "התחילו באיטי",
          body: "לא כדי שיהיה קל, אלא כי איטי נותן לכם 70 תפוחים לפני שהוא מגיע למהירות המקסימלית, ומהיר נותן 20. יותר זמן ללמוד את הלוח לפני שהוא נהיה תובעני.",
        },
      ],

      teaches: [
        { title: "תכנון מראש", body: "כל פנייה קובעת אילו פניות יישארו אפשריות. שני צעדים קדימה זה ההבדל." },
        { title: "שליטה עדינה", body: "המשחק לא דורש מהירות אצבע אלא תזמון. פנייה מוקדמת מדי גרועה כמו מאוחרת מדי." },
        { title: "ניהול מרחב", body: "הלוח נגמר. ללמוד לא לחסום את עצמכם זו כל האסטרטגיה." },
        { title: "להתחיל מחדש בלי דרמה", body: "נגיעה אחת והלוח נקי. אין מסך תבוסה ואין המתנה." },
      ],

      ages: [
        { title: "5 עד 6", body: "מהירות איטית, ובלי לצפות לניקוד. בגיל הזה הכיף הוא שהנחש מציית לאצבע." },
        { title: "7 עד 9", body: "איטי או רגיל. פה מתחילים באמת לתכנן פנייה מראש במקום להגיב." },
        { title: "10 ומעלה", body: "רגיל, ואז מהיר. 20 תפוחים במהיר וכבר הגעתם למהירות המקסימלית." },
        { title: "מבוגרים", body: "מהיר. שימו לב לזנב שמתפנה, ותגלו שהתקרה שלכם הייתה במקום אחר." },
      ],

      accessibility:
        "אפשר לשחק בהחלקה על מסך מגע או בחצים במקלדת, ושתי הדרכים שקולות לגמרי. אין צורך בהחזקה ממושכת ואין תנועת גרירה מדויקת: החלקה קצרה לכיוון מספיקה. הנחש והתפוח נבדלים בצורה ולא רק בצבע. אין הבהובים מהירים ואין רעש שהמשחק תלוי בו, אז אפשר לשחק בשקט מלא. המשחק לא זז לפני הנגיעה הראשונה, כך שאין מצב שמתחילים לפני שהייתם מוכנים.",

      together: [
        { title: "תור בכל מוות", body: "מחליפים אצבע בכל פעם שהריצה נגמרת. הניקוד הכי גבוה בערב לוקח." },
        { title: "אחד מנווט", body: "אחד מחזיק את הטלפון והשני אומר לאן. הרבה יותר קשה ממה שזה נשמע, וזה החלק המצחיק." },
        {
          title: "יעד במקום שיא",
          body: "הציבו מספר, נגיד 25, ותשחקו עד שמישהו מגיע. יעד קרוב עדיף על שיא רחוק לילד שרק התחיל.",
        },
        { title: "בלי לאכול", body: "נסו לשרוד דקה שלמה בלי לגעת בתפוח אחד. משחק אחר לגמרי על אותו לוח." },
      ],

      faq: [
        {
          q: "משחק הנחש חינמי?",
          a: "כן. אין תשלום ואין רכישות בתוך המשחק. כל 22 המשחקים באתר פתוחים מהרגע הראשון.",
        },
        {
          q: "איך משחקים בטלפון?",
          a: "מחליקים אצבע לכיוון שאליו רוצים לפנות. נגיעה אחת מתחילה את הריצה ונגיעה נוספת מתחילה מחדש אחרי מוות.",
        },
        {
          q: "מה הניקוד המקסימלי?",
          a: "286. הלוח הוא 17 על 17, כלומר 289 משבצות, והנחש מתחיל באורך שלוש, אז אחרי 286 תפוחים אין לאן להתארך. זה גבול תאורטי ולא יעד.",
        },
        {
          q: "המשחק נהיה מהיר יותר?",
          a: "כן, כל חמישה תפוחים, בשמונה מילישניות לצעד, עד רצפה של 60. במהיר מגיעים לרצפה אחרי 20 תפוחים, ברגיל אחרי 45 ובאיטי אחרי 70. משם המהירות כבר לא משתנה.",
        },
        {
          q: "איזו מהירות כדאי לבחור?",
          a: "כולן נגמרות באותה מהירות מקסימלית, אז השאלה היא רק כמה זמן יש לכם עד שם. איטי נותן 70 תפוחים ללמוד את הלוח, מהיר נותן 20.",
        },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם בלי קליטה.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בתפוחים, כשיותר זה טוב יותר. הוא נבדק פעם אחת בסוף הריצה, כי הניקוד בנחש רק עולה.",
        },
        {
          q: "יש פרסומות?",
          a: "אין. לא באנרים ולא סרטונים בין ריצות.",
        },
        {
          q: "מאיזה גיל מתאים?",
          a: "מחמש בערך, במהירות האיטית. אין קריאה בשום מקום במשחק, אז ילד שעדיין לא קורא משחק לבד.",
        },
      ],

      keywords: ["נחש", "סנייק", "ארקייד", "קלאסי", "רפלקסים", "אינסופי"],
    },

    en: {
      metaTitle: "Free Snake Game - Play Online, No Download | Ellaz",
      metaDescription:
        "The classic snake game, free in your browser on a 17x17 board. Three starting speeds, endless play, and swipe controls on a phone.",

      lede: "The classic snake game, free in your browser. Eat, get longer, and do not touch yourself. A 17x17 board, three starting speeds, and no end to it.",

      body: [
        "Swipe a finger, or press an arrow. The snake turns. It does not move until you touch it, so it never dies before you were looking.",

        "The board is 17 by 17, which is 289 squares, and the snake starts three long. That gives the one number that genuinely caps this game: 286 apples and there is nowhere left to grow. Nobody gets there. That is fine. It is a ceiling, not a goal.",

        "Speed climbs on its own. Every five apples the snake takes eight milliseconds off its step, down to a floor of 60. Here is the thing worth knowing before you choose one, though. All three speeds arrive at exactly the same floor. On fast that happens after 20 apples, on normal after 45, on slow after 70. Crossing the board takes 2.9 seconds at the start on slow and 1.5 on fast, and for every one of them it ends up at the same flat second. The choice is not how fast the game gets. It is how long you have before it gets there.",

        "After that point nothing in the game gets harder. Only you do. Your own snake is now the biggest obstacle on the board, and it grows with every apple.",

        "Every five apples drops coins into the wallet, with no confetti and no pause in the run. The record is checked once, at the moment you die, because a snake score only ever climbs and there is no sense asking the same question thirty times a run.",
      ],

      howToPlay: [
        { title: "Touch to start", body: "The snake is waiting for you. It will not move before that." },
        { title: "Swipe a direction", body: "Or use the arrow keys. You cannot turn back into yourself." },
        { title: "Eat the apple", body: "The snake grows by one, and a new apple appears somewhere free." },
        { title: "Miss the wall and yourself", body: "Either one ends the run immediately." },
        { title: "Touch again", body: "Straight into a new run, same speed you picked, clean board." },
      ],

      tips: [
        {
          title: "Hug the edges",
          body: "A snake running through the middle blocks itself on two sides. A snake running the perimeter keeps the whole centre available.",
        },
        {
          title: "Do not chase the apple",
          body: "The shortest route is not always the right one. Ask where you will be afterwards, then take the route that leaves you an exit.",
        },
        {
          title: "The tail moves too",
          body: "The square your tail is standing on clears on the next step, so a gap that looks blocked is sometimes open exactly in time. That trick is the difference between 30 and 80.",
        },
        {
          title: "Start on slow",
          body: "Not because it is easier, but because slow gives you 70 apples before it hits top speed and fast gives you 20. More time to learn the board before it starts asking.",
        },
      ],

      teaches: [
        { title: "Thinking ahead", body: "Every turn decides which turns are still available. Two steps of lookahead is the whole difference." },
        { title: "Fine control", body: "This does not need fast fingers, it needs timing. Turning early is as costly as turning late." },
        { title: "Managing space", body: "The board runs out. Learning not to trap yourself is the entire strategy." },
        { title: "Restarting without drama", body: "One touch and the board is clean. No defeat screen and nothing to wait through." },
      ],

      ages: [
        { title: "5 to 6", body: "Slow speed, and no expectations about score. At this age the fun is that the snake obeys a finger." },
        { title: "7 to 9", body: "Slow or normal. This is where planning a turn replaces reacting to one." },
        { title: "10 and up", body: "Normal, then fast. Twenty apples on fast and you are already at top speed." },
        { title: "Grown-ups", body: "Fast. Watch for the tail clearing and you will find your ceiling was somewhere else." },
      ],

      accessibility:
        "Play by swiping on a touch screen or with the arrow keys, and the two are completely equivalent. Nothing needs holding down and no precise dragging is required: a short swipe in a direction is enough. The snake and the apple differ by shape rather than only colour. There are no fast flashes and no sound the game depends on, so it plays fine in silence. Nothing moves until your first touch, so there is no way to start before you were ready.",

      together: [
        { title: "Swap on death", body: "Hand the phone over every time a run ends. Highest score of the evening takes it." },
        { title: "One drives, one navigates", body: "One person holds the phone, the other calls the turns. Much harder than it sounds, which is the funny part." },
        {
          title: "A target instead of a record",
          body: "Name a number, say 25, and play until somebody reaches it. A close target beats a distant record for a child who just started.",
        },
        { title: "Eat nothing", body: "Try surviving a full minute without touching a single apple. A completely different game on the same board." },
      ],

      faq: [
        {
          q: "Is the snake game free?",
          a: "Yes. No payment and no in-game purchases. Every game on the site is open from the first second.",
        },
        {
          q: "How do I play it on a phone?",
          a: "Swipe a finger in the direction you want to turn. One touch starts the run and another starts a fresh one after you die.",
        },
        {
          q: "What is the maximum score?",
          a: "286. The board is 17 by 17, which is 289 squares, and the snake starts three long, so after 286 apples there is nowhere left to grow. That is a theoretical ceiling rather than a target.",
        },
        {
          q: "Does the game speed up?",
          a: "Yes, every five apples, by eight milliseconds a step, down to a floor of 60. Fast reaches the floor after 20 apples, normal after 45 and slow after 70. Speed stops changing from there.",
        },
        {
          q: "Which speed should I pick?",
          a: "They all end at the same top speed, so the only question is how long you get before it. Slow gives you 70 apples to learn the board, fast gives you 20.",
        },
        {
          q: "Can I play offline?",
          a: "Yes. After one visit the game is stored on the device and runs with no signal.",
        },
        {
          q: "How is the record measured?",
          a: "In apples, where more is better. It is checked once at the end of a run, because a snake score only ever climbs.",
        },
        {
          q: "Are there ads?",
          a: "None. No banners, and nothing that plays between runs.",
        },
        {
          q: "What age is it for?",
          a: "About five and up, on the slow speed. There is no reading anywhere in the game, so a child who cannot read yet plays alone.",
        },
      ],

      keywords: ["snake", "arcade", "classic", "reflexes", "endless", "retro"],
    },
    es: {
      metaTitle: "Juego de la serpiente gratis - jugar online | Ellaz",
      metaDescription:
        "El clásico juego de la serpiente, gratis en el navegador sobre un tablero de 17x17. Tres velocidades de salida, partida infinita y control por deslizamiento.",

      lede: "El clásico juego de la serpiente, gratis en el navegador. Come, crece y no te toques a ti mismo. Un tablero de 17x17, tres velocidades de salida, y esto no se acaba.",

      body: [
        "Deslizas un dedo o pulsas una flecha. La serpiente gira. No se mueve hasta que la tocas, así que nunca se muere sin que estuvieses mirando.",

        "El tablero mide 17 por 17, o sea 289 casillas, y la serpiente sale midiendo tres. De ahí sale el único número que de verdad pone techo a esto: 286 manzanas y ya no queda dónde crecer. Nadie llega. Da igual. Es un techo, no una meta.",

        "La velocidad sube sola. Cada cinco manzanas la serpiente se quita ocho milisegundos de paso, hasta un suelo de 60. Y ahora lo que conviene saber antes de elegir: las tres velocidades acaban exactamente en el mismo suelo. En rápida eso pasa a las 20 manzanas, en normal a las 45 y en lenta a las 70. Cruzar el tablero cuesta 2,9 segundos al principio en lenta y 1,5 en rápida, y todas terminan en el mismo segundo plano. Lo que eliges no es cuánto corre el juego. Es cuánto tiempo tienes antes de que corra.",

        "Pasado ese punto, nada del juego se pone más difícil. Solo tú. Tu propia serpiente es ya el mayor obstáculo del tablero, y crece con cada manzana.",

        "Cada cinco manzanas caen monedas en la cartera, sin confeti y sin cortar la partida. El récord se comprueba una vez, en el momento en que mueres, porque una puntuación de serpiente solo sube y no tiene sentido preguntar treinta veces lo mismo.",
      ],

      howToPlay: [
        { title: "Toca para empezar", body: "La serpiente te está esperando. Antes de eso no se mueve." },
        { title: "Desliza en una dirección", body: "O usa las flechas del teclado. No puedes girar contra ti mismo." },
        { title: "Cómete la manzana", body: "La serpiente crece uno y aparece otra manzana en un hueco libre." },
        { title: "Esquiva la pared y a ti mismo", body: "Cualquiera de las dos termina la partida al instante." },
        { title: "Vuelve a tocar", body: "Partida nueva, la misma velocidad que elegiste, tablero limpio." },
      ],

      tips: [
        {
          title: "Pégate a los bordes",
          body: "Una serpiente que va por el centro se bloquea por dos lados. Una que recorre el perímetro deja todo el medio disponible.",
        },
        {
          title: "No persigas la manzana",
          body: "El camino más corto no siempre es el bueno. Pregúntate dónde vas a quedarte después y coge la ruta que te deje una salida.",
        },
        {
          title: "La cola también se mueve",
          body: "La casilla donde está tu cola se libera en el paso siguiente, así que un hueco que parece cerrado a veces se abre justo a tiempo. Ese truco es la diferencia entre 30 y 80.",
        },
        {
          title: "Empieza en lenta",
          body: "No porque sea más fácil, sino porque la lenta te da 70 manzanas antes de llegar al tope y la rápida te da 20. Más tiempo para aprenderte el tablero antes de que empiece a exigir.",
        },
      ],

      teaches: [
        { title: "Anticiparse", body: "Cada giro decide qué giros siguen estando disponibles. Pensar dos pasos por delante es toda la diferencia." },
        { title: "Control fino", body: "Esto no pide dedos rápidos, pide medir el momento. Girar pronto cuesta lo mismo que girar tarde." },
        { title: "Gestionar el espacio", body: "El tablero se acaba. Aprender a no encerrarse es la estrategia entera." },
        { title: "Volver a empezar sin drama", body: "Un toque y el tablero está limpio. No hay pantalla de derrota ni nada que esperar." },
      ],

      ages: [
        { title: "5 a 6", body: "Velocidad lenta, y sin esperar ninguna puntuación. A esta edad la gracia es que la serpiente obedece a un dedo." },
        { title: "7 a 9", body: "Lenta o normal. Aquí planear un giro sustituye a reaccionar a uno." },
        { title: "10 en adelante", body: "Normal y después rápida. Veinte manzanas en rápida y ya estás a tope de velocidad." },
        { title: "Adultos", body: "Rápida. Vigilad cuándo se libera la cola y descubriréis que vuestro techo estaba en otro sitio." },
      ],

      accessibility:
        "Se juega deslizando el dedo en una pantalla táctil o con las flechas del teclado, y las dos formas son equivalentes. No hay que mantener nada pulsado ni arrastrar con precisión: basta un deslizamiento corto en una dirección. La serpiente y la manzana se distinguen por forma y no solo por color. No hay destellos rápidos ni ningún sonido del que dependa el juego, así que se juega perfectamente en silencio. Nada se mueve hasta tu primer toque, de modo que no hay manera de empezar antes de estar listo.",

      together: [
        { title: "Cambio al morir", body: "Pasad el móvil cada vez que termine una partida. La puntuación más alta de la tarde se lo lleva." },
        { title: "Uno conduce, otro navega", body: "Uno sujeta el móvil y el otro canta los giros. Mucho más difícil de lo que suena, que es justo la gracia." },
        {
          title: "Un objetivo en vez de un récord",
          body: "Decid un número, por ejemplo 25, y jugad hasta que alguien llegue. Para un niño que acaba de empezar, un objetivo cercano vale más que un récord lejano.",
        },
        { title: "Sin comer nada", body: "Intentad sobrevivir un minuto entero sin tocar una sola manzana. Es otro juego completamente distinto en el mismo tablero." },
      ],

      faq: [
        {
          q: "¿El juego de la serpiente es gratis?",
          a: "Sí. Sin pagos y sin compras dentro del juego. Todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Cómo se juega en el móvil?",
          a: "Deslizas el dedo hacia donde quieras girar. Un toque empieza la partida y otro empieza una nueva cuando mueres.",
        },
        {
          q: "¿Cuál es la puntuación máxima?",
          a: "286. El tablero mide 17 por 17, o sea 289 casillas, y la serpiente sale midiendo tres, así que después de 286 manzanas no queda dónde crecer. Es un techo teórico y no un objetivo.",
        },
        {
          q: "¿El juego acelera?",
          a: "Sí, cada cinco manzanas, ocho milisegundos por paso, hasta un suelo de 60. La rápida llega al suelo a las 20 manzanas, la normal a las 45 y la lenta a las 70. A partir de ahí la velocidad ya no cambia.",
        },
        {
          q: "¿Qué velocidad elijo?",
          a: "Las tres terminan a la misma velocidad máxima, así que la única pregunta es cuánto tiempo tienes antes de llegar. La lenta te da 70 manzanas para aprenderte el tablero y la rápida te da 20.",
        },
        {
          q: "¿Se puede jugar sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona sin cobertura.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "En manzanas, donde más es mejor. Se comprueba una sola vez al final de la partida, porque una puntuación de serpiente solo sube.",
        },
        {
          q: "¿Tiene anuncios?",
          a: "Ninguno. Ni banners ni nada que se ponga entre partida y partida.",
        },
        {
          q: "¿Para qué edad es?",
          a: "A partir de unos cinco años, en velocidad lenta. En el juego no se lee nada, así que un niño que todavía no lee juega solo.",
        },
      ],

      keywords: ["serpiente", "arcade", "clásico", "reflejos", "infinito", "retro"],
    },
  },

  provenance: [
    {
      claim: "17x17 board, 289 cells, maximum score 286",
      source: "scripts/sim/snake-speed.mjs",
    },
    {
      claim: "top speed 60 ms per step, reached after 20 / 45 / 70 apples on fast / normal / slow",
      source: "scripts/sim/snake-speed.mjs",
    },
    {
      claim: "board crossing 2.9s on slow and 1.5s on fast at the start, 1.0s for all at top speed",
      source: "scripts/sim/snake-speed.mjs",
    },
    {
      claim: "coins every 5 apples, no confetti; the record is checked once at death",
      source: "src/games/snake/SnakeScene.ts",
    },
    {
      claim: "the record is points, higher is better",
      source: "src/sdk/score.ts",
    },
  ],
};
