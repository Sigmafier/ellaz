import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr tictactoe`. STAGED. */
export const tictactoeFr: GameCopy = {
  name: "Morpion",
  metaTitle: "Morpion gratuit en ligne, 3 niveaux | Ellaz",
  metaDescription:
    "Le morpion contre 3 adversaires, du hasard au calcul parfait. Gratuit dans le navigateur, sans compte, sans publicité et hors ligne.",

  lede: "Trois adversaires. Le premier joue au hasard, le dernier ne peut pas perdre. Nous avons simulé 3 000 parties contre lui et gagné zéro fois.",

  body: [
    "Le morpion tient sur neuf cases et tout le monde y a joué. Ce que peu de gens savent, c'est qu'il est entièrement résolu : il existe 255 168 parties complètes possibles, et si les deux joueurs jouent parfaitement, le résultat est toujours une partie nulle. Toujours. Le jeu n'est intéressant que parce qu'un humain ne joue jamais parfaitement.",
    "Nos trois niveaux sont donc trois degrés d'imperfection, choisis exprès. Le facile joue un coup au hasard. Le moyen joue le meilleur coup environ une fois sur deux. Le difficile calcule toutes les suites possibles. Il ne se trompe jamais.",
    "Les chiffres disent le reste. Contre un joueur qui pose au hasard, notre niveau facile perd 29% du temps, le moyen gagne 54,3%, le difficile gagne 78,3% et perd 0. Et contre le difficile, sur 3 000 parties simulées, nous n'avons obtenu aucune victoire : 21,7% de parties nulles et 78,3% de défaites. Ce n'est pas un réglage à ajuster, c'est ce que veut dire résoudre un jeu.",
    "Le record est la plus longue série de victoires d'affilée, et chaque adversaire garde la sienne. Contre le difficile, elle peut rester vide pour toujours.",
    "L'aveu tient là, et il faut le dire plutôt que de le laisser découvrir : le niveau difficile n'est pas battable. Ni par vous, ni par nous, ni par personne. Le meilleur résultat possible est la partie nulle, et le vrai défi est d'en obtenir une à chaque fois. Si le but est de gagner, jouez contre le moyen, où une erreur sur deux vous laisse une porte ouverte.",
  ],

  howToPlay: [
    {
      title: "Choisir un adversaire",
      body: "Facile joue au hasard, moyen se trompe environ une fois sur deux, difficile ne se trompe jamais. Changer d'adversaire remet la série de victoires à zéro.",
    },
    {
      title: "Poser sa marque",
      body: "Appuyez sur une case vide. L'adversaire répond aussitôt, sans temps d'attente artificiel.",
    },
    {
      title: "Aligner trois cases",
      body: "En ligne, en colonne ou en diagonale. Si la grille se remplit sans alignement, la partie est nulle.",
    },
  ],

  tips: [
    {
      title: "Prenez le centre",
      body: "La case du milieu appartient à 4 alignements sur 8, plus que n'importe quelle autre. Contre le niveau facile, la prendre suffit souvent à gagner.",
    },
    {
      title: "Les angles avant les côtés",
      body: "Un angle est dans 3 alignements, un côté seulement dans 2. À valeur égale de coup, l'angle est toujours le meilleur choix.",
    },
    {
      title: "Bloquez avant d'attaquer",
      body: "Beaucoup de défaites viennent d'une case gagnante suivie sans regarder la menace d'en face. Vérifiez l'alignement adverse avant chaque coup, systématiquement.",
    },
  ],

  teaches: [
    {
      title: "Anticiper le coup d'en face",
      body: "Le morpion est le premier jeu où un enfant doit se demander ce que l'autre va faire ensuite. C'est un pas énorme, et neuf cases suffisent à le franchir.",
    },
    {
      title: "Accepter la partie nulle",
      body: "Contre le niveau difficile, ne pas perdre est le résultat maximal. Comprendre qu'un match nul peut être une réussite est une leçon plus utile que beaucoup de victoires.",
    },
    {
      title: "Reconnaître une double menace",
      body: "Créer deux alignements possibles d'un coup est la seule façon de gagner contre un adversaire attentif. Comprendre ça change tout le jeu d'un enfant.",
    },
  ],

  ages: [
    {
      title: "4 à 6 ans",
      body: "Le niveau facile, qui joue au hasard et se laisse battre souvent. Rien à lire, et une partie dure moins d'une minute.",
    },
    {
      title: "7 ans et plus",
      body: "Le moyen pour gagner de temps en temps, le difficile pour apprendre à ne plus perdre.",
    },
    {
      title: "Adultes",
      body: "Le difficile, comme énigme plutôt que comme jeu : obtenir la partie nulle à chaque fois demande de connaître les bonnes réponses.",
    },
  ],

  accessibility:
    "Neuf grandes cases, un appui par coup, sans glisser et sans double appui. Rien n'est chronométré : la grille attend votre coup aussi longtemps qu'il faut. Les deux marques se distinguent par leur forme et pas seulement par leur couleur, et l'adversaire répond immédiatement pour qu'il n'y ait jamais de doute sur qui doit jouer.",

  together: [
    {
      title: "À deux contre le difficile",
      body: "Deux joueurs se concertent avant chaque coup contre l'adversaire imbattable. Obtenir une partie nulle à chaque fois devient un objectif commun, et la discussion vaut mieux que la partie.",
    },
    {
      title: "Le tournoi en cinq parties",
      body: "Chacun cinq parties contre le moyen, on compare les séries. Le hasard s'efface vite sur cinq parties, ce qui rend le résultat honnête.",
    },
    {
      title: "Le vrai morpion",
      body: "Deux joueurs sur le même appareil, sans adversaire calculé. C'est la version qui existe depuis toujours, et elle finit très souvent par une partie nulle.",
    },
  ],

  faq: [
    {
      q: "Le morpion est-il gratuit ?",
      a: "Oui, les trois adversaires, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Peut-on battre le niveau difficile ?",
      a: "Non. Il calcule toutes les suites possibles. Sur 3 000 parties simulées, nous avons obtenu 21,7% de parties nulles et aucune victoire.",
    },
    {
      q: "Quelle est la différence entre les trois niveaux ?",
      a: "Le facile joue un coup au hasard, le moyen joue le meilleur coup environ une fois sur deux, le difficile ne se trompe jamais.",
    },
    {
      q: "Combien de parties de morpion existent ?",
      a: "255 168 parties complètes. Avec deux joueurs parfaits, le résultat est toujours une partie nulle.",
    },
    {
      q: "Que garde le record ?",
      a: "La plus longue série de victoires d'affilée contre un adversaire donné. Elle repart à zéro si vous changez d'adversaire.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. L'adversaire est calculé sur l'appareil, sans connexion.",
    },
  ],

  keywords: [
    "morpion en ligne",
    "morpion gratuit",
    "tic tac toe",
    "jeu à deux",
    "jeu rapide gratuit",
    "morpion contre ordinateur",
  ],
};
