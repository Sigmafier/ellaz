import type { GameContent } from "../types";

/**
 * My Pet - the care toy whose selling point is a NEGATIVE: there is nothing in
 * the rules that can go wrong. No hunger that rises, no sadness that sets in,
 * no clock the creature can read, and no tap that gets refused.
 *
 * That is what the numbers below are for. "It cannot fail" is a promise, and a
 * promise is worth nothing on a page; "three bots, 320,541 simulated taps, not
 * one of them refused" is a measurement. `scripts/sim/pet-growing.mjs` drives
 * the shipped reducer, so the counts describe the creature a child raises
 * rather than my reading of the code.
 *
 * The three languages are written, not translated. Hebrew runs five paragraphs,
 * English four and Spanish five, they open differently and they make different
 * asides, because a translation carries the source language's rhythm and that
 * rhythm is exactly what reads as machine-made.
 *
 * See `provenance` at the bottom for where each figure comes from.
 */
export const pet: GameContent = {
  id: "pet",

  copy: {
    he: {
      name: "החיה שלי",
      metaTitle: "החיה שלי - משחק טיפוח חינם | Ellaz",
      metaDescription:
        "משחק טיפוח חינמי בדפדפן. בוחרים יצור, מאכילים ורוחצים ומשחקים איתו, והוא גדל דרך חמישה גדלים. אי אפשר להיכשל, והוא אף פעם לא רעב ולא עצוב.",

      lede: "משחק טיפוח חינם בדפדפן. בוחרים אחד משלושה יצורים משלנו ומטפלים בו: אוכל, אמבטיה, משחק וחיבוק. הוא מבקש דברים בבועת מחשבה, וכל נגיעה משמחת אותו. אין שעון, ואי אפשר להפסיד.",

      body: [
        "נוגעים בכפתור, והיצור נהנה. זהו. אין כאן נגיעה שגויה.",

        "בבועה מעל הראש מופיע מה שהיצור רוצה עכשיו, ונגיעה בכפתור התואם שווה שלוש נקודות אכפתיות במקום אחת. משם הכול חשבון. הגודל החמישי והאחרון דורש 80 נקודות, אז מי שנותן ליצור בכל פעם בדיוק את מה שביקש מגיע לשם ב-27 נגיעות. הרצנו את הכללים האמיתיים של המשחק על שלושה בוטים, אלפיים ריצות לכל אחד, כדי לראות מה קורה כשאף אחד לא ממש שם לב. בוט שנוגע באקראי באחד מארבעה כפתורים קולע לבקשה ב-24.9 אחוז מהמקרים ומסיים ב-53.8 נגיעות. בוט שלא מסתכל על הבועה בכלל, רק מלטף את היצור שוב ושוב, מסיים ב-79.5. איטי יותר. גם הוא הגיע לגודל המלא, וגם הוא אסף בדרך שבעה מטבעות.",

        "היצור לא יכול לחלות, להתעצב או להיות רעב, והוא גם לא יודע שעבר שבוע. זה לא כיוונון שאפשר להזיז אחר כך אלא הדרך שבה הקוד בנוי: קובץ הכללים לא קורא שעון ולא מתזמן שום דבר, אז אין מנגנון שדרכו הוא יכול להיות זקוק למשהו בזמן שהילד בגן. משחק שמעניש ילד בן חמש על טאבלט שהוא לא שולט בו הוא לא משחק חמים.",

        "וההודאה, כי כדאי לדעת אותה מראש: הגדילה נגמרת. בגודל החמישי היצור מפסיק להשתנות, הפס מתחתיו נשאר מלא, והנגיעות ממשיכות להיספר לשיא בלי ששום דבר חדש מופיע על המסך. אפשר להתחיל את אותו יצור מהתחלה ולגדל אותו שוב, אבל פרס על גדילה לא ניתן פעמיים.",

        "השיא הוא הגודל הכי גדול שהיצור הזה הגיע אליו אי פעם, בנפרד לכל אחד משלושת היצורים. מספר שרק עולה. הכול נשמר על המכשיר עצמו.",
      ],

      howToPlay: [
        { title: "בוחרים יצור", body: "פיפ, מו או טולי. כל אחד גדל בנפרד ושומר את הגודל שלו." },
        { title: "מסתכלים על הבועה", body: "התמונה שבתוכה היא מה שהיצור רוצה עכשיו. הכפתור התואם מסומן בטבעת." },
        { title: "נוגעים בכפתור", body: "אוכל, אמבטיה, משחק או חיבוק. נגיעה ביצור עצמו היא גם היא חיבוק." },
        { title: "רואים אותו גדל", body: "הפס שמתחתיו מתמלא. כשהוא מלא היצור גדל ומקבל חלק חדש בציור." },
        { title: "חוזרים מתי שרוצים", body: "הכול מחכה בדיוק כמו שהשארתם. שום דבר לא קורה בזמן שאתם בחוץ." },
      ],

      tips: [
        {
          title: "תנו לו את מה שביקש",
          body: "שלוש נקודות במקום אחת, ובועה חדשה מיד אחריה. זה ההבדל בין 27 נגיעות לבין כמעט 80.",
        },
        {
          title: "אבל אל תילחצו מזה",
          body: "נגיעה שלא קלעה לא לוקחת כלום ולא מאטה כלום מלבד הקצב. היצור נהנה ממנה בדיוק אותו דבר, ולכן אין כאן על מה לריב.",
        },
        {
          title: "יצור אחד עד הסוף",
          body: "לפזר אכפתיות בין שלושתם זו שלוש התחלות במקום סיום אחד. עדיף להביא אחד לגודל החמישי ורק אז לפתוח את הבא.",
        },
        {
          title: "בועה שלא מתחלפת",
          body: "הבקשה מתחלפת רק כשנותנים ליצור את מה שרצה. בועה שנשארה על אותה תמונה אומרת שאף נגיעה עוד לא קלעה.",
        },
      ],

      teaches: [
        {
          title: "לשים לב למישהו אחר",
          body: "הבועה אומרת מה היצור רוצה, לא מה הילד רוצה. זה תרגיל קטן ויומיומי בלשים לב.",
        },
        {
          title: "סיבה ותוצאה",
          body: "נגיעה מזיזה את הפס, והפס מביא גודל חדש. הקשר גלוי לגמרי ולוקח שנייה להבין אותו.",
        },
        {
          title: "התמדה בלי לחץ",
          body: "80 נקודות זה הרבה נגיעות. אף אחד לא ממהר, אז ילד רואה שדבר גדל לאט ובכל זאת גדל.",
        },
        {
          title: "התאמת צורות",
          body: "התמונה בבועה והתמונה על הכפתור זהות. ילד שעדיין לא קורא מוצא את ההתאמה הזאת בעצמו.",
        },
      ],

      ages: [
        {
          title: "2 עד 3",
          body: "הגיל שהמשחק הזה נבנה בשבילו. אין מה לקרוא, אין מה להפסיד, וכל נגיעה עונה משהו נחמד.",
        },
        {
          title: "4 עד 5",
          body: "כאן מתחילים לשים לב לבועה. הגודל השני מגיע אחרי שלוש נגיעות מדויקות, וזה מהר מספיק כדי להרגיש את הקשר.",
        },
        {
          title: "6 ומעלה",
          body: "מטרה: להביא את שלושת היצורים לגודל החמישי. זה 81 נגיעות מדויקות, ולא מעט סבלנות.",
        },
        {
          title: "מבוגרים",
          body: "משחק להניח עליו יד באמצע שיחה. אין בו רגע אחד שדורש תשומת לב מיידית.",
        },
      ],

      accessibility:
        "נגיעה אחת לכל פעולה, בלי גרירה ובלי החזקה ממושכת, כך שהמשחק עובד עם אמצעי קלט חלופיים ועם יד קטנה שעדיין לא מדייקת. ארבעת הכפתורים גדולים בכוונה, לפחות 2 על 2 סנטימטרים בכל מסך, וגם היצור עצמו הוא כפתור. אין מילה שחייבים לקרוא: הבקשה מופיעה כתמונה בתוך הבועה, ואותה תמונה יושבת על הכפתור המתאים עם טבעת סביבו. אין שעון ואין ספירה לאחור, ושום דבר כאן לא דורש תגובה מהירה. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        {
          title: "מי מנחש את הבועה",
          body: "לפני שנוגעים, שאלו מה היצור רוצה עכשיו. ילד קטן עונה על זה באצבע, וזה כבר משחק שלם.",
        },
        {
          title: "נגיעה לכל אחד",
          body: "בתורות. פתאום כל בקשה נהיית שיחה קצרה על מה שמישהו אחר צריך.",
        },
        {
          title: "שם משלכם",
          body: "לפיפ, למו ולטולי יש שמות, ואף אחד לא מחייב אתכם להשתמש בהם. ילד שנתן שם משלו מספר עליו אחר כך.",
        },
        {
          title: "לספר מה קרה לו היום",
          body: "היצור לא זוכר כלום, אז הסיפור כולו שלכם. מה הוא אכל, איפה היה, ולמה הוא רטוב.",
        },
      ],

      faq: [
        {
          q: "החיה יכולה למות או להיות עצובה?",
          a: "לא, ואין דרך לגרום לזה. אין רעב שעולה ואין מחלה, ושום דבר רע לא קורה כשיוצאים מהמשחק.",
        },
        {
          q: "מה קורה אם לא נכנסים שבוע?",
          a: "כלום. היצור נשאר בדיוק בגודל שהשארתם אותו, כי לכללי המשחק אין שום דרך לדעת שעבר זמן.",
        },
        {
          q: "כמה נגיעות לוקח לגדל אותו עד הסוף?",
          a: "27 למי שנותן לו בכל פעם את מה שביקש. 53.8 בממוצע בנגיעות אקראיות, ו-79.5 למי שלא מסתכל על הבועה בכלל. כל השלוש מגיעות לגודל המלא.",
        },
        {
          q: "מה קורה כשהוא מגיע לגודל האחרון?",
          a: "הוא מפסיק להשתנות. הנגיעות ממשיכות להיספר לשיא ומטבעות ממשיכות להגיע, אבל אין גודל שישי ואין ציור חדש לראות.",
        },
        {
          q: "אפשר לטעות?",
          a: "לא. בכל 320,541 הנגיעות שהרצנו בסימולציה אף אחת לא נדחתה. נגיעה שלא תואמת את הבקשה פשוט שווה פחות.",
        },
        {
          q: "כמה חיות יש?",
          a: "שלוש: פיפ, מו וטולי. כל אחת גדלה בנפרד ושומרת שיא משלה, אז אפשר לגדל אחת ולהשאיר את השתיים לפעם אחרת.",
        },
        { q: "המשחק חינמי?", a: "כן. אין תשלום, אין רכישות בתוך המשחק ואין גרסה מורחבת." },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. זה רץ בדפדפן, ואחרי ביקור אחד הוא נשמר במכשיר ועובד גם בלי קליטה.",
        },
        {
          q: "מאיזה גיל מתאים?",
          a: "משנתיים בערך. אין מילה לקרוא ואין דרך להיכשל, אז ילד שעדיין לא מדבר משחק לבד.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בגודל הכי גדול שהיצור הזה הגיע אליו אי פעם, בנפרד לכל יצור. הוא רק עולה, ואי אפשר לאבד אותו.",
        },
      ],

      keywords: ["חיית מחמד", "טיפוח", "יצור", "לגיל הרך", "משחק רגוע", "בלי הפסד"],
    },

    en: {
      name: "My Pet",
      metaTitle: "My Pet - Free Kids Pet Care Game | Ellaz",
      metaDescription:
        "A free pet care game in your browser. Pick a creature, feed it, wash it, play with it, and watch it grow through five sizes. It can never be sad or hungry.",

      lede: "A free pet game that runs in your browser. Choose one of three creatures of our own and look after it: a snack, a bath, a game, a cuddle. It asks for things in a thought bubble and it is delighted by whatever you hand it. Nothing here can go wrong.",

      body: [
        "Tap a button. The creature enjoys it. That is the whole game.",

        "The bubble over its head shows what it wants right now, and tapping the matching button is worth three points of care instead of one. Everything after that is arithmetic. The fifth and last size needs 80 points, so a child who grants every wish arrives there in 27 taps. We put the game's real rules in front of three bots, 2,000 runs each, to find out what happens when nobody is paying much attention. A bot poking one of the four buttons at random meets the wish 24.9% of the time and finishes in 53.8 taps. A bot that never looks at the bubble at all, and only ever strokes the creature, takes 79.5. Slower. It still reached full size, and it still collected seven coins along the way.",

        "The creature cannot get sick, sad or hungry, and it has no way of knowing that a week went by. That is built rather than tuned. The rules file reads no clock and schedules nothing, so there is no mechanism by which the thing could come to need something while a child is at school. A pet that punishes a five-year-old for owning a tablet they do not control is not a warm toy, and this is meant to be a warm toy.",

        "The limit, said plainly. The growing stops. At the fifth size the creature stops changing, the bar underneath it stays full, and taps carry on counting towards the record with nothing new appearing on screen. You can start that creature over and raise it again, and it is a lovely thing to do, but a growth is never paid for twice.",
      ],

      howToPlay: [
        { title: "Pick a creature", body: "Pip, Mo or Tuli. Each one grows separately and keeps its own size." },
        { title: "Read the bubble", body: "The picture inside it is what the creature wants. The matching button wears a ring." },
        { title: "Tap a button", body: "A snack, a bath, a game or a cuddle. Tapping the creature itself is a cuddle too." },
        { title: "Watch it grow", body: "The bar underneath fills up. When it is full the creature grows and the drawing gains a part." },
        { title: "Come back whenever", body: "Everything is exactly where you left it. Nothing happens while you are away." },
      ],

      tips: [
        {
          title: "Give it what it asked for",
          body: "Three points instead of one, and a fresh bubble the moment it lands. That is the difference between 27 taps and nearly 80.",
        },
        {
          title: "Do not make a thing of it",
          body: "A tap that misses the wish costs nothing and takes nothing away. It is worth less, that is all, and the creature is exactly as pleased with it.",
        },
        {
          title: "One creature at a time",
          body: "Spreading care across all three is three beginnings and no ending. Take one to the fifth size, then open the next.",
        },
        {
          title: "A bubble that will not change",
          body: "The wish only moves on when you grant it. A bubble stuck on the same picture is telling you nothing has landed yet.",
        },
      ],

      teaches: [
        {
          title: "Noticing somebody else",
          body: "The bubble says what the creature wants, not what the child wants. It is a small daily exercise in paying attention.",
        },
        {
          title: "Cause and effect",
          body: "A tap moves the bar and a full bar brings a new size. The link is completely visible and takes a second to work out.",
        },
        {
          title: "Sticking with it",
          body: "Eighty points is a lot of taps. Nobody is hurrying, so a child sees that a thing can grow slowly and still grow.",
        },
        {
          title: "Matching pictures",
          body: "The picture in the bubble and the picture on the button are the same one. A child who cannot read finds that match alone.",
        },
      ],

      ages: [
        {
          title: "2 to 3",
          body: "The age this was built for. Nothing to read, nothing to lose, and every tap answers with something nice.",
        },
        {
          title: "4 to 5",
          body: "Where the bubble starts to matter. The second size arrives after three accurate taps, which is quick enough to feel the connection.",
        },
        {
          title: "6 and up",
          body: "Give them a target: all three creatures at full size. That is 81 accurate taps and a fair bit of patience.",
        },
        {
          title: "Grown-ups",
          body: "A game to keep a hand on during a conversation. There is no moment in it that demands attention right now.",
        },
      ],

      accessibility:
        "One tap per action, with no dragging and no press-and-hold, so it works with alternative input devices and with a small hand that does not aim well yet. The four buttons are deliberately large, at least 2 by 2 centimetres on any screen, and the creature itself is a button as well. There is not a word anybody has to read: the request appears as a picture inside the bubble, and the same picture sits on the matching button with a ring around it. Nothing counts down and nothing on this screen has to be answered quickly. The whole game plays in silence without losing any information.",

      together: [
        {
          title: "Guess the bubble",
          body: "Before the tap, ask what the creature wants. A small child answers that with a finger, and that is already a game.",
        },
        {
          title: "One tap each",
          body: "Take turns. Every request becomes a short conversation about what somebody else needs.",
        },
        {
          title: "Give it your own name",
          body: "Pip, Mo and Tuli have names and nobody is asking you to use them. A child who names it themselves tells you about it later.",
        },
        {
          title: "Say what it did today",
          body: "The creature remembers nothing, so the story is entirely yours. What it ate, where it went, why it is wet.",
        },
      ],

      faq: [
        {
          q: "Can the pet die or get sad?",
          a: "No, and there is no way to make it happen. No hunger rises and no illness arrives, and leaving the game does nothing bad to it.",
        },
        {
          q: "What happens if we do not open it for a week?",
          a: "Nothing at all. The creature is exactly the size you left it, because the rules have no way of knowing that any time passed.",
        },
        {
          q: "How many taps does it take to grow it fully?",
          a: "27 if you give it what it asks for every time. 53.8 on average with random taps, and 79.5 if you never look at the bubble. All three get there.",
        },
        {
          q: "What happens once it reaches the last size?",
          a: "It stops changing. Taps go on counting towards the record and coins go on arriving, but there is no sixth size and no new drawing to see.",
        },
        {
          q: "Can you do it wrong?",
          a: "No. Across all 320,541 taps we simulated, not one was refused. A tap that does not match the wish is simply worth less.",
        },
        {
          q: "How many pets are there?",
          a: "Three: Pip, Mo and Tuli. Each grows separately and keeps its own record, so you can raise one and save the other two for another day.",
        },
        { q: "Is it free?", a: "Yes. No payment, no in-game purchases, and no bigger paid version." },
        { q: "Are there ads?", a: "None. No banners, and nothing that plays between levels." },
        {
          q: "Do I need to download or sign up?",
          a: "No. It runs in the browser, and after one visit it is stored on the device and works offline.",
        },
        {
          q: "What age is it for?",
          a: "About two and up. There is no word to read and no way to lose, so a child who cannot talk yet plays alone.",
        },
        {
          q: "How is the record measured?",
          a: "By the biggest this creature has ever grown, kept separately for each one. It only ever goes up and it cannot be taken away.",
        },
      ],

      keywords: ["pet game", "virtual pet", "creature", "preschool", "calm game", "no losing"],
    },

    es: {
      name: "Mi Mascota",
      metaTitle: "Mi Mascota - juego de cuidar gratis | Ellaz",
      metaDescription:
        "Juego de cuidar una mascota, gratis y en el navegador. Eliges una criatura, le das de comer, la bañas y juegas con ella, y crece en cinco tamaños.",

      lede: "Un juego de mascota gratuito que funciona en el navegador. Eliges una de nuestras tres criaturas y la cuidas: un bocado, un baño, un juego, un abrazo. Ella pide cosas en un globo de pensamiento y le encanta cualquier cosa que le des. Aquí nada puede salir mal.",

      body: [
        "Tocas un botón y la criatura lo disfruta. Ya está.",

        "En el globo que tiene encima aparece lo que quiere en ese momento, y tocar el botón que coincide vale tres puntos de cariño en lugar de uno. Lo demás es aritmética. El quinto tamaño, el último, pide 80 puntos, así que quien acierta siempre llega en 27 toques. Pusimos las reglas reales del juego delante de tres robots, 2.000 partidas cada uno, para ver qué pasa cuando nadie está muy atento. Uno que toca al azar uno de los cuatro botones acierta el 24,9% de las veces y termina en 53,8 toques. Otro que no mira el globo jamás, y solo acaricia a la criatura una y otra vez, tarda 79,5. Más lento. También llegó al tamaño completo, y también recogió siete monedas por el camino.",

        "La criatura no puede enfermar, entristecerse ni pasar hambre, y tampoco tiene forma de saber que ha pasado una semana. Eso está construido, no ajustado: el archivo de reglas no lee ningún reloj y no programa nada, de modo que no existe el mecanismo por el cual pudiera necesitar algo mientras el niño está en el colegio.",

        "Un juguete que castiga a un niño de cinco años por una tableta que no controla no es un juguete cariñoso.",

        "Y la parte honesta, que conviene saber antes: el crecimiento se acaba. En el quinto tamaño la criatura deja de cambiar, la barra de debajo se queda llena y los toques siguen contando para el récord sin que aparezca nada nuevo en la pantalla. Puedes empezar esa misma criatura de cero y criarla otra vez, pero un crecimiento no se paga dos veces.",
      ],

      howToPlay: [
        { title: "Elige criatura", body: "Pip, Mo o Tuli. Cada una crece por su cuenta y guarda su propio tamaño." },
        { title: "Mira el globo", body: "El dibujo de dentro es lo que quiere ahora. El botón que coincide lleva un aro." },
        { title: "Toca un botón", body: "Comida, baño, juego o abrazo. Tocar a la criatura también es un abrazo." },
        { title: "Míra cómo crece", body: "La barra de abajo se llena. Cuando está llena, la criatura crece y el dibujo gana una parte." },
        { title: "Vuelve cuando quieras", body: "Todo sigue igual que lo dejaste. Mientras no estás, no pasa nada." },
      ],

      tips: [
        {
          title: "Dale lo que ha pedido",
          body: "Tres puntos en vez de uno, y un globo nuevo justo después. Esa es la diferencia entre 27 toques y casi 80.",
        },
        {
          title: "Pero sin agobiarse",
          body: "Un toque que no acierta no quita nada y no estropea nada, solo vale menos. A la criatura le gusta exactamente igual.",
        },
        {
          title: "Una criatura hasta el final",
          body: "Repartir el cariño entre las tres son tres principios y ningún final. Lleva una al quinto tamaño y luego abre la siguiente.",
        },
        {
          title: "Un globo que no cambia",
          body: "El deseo solo cambia cuando se lo concedes. Un globo que sigue con el mismo dibujo te está diciendo que aún no has acertado.",
        },
      ],

      teaches: [
        {
          title: "Fijarse en otro",
          body: "El globo dice lo que quiere la criatura, no lo que quiere el niño. Es un ejercicio pequeño y diario de prestar atención.",
        },
        {
          title: "Causa y efecto",
          body: "Un toque mueve la barra y una barra llena trae un tamaño nuevo. El vínculo se ve entero y se entiende en un segundo.",
        },
        {
          title: "Constancia",
          body: "Ochenta puntos son muchos toques. Nadie mete prisa, así que un niño ve que algo puede crecer despacio y aun así crecer.",
        },
        {
          title: "Emparejar dibujos",
          body: "El dibujo del globo y el del botón son el mismo. Un niño que todavía no lee encuentra esa pareja solo.",
        },
      ],

      ages: [
        {
          title: "2 a 3",
          body: "La edad para la que está hecho. Nada que leer, nada que perder, y cada toque responde con algo agradable.",
        },
        {
          title: "4 a 5",
          body: "Aquí el globo empieza a importar. El segundo tamaño llega tras tres toques acertados, lo bastante rápido para notar la relación.",
        },
        {
          title: "6 en adelante",
          body: "Dales un objetivo: las tres criaturas al tamaño máximo. Son 81 toques acertados y bastante paciencia.",
        },
        {
          title: "Adultos",
          body: "Un juego para tener en la mano mientras se habla. No hay ni un momento que exija atención inmediata.",
        },
      ],

      accessibility:
        "Un toque por acción, sin arrastrar y sin mantener pulsado, así que funciona con dispositivos de entrada alternativos y con una mano pequeña que todavía no apunta bien. Los cuatro botones son grandes a propósito, al menos 2 por 2 centímetros en cualquier pantalla, y la propia criatura también es un botón. No hay ninguna palabra que haya que leer: la petición aparece como dibujo dentro del globo, y ese mismo dibujo está en el botón que corresponde, con un aro alrededor. Nada va en cuenta atrás y nada de esta pantalla hay que responderlo deprisa. Se juega entero en silencio sin perderse información.",

      together: [
        {
          title: "Adivinad el globo",
          body: "Antes de tocar, preguntad qué quiere la criatura. Un niño pequeño responde con el dedo, y eso ya es un juego.",
        },
        {
          title: "Un toque cada uno",
          body: "Por turnos. Cada petición se convierte en una conversación corta sobre lo que necesita otro.",
        },
        {
          title: "Ponedle vuestro nombre",
          body: "Pip, Mo y Tuli tienen nombre y nadie os obliga a usarlo. Un niño que le pone el suyo os habla de ella después.",
        },
        {
          title: "Contad qué ha hecho hoy",
          body: "La criatura no recuerda nada, así que la historia es toda vuestra. Qué comió, dónde estuvo, por qué está mojada.",
        },
      ],

      faq: [
        {
          q: "¿La mascota puede morir o ponerse triste?",
          a: "No, y no hay manera de conseguirlo. No sube ningún hambre ni aparece ninguna enfermedad, y salir del juego no le hace nada malo.",
        },
        {
          q: "¿Qué pasa si no entramos en una semana?",
          a: "Nada. La criatura sigue exactamente del tamaño que la dejaste, porque las reglas no tienen forma de saber que ha pasado tiempo.",
        },
        {
          q: "¿Cuántos toques hacen falta para criarla del todo?",
          a: "27 si le das siempre lo que pide. 53,8 de media tocando al azar, y 79,5 si no miras el globo nunca. Las tres llegan.",
        },
        {
          q: "¿Qué pasa al llegar al último tamaño?",
          a: "Deja de cambiar. Los toques siguen contando para el récord y las monedas siguen llegando, pero no hay un sexto tamaño ni un dibujo nuevo.",
        },
        {
          q: "¿Se puede hacer mal?",
          a: "No. En los 320.541 toques que simulamos no se rechazó ni uno. Un toque que no coincide con el deseo simplemente vale menos.",
        },
        {
          q: "¿Cuántas mascotas hay?",
          a: "Tres: Pip, Mo y Tuli. Cada una crece por su cuenta y guarda su propio récord, así que puedes criar una y dejar las otras para otro día.",
        },
        { q: "¿Es gratis?", a: "Sí. Ni pagos ni compras dentro del juego, y tampoco hay una versión de pago." },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni nada entre nivel y nivel." },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "No. Funciona en el navegador y, tras una visita, queda guardado en el aparato y va sin conexión.",
        },
        {
          q: "¿Para qué edad es?",
          a: "A partir de los dos años. No hay ninguna palabra que leer ni forma de perder, así que un niño que aún no habla juega solo.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por lo más que ha crecido esa criatura, guardado aparte para cada una. Solo sube, y no se puede perder.",
        },
      ],

      keywords: ["mascota", "cuidar", "criatura", "infantil", "juego tranquilo", "sin perder"],
    },
  },

  provenance: [
    {
      claim: "the fifth size needs 80 points of care, and a granted wish is worth 3 against 1",
      source: "src/games/pet/logic.ts",
    },
    {
      claim: "granting every wish reaches full size in 27 taps, and all three creatures in 81",
      source: "scripts/sim/pet-growing.mjs",
    },
    {
      claim: "a random-tapping bot meets the wish 24.9% of the time and finishes in 53.8 taps",
      source: "scripts/sim/pet-growing.mjs",
    },
    {
      claim: "a bot that never reads the bubble finishes in 79.5 taps",
      source: "scripts/sim/pet-growing.mjs",
    },
    {
      claim: "seven coins arrive on the way to full size",
      source: "scripts/sim/pet-growing.mjs",
    },
    {
      claim: "2,000 runs per bot and 320,541 simulated taps, none of them refused",
      source: "scripts/sim/pet-growing.mjs",
    },
    {
      claim: "three creatures, five sizes, and a record that only ever goes up",
      source: "src/games/pet/logic.ts",
    },
  ],
};
