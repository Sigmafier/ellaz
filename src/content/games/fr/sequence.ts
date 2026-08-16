import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr sequence`. STAGED. */
export const sequenceFr: GameCopy = {
  name: "La suite logique",
  metaTitle: "Jeu de suites logiques pour enfants | Ellaz",
  metaDescription:
    "Devinez ce qui vient après : 8 familles de motifs, 3 niveaux, 6 couleurs. Jeu de logique gratuit, sans compte, sans publicité et hors ligne.",

  lede: "Une suite de formes, et une case vide à la fin. Huit familles de motifs, six couleurs, et rien à lire.",

  body: [
    "Rouge, bleu, rouge, bleu, et ensuite. Un enfant de trois ans répond à celle-là sans qu'on lui explique quoi que ce soit, et c'est le point de départ. La question ne change jamais de forme : voici un début de suite, appuyez sur ce qui vient après.",
    "Il y a 8 familles de motifs et chaque niveau en propose 3. Le facile s'en tient aux cycles de 2 et de 3, ceux qui se voient immédiatement. Le moyen allonge et complique. Le difficile inclut 2 familles qui n'ont pas de cycle du tout, donc où la règle est autre chose qu'une répétition, et c'est là que le jeu devient un vrai exercice de logique plutôt qu'un exercice d'attention.",
    "La palette compte 6 couleurs, donc un enfant qui appuie au hasard a raison 16,7% du temps. Une réussite peut être un coup de chance. Cinq d'affilée, non. Personne n'y croit.",
    "Le record compte les niveaux réussis, et chaque difficulté garde le sien. Passer du facile au difficile remet le compteur à zéro, ce qui est normal : ce ne sont pas les mêmes suites.",
    "L'aveu : sur le niveau difficile, un enfant qui échoue ne comprend pas toujours pourquoi. Les familles sans cycle demandent de repérer une règle abstraite, et quand on ne la voit pas, aucune quantité d'essais ne la fait apparaître. Un adulte à côté qui dit la règle à voix haute une seule fois change complètement la suite de la séance, et nous préférons l'écrire ici que de laisser un enfant tourner en rond.",
  ],

  howToPlay: [
    {
      title: "Regarder la suite",
      body: "Une rangée de formes colorées s'affiche, avec une case vide à la fin. Rien n'est écrit et rien n'est chronométré.",
    },
    {
      title: "Choisir ce qui vient après",
      body: "Appuyez sur la forme qui complète la suite parmi celles proposées en dessous.",
    },
    {
      title: "Enchaîner",
      body: "Une bonne réponse passe à la suite suivante. Une erreur ne coûte rien : la suite reste affichée et vous réessayez.",
    },
  ],

  tips: [
    {
      title: "Dites la suite à voix haute",
      body: "Rouge, bleu, rouge, bleu. Le motif s'entend souvent avant de se voir, et c'est l'astuce la plus efficace pour un enfant qui bloque.",
    },
    {
      title: "Comptez avant de regarder",
      body: "Cherchez au bout de combien de formes la suite recommence. Une fois cette longueur trouvée, la réponse tombe toute seule.",
    },
    {
      title: "Sur le difficile, cherchez autre chose qu'une répétition",
      body: "Deux familles n'ont pas de cycle du tout. Si vous cherchez une répétition et n'en trouvez pas, la règle est ailleurs : une taille qui grandit, une position qui se déplace.",
    },
  ],

  teaches: [
    {
      title: "Reconnaître un motif",
      body: "C'est la compétence qui précède l'algèbre, et de très loin. Comprendre qu'une suite obéit à une règle qu'on peut nommer est exactement ce qu'on demandera plus tard avec des lettres à la place des couleurs.",
    },
    {
      title: "Vérifier avant de répondre",
      body: "Une suite se relit du début pour confirmer une hypothèse. C'est une habitude de contrôle que beaucoup d'enfants n'ont jamais eu l'occasion de prendre.",
    },
    {
      title: "Nommer une règle",
      body: "Trouver la suite est une chose, savoir dire pourquoi en est une autre. Un enfant à qui on demande d'expliquer sa réponse progresse deux fois plus vite.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le facile, avec ses cycles de 2 et de 3. Aucune lecture n'est nécessaire et une erreur ne punit rien.",
    },
    {
      title: "6 ans et plus",
      body: "Le difficile et ses familles sans cycle, où la règle doit être trouvée plutôt que vue.",
    },
    {
      title: "Adultes",
      body: "Les familles sans cycle du niveau difficile ne sont pas immédiates pour tout le monde. Elles se regardent comme une petite énigme.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grandes cases, sans glisser et sans double appui. Rien n'est chronométré, donc un enfant peut regarder la suite aussi longtemps qu'il veut. Les 6 couleurs sont accompagnées de formes différentes, donc un enfant daltonien distingue les éléments sans dépendre de la teinte.",

  together: [
    {
      title: "La suite dite à voix haute",
      body: "Un adulte lit la suite à voix haute et s'arrête net avant la case vide. L'enfant complète, et cette manière de faire débloque presque tous les cas difficiles.",
    },
    {
      title: "Inventer la suite suivante",
      body: "Après une partie, chacun invente une suite avec des objets posés sur la table. Fabriquer un motif est plus difficile que le reconnaître, et beaucoup plus révélateur.",
    },
    {
      title: "La règle expliquée",
      body: "Après chaque bonne réponse, l'enfant doit dire la règle à voix haute. C'est la version parlée de ce que le jeu fait silencieusement.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de suites est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien y a-t-il de motifs ?",
      a: "8 familles de motifs, dont 3 sont proposées à chaque niveau. Le difficile en inclut 2 qui n'ont aucun cycle.",
    },
    {
      q: "Un enfant peut-il réussir au hasard ?",
      a: "Une fois, oui : avec 6 couleurs, le hasard vaut 16,7%. Plusieurs réussites d'affilée ne s'expliquent pas par la chance.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. Tout est en formes et en couleurs, et rien n'est écrit sur l'écran de jeu.",
    },
    {
      q: "Le record est-il gardé par niveau ?",
      a: "Oui. Changer de difficulté remet le compteur à zéro, parce que les suites ne sont pas comparables.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les suites sont fabriquées sur l'appareil.",
    },
  ],

  keywords: [
    "suites logiques",
    "jeu de logique enfant",
    "reconnaître un motif",
    "algorithme maternelle",
    "jeu éducatif gratuit",
    "qu'est-ce qui vient après",
  ],
};
