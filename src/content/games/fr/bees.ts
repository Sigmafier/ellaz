import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr bees`. STAGED. */
export const beesFr: GameCopy = {
  name: "Les abeilles",
  metaTitle: "Jeu des abeilles à attraper, gratuit | Ellaz",
  metaDescription:
    "40 secondes pour attraper les abeilles et laisser passer le reste. Jeu de rapidité gratuit pour enfants, sans compte et jouable hors ligne.",

  lede: "40 secondes, une nuée de bestioles, et seules les abeilles comptent. De 28 créatures à 57 selon le niveau.",

  body: [
    "Des créatures traversent le pré. Certaines sont des abeilles. Les autres non. Appuyez sur les abeilles, laissez le reste passer.",
    "Un tour dure 40 secondes. Le facile envoie environ 28 créatures dont à peu près 17 abeilles. Le difficile en envoie 57 dont à peu près 29, donc plus de bestioles à trier dans le même temps et une proportion d'abeilles plus faible. C'est le seul jeu du site où la difficulté vient de la densité plutôt que de la vitesse.",
    "Le code demande 65%, 60% et 50% d'abeilles selon le niveau. Il en sort 59% et 56% sur les deux premiers, mesurés sur 1 500 tours par niveau, et l'écart vient d'une règle qui prime sur la proportion: jamais plus de 3 créatures identiques d'affilée. Sans elle, un tour peut envoyer 8 abeilles à la suite, ce qui donne à un enfant l'impression de très bien jouer, puis 8 guêpes, ce qui lui donne l'impression du contraire. Nous préférons une proportion légèrement en dessous de la consigne à un tour qui ressemble à une punition.",
    "Le record est le nombre d'abeilles attrapées. Il est commun aux trois niveaux.",
    "L'aveu: ce jeu est bruyant et il fatigue. 40 secondes d'attention continue sur un écran qui bouge partout est beaucoup pour un enfant de quatre ans, et deux ou trois tours d'affilée suffisent largement. Ce n'est pas un jeu qui occupe une demi-heure, et il ne prétend pas l'être.",
  ],

  howToPlay: [
    {
      title: "Repérer les abeilles",
      body: "Elles se distinguent par leurs rayures et leur forme, pas seulement par leur couleur.",
    },
    {
      title: "Appuyer dessus",
      body: "Un appui sur une abeille la compte. Les autres créatures ne demandent rien: laissez-les passer.",
    },
    {
      title: "Tenir 40 secondes",
      body: "Le tour se termine tout seul. Le compteur final dit combien d'abeilles ont été attrapées.",
    },
  ],

  tips: [
    {
      title: "Regardez le milieu, pas les bords",
      body: "Fixer le centre de l'écran et laisser la vision périphérique repérer les mouvements marche bien mieux que suivre chaque créature des yeux. C'est aussi moins fatigant.",
    },
    {
      title: "N'essayez pas de tout attraper",
      body: "Sur le niveau difficile, 29 abeilles passent en 40 secondes et personne ne les prend toutes. Viser celles qui sont proches du doigt rapporte plus que courir après les autres.",
    },
    {
      title: "Deux tours, puis une pause",
      body: "L'attention baisse très vite sur ce jeu. Le troisième tour d'affilée donne presque toujours un moins bon score que le deuxième, quel que soit l'âge.",
    },
  ],

  teaches: [
    {
      title: "Trier vite",
      body: "Décider en une fraction de seconde si une chose appartient à une catégorie est une opération mentale de base, et l'entraîner à cet âge sert bien au-delà des abeilles.",
    },
    {
      title: "Se retenir d'appuyer",
      body: "La moitié du travail consiste à ne rien faire quand une guêpe passe. Résister à un geste déjà lancé est plus difficile que le déclencher, et c'est justement ce qui se construit vers 4 ans.",
    },
    {
      title: "Estimer sans compter",
      body: "Savoir en un instant s'il y a beaucoup ou peu d'abeilles à l'écran est une estimation de quantité, et c'est le socle du sens du nombre.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le facile, avec 28 créatures en 40 secondes. Rien à lire et une erreur ne coûte rien.",
    },
    {
      title: "6 ans et plus",
      body: "Le difficile, à 57 créatures dont la moitié seulement sont des abeilles.",
    },
    {
      title: "Adultes",
      body: "Le difficile est un vrai test d'attention soutenue pour n'importe qui: 57 créatures en 40 secondes ne se trient pas distraitement.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser, sur des cibles larges. Les abeilles portent des rayures et une silhouette distincte, donc rien ne dépend uniquement de la couleur. Une erreur ne produit ni son désagréable ni perte, seulement rien. C'est en revanche le jeu le plus rapide du site avec le serpent, donc le moins adapté à qui joue avec une aide à la saisie.",

  together: [
    {
      title: "Chacun sa moitié",
      body: "Deux enfants, un appareil posé à plat, chacun surveille sa moitié d'écran. Le score commun monte beaucoup et personne ne se gêne.",
    },
    {
      title: "Le compteur à voix haute",
      body: "Un adulte compte les abeilles attrapées à voix haute pendant le tour. L'enfant entend son propre score monter, ce qui change complètement l'effort qu'il y met.",
    },
    {
      title: "Le pari sur le score",
      body: "Chacun annonce combien d'abeilles il pense attraper avant de commencer. Comparer une prévision au résultat vaut mieux que comparer deux scores.",
    },
  ],

  faq: [
    {
      q: "Ce jeu des abeilles est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps dure un tour ?",
      a: "40 secondes, quel que soit le niveau. Ce qui change, c'est le nombre de créatures.",
    },
    {
      q: "Combien d'abeilles passent ?",
      a: "Environ 17 sur 28 créatures en facile, et environ 29 sur 57 en difficile.",
    },
    {
      q: "Peut-il y avoir une longue série de la même bestiole ?",
      a: "Non. Jamais plus de 3 créatures identiques d'affilée, ce qui évite les séries qui donnent l'impression d'être puni.",
    },
    {
      q: "Convient-il à un enfant daltonien ?",
      a: "Oui. Les abeilles se reconnaissent à leurs rayures et à leur forme autant qu'à leur couleur.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu des abeilles",
    "jeu de rapidité enfant",
    "attraper des insectes",
    "jeu d'attention maternelle",
    "jeu gratuit sans téléchargement",
    "jeu de réflexes enfant",
  ],
};
