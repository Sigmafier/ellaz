import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr minesweeper`. STAGED. */
export const minesweeperFr: GameCopy = {
  name: "Démineur",
  metaTitle: "Démineur gratuit en ligne, 3 niveaux | Ellaz",
  metaDescription:
    "Le démineur en 9x9, 12x12 ou 14x14, avec un premier appui toujours sûr. Gratuit dans le navigateur, sans compte et jouable hors ligne.",

  lede: "Trois grilles, de 10 mines à 40. Le premier appui ne peut jamais exploser, et 79,8% des grilles faciles se finissent sans deviner.",

  body: [
    "Chaque case ouverte affiche combien de mines la touchent, de 0 à 8. Tout le jeu tient là. Un 1 posé à côté d'une seule case fermée dit exactement où est la mine, et à partir de là chaque déduction en ouvre une autre.",
    "Le premier appui est toujours sûr, et pas seulement lui: ses 8 voisines aussi sont vidées de toute mine avant le placement. Une partie ne se termine donc jamais au premier geste, ce qui arrivait dans les vieilles versions. Cela n'apprenait rien.",
    "Nous voulions savoir combien de grilles se résolvent par pure logique, sans jamais avoir à parier. Sur 2 000 grilles par niveau: 79,8% en facile, 44,4% en moyen, 12,3% en difficile. Autrement dit, sur la grande grille, presque neuf parties sur dix finissent par une position où il ne reste plus qu'à choisir entre deux cases sans avoir de raison de préférer l'une. C'est la nature du démineur, ce n'est pas un défaut de notre générateur, et c'est une information qu'un joueur mérite d'avoir avant de s'énerver sur une défaite.",
    "Les trois grilles font 9x9 avec 10 mines, 12x12 avec 24 et 14x14 avec 40. Les densités correspondantes sont 12,3%, 16,7% et 20,4%.",
    "Le record est le temps de résolution. Le plus court gagne. Chaque niveau garde le sien, parce qu'une grille de 9x9 et une grille de 14x14 ne sont pas deux versions du même problème.",
  ],

  howToPlay: [
    {
      title: "Ouvrir une case",
      body: "Appuyez sur une case fermée. Le premier appui est toujours sûr, ainsi que ses voisines immédiates.",
    },
    {
      title: "Lire les chiffres",
      body: "Le chiffre d'une case ouverte dit combien de mines la touchent parmi les 8 cases autour. Une case vide n'en touche aucune et ouvre ses voisines toute seule.",
    },
    {
      title: "Marquer les mines",
      body: "Un appui long pose un drapeau sur une case suspecte. La partie se termine quand toutes les cases sans mine sont ouvertes.",
    },
  ],

  tips: [
    {
      title: "Suivez les 1 en bordure",
      body: "Un 1 collé au bord de la grille a moins de voisines, donc moins de possibilités. Les bords sont presque toujours l'endroit où la déduction est la plus facile à commencer.",
    },
    {
      title: "Comparez deux chiffres voisins",
      body: "Un 1 et un 2 côte à côte disent souvent, ensemble, quelque chose qu'aucun des deux ne dit seul. C'est la technique qui fait passer du moyen au difficile.",
    },
    {
      title: "Quand il faut parier, pariez tôt",
      body: "Si une position sans solution logique arrive, choisissez la case dans la zone la moins avancée. Une erreur en début de partie coûte moins de travail perdu qu'une erreur à la fin.",
    },
  ],

  teaches: [
    {
      title: "La déduction pure",
      body: "Rien ici n'est une question de réflexe ou de mémoire. Chaque case ouverte est la conclusion d'un raisonnement, et une erreur est toujours un raisonnement raté plutôt qu'un geste raté.",
    },
    {
      title: "Le risque calculé",
      body: "Sur la grande grille, un moment arrive où aucun raisonnement ne suffit. Choisir quand même, en sachant que c'est un pari, est une compétence à part entière.",
    },
    {
      title: "Marquer ce qu'on sait",
      body: "Poser un drapeau, c'est écrire une conclusion pour ne pas avoir à la refaire. Externaliser son raisonnement est une habitude de travail avant d'être une tactique.",
    },
  ],

  ages: [
    {
      title: "8 ans et plus",
      body: "La petite grille, à 10 mines. Il faut savoir compter jusqu'à 8 et accepter de perdre une partie sans avoir rien fait de mal.",
    },
    {
      title: "Adultes",
      body: "La grande grille et son chronomètre, où 12,3% des parties seulement se gagnent sans parier une seule fois.",
    },
    {
      title: "12 ans et plus",
      body: "La grille moyenne, à 24 mines, où la comparaison de deux chiffres voisins devient nécessaire. C'est l'âge où cette technique se comprend.",
    },
  ],

  accessibility:
    "Un appui court ouvre une case, un appui long pose un drapeau, et rien ne demande de glisser. Les chiffres sont écrits en toutes lettres à l'écran et pas seulement codés par la couleur, donc un joueur daltonien les lit sans difficulté. Le chronomètre tourne mais il n'impose rien: une partie peut durer une heure sans conséquence, il enregistre simplement le temps.",

  together: [
    {
      title: "Le déminage commenté",
      body: "Un joueur appuie, l'autre doit dire pourquoi cette case est sûre avant qu'il le fasse. La partie ralentit énormément et le taux de défaite s'effondre.",
    },
    {
      title: "Le meilleur temps de la semaine",
      body: "Chacun ses parties, on compare les records sur la petite grille. Comme le record est un temps, la comparaison est immédiate et ne demande aucun calcul.",
    },
    {
      title: "La grille à deux",
      body: "L'un tient l'appareil, l'autre a le droit de veto sur chaque appui. Le temps monte, le taux de défaite s'effondre, et la discussion vaut la partie.",
    },
  ],

  faq: [
    {
      q: "Le démineur est-il gratuit ?",
      a: "Oui, les trois grilles, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Le premier appui peut-il exploser ?",
      a: "Non, jamais. La case du premier appui et ses 8 voisines sont exclues du placement des mines.",
    },
    {
      q: "Faut-il parfois deviner ?",
      a: "Oui, et c'est mesuré: 79,8% des grilles faciles se finissent par pure logique, 44,4% des moyennes et 12,3% des difficiles. Le reste finit sur un choix sans raison.",
    },
    {
      q: "Quelles sont les tailles de grille ?",
      a: "9x9 avec 10 mines, 12x12 avec 24, et 14x14 avec 40, soit des densités de 12,3%, 16,7% et 20,4%.",
    },
    {
      q: "Comment poser un drapeau ?",
      a: "Un appui long sur la case. Un appui court l'ouvre.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les grilles sont fabriquées sur l'appareil.",
    },
  ],

  keywords: [
    "démineur gratuit",
    "démineur en ligne",
    "jeu de logique",
    "démineur sans téléchargement",
    "jeu classique gratuit",
    "minesweeper français",
  ],
};
