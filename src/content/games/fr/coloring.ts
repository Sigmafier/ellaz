import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr coloring`. STAGED. */
export const coloringFr: GameCopy = {
  name: "Coloriage",
  metaTitle: "Coloriage en ligne gratuit pour enfants | Ellaz",
  metaDescription:
    "20 dessins et une page blanche, 20 couleurs, rien à imprimer. Coloriage gratuit dans le navigateur, sans compte et jouable hors ligne.",

  lede: "20 dessins, une page blanche, 20 couleurs. Rien à réussir, rien à finir, et aucun score nulle part.",

  body: [
    "On choisit une couleur, on appuie sur une zone, elle se remplit. Il n'y a pas d'autre règle. Le dessin est fini quand l'enfant décide qu'il est fini, ce qui arrive parfois après 2 couleurs et parfois après 20 minutes.",
    "C'est le seul jeu du site qui ne garde aucun record, et c'est une décision, pas un oubli. 20 des autres jeux en gardent un. Ici, aucun.",
    "La raison est simple. Noter le dessin d'un enfant est le contraire de ce que nous voulons faire. Il n'y a donc pas de chronomètre, pas de compteur de zones remplies, pas de message qui félicite ou qui regrette. Un ciel vert n'est pas une erreur. Un personnage laissé à moitié blanc n'est pas une partie abandonnée. Rien sur cet écran ne suggère à un enfant de quatre ans qu'il existait une bonne façon de faire et qu'il ne l'a pas trouvée.",
    "Les 20 dessins sont des scènes simples, avec des zones larges qu'un doigt atteint sans viser. La page blanche est là pour les enfants qui préfèrent partir de rien. Elle sert beaucoup.",
    "La limite, et elle est vraie: ce n'est pas un outil de dessin. On ne trace pas de trait, on ne gomme pas une zone en particulier, on ne dessine pas ses propres formes. On remplit des zones existantes avec vingt couleurs. Un enfant qui veut vraiment dessiner sera plus heureux avec une feuille de papier, et nous ne prétendons pas le contraire.",
  ],

  howToPlay: [
    {
      title: "Choisir une couleur",
      body: "Appuyez sur une couleur dans la palette du bas. Elle reste choisie tant que vous n'en prenez pas une autre.",
    },
    {
      title: "Remplir une zone",
      body: "Appuyez sur n'importe quelle partie du dessin. Elle prend la couleur choisie, tout de suite et sans confirmation.",
    },
    {
      title: "Changer d'avis",
      body: "Appuyez à nouveau sur la même zone avec une autre couleur. Rien n'est définitif et rien n'est perdu.",
    },
  ],

  tips: [
    {
      title: "Commencez par le fond",
      body: "Le ciel, l'herbe, les grandes zones. Les détails posés par-dessus ressortent beaucoup mieux, et c'est aussi l'ordre qu'on apprend en peinture.",
    },
    {
      title: "Laissez le blanc exister",
      body: "Toutes les zones n'ont pas besoin d'une couleur. Un dessin où deux ou trois zones restent blanches se lit souvent mieux qu'un dessin entièrement rempli.",
    },
    {
      title: "La page blanche pour les habitués",
      body: "Les enfants qui connaissent déjà les vingt dessins s'y ennuient vite. La page blanche relance tout, parce qu'il n'y a plus de bonne réponse du tout.",
    },
  ],

  teaches: [
    {
      title: "Le geste précis, sans exigence",
      body: "Viser une zone et appuyer travaille la coordination du doigt et de l'oeil, à un âge où c'est encore difficile. Comme rien n'est noté, l'enfant recommence sans se sentir jugé.",
    },
    {
      title: "Le choix pour le choix",
      body: "La plupart des écrans posent une question et attendent la bonne réponse. Celui-ci n'en pose aucune, et décider seul de la couleur d'un toit est un exercice plus rare qu'on ne croit.",
    },
    {
      title: "La patience",
      body: "Remplir 15 zones prend plusieurs minutes pendant lesquelles rien ne récompense et rien ne presse. C'est une expérience rare sur un écran, et elle fait du bien.",
    },
  ],

  ages: [
    {
      title: "À partir de 2 ans",
      body: "Les zones sont larges et rien ne peut être raté. C'est le premier écran du site sur lequel un tout-petit peut être laissé seul.",
    },
    {
      title: "4 à 8 ans",
      body: "Les vingt dessins tiennent longtemps, et la page blanche prend le relais quand ils sont épuisés.",
    },
    {
      title: "Adultes",
      body: "C'est un jeu calme, sans score et sans fin. Un adulte fatigué y trouve exactement la même chose qu'un enfant de trois ans.",
    },
  ],

  accessibility:
    "Tout se fait en appuyant, sans glisser, sans double appui et sans viser précisément. Les zones sont grandes et la palette est fixe, donc la cible ne bouge jamais. Aucun son n'est nécessaire et aucun texte n'est à lire. Comme rien n'est chronométré ni compté, c'est le jeu du site le plus adapté à un enfant qui utilise une aide à la saisie.",

  together: [
    {
      title: "Une couleur chacun",
      body: "Chacun choisit une couleur au début et ne peut utiliser que celle-là. Le dessin devient une négociation, et les résultats sont souvent plus beaux que quand un seul décide.",
    },
    {
      title: "Le coloriage dicté",
      body: "Un adulte dit à voix haute ce qu'il faudrait colorier, sans montrer du doigt. Ça travaille le vocabulaire et ça rend le moment bavard.",
    },
    {
      title: "Le dessin à quatre mains",
      body: "Chacun colorie une moitié du dessin, sans se concerter sur les couleurs. On regarde le résultat ensemble à la fin, et il est toujours surprenant.",
    },
  ],

  faq: [
    {
      q: "Le coloriage est-il gratuit ?",
      a: "Oui, les 20 dessins et la page blanche, sans publicité et sans version payante.",
    },
    {
      q: "Combien y a-t-il de dessins et de couleurs ?",
      a: "20 dessins plus une page blanche, avec une palette de 20 couleurs.",
    },
    {
      q: "Y a-t-il un score ?",
      a: "Non, et c'est volontaire. C'est le seul jeu du site sans record, parce que noter le dessin d'un enfant serait le contraire de l'idée.",
    },
    {
      q: "Peut-on imprimer le dessin ?",
      a: "Non. Tout reste à l'écran, dans le navigateur, sur l'appareil de l'enfant.",
    },
    {
      q: "Faut-il un compte ?",
      a: "Non, ni compte, ni adresse e-mail. Rien n'est envoyé nulle part.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les dessins sont enregistrés sur l'appareil, donc aucune connexion n'est nécessaire.",
    },
  ],

  keywords: [
    "coloriage en ligne",
    "coloriage gratuit enfant",
    "coloriage sans imprimer",
    "jeu de couleurs",
    "dessin maternelle",
    "activité calme enfant",
  ],
};
