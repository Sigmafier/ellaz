import type { GameContent } from "../types";
import { wordsearchFr } from "./fr/wordsearch";

/**
 * Word Search - the puzzle whose promise is a property of the CONSTRUCTION
 * rather than a claim about it. `deal` plants every word from the list at a real
 * position before a single filler letter is drawn, and the list it hands back is
 * the set of words it managed to place. A word on the list is on the board
 * because it was put there first.
 *
 * The four languages are written, not translated. They open differently, order
 * their sections differently and pick different things to admit to, because a
 * translation carries the source language's rhythm and that rhythm is exactly
 * what reads as machine-made.
 *
 * Every figure here comes from `scripts/sim/wordsearch-grids.mjs`, which drives
 * the shipped rules over 4,000 dealt boards per level per language - 36,000 in
 * all - or from the game's own code. See `provenance` at the bottom.
 *
 * EACH LANGUAGE NAMES ITS OWN ADMISSION, and all four are measured. Hebrew takes
 * the thinness of the crossings (1.09 shared squares on a whole hard board, so
 * there is no shortcut and no hint button), English takes the eight directions
 * at the hardest tier (a word running backwards and uphill rewards patience
 * rather than cleverness), Spanish takes the size of the word pool (185 words,
 * so a regular player meets the same ones again), and French takes the clock
 * (the record is time, and a board left half done comes back with its minutes
 * still on it).
 */
