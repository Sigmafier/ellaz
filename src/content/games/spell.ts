import type { GameContent } from "../types";
import { spellFr } from "./fr/spell";

/**
 * The statistics here answer the two questions a parent has about a spelling
 * game: does it cover real vocabulary, and is "easy" actually easy.
 *
 * Both are derived by `scripts/sim/spell-pools.mjs` from the game's own word
 * list and level table. The pool counts differ per language because the pool is
 * filtered by the length of the word IN THE LANGUAGE BEING SPELLED - the same
 * 67 pictures give English 38 easy words and Spanish 23, because `cat` is three
 * letters and `gato` is four while `pelota` is six.
 *
 * The random-tapper figure is the one worth keeping. It plays each level with a
 * player who taps without looking, and it is what lets the pages say how
 * forgiving easy really is rather than asserting that it is gentle.
 */
export const spell: GameContent = {
  id: "spell",

  copy: {
    en: {
      name: "Spell It",
      metaTitle: "Spell It - free spelling game for kids | Ellaz",
      metaDescription:
        "A picture, and its whole name to build from letter tiles. 67 pictures, three levels, and a hint that fills the next letter. Free, no account.",

      lede:
        "A picture appears and the child builds its whole name out of letter tiles. A wrong tile is never placed, so the word on screen is correct at every moment. 67 pictures, three levels, and a hint button that fills the next letter whenever it is wanted.",

      body: [
        "A picture, and one empty box for every letter of its name. Tap the tiles in order. That is the game.",

        "The tray refuses a wrong letter. Tap one and it wobbles, dims, and stays exactly where it was, so the row of boxes above is always right as far as it goes. That single decision is why this works at four rather than at six. A child who fills in five letters and is then told the whole word is wrong has learned nothing they can act on, because nobody can point at which letter did it. Here the mistake is answered the instant it happens, at the one letter it concerns, and the picture never goes away.",

        "Easy draws from 38 of the 67 pictures, the ones whose English name runs to four letters or fewer, and the tray holds nothing but the word's own letters. Nothing to reject, only an order to find. Medium mixes in two wrong letters and opens words up to six long, and hard takes the whole list, up to a nine-letter chocolate, with four wrong letters in the tray.",

        "The hint fills the first letter still missing. Press it as often as it takes. It is never rationed, because a hint a child has to earn is a hint they cannot reach at the exact moment they are stuck, and a four-year-old who is stuck with no way forward closes the tab.",

        "The honest part. Easy is forgiving by design, and the measurement says how forgiving: a player tapping tiles completely at random finishes an easy word in about 5.9 taps, against an average word length of 4.67 letters. That is roughly one wrong tap per word. The same blind tapping costs 18.2 taps at hard. So easy is close to a guess for a child who has stopped looking, which is the price of a level a beginner can actually finish, and it is worth moving up once the words start coming quickly.",
      ],

      howToPlay: [
        {
          title: "Look at the picture",
          body: "The word is never written anywhere. Under the picture is one empty box per letter, so the length of the word is known before the first tile lands.",
        },
        {
          title: "Tap the letters in order",
          body: "The first letter first. A right tile drops into its box; a wrong one shakes and dims, and can be tried again at the next letter, where it may well belong.",
        },
        {
          title: "Press the hint when it stalls",
          body: "It fills the first letter still unknown and hands the rest back. Hinted letters are drawn in a paler colour, so a grown-up can see afterwards which ones were given.",
        },
        {
          title: "Change the alphabet, not the app",
          body: "The buttons under the game switch which language is being spelled. The menus stay in the language they were in.",
        },
      ],

      tips: [
        {
          title: "Say the word slowly, out loud",
          body: "Stretch it. Buh-ann-ann-ah. Hearing where one sound ends is most of spelling at this age, and it is far more useful than pointing at the tray.",
        },
        {
          title: "Start on easy even if they read",
          body: "With no wrong letters in the tray the task is pure ordering, which is a different skill from rejecting a letter that does not belong. A child who reads fluently can still be slow at it.",
        },
        {
          title: "Let the hint take the dull letters",
          body: "Silent letters and doubles are memory, not sound. Hinting the second r in perro and letting them find the rest keeps the run moving and costs nothing.",
        },
        {
          title: "Watch the first letter, not the score",
          body: "The moment worth noticing is when they stop scanning the whole tray and go straight for the opening letter. That is the skill arriving, and it happens weeks before the record does.",
        },
      ],

      teaches: [
        {
          title: "Sounds to letters",
          body: "The child hears the word in their head and looks for the letter that makes each sound. That mapping is the whole foundation of both reading and writing, and it is practised here one letter at a time.",
        },
        {
          title: "Order, not just recognition",
          body: "Knowing every letter of a word and knowing what order they come in are two different pieces of knowledge. Easy mode isolates the second one completely.",
        },
        {
          title: "Word length",
          body: "The empty boxes are visible from the start, so a child learns that a word is a fixed number of letters long before they can count them out for themselves.",
        },
        {
          title: "A second alphabet, painlessly",
          body: "Hebrew, English and Spanish are switchable inside the game. Spelling the same picture in a second language is one of the cheapest ways into it.",
        },
      ],

      ages: [
        {
          title: "Four and five",
          body: "Easy only, and with a grown-up naming the picture out loud. Expect heavy hint use for a while. That is the hint working rather than the child failing.",
        },
        {
          title: "Six and seven",
          body: "Medium is the level that fits, with its two wrong letters to rule out. Most children at this age start refusing the hint on their own, which is worth letting them do.",
        },
        {
          title: "Eight and up",
          body: "Hard, or the same game in a language they are learning at school. Nine-letter words with four decoys in the tray are a real task for an adult in an unfamiliar alphabet.",
        },
      ],

      accessibility:
        "Every letter is a tap on a target of at least 52 pixels, and nothing here needs a drag, a swipe, or a sustained press. There is no clock and no way to lose, so a child who stops halfway through a word loses nothing by taking a minute. Sound is optional throughout: the speaker button says the word aloud for anyone who wants it, and the game is complete with the volume off.",

      together: [
        {
          title: "Name the picture first",
          body: "Say what it is before they start. It removes the one genuine unfairness in the game, which is a picture the child calls something else.",
        },
        {
          title: "Take alternate letters",
          body: "You take the odd ones, they take the even ones. It halves the effort on a long word and keeps a tired child in the game.",
        },
        {
          title: "Ask for the word afterwards",
          body: "Once it is spelled, cover the screen and ask how it started. Recall a few seconds later is worth more than the spelling itself.",
        },
      ],

      faq: [
        {
          q: "Is the spelling game free?",
          a: "Yes, and there is nothing to buy inside it. No account, no download, and it keeps working with the connection off.",
        },
        {
          q: "Does my child need to read already?",
          a: "No. They need to know the letters and to know what the picture is called. Reading a whole word is what this game leads towards rather than what it asks for.",
        },
        {
          q: "What if they call the picture something else?",
          a: "Then their answer is right in their head and wrong on the screen, and no game can explain that gap. Say the word out loud before they start. It is the one place an adult genuinely matters here.",
        },
        {
          q: "Can they spell in a language other than the menus?",
          a: "Yes. Hebrew, English and Spanish each have their own tiles and their own record, and the buttons under the game switch between them without changing the interface.",
        },
        {
          q: "Does using the hint cost anything?",
          a: "No. It counts hints so a grown-up can see how much help a run needed, and the word still counts when it is finished. Nothing is deducted and nothing is locked.",
        },
        {
          q: "What does the record count?",
          a: "Words spelled in one run, kept separately for each level and each language. It resets when a run starts and never goes down.",
        },
        {
          q: "Is there a timer?",
          a: "There is not. Nothing on the screen moves on its own, and a word can sit half finished for as long as it needs to.",
        },
      ],

      keywords: [
        "spelling game for kids",
        "learn to spell",
        "letter tiles game",
        "first words spelling",
        "free spelling game",
      ],
    },

    he: {
      name: "מרכיבים מילה",
      metaTitle: "מרכיבים מילה - משחק כתיב לילדים | Ellaz",
      metaDescription:
        "משחק כתיב חינם לילדים. מופיעה תמונה, והילד מרכיב את השם שלה מאותיות. אות שגויה לא נכנסת, ויש כפתור רמז שממלא את האות הבאה. בלי הרשמה.",

      lede:
        "משחק כתיב חינם שבו מופיעה תמונה, והילד מרכיב את כל השם שלה מאותיות. אות לא נכונה פשוט לא נכנסת, אז המילה על המסך תמיד נכונה עד כמה שהגיעה. 67 תמונות, שלוש רמות, וכפתור רמז שממלא את האות הבאה בכל פעם שצריך.",

      body: [
        "תמונה, ומתחתיה משבצת ריקה לכל אות בשם שלה. נוגעים באותיות לפי הסדר. זה כל המשחק.",

        "אות לא נכונה לא נכנסת למשבצת. נוגעים בה, היא רועדת, מתעמעמת ונשארת במקום, ולכן השורה למעלה נכונה בכל רגע שמסתכלים עליה. ההחלטה הזאת היא הסיבה שהמשחק עובד בגיל ארבע ולא בגיל שש. ילד שמילא חמש אותיות ואז שומע שהכל שגוי לא קיבל שום דבר שאפשר לעשות איתו, כי אף אחד לא יכול להצביע על האות שגרמה לזה. כאן הטעות נענית ברגע שהיא קורית, על האות האחת שהיא נוגעת בה, והתמונה לא הולכת לשום מקום.",

        "ברמה הקלה יש 46 תמונות מתוך 67, אלה ששמן בעברית באורך ארבע אותיות או פחות, והמגש מכיל בדיוק את האותיות של המילה ולא יותר. אין מה לפסול, יש רק סדר למצוא. ברמה הבינונית נכנסות שתי אותיות מיותרות ומילים עד שש אותיות, וברמה הקשה נפתחת כל הרשימה עם ארבע אותיות מיותרות במגש.",

        "הרמז ממלא את האות הראשונה שעדיין חסרה. אפשר ללחוץ עליו כמה שצריך. הוא אף פעם לא נגמר, כי רמז שצריך להרוויח אותו הוא רמז שלא זמין בדיוק ברגע שנתקעים, וילד בן ארבע שנתקע בלי דרך קדימה פשוט סוגר את המסך.",

        "החלק הכן. הרמה הקלה סלחנית בכוונה, והמדידה אומרת כמה: שחקן שנוגע באותיות באקראי גמור מסיים מילה קלה בערך ב-5.7 נגיעות, כשהמילה הממוצעת בעברית היא 4.03 אותיות. כלומר בערך טעות אחת למילה. אותה נגיעה עיוורת עולה 15.1 נגיעות ברמה הקשה. אז הרמה הקלה קרובה לניחוש עבור ילד שהפסיק להסתכל, וזה המחיר של רמה שמתחיל יכול באמת לסיים בה. כשהמילים מתחילות לבוא מהר, שווה לעלות.",
      ],

      howToPlay: [
        {
          title: "מסתכלים על התמונה",
          body: "המילה לא כתובה בשום מקום. מתחת לתמונה יש משבצת ריקה לכל אות, אז אורך המילה ידוע עוד לפני האות הראשונה.",
        },
        {
          title: "נוגעים באותיות לפי הסדר",
          body: "קודם האות הראשונה. אות נכונה נכנסת למשבצת שלה, אות שגויה רועדת ומתעמעמת, ואפשר לנסות אותה שוב באות הבאה, שם היא אולי דווקא שייכת.",
        },
        {
          title: "לוחצים רמז כשנתקעים",
          body: "הרמז ממלא את האות הראשונה שחסרה ומחזיר את ההגה. אותיות שהגיעו מרמז מצוירות בגוון בהיר יותר, אז אפשר לראות אחר כך אילו אותיות ניתנו במתנה.",
        },
        {
          title: "מחליפים אלפבית, לא ממשק",
          body: "הכפתורים מתחת למשחק מחליפים את השפה שבה מאייתים. התפריטים נשארים בשפה שהם היו בה.",
        },
      ],

      tips: [
        {
          title: "אומרים את המילה לאט ובקול",
          body: "מותחים אותה. בּ-נָ-נָ-ה. לשמוע איפה צליל אחד נגמר זה רוב הכתיב בגיל הזה, והרבה יותר מועיל מלהצביע על המגש.",
        },
        {
          title: "מתחילים בקל גם אם הוא קורא",
          body: "כשאין אותיות מיותרות במגש המשימה היא סדר בלבד, וזאת יכולת אחרת מלפסול אות שלא שייכת. ילד שקורא שוטף עדיין יכול להיות איטי בה.",
        },
        {
          title: "נותנים לרמז את האותיות המשעממות",
          body: "אות כפולה או אות שלא נשמעת הן זיכרון, לא צליל. לרמוז את הו' השנייה בברווז ולתת לו למצוא את השאר שומר על הקצב ולא עולה כלום.",
        },
        {
          title: "שמים לב לאות הראשונה, לא לשיא",
          body: "הרגע ששווה לשים לב אליו הוא כשהוא מפסיק לסרוק את כל המגש והולך ישר לאות הפותחת. שם היכולת מגיעה, והיא מגיעה שבועות לפני שהשיא זז.",
        },
      ],

      teaches: [
        {
          title: "מצליל לאות",
          body: "הילד שומע את המילה בראש ומחפש את האות שעושה כל צליל. ההתאמה הזאת היא הבסיס של הקריאה ושל הכתיבה, וכאן מתאמנים עליה אות אחת בכל פעם.",
        },
        {
          title: "סדר, לא רק זיהוי",
          body: "להכיר את כל האותיות של מילה ולדעת באיזה סדר הן באות הם שני דברים שונים. הרמה הקלה מבודדת את השני לגמרי.",
        },
        {
          title: "אורך של מילה",
          body: "המשבצות הריקות נראות מההתחלה, אז ילד לומד שלמילה יש מספר קבוע של אותיות עוד לפני שהוא יודע לספור אותן בעצמו.",
        },
        {
          title: "אלפבית שני, בלי כאב",
          body: "עברית, אנגלית וספרדית מתחלפות בתוך המשחק. לאיית את אותה תמונה בשפה שנייה זאת אחת הדרכים הזולות ביותר להיכנס אליה.",
        },
      ],

      ages: [
        {
          title: "ארבע וחמש",
          body: "רק הרמה הקלה, ועם מבוגר שאומר את שם התמונה בקול. אפשר לצפות להרבה רמזים בהתחלה. זה הרמז עובד, לא הילד נכשל.",
        },
        {
          title: "שש ושבע",
          body: "הרמה הבינונית היא זאת שמתאימה, עם שתי האותיות המיותרות שצריך לפסול. רוב הילדים בגיל הזה מתחילים לסרב לרמז בעצמם, ושווה לתת להם.",
        },
        {
          title: "שמונה ומעלה",
          body: "הרמה הקשה, או אותו משחק בשפה שלומדים בבית הספר. מילה בת תשע אותיות עם ארבע אותיות מיותרות היא משימה אמיתית גם למבוגר באלפבית לא מוכר.",
        },
      ],

      accessibility:
        "כל אות היא נגיעה במטרה של 52 פיקסלים לפחות, ושום דבר כאן לא דורש גרירה, החלקה או לחיצה ממושכת. אין שעון ואי אפשר להפסיד, אז ילד שעוצר באמצע מילה לא מפסיד כלום אם ייקח לו דקה. הצליל הוא תוספת בלבד: כפתור הרמקול אומר את המילה בקול למי שרוצה, והמשחק שלם לגמרי גם בהשתקה.",

      together: [
        {
          title: "אומרים מה זה לפני שמתחילים",
          body: "להגיד מה רואים בתמונה. זה מסיר את חוסר הצדק היחיד האמיתי במשחק, תמונה שהילד קורא לה בשם אחר.",
        },
        {
          title: "מתחלקים באותיות",
          body: "אתם לוקחים את האי זוגיות, הוא את הזוגיות. זה חוצה את המאמץ במילה ארוכה ומשאיר ילד עייף בפנים.",
        },
        {
          title: "שואלים את המילה אחר כך",
          body: "אחרי שהיא מורכבת, מכסים את המסך ושואלים באיזו אות היא התחילה. היזכרות אחרי כמה שניות שווה יותר מהכתיב עצמו.",
        },
      ],

      faq: [
        {
          q: "משחק הכתיב חינמי?",
          a: "כן, ואין בתוכו שום דבר לקנות. בלי הרשמה, בלי הורדה, והוא ממשיך לעבוד גם כשאין חיבור.",
        },
        {
          q: "הילד צריך לדעת לקרוא?",
          a: "לא. הוא צריך להכיר את האותיות ולדעת איך קוראים לתמונה. קריאה של מילה שלמה היא מה שהמשחק מוביל אליו, לא מה שהוא דורש.",
        },
        {
          q: "מה אם הוא קורא לתמונה בשם אחר?",
          a: "אז התשובה שלו נכונה בראש ושגויה על המסך, ואף משחק לא יכול להסביר את הפער הזה. כדאי להגיד את המילה בקול לפני שמתחילים. זה המקום היחיד שבו מבוגר באמת משנה כאן.",
        },
        {
          q: "אפשר לאיית בשפה אחרת מהתפריטים?",
          a: "כן. לעברית, לאנגלית ולספרדית יש אותיות משלהן ושיא נפרד, והכפתורים מתחת למשחק מחליפים ביניהן בלי לשנות את הממשק.",
        },
        {
          q: "השימוש ברמז עולה משהו?",
          a: "לא. הוא סופר רמזים כדי שמבוגר יראה כמה עזרה הסיבוב הזה דרש, והמילה נספרת גם כשהיא הסתיימה ברמז. שום דבר לא יורד ושום דבר לא ננעל.",
        },
        {
          q: "מה השיא סופר?",
          a: "מילים שהורכבו בסיבוב אחד, בנפרד לכל רמה ולכל שפה. הוא מתאפס כשמתחילים סיבוב חדש ולעולם לא יורד.",
        },
        {
          q: "יש טיימר?",
          a: "אין. שום דבר על המסך לא זז מעצמו, ומילה יכולה לחכות חצי מורכבת כמה זמן שצריך.",
        },
      ],

      keywords: [
        "משחק כתיב לילדים",
        "ללמוד לכתוב מילים",
        "משחק אותיות",
        "מילים ראשונות",
        "משחק כתיב חינם",
      ],
    },

    es: {
      name: "Forma la palabra",
      metaTitle: "Forma la palabra - juego de deletreo | Ellaz",
      metaDescription:
        "Una imagen y su nombre entero para armar con letras. 67 imágenes, tres niveles y una pista que rellena la letra siguiente. Gratis y sin cuenta.",

      lede:
        "Una imagen aparece y el niño arma su nombre completo con fichas de letras. Una letra equivocada nunca entra, así que la palabra en pantalla siempre está bien hasta donde llega. 67 imágenes, tres niveles y una pista que rellena la letra siguiente cuando hace falta.",

      body: [
        "Una imagen, y debajo una casilla vacía por cada letra de su nombre. Se tocan las letras en orden. Ese es el juego.",

        "La bandeja rechaza la letra equivocada. Al tocarla tiembla, se apaga y se queda donde estaba, de modo que la fila de arriba está siempre correcta hasta donde ha llegado. Esa decisión es la razón de que esto funcione a los cuatro años y no a los seis. Un niño que rellena cinco letras y luego escucha que la palabra entera está mal no se lleva nada que pueda usar, porque nadie puede señalar cuál de las cinco fue. Aquí el error se responde en el instante en que ocurre, sobre la única letra que le corresponde, y la imagen no desaparece.",

        "El nivel fácil usa 23 de las 67 imágenes, las que en español se escriben con cuatro letras o menos, y la bandeja contiene exactamente las letras de la palabra. Nada que descartar, solo un orden que encontrar. El nivel medio añade dos letras sobrantes y palabras de hasta seis, y el difícil abre la lista entera, hasta una zanahoria de nueve letras, con cuatro letras sobrantes en la bandeja.",

        "La pista rellena la primera letra que todavía falta. Se puede pulsar tantas veces como haga falta. Nunca se raciona. Una pista que hay que ganarse es una pista que no está disponible justo en el momento del atasco, y un niño de cuatro años atascado sin salida cierra la pantalla.",

        "La parte honesta. El español es el idioma más duro de los tres que hay aquí, y los números lo dicen: sus palabras tienen 5.30 letras de media frente a 4.03 en hebreo, y por eso el nivel fácil ofrece 23 imágenes donde el hebreo ofrece 46. Un jugador que toca al azar termina una palabra fácil en unos 6.1 toques y una difícil en 20.9. Quien empiece en español tiene menos palabras cortas de las que tirar, así que conviene quedarse en fácil más tiempo del que parece necesario.",
      ],

      howToPlay: [
        {
          title: "Mirar la imagen",
          body: "La palabra no está escrita en ningún sitio. Debajo hay una casilla vacía por letra, así que la longitud se conoce antes de colocar la primera.",
        },
        {
          title: "Tocar las letras en orden",
          body: "Primero la inicial. La letra correcta cae en su casilla; la equivocada tiembla y se apaga, y puede probarse otra vez en la letra siguiente, donde quizá sí encaje.",
        },
        {
          title: "Pulsar la pista al atascarse",
          body: "Rellena la primera letra desconocida y devuelve el turno. Las letras que vienen de una pista se dibujan en un tono más pálido, para saber después cuáles fueron regaladas.",
        },
        {
          title: "Cambiar el alfabeto, no la aplicación",
          body: "Los botones bajo el juego cambian el idioma que se deletrea. Los menús se quedan en el idioma en que estaban.",
        },
      ],

      tips: [
        {
          title: "Decir la palabra despacio y en voz alta",
          body: "Estirarla. Ma-ri-po-sa. Oír dónde termina un sonido es casi todo el deletreo a esta edad, y sirve mucho más que señalar la bandeja.",
        },
        {
          title: "Empezar en fácil aunque ya lea",
          body: "Sin letras sobrantes la tarea es puro orden, que es una habilidad distinta de descartar una letra intrusa. Un niño que lee con soltura puede ser lento en esto.",
        },
        {
          title: "Dejar a la pista las letras aburridas",
          body: "La hache muda y las dobles son memoria, no sonido. Pistar la primera letra de huevo y dejarle el resto mantiene el ritmo y no cuesta nada.",
        },
        {
          title: "Mirar la primera letra, no el récord",
          body: "El momento que importa es cuando deja de recorrer toda la bandeja y va directo a la inicial. Ahí llega la habilidad, semanas antes de que el récord se mueva.",
        },
      ],

      teaches: [
        {
          title: "Del sonido a la letra",
          body: "El niño escucha la palabra en su cabeza y busca la letra que hace cada sonido. Esa correspondencia es la base de leer y de escribir, y aquí se practica de una en una.",
        },
        {
          title: "Orden, no solo reconocimiento",
          body: "Conocer todas las letras de una palabra y saber en qué orden van son dos cosas distintas. El nivel fácil aísla la segunda por completo.",
        },
        {
          title: "La longitud de una palabra",
          body: "Las casillas vacías se ven desde el principio, así que se aprende que una palabra tiene un número fijo de letras antes de saber contarlas.",
        },
        {
          title: "Un segundo alfabeto sin dolor",
          body: "Hebreo, inglés y español se cambian dentro del juego. Deletrear la misma imagen en otro idioma es de las formas más baratas de entrar en él.",
        },
      ],

      ages: [
        {
          title: "Cuatro y cinco",
          body: "Solo fácil, y con un adulto que nombre la imagen en voz alta. Habrá muchas pistas durante un tiempo. Eso es la pista funcionando, no el niño fallando.",
        },
        {
          title: "Seis y siete",
          body: "El nivel medio es el que encaja, con sus dos letras sobrantes que descartar. A esta edad la mayoría empieza a rechazar la pista por su cuenta, y conviene dejarles.",
        },
        {
          title: "Ocho en adelante",
          body: "Difícil, o el mismo juego en el idioma que estudian en el colegio. Nueve letras con cuatro intrusas en la bandeja es una tarea real incluso para un adulto en un alfabeto ajeno.",
        },
      ],

      accessibility:
        "Cada letra es un toque sobre un objetivo de 52 píxeles como mínimo, y nada aquí exige arrastrar, deslizar ni mantener el dedo. No hay reloj ni forma de perder, de modo que quien se detiene a mitad de una palabra no pierde nada por tardar un minuto. El sonido es opcional: el botón del altavoz dice la palabra en voz alta para quien lo quiera, y el juego está completo en silencio.",

      together: [
        {
          title: "Nombrar la imagen antes",
          body: "Decir qué es antes de empezar. Elimina la única injusticia real del juego, que es una imagen a la que el niño llama de otra manera.",
        },
        {
          title: "Repartirse las letras",
          body: "Usted las impares y él las pares. Reduce a la mitad el esfuerzo de una palabra larga y mantiene dentro a un niño cansado.",
        },
        {
          title: "Preguntar la palabra después",
          body: "Cuando esté armada, tape la pantalla y pregunte por qué letra empezaba. Recordarla unos segundos después vale más que el propio deletreo.",
        },
      ],

      faq: [
        {
          q: "¿El juego de deletreo es gratis?",
          a: "Sí, y no hay nada que comprar dentro. Sin cuenta, sin descarga, y sigue funcionando con la conexión apagada.",
        },
        {
          q: "¿Mi hijo necesita saber leer ya?",
          a: "No. Necesita conocer las letras y saber cómo se llama la imagen. Leer una palabra entera es adonde lleva este juego, no lo que pide.",
        },
        {
          q: "¿Y si llama a la imagen de otra manera?",
          a: "Entonces su respuesta es correcta en su cabeza y falsa en la pantalla, y ningún juego puede explicar esa diferencia. Diga la palabra en voz alta antes de empezar. Es el único punto donde un adulto cambia algo de verdad.",
        },
        {
          q: "¿Puede deletrear en un idioma distinto al de los menús?",
          a: "Sí. Hebreo, inglés y español tienen sus propias letras y su propio récord, y los botones bajo el juego cambian entre ellos sin tocar la interfaz.",
        },
        {
          q: "¿Usar la pista cuesta algo?",
          a: "No. Cuenta las pistas para que un adulto vea cuánta ayuda hizo falta, y la palabra cuenta igual si terminó con una. No se descuenta nada ni se bloquea nada.",
        },
        {
          q: "¿Qué mide el récord?",
          a: "Palabras armadas en una misma partida, por separado para cada nivel y cada idioma. Se reinicia al empezar de nuevo y nunca baja.",
        },
        {
          q: "¿Hay tiempo límite?",
          a: "No lo hay. Nada en la pantalla se mueve solo, y una palabra puede quedarse a medias el rato que haga falta.",
        },
      ],

      keywords: [
        "juego de deletreo",
        "aprender a escribir palabras",
        "juego de letras para niños",
        "primeras palabras",
        "deletrear gratis",
      ],
    },

    fr: spellFr,
  },

  provenance: [
    {
      claim: "67 pictures; easy 38 in English, 46 in Hebrew, 23 in Spanish",
      source: "scripts/sim/spell-pools.mjs",
    },
    {
      claim: "average word length 4.67 English, 4.03 Hebrew, 5.30 Spanish; longest 9 letters",
      source: "scripts/sim/spell-pools.mjs",
    },
    {
      claim: "random tapping needs 5.9 taps at easy and 18.2 at hard in English, 5.7 and 15.1 in Hebrew, 6.1 and 20.9 in Spanish",
      source: "scripts/sim/spell-pools.mjs",
    },
    {
      claim: "the tray adds 0, 2 or 4 wrong letters by level, and words run to 4, 6 or any length",
      source: "src/games/spell/logic.ts",
    },
    {
      claim: "letter tiles are at least 52 pixels",
      source: "src/games/spell/Spell.tsx",
    },
  ],
};
