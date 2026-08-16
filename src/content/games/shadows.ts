import type { GameContent } from "../types";
import { shadowsFr } from "./fr/shadows";

/**
 * The page whose statistic is a counter-example: medium and hard offer the SAME
 * number of choices, so a guess is worth exactly as much on both. What changes
 * is that hard draws every silhouette from one theme, which makes looking worth
 * far less. A page quoting only the choice count would call them the same level.
 *
 * `scripts/sim/thinking-levels.mjs` asserts that equality holds and prints a
 * warning instead of the claim if a retune ever breaks it.
 */
export const shadows: GameContent = {
  id: "shadows",

  copy: {
    he: {
      name: "צל ותמונה",
      metaTitle: "צל ותמונה - משחק התאמה לילדים | Ellaz",
      metaDescription:
        "משחק צללים חינם לילדים. רואים צל, ומוצאים לאיזה דבר הוא שייך. שלוש רמות, בלי הרשמה ובלי הורדה.",

      lede: "משחק חינם לילדים שבו מופיע צל של משהו, וצריך למצוא מי הטיל אותו. שלוש רמות, בלי שעון, ובלי שום דרך להפסיד.",

      body: [
        "צל אחד למעלה. כמה תמונות למטה. נוגעים במי שמתאים.",

        "והדבר המעניין ברמות פה הוא מה שלא משתנה. ברמה הבינונית יש ארבע אפשרויות ובקשה יש ארבע, בדיוק אותו מספר, אז ניחוש עיוור שווה 25% בשתיהן. מה שמשתנה הוא מאיפה מגיעות האפשרויות: בבינונית כל אחת מקטגוריה אחרת, פיל מול כיסא מול תפוח, וצללים של דברים שונים כל כך נבדלים במבט. בקשה כולן מאותה משפחה, אז ארבעה צללי חיות שכולם עגלגלים עם ארבע רגליים. הניחוש שווה אותו דבר, ההסתכלות שווה הרבה פחות.",

        "ברמה הקלה יש שלוש אפשרויות, כלומר 33.3% לניחוש, וגם הן מקטגוריות שונות. זו כניסה עדינה בכוונה: ילד בן שלוש שרואה צל של פיל ליד צל של כיסא מבין את המשחק תוך שנייה בלי שאף אחד יסביר.",

        "צל הוא צורה בלי פרטים, וזה בדיוק מה שמאמן. אין צבע לזהות לפיו, אין פנים ואין טקסטורה. נשאר קו המתאר, וזו מיומנות אמיתית שנקראת זיהוי לפי צורה בלבד. ילדים טובים בה בהרבה משנדמה למבוגרים, במיוחד עם בעלי חיים.",

        "תשובה שגויה לא עולה כלום. הצל נשאר, אפשר לנסות שוב מיד, ואין ניקוד שיורד. השלבים ממשיכים בלי סוף והמספר שנשמר הוא כמה רחוק הגעתם ברמה הזאת.",
      ],

      howToPlay: [
        { title: "בוחרים רמה", body: "קלה, בינונית או קשה. משתנה כמה אפשרויות יש וכמה הן דומות." },
        { title: "מסתכלים על הצל", body: "הוא מופיע למעלה, גדול וברור, בלי שום פרט מלבד הצורה." },
        { title: "בוחרים תמונה", body: "נוגעים בזו שלדעתכם הטילה אותו. טעות לא עולה כלום." },
        { title: "ממשיכים", body: "תשובה נכונה מעלה שלב ומביאה צל חדש." },
      ],

      tips: [
        {
          title: "להסתכל על הקצוות",
          body: "חדק, אוזניים, זנב, רגל של כיסא. הפרטים הבולטים בקצה הצורה מזהים אותה מהר יותר מהגוף.",
        },
        {
          title: "לספור רגליים",
          body: "ברמה הקשה כל החיות עגלגלות, אז מספר הרגליים ואורך הזנב הם מה שבאמת מפריד ביניהן.",
        },
        {
          title: "לא למהר",
          body: "אין שעון בכלל. ילד שמסתכל חמש שניות עונה נכון הרבה יותר מילד שנוגע מיד.",
        },
        {
          title: "להתחיל בקלה גם בגיל מבוגר",
          body: "היא לא מעליבה, היא פשוט מסבירה את המשחק בלי מילים. סיבוב אחד שם מספיק.",
        },
      ],

      teaches: [
        { title: "זיהוי לפי צורה", body: "בלי צבע ובלי פרטים, נשאר רק קו המתאר. זו מיומנות בפני עצמה." },
        {
          title: "השוואה בין דומים",
          body: "ברמה הקשה כל האפשרויות מאותה משפחה, אז צריך למצוא את ההבדל הקטן ולא את הגדול.",
        },
        { title: "אוצר מילים חזותי", body: "כל סיבוב מציג חיה או חפץ, וילדים אומרים את השם בקול מעצמם." },
        {
          title: "לחשוב לפני שנוגעים",
          body: "אין עונש על טעות, אז המשחק מלמד לעצור מתוך רצון ולא מתוך פחד.",
        },
      ],

      ages: [
        { title: "3 עד 4", body: "קלה. שלוש אפשרויות מקטגוריות רחוקות, אז ההצלחה כמעט מובטחת." },
        { title: "5 עד 6", body: "בינונית. ארבע אפשרויות, עדיין מעולמות שונים." },
        { title: "7 ומעלה", body: "קשה, שבה כל הצללים מאותה משפחה. פה זה נעשה באמת מעניין." },
        {
          title: "הורים",
          body: "אין מה להפסיד ואין שעון, אז זה משחק טוב לרגע שקט בלי פיקוח.",
        },
      ],

      accessibility:
        "נגיעה אחת, בלי גרירה ובלי החזקה. התמונות גדולות מ-2 על 2 סנטימטרים בכל מסך ומרווחות מספיק שנגיעה לא מדויקת תנחת נכון. המשחק כולו בנוי על צורה ולא על צבע, אז עיוורון צבעים לא רק שאינו מפריע, הוא לא רלוונטי כאן בכלל. אין שעון, אין ספירה לאחור ואין הבהובים. אין קריאה בשום מקום, וכל סיבוב מובן מהתמונה בלבד.",

      together: [
        { title: "להגיד מה זה", body: "בקשו מהילד לומר את שם החיה לפני הנגיעה. ככה שומעים אם הוא זיהה." },
        {
          title: "צללים אמיתיים",
          body: "כבו את האור והטילו צללים ביד על הקיר. אותו משחק, בלי מסך, ומצחיק הרבה יותר.",
        },
        { title: "אתם בוחרים", body: "הילד מסביר איזה צל מתאים ולמה, ואתם נוגעים. זה מכריח נימוק." },
        {
          title: "לחפש הבדל אחד",
          body: "ברמה הקשה, מצאו יחד את הפרט היחיד שמפריד בין שתי האפשרויות הדומות ביותר.",
        },
      ],

      faq: [
        {
          q: "משחק הצללים חינמי?",
          a: "כן, לגמרי. אין תשלום ואין רכישות בתוך המשחק. כל המשחקים באתר פתוחים מהרגע הראשון.",
        },
        {
          q: "צריך להוריד או להירשם?",
          a: "לא. רץ בדפדפן, בלי הורדה ובלי חשבון. גם מייל אנחנו לא מבקשים.",
        },
        {
          q: "מה ההבדל בין בינונית לקשה?",
          a: "לא מספר האפשרויות, שהוא ארבע בשתיהן, אז ניחוש שווה 25% בכל אחת. בקשה כל האפשרויות מאותה משפחה, אז הצללים דומים זה לזה ולא מספיק להסתכל שנייה.",
        },
        {
          q: "מה קורה בתשובה שגויה?",
          a: "כלום. הצל נשאר ואפשר לנסות שוב מיד. אין ניקוד שיורד ואין חיים שנגמרים.",
        },
        { q: "יש פרסומות?", a: "אין. לא באנרים ולא סרטונים בין שלבים." },
        {
          q: "אפשר לשחק בלי אינטרנט?",
          a: "כן. אחרי ביקור אחד המשחק נשמר במכשיר ורץ גם במטוס.",
        },
        {
          q: "הילד לא יודע לקרוא. זה בעיה?",
          a: "לא. אין מילה אחת שצריך לקרוא כדי לשחק. כל סיבוב מובן מהתמונות בלבד.",
        },
        {
          q: "איך השיא נמדד?",
          a: "בכמה שלבים עברתם ברצף, כשיותר זה טוב יותר, ובנפרד לכל רמה. מונה השלבים מתאפס במעבר בין רמות, ולכן הן לא ניתנות להשוואה.",
        },
        {
          q: "מאיזה גיל זה מתאים?",
          a: "משלוש בערך, ברמה הקלה. ילד בגיל הזה מזהה צל של פיל בלי שאף אחד יסביר לו מה זה צל.",
        },
        {
          q: "המשחק אוסף מידע על הילד?",
          a: "לא. אין הרשמה ואין שם. אין הקלטת מסך ואין פרסום מבוסס התנהגות. אנחנו סופרים כמה פעמים משחק נפתח, בלי שום דבר שמזהה מי פתח אותו.",
        },
      ],

      keywords: ["צללים", "התאמה", "צורות", "לגיל הרך", "זיהוי", "משחק חשיבה"],
    },

    en: {
      name: "Shadow Match",
      metaTitle: "Shadow Match - Free Matching Game for Kids | Ellaz",
      metaDescription:
        "A free shadow matching game for children. See a silhouette, find what cast it. Three levels, no download and no signup.",

      lede: "A free game for children where a shadow appears and you find what cast it. Three levels, no clock, and no way to lose.",

      body: [
        "One shadow above. A few pictures below. Touch the one that matches.",

        "The interesting thing about these levels is what does not change. Medium offers four choices and hard offers four, exactly the same number, so a blind guess is worth 25% on both. What changes is where the choices come from. On medium each one belongs to a different category, an elephant beside a chair beside an apple, and shadows of things that different separate at a glance. On hard they all come from one family, so you get four animal silhouettes that are all roundish with four legs. The guess is worth the same. The looking is worth far less.",

        "Easy offers three choices, which is 33.3% to a guess, and those also come from different categories. That is a deliberately gentle way in: a three-year-old seeing an elephant shadow beside a chair shadow understands the game within a second and without anybody explaining it.",

        "A shadow is a shape with the detail removed, and that is exactly what trains here. No colour to go by, no face, no texture. What is left is the outline, and recognising things by outline alone is a real skill. Children are much better at it than adults expect, especially with animals.",

        "A wrong answer costs nothing at all. The shadow stays, another try is available immediately, and no score falls. Levels continue without end and the number kept is how far you got at that difficulty.",
      ],

      howToPlay: [
        { title: "Pick a level", body: "Easy, medium or hard. What changes is how many choices and how alike they are." },
        { title: "Look at the shadow", body: "It sits above, large and clear, with nothing but the shape." },
        { title: "Choose a picture", body: "Touch whichever you think cast it. A wrong answer costs nothing." },
        { title: "Keep going", body: "A correct answer moves you up a level and brings a new shadow." },
      ],

      tips: [
        {
          title: "Look at the edges",
          body: "A trunk, ears, a tail, a chair leg. The features sticking out identify a shape faster than the body does.",
        },
        {
          title: "Count the legs",
          body: "On hard all the animals are roundish, so leg count and tail length are what actually separate them.",
        },
        {
          title: "Take your time",
          body: "There is no clock at all. A child who looks for five seconds is right far more often than one who taps immediately.",
        },
        {
          title: "Start on easy even if older",
          body: "It is not patronising, it explains the game without words. One round there is enough.",
        },
      ],

      teaches: [
        { title: "Recognition by shape", body: "No colour and no detail, so only the outline is left. That is a skill in itself." },
        {
          title: "Comparing similar things",
          body: "On hard every choice comes from one family, so you have to find the small difference rather than the obvious one.",
        },
        { title: "Visual vocabulary", body: "Every round shows an animal or an object, and children name them out loud unprompted." },
        {
          title: "Thinking before touching",
          body: "Nothing punishes a mistake, so the game teaches stopping out of interest rather than fear.",
        },
      ],

      ages: [
        { title: "3 to 4", body: "Easy. Three choices from distant categories, so success is nearly guaranteed." },
        { title: "5 to 6", body: "Medium. Four choices, still from different worlds." },
        { title: "7 and up", body: "Hard, where every shadow comes from one family. This is where it gets interesting." },
        {
          title: "Parents",
          body: "Nothing to lose and no clock, which makes this a good one for a quiet moment unsupervised.",
        },
      ],

      accessibility:
        "One tap, no dragging and no holding. Pictures are larger than 2cm square on any screen and spaced far enough apart that an imprecise tap lands correctly. The entire game is built on shape rather than colour, so colour blindness is not merely accommodated here, it is irrelevant. No clock, no countdown and nothing that flashes. There is no reading anywhere, and every round is understandable from the pictures alone.",

      together: [
        { title: "Name it first", body: "Ask your child to say the animal before touching. You hear whether they recognised it." },
        {
          title: "Real shadows",
          body: "Turn off the light and make hand shadows on the wall. Same game, no screen, considerably funnier.",
        },
        { title: "You do the tapping", body: "Your child explains which shadow fits and why, and you touch it. It forces a reason." },
        {
          title: "Find the one difference",
          body: "On hard, work out together what single feature separates the two most similar choices.",
        },
      ],

      faq: [
        {
          q: "Is the shadow game free?",
          a: "Completely. Nothing to pay and no purchases inside the game. Every game on the site is open from the first second.",
        },
        {
          q: "Do I need to download or sign up?",
          a: "No to both. It runs in the browser with no download and no account, and we do not ask for an email.",
        },
        {
          q: "What is the difference between medium and hard?",
          a: "Not the number of choices, which is four on both, so a guess is worth 25% either way. On hard every choice comes from one family, so the silhouettes resemble each other and a quick glance is not enough.",
        },
        {
          q: "What happens on a wrong answer?",
          a: "Nothing. The shadow stays and another try is available straight away. No score drops and no lives run out.",
        },
        { q: "Are there ads?", a: "None. No banners and no video between levels." },
        {
          q: "Does it work offline?",
          a: "Yes. After one visit the game is stored on the device and runs on a plane.",
        },
        {
          q: "My child cannot read yet. Is that a problem?",
          a: "Not at all. There is not one word that has to be read to play. Every round is understandable from the pictures.",
        },
        {
          q: "How is the record measured?",
          a: "By how many levels you cleared in a row, where higher is better, kept separately per difficulty. The level counter resets when the difficulty changes, so they are not comparable.",
        },
        {
          q: "What age is this for?",
          a: "From about three on easy. A child that age recognises an elephant shadow without anybody explaining what a shadow is.",
        },
        {
          q: "Does it collect data about my child?",
          a: "No. There is no signup and no name. No session recording and no behavioural advertising. We count how many times a game was opened, with nothing attached that identifies who opened it.",
        },
      ],

      keywords: ["shadows", "matching", "silhouette", "shapes", "preschool", "recognition"],
    },
    es: {
      name: "Sombra y foto",
      metaTitle: "Sombras - juego de emparejar gratis para niños | Ellaz",
      metaDescription:
        "Juego gratis de emparejar sombras para niños. Aparece una silueta y hay que encontrar qué la proyecta. Tres niveles, sin descargas ni registro.",

      lede: "Un juego gratuito para niños en el que aparece una sombra y hay que encontrar qué la proyectó. Tres niveles, sin reloj, y no hay forma de perder.",

      body: [
        "Una sombra arriba. Unos dibujos abajo. Toca el que encaje.",

        "Lo interesante de estos niveles es lo que no cambia. El medio ofrece cuatro opciones y el difícil ofrece cuatro, exactamente el mismo número, así que adivinar a ciegas vale un 25% en los dos. Lo que cambia es de dónde salen las opciones. En medio cada una pertenece a una categoría distinta, un elefante junto a una silla junto a una manzana, y las sombras de cosas diferentes se separan de un vistazo. En difícil todas vienen de una misma familia, así que te encuentras cuatro siluetas de animales todas redondeadas y con cuatro patas. Adivinar vale lo mismo. Mirar vale muchísimo menos.",

        "El fácil ofrece tres opciones, o sea un 33,3% para quien adivine, y también vienen de categorías distintas. Es una entrada suave a propósito: un niño de tres años que ve la sombra de un elefante junto a la de una silla entiende el juego en un segundo y sin que nadie se lo explique.",

        "Una sombra es una forma a la que le han quitado el detalle, y eso es exactamente lo que se entrena aquí. Ningún color del que fiarse, ninguna cara, ninguna textura. Lo que queda es el contorno, y reconocer cosas solo por el contorno es una habilidad de verdad. Los niños son mucho mejores en esto de lo que un adulto espera, sobre todo con animales.",

        "Fallar no cuesta absolutamente nada. La sombra se queda, se puede volver a probar al momento, y no baja ninguna puntuación. Los niveles siguen sin final y el número que se guarda es hasta dónde llegaste en esa dificultad.",
      ],

      howToPlay: [
        { title: "Elige un nivel", body: "Fácil, medio o difícil. Cambian cuántas opciones hay y lo parecidas que son." },
        { title: "Mira la sombra", body: "Está arriba, grande y clara, con nada más que la forma." },
        { title: "Elige un dibujo", body: "Toca el que creas que la proyectó. Fallar no cuesta nada." },
        { title: "Sigue", body: "Un acierto te sube un nivel y trae otra sombra." },
      ],

      tips: [
        {
          title: "Mira los bordes",
          body: "Una trompa, unas orejas, una cola, la pata de una silla. Lo que sobresale identifica una forma más rápido que el cuerpo.",
        },
        {
          title: "Cuenta las patas",
          body: "En difícil todos los animales son redondeados, así que el número de patas y el largo de la cola son lo que de verdad los separa.",
        },
        {
          title: "Tomaos vuestro tiempo",
          body: "Aquí no hay reloj de ningún tipo. Un niño que mira cinco segundos acierta muchas más veces que uno que toca al instante.",
        },
        {
          title: "Empezad en fácil aunque sea mayor",
          body: "No es tratarle de pequeño, es explicarle el juego sin palabras. Con una ronda ahí basta.",
        },
      ],

      teaches: [
        { title: "Reconocer por la forma", body: "Sin color y sin detalle, solo queda el contorno. Eso ya es una habilidad." },
        {
          title: "Comparar cosas parecidas",
          body: "En difícil todas las opciones vienen de una familia, así que hay que encontrar la diferencia pequeña y no la obvia.",
        },
        { title: "Vocabulario visual", body: "Cada ronda enseña un animal o un objeto, y los niños los nombran en voz alta sin que nadie se lo pida." },
        {
          title: "Pensar antes de tocar",
          body: "Nada castiga un fallo, así que el juego enseña a pararse por interés y no por miedo.",
        },
      ],

      ages: [
        { title: "3 a 4", body: "Fácil. Tres opciones de categorías lejanas, así que acertar está casi garantizado." },
        { title: "5 a 6", body: "Medio. Cuatro opciones, todavía de mundos distintos." },
        { title: "7 en adelante", body: "Difícil, donde todas las sombras vienen de una familia. Aquí es donde se pone interesante." },
        {
          title: "Padres",
          body: "Nada que perder y sin reloj, lo que hace de este un buen candidato para un rato tranquilo sin supervisión.",
        },
      ],

      accessibility:
        "Un toque, sin arrastrar y sin mantener pulsado. Los dibujos miden más de 2 centímetros de lado en cualquier pantalla y están lo bastante separados como para que un toque poco preciso caiga donde toca. El juego entero está construido sobre la forma y no sobre el color, así que aquí el daltonismo no es que esté contemplado: es que resulta irrelevante. Sin reloj, sin cuenta atrás y sin nada que parpadee. No se lee nada en ninguna parte, y cada ronda se entiende solo con los dibujos.",

      together: [
        { title: "Que lo nombre primero", body: "Pedidle que diga el animal antes de tocar. Se oye si lo ha reconocido." },
        {
          title: "Sombras de verdad",
          body: "Apagad la luz y haced sombras con las manos en la pared. Mismo juego, sin pantalla, bastante más gracioso.",
        },
        { title: "Tú tocas", body: "Tu hijo explica qué sombra encaja y por qué, y tú la tocas. Le obliga a dar un motivo." },
        {
          title: "Buscad la única diferencia",
          body: "En difícil, averiguad juntos qué rasgo separa a las dos opciones más parecidas.",
        },
      ],

      faq: [
        {
          q: "¿El juego de sombras es gratis?",
          a: "Del todo. Nada que pagar y ninguna compra dentro del juego. Todos los juegos de la web están abiertos desde el primer segundo.",
        },
        {
          q: "¿Hay que descargar algo o registrarse?",
          a: "Ni una cosa ni la otra. Funciona en el navegador sin descarga y sin cuenta, y no pedimos ningún correo.",
        },
        {
          q: "¿Qué diferencia hay entre medio y difícil?",
          a: "No el número de opciones, que son cuatro en los dos, así que adivinar vale un 25% igualmente. En difícil todas las opciones vienen de una familia, así que las siluetas se parecen entre sí y un vistazo rápido no basta.",
        },
        {
          q: "¿Qué pasa si la respuesta es incorrecta?",
          a: "Nada. La sombra se queda y se puede volver a probar enseguida. No baja ninguna puntuación y no se acaban las vidas.",
        },
        { q: "¿Tiene anuncios?", a: "Ninguno. Ni banners ni vídeo entre nivel y nivel." },
        {
          q: "¿Funciona sin conexión?",
          a: "Sí. Después de una visita el juego queda guardado en el aparato y funciona en un avión.",
        },
        {
          q: "Mi hijo todavía no lee. ¿Es un problema?",
          a: "En absoluto. No hay ni una palabra que haya que leer para jugar. Cada ronda se entiende con los dibujos.",
        },
        {
          q: "¿Cómo se mide el récord?",
          a: "Por cuántos niveles seguidos has superado, donde más es mejor, y por separado en cada dificultad. El contador de nivel se reinicia al cambiar de dificultad, así que no son comparables.",
        },
        {
          q: "¿Para qué edad es?",
          a: "Desde unos tres años en fácil. Un niño de esa edad reconoce la sombra de un elefante sin que nadie le explique qué es una sombra.",
        },
        {
          q: "¿Recoge datos sobre mi hijo?",
          a: "No. No hay registro ni nombre. Nada graba la sesión y nada dirige publicidad según el comportamiento. Contamos cuántas veces se ha abierto un juego, sin nada al lado que identifique a quién lo abrió.",
        },
      ],

      keywords: ["sombras", "emparejar", "siluetas", "formas", "infantil", "reconocer"],
    },

    fr: shadowsFr,
  },

  provenance: [
    {
      claim: "medium and hard both offer four choices, so a guess is worth 25% on each; easy offers three at 33.3%",
      source: "scripts/sim/thinking-levels.mjs",
    },
    {
      claim: "hard draws every choice from one theme while easy and medium mix categories",
      source: "src/games/shadows/logic.ts",
    },
    {
      claim: "the record counts levels cleared, higher is better, scoped per difficulty",
      source: "src/sdk/score.ts",
    },
  ],
};