export const wordsearch: GameContent = {
  id: "wordsearch",

  copy: {
    he: {
      name: "חיפוש מילים",
      metaTitle: "חיפוש מילים - משחק אותיות חינם | Ellaz",
      metaDescription:
        "משחק חיפוש מילים חינמי בדפדפן, בעברית ובאנגלית. רשת אותיות, רשימת מילים, ונגיעה אחת בכל קצה. שלוש רמות, בלי הרשמה ובלי פרסומות.",

      lede: "משחק חיפוש מילים חינם, ישר בדפדפן. מול השחקן רשת של אותיות ורשימה של מילים שמסתתרות בתוכה. נוגעים באות הראשונה של מילה, אחר כך באחרונה, והמילה מסומנת בצבע משלה.",

      body: [
        "נוגעים באות הראשונה. אחר כך באחרונה. המילה נצבעת. גרירה עושה בדיוק אותו דבר, והיא אף פעם לא חובה.",

        "הרשת הזאת לא נוצרת בפיזור אותיות ובדיקה בדיעבד. קודם המשחק מניח כל מילה מהרשימה במקום אמיתי ובכיוון אמיתי, ורק אחר כך ממלא את מה שנשאר. הרשימה שמופיעה ליד הלוח היא בדיוק אוסף המילים שהצליחו להיכנס, כך שמילה שלא נמצא לה מקום פשוט לא מגיעה לרשימה. זה חשוב יותר משזה נשמע: ילד לא מסוגל להבדיל בין מילה שחבויה היטב לבין מילה שאינה שם בכלל, אז הוא ימשיך לחפש עד שיוותר, והדבר שרימה אותו הוא המשחק. הרצנו 36,000 לוחות דרך הכללים המשוחררים. אף רשימה לא יצאה קצרה מהמכסה של הרמה שלה, ואף לוח לא נזרק ונבנה מחדש. הנחת מילה עולה שלושה ניסיונות מיקום ברמה הקלה ו-5.3 ברמה הקשה.",

        "ברמה הקלה מילה רצה לרוחב או למטה, שני כיוונים בלבד. בבינונית מצטרף האלכסון היורד. ברמה הקשה פתוחים כל שמונת הכיוונים, ואז 55.6 אחוז מהמשבצות הן אותיות מילוי שאינן שייכות לאף מילה, לעומת 44.1 אחוז ברמה הקלה.",

        "הלוח מקובע לכיוון שמאל-ימין, כמו כל רשת מרחבית באתר הזה. בלי זה מיקום המשבצות היה מתהפך בעברית והמשחק היה מאבד את הקשר בין מה שרואים לבין מה שהוא מאמין שקיים. אלא שמילה עברית שנשתלת משמאל לימין נקראת הפוך למי שמחפש אותה, אז כיוון הנחת המילים נקבע לפי כיוון הקריאה של השפה: בעברית מילה אופקית רצה מימין לשמאל, באנגלית ובספרדית להפך. מדדנו 12,000 לוחות בעברית, וכל מילה אופקית ששתלנו רצה לכיוון הנכון.",

        "וההודאה. אין כאן כפתור רמז, ואין שום סימון שמצמצם את החיפוש. ברמה הקשה המילים כמעט לא נחתכות זו בזו, 1.09 משבצות משותפות בלוח שלם, אז אף אות שכבר מצאתם לא מקצרת לכם את הדרך למילה הבאה. מי שנתקע על מילה אחת יסרוק 144 משבצות באצבע, ולפעמים זה פשוט מייגע.",
      ],

      howToPlay: [
        {
          title: "בוחרים שפה",
          body: "מתחת ללוח יש כפתור לכל שפה. הרשת והרשימה מתחלפות יחד, והממשק נשאר בשפה שלכם.",
        },
        {
          title: "נוגעים בהתחלה",
          body: "מוצאים ברשימה מילה ומחפשים את האות הראשונה שלה על הלוח. נגיעה בה מסמנת את נקודת ההתחלה במסגרת צבעונית.",
        },
        {
          title: "נוגעים בסוף",
          body: "נגיעה שנייה באות האחרונה של אותה מילה סוגרת את הקו. כל מה שביניהן חייב לשבת על שורה, על עמודה או על אלכסון.",
        },
        {
          title: "טועים בלי לשלם",
          body: "בחירה שאינה מילה מזיזה את הלוח קצת ונעלמת. שום דבר לא ננעל, שום דבר לא נמחק, ואפשר לנסות שוב מיד.",
        },
        {
          title: "מסיימים את הרשימה",
          body: "כשכל המילים מסומנות הלוח נסגר והזמן נעצר. השיא הוא הזמן, בנפרד לכל רמה.",
        },
      ],

      tips: [
        {
          title: "אות ראשונה, לא מילה",
          body: "סורקים את הלוח ומחפשים את האות הפותחת בלבד. העין מוצאת אות בודדת הרבה יותר מהר משהיא מוצאת רצף, ורק אחרי שהיא נעצרת בודקים לאן ממשיכים.",
        },
        {
          title: "המילים הארוכות קודם",
          body: "מילה בת שמונה אותיות ברשת 12 על 12 יכולה לשבת במעט מאוד מקומות. המילים הקצרות מסתדרות אחר כך כמעט לבד.",
        },
        {
          title: "שורה שלמה בבת אחת",
          body: "במקום לחפש מילה מסוימת, קוראים שורה אחת מקצה לקצה ובודקים מה קופץ. ברמה הקלה כל מילה יושבת על שורה או על עמודה, אז מעבר מסודר סוגר לוח שלם.",
        },
        {
          title: "האלכסון האחורי",
          body: "ברמה הקשה יש מילים שרצות אחורה וכלפי מעלה. אם סרקתם הכול ולא מצאתם, כמעט תמיד זה הכיוון שלא ניסיתם.",
        },
      ],

      teaches: [
        {
          title: "לזהות צורה של מילה",
          body: "אחרי כמה לוחות העין מפסיקה לקרוא אות אחרי אות ומתחילה לזהות את המילה כצורה שלמה. זה בדיוק המעבר שקורה בקריאה שוטפת.",
        },
        {
          title: "לסרוק בשיטה",
          body: "לוח של 144 משבצות אי אפשר לכסות באקראי. ילד שמתחיל לעבור שורה אחרי שורה למד שיטת חיפוש, לא רק מילה.",
        },
        {
          title: "אוצר מילים בשתי שפות",
          body: "הרשימה בעברית ובאנגלית נכתבה בנפרד, לא בתרגום, ובכל אחת יש 180 ו-215 מילים יומיומיות שילד מכיר.",
        },
        {
          title: "לסבול חיפוש ארוך",
          body: "מילה אחת יכולה לקחת דקה. אין עונש, אין ספירה לאחור, ואין דרך להפסיד, אז הזמן הזה הוא תרגול של סבלנות ולא של לחץ.",
        },
      ],

      ages: [
        {
          title: "5 עד 6",
          body: "רשת 8 על 8 עם שש מילים בשני כיוונים. אורך המילה הממוצע שם הוא 6 אותיות, וזה מספיק גדול כדי לזהות ומספיק קצר כדי לא להתייאש.",
        },
        {
          title: "7 עד 9",
          body: "רשת 10 על 10 עם שמונה מילים, והאלכסון היורד נכנס לתמונה. זו הרמה שבה מפסיקים לסרוק רק שורות.",
        },
        {
          title: "10 ומעלה",
          body: "רשת 12 על 12, עשר מילים, כל שמונת הכיוונים. חצי מהלוח הוא אותיות מילוי, והשעון מתחיל להיות מעניין.",
        },
        {
          title: "מבוגרים",
          body: "לוח קשה בפחות משתי דקות. אפשר גם לעבור לרשימה באנגלית או בספרדית ולגלות שהמוח מחפש אחרת בשפה שאינה שלו.",
        },
      ],

      accessibility:
        "כל משבצת היא כפתור אמיתי שמכריז על האות שעליה ועל השורה והעמודה שלה, ושתי נגיעות מספיקות לכל מילה במשחק. גרירה היא קיצור דרך ולא תנאי, מה שחשוב ליד קטנה שעוד לא מדייקת ולאמצעי הצבעה חלופיים. מקש אנטר ומקש הרווח עושים בדיוק מה שאצבע עושה, אז אפשר לפתור לוח שלם מהמקלדת. מילה שנמצאה מסומנת גם בצבע וגם בקו חוצה ברשימה, כך שההבחנה לא נשענת על צבע בלבד, ועשרת הצבעים פרושים על סולם הבהירות ולא רק על הגוון. אין שעון שלוחץ, אין ספירה לאחור, ובחירה שגויה עונה בניעור קטן ולא בצליל שגיאה. הרשימה נכתבת בכיוון של השפה שלה גם כשהממשק בשפה אחרת.",

      together: [
        {
          title: "מילה לכל אחד",
          body: "מחלקים את הרשימה מראש. כל אחד אחראי על המילים שלו, ומגלים מהר שאותה אות פותחת מובילה לשני מקומות שונים.",
        },
        {
          title: "לומר לפני שנוגעים",
          body: "מי שמצא מילה אומר קודם באיזה כיוון היא רצה ורק אז נוגע. זה הופך מזל למשהו שאפשר להסביר.",
        },
        {
          title: "לוח בשפה השנייה",
          body: "מחליפים את שפת המילים ומשחקים שוב. מבוגר שקורא אנגלית ברהיטות מגלה שרשת אותיות עברית מאיטה גם אותו.",
        },
        {
          title: "מרוץ שעון",
          body: "כל אחד פותר לוח באותה רמה ומשווים זמנים. הזמן נשמר בנפרד לכל רמה, אז אין טעם להשוות קל מול קשה.",
        },
      ],

      faq: [
        {
          q: "כל המילים ברשימה באמת נמצאות על הלוח?",
          a: "כן, וזו תוצאה של הבנייה. המשחק מניח כל מילה לפני שהוא ממלא אות מילוי אחת, והרשימה היא בדיוק המילים שהונחו.",
        },
        {
          q: "מצאתי מילה במקום אחר, למה היא התקבלה?",
          a: "כי היא באמת שם. אותיות המילוי מצליחות לאיית מילה מהרשימה בערך 7.5 פעמים בכל 10,000 לוחות ברמה הקשה, והמשחק מקבל כל הופעה ולא רק את זו שהוא תכנן.",
        },
        {
          q: "אפשר לשחק בעברית?",
          a: "כן, וזו ברירת המחדל בממשק עברי. מילה עברית אופקית רצה מימין לשמאל בתוך הלוח, כמו שקוראים אותה.",
        },
        {
          q: "חייבים לגרור את האצבע?",
          a: "לא. שתי נגיעות, אחת בכל קצה, עושות בדיוק אותו דבר, וגם המקלדת עובדת.",
        },
        {
          q: "יש רמז אם נתקעתי?",
          a: "אין. הבחירה הזאת מכוונת: רמז היה הופך את הסריקה, שהיא כל המשחק, לדבר שאפשר לדלג עליו.",
        },
        {
          q: "מה נשמר כשסוגרים את הדף?",
          a: "הלוח, המילים שכבר סומנו והשעון. פותחים שוב וממשיכים בדיוק מאותו רגע.",
        },
        {
          q: "צריך חשבון או תשלום?",
          a: "לא ולא. הדף נטען ומשחקים, בלי הרשמה ובלי פרסומות.",
        },
      ],

      keywords: ["חיפוש מילים", "תפזורת", "משחק אותיות", "משחק מילים", "קריאה"],
    },

    en: {
      name: "Word Search",
      metaTitle: "Word Search - free letter grid puzzle | Ellaz",
      metaDescription:
        "A free word search in your browser. Tap the first letter of a word and then its last. Three grids, English, Hebrew or Spanish words, no account.",

      lede: "A free word search that runs in the browser. A square of letters, a list of words hiding inside it, and one tap at each end of a word to mark it. Three grid sizes, and the word list can be English, Hebrew or Spanish whatever language the buttons are in.",

      body: [
        "Tap the first letter. Tap the last one. The word lights up. Dragging does the same thing and is never required.",

        "The grid is built words-first, and that is the whole design. Every word on the list is planted at a real position in a real direction before a single filler letter is drawn, so the list beside the board is exactly the set of words that went in. A generator that scatters letters and then looks to see what turned up is the one that hands a child a list containing a word that is not there, and a child cannot tell an absent word from a well-hidden one. They keep looking. Then they give up. Across 36,000 dealt boards no list came out shorter than its tier asks for and no board had to be thrown away and rebuilt, at a cost of 3 placement tries per word on the small grid and 5.3 on the large one.",

        "Difficulty moves three things at once. The grid goes 8 by 8, then 10, then 12. The list goes 6 words, then 8, then 10. And the set of directions a word may hide in goes from two to three to all eight, which is the axis that actually decides how the puzzle feels: across and down sit on lines the eye already sweeps, while a word running backwards and uphill has to be hunted letter by letter.",

        "Filler is the other half of a word search. On the small grid 44.1 percent of the squares belong to no word at all; on the large one it is 55.6 percent, so more than half of what a player scans is noise by design. The letters are not drawn uniformly either. Each language has its own frequency table, because a grid of rare letters makes the planted words stand out from their surroundings and the search stops being a search. Words run 6.5 letters on average, so three matching letters in a row is usually the real thing.",

        "The admission. At the hardest tier the words barely cross each other, 1.09 shared squares on an entire board, so a letter you have already found almost never shortens the next word. There is no hint button either. That leaves patience as the only method on a 144 square grid, and patience is a fine thing to practise and a dull thing to be stuck inside.",
      ],

      howToPlay: [
        {
          title: "Pick the word language",
          body: "Buttons under the board switch the list between English, Spanish and, in a Hebrew interface, Hebrew. The grid is redealt in that language and the rest of the app stays where it was.",
        },
        {
          title: "Find the first letter",
          body: "Read a word off the list, then look for its opening letter on the board. Tapping it marks the start with a coloured ring.",
        },
        {
          title: "Tap the far end",
          body: "A second tap on the word's last letter closes the line. The two ends must sit on one row, one column or one 45 degree diagonal.",
        },
        {
          title: "Guess for free",
          body: "A selection that is not a word gives the board a small shake and leaves. Nothing locks, nothing is deducted, and the next try starts immediately.",
        },
        {
          title: "Clear the list",
          body: "Every word marked ends the board and stops the clock. The record is that time, kept separately for each grid.",
        },
      ],

      tips: [
        {
          title: "Hunt one letter, not a word",
          body: "Sweep for the opening letter alone. A single character is far faster to spot than a sequence, and only once your eye stops do you check which of the eight directions carries on.",
        },
        {
          title: "Long words have fewer homes",
          body: "An eight letter word on a 12 by 12 grid fits in very few places, so it is the cheapest to find first. The short ones then fall out on their own.",
        },
        {
          title: "Read rows, not words",
          body: "Instead of hunting a chosen word, read one row end to end and see what jumps. On the small grid every word sits on a row or a column, so an orderly pass clears it.",
        },
        {
          title: "The direction you skipped",
          body: "When a hard board seems to be missing a word, it is almost always running backwards or climbing. Try the four directions nobody checks first.",
        },
      ],

      teaches: [
        {
          title: "Seeing a word as a shape",
          body: "After a few boards the eye stops reading letter by letter and starts recognising whole words by their outline. That is the same jump that turns decoding into reading.",
        },
        {
          title: "Searching on purpose",
          body: "144 squares cannot be covered at random. A child who starts going row by row has learned a search method, which outlasts any particular word.",
        },
        {
          title: "Two alphabets, one game",
          body: "Switching the word language puts a fluent English reader in front of a Hebrew grid and slows them right down. The list holds 215 English words and 180 Hebrew ones, written separately rather than translated.",
        },
        {
          title: "Staying with something",
          body: "One word can take a minute. Nothing counts down and nothing can be lost, so that minute is practice at not giving up.",
        },
      ],

      ages: [
        {
          title: "5 to 6",
          body: "The 8 by 8 grid with six words in two directions. Average word length there is 6 letters, which is long enough to recognise and short enough to finish.",
        },
        {
          title: "7 to 9",
          body: "The 10 by 10 grid with eight words, and the descending diagonal joins in. This is where scanning rows stops being enough.",
        },
        {
          title: "10 and up",
          body: "The 12 by 12 grid, ten words, all eight directions. Over half the board is filler and the clock starts to be worth beating.",
        },
        {
          title: "Grown-ups",
          body: "A hard board in under two minutes. Then switch the list to a language you do not read fluently and the same puzzle turns difficult again.",
        },
      ],

      accessibility:
        "Every square is a real button that announces the letter on it along with its row and column, and two taps complete any word in the game. Dragging is a shortcut rather than a requirement, which matters for a small hand that does not aim precisely yet and for alternative pointing devices. Enter and Space do exactly what a finger does, so a whole board can be solved from the keyboard. A found word is marked by colour and by a line through it in the list, so the distinction never rests on colour alone, and the ten marker colours are spread across lightness as well as hue. There is no countdown and no failure sound. The word list is written in its own language's direction even when the interface is in another.",

      together: [
        {
          title: "Split the list",
          body: "Hand out the words before starting. Everyone owns their own, and it becomes obvious how often one opening letter leads somewhere else.",
        },
        {
          title: "Say it before you touch it",
          body: "Whoever spots a word names its direction out loud first, then taps. It turns a lucky glance into something that can be explained.",
        },
        {
          title: "Play the other language",
          body: "Switch the list and start again. An adult who reads English fluently discovers that a Hebrew or Spanish grid slows them to a child's pace.",
        },
        {
          title: "Race the clock",
          body: "Two people solve the same tier and compare times. Records are stored per grid, so an easy run and a hard one are not comparable.",
        },
      ],

      faq: [
        {
          q: "Is every word on the list really in the grid?",
          a: "Yes, and it falls out of how the board is made. Each word is planted before any filler letter exists, and the list you see is exactly the words that were planted.",
        },
        {
          q: "I found a word somewhere else and it counted. Why?",
          a: "Because it was genuinely there. Filler letters spell a listed word by accident about 7.5 times in every 10,000 hard boards, and the game accepts any occurrence rather than only the one it planted.",
        },
        {
          q: "Can I do a word search in Hebrew?",
          a: "Yes. A horizontal Hebrew word runs right to left inside the grid, the way it is read, while the grid itself never mirrors.",
        },
        {
          q: "Do I have to drag my finger?",
          a: "No. Two taps, one at each end, do the same job, and so does the keyboard.",
        },
        {
          q: "Is there a hint?",
          a: "None, deliberately. A hint would let a player skip the scanning, and the scanning is the entire puzzle.",
        },
        {
          q: "What happens if I close the tab?",
          a: "The board, the words already marked and the clock are all waiting when you come back.",
        },
        {
          q: "Does it cost anything?",
          a: "No. The page loads and you play, with no sign-up and no adverts.",
        },
      ],

      keywords: ["word search", "word find", "letter grid", "word puzzle", "hebrew word search"],
    },

    es: {
      name: "Sopa de letras",
      metaTitle: "Sopa de letras gratis en el navegador | Ellaz",
      metaDescription:
        "Sopa de letras gratis en el navegador. Toca la primera letra de una palabra y luego la última. Tres tamaños de cuadrícula, sin cuenta y sin anuncios.",

      lede: "Una sopa de letras gratuita que funciona en el navegador. Una cuadrícula de letras, una lista de palabras escondidas dentro y un toque en cada extremo para marcarlas. La lista puede estar en español o en inglés, sea cual sea el idioma de los botones.",

      body: [
        "Tocas la primera letra. Después la última. La palabra se pinta. Arrastrar el dedo hace lo mismo y nunca hace falta.",

        "La cuadrícula se construye al revés de lo que parece. Primero el juego coloca cada palabra de la lista en una posición real y en una dirección real, y solo entonces rellena lo que queda con letras sueltas. Por eso la lista que aparece junto al tablero es exactamente el conjunto de palabras que entraron. Un generador que esparce letras y luego mira a ver qué salió acaba dando a un niño una lista con una palabra que no está, y un niño no distingue una palabra ausente de una bien escondida. Sigue buscando hasta que se rinde. En 36,000 tableros repartidos ninguna lista salió más corta de lo que pide su nivel y ninguno hubo que descartarlo y rehacerlo.",

        "La dificultad mueve tres cosas a la vez: la cuadrícula pasa de 8 a 10 y a 12 casillas de lado, la lista de 6 palabras a 8 y a 10, y las direcciones posibles de dos a tres y luego a las ocho. Ese último eje es el que decide de verdad cómo se siente el juego.",

        "El relleno importa más de lo que parece. En el tablero pequeño el 44.1 por ciento de las casillas no pertenece a ninguna palabra, y en el grande la cifra sube al 55.6 por ciento. Esas letras tampoco se sortean de manera uniforme: cada idioma tiene su propia tabla de frecuencias, porque una cuadrícula llena de letras raras hace que las palabras colocadas destaquen a simple vista y entonces ya no hay nada que buscar. Las palabras miden 6.5 letras de media en el tablero grande.",

        "Lo que hay que admitir. El repertorio de palabras es corto a propósito: 185 palabras en español, todas concretas y cotidianas, escogidas para que un niño de cinco años pueda señalarlas. A un adulto que juegue muchas partidas seguidas empezarán a repetírsele, y ese aburrimiento es el precio de no sacar las palabras de un diccionario que nadie ha leído entero.",
      ],

      howToPlay: [
        {
          title: "Elige el idioma de las palabras",
          body: "Los botones bajo el tablero cambian la lista entre español e inglés. La cuadrícula se reparte de nuevo en ese idioma y el resto de la aplicación no se mueve.",
        },
        {
          title: "Busca la primera letra",
          body: "Lee una palabra de la lista y localiza su letra inicial en el tablero. Al tocarla queda marcada con un anillo de color.",
        },
        {
          title: "Toca el otro extremo",
          body: "Un segundo toque en la última letra cierra la línea. Los dos extremos tienen que estar en la misma fila, columna o diagonal.",
        },
        {
          title: "Equivócate sin pagar",
          body: "Una selección que no es palabra hace temblar el tablero y desaparece. No se bloquea nada ni se resta nada, y puedes probar otra vez enseguida.",
        },
        {
          title: "Termina la lista",
          body: "Cuando están todas marcadas el tablero se cierra y el reloj se para. El récord es ese tiempo, guardado por separado para cada cuadrícula.",
        },
      ],

      tips: [
        {
          title: "Busca una letra, no una palabra",
          body: "Barre el tablero buscando solo la inicial. Un carácter suelto se localiza mucho antes que una secuencia, y cuando el ojo se detiene ya miras hacia dónde sigue.",
        },
        {
          title: "Las largas caben en pocos sitios",
          body: "Una palabra de ocho letras en una cuadrícula de 12 por 12 tiene muy pocas posiciones posibles, así que es la más barata de encontrar primero.",
        },
        {
          title: "Lee filas enteras",
          body: "En vez de perseguir una palabra concreta, recorre una fila de lado a lado y mira qué salta. En el nivel fácil cada palabra está en una fila o en una columna.",
        },
        {
          title: "La dirección que no probaste",
          body: "Si en el tablero grande falta una palabra, casi siempre va hacia atrás o hacia arriba. Prueba esas cuatro direcciones antes de repasar la cuadrícula otra vez.",
        },
      ],

      teaches: [
        {
          title: "Ver la palabra como una forma",
          body: "Después de unos cuantos tableros el ojo deja de leer letra a letra y empieza a reconocer la palabra entera por su silueta. Ese salto es el mismo que convierte descifrar en leer.",
        },
        {
          title: "Buscar con método",
          body: "144 casillas no se cubren al azar. Un niño que empieza a ir fila por fila ha aprendido una manera de buscar, y eso dura más que cualquier palabra.",
        },
        {
          title: "Dos alfabetos",
          body: "Cambiar el idioma de la lista pone a un lector rápido delante de una cuadrícula que no reconoce. Hay 185 palabras en español y 215 en inglés, escritas por separado y no traducidas.",
        },
        {
          title: "Aguantar la búsqueda",
          body: "Una sola palabra puede llevar un minuto. No hay cuenta atrás ni forma de perder, así que ese minuto entrena paciencia y no prisa.",
        },
      ],

      ages: [
        {
          title: "5 a 6 años",
          body: "Cuadrícula de 8 por 8 con seis palabras en dos direcciones. La media es de 6 letras por palabra, suficiente para reconocerla y corta para terminarla.",
        },
        {
          title: "7 a 9 años",
          body: "Cuadrícula de 10 por 10 con ocho palabras y la diagonal descendente. Aquí deja de bastar con repasar filas.",
        },
        {
          title: "10 en adelante",
          body: "Cuadrícula de 12 por 12, diez palabras y las ocho direcciones. Más de la mitad del tablero es relleno y el reloj empieza a tener gracia.",
        },
        {
          title: "Personas adultas",
          body: "Un tablero difícil en menos de dos minutos. Luego cambia la lista a un idioma que no leas con soltura y el mismo juego se vuelve otro.",
        },
      ],

      accessibility:
        "Cada casilla es un botón de verdad que anuncia su letra junto con la fila y la columna en que está, y dos toques bastan para cualquier palabra del juego. Arrastrar es un atajo y nunca un requisito, algo que importa para una mano pequeña que todavía no apunta bien y para dispositivos de puntero alternativos. Las teclas Intro y Espacio hacen exactamente lo mismo que un dedo, así que se puede resolver un tablero entero desde el teclado. Una palabra encontrada se marca con color y además tachada en la lista, de modo que la diferencia no depende solo del color, y los diez colores de marca se reparten también por luminosidad. No hay cuenta atrás ni sonido de error: una selección equivocada responde con un temblor pequeño y nada más.",

      together: [
        {
          title: "Repartir la lista",
          body: "Asignad las palabras antes de empezar. Cada quien lleva las suyas y se ve enseguida cuántas veces una misma inicial lleva a dos sitios distintos.",
        },
        {
          title: "Decirlo antes de tocar",
          body: "Quien encuentre una palabra dice primero en qué dirección va y solo después toca. Así una mirada afortunada se convierte en algo explicable.",
        },
        {
          title: "Jugar en el otro idioma",
          body: "Cambiad la lista y empezad de nuevo. Una persona adulta que lee inglés con soltura descubre que una cuadrícula en otro alfabeto la frena igual que a un niño.",
        },
        {
          title: "Carrera contra el reloj",
          body: "Dos personas resuelven el mismo nivel y comparan tiempos. Los récords se guardan por cuadrícula, así que no tiene sentido comparar fácil con difícil.",
        },
      ],

      faq: [
        {
          q: "¿Están de verdad todas las palabras de la lista?",
          a: "Sí, y es consecuencia de cómo se fabrica el tablero. Cada palabra se coloca antes de que exista una sola letra de relleno, y la lista es justo lo que se colocó.",
        },
        {
          q: "Encontré una palabra en otro sitio y me la aceptó",
          a: "Porque estaba realmente ahí. Las letras de relleno deletrean una palabra de la lista por casualidad unas 7.5 veces cada 10,000 tableros difíciles, y el juego acepta cualquier aparición.",
        },
        {
          q: "¿Se puede jugar con palabras en inglés?",
          a: "Sí, con los botones que hay debajo del tablero. La cuadrícula se reparte de nuevo y los botones de la aplicación siguen en tu idioma.",
        },
        {
          q: "¿Hay que arrastrar el dedo?",
          a: "No. Dos toques, uno en cada extremo, hacen lo mismo, y el teclado también sirve.",
        },
        {
          q: "¿Existe alguna pista?",
          a: "Ninguna, y es a propósito. Una pista dejaría saltarse el rastreo, que es el juego entero.",
        },
        {
          q: "¿Qué pasa si cierro la pestaña?",
          a: "El tablero, las palabras ya marcadas y el reloj siguen ahí cuando vuelves.",
        },
        {
          q: "¿Cuesta dinero?",
          a: "No. Se abre la página y se juega, sin registro y sin anuncios.",
        },
      ],

      keywords: ["sopa de letras", "buscar palabras", "juego de letras", "cuadricula de letras", "lectura"],
    },

    fr: wordsearchFr,
  },

  provenance: [
    {
      claim: "36,000 dealt boards, no list shorter than its tier and no board rebuilt",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "3 placement tries per word on the small grid, 5.3 on the large one",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "44.1% of the small grid and 55.6% of the large one is filler",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "words average 6 letters on the small grid and 6.5 on the large one",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "1.09 squares are shared by two words on a whole hard board",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "the filler spells a listed word by accident 7.5 times per 10,000 hard boards, and every one is accepted",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "every horizontal Hebrew word runs right to left, across 12,000 Hebrew boards",
      source: "scripts/sim/wordsearch-grids.mjs",
    },
    {
      claim: "180 Hebrew words, 215 English and 185 Spanish, authored per language",
      source: "src/games/wordsearch/words.ts",
    },
    {
      claim: "8x8 with six words in two directions, 10x10 with eight in three, 12x12 with ten in all eight",
      source: "src/games/wordsearch/logic.ts",
    },
    {
      claim: "the record is time, less is better, scoped per grid",
      source: "src/sdk/score.ts",
    },
  ],
};
