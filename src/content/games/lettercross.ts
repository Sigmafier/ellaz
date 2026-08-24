import type { GameContent } from "../types";
import { lettercrossFr } from "./fr/lettercross";

export const lettercross: GameContent = {
  id: "lettercross",
  provenance: [
    {
      claim: "28,515 words",
      source: "scripts/build-lettercross-words.mjs",
    },
    {
      claim: "94 tiles",
      source: "src/games/lettercross/logic.ts",
    },
    {
      claim: "nine squares by nine",
      source: "src/games/lettercross/logic.ts",
    },
    {
      claim: "A Q is worth 12 points",
      source: "src/games/lettercross/logic.ts",
    },
  ],
  copy: {
    en: {
      name: "Lettercross",
      metaTitle: "Lettercross - Free Online Word Tile Game, No Download",
      metaDescription:
        "Lay letter tiles on a 9 by 9 board and build crossing words. Four wild tiles, three levels, 94 tiles in the bag. Free, no account, works offline.",
      lede:
        "Lettercross is a crossword tile game you can open and start playing. You get eight letters. You put a word wherever you want it. So does the next one, and the one after that, and the only thing the board asks is that everything a new word touches still reads as a word.",
      body: [
        "The board is nine squares by nine. That is smaller than the board you are probably picturing, and it changes the game more than it sounds like it would. The edges arrive quickly. Every square is the same square, so where a word goes is your decision and never the board's, and a game finishes in the time you actually have rather than the time a board game assumes you have on a Sunday afternoon.",
        "There are 94 tiles. Ninety of them are letters and four of them are wilds, which is twice the usual two. A wild can be any letter you like. It scores nothing at all, and it is still usually the best tile in your hand, because the letter you are missing is the one stopping the word you can already see.",
        "Words go across or down. Two letters is enough.",
        "When you place tiles next to letters that are already on the board, every new run of two or more has to be a real word too. That is the part that catches people out, and it is also the part that makes the game worth playing rather than merely finishing.",
        "Scoring is letters, and nothing but letters. A Q is worth 12 points and an E is worth one. No square doubles anything, no square multiplies a word, and there is no lucky corner. A weak word stays weak wherever you put it.",
        "The dictionary holds 28,515 words. It is built from a public-domain word list and then filtered, and the filtering is deliberate: obscure two-letter words that only exist in tournament play are not in it. If a word feels like it should count, it probably does.",
      ],
      howToPlay: [
        {
          title: "Tap a letter, then tap a square",
          body: "Pick a tile from your rack. Tap where you want it. Tap it again to take it back. Nothing is dragged, so it works the same on a phone, a tablet and a laptop.",
        },
        {
          title: "Put it anywhere",
          body: "There is no starting square and nothing you build has to touch what is already down. A word lies in one line, has no holes in it, and is a word. That is the whole of it.",
        },
        {
          title: "Press play when you are happy",
          body: "The board checks every word your tiles made, including the ones going the other way. If something is not a word, the tiles stay where they are and it tells you why.",
        },
      ],
      tips: [
        {
          title: "Save the wild",
          body: "It is tempting to spend a wild the moment it arrives. Hold it. The turn where you have every letter but one comes around often, and that is the turn a wild is worth the most.",
        },
        {
          title: "Two-letter words are the whole trick",
          body: "Sliding a word alongside an existing one scores every pair it makes, all at once. A five-letter word laid parallel to another can score six words in one turn.",
        },
        {
          title: "Where you open is a real decision",
          body: "Nothing pushes the first word into the middle. Near an edge keeps the board open and the crossings few. In the middle you get four directions to grow in and less room in each of them.",
        },
      ],
      teaches: [
        {
          title: "Spelling you actually use",
          body: "Not spelling drills. You are hunting for a word that fits a shape, which is a different mental move from being asked to spell something, and it sticks better.",
        },
        {
          title: "Arithmetic without a worksheet",
          body: "Adding up a word with a doubled letter and a tripled word is real mental arithmetic that nobody experiences as maths homework.",
        },
        {
          title: "Planning a turn ahead",
          body: "The best square on the board is often one you should not open up. Noticing that is strategy, and children pick it up faster than adults expect.",
        },
      ],
      ages: [
        {
          title: "Eight and up on their own",
          body: "A confident reader can play this alone. The easy level hands out nine tiles instead of eight, which means more choices and fewer stuck turns.",
        },
        {
          title: "Younger, alongside somebody",
          body: "A five-year-old will not play this by themselves, and we are not going to pretend otherwise. Sitting beside an adult and finding three-letter words together is a genuinely good time for both of them.",
        },
        {
          title: "Adults, without apology",
          body: "This is not a children's game with an adult mode bolted on. The hard level deals seven tiles instead of eight, which is genuinely harder, and the 9 by 9 board rewards somebody who can see two turns ahead.",
        },
      ],
      accessibility:
        "Every tile is a button, reachable by keyboard and readable by a screen reader. Nothing requires a drag or a hold. The board is pinned left to right even when the rest of the site is in Hebrew, so the words never come out backwards.",
      together: [
        {
          title: "Pass the phone",
          body: "Take alternate turns on one device and add your scores separately on paper. The game does not enforce it, which means you can bend the rules for a younger player without arguing with the software.",
        },
        {
          title: "Ask before you refuse",
          body: "When the board rejects a word, look it up together rather than moving on. That is the moment somebody learns a word, and it is the only moment the game creates on purpose.",
        },
        {
          title: "Play the shape, not the score",
          body: "Try a round where the only aim is the longest single word anybody manages. It gives a weaker player something to win at while a stronger one is still chasing points.",
        },
      ],
      faq: [
        {
          q: "Is Lettercross free?",
          a: "Yes. No account, no advertising, nothing to buy. It saves your best score on your own device and sends nothing anywhere.",
        },
        {
          q: "Can I play without the internet?",
          a: "Yes. Once the page has loaded once, it keeps working offline.",
        },
        {
          q: "How many words does it know?",
          a: "28,515, from two letters up to six. They come from a public-domain word list, filtered so the game does not accept words nobody has heard of and does not accept words no child should be shown.",
        },
        {
          q: "Why is the board nine squares and not fifteen?",
          a: "Because a shorter game is a game people finish. Nine also keeps every square big enough to tap accurately with a thumb, which fifteen squares across a phone is not.",
        },
        {
          q: "What is a wild worth?",
          a: "Nothing. It scores zero points wherever you put it. It is worth playing anyway, because it lets you finish a word that would otherwise be impossible.",
        },
        {
          q: "Does it keep my score?",
          a: "Each of the three levels keeps its own best score, because a hand of seven tiles and a hand of nine are not the same game. It is stored on your device and never leaves it.",
        },
      ],
      keywords: [
        "word game",
        "crossword game",
        "letter tiles",
        "free word game",
        "word game online",
        "spelling game",
        "tile game",
        "word puzzle",
      ],
    },

    he: {
      name: "אותיות מצטלבות",
      metaTitle: "אותיות מצטלבות - משחק מילים חינם באינטרנט, בלי הורדה",
      metaDescription:
        "מניחים אריחי אותיות על לוח 9 על 9 ובונים מילים מצטלבות. ארבעה ג'וקרים, שלוש רמות, 94 אריחים בשקית. חינם, בלי חשבון, עובד גם בלי אינטרנט.",
      lede:
        "אותיות מצטלבות הוא משחק מילים על לוח משבצות. מקבלים שמונה אותיות. מניחים מילה איפה שרוצים. גם הבאה אחריה הולכת לאן שתרצו, והדבר היחיד שהלוח מבקש הוא שכל מה שהמילה החדשה נוגעת בו ימשיך להיקרא כמילה.",
      body: [
        "הלוח הוא תשע משבצות על תשע. זה קטן יותר מהלוח שאתם כנראה מדמיינים עכשיו, וזה משנה את המשחק הרבה יותר ממה שזה נשמע. הקצוות מגיעים מהר, כל משבצת היא אותה משבצת בדיוק, כך שאיפה לשחק זו ההחלטה שלכם ולא של הלוח, ומשחק נגמר בזמן שבאמת יש לכם ולא בזמן שמשחק קופסה מניח שיש לכם.",
        "בשקית יש 94 אריחים. תשעים מהם אותיות וארבעה מהם ג'וקרים, פי שניים מהרגיל. ג'וקר יכול להיות כל אות שתרצו. הוא לא שווה שום נקודה, ובכל זאת הוא בדרך כלל האריח הכי טוב ביד, כי האות שחסרה לכם היא בדיוק זו שעוצרת את המילה שאתם כבר רואים מול העיניים.",
        "מילים נבנות לרוחב או לאורך. שתי אותיות זה מספיק.",
        "כשמניחים אריחים ליד אותיות שכבר על הלוח, גם כל רצף חדש של שתי אותיות ומעלה חייב להיות מילה אמיתית. זה החלק שמפיל אנשים, וזה גם החלק שהופך את המשחק למשחק טוב במקום לתרגיל.",
        "הניקוד הוא אותיות, ורק אותיות. אות נדירה שווה 12 נקודות ואות שכיחה שווה נקודה אחת. שום משבצת לא מכפילה כלום ואין פינה מזל. מילה חלשה נשארת חלשה בכל מקום שתניחו אותה.",
        "המילון מכיל 28,515 מילים באנגלית. הוא בנוי מרשימת מילים שהיא נחלת הכלל, ואחר כך מסונן. הסינון מכוון: מילים תמוהות של שתי אותיות שקיימות רק בתחרויות לא נמצאות שם.",
      ],
      howToPlay: [
        {
          title: "נוגעים באות ואז במשבצת",
          body: "בוחרים אריח מהמדף. נוגעים במקום שרוצים. נוגעים שוב כדי להחזיר אותו. שום דבר לא נגרר, אז זה עובד אותו דבר בטלפון, בטאבלט ובמחשב.",
        },
        {
          title: "מניחים איפה שרוצים",
          body: "אין משבצת פתיחה ואין חובה לגעת במה שכבר מונח. מילה שוכבת בקו אחד, אין בה חורים, והיא מילה אמיתית. זה הכל.",
        },
        {
          title: "לוחצים לשחק כשמרוצים",
          body: "הלוח בודק כל מילה שהאריחים שלכם יצרו, כולל אלה שנוצרו בכיוון השני. אם משהו אינו מילה, האריחים נשארים במקומם והמשחק אומר מה הבעיה.",
        },
      ],
      tips: [
        {
          title: "לשמור את הג'וקר",
          body: "מתחשק להוציא ג'וקר ברגע שהוא מגיע. תחזיקו אותו. התור שבו יש לכם כל אות חוץ מאחת חוזר לעתים קרובות, ובתור הזה הג'וקר שווה הכי הרבה.",
        },
        {
          title: "מילים של שתי אותיות הן כל הסוד",
          body: "מילה שמונחת לאורך מילה קיימת מנקדת כל צמד שהיא יוצרת, בבת אחת. מילה בת חמש אותיות שמונחת במקביל לאחרת יכולה לנקד שש מילים בתור אחד.",
        },
        {
          title: "איפה פותחים זו החלטה אמיתית",
          body: "שום דבר לא דוחף את המילה הראשונה למרכז. ליד הקצה הלוח נשאר פתוח וההצטלבויות מעטות. במרכז יש ארבעה כיוונים לגדול אליהם ופחות מקום בכל אחד מהם.",
        },
      ],
      teaches: [
        {
          title: "איות שבאמת משתמשים בו",
          body: "לא תרגילי איות. מחפשים מילה שמתאימה לצורה מסוימת, וזו פעולה מחשבתית אחרת לגמרי מלהתבקש לאיית משהו. היא גם נשארת בראש טוב יותר.",
        },
        {
          title: "חשבון בלי דף עבודה",
          body: "לסכם ערכים של שמונה אותיות ולהשוות שתי מילים אפשריות זה חשבון בראש לכל דבר, ואף אחד לא חווה את זה כשיעורי בית.",
        },
        {
          title: "לתכנן תור אחד קדימה",
          body: "המשבצת הכי טובה על הלוח היא לעתים קרובות משבצת שכדאי לא לפתוח ליריב. לשים לב לזה זו אסטרטגיה, וילדים קולטים את זה מהר יותר משמבוגרים מצפים.",
        },
      ],
      ages: [
        {
          title: "מגיל שמונה לבד",
          body: "קורא בטוח יכול לשחק בזה לבד. הרמה הקלה נותנת תשעה אריחים במקום שמונה, כלומר יותר אפשרויות ופחות תורות תקועים.",
        },
        {
          title: "צעירים יותר, לצד מישהו",
          body: "בן חמש לא ישחק בזה לבד, ולא נעמיד פנים אחרת. לשבת ליד מבוגר ולמצוא יחד מילים של שלוש אותיות זה זמן טוב באמת לשניהם.",
        },
        {
          title: "מבוגרים, בלי התנצלות",
          body: "זה לא משחק ילדים עם מצב למבוגרים שהודבק עליו. הרמה הקשה מחלקת שבעה אריחים במקום שמונה, וזה קשה יותר באמת, והלוח בגודל 9 על 9 מתגמל מי שרואה שני תורות קדימה.",
        },
      ],
      accessibility:
        "כל אריח הוא כפתור, נגיש במקלדת ונקרא על ידי קורא מסך. שום דבר לא דורש גרירה או לחיצה ממושכת. הלוח מקובע משמאל לימין גם כשכל האתר בעברית, כך שהמילים אף פעם לא יוצאות הפוכות.",
      together: [
        {
          title: "מעבירים את הטלפון",
          body: "משחקים תורות לסירוגין במכשיר אחד ורושמים ניקוד בנפרד על דף. המשחק לא אוכף את זה, ולכן אפשר לכופף את הכללים לטובת שחקן צעיר בלי להתווכח עם התוכנה.",
        },
        {
          title: "לבדוק לפני שמוותרים",
          body: "כשהלוח דוחה מילה, חפשו אותה יחד במקום להמשיך הלאה. זה הרגע שבו מישהו לומד מילה חדשה, וזה הרגע היחיד שהמשחק יוצר בכוונה.",
        },
        {
          title: "לשחק על המשבצות, לא על הניקוד",
          body: "נסו סיבוב שכל מטרתו היא לנחות על כל משבצת צבעונית לפחות פעם אחת. זה נותן לשחקן החלש יותר משהו לנצח בו בזמן שהחזק עדיין רודף אחרי נקודות.",
        },
      ],
      faq: [
        {
          q: "האם אותיות מצטלבות חינם?",
          a: "כן. בלי חשבון, בלי פרסומות, בלי שום דבר לקנות. השיא נשמר על המכשיר שלכם ולא נשלח לשום מקום.",
        },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי טעינה אחת של הדף הוא ממשיך לעבוד גם בלי חיבור.",
        },
        {
          q: "כמה מילים המשחק מכיר?",
          a: "‏28,515 מילים באנגלית, משתי אותיות ועד שש. הן מגיעות מרשימה שהיא נחלת הכלל ומסוננות, כך שהמשחק לא מקבל מילים שאיש לא שמע עליהן ולא מקבל מילים שאסור להראות לילד.",
        },
        {
          q: "למה הלוח הוא תשע משבצות ולא חמש עשרה?",
          a: "כי משחק קצר יותר הוא משחק שאנשים מסיימים. תשע גם משאירה כל משבצת גדולה מספיק כדי לנגוע בה באגודל בלי לפספס, מה שחמש עשרה משבצות ברוחב טלפון לא עושות.",
        },
        {
          q: "כמה שווה ג'וקר?",
          a: "כלום. הוא מנקד אפס נקודות בכל מקום שתניחו אותו. בכל זאת שווה לשחק אותו, כי הוא מאפשר לסגור מילה שאחרת הייתה בלתי אפשרית.",
        },
        {
          q: "המשחק שומר את הניקוד שלי?",
          a: "לכל אחת משלוש הרמות יש שיא משלה, כי יד של שבעה אריחים ויד של תשעה הן לא אותו משחק. הוא נשמר במכשיר שלכם ולא יוצא ממנו לשום מקום.",
        },
      ],
      keywords: [
        "משחק מילים",
        "משחק מילים חינם",
        "אריחי אותיות",
        "משחק מילים באינטרנט",
        "משחק איות",
        "תשבץ",
        "משחק אותיות",
        "פאזל מילים",
      ],
    },

    es: {
      name: "Letras cruzadas",
      metaTitle: "Letras cruzadas - Juego de palabras gratis, sin descargas",
      metaDescription:
        "Coloca fichas de letras en un tablero de 9 por 9 y forma palabras cruzadas. Cuatro comodines, 94 fichas. Gratis, sin cuenta, sin conexión.",
      lede:
        "Letras cruzadas es un juego de fichas que se abre y ya está. Recibes ocho letras. Pones una palabra donde te apetezca. La siguiente también va donde quieras, y lo único que pide el tablero es que todo lo que la palabra nueva roce se siga leyendo como una palabra.",
      body: [
        "El tablero mide nueve casillas por nueve. Es más pequeño que el que probablemente estás imaginando, y eso cambia la partida bastante más de lo que suena: los bordes llegan enseguida, todas las casillas son la misma casilla, así que dónde juegas lo decides tú y nunca el tablero, y una partida termina en el rato que realmente tienes, no en el que un juego de mesa da por supuesto.",
        "Hay 94 fichas. Noventa son letras y cuatro son comodines, el doble de lo habitual. Un comodín puede ser la letra que quieras. No suma ni un punto, y aun así suele ser la mejor ficha de la mano, porque la letra que te falta es justo la que está frenando la palabra que ya ves.",
        "Las palabras van en horizontal o en vertical. Con dos letras basta. Eso es todo.",
        "Cuando colocas fichas junto a letras que ya estaban, cada nueva secuencia de dos o más también tiene que ser una palabra de verdad. Esa es la parte que pilla a la gente por sorpresa y también la que hace que el juego valga la pena.",
        "La puntuación son letras, y nada más que letras. Una letra rara vale 12 puntos y una frecuente vale uno. Ninguna casilla duplica nada, ninguna multiplica una palabra y no hay esquina afortunada. Una palabra floja sigue floja la pongas donde la pongas.",
        "El diccionario tiene 28,515 palabras en inglés. Está hecho a partir de una lista de dominio público y luego filtrado, y el filtro es intencionado: las palabras raras de dos letras que solo existen en torneos no están.",
      ],
      howToPlay: [
        {
          title: "Toca una letra y luego una casilla",
          body: "Elige una ficha del atril. Toca donde la quieres. Tócala otra vez para recuperarla. No se arrastra nada, así que funciona igual en móvil, en tableta y en portátil.",
        },
        {
          title: "Ponla donde quieras",
          body: "No hay casilla de salida ni nada obliga a tocar lo que ya está puesto. Una palabra va en una sola línea, no tiene huecos y es una palabra de verdad. Eso es todo.",
        },
        {
          title: "Pulsa jugar cuando lo veas claro",
          body: "El tablero comprueba todas las palabras que han formado tus fichas, incluidas las del otro sentido. Si algo no es una palabra, las fichas se quedan donde están y te dice por qué.",
        },
      ],
      tips: [
        {
          title: "Guarda el comodín",
          body: "Apetece gastar un comodín en cuanto aparece. Aguántalo. El turno en el que tienes todas las letras menos una llega a menudo, y en ese turno el comodín vale mucho más.",
        },
        {
          title: "Las palabras de dos letras son el truco entero",
          body: "Poner una palabra pegada a otra puntúa cada pareja que crea, todas de golpe. Una palabra de cinco letras colocada en paralelo a otra puede puntuar seis palabras en un solo turno.",
        },
        {
          title: "Dónde abres es una decisión de verdad",
          body: "Nada empuja la primera palabra hacia el centro. Cerca de un borde el tablero se queda abierto y los cruces son pocos. En el centro tienes cuatro direcciones para crecer y menos sitio en cada una.",
        },
      ],
      teaches: [
        {
          title: "Ortografía que se usa de verdad",
          body: "No son ejercicios de ortografía. Estás buscando una palabra que encaje en una forma concreta, que es una operación mental distinta de que te pidan deletrear algo, y además se queda mejor.",
        },
        {
          title: "Cálculo sin ficha de deberes",
          body: "Sumar una palabra con una letra doblada y una palabra triplicada es cálculo mental de verdad, y nadie lo vive como tarea de matemáticas.",
        },
        {
          title: "Pensar un turno por delante",
          body: "La mejor casilla del tablero suele ser una que conviene no abrir. Darse cuenta de eso es estrategia, y los niños lo pillan antes de lo que los adultos esperan.",
        },
      ],
      ages: [
        {
          title: "A partir de ocho, en solitario",
          body: "Quien lee con soltura puede jugar solo. El nivel fácil reparte nueve fichas en vez de ocho, o sea más opciones y menos turnos atascados.",
        },
        {
          title: "Más pequeños, con alguien al lado",
          body: "Un niño de cinco años no va a jugar a esto solo, y no vamos a fingir lo contrario. Sentarse al lado de un adulto y buscar juntos palabras de tres letras es un buen rato para los dos.",
        },
        {
          title: "Adultos, sin pedir perdón",
          body: "Esto no es un juego infantil con un modo adulto pegado encima. El nivel difícil reparte siete fichas en vez de ocho, lo que cuesta de verdad, y el tablero de 9 por 9 premia a quien ve dos turnos por delante.",
        },
      ],
      accessibility:
        "Cada ficha es un botón, accesible con teclado y legible por un lector de pantalla. Nada exige arrastrar ni mantener pulsado. El tablero está fijado de izquierda a derecha aunque el resto del sitio esté en hebreo, así que las palabras nunca salen del revés.",
      together: [
        {
          title: "Pasaos el móvil",
          body: "Jugad turnos alternos en un mismo aparato y apuntad las puntuaciones por separado en papel. El juego no lo impone, así que podéis doblar las reglas a favor de alguien pequeño sin discutir con el programa.",
        },
        {
          title: "Comprobad antes de rendiros",
          body: "Cuando el tablero rechace una palabra, buscadla juntos en vez de pasar página. Ese es el momento en que alguien aprende una palabra, y es el único momento que el juego crea a propósito.",
        },
        {
          title: "Jugad a la forma, no al marcador",
          body: "Probad una ronda cuyo único objetivo sea la palabra más larga que consiga alguien. Le da algo que ganar a quien juega peor mientras el otro sigue persiguiendo puntos.",
        },
      ],
      faq: [
        {
          q: "¿Es gratis Letras cruzadas?",
          a: "Sí. Sin cuenta, sin publicidad, sin nada que comprar. Guarda tu mejor puntuación en tu propio aparato y no la envía a ninguna parte.",
        },
        {
          q: "¿Se puede jugar sin conexión?",
          a: "Sí. Una vez que la página ha cargado una vez, sigue funcionando sin internet.",
        },
        {
          q: "¿Cuántas palabras conoce?",
          a: "‏28,515 palabras en inglés, de dos a seis letras. Vienen de una lista de dominio público y están filtradas, de modo que el juego no acepta palabras que nadie conoce ni acepta palabras que ningún niño debería ver.",
        },
        {
          q: "¿Por qué el tablero tiene nueve casillas y no quince?",
          a: "Porque una partida más corta es una partida que la gente termina. Nueve además deja cada casilla lo bastante grande para acertarle con el pulgar, cosa que quince a lo ancho de un móvil no hace.",
        },
        {
          q: "¿Cuánto vale un comodín?",
          a: "Nada. Suma cero puntos lo pongas donde lo pongas. Aun así merece la pena jugarlo, porque permite cerrar una palabra que si no sería imposible.",
        },
        {
          q: "¿Guarda mi puntuación?",
          a: "Cada uno de los tres niveles guarda su propio récord, porque una mano de siete fichas y una de nueve no son el mismo juego. Se guarda en tu aparato y no sale de ahí.",
        },
      ],
      keywords: [
        "juego de palabras",
        "palabras cruzadas",
        "fichas de letras",
        "juego de palabras gratis",
        "juego de palabras online",
        "juego de ortografía",
        "crucigrama",
        "puzle de palabras",
      ],
    },

    fr: lettercrossFr,
  },
};
