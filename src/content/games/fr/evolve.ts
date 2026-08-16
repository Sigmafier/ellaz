import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr evolve`. STAGED. */
export const evolveFr: GameCopy = {
  name: "Évolution",
  metaTitle: "Jeu d'évolution des animaux, gratuit | Ellaz",
  metaDescription:
    "De l'oeuf au T-Rex en 10 étapes. Un jeu de fusion gratuit dans le navigateur, sans compte, sans publicité et jouable hors ligne.",

  lede: "Un oeuf plus un oeuf font un poussin. Dix créatures à faire naître, jusqu'au T-Rex, sans un chiffre à l'écran.",

  body: [
    "Deux créatures identiques qui se rencontrent deviennent la suivante de la liste. L'oeuf donne le poussin, le poussin donne le lézard, et ainsi de suite pendant dix étages jusqu'au T-Rex tout en haut. Chaque étage vaut le double du précédent, ce qui va de 2 à 1 024 si on regarde les nombres derrière, mais l'enfant qui joue ne voit jamais un nombre. Il voit un animal qui grandit.",
    "C'est le même moteur que notre jeu de chiffres, avec les mêmes 3 grilles. Nous avons remplacé les nombres par des créatures. Rien d'autre.",
    "Ce remplacement change plus de choses qu'il n'y paraît. Un enfant de quatre ans qui ne lit pas et ne compte pas ne peut rien faire d'une case marquée 128, parce qu'il n'a aucun moyen de savoir si elle est grande ou petite. Un crocodile, si. Il sait tout de suite. L'ordre des animaux se devine tout seul, du plus petit au plus impressionnant, et la question de savoir quelle case fusionner avec quelle autre devient lisible sans une seule explication.",
    "Le record est gardé séparément de celui du jeu de chiffres, même si le moteur est partagé. Une partie ici ne touche jamais un score gagné là-bas. Les deux vivent chacun de leur côté.",
    "Une limite honnête: à partir du sixième ou septième animal, la grille devient serrée et le jeu redevient un jeu de réflexion pur, avec la même exigence qu'un jeu de chiffres. Les enfants qui jouaient pour voir apparaître de nouvelles bêtes s'arrêtent souvent là, et ce n'est pas un échec. Ils ont vu six animaux naître, ce qui est la partie du jeu écrite pour eux.",
  ],

  howToPlay: [
    {
      title: "Pousser la grille",
      body: "Faites glisser le doigt dans une direction. Toutes les créatures partent de ce côté en même temps, et celles qui se ressemblent se rejoignent.",
    },
    {
      title: "Faire naître la suivante",
      body: "Deux créatures identiques qui se touchent après la poussée deviennent la créature suivante. Une nouvelle apparaît ensuite sur une case libre.",
    },
    {
      title: "Monter jusqu'en haut",
      body: "Dix créatures se succèdent, de l'oeuf au T-Rex. La partie s'arrête quand plus aucune poussée n'est possible.",
    },
  ],

  tips: [
    {
      title: "Gardez le plus gros animal dans un angle",
      body: "C'est le seul conseil qui compte, et il vaut ici exactement ce qu'il vaut sur une grille de chiffres. Choisissez un angle et n'utilisez plus la direction qui en sort.",
    },
    {
      title: "Alignez les petits avant de fusionner",
      body: "Deux oeufs voisins valent mieux que deux oeufs aux extrémités. Poussez pour les rapprocher, plutôt que d'espérer qu'une poussée règle tout d'un coup.",
    },
    {
      title: "La grande grille pour découvrir les animaux",
      body: "Si le but est de voir les créatures, prenez la plus grande grille. Elle laisse de la place, la partie dure longtemps et on monte plus haut dans la liste.",
    },
  ],

  teaches: [
    {
      title: "L'ordre sans les nombres",
      body: "Comprendre qu'un lézard vient après un poussin est un raisonnement de classement, exactement comme comprendre que 8 vient après 4. Les nombres arriveront plus tard sur ce même squelette.",
    },
    {
      title: "L'anticipation",
      body: "Une poussée déplace toute la grille, donc il faut regarder avant d'agir. C'est la première fois que beaucoup d'enfants rencontrent cette idée dans un jeu.",
    },
    {
      title: "La patience du collectionneur",
      body: "Chaque animal demande deux fois plus de travail que le précédent, donc les derniers arrivent lentement. Comprendre qu'un objectif peut se mériter sur une heure est une leçon en soi.",
    },
  ],

  ages: [
    {
      title: "4 à 7 ans",
      body: "La grande grille, pour voir apparaître le plus d'animaux possible. Aucune lecture n'est nécessaire et aucun chiffre n'est affiché.",
    },
    {
      title: "8 ans et plus",
      body: "Les grilles plus petites, où atteindre le T-Rex devient un vrai objectif de réflexion.",
    },
    {
      title: "Adultes",
      body: "La petite grille, où atteindre le T-Rex demande la même rigueur qu'une partie de chiffres et se joue en dix minutes.",
    },
  ],

  accessibility:
    "Tout se joue au glissement de doigt ou aux flèches du clavier. Les créatures se distinguent par leur forme et pas seulement par leur couleur, donc un enfant daltonien joue sans difficulté. Rien n'est chronométré et rien n'est écrit, donc un enfant qui ne lit pas encore joue seul du début à la fin.",

  together: [
    {
      title: "Nommer les bêtes",
      body: "Un adulte demande quel animal vient après le lézard, avant qu'il apparaisse. Ça transforme une partie silencieuse en devinette, et les enfants retiennent la liste très vite.",
    },
    {
      title: "Un coup chacun",
      body: "Chacun pousse à son tour sur la même grille. Le T-Rex, s'il arrive, appartient aux deux.",
    },
    {
      title: "La liste à retenir",
      body: "Chacun essaie de réciter les dix animaux dans l'ordre avant de commencer. On vérifie en jouant, et la liste rentre en une partie.",
    },
  ],

  faq: [
    {
      q: "Ce jeu d'évolution est-il gratuit ?",
      a: "Oui, entièrement, sans publicité et sans achat pour débloquer un animal. Les dix créatures sont là dès la première partie.",
    },
    {
      q: "Combien y a-t-il de créatures ?",
      a: "Dix, de l'oeuf au T-Rex. Chacune est obtenue en réunissant deux exemplaires de la précédente.",
    },
    {
      q: "Faut-il savoir compter pour y jouer ?",
      a: "Non. Aucun chiffre n'est affiché: on voit des animaux, et leur ordre se devine à leur taille.",
    },
    {
      q: "Est-ce le même jeu que le 2048 ?",
      a: "C'est le même moteur avec des animaux à la place des nombres. Les records sont gardés séparément, donc une partie ici ne touche pas votre score de l'autre jeu.",
    },
    {
      q: "Faut-il un compte ?",
      a: "Non, ni compte, ni adresse e-mail, ni mot de passe. Le record est écrit sur l'appareil.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Le jeu reste disponible dans le navigateur sans connexion.",
    },
  ],

  keywords: [
    "jeu évolution animaux",
    "jeu de fusion enfant",
    "jeu dinosaure gratuit",
    "jeu sans chiffres",
    "jeu maternelle",
    "faire évoluer des animaux",
  ],
};
