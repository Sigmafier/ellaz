import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr fit`. STAGED. */
export const fitFr: GameCopy = {
  name: "Casse-forme",
  metaTitle: "Jeu de formes à placer sur une grille | Ellaz",
  metaDescription:
    "Placez 3 formes à la fois pour compléter des lignes. Grilles 6x6 et 8x8, 19 formes. Gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Trois formes proposées, une grille à remplir, aucune horloge. Deux lignes effacées ensemble valent trois fois une seule.",

  body: [
    "Trois formes attendent en bas de l'écran. Vous les posez où elles rentrent. Une ligne ou une colonne complète s'efface. Trois nouvelles formes arrivent quand les trois précédentes sont posées.",
    "Rien n'est chronométré, ce qui rend ce jeu très différent de ceux où les blocs tombent. La partie se termine quand aucune des 3 formes proposées ne rentre nulle part, et jamais parce que vous avez été trop lent. Un enfant peut regarder la grille pendant deux minutes. Rien ne presse.",
    "Nous avons comparé deux façons de jouer sur 3 000 parties par niveau et par programme, et le résultat dit exactement où se situe la difficulté. En facile, un programme qui examine tous les placements légaux tient 112,7 poses contre 21,8 pour un programme qui pose au hasard: 5,17 fois plus longtemps. En difficile, les mêmes deux programmes atteignent 19,3 et 12,5, soit un gain de 1,54 seulement. Autrement dit, le niveau facile récompense énormément le fait de réfléchir, et le difficile beaucoup moins, parce qu'il finit avant que la réflexion ait le temps de payer.",
    "Un dernier chiffre le confirme. En difficile, la grille n'est remplie qu'à 50,2% quand la partie s'arrête, et 45,3% des parties se terminent avec plus de la moitié de la grille encore vide.",
    "L'aveu est justement là. Le niveau difficile est frustrant, et pas parce qu'il est exigeant: il se termine tôt, avec beaucoup de place apparemment disponible, sur un tirage de 3 formes qui ne rentraient nulle part. Ce n'est pas toujours votre faute, et il est plus honnête de l'écrire que de laisser croire à une erreur de jeu.",
  ],

  howToPlay: [
    {
      title: "Choisir une forme",
      body: "3 formes sont proposées en bas de l'écran, dans des emplacements de 96 pixels de haut. Appuyez sur celle que vous voulez placer.",
    },
    {
      title: "La poser",
      body: "Appuyez sur la grille à l'endroit voulu, ou faites glisser la forme. Les deux gestes marchent, et un placement impossible n'est pas accepté.",
    },
    {
      title: "Effacer des lignes",
      body: "Une ligne ou une colonne complète disparaît. Deux effacées ensemble valent trois fois plus qu'une seule.",
    },
  ],

  tips: [
    {
      title: "Placez la plus grosse en premier",
      body: "Les 3 formes doivent toutes être posées avant d'en recevoir de nouvelles. Commencer par la plus encombrante évite de se retrouver sans place pour elle à la fin du tour.",
    },
    {
      title: "Visez les doubles lignes",
      body: "Deux lignes effacées ensemble valent trois fois une seule. Sur une grille de 8 sur 8, préparer un croisement rapporte bien plus que nettoyer au fil de l'eau.",
    },
    {
      title: "En facile, prenez votre temps",
      body: "Examiner tous les placements possibles multiplie la durée de vie par 5,17 en facile, contre 1,54 en difficile. C'est le niveau où la réflexion paie le plus.",
    },
  ],

  teaches: [
    {
      title: "La vision spatiale",
      body: "Voir si une forme de 5 cases rentre dans un creux sans l'y poser est un exercice de géométrie mentale, et il se fait ici des dizaines de fois par partie.",
    },
    {
      title: "Choisir un ordre",
      body: "Les 3 formes doivent toutes être posées, donc l'ordre compte plus que chaque placement pris isolément. C'est un vrai problème d'ordonnancement, sans le mot.",
    },
    {
      title: "Anticiper l'encombrement",
      body: "Poser une forme change ce que les deux suivantes pourront faire. Penser au tour entier plutôt qu'au coup présent est ce qui sépare 21,8 poses de 112,7.",
    },
  ],

  ages: [
    {
      title: "6 ans et plus",
      body: "Le facile, sur une grille de 6 sur 6 avec 10 formes seulement. Rien n'est chronométré, donc rien ne bouscule.",
    },
    {
      title: "Ados et adultes",
      body: "Le difficile, sur 8 sur 8 avec les 19 formes, où presque la moitié des parties finissent grille à moitié vide.",
    },
    {
      title: "Adultes",
      body: "Le difficile sur 8 sur 8, sans chronomètre, est un excellent jeu de pause: on peut s'arrêter au milieu et reprendre plus tard.",
    },
  ],

  accessibility:
    "Une forme se pose au glissement de doigt ou par deux appuis, prendre puis poser, donc rien n'oblige à maintenir un geste. Les emplacements du bas font 96 pixels de haut et chaque case de la grille est annoncée par sa colonne et sa rangée, ce qui rend le jeu utilisable au lecteur d'écran. Rien n'est chronométré, ce qui en fait l'un des jeux les plus adaptés du site à qui joue avec une aide à la saisie.",

  together: [
    {
      title: "Une forme chacun",
      body: "Trois formes, deux joueurs, on alterne. Personne ne contrôle le tour entier, ce qui oblige à penser à ce qu'on laisse à l'autre.",
    },
    {
      title: "Le conseil obligatoire",
      body: "Avant chaque pose, l'autre joueur doit proposer un emplacement différent. On finit par voir des placements qu'on n'aurait jamais envisagés seul.",
    },
    {
      title: "Le placement imposé",
      body: "L'un choisit la forme, l'autre décide où elle va. Séparer les deux décisions rend la partie beaucoup plus difficile et beaucoup plus bavarde.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de formes est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Y a-t-il un chronomètre ?",
      a: "Non. La partie se termine seulement quand aucune des 3 formes proposées ne rentre nulle part.",
    },
    {
      q: "Combien y a-t-il de formes ?",
      a: "19 en tout, dont 10 seulement au niveau facile. La grille fait 6 sur 6 en facile et 8 sur 8 aux autres niveaux.",
    },
    {
      q: "Comment marquer beaucoup de points ?",
      a: "En effaçant deux lignes d'un coup, ce qui vaut trois fois une seule ligne.",
    },
    {
      q: "Pourquoi la partie finit-elle si tôt en difficile ?",
      a: "Parce qu'un tirage de 3 formes peut ne rentrer nulle part: la grille n'est remplie qu'à 50,2% en moyenne quand la partie s'arrête.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de formes",
    "placer des blocs",
    "puzzle de grille",
    "jeu de logique gratuit",
    "jeu sans chronomètre",
    "casse-tête en ligne",
  ],
};
