import type { GameContent } from "../types";

/**
 * Music Box - the first game in the `create` section, and the only one here
 * besides `coloring` where the thing on screen belongs to the child rather than
 * to the rules. Nothing can be wrong, nothing is timed, and there is no run to
 * end.
 *
 * That makes the page's job unusual: there is no skill to measure, so the
 * numbers describe the ROOM instead. `scripts/sim/music-tunes.mjs` counts the
 * space exactly from the shipped `ROWS` and `STEPS` rather than sampling it,
 * drives `surprise` 200,000 times to see which corner of that space one tap can
 * reach, and checks the claim the whole design rests on - that the pentatonic
 * scale makes every combination consonant - by measuring all fifteen pairs of
 * notes in semitones and looking for a semitone or a tritone. Neither is there.
 *
 * The admission is in the code rather than in an opinion: the record counts
 * NOTES, so the largest possible one is every square lit, which is a wall of
 * sound. Measuring quality would mean ranking what a child made, which is the
 * reason `coloring` carries no record at all.
 *
 * The three languages are written, not translated. They open differently, run
 * to different lengths and make different asides, because a translation carries
 * the source language's rhythm and that rhythm is exactly what reads as
 * machine-made.
 *
 * See `provenance` at the bottom for where each figure comes from.
 */
