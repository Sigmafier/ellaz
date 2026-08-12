import type { GameContent } from "../types";

/**
 * The game whose ladder runs backwards, and the page says so.
 *
 * Harder here means FEWER bees, not faster ones, because the skill being asked
 * for is telling two things apart rather than moving quickly. That is genuinely
 * counterintuitive and it is the most interesting thing about the game.
 *
 * The statistic is one nobody could guess from the code: the declared bee ratio
 * is not the mix a child sees. A cap of three in a row pulls the realised share
 * toward even every time it fires, so 65% comes out at 59%.
 * `scripts/sim/spawn-ladder.mjs` measures it against the game's own closed form
 * and refuses to print either number if they disagree.
 */
export const bees: GameContent = {
  id: "bees",

  copy: {
    he: {
      metaTitle: "רק דבורים - משחק ריכוז לילדים | Ellaz",
      metaDescription:
        "משחק חינם לילדים: דבורים ופרפרים עפים בשמיים, ונוגעים רק בדבורים. בלי ניקוד שיורד, בלי הרשמה.",

      lede: "משחק חינם לילדים שבו דבורים ופרפרים חוצים את השמיים במשך ארבעים שניות, והילד נוגע רק בדבורים. פרפר שנגעו בו לא עולה כלום, ודבורה שהתפספסה גם לא.",

      body: [
        "שמיים, ובהם שני סוגי יצורים. נוגעים בדבורים. את הפרפרים מניחים לעוף.",

        "וכאן הרמות עובדות הפוך ממה שמצפים. קשה יותר פירושו פחות דבורים, לא מהר יותר. המשחק הזה לא מודד מהירות אלא את היכולת לעצור ולבדוק, וכשכמעט כל מה שעף הוא דבורה הילד נכנס לקצב של נגיעה בכל דבר תוך שניות ומפסיק להסתכל. זו בדיוק ההרגל שהמשחק קיים כדי לשבור. אז היחס יורד מ-65% דבורים בקלה ל-50% בקשה, והפרפר הופך מהפרעה נדירה לחצי מהשמיים.",

        "המספר שהקוד מבקש הוא לא המספר שהילד רואה, וזה מפתיע. יש כלל שאוסר יותר משלושה יצורים זהים ברצף, וכל פעם שהוא נכנס לפעולה הוא מושך את התערובת לכיוון האמצע. הרצנו 1,500 סיבובים לכל רמה: 65% המבוקשים מגיעים בפועל ל-59%, ו-60% מגיעים ל-56%. ברמה הקשה שני המספרים נפגשים על 50% בדיוק, כי תערובת שכבר מאוזנת אין לאן למשוך אותה.",

        "סיבוב הוא ארבעים שניות, וזה מספיק זמן. ברמה הקלה חוצים את השמיים 28 יצורים ומתוכם בערך 17 דבורים. בקשה עוברים 57 יצורים ובערך 29 מהם דבורים, אז גם כשהיחס נמוך יותר יש יותר דבורים לתפוס, פשוט צריך לבחור אותן.",

        "אין פה מה להפסיד. אין ניקוד שיורד, אין חיים ואין צליל של טעות, והמונה היחיד במשחק הוא כמה דבורים נתפסו. הסיבוב תמיד נגמר בסיום, גם אם הילד לא נגע באף אחת.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. ההבדל הוא כמה פרפרים יעופו." },
        { title: "מחכים לדבורה", body: "היצורים חוצים את המסך משמאל לימין ומימין לשמאל." },
        { title: "נוגעים רק בדבורים", body: "נגיעה אחת. הפרפר היפה אף פעם לא המטרה." },
        { title: "מסיימים סיבוב", body: "אחרי ארבעים שניות רואים כמה דבורים נתפסו, ואפשר מיד עוד סיבוב." },
      ],

      tips: [
        {
          title: "להסתכל על הכנפיים",
          body: "צורת הכנף מבדילה מהר יותר מהצבע, וגם ברור יותר כשהיצור זז.",
        },
        {
          title: "לא לנגוע אוטומטית",
          body: "רוב הדבורים שמפספסים נובעות מנגיעה מהירה מדי בפרפר. שבריר שנייה של בדיקה מרוויח יותר ממה שהוא עולה.",
        },
        {
          title: "לתפוס באמצע",
          body: "יצור באמצע המסך נשאר זמין הכי הרבה זמן. מי שמחכה לקצה מפסיד שנייה.",
        },
        {
          title: "לנסות את הקשה דווקא",
          body: "פחות דבורים נשמע מתסכל ובפועל זה נעים יותר, כי יש זמן לחשוב בין אחת לשנייה.",
        },
      ],

      teaches: [
        {
          title: "לעצור לפני שפועלים",
          body: "המשחק כולו הוא תרגיל בלעצור את היד. זו מיומנות שמתאמנת ממש כמו כל אחרת.",
        },
        { title: "להבחין בין שניים דומים", body: "דבורה ופרפר עפים אותו דבר. ההבדל בפרטים, וצריך להסתכל." },
        { title: "ריכוז לאורך זמן", body: "ארבעים שניות של תשומת לב רצופה זה הרבה בגיל ארבע, וזה מתארך." },
        {
          title: "לקבל החמצה",
          body: "דבורה שעפה בלי שנגעו בה לא עושה כלום. ילדים לומדים כאן שלא כל הזדמנות צריך לתפוס.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "רמה קלה. הרבה דבורים, אז כמעט כל נגיעה מצליחה וזה מספיק." },
        { title: "5 עד 6", body: "בינונית. פה מתחילים באמת לבדוק לפני שנוגעים." },
        { title: "7 ומעלה", body: "קשה, שבה חצי מהשמיים אסור לנגיעה." },
        {
          title: "הורים",
          body: "אין פה מה להפסיד, אז המשחק מתאים גם לרגעים שבהם אתם לא יכולים לשבת ליד.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. היצורים גדולים ועפים בנתיבים קבועים ולא בקפיצות מפתיעות, כך שאפשר לעקוב אחריהם גם בעין שעדיין מתאמנת. דבורה ופרפר נבדלים בצורת הכנף ולא רק בצבע, אז עיוורון צבעים לא מפריע. השעון מפסיק כשמניחים את המכשיר, ולכן הפסקה באמצע לא עולה כלום. אין הבהובים ואפשר לשחק בשקט מוחלט.",

      together: [
        {
          title: "אחד סופר, אחד נוגע",
          body: "מי שסופר אומר דבורה או פרפר בקול לפני שהיד זזה. פתאום שומעים אם יש בכלל הבחנה.",
        },
        { title: "סיבוב בלי לגעת", body: "ארבעים שניות שבהן רק מסתכלים וסופרים דבורות. תרגיל ריכוז בלי אצבעות." },
        { title: "מי מוצא פרפר", body: "הפכו את המשחק ומצאו את הפרפרים בקול. אותה הבחנה, מהצד השני." },
        {
          title: "לנחש מראש",
          body: "לפני שהיצור הבא נכנס למסך, נחשו מה הוא יהיה. אף אחד לא צודק יותר מדי.",
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
          q: "מה קורה אם נוגעים בפרפר?",
          a: "כלום. הוא ממשיך לעוף, אין ניקוד שיורד ואין צליל של טעות. המונה היחיד במשחק סופר דבורים שנתפסו.",
        },
        {
          q: "למה ברמה הקשה יש פחות דבורים?",
          a: "כי המיומנות פה היא להבחין, לא למהר. כשכמעט הכול דבורה הילד נכנס לקצב של נגיעה בכל דבר ומפסיק להסתכל, וזה בדיוק ההרגל שהמשחק מנסה לשבור.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "כמה זמן לוקח סיבוב?",
          a: "ארבעים שניות. השעון עוצר אם מניחים את המכשיר, אז הפסקה באמצע לא גוזלת מהסיבוב.",
        },
        {
          q: "כמה דבורים אפשר לתפוס בסיבוב?",
          a: "תלוי ברמה. בקלה עוברים 28 יצורים ובערך 17 מהם דבורים, ובקשה עוברים 57 ובערך 29 מהם דבורים.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, ברמה הקלה. אין קריאה בשום מקום במשחק וצריך רק להבחין בין שני יצורים.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["דבורים", "פרפרים", "ריכוז", "לגיל הרך", "שליטה עצמית", "משחק נגיעה"],
    },

    en: {
      metaTitle: "Bees Only - Free Focus Game for Kids | Ellaz",
      metaDescription:
        "A free game for children: bees and butterflies cross the sky and you tap only the bees. Nothing to lose, no signup.",

      lede: "A free game where bees and butterflies cross the sky for forty seconds and your child taps only the bees. Tapping a butterfly costs nothing. Missing a bee costs nothing either.",

      body: [
        "A sky with two kinds of creature in it. Tap the bees. Let the butterflies go.",

        "The levels here run backwards from what you would expect. Harder means fewer bees, not faster ones. This game does not measure speed, it measures the ability to stop and check, and when nearly everything in the sky is a bee a child settles into a tap-everything rhythm within seconds and stops looking. That is the exact habit the game exists to interrupt. So the mix falls from 65% bees on easy to 50% on hard, and the butterfly stops being a rare nuisance and becomes half the sky.",

        "The number the code asks for is not the number a child sees, which surprised us too. A rule forbids more than three identical creatures in a row, and every time it fires it pulls the mix back toward even. Over 1,500 rounds per level, a requested 65% comes out at 59%, and 60% comes out at 56%. On hard the two numbers meet exactly at 50%, because a mix that is already even has nowhere to be pulled.",

        "A round is forty seconds. That is enough. On easy 28 creatures cross the sky and roughly 17 are bees. On hard 57 cross and roughly 29 are bees, so the harder level actually offers more bees to catch. You just have to pick them out.",

        "There is nothing to lose here. No score that drops, no lives, no error sound, and the only counter in the game is how many bees were caught. The round always ends in a completion. Even if your child touched none of them.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. The difference is how many butterflies fly." },
        { title: "Wait for a bee", body: "Creatures cross the screen in both directions along fixed lanes." },
        { title: "Tap bees only", body: "One tap each. The pretty one is never the target." },
        { title: "Finish the round", body: "After forty seconds you see the count, and another round is one tap away." },
      ],

      tips: [
        {
          title: "Watch the wings",
          body: "Wing shape separates them faster than colour does, and stays clearer while the creature is moving.",
        },
        {
          title: "Do not tap on reflex",
          body: "Most missed bees come from tapping a butterfly too fast. A fraction of a second of checking earns back more than it costs.",
        },
        {
          title: "Catch them mid-screen",
          body: "A creature in the middle stays reachable longest. Waiting for the edge throws away a second.",
        },
        {
          title: "Try hard anyway",
          body: "Fewer bees sounds frustrating and is actually calmer, because there is thinking time between them.",
        },
      ],

      teaches: [
        {
          title: "Stopping before acting",
          body: "The whole game is an exercise in holding your hand back, and that trains like anything else.",
        },
        { title: "Telling two similar things apart", body: "Bees and butterflies fly the same way. The difference is in the detail." },
        { title: "Sustained attention", body: "Forty seconds of continuous focus is a lot at four, and it stretches." },
        {
          title: "Letting one go",
          body: "A bee that flies past untouched does nothing at all. Children learn here that not every opportunity has to be taken.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Easy. Plenty of bees, so almost every tap works, and that is enough." },
        { title: "5 to 6", body: "Medium. This is where checking before tapping actually starts." },
        { title: "7 and up", body: "Hard, where half the sky is off limits." },
        {
          title: "Parents",
          body: "Nothing can be lost, so this one suits the moments when you cannot sit alongside.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. Creatures are large and fly along fixed lanes rather than jumping unpredictably, so an eye still learning to track can follow them. Bees and butterflies differ in wing shape rather than only colour, so colour blindness does not interfere. The clock pauses when the device is put down, which means a break mid-round costs nothing. Nothing flashes and the game plays fully in silence.",

      together: [
        {
          title: "One calls, one taps",
          body: "The caller says bee or butterfly out loud before the hand moves. You hear straight away whether there is a distinction.",
        },
        { title: "A round with no touching", body: "Forty seconds of just watching and counting bees. Focus practice without fingers." },
        { title: "Find the butterfly", body: "Invert the game and call the butterflies instead. Same distinction, other side." },
        {
          title: "Call it early",
          body: "Guess what the next creature will be before it enters the screen. Nobody is right very often.",
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
          q: "What happens if my child taps a butterfly?",
          a: "Nothing. It keeps flying, no score drops, and there is no error sound. The only counter in the game counts bees caught.",
        },
        {
          q: "Why does the hard level have fewer bees?",
          a: "Because the skill here is discrimination rather than speed. When almost everything is a bee a child settles into tapping everything and stops looking, which is the habit this game tries to interrupt.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "How long is a round?",
          a: "Forty seconds. The clock stops when the device is put down, so an interruption does not eat into the round.",
        },
        {
          q: "How many bees can be caught in one round?",
          a: "Depends on the level. Easy sends 28 creatures past with roughly 17 bees among them, and hard sends 57 with roughly 29 bees.",
        },
        {
          q: "What age is this for?",
          a: "From about three on easy. There is no reading anywhere in the game and the only requirement is telling two creatures apart.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["bees", "butterflies", "focus", "self control", "preschool", "attention game"],
    },
    es: {
      metaTitle: "Solo abejas - juego de atención gratis | Ellaz",
      metaDescription:
        "Juego gratis para niños: abejas y mariposas cruzan el cielo y hay que tocar solo las abejas. Nada que perder, sin registro.",

      lede: "Un juego gratuito en el que abejas y mariposas cruzan el cielo durante cuarenta segundos y tu hijo toca solo las abejas. Tocar una mariposa no cuesta nada. Dejar escapar una abeja tampoco.",

      body: [
        "Un cielo con dos clases de bicho. Toca las abejas. Deja pasar las mariposas.",

        "Aquí los niveles van al revés de lo que esperarías. Más difícil significa menos abejas, no abejas más rápidas. Este juego no mide velocidad, mide la capacidad de pararse a comprobar, y cuando casi todo el cielo es una abeja un niño entra en un ritmo de tocarlo todo en cuestión de segundos y deja de mirar. Esa es exactamente la costumbre que el juego existe para interrumpir. Así que la mezcla baja del 65% de abejas en fácil al 50% en difícil, y la mariposa deja de ser una molestia rara para ser media pantalla.",

        "El número que pide el código no es el número que ve un niño, y a nosotros también nos sorprendió. Una regla prohíbe más de tres bichos iguales seguidos, y cada vez que se activa tira de la mezcla hacia el empate. Sobre 1.500 rondas por nivel, un 65% pedido sale como 59%, y un 60% sale como 56%. En difícil los dos números coinciden exactamente en el 50%, porque una mezcla ya equilibrada no tiene hacia dónde ser arrastrada.",

        "Una ronda dura cuarenta segundos. Con eso basta. En fácil cruzan el cielo 28 bichos y unos 17 son abejas. En difícil cruzan 57 y unas 29 son abejas, así que el nivel difícil ofrece de hecho más abejas que cazar. Solo hay que saber separarlas.",

        "Aquí no hay nada que perder. Ninguna puntuación que baje, ninguna vida, ningún sonido de error, y el único contador del juego cuenta abejas cazadas. La ronda siempre acaba terminada. Aunque tu hijo no haya tocado ni una.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, medio o difícil. La diferencia es cuántas mariposas vuelan." },
        { title: "Espera una abeja", body: "Los bichos cruzan la pantalla en las dos direcciones por carriles fijos." },
        { title: "Toca solo abejas", body: "Un toque por cada una. La bonita nunca es el objetivo." },
        { title: "Termina la ronda", body: "Tras cuarenta segundos ves la cuenta, y otra ronda está a un toque." },
      ],

      tips: [
        {
          title: "Mira las alas",
          body: "La forma del ala las separa más rápido que el color, y se sigue viendo clara mientras el bicho se mueve.",
        },
        {
          title: "No toques por reflejo",
          body: "Casi todas las abejas que se escapan vienen de haber tocado una mariposa demasiado deprisa. Una fracción de segundo comprobando devuelve más de lo que cuesta.",
        },
        {
          title: "Cázalas a media pantalla",
          body: "Un bicho en el centro se queda accesible más tiempo. Esperar al borde tira un segundo a la basura.",
        },
        {
          title: "Prueba el difícil igualmente",
          body: "Menos abejas suena frustrante y en realidad es más tranquilo, porque hay tiempo de pensar entre una y otra.",
        },
      ],

      teaches: [
        {
          title: "Pararse antes de actuar",
          body: "El juego entero es un ejercicio de aguantarse la mano, y eso se entrena como cualquier otra cosa.",
        },
        { title: "Distinguir dos cosas parecidas", body: "Abejas y mariposas vuelan igual. La diferencia está en el detalle." },
        { title: "Atención sostenida", body: "Cuarenta segundos de concentración seguida son muchos a los cuatro años, y se estiran." },
        {
          title: "Dejar pasar una",
          body: "Una abeja que pasa sin que la toques no hace absolutamente nada. Aquí los niños aprenden que no hay que coger todas las oportunidades.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Fácil. Hay abejas de sobra, así que casi cada toque acierta, y con eso vale." },
        { title: "5 a 6", body: "Medio. Aquí es donde empieza de verdad lo de comprobar antes de tocar." },
        { title: "7 en adelante", body: "Difícil, con medio cielo prohibido." },
        {
          title: "Padres",
          body: "Aquí no se puede perder nada, así que este va bien para los ratos en los que no podéis sentaros al lado.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. Los bichos son grandes y vuelan por carriles fijos en lugar de dar saltos imprevisibles, así que un ojo que todavía está aprendiendo a seguir cosas puede seguirlos. Las abejas y las mariposas se distinguen por la forma del ala y no solo por el color, de modo que el daltonismo no molesta. El reloj se para cuando se deja el aparato, lo que significa que una interrupción a mitad de ronda no cuesta nada. Nada parpadea y el juego se juega entero en silencio.",

      together: [
        {
          title: "Uno canta, otro toca",
          body: "Quien canta dice abeja o mariposa en voz alta antes de que se mueva la mano. Se oye enseguida si hay distinción.",
        },
        { title: "Una ronda sin tocar", body: "Cuarenta segundos solo mirando y contando abejas. Práctica de atención sin dedos." },
        { title: "Busca la mariposa", body: "Dad la vuelta al juego y cantad las mariposas. Misma distinción, otro lado." },
        {
          title: "Adivina antes",
          body: "Decid qué bicho va a entrar en pantalla antes de que aparezca. Nadie acierta demasiado.",
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
          q: "¿Qué pasa si mi hijo toca una mariposa?",
          a: "Nada. Sigue volando, no baja ninguna puntuación y no hay sonido de error. El único contador del juego cuenta abejas cazadas.",
        },
        {
          q: "¿Por qué el nivel difícil tiene menos abejas?",
          a: "Porque aquí la habilidad es distinguir y no correr. Cuando casi todo es una abeja, un niño se acomoda en tocarlo todo y deja de mirar, que es la costumbre que este juego intenta interrumpir.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Cuánto dura una ronda?",
          a: "Cuarenta segundos. El reloj se para cuando se deja el aparato, así que una interrupción no se come la ronda.",
        },
        {
          q: "¿Cuántas abejas se pueden cazar en una ronda?",
          a: "Depende del nivel. En fácil pasan 28 bichos con unas 17 abejas entre ellos, y en difícil pasan 57 con unas 29 abejas.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos tres años en fácil. En el juego no se lee nada y lo único que hace falta es distinguir dos bichos.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["abejas", "mariposas", "atención", "autocontrol", "infantil", "concentración"],
    },
  },

  provenance: [
    {
      claim: "a requested 65% bee share is realised as 59%, and 60% as 56%, over 1,500 rounds per level",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "28 creatures with about 17 bees on easy, 57 with about 29 bees on hard, in a 40 second round",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "the declared bee ratios are 0.65, 0.60 and 0.50, and no more than three identical creatures appear in a row",
      source: "src/games/bees/logic.ts",
    },
    {
      claim: "the record is bees caught, higher is better, on one board across levels",
      source: "src/sdk/score.ts",
    },
  ],
};
