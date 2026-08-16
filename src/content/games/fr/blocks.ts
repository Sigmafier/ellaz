import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr blocks`. STAGED. */
export const blocksFr: GameCopy = {
  name: "Blocs",
  metaTitle: "Jeu de blocs qui tombent, gratuit | Ellaz",
  metaDescription:
    "Des blocs tombent, vous complétez des lignes. Trois vitesses, de 4 à 11 formes. Gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Des formes tombent, vous les rangez, les lignes pleines disparaissent. Trois vitesses, et la plus rapide ne se survit pas.",

  body: [
    "Une forme descend, vous la faites tourner et glisser, elle se pose. Quand une rangée est complète d'un bord à l'autre, elle s'efface et tout ce qui est au-dessus redescend d'un cran. La partie s'arrête quand la pile touche le haut. Rien de plus.",
    "Le niveau calme donne 4 formes seulement, sur une grille de 8 sur 14, avec une seconde entière entre deux descentes. Le normal en donne 9. Le rapide en donne 11 et descend d'un cran toutes les 140 millisecondes en fin de partie, ce qui laisse le temps d'un geste. Pas deux.",
    "Nous avons fait jouer un programme qui range simplement les blocs à plat, sans stratégie particulière. Il survit à 100% des parties calmes et à 99,3% des normales. Sur le rapide, il ne survit à aucune: la partie médiane s'arrête après 78 rangées. C'est la mesure la plus utile de la page, parce qu'elle dit que les deux premiers niveaux se jouent tranquillement et que le troisième a une fin garantie, quel que soit votre talent.",
    "Pour comparaison, un programme qui pose les blocs n'importe où termine une partie normale au bout d'une vingtaine de pièces, sans avoir effacé une seule rangée. Poser à plat change tout.",
    "Les points récompensent les rangées groupées: une rangée vaut 10, deux d'un coup 30, trois 60, quatre 100. Descendre une pièce d'un coup sec rapporte un point par rangée parcourue. Une pièce d'or arrive toutes les 5 rangées effacées.",
    "L'aveu: c'est le jeu le moins adapté aux petits du site. Il demande de faire tourner une forme dans sa tête avant de la poser, et cette capacité arrive vers 7 ou 8 ans. En dessous, même le niveau calme finit par une pile en désordre et un enfant qui ne comprend pas ce qu'il aurait dû faire.",
  ],

  howToPlay: [
    {
      title: "Déplacer la forme",
      body: "Faites glisser le doigt à gauche ou à droite pour la déplacer, ou utilisez les flèches du clavier.",
    },
    {
      title: "La faire tourner",
      body: "Un appui sur la forme la fait pivoter d'un quart de tour. Elle ne tourne pas si la place manque autour d'elle.",
    },
    {
      title: "Compléter une rangée",
      body: "Une rangée pleine d'un bord à l'autre disparaît et le reste redescend. Une rangée vaut 10 points, quatre d'un coup en valent 100.",
    },
  ],

  tips: [
    {
      title: "Posez à plat, toujours",
      body: "Un programme qui se contente de garder la pile plate survit à 99,3% des parties normales. Aucune autre habitude ne rapporte autant pour aussi peu d'effort.",
    },
    {
      title: "Gardez une colonne libre",
      body: "Laisser la colonne de droite vide et y attendre une barre permet d'effacer 4 rangées d'un coup, pour 100 points au lieu de 40. C'est risqué, et c'est là que le score se fait.",
    },
    {
      title: "Ne laissez pas de trou",
      body: "Une case couverte est perdue jusqu'à ce que tout ce qui est dessus disparaisse. Un trou coûte plus cher qu'une pile un peu haute, presque toujours.",
    },
  ],

  teaches: [
    {
      title: "La rotation mentale",
      body: "Voir une forme et savoir avant de la tourner si elle rentrera dans un creux est un exercice de géométrie que l'école aborde bien plus tard. Ici il se fait 50 fois par partie.",
    },
    {
      title: "Décider vite et sans regret",
      body: "La pièce descend pendant que vous réfléchissez, donc une décision moyenne prise à temps vaut mieux qu'une décision parfaite prise trop tard. C'est une leçon qui dépasse le jeu.",
    },
    {
      title: "Reconnaître un creux",
      body: "Voir qu'il manque exactement une forme en L à gauche de la pile, avant qu'elle arrive, est de la vision spatiale pure. Rien ne l'entraîne aussi bien.",
    },
  ],

  ages: [
    {
      title: "7 ans et plus",
      body: "Le niveau calme, avec 4 formes et une descente lente. C'est l'âge où faire tourner une forme dans sa tête devient possible.",
    },
    {
      title: "Ados et adultes",
      body: "Le normal pour une longue partie, le rapide quand vous voulez perdre en trois minutes et recommencer.",
    },
    {
      title: "10 ans et plus",
      body: "Le niveau normal, avec ses 9 formes. C'est l'âge où la rotation mentale devient assez rapide pour suivre la descente.",
    },
  ],

  accessibility:
    "La forme se déplace au glissement de doigt ou aux flèches du clavier, et un appui la fait tourner. Le niveau calme laisse une seconde entière entre deux descentes, ce qui en fait le seul jeu rapide du site jouable avec une aide à la saisie. Les formes se distinguent par leur silhouette autant que par leur couleur. Le jeu se joue en mode portrait, sur un écran tenu à la verticale.",

  together: [
    {
      title: "Une pièce chacun",
      body: "Chacun place une pièce à son tour sur la même partie. La pile devient un travail commun et les reproches sont partagés équitablement.",
    },
    {
      title: "Le conseiller",
      body: "Un joueur tient l'appareil, l'autre annonce où poser. Le conseiller voit mieux parce qu'il n'a pas les doigts occupés, ce qui surprend tout le monde la première fois.",
    },
    {
      title: "Le score commun",
      body: "Une partie à deux mains, chacun un côté de la grille. Les 100 points d'une quadruple rangée deviennent une réussite collective.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de blocs est-il gratuit ?",
      a: "Oui, les trois vitesses, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de formes y a-t-il ?",
      a: "4 au niveau calme, 9 au normal et 11 au rapide, sur des grilles de 8 sur 14 ou 10 sur 18.",
    },
    {
      q: "Le niveau rapide est-il gagnable ?",
      a: "Non, il finit toujours. Un programme qui range proprement survit à 100% des parties calmes et à aucune partie rapide, la médiane s'arrêtant après 78 rangées.",
    },
    {
      q: "Comment marquer beaucoup de points ?",
      a: "En effaçant plusieurs rangées d'un coup. Une rangée vaut 10 points, deux valent 30, trois 60 et quatre 100.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Sept ans environ, parce qu'il faut se représenter une forme tournée avant de la poser. En dessous, les jeux pour enfants du site conviennent mieux.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, et la partie en cours est retrouvée si vous quittez le jeu.",
    },
  ],

  keywords: [
    "jeu de blocs",
    "blocs qui tombent",
    "jeu de rangement",
    "puzzle gratuit en ligne",
    "jeu sans téléchargement",
    "jeu rétro gratuit",
  ],
};
