import type { GameContent } from "../types";

/**
 * The statistic here answers what a parent wants to know about a letter game:
 * does it actually cover the alphabet, or the same handful of letters on a loop?
 *
 * The 74 pictures start words with 19 different letters in Hebrew, 19 in English
 * and 23 in Spanish, derived from the real pool by
 * `scripts/sim/letters-coverage.mjs`. Easy mode draws the 22 simplest everyday
 * words (dog, cat, home, car); the harder levels add the rest. The Spanish
 * spread is widest because the same picture can begin with a different letter in
 * each language - a car is מכונית, car and coche.
 */
export const letters: GameContent = {
  id: "letters",

  copy: {
    he: {
      metaTitle: "אות פותחת - משחק אותיות חינם | Ellaz",
      metaDescription:
        "משחק אותיות חינם לילדים. מופיעה תמונה, והילד נוגע באות שבה המילה מתחילה. אפשר להחליף בין עברית, אנגלית וספרדית בתוך המשחק. בלי הרשמה.",

      lede: "משחק אותיות חינם שבו מופיעה תמונה, והילד נוגע באות שבה שם התמונה מתחיל. מראים בננה, נוגעים ב-ב. אפשר להחליף את שפת האותיות בתוך המשחק בלי לשנות את התפריטים.",

      body: [
        "מופיעה תמונה. באיזו אות היא מתחילה? נוגעים בה.",

        "יש 74 תמונות, מכלב וחתול ובית ועד ג'ירפה ומסוק, והמילה עצמה לא כתובה בשום מקום. זה הצעד שלפני הקריאה. ילד רואה את התמונה, אומר לעצמו את שמה בראש, ורק אז מחפש את הצליל שבו היא נפתחת. אין כאן קריאה של מילה שלמה, ולכן זה עובד כבר בגיל ארבע, אצל מי שמכיר את האותיות אבל עדיין לא קורא.",

        "הרמה משנה שני דברים יחד. בקל יש שתי אותיות לבחירה, והתמונות הן 22 המילים הכי פשוטות ויומיומיות, כלב, חתול, בית, מכונית. בבינוני יש שלוש, וזו הגרסה הרגילה של המשחק. בקשה יש ארבע, והתמונות מגיעות מכל המאגר, כך שאוצר המילים מתרחב בדיוק כשהניחוש נעשה קשה יותר.",

        "האותיות יכולות להיות בשפה אחרת מזו של האתר, וזה החלק המיוחד כאן. ילד דובר עברית יכול לתרגל את האלף-בית האנגלי בלי שהתפריטים סביבו ישתנו, ודובר אנגלית יכול לנסות ספרדית. מאגר התמונות מכסה 19 אותיות פתיחה שונות בעברית, 19 באנגלית ו-23 בספרדית, אז זה תרגול אמיתי ולא אותן חמש אותיות שוב ושוב. תשובה שגויה לא מענישה: האות מתעממת, התמונה רועדת קצת, ואפשר לנסות שוב על אותה תמונה. אין שעון ואי אפשר להפסיד.",
      ],

      howToPlay: [
        { title: "מסתכלים על התמונה", body: "מופיעה תמונה אחת גדולה. אומרים בראש מה רואים." },
        { title: "מוצאים את האות הראשונה", body: "באיזו אות מתחיל השם? נוגעים בה מבין האותיות למטה." },
        { title: "בוחרים רמה", body: "שתיים, שלוש או ארבע אותיות לבחירה, ואוצר מילים רחב יותר ככל שעולים." },
        { title: "מחליפים שפה", body: "כפתור השפה מחליף את האותיות בין עברית, אנגלית וספרדית בכל רגע." },
      ],

      tips: [
        {
          title: "להגיד את השם בקול",
          body: "לפני שמחפשים אות, אומרים את שם התמונה בקול. הצליל הראשון קופץ לבד הרבה פעמים.",
        },
        {
          title: "ללחוץ על הרמקול",
          body: "כשיש קול, כפתור הרמקול אומר את המילה בשפת האותיות. שומעים בננה, ומחפשים ב.",
        },
        {
          title: "להתחיל בקל",
          body: "שתי אותיות זה לא פחות לימוד, זה פחות ניחוש. ילד קטן לומד יותר כשהוא צודק לעתים קרובות.",
        },
        {
          title: "לתרגל שפה שנייה",
          body: "אותה תמונה נפתחת באות אחרת בכל שפה. מכונית ב-מ, car ב-C. זו הדרך הכי טבעית להכיר אלף-בית חדש.",
        },
      ],

      teaches: [
        { title: "מודעות פונולוגית", body: "לזהות את הצליל הראשון של מילה זה הבסיס הישיר לקריאה ולכתיבה." },
        { title: "אות מול צליל", body: "לחבר צורה של אות לצליל שהיא עושה. זה בדיוק מה שנמדד פה, תמונה אחר תמונה." },
        { title: "שם התמונה", body: "כדי למצוא אות ראשונה צריך קודם לדעת איך קוראים לדבר. אוצר המילים גדל אגב הדרך." },
        { title: "אלף-בית שני", body: "מי שכבר מכיר אותיות בשפה אחת לומד כאן צורות חדשות לצלילים שהוא כבר יודע." },
      ],

      ages: [
        { title: "3 עד 4", body: "רמה קלה, שתי אותיות. מספיק להכיר כמה אותיות בודדות כדי ליהנות." },
        { title: "5 עד 6", body: "שלוש אותיות, וזה הגיל שבו הצליל הראשון כבר נשמע לבד ברוב המילים." },
        { title: "7 ומעלה", body: "ארבע אותיות, וזה הזמן להוסיף שפה שנייה מכפתור השפה." },
        { title: "מבוגרים", body: "דרך נעימה ללמד ילד אלף-בית זר, כשהמבוגר מכיר את המילים והילד את האותיות." },
      ],

      accessibility:
        "נגיעה אחת על אות, בלי גרירה ובלי החזקה. האותיות גדולות ומרווחות, כך שגם נגיעה לא מדויקת נוחתת על הנכון. התמונה היא השאלה, אף פעם לא הקול, אז המשחק שלם לגמרי בשקט. מי שרוצה יכול ללחוץ על הרמקול וישמע את המילה, אבל שום דבר לא תלוי בזה. אין שעון על התשובה, ואפשר לחשוב כמה שצריך לפני כל נגיעה. תשובה שגויה רק מעמעמת את האות ומשאירה את אותה תמונה, אז אין עונש ואין דרך להפסיד.",

      together: [
        { title: "לנחש ביחד", body: "המבוגר אומר את שם התמונה, הילד מוצא את האות. אחר כך מתחלפים." },
        { title: "לחפש בבית", body: "אחרי אות אחת, מחפשים בחדר עוד דבר שמתחיל באותה אות. המשחק ממשיך רחוק מהמסך." },
        { title: "שתי שפות", body: "לשחק סיבוב בעברית ואז אותו נושא באנגלית. אותן תמונות, אותיות אחרות." },
        { title: "לצייר את האות", body: "לצייר באוויר את האות שנבחרה לפני שנוגעים. היד עוזרת לזיכרון." },
      ],

      faq: [
        {
          q: "המשחק חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק, וכל משחק באתר פתוח מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן בלי הורדה ובלי חשבון, וגם מייל לא מבקשים.",
        },
        {
          q: "הילד עדיין לא קורא, זה בסדר?",
          a: "זה בדיוק המצב שהמשחק בנוי לו. המילה לא כתובה, צריך רק לזהות תמונה ולמצוא את הצליל הראשון שלה, וזה הצעד שלפני הקריאה.",
        },
        {
          q: "אילו שפות יש?",
          a: "עברית, אנגלית וספרדית. כפתור השפה מחליף את האותיות בכל רגע, בלי לשנות את שפת האתר, כך שאפשר לתרגל אלף-בית זר.",
        },
        {
          q: "כמה תמונות יש?",
          a: "74 תמונות, ובקל אלה 22 המילים הכי פשוטות. הן פותחות ב-19 אותיות שונות בעברית, 19 באנגלית ו-23 בספרדית, אז יש כיסוי רחב של האלף-בית.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "האות מתעממת והתמונה רועדת קצת, ואותה תמונה נשארת לניסיון נוסף. אין ניקוד שיורד ואין הפסד.",
        },
        {
          q: "המשחק עובד בלי קול?",
          a: "כן, לגמרי. התמונה והאותיות תמיד על המסך. הרמקול שאומר את המילה הוא תוספת בלבד, ואפשר לשחק בלעדיו.",
        },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם בלי רשת.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["אותיות", "אות פותחת", "אלף-בית", "קריאה", "לגיל הרך", "משחק לימודי"],
    },

    en: {
      metaTitle: "First Letter - Free Alphabet Game for Kids | Ellaz",
      metaDescription:
        "A free alphabet game: a picture appears and your child taps the letter its word begins with. Switch the letters between Hebrew, English and Spanish.",

      lede: "A free alphabet game where a picture appears and your child taps the letter its word begins with. Show a banana, tap B. The letters can be Hebrew, English or Spanish, switched inside the game itself.",

      body: [
        "A picture shows up. What does its word start with? Tap the letter.",

        "There are 74 pictures, from dog and cat and home to giraffe and helicopter, and the word itself is never written down. That matters. Reading the word would hand over the answer, so a child has to name the picture in their own head first and then find the sound it opens with. This is the step before reading rather than reading itself, which is why it works for a four-year-old who knows their letters but cannot yet read a whole word off the page.",

        "Difficulty moves two things at once. Easy shows 2 letters to choose between, and its pictures are the 22 simplest everyday words, dog, cat, home, car. Medium shows 3, the ordinary version of the game. Hard shows 4 and pulls from the whole pool, so the vocabulary widens exactly as the guessing gets harder.",

        "The letters can be a different language from the app, and that is the part worth having. A Hebrew-speaking child can practise the English alphabet while every menu around them stays in Hebrew, and an English speaker can try Spanish for a while. The pool starts words with 19 different letters in Hebrew, 19 in English and 23 in Spanish, so it is real coverage rather than the same five letters on a loop.",

        "A wrong tap does nothing harsh. The letter dims, the picture gives a small shake, and the same picture waits for another go. There is no clock and no way to lose. Correct answers keep arriving, the count climbs, and the best run for each language and level is kept for next time.",
      ],

      howToPlay: [
        { title: "Look at the picture", body: "One big picture appears. Say to yourself what it is." },
        { title: "Find the first letter", body: "Which letter does its name start with? Tap it from the row below." },
        { title: "Pick a level", body: "Two, three or four letters to choose between, with a wider range of pictures as you climb." },
        { title: "Switch language", body: "The language button flips the letters between Hebrew, English and Spanish anytime." },
      ],

      tips: [
        {
          title: "Say the name out loud",
          body: "Before hunting for a letter, say the picture's name aloud. The first sound often jumps out on its own.",
        },
        {
          title: "Use the speaker",
          body: "When sound is on, the speaker button says the word in the letters' language. Hear banana, look for B.",
        },
        {
          title: "Start on easy",
          body: "Two letters is not less learning, it is less guessing. A young child learns more while getting it right often.",
        },
        {
          title: "Practise a second alphabet",
          body: "The same picture opens with a different letter in each language. A car is C in English, מ in Hebrew. That is the most natural way into a new alphabet.",
        },
      ],

      teaches: [
        { title: "Phonemic awareness", body: "Hearing the first sound of a word is the direct groundwork for reading and spelling." },
        { title: "Letter to sound", body: "Matching a letter's shape to the sound it makes is exactly what gets practised, picture after picture." },
        { title: "Naming things", body: "Finding a first letter means knowing what the thing is called first, so vocabulary grows along the way." },
        { title: "A second alphabet", body: "A child who already knows one language's letters meets new shapes for sounds they already own." },
      ],

      ages: [
        { title: "3 to 4", body: "Easy level, two letters. Knowing a handful of letters is enough to enjoy it." },
        { title: "5 to 6", body: "Three letters, and the age where the first sound of most words is already audible on its own." },
        { title: "7 and up", body: "Four letters, and the time to add a second language from the language button." },
        { title: "Adults", body: "A gentle way to teach a child a foreign alphabet, with the grown-up knowing the words and the child the letters." },
      ],

      accessibility:
        "One tap on a letter, with no dragging and no holding. The letters are large and well spaced, so an imprecise tap still lands on the right one. The picture is the question, never the sound, so the game is fully playable in silence. Anyone who wants it can press the speaker and hear the word, but nothing depends on that. There is no clock on the answer, so a child can think as long as they need before each tap. A wrong answer only dims that letter and leaves the same picture up, so there is no punishment and no way to lose.",

      together: [
        { title: "Guess together", body: "The grown-up names the picture, the child finds the letter. Then swap over." },
        { title: "Hunt around the room", body: "After a letter, find one more thing nearby that starts with it. The game carries on away from the screen." },
        { title: "Two languages", body: "Play a round in English, then the same theme in Spanish. Same pictures, different letters." },
        { title: "Draw the letter", body: "Trace the chosen letter in the air before tapping. The hand helps the memory." },
      ],

      faq: [
        {
          q: "Is the game free?",
          a: "Completely. Nothing to pay and no purchases inside the game, and every game on the site is open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we never ask for an email.",
        },
        {
          q: "My child cannot read yet, is that okay?",
          a: "That is exactly who it is built for. The word is never written, so a child only has to recognise a picture and find its first sound, which is the step before reading.",
        },
        {
          q: "Which languages are there?",
          a: "Hebrew, English and Spanish. The language button switches the letters at any moment without changing the site language, so a child can practise a foreign alphabet.",
        },
        {
          q: "How many pictures are there?",
          a: "74 pictures, and easy mode uses the 22 simplest. They start with 19 different letters in Hebrew, 19 in English and 23 in Spanish, so the alphabet is well covered.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "The letter dims and the picture gives a small shake, and the same picture stays up for another try. No score drops and there is no losing.",
        },
        {
          q: "Does it work with the sound off?",
          a: "Completely. The picture and the letters are always on screen. The speaker that says the word is an extra, and the game plays fine without it.",
        },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs with no network.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["letters", "first letter", "alphabet", "phonics", "reading", "learning game"],
    },

    es: {
      metaTitle: "Primera letra - juego de letras para niños | Ellaz",
      metaDescription:
        "Juego de letras gratis. Aparece una imagen y el niño toca la letra por la que empieza su palabra. Cambia las letras entre hebreo, inglés y español.",

      lede: "Un juego de letras gratuito en el que aparece una imagen y tu hijo toca la letra por la que empieza su palabra. Sale un plátano, toca la P. Las letras pueden ser hebreas, inglesas o españolas, y se cambian dentro del propio juego.",

      body: [
        "Aparece una imagen. ¿Por qué letra empieza? Se toca.",

        "Hay 74 imágenes, desde perro y gato y casa hasta jirafa y helicóptero, y la palabra nunca aparece escrita. Eso importa. Leer la palabra daría la respuesta, así que el niño tiene que nombrar la imagen en su cabeza y luego buscar el sonido con el que arranca. Es el paso anterior a la lectura, no la lectura misma, y por eso funciona con un niño de cuatro años que conoce sus letras pero todavía no lee una palabra entera.",

        "El nivel cambia dos cosas a la vez. Fácil muestra 2 letras entre las que elegir, y sus imágenes son las 22 palabras más sencillas del día a día, perro, gato, casa, coche. Medio muestra 3, la versión de siempre. Difícil muestra 4 y saca imágenes de todo el conjunto, así que el vocabulario se abre justo cuando acertar cuesta más.",

        "Las letras pueden estar en otro idioma que el de la aplicación, y esa es la parte que merece la pena. Un niño que habla hebreo puede practicar el alfabeto inglés mientras los menús siguen en hebreo, y quien habla inglés puede probar el español. Las imágenes empiezan por 19 letras distintas en hebreo, 19 en inglés y 23 en español, así que es práctica de verdad y no las mismas cinco letras una y otra vez. Un toque equivocado no castiga: la letra se atenúa, la imagen tiembla un poco y la misma imagen espera otro intento. No hay reloj y no se puede perder.",
      ],

      howToPlay: [
        { title: "Mira la imagen", body: "Aparece una imagen grande. Dite a ti mismo qué es." },
        { title: "Busca la primera letra", body: "¿Por qué letra empieza su nombre? Tócala en la fila de abajo." },
        { title: "Elige un nivel", body: "Dos, tres o cuatro letras para elegir, con más variedad de imágenes según subes." },
        { title: "Cambia de idioma", body: "El botón de idioma cambia las letras entre hebreo, inglés y español cuando quieras." },
      ],

      tips: [
        {
          title: "Di el nombre en voz alta",
          body: "Antes de buscar una letra, di el nombre de la imagen en voz alta. El primer sonido suele saltar solo.",
        },
        {
          title: "Usa el altavoz",
          body: "Con el sonido puesto, el botón del altavoz dice la palabra en el idioma de las letras. Oyes plátano, buscas la P.",
        },
        {
          title: "Empieza en fácil",
          body: "Dos letras no es menos aprendizaje, es menos adivinar. Un niño pequeño aprende más acertando a menudo.",
        },
        {
          title: "Practica un segundo alfabeto",
          body: "La misma imagen empieza por otra letra en cada idioma. Un coche es C en inglés y מ en hebreo. Es la vía más natural a un alfabeto nuevo.",
        },
      ],

      teaches: [
        { title: "Conciencia fonológica", body: "Oír el primer sonido de una palabra es la base directa de la lectura y la escritura." },
        { title: "Letra y sonido", body: "Unir la forma de una letra con el sonido que hace es justo lo que se practica, imagen tras imagen." },
        { title: "Nombrar las cosas", body: "Buscar una primera letra obliga a saber cómo se llama algo, así que el vocabulario crece por el camino." },
        { title: "Un segundo alfabeto", body: "Un niño que ya conoce las letras de un idioma encuentra formas nuevas para sonidos que ya tiene." },
      ],

      ages: [
        { title: "3 a 4", body: "Nivel fácil, dos letras. Conocer unas pocas letras basta para disfrutarlo." },
        { title: "5 a 6", body: "Tres letras, la edad en que el primer sonido de casi cualquier palabra ya se oye solo." },
        { title: "7 en adelante", body: "Cuatro letras, y el momento de añadir un segundo idioma desde el botón de idioma." },
        { title: "Adultos", body: "Una forma amable de enseñar a un niño un alfabeto extranjero, con el adulto sabiendo las palabras y el niño las letras." },
      ],

      accessibility:
        "Un toque por letra, sin arrastrar y sin mantener pulsado. Las letras son grandes y están bien separadas, así que un toque poco preciso cae igual en la correcta. La imagen es la pregunta, nunca el sonido, de modo que el juego se juega entero en silencio. Quien quiera puede pulsar el altavoz y oír la palabra, pero nada depende de eso. No hay reloj sobre la respuesta, así que un niño puede pensar lo que necesite antes de cada toque. Una respuesta equivocada solo atenúa esa letra y deja la misma imagen, así que no hay castigo ni manera de perder.",

      together: [
        { title: "Adivinad juntos", body: "El adulto nombra la imagen y el niño busca la letra. Después se cambian." },
        { title: "Buscad por la habitación", body: "Tras una letra, buscad otra cosa cerca que empiece por ella. El juego sigue lejos de la pantalla." },
        { title: "Dos idiomas", body: "Jugad una ronda en español y luego el mismo tema en inglés. Mismas imágenes, otras letras." },
        { title: "Dibuja la letra", body: "Traza en el aire la letra elegida antes de tocar. La mano ayuda a la memoria." },
      ],

      faq: [
        {
          q: "¿El juego es gratis?",
          a: "Del todo. Nada que pagar y ninguna compra dentro del juego, y todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y nunca pedimos un correo.",
        },
        {
          q: "Mi hijo todavía no lee, ¿pasa algo?",
          a: "Es justo para quien está pensado. La palabra nunca aparece escrita, así que el niño solo reconoce una imagen y busca su primer sonido, que es el paso anterior a leer.",
        },
        {
          q: "¿Qué idiomas hay?",
          a: "Hebreo, inglés y español. El botón de idioma cambia las letras en cualquier momento sin cambiar el idioma de la web, para practicar un alfabeto extranjero.",
        },
        {
          q: "¿Cuántas imágenes hay?",
          a: "74 imágenes, y en fácil son las 22 más sencillas. Empiezan por 19 letras distintas en hebreo, 19 en inglés y 23 en español, así que el alfabeto queda bien cubierto.",
        },
        {
          q: "¿Qué pasa con una respuesta equivocada?",
          a: "La letra se atenúa y la imagen tiembla un poco, y la misma imagen se queda para otro intento. No baja ninguna puntuación y no se pierde.",
        },
        {
          q: "¿Funciona con el sonido apagado?",
          a: "Completamente. La imagen y las letras están siempre en pantalla. El altavoz que dice la palabra es un extra, y el juego va bien sin él.",
        },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona sin red.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["letras", "primera letra", "alfabeto", "fonética", "lectura", "juego educativo"],
    },
  },

  provenance: [
    {
      claim: "74 pictures in the full pool, 22 simplest words in easy mode",
      source: "scripts/sim/letters-coverage.mjs",
    },
    {
      claim: "19 distinct starting letters in Hebrew, 19 in English, 23 in Spanish",
      source: "scripts/sim/letters-coverage.mjs",
    },
    {
      claim: "2, 3 or 4 letter choices by difficulty, widening from the simple words to the whole pool",
      source: "src/games/letters/logic.ts",
    },
  ],
};
