import type { GameContent } from "../types";

/**
 * The one game on this platform with no score, ever, and the page exists partly
 * to say why out loud.
 *
 * `score-contract-convention.md` records it as a deliberate permanent exception:
 * ranking a child's drawing is the opposite of this platform's premise. Twenty
 * of twenty-one games keep a record. This one never will, and that is worth a
 * paragraph rather than a footnote.
 *
 * Note there is no derived statistic from a simulation here, because there is
 * nothing to simulate - a drawing has no outcome. The numbers on this page are
 * counts of what ships, and their provenance is the picture file itself.
 */
export const coloring: GameContent = {
  id: "coloring",

  copy: {
    he: {
      metaTitle: "צביעה - דפי צביעה דיגיטליים לילדים | Ellaz",
      metaDescription:
        "משחק צביעה חינם לילדים בדפדפן. 20 ציורים ו-20 צבעים, בלי ניקוד ובלי דרך לטעות. בלי הרשמה.",

      lede: "משחק צביעה חינם לילדים. בוחרים ציור, בוחרים צבע, נוגעים באזור והוא נצבע. אין ניקוד, אין שעון ואי אפשר לצבוע לא נכון.",

      body: [
        "ציור בקווים. 20 צבעים בצד. נוגעים, וזה נצבע.",

        "זה המשחק היחיד באתר שלא שומר שיא, ולא נשמור לו אחד גם בעתיד. לכל 20 המשחקים האחרים יש שיא, כי אפשר להשוות זמן פתרון או אורך רצף לזמן ולרצף של אתמול. ציור של ילד הוא לא זה. לדרג אותו פירושו לומר לו שהיה יכול לעשות את זה יותר טוב, ובגיל ארבע זה בדיוק המשפט שגורם לילדים להפסיק לצייר. אין פה נכון ולא נכון, אז אין מה לספור.",

        "20 ציורים בסך הכול: בית, דג, פרפר, פרח ועוד. כל אחד מחולק לאזורים סגורים, ואפשר לצבוע כל אזור בכל צבע כמה פעמים שרוצים. שמיים ורודים זו בחירה ולא טעות, ואף הודעה לא תופיע כדי לומר אחרת.",

        "אין מברשת ואין גרירה. נוגעים באזור והוא מתמלא, מה שאומר שגם יד קטנה שרועדת מקבלת בדיוק את התוצאה שהתכוונה אליה. זו החלטה מכוונת: כלי ציור חופשי היה נותן שליטה גדולה יותר לילד בן שבע ותסכול לילד בן שלוש.",

        "העבודה נשמרת על המכשיר בזמן אמת, אז אפשר לסגור ולחזור. אין שמירה בענן ואין חשבון, אז ניקוי היסטוריית הדפדפן מוחק את הציורים, וזה המחיר של לא לבקש מכם שום פרט.",
      ],

      howToPlay: [
        { title: "בוחרים ציור", body: "20 ציורים, כולם פתוחים מההתחלה. אין נעילות." },
        { title: "בוחרים צבע", body: "20 צבעים בסרגל הצד. נגיעה אחת בוחרת." },
        { title: "נוגעים באזור", body: "האזור מתמלא בצבע הנבחר. בלי גרירה ובלי דיוק." },
        { title: "משנים דעה", body: "צובעים שוב באותו אזור בצבע אחר. אין הגבלה." },
      ],

      tips: [
        {
          title: "להתחיל מהגדול",
          body: "רקע ושמיים קודם, פרטים אחר כך. ככה הציור נראה שלם מוקדם והילד לא מתייאש באמצע.",
        },
        {
          title: "לצבוע לא לפי המציאות",
          body: "פיל סגול הוא בחירה טובה. המשחק הזה לא מתקן אף אחד, וזו כל הנקודה שלו.",
        },
        {
          title: "לחזור לציור ישן",
          body: "העבודה נשמרת, אז אפשר להשאיר ציור באמצע ולהמשיך מחר.",
        },
        {
          title: "לתת לילד לבחור את הציור",
          body: "הבחירה עצמה היא חצי מהעניין, במיוחד לילדים שלא רגילים שנותנים להם.",
        },
      ],

      teaches: [
        { title: "שמות צבעים", body: "20 צבעים שחוזרים בכל ציור, וילדים מתחילים לבקש אותם בשם מעצמם." },
        { title: "דיוק בנגיעה", body: "אזורים קטנים דורשים אצבע מכוונת, וזה מתאמן בלי שאף אחד קורא לזה תרגיל." },
        { title: "תכנון", body: "איזה צבע לאן זו החלטה, ורוב הילדים מתחילים לתכנן אחרי הציור השני." },
        {
          title: "שאין תשובה נכונה",
          body: "זה נשמע קטן והוא לא. משחק שבו אי אפשר לטעות הוא חוויה נדירה לילד שכל השאר מודדים אותו.",
        },
      ],

      ages: [
        { title: "2 עד 3", body: "מושלם. נגיעה אחת ממלאת אזור שלם, אז אין תסכול מוטורי בכלל." },
        { title: "4 עד 6", body: "פה מתחילים לבחור צבעים בכוונה ולא באקראי." },
        { title: "7 ומעלה", body: "עדיין נעים, אבל ילדים בגיל הזה לרוב רוצים כלי חופשי יותר." },
        {
          title: "הורים",
          body: "זה המשחק שאפשר לתת בלי לחשוב פעמיים. אין שעון ואין ניקוד, ואין רגע שבו הילד קורא לכם.",
        },
      ],

      accessibility:
        "נגיעה אחת למילוי אזור, בלי גרירה ובלי החזקה, אז יד רועדת או אמצעי קלט חלופי מקבלים בדיוק את התוצאה שהתכוונו אליה. האזורים גדולים והקווים עבים. 20 הצבעים נבדלים גם בבהירות ולא רק בגוון, ולכל אחד יש שם קולי לקוראי מסך, כך שאפשר לבחור צבע גם בלי לראות אותו. אין שעון ואין הבהובים, ואי אפשר להגיע למצב של טעות שדורש הודעה.",

      together: [
        { title: "ציור אחד, שניים", body: "כל אחד צובע אזור בתורו. הציור יוצא מוזר וזה החלק הטוב." },
        {
          title: "לבחור אחד לשני",
          body: "אתם בוחרים את הצבע והילד בוחר את האזור. פתאום כולם צריכים להסביר.",
        },
        { title: "לספר על הציור", body: "כשגמרתם, בקשו סיפור על מה שקורה בתמונה. הצביעה הופכת לפתיחה." },
        {
          title: "אותו ציור פעמיים",
          body: "צבעו את אותו ציור בשתי ערכות צבעים שונות והשוו. אותם קווים, שתי תמונות.",
        },
      ],

      faq: [
        {
          q: "משחק הצביעה חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות. גם ציור שנפתח בכסף אין כאן: כל 20 הציורים פתוחים מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "למה אין ניקוד במשחק הזה?",
          a: "כי אין פה נכון ולא נכון. לכל 20 המשחקים האחרים באתר יש שיא, וזה היחיד שלא יהיה לו אף פעם. לדרג ציור של ילד זה לומר לו שהיה יכול לעשות את זה יותר טוב.",
        },
        {
          q: "אפשר לצבוע מחוץ לקווים?",
          a: "לא, וזה בכוונה. נגיעה ממלאת אזור שלם, אז ילד בן שלוש מקבל בדיוק את התוצאה שהתכוון אליה בלי לדרוש שליטה מוטורית שאין לו עדיין.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין ציורים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "הציורים נשמרים?",
          a: "כן, על המכשיר עצמו ובזמן אמת. אין שמירה בענן ואין חשבון, אז ניקוי היסטוריית הדפדפן מוחק אותם.",
        },
        {
          q: "כמה ציורים וכמה צבעים יש?",
          a: "20 ציורים ו-20 צבעים. כל ציור מחולק לאזורים סגורים ואפשר לצבוע כל אזור מחדש כמה פעמים שרוצים.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משנתיים בערך. אין קריאה, אין דיוק נדרש ואין מצב שבו משהו משתבש.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["צביעה", "דפי צביעה", "ציור", "יצירה", "לגיל הרך", "צבעים"],
    },

    en: {
      metaTitle: "Coloring - Free Digital Coloring Pages for Kids | Ellaz",
      metaDescription:
        "A free coloring game in your browser. 20 pictures and 20 colours, with no score and no way to get it wrong. No signup.",

      lede: "A free coloring game for children. Pick a picture, pick a colour, touch an area and it fills. No score, no clock, and no way to colour something incorrectly.",

      body: [
        "A line drawing. 20 colours down the side. Touch, and it fills.",

        "This is the only game on the site that keeps no record, and it never will. Every other game has one, because a solve time or a streak length can honestly be compared to yesterday's. A child's drawing is not that. Ranking it means telling them they could have done it better, and at four years old that is the exact sentence that makes children stop drawing. There is no right and wrong here, so there is nothing to count.",

        "20 pictures in total: a house, a fish, a butterfly, a flower and more. Each is divided into closed areas, and any area takes any colour as many times as you like. A pink sky is a choice rather than a mistake, and no message will ever appear to suggest otherwise.",

        "There is no brush and no dragging. You touch an area and it fills, which means a small unsteady hand gets exactly the result it intended. That is deliberate: a free drawing tool would give a seven-year-old more control and a three-year-old nothing but frustration.",

        "Work saves to the device as you go, so you can close it and come back. There is no cloud save and no account, which means clearing browser history erases the drawings. That is the price of not asking you for anything.",
      ],

      howToPlay: [
        { title: "Pick a picture", body: "20 of them, all open from the start. Nothing is locked." },
        { title: "Pick a colour", body: "20 colours in the side bar. One tap selects." },
        { title: "Touch an area", body: "It fills with the selected colour. No dragging and no precision needed." },
        { title: "Change your mind", body: "Touch the same area again in another colour. No limit." },
      ],

      tips: [
        {
          title: "Start with the big areas",
          body: "Background and sky first, details after. The picture looks whole early, so a child does not give up halfway.",
        },
        {
          title: "Colour it wrong on purpose",
          body: "A purple elephant is a good choice. This game corrects nobody, and that is the entire point of it.",
        },
        {
          title: "Come back to an old one",
          body: "Work is saved, so a half-finished picture can wait until tomorrow.",
        },
        {
          title: "Let them pick the picture",
          body: "The choosing is half of it, especially for children who rarely get to choose.",
        },
      ],

      teaches: [
        { title: "Colour names", body: "20 colours recurring across every picture, and children start asking for them by name." },
        { title: "Touch accuracy", body: "Small areas need an aimed finger, and that practises without anybody calling it an exercise." },
        { title: "Planning", body: "Which colour goes where is a decision, and most children start planning by their second picture." },
        {
          title: "That there is no right answer",
          body: "It sounds small and it is not. A game where you cannot be wrong is a rare experience for a child everything else measures.",
        },
      ],

      ages: [
        { title: "2 to 3", body: "Ideal. One tap fills a whole area, so there is no motor frustration at all." },
        { title: "4 to 6", body: "This is where colours start being chosen deliberately rather than at random." },
        { title: "7 and up", body: "Still pleasant, though children this age usually want a freer tool." },
        {
          title: "Parents",
          body: "The one you can hand over without a second thought. No clock and no score, and no moment where they call you.",
        },
      ],

      accessibility:
        "One tap fills an area, with no dragging and no holding, so an unsteady hand or an alternative input device gets exactly the intended result. Areas are large and the lines are thick. The 20 colours differ in brightness as well as hue, and each carries a spoken name for screen readers, so a colour can be chosen without seeing it. No clock and nothing flashing, and there is no error state to warn about because one cannot occur.",

      together: [
        { title: "One picture, two people", body: "Take turns filling an area each. The result is strange and that is the good part." },
        {
          title: "Choose for each other",
          body: "You pick the colour, they pick the area. Suddenly everybody has to explain themselves.",
        },
        { title: "Tell the story", body: "When it is done, ask what is happening in the picture. The colouring becomes the opening." },
        {
          title: "Same picture twice",
          body: "Colour one drawing with two different palettes and compare. Same lines, two pictures.",
        },
      ],

      faq: [
        {
          q: "Is the coloring game free?",
          a: "Completely. Nothing to pay, no purchases, and no pictures unlocked by money. All 20 are open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
        },
        {
          q: "Why is there no score in this game?",
          a: "Because there is no right and wrong here. Every other game on the site keeps a record and this is the one that never will. Ranking a child's drawing means telling them they could have done it better.",
        },
        {
          q: "Can you colour outside the lines?",
          a: "No, and that is deliberate. A tap fills a whole area, so a three-year-old gets exactly what they intended without needing motor control they do not have yet.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between pictures." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "Are the drawings saved?",
          a: "Yes, on the device itself and as you go. There is no cloud save and no account, so clearing browser history erases them.",
        },
        {
          q: "How many pictures and colours are there?",
          a: "20 pictures and 20 colours. Each picture is divided into closed areas and any area can be recoloured as often as you like.",
        },
        {
          q: "What age is this for?",
          a: "From about two. No reading, no precision required, and no state in which anything goes wrong.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["coloring", "coloring pages", "drawing", "creative", "preschool", "colours"],
    },
    es: {
      metaTitle: "Colorear - dibujos para pintar gratis online | Ellaz",
      metaDescription:
        "Juego de colorear gratis en el navegador. 20 dibujos y 20 colores, sin puntuación y sin forma de hacerlo mal. Sin registro.",

      lede: "Un juego de colorear gratuito para niños. Eliges un dibujo, eliges un color, tocas una zona y se rellena. Sin puntuación, sin reloj, y sin ninguna forma de colorear algo incorrectamente.",

      body: [
        "Un dibujo de líneas. 20 colores al lado. Tocas. Se rellena.",

        "Este es el único juego de la web que no guarda ningún récord, y nunca lo hará. Todos los demás tienen uno, porque un tiempo de resolución o una racha se pueden comparar honestamente con los de ayer. El dibujo de un niño no. Puntuarlo significa decirle que podría haberlo hecho mejor, y a los cuatro años esa es exactamente la frase que hace que los niños dejen de dibujar. Aquí no hay bien ni mal, así que no hay nada que contar.",

        "20 dibujos en total: una casa, un pez, una mariposa, una flor y más. Cada uno está dividido en zonas cerradas, y cualquier zona admite cualquier color las veces que quieras. Un cielo rosa es una decisión y no un error, y nunca va a aparecer ningún mensaje sugiriendo lo contrario.",

        "No hay pincel ni hay que arrastrar. Tocas una zona y se rellena, lo que significa que una mano pequeña y poco firme obtiene exactamente el resultado que pretendía. Es a propósito: una herramienta de dibujo libre le daría a un niño de siete años más control y a uno de tres nada más que frustración.",

        "El trabajo se guarda en el aparato sobre la marcha, así que podéis cerrarlo y volver. No hay copia en la nube ni cuenta, lo que significa que borrar el historial del navegador borra los dibujos. Ese es el precio de no pediros nada.",
      ],

      howToPlay: [
        { title: "Elige un dibujo", body: "Hay 13, todos abiertos desde el principio. No hay nada bloqueado." },
        { title: "Elige un color", body: "20 colores en la barra lateral. Un toque lo selecciona." },
        { title: "Toca una zona", body: "Se rellena con el color elegido. Sin arrastrar y sin necesidad de puntería." },
        { title: "Cambia de idea", body: "Toca la misma zona otra vez con otro color. Sin límite." },
      ],

      tips: [
        {
          title: "Empieza por las zonas grandes",
          body: "Primero el fondo y el cielo, los detalles después. El dibujo parece entero pronto, así que el niño no lo abandona a mitad.",
        },
        {
          title: "Coloread mal a propósito",
          body: "Un elefante morado es una buena elección. Este juego no corrige a nadie, y esa es su razón de ser entera.",
        },
        {
          title: "Volved a uno antiguo",
          body: "El trabajo se guarda, así que un dibujo a medias puede esperar hasta mañana.",
        },
        {
          title: "Dejadle elegir el dibujo",
          body: "Elegir es la mitad del asunto, sobre todo para los niños que pocas veces eligen algo.",
        },
      ],

      teaches: [
        { title: "Nombres de colores", body: "20 colores que se repiten en todos los dibujos, y los niños empiezan a pedirlos por su nombre." },
        { title: "Puntería", body: "Las zonas pequeñas piden un dedo dirigido, y eso se practica sin que nadie lo llame ejercicio." },
        { title: "Planificar", body: "Qué color va dónde es una decisión, y casi todos los niños empiezan a planificar en su segundo dibujo." },
        {
          title: "Que no hay respuesta correcta",
          body: "Suena a poca cosa y no lo es. Un juego en el que no puedes equivocarte es una experiencia rara para un niño al que todo lo demás mide.",
        },
      ],

      ages: [
        { title: "2 a 3", body: "Ideal. Un toque rellena una zona entera, así que no hay ninguna frustración motriz." },
        { title: "4 a 6", body: "Aquí es donde los colores empiezan a elegirse a propósito y no al azar." },
        { title: "7 en adelante", body: "Sigue siendo agradable, aunque a esta edad suelen querer una herramienta más libre." },
        {
          title: "Padres",
          body: "Este es el que podéis dar sin pensarlo dos veces. Sin reloj y sin puntuación, y sin ningún momento en el que os llamen.",
        },
      ],

      accessibility:
        "Un toque rellena una zona, sin arrastrar y sin mantener pulsado, así que una mano poco firme o un dispositivo de entrada alternativo obtienen exactamente el resultado pretendido. Las zonas son grandes y las líneas gruesas. Los 20 colores se diferencian en luminosidad además de en tono, y cada uno lleva su nombre hablado para lectores de pantalla, de modo que se puede elegir un color sin verlo. Sin reloj y sin nada que parpadee, y no hay ningún estado de error del que avisar porque no puede producirse.",

      together: [
        { title: "Un dibujo, dos personas", body: "Turnaos rellenando una zona cada uno. El resultado es raro y esa es la parte buena." },
        {
          title: "Elegid el uno por el otro",
          body: "Tú eliges el color y él la zona. De repente todo el mundo tiene que explicarse.",
        },
        { title: "Contad la historia", body: "Cuando esté terminado, preguntad qué está pasando en el dibujo. El coloreado se convierte en el principio." },
        {
          title: "El mismo dibujo dos veces",
          body: "Coloread un mismo dibujo con dos paletas distintas y comparad. Las mismas líneas, dos dibujos.",
        },
      ],

      faq: [
        {
          q: "¿El juego de colorear es gratis?",
          a: "Del todo. Nada que pagar, ninguna compra, y ningún dibujo desbloqueado con dinero. Los 20 están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y no pedimos ningún correo.",
        },
        {
          q: "¿Por qué este juego no tiene puntuación?",
          a: "Porque aquí no hay bien ni mal. Todos los demás juegos de la web guardan un récord y este es el que nunca lo hará. Puntuar el dibujo de un niño significa decirle que podría haberlo hecho mejor.",
        },
        {
          q: "¿Se puede pintar fuera de las líneas?",
          a: "No, y es a propósito. Un toque rellena una zona entera, así que un niño de tres años obtiene exactamente lo que pretendía sin necesitar un control motriz que todavía no tiene.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre dibujo y dibujo." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Se guardan los dibujos?",
          a: "Sí, en el propio aparato y sobre la marcha. No hay copia en la nube ni cuenta, así que borrar el historial del navegador los borra.",
        },
        {
          q: "¿Cuántos dibujos y colores hay?",
          a: "20 dibujos y 20 colores. Cada dibujo está dividido en zonas cerradas y cualquier zona se puede recolorear las veces que se quiera.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos dos años. No hay que leer ni tener puntería, y no existe ningún estado en el que algo salga mal.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["colorear", "dibujos para pintar", "dibujar", "creatividad", "infantil", "colores"],
    },
  },

  provenance: [
    {
      claim: "20 pictures plus a blank page, and a 20-colour palette",
      source: "src/games/coloring/pictures.ts",
    },
    {
      claim: "this is the only game of the 21 that keeps no record, permanently and by design",
      source: ".claude/rules/score-contract-convention.md",
    },
    {
      claim: "20 of the other games do keep a record",
      source: "src/sdk/score.ts",
    },
  ],
};
