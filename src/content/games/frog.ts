import type { GameContent } from "../types";
import { frogFr } from "./fr/frog";

/**
 * The chasing game with nothing to lose, and the page whose statistic is about
 * a limit rather than an achievement.
 *
 * The frog gets faster with every hop, down to a floor. The interesting derived
 * fact is whether a round lasts long enough to ever MEET that floor, and
 * `scripts/sim/spawn-ladder.mjs` says only hard does. On easy and medium the
 * round ends while the frog is still slowing down toward its fastest, which is
 * a real and non-obvious property of the difficulty design.
 */
export const frog: GameContent = {
  id: "frog",

  copy: {
    he: {
      name: "תפסו את הצפרדע",
      metaTitle: "תפסו את הצפרדע - משחק לילדים חינם | Ellaz",
      metaDescription:
        "משחק צפרדע חינם לילדים. צפרדע קופצת בין עלי נופר וצריך לגעת בה. בלי הפסד, בלי הורדה ובלי הרשמה.",

      lede: "משחק חינם לילדים שבו צפרדע יושבת על עלה נופר וקופצת לעלה אחר. נוגעים בה והיא קופצת. לא נוגעים בה והיא קופצת בכל מקרה, אז אי אפשר לפספס באמת.",

      body: [
        "צפרדע על עלה. נוגעים בה, והיא קופצת לעלה אחר. זהו כל המשחק.",

        "הרעיון שמחזיק את זה הוא שאי אפשר להיכשל. צפרדע שלא נגעו בה קופצת בעצמה, אז מה שנראה כמו החמצה הוא פשוט הקפיצה הבאה. ילד בן שלוש לא חווה כאן רגע אחד של תסכול, כי אין מצב במשחק שבו משהו רע קורה. הסיבוב נגמר אחרי שש עד עשר תפיסות לפי הרמה, וכל תפיסה מקרבת אליו.",

        "ויש כאן מספר שאפילו אנחנו לא ידענו עד שמדדנו. הצפרדע מתקצרת בזמן הישיבה עם כל קפיצה, עד רצפה שממנה היא לא יורדת. ברמה הקלה יש 2.94 שניות לכוון בקפיצה הראשונה ו-2.49 באחרונה של הסיבוב, והרצפה, 1.74 שניות, מגיעה רק אחרי 14 קפיצות. אבל הסיבוב נגמר אחרי שש. כלומר ברמה הקלה ובבינונית ילד לא פוגש אף פעם את הצפרדע המהירה ביותר שהרמה יודעת לייצר. רק בקשה זה קורה, בקפיצה השמינית מתוך עשר.",

        "רצפת הזמן היא לא החלטה של טעם אלא של בטיחות. צפרדע שיושבת פחות זמן ממה שילד צריך כדי לראות, להחליט ולהגיע לא הופכת את המשחק לקשה, היא הופכת את הסיבוב לבלתי אפשרי לסיום ומשאירה ילד קטן נוגע במסך בלי דרך החוצה.",

        "שני כללים קטנים שומרים על ההיגיון. הצפרדע לעולם לא קופצת לעלה שהיא כבר יושבת עליו, כי ילד שראה משהו קורה ושום דבר לא השתנה חושב שהמשחק נתקע. ויש בדיוק צפרדע אחת, תמיד. הרמות משנות את מספר העלים, ארבעה, חמישה או שישה.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. משתנים מספר העלים ומהירות הקפיצות." },
        { title: "מוצאים את הצפרדע", body: "היא יושבת על אחד העלים ומחכה." },
        { title: "נוגעים בה", body: "נגיעה אחת. היא קופצת לעלה אחר, אף פעם לא לאותו אחד." },
        { title: "מסיימים סיבוב", body: "שש עד עשר תפיסות לפי הרמה, ואז עולים שלב." },
      ],

      tips: [
        {
          title: "להסתכל על העלים הריקים",
          body: "היא לא תחזור לעלה שהיא עליו, אז הקפיצה הבאה תמיד לאחד מהאחרים. זה מצמצם את החיפוש.",
        },
        {
          title: "לנוח את היד באמצע",
          body: "אצבע שממתינה במרכז המסך מגיעה לכל עלה מהר יותר מאצבע שנשארה במקום התפיסה הקודמת.",
        },
        {
          title: "לא למהר בהתחלה",
          body: "הקפיצות הראשונות בסיבוב איטיות בכוונה. שווה לנצל אותן כדי ללמוד איפה העלים.",
        },
        {
          title: "הקשה היא היחידה שמאיצה עד הסוף",
          body: "רק שם הצפרדע מגיעה למהירות המקסימלית שלה בתוך סיבוב, וזה קורה בקפיצה השמינית.",
        },
      ],

      teaches: [
        { title: "מעקב חזותי", body: "העין צריכה למצוא מטרה שזזה למקום חדש, וזה בדיוק מה שמתאמן פה." },
        { title: "דיוק באצבע", body: "לא מספיק לראות איפה היא, צריך גם להגיע לשם. שני דברים שונים." },
        {
          title: "התמדה בלי עונש",
          body: "כל קפיצה היא הזדמנות חדשה, אז ילד ממשיך לנסות בלי שאף אחד צריך לעודד אותו.",
        },
        { title: "לצפות מראש", body: "אחרי כמה קפיצות מתחילים לנחש לאן היא תלך, וזו תחילת של אסטרטגיה." },
      ],

      ages: [
        { title: "2 עד 3", body: "רמה קלה, ארבעה עלים וכמעט שלוש שניות לכל קפיצה. אין לחץ בכלל." },
        { title: "4 עד 5", body: "קלה לבד, ואז בינונית כשהיא מתחילה להיות קלה מדי." },
        { title: "6 ומעלה", body: "קשה. שישה עלים וצפרדע שבאמת מגיעה למהירות המלאה שלה." },
        {
          title: "הורים",
          body: "אין כאן שום דבר שאפשר להפסיד, אז זה משחק שאפשר לתת ולצאת מהחדר.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. הצפרדע גדולה מ-2 על 2 סנטימטרים בכל מסך, והעלים מרוחקים זה מזה מספיק כדי שנגיעה לא מדויקת עדיין תנחת על הנכון. הצפרדע נבדלת מהעלה בצורה ולא רק בצבע. אין שעון, אין ספירה לאחור ואין הבהובים, וגם הרמה המהירה ביותר משאירה יותר משנייה לכוון. אפשר לשחק בשקט מוחלט בלי לאבד שום מידע.",

      together: [
        { title: "לנחש לאן", body: "לפני הנגיעה, הצביעו על העלה שאליו לדעתכם היא תקפוץ. אף אחד לא צודק הרבה." },
        { title: "תפיסה בתורות", body: "כל אחד תופס פעם אחת. אותו סיבוב, שני זוגות עיניים." },
        {
          title: "לספור עלים",
          body: "עם ילד קטן, ספרו את עלי הנופר לפני שמתחילים. ארבעה, חמישה או שישה לפי הרמה.",
        },
        { title: "לתפוס עם עין אחת", body: "אתגר מטופש שמשנה את המשחק לגמרי ומצחיק את כולם." },
      ],

      faq: [
        {
          q: "משחק הצפרדע חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. כל המשחקים באתר פתוחים מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "מה קורה אם לא מספיקים לתפוס אותה?",
          a: "היא קופצת בעצמה וממשיכים. אין ניקוד שיורד ואין חיים, אז החמצה היא פשוט הקפיצה הבאה.",
        },
        {
          q: "המשחק נעשה מהר מדי לילד קטן?",
          a: "יש רצפה שממנה הצפרדע לא מאיצה, וגם ברמה המהירה ביותר נשארות יותר משנייה ומעט לכוון. ברמה הקלה ובבינונית הסיבוב בכלל נגמר לפני שהיא מגיעה למהירותה המלאה.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "כמה תפיסות מסיימות סיבוב?",
          a: "שש ברמה הקלה, שמונה בבינונית ועשר בקשה. אחרי זה עולים שלב והסיבוב הבא מתחיל מעט מהר יותר.",
        },
        {
          q: "היא יכולה לקפוץ לאותו עלה פעמיים ברצף?",
          a: "לא, אף פעם. ילד שראה קפיצה ושום דבר לא השתנה על המסך חושב שהמשחק נתקע, אז הכלל הזה נאכף בקוד ולא נשען על מזל.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משנתיים בערך, ברמה הקלה. אין קריאה בשום מקום וצריך רק לגעת במשהו שזז.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["צפרדע", "עלי נופר", "משחק לילדים", "לגיל הרך", "דיוק", "נגיעה"],
    },

    en: {
      name: "Catch the Frog",
      metaTitle: "Catch the Frog - Free Game for Toddlers | Ellaz",
      metaDescription:
        "A free frog game for young children. A frog hops between lily pads and you tap it. Nothing to lose, no download, no signup.",

      lede: "A free game where a frog sits on a lily pad and hops to another one. Tap it and it hops. Leave it alone and it hops anyway, so nothing here can really be missed.",

      body: [
        "A frog on a pad. Tap it, and it hops somewhere else. That is the whole game.",

        "What holds it together is that failing is not available. A frog nobody touched hops on its own, so what looks like a miss is simply the next hop. A three-year-old does not experience one moment of frustration here, because there is no state in this game where something bad happens. A round ends after six to ten catches depending on the level, and every catch moves you toward it.",

        "There is a number here we did not know until we measured it. The frog's sitting time shrinks with every hop, down to a floor it never goes below. On easy you get 2.94 seconds to aim at the first hop and 2.49 at the last one of the round, while the floor of 1.74 seconds arrives only after fourteen hops. The round ends after six. Which means that on easy and on medium, a child never once meets the fastest frog the level is capable of producing. Only hard gets there, at the eighth hop out of ten.",

        "That floor is a safety limit rather than a taste one. A frog sitting for less time than a child needs to see it, decide, and land a finger does not make the game hard. It makes the round impossible to finish, and leaves a small child tapping at a screen with no way out of it.",

        "Two small rules keep the thing coherent. The frog never hops onto the pad it is already on, because a child who watched something happen and saw nothing change concludes the game is stuck. And there is exactly one frog, always. The levels change how many pads there are: four, five or six.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. Pad count and hop speed both change." },
        { title: "Find the frog", body: "It is sitting on one of the pads, waiting." },
        { title: "Tap it", body: "One tap. It hops to a different pad, never the same one." },
        { title: "Finish the round", body: "Six to ten catches depending on the level, then you move up." },
      ],

      tips: [
        {
          title: "Watch the empty pads",
          body: "It will not return to the pad it is on, so the next hop is always one of the others. That shrinks the search.",
        },
        {
          title: "Rest your hand in the middle",
          body: "A finger waiting at the centre reaches any pad faster than one left where the last catch happened.",
        },
        {
          title: "Do not rush the opening",
          body: "The first hops of a round are deliberately slow. Use them to learn where the pads are.",
        },
        {
          title: "Only hard reaches full speed",
          body: "It is the one level where the frog hits its maximum inside a single round, and that happens at the eighth hop.",
        },
      ],

      teaches: [
        { title: "Visual tracking", body: "The eye has to find a target that moved somewhere new, which is exactly the exercise." },
        { title: "Finger accuracy", body: "Seeing where it went is not the same as getting there. Two different skills." },
        {
          title: "Persistence without punishment",
          body: "Every hop is a fresh chance, so a child keeps trying without anybody needing to encourage them.",
        },
        { title: "Anticipation", body: "After a few hops you start guessing where it will go, which is where strategy begins." },
      ],

      ages: [
        { title: "2 to 3", body: "Easy. Four pads and nearly three seconds per hop, with no pressure at all." },
        { title: "4 to 5", body: "Easy alone, then medium once that starts feeling slow." },
        { title: "6 and up", body: "Hard. Six pads and a frog that genuinely reaches its top speed." },
        {
          title: "Parents",
          body: "There is nothing here that can be lost, so this is one you can hand over and walk away from.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. The frog is larger than 2cm square on any screen and the pads are spaced far enough apart that an imprecise tap still lands on the right one. The frog differs from the pad in shape rather than only in colour. There is no clock, no countdown and nothing that flashes, and even the fastest level leaves more than a second to aim. The whole game plays in silence without losing any information.",

      together: [
        { title: "Guess the pad", body: "Point at where you think it will land before tapping. Nobody is right very often." },
        { title: "Take turns catching", body: "One catch each. Same round, two pairs of eyes." },
        {
          title: "Count the pads",
          body: "With a young child, count the lily pads before starting. Four, five or six depending on the level.",
        },
        { title: "One eye closed", body: "A silly challenge that changes the game completely and makes everyone laugh." },
      ],

      faq: [
        {
          q: "Is the frog game free?",
          a: "Completely. Nothing to pay and no purchases inside the game. Every game on the site is open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
        },
        {
          q: "What happens if my child does not catch it in time?",
          a: "It hops by itself and play continues. No score drops and there are no lives, so a miss is simply the next hop.",
        },
        {
          q: "Does it get too fast for a small child?",
          a: "There is a floor the frog never speeds past, and even the fastest level leaves more than a second to aim. On easy and medium the round actually ends before the frog reaches its full speed at all.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "How many catches finish a round?",
          a: "Six on easy, eight on medium and ten on hard. After that you move up a level and the next round starts slightly faster.",
        },
        {
          q: "Can it hop onto the same pad twice in a row?",
          a: "Never. A child who watched a hop and saw nothing change on screen concludes the game is stuck, so that rule is enforced in code rather than left to luck.",
        },
        {
          q: "What age is this for?",
          a: "From about two on easy. There is no reading anywhere and the only requirement is touching something that moves.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["frog", "lily pads", "toddler game", "preschool", "tapping", "hand eye"],
    },
    es: {
      name: "Atrapa la rana",
      metaTitle: "Atrapa la rana - juego gratis para peques | Ellaz",
      metaDescription:
        "Juego gratis de ranas para niños pequeños. Una rana salta de nenúfar en nenúfar y hay que tocarla. Nada que perder, sin registro.",

      lede: "Un juego gratuito en el que una rana está sentada en un nenúfar y salta a otro. La tocas y salta. La dejas en paz y salta igualmente, así que aquí no se puede fallar de verdad.",

      body: [
        "Una rana en un nenúfar. La tocas. Salta a otro sitio. Ese es el juego entero.",

        "Lo que lo sostiene es que fallar no está disponible. Una rana que nadie ha tocado salta sola, así que lo que parece un fallo es sencillamente el siguiente salto. Un niño de tres años no vive aquí ni un momento de frustración, porque no existe ningún estado del juego en el que pase algo malo. Una ronda acaba tras seis a diez atrapadas según el nivel, y cada atrapada acerca el final.",

        "Hay un número aquí que no conocíamos hasta que lo medimos. El tiempo que la rana pasa sentada se encoge con cada salto, hasta un suelo por debajo del cual nunca baja. En fácil tienes 2,94 segundos para apuntar en el primer salto y 2,49 en el último de la ronda, mientras que el suelo de 1,74 segundos solo llega después de catorce saltos. La ronda acaba a los seis. O sea que en fácil y en medio un niño no se encuentra ni una sola vez con la rana más rápida que ese nivel es capaz de producir. Solo el difícil llega, en el octavo salto de diez.",

        "Ese suelo es un límite de seguridad y no de gusto. Una rana sentada menos tiempo del que un niño necesita para verla, decidir y posar un dedo no hace el juego difícil. Hace la ronda imposible de terminar, y deja a un niño pequeño dando toques a una pantalla sin salida.",

        "Dos reglas pequeñas mantienen esto coherente. La rana nunca salta al nenúfar en el que ya está, porque un niño que ha visto pasar algo y no ha visto cambiar nada concluye que el juego está encallado. Y hay una rana. Siempre. Lo que cambian los niveles es cuántos nenúfares hay: cuatro, cinco o seis.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, medio o difícil. Cambian el número de nenúfares y la velocidad del salto." },
        { title: "Busca la rana", body: "Está sentada en uno de los nenúfares, esperando." },
        { title: "Tócala", body: "Un toque. Salta a otro nenúfar, nunca al mismo." },
        { title: "Termina la ronda", body: "De seis a diez atrapadas según el nivel, y después subes." },
      ],

      tips: [
        {
          title: "Mira los nenúfares vacíos",
          body: "No va a volver al nenúfar en el que está, así que el siguiente salto es siempre uno de los otros. Eso reduce la búsqueda.",
        },
        {
          title: "Deja la mano en el centro",
          body: "Un dedo esperando en el medio llega a cualquier nenúfar más rápido que uno abandonado donde ocurrió la última atrapada.",
        },
        {
          title: "No corras al principio",
          body: "Los primeros saltos de una ronda son lentos a propósito. Aprovechadlos para aprenderos dónde están los nenúfares.",
        },
        {
          title: "Solo el difícil llega al tope",
          body: "Es el único nivel donde la rana alcanza su máximo dentro de una misma ronda, y eso pasa en el octavo salto.",
        },
      ],

      teaches: [
        { title: "Seguimiento visual", body: "El ojo tiene que encontrar un objetivo que se ha ido a otro sitio, que es justo el ejercicio." },
        { title: "Precisión con el dedo", body: "Ver adónde ha ido no es lo mismo que llegar. Son dos habilidades distintas." },
        {
          title: "Insistir sin castigo",
          body: "Cada salto es una oportunidad nueva, así que un niño sigue intentándolo sin que nadie tenga que animarlo.",
        },
        { title: "Anticipación", body: "Después de unos cuantos saltos empiezas a adivinar hacia dónde irá, y ahí empieza la estrategia." },
      ],

      ages: [
        { title: "2 a 3", body: "Fácil. Cuatro nenúfares y casi tres segundos por salto, sin ninguna presión." },
        { title: "4 a 5", body: "Fácil solos, y medio cuando eso empiece a parecerles lento." },
        { title: "6 en adelante", body: "Difícil. Seis nenúfares y una rana que llega de verdad a su velocidad máxima." },
        {
          title: "Padres",
          body: "Aquí no hay nada que se pueda perder, así que este es de los que podéis soltar y marcharos.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. La rana mide más de 2 centímetros de lado en cualquier pantalla y los nenúfares están lo bastante separados como para que un toque poco preciso caiga igualmente en el correcto. La rana se distingue del nenúfar por la forma y no solo por el color. No hay reloj, ni cuenta atrás, ni nada que parpadee, e incluso el nivel más rápido deja más de un segundo para apuntar. El juego entero se juega en silencio sin perder ninguna información.",

      together: [
        { title: "Adivina el nenúfar", body: "Señalad dónde creéis que va a caer antes de tocar. Nadie acierta demasiado." },
        { title: "Atrapad por turnos", body: "Una atrapada cada uno. Misma ronda, dos pares de ojos." },
        {
          title: "Contad los nenúfares",
          body: "Con un niño pequeño, contad los nenúfares antes de empezar. Cuatro, cinco o seis según el nivel.",
        },
        { title: "Con un ojo cerrado", body: "Un reto tonto que cambia el juego por completo y hace reír a todo el mundo." },
      ],

      faq: [
        {
          q: "¿El juego de la rana es gratis?",
          a: "Del todo. Nada que pagar y ninguna compra dentro del juego. Todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y no pedimos ningún correo.",
        },
        {
          q: "¿Qué pasa si mi hijo no llega a tiempo?",
          a: "Salta sola y se sigue jugando. No baja ninguna puntuación y no hay vidas, así que un fallo es sencillamente el siguiente salto.",
        },
        {
          q: "¿Se pone demasiado rápida para un niño pequeño?",
          a: "Hay un suelo que la rana nunca sobrepasa, e incluso el nivel más rápido deja más de un segundo para apuntar. En fácil y en medio la ronda termina antes de que la rana llegue siquiera a su velocidad máxima.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "¿Cuántas atrapadas terminan una ronda?",
          a: "Seis en fácil, ocho en medio y diez en difícil. Después subes de nivel y la siguiente ronda empieza algo más rápida.",
        },
        {
          q: "¿Puede saltar dos veces seguidas al mismo nenúfar?",
          a: "Nunca. Un niño que ha visto un salto y no ha visto cambiar nada en pantalla concluye que el juego está encallado, así que esa regla está impuesta en el código y no dejada a la suerte.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos dos años en fácil. No se lee nada y lo único que hace falta es tocar algo que se mueve.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["rana", "nenúfares", "juego para bebés", "infantil", "tocar", "coordinación"],
    },

    fr: frogFr,
  },

  provenance: [
    {
      claim: "2.94s to aim at the first hop on easy, 2.49s at the last of the round, and a floor of 1.74s reached only after 14 hops",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "only hard reaches its dwell floor inside a round, at the eighth hop of ten",
      source: "scripts/sim/spawn-ladder.mjs",
    },
    {
      claim: "four, five or six pads and six, eight or ten catches per round by difficulty",
      source: "src/games/frog/logic.ts",
    },
    {
      claim: "the frog never hops onto the pad it already occupies, and there is exactly one frog",
      source: "src/games/frog/logic.ts",
    },
  ],
};