export const music: GameContent = {
  id: "music",

  copy: {
    he: {
      metaTitle: "תיבת נגינה - משחק יצירה חינם | Ellaz",
      metaDescription:
        "משחק יצירת מוזיקה חינמי בדפדפן. מדליקים ריבועים על רשת, לוחצים על הנגן והמנגינה מתנגנת בלולאה. שלושה צלילים, בלי שעון ובלי דרך לטעות.",

      lede: "משחק מוזיקה חינם בדפדפן. רשת של ריבועים צבעוניים, שש שורות של תווים ובין ארבע לשמונה פעימות. מדליקים ריבועים, לוחצים על הנגן, והמנגינה חוזרת על עצמה. אפשר להחליף צליל. אי אפשר לטעות.",

      body: [
        "נוגעים בריבוע והוא נדלק ומשמיע תו. נוגעים בעוד כמה. עכשיו לוחצים על הנגן.",

        "לוח של שמונה פעימות מחזיק 281,474,976,710,656 מנגינות שונות, כי כל אחד מ-48 הריבועים שבו דלוק או כבוי בנפרד. זו ספירה מדויקת ולא הערכה. וכל אחת מהן נשמעת טוב, וגם את זה בדקנו: ששת התווים שעל הלוח הם סולם פנטטוני, ובין 15 הזוגות שאפשר להרכיב מהם אין אף חצי טון ואין אף טריטון. שני התווים הקרובים ביותר רחוקים זה מזה טון שלם. לכן אין כאן שום חוק על איזה תו מותר אחרי איזה, ואפשר להדליק עמודה שלמה בבת אחת בלי שאף אחד יעווה פנים.",

        "כפתור ההפתעה מדליק תו אחד בכל פעימה, כלומר מנגינה. בלוח הארוך הוא מגיע ל-1,679,616 מנגינות שונות, ומשם ממשיכים ביד. בלוח הקצר יש לו רק 1,296, אז מי שלוחץ עליו שוב ושוב יתחיל לפגוש חזרות די מהר.",

        "וההודאה, והיא כתובה בקוד ולא בדעה: השיא סופר תווים ולא איכות. המספר הגדול ביותר שאפשר להגיע אליו הוא 48, כלומר להדליק כל ריבוע על הלוח הארוך, וזה קיר של צליל ולא מנגינה. אז המספר הזה מתגמל עמוס על פני יפה. ידענו ובחרנו בו: הדרך היחידה למדוד איכות היא לשפוט את מה שילד הרגע עשה, וזו בדיוק הסיבה שלמשחק הצביעה שלנו אין שיא בכלל.",

        "והחלפת אורך לא מוחקת כלום. הלוח מתרחב או מתכווץ והתווים נשארים איפה שהיו, כי מנגינה היא דבר שמישהו הכין ולא לוח שצריך לחלק מחדש. קיצור משמונה פעימות לארבע משאיר בערך מחצית מהתווים.",
      ],

      howToPlay: [
        { title: "מדליקים ריבועים", body: "כל שורה היא תו אחר. למעלה גבוה, למטה נמוך, וכל שורה בצבע משלה." },
        { title: "לוחצים על הנגן", body: "המנגינה רצה משמאל לימין וחוזרת מהתחלה, שוב ושוב, עד שעוצרים." },
        { title: "מחליפים צליל", body: "שלושה כפתורים: עגול, רך ובהיר. אותה מנגינה נשמעת אחרת לגמרי." },
        { title: "מבקשים הפתעה", body: "כפתור הניצוץ מחלק מנגינה מוכנה, תו אחד בכל פעימה, ומשם עורכים." },
        { title: "מאריכים או מקצרים", body: "ארבע, שש או שמונה פעימות. התווים שנכנסים באורך החדש נשארים." },
      ],

      tips: [
        {
          title: "התחילו מהפתעה",
          body: "לוח ריק הוא לא הזמנה. מנגינה מוכנה שאפשר לשנות בה תו אחד היא נקודת פתיחה הרבה יותר נדיבה, במיוחד לילד קטן.",
        },
        {
          title: "עמודה שלמה זו אקורד",
          body: "כמה תווים באותה פעימה מתנגנים ביחד, ובסולם הזה זה תמיד עובד. שווה לנסות עמודה אחת עמוסה ליד שלוש דלילות.",
        },
        {
          title: "השאירו חורים",
          body: "פעימה ריקה נשמעת. מנגינה שבה כל פעימה מלאה הופכת לרעש אחיד, ודווקא השקטים הם מה שנותן לה צורה.",
        },
        {
          title: "אותה מנגינה, שלוש פעמים",
          body: "לפני שמשנים תו, החליפו צליל והאזינו שוב. אותם ריבועים בדיוק נשמעים כמו תיבת נגינה, כמו חליל או כמו צעצוע ישן.",
        },
      ],

      teaches: [
        {
          title: "גובה צליל",
          body: "השורה גבוהה יותר, התו גבוה יותר. הקשר הזה נראה לעין לפני שהוא נשמע, וילד קולט אותו בלי שאף אחד יסביר.",
        },
        {
          title: "קצב ומחזור",
          body: "הלולאה חוזרת על אותן פעימות בדיוק. זו הפעם הראשונה שהרבה ילדים שומעים תבנית מוזיקלית חוזרת שהם עצמם קבעו.",
        },
        {
          title: "סיבה ותוצאה",
          body: "ריבוע אחד נדלק, וצליל אחד נוסף. אין כאן שום דבר סמוי שקורה בין הנגיעה לתוצאה.",
        },
        {
          title: "לעשות בלי להיבחן",
          body: "אין תשובה נכונה במסך הזה. זה נדיר, וזה מה שגורם לילדים לנסות דברים שהם לא היו מנסים במשחק שסופר טעויות.",
        },
      ],

      ages: [
        {
          title: "2 עד 3",
          body: "הריבועים משמיעים צליל בנגיעה, וזה כל מה שצריך. ארבע פעימות זה לוח קטן ונוח לאצבע.",
        },
        {
          title: "4 עד 5",
          body: "כאן מתחילים להאזין ואז לשנות. כפתור ההפתעה ואחריו שינוי של תו אחד הוא בדיוק הצעד הזה.",
        },
        {
          title: "6 ומעלה",
          body: "שמונה פעימות ועמודות עמוסות. מי שרוצה משימה: לבנות מנגינה שאפשר לזהות בה חלק שחוזר.",
        },
        {
          title: "מבוגרים",
          body: "48 ריבועים ושלושה צלילים זה יותר ממה שנשמע. הסולם מבטיח שכל ניסיון יישמע סביר.",
        },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד גם עם אמצעי קלט חלופיים וגם עם יד קטנה שעדיין לא מדייקת. אין שעון, אין ספירה לאחור ואין רגע שדורש תגובה מהירה. כל ריבוע נושא תווית עם מספר הפעימה שלו ועם המצב שלו, דלוק או כבוי, כך שקורא מסך מבחין בין 48 ריבועים במקום להקריא אותו דבר 48 פעמים. כאן צריך לומר דבר אחד בכנות: זה משחק שעושה צליל, אז בלי שמע הולך חלק ממנו. השורה קובעת את הצבע, וגובה הריבוע על המסך קובע את גובה הצליל, כך שהמנגינה נראית גם כשלא שומעים אותה, אבל היא לא נשמעת. הלולאה גם עוצרת לבד כשעוברים ללשונית אחרת.",

      together: [
        {
          title: "תור לכל אחד",
          body: "מדליקים ריבוע אחד כל אחד, בלי לתכנן, ומאזינים אחרי כל שלושה. יוצא משהו שאף אחד מכם לא היה כותב לבד.",
        },
        {
          title: "לזהות את השינוי",
          body: "אחד מכם מחליף תו אחד בזמן שהשני עוצם עיניים ומקשיב. מי שניחש איזה, מחליף תפקיד.",
        },
        {
          title: "לשיר עם זה",
          body: "הלולאה חוזרת בקצב קבוע, אז אפשר לשיר מעליה. שם המנגינה מפסיקה להיות משחק ומתחילה להיות שיר.",
        },
        {
          title: "לתת לה שם",
          body: "כשמנגינה יוצאת טוב, תנו לה שם. ילד שקרא למנגינה שלו בשם חוזר אליה מחר.",
        },
      ],

      faq: [
        {
          q: "אפשר לנגן משהו לא נכון?",
          a: "לא, ואין דרך. ששת התווים מגיעים מסולם פנטטוני, שאין בו חצי טון ואין בו טריטון, אז כל צירוף שלהם נשמע מסתדר. גם עמודה עם שישה תווים ביחד.",
        },
        {
          q: "המנגינה שלי נשמרת?",
          a: "כן, על המכשיר. חוזרים ומוצאים אותה בדיוק כמו שהשארתם, כולל הצליל שבחרתם. מנגינה אחת שמורה לכל אורך.",
        },
        {
          q: "מה קורה למנגינה כשמשנים אורך?",
          a: "היא נשארת. הלוח מתרחב או מתכווץ והתווים לא זזים, וזה שונה מכל משחק אחר אצלנו בכוונה. קיצור משמונה לארבע פעימות משאיר בערך מחצית מהתווים.",
        },
        {
          q: "כמה מנגינות אפשר להרכיב?",
          a: "281,474,976,710,656 בלוח של שמונה פעימות, כי 48 ריבועים דלוקים או כבויים בנפרד. כפתור ההפתעה לבדו מגיע ל-1,679,616 מהן.",
        },
        {
          q: "איך מרוויחים מטבעות?",
          a: "מטבע על כל שישה תווים שהמנגינה גדלה בהם. מחיקת תווים לא לוקחת מטבע שכבר ניתן, והוספה חוזרת של אותם תווים לא משלמת פעמיים.",
        },
        {
          q: "אפשר להקליט או להוריד את המנגינה?",
          a: "לא כרגע. המנגינה מתנגנת ונשמרת במכשיר, ואין דרך לייצא אותה כקובץ.",
        },
        {
          q: "למה יש רק שלושה צלילים?",
          a: "כי שלושה כפתורים נכנסים בתחתית מסך של טלפון בגודל שאצבע קטנה פוגעת בו. רשימה ארוכה הייתה דורשת גלילה, וזה כבר לא צעצוע.",
        },
        { q: "המשחק חינמי?", a: "כן. בלי תשלום, בלי רכישות בתוך המשחק, ובלי גרסה מורחבת שעולה כסף." },
        { q: "יש פרסומות?", a: "אין. שום באנר ושום סרטון." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. זה רץ בדפדפן, ואחרי ביקור אחד הוא נשמר במכשיר ועובד גם בלי קליטה.",
        },
        {
          q: "איך השיא נמדד?",
          a: "במספר התווים שבמנגינה הגדולה ביותר שנבנתה, בנפרד לכל אורך. הוא מודד כמה נעשה ולא כמה זה יפה, וזו החלטה ולא הזנחה.",
        },
      ],

      keywords: ["מוזיקה", "יצירה", "מנגינה", "לגיל הרך", "בלי הפסד", "צלילים"],
    },

    en: {
      metaTitle: "Music Box - Free Kids Music Maker | Ellaz",
      metaDescription:
        "A free music game in your browser. Light up squares on a grid, press play, and your tune loops. Three sounds to choose from, no timer, nothing to get wrong.",

      lede: "A free music toy that runs in your browser. A grid of coloured squares, six rows of notes and anywhere from four to eight beats. Tap squares to build a tune, press play and it loops. Swap the sound whenever you like. There is no wrong answer on this screen.",

      body: [
        "Tap a square. It lights up and plays a note. Tap a few more. Press play. What you made comes round again every couple of seconds until you stop it.",

        "An eight-beat grid holds 281,474,976,710,656 different tunes, because each of its 48 squares is on or off independently of the rest. That is a count rather than an estimate. And every one of those tunes sounds fine, which is also checkable rather than a promise: the six notes on the grid are a pentatonic scale, and across all 15 pairs you can make from them there is no semitone anywhere and no tritone anywhere. The closest two notes sit a whole tone apart. That is why nothing here needs a rule about which note may follow which, and why you can light a whole column at once and still have somebody nod along.",

        "The surprise button lights one note per beat. A melody, then. It reaches 1,679,616 of them on the long grid, and you carry on by hand from wherever it drops you.",

        "Now the honest bit, and it is in the code rather than in an opinion. The record counts notes and never quality. Busy beats pretty. The biggest number anybody can reach is 48, which means every square lit on the long grid, and that is a wall of sound rather than a tune. So the number rewards busy over good, and we knew that when we chose it. The only way to measure quality is to sit in judgement on the thing a child has just made, which is exactly the reason our colouring game keeps no record at all.",
      ],

      howToPlay: [
        { title: "Light some squares", body: "Every row is a different note. High at the top, low at the bottom, one colour each." },
        { title: "Press play", body: "The tune runs left to right and starts again, over and over, until you stop it." },
        { title: "Change the sound", body: "Three buttons: round, soft and bright. The same tune arrives sounding like a different toy." },
        { title: "Ask for a surprise", body: "The sparkle button deals a ready-made melody, one note per beat, and you edit from there." },
        { title: "Make it longer", body: "Four, six or eight beats. Notes that still fit in the new length stay exactly where they were." },
      ],

      tips: [
        {
          title: "Start with a surprise",
          body: "A blank grid is not an invitation. A ready melody you can change one note of is a far kinder place to start, especially for somebody small.",
        },
        {
          title: "A column is a chord",
          body: "Several notes on the same beat ring together, and in this scale that always works. Try one crowded column beside three sparse ones.",
        },
        {
          title: "Leave gaps",
          body: "An empty beat is audible. A tune with something on every beat flattens into noise, and the silences are what give it a shape.",
        },
        {
          title: "Same tune, three ways",
          body: "Before you change a note, change the voice and listen again. Those identical squares can sound like a music box, a flute or an old toy.",
        },
      ],

      teaches: [
        {
          title: "Pitch",
          body: "Higher row, higher note. That link is visible before it is audible, and a child picks it up with nobody explaining it.",
        },
        {
          title: "Pulse and repetition",
          body: "The loop comes back to the same beats every time. For a lot of children this is the first musical pattern they set themselves.",
        },
        {
          title: "Cause and effect",
          body: "One square on, one more note. Nothing hidden happens between the tap and the result.",
        },
        {
          title: "Making without being marked",
          body: "There is no right answer on this screen. That is rare, and it is what gets children trying things they would never try in a game that counts mistakes.",
        },
      ],

      ages: [
        { title: "2 to 3", body: "The squares make a sound when touched, and that is enough. Four beats keeps the grid small and finger-friendly." },
        { title: "4 to 5", body: "Where listening and then changing something begins. Surprise, then move one note, is exactly that step." },
        { title: "6 and up", body: "Eight beats and crowded columns. For a challenge: build a tune with a part you can hear coming back." },
        { title: "Grown-ups", body: "Forty-eight squares and three voices go further than they look, and the scale means every experiment lands somewhere reasonable." },
      ],

      accessibility:
        "One tap per action, with no dragging and no press-and-hold, so it works with alternative input devices and with a small hand that does not aim well yet. There is no clock, no countdown and no moment that has to be answered quickly. Every square is labelled with its beat number and whether it is on or off, so a screen reader can tell forty-eight of them apart instead of reading the same thing forty-eight times. One thing has to be said plainly here: this is a game that makes a sound, so without hearing, part of it is gone. The row sets the colour and the height of a square on screen sets the pitch, so a tune can be seen as well as heard, but it cannot be heard by looking. The loop also stops on its own when the tab goes away.",

      together: [
        {
          title: "A square each",
          body: "Take turns lighting one square with no plan at all, and listen after every third. What comes out is something neither of you would have written.",
        },
        {
          title: "Spot the change",
          body: "One of you moves a single note while the other closes their eyes and listens. Guess which one, then swap over.",
        },
        {
          title: "Sing over it",
          body: "The loop keeps steady time, so you can sing on top of it. That is where a tune stops being a game and starts being a song.",
        },
        {
          title: "Give it a name",
          body: "When one comes out well, name it. A child who has named their tune comes back to it tomorrow.",
        },
      ],

      faq: [
        {
          q: "Can you play something wrong?",
          a: "No, and there is no way to. The six notes come from a pentatonic scale, which contains no semitone and no tritone, so any combination of them agrees with itself. A column of all six included.",
        },
        {
          q: "Does my tune get saved?",
          a: "Yes, on the device. Come back and it is exactly as you left it, chosen sound and all. One tune is kept per length.",
        },
        {
          q: "What happens to my tune when I change the length?",
          a: "It survives. The grid grows or shrinks and the notes stay put, which is deliberately unlike every other game here. Going from eight beats down to four keeps about half of them.",
        },
        {
          q: "How many tunes are possible?",
          a: "281,474,976,710,656 on an eight-beat grid, because 48 squares are each on or off. The surprise button on its own reaches 1,679,616 of those.",
        },
        {
          q: "How do you earn coins?",
          a: "One coin for every six notes the tune grows by. Erasing does not take back a coin already given, and re-adding the same notes does not pay twice.",
        },
        {
          q: "Can I record or download the tune?",
          a: "Not at the moment. It plays and it is stored on the device, and there is no way to export it as a file.",
        },
        {
          q: "Why only three sounds?",
          a: "Because three buttons fit across the bottom of a phone at a size a small finger can hit. A longer list would need scrolling, and then it stops being a toy.",
        },
        { q: "Is it free?", a: "Yes. No payment, nothing to buy inside the game, and no larger paid edition." },
        { q: "Are there ads?", a: "None. No banners, and nothing that plays in between." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works with no signal.",
        },
        {
          q: "How is the record measured?",
          a: "By how many notes are in the biggest tune built, kept separately for each length. It measures how much was made rather than how good it is, and that is a decision rather than an oversight.",
        },
      ],

      keywords: ["music maker", "tune", "creative", "preschool", "no losing", "sounds"],
    },

    es: {
      metaTitle: "Caja de música - juego de crear gratis | Ellaz",
      metaDescription:
        "Juego de música gratis en el navegador. Enciendes cuadros en una rejilla, pulsas play y tu melodía suena en bucle. Tres sonidos, sin reloj y sin equivocarse.",

      lede: "Un juguete musical gratuito que funciona en el navegador. Una rejilla de cuadros de colores, seis filas de notas y de cuatro a ocho tiempos. Enciendes cuadros, pulsas play y lo que has hecho suena en bucle. El sonido se cambia cuando quieras. En esta pantalla no existe la respuesta equivocada.",

      body: [
        "Tocas un cuadro, se enciende y suena una nota. Enciendes unos cuantos más. Ahora pulsa play.",

        "Una rejilla de ocho tiempos guarda 281.474.976.710.656 melodías distintas, porque cada uno de sus 48 cuadros está encendido o apagado por separado. Eso es una cuenta exacta y no una estimación. Y todas suenan bien, cosa que también se comprueba en lugar de prometerse: las seis notas de la rejilla forman una escala pentatónica, y entre los 15 pares que se pueden armar con ellas no hay ni un semitono ni un tritono. Las dos notas más próximas están a un tono entero. Por eso aquí no hace falta ninguna regla sobre qué nota puede seguir a cuál, y se puede encender una columna entera de golpe sin que nadie tuerza el gesto.",

        "El botón de la sorpresa enciende una nota por tiempo. Una melodía, pues. En la rejilla larga alcanza 1.679.616 melodías distintas; en la corta solo 1.296, así que pulsarlo muchas veces seguidas empieza a repetir enseguida.",

        "Y la parte honesta, que está en el código y no en una opinión: el récord cuenta notas y nunca calidad. El número más alto al que se puede llegar es 48, es decir encender cada cuadro de la rejilla larga, y eso es un muro de sonido antes que una melodía. De modo que ese número premia lo cargado por encima de lo bonito. Lo sabíamos al elegirlo. La única forma de medir la calidad es juzgar lo que un niño acaba de hacer, y esa es exactamente la razón de que nuestro juego de colorear no lleve ningún récord.",

        "Cambiar de longitud no borra nada. La rejilla se estira o se encoge y las notas siguen donde estaban, porque una melodía es algo que alguien hizo. Pasar de ocho tiempos a cuatro conserva alrededor de la mitad.",
      ],

      howToPlay: [
        { title: "Enciende cuadros", body: "Cada fila es una nota distinta. Arriba agudo, abajo grave, y un color por fila." },
        { title: "Pulsa play", body: "La melodía va de izquierda a derecha y vuelve a empezar, una y otra vez, hasta que la paras." },
        { title: "Cambia el sonido", body: "Tres botones: redondo, suave y brillante. La misma melodía llega sonando a otro juguete." },
        { title: "Pide una sorpresa", body: "El botón del destello reparte una melodía hecha, una nota por tiempo, y desde ahí se edita." },
        { title: "Alárgala", body: "Cuatro, seis u ocho tiempos. Las notas que caben en la longitud nueva se quedan donde estaban." },
      ],

      tips: [
        {
          title: "Empieza por la sorpresa",
          body: "Una rejilla vacía no invita a nada. Una melodía hecha a la que cambiar una sola nota es un punto de partida mucho más generoso para alguien pequeño.",
        },
        {
          title: "Una columna es un acorde",
          body: "Varias notas en el mismo tiempo suenan juntas, y en esta escala eso siempre funciona. Prueba una columna cargada al lado de tres sueltas.",
        },
        {
          title: "Deja huecos",
          body: "Un tiempo vacío se oye. Una melodía con algo en cada tiempo se aplana hasta volverse ruido, y los silencios son lo que le da forma.",
        },
        {
          title: "La misma melodía, tres veces",
          body: "Antes de cambiar una nota, cambia la voz y vuelve a escuchar. Esos cuadros idénticos suenan a caja de música, a flauta o a juguete viejo.",
        },
      ],

      teaches: [
        {
          title: "Altura del sonido",
          body: "Fila más alta, nota más aguda. El vínculo se ve antes de oírse, y un niño lo capta sin que nadie se lo explique.",
        },
        {
          title: "Pulso y repetición",
          body: "El bucle vuelve siempre a los mismos tiempos. Para muchos niños es el primer patrón musical que deciden ellos.",
        },
        {
          title: "Causa y efecto",
          body: "Un cuadro encendido, una nota más. No ocurre nada oculto entre el toque y el resultado.",
        },
        {
          title: "Crear sin nota",
          body: "En esta pantalla no hay respuesta correcta. Es raro, y es lo que hace que un niño pruebe cosas que no probaría donde se cuentan los fallos.",
        },
      ],

      ages: [
        { title: "2 a 3", body: "Los cuadros suenan al tocarlos, y con eso basta. Cuatro tiempos mantienen la rejilla pequeña y cómoda para el dedo." },
        { title: "4 a 5", body: "Aquí empieza lo de escuchar y luego cambiar algo. Sorpresa y después mover una nota es justo ese paso." },
        { title: "6 en adelante", body: "Ocho tiempos y columnas cargadas. Como reto: una melodía con una parte que se reconozca al volver." },
        { title: "Adultos", body: "Cuarenta y ocho cuadros y tres voces dan más de sí de lo que parece, y la escala hace que cualquier prueba caiga de pie." },
      ],

      accessibility:
        "Un toque por acción, sin arrastrar y sin mantener pulsado, así que funciona con dispositivos de entrada alternativos y con una mano pequeña que todavía no apunta bien. No hay reloj, ni cuenta atrás, ni un momento que haya que responder deprisa. Cada cuadro lleva en la etiqueta su número de tiempo y si está encendido o apagado, así que un lector de pantalla distingue los cuarenta y ocho en vez de repetir lo mismo cuarenta y ocho veces. Aquí hay que decir una cosa con claridad: este es un juego que hace ruido, de modo que sin oído se pierde una parte. La fila decide el color y la altura del cuadro en la pantalla decide la altura del sonido, así que una melodía se ve además de oírse, pero mirándola no se oye. El bucle también se detiene solo al cambiar de pestaña.",

      together: [
        {
          title: "Un cuadro cada uno",
          body: "Por turnos, encended un cuadro sin planear nada y escuchad cada tres. Sale algo que ninguno de los dos habría escrito.",
        },
        {
          title: "Adivina el cambio",
          body: "Uno mueve una sola nota mientras el otro cierra los ojos y escucha. Quien acierte cuál, cambia de papel.",
        },
        {
          title: "Cantad encima",
          body: "El bucle lleva un tiempo constante, así que se puede cantar por encima. Ahí la melodía deja de ser un juego y empieza a ser una canción.",
        },
        {
          title: "Ponedle nombre",
          body: "Cuando una salga bien, dadle nombre. Un niño que ha bautizado su melodía vuelve a ella mañana.",
        },
      ],

      faq: [
        {
          q: "¿Se puede tocar algo mal?",
          a: "No, y no hay manera. Las seis notas vienen de una escala pentatónica, que no tiene ni semitonos ni tritonos, así que cualquier combinación se entiende consigo misma. También una columna con las seis.",
        },
        {
          q: "¿Se guarda mi melodía?",
          a: "Sí, en el aparato. Vuelves y está tal cual la dejaste, con el sonido que elegiste. Se guarda una melodía por longitud.",
        },
        {
          q: "¿Qué le pasa a la melodía si cambio la longitud?",
          a: "Sobrevive. La rejilla crece o encoge y las notas no se mueven, cosa que a propósito no ocurre en ningún otro juego nuestro. De ocho tiempos a cuatro se conserva más o menos la mitad.",
        },
        {
          q: "¿Cuántas melodías se pueden hacer?",
          a: "281.474.976.710.656 en una rejilla de ocho tiempos, porque son 48 cuadros encendidos o apagados por separado. El botón de la sorpresa por sí solo llega a 1.679.616.",
        },
        {
          q: "¿Cómo se ganan monedas?",
          a: "Una moneda por cada seis notas que crece la melodía. Borrar no retira una moneda ya dada, y volver a poner esas notas no paga dos veces.",
        },
        {
          q: "¿Se puede grabar o descargar la melodía?",
          a: "Ahora mismo no. Suena y queda guardada en el aparato, y no hay forma de exportarla como archivo.",
        },
        {
          q: "¿Por qué solo tres sonidos?",
          a: "Porque tres botones caben abajo en un móvil a un tamaño que un dedo pequeño acierta. Una lista larga pediría desplazamiento, y entonces deja de ser un juguete.",
        },
        { q: "¿Es gratis?", a: "Sí. Sin pagos, sin compras dentro del juego y sin una edición de pago más grande." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada que se reproduzca en medio." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, tras una visita, queda guardado en el aparato y va sin cobertura.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por cuántas notas tiene la melodía más grande construida, guardado aparte para cada longitud. Mide cuánto se hizo y no lo bueno que es, y eso es una decisión y no un descuido.",
        },
      ],

      keywords: ["música", "crear", "melodía", "infantil", "sin perder", "sonidos"],
    },
  },

  provenance: [
    {
      claim: "an eight-beat grid holds 281,474,976,710,656 different tunes across its 48 squares",
      source: "scripts/sim/music-tunes.mjs",
    },
    {
      claim: "the surprise button reaches 1,679,616 melodies on the long grid and 1,296 on the short one",
      source: "scripts/sim/music-tunes.mjs",
    },
    {
      claim:
        "15 pairs of notes, none a semitone apart and none a tritone, the closest two a whole tone apart",
      source: "scripts/sim/music-tunes.mjs",
    },
    {
      claim: "shortening an eight-beat tune to four keeps about half of its notes",
      source: "scripts/sim/music-tunes.mjs",
    },
    {
      claim: "48 squares is the largest record possible, and a full grid is worth 8 coins",
      source: "scripts/sim/music-tunes.mjs",
    },
    {
      claim: "six rows of notes, four to eight beats, and a coin every six notes",
      source: "src/games/music/logic.ts",
    },
    {
      claim: "resizing keeps every note that still fits rather than dealing a fresh grid",
      source: "src/games/music/logic.ts",
    },
    {
      claim: "three voices, one row colour per note, and every square labelled by beat and state",
      source: "src/games/music/MusicGame.tsx",
    },
    {
      claim: "the record is points, where more is better, scoped per length",
      source: "src/sdk/score.ts",
    },
  ],
};
