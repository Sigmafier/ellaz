import type { GameCopy } from "../../types";

/**
 * Pilote #2 en francais - le jeu de reflexion, et celui dont le record est un
 * TEMPS.
 *
 * Ecrit a partir de `node scripts/brief.mjs fr sudoku`. Les chiffres viennent
 * de `scripts/sim/sudoku-clues.mjs`; rien n'est traduit d'une autre page.
 *
 * STAGED, comme memory.ts a cote: pas encore branche sur `sudoku.ts`.
 */
export const sudokuFr: GameCopy = {
  name: "Sudoku",
  metaTitle: "Sudoku gratuit en ligne, 6 niveaux | Ellaz",
  metaDescription:
    "Sudoku gratuit dans le navigateur, du 4x4 pour enfants au 9x9 expert. Une seule solution par grille, sans compte et hors ligne.",

  lede: "Six niveaux, du 4x4 aux animaux jusqu'au 9x9 expert. Chaque grille a une solution et une seule, donc on ne devine jamais. Le record est un temps.",

  body: [
    "Un sudoku se remplit sans rien lire. C'est vrai des chiffres, et c'est encore plus vrai des deux petites grilles où les cases portent des animaux au lieu de nombres. Un enfant de quatre ans y joue sans savoir compter, et la règle reste exactement la même: jamais deux fois la même chose sur une ligne, sur une colonne, ou dans un bloc.",
    "Les six niveaux vont du 4x4 au 9x9. Le nombre de cases déjà remplies descend au fur et à mesure: 9, puis 18, puis 42, 34, 28, et 24,7 en moyenne tout en haut, mesuré sur 60 grilles à chaque niveau. Le niveau expert vise 24 et n'y arrive pas toujours; il s'arrête parfois à 27, parce qu'en dessous la grille cesse d'avoir une solution unique et nous refusons de la publier.",
    "Ce que vous remplissez vous-même compte plus que ce qui est donné. Sur la grille des animaux, 7 cases sur 16. Sur la facile, 39 sur 81. Sur l'expert, 56. La grille grandit.",
    "Le record est le temps de résolution, et le plus court gagne. Chaque niveau garde le sien: une grille d'animaux en 40 secondes et un expert en 11 minutes ne se comparent pas, et les mélanger rendrait les deux chiffres inutiles. Tout est écrit sur l'appareil, sans compte et sans que personne d'autre le voie.",
    "Une limite, honnêtement: le niveau expert n'est pas amusant pour tout le monde. Il demande des techniques qu'on apprend, pas seulement de l'attention, et un joueur occasionnel s'y bloque sans savoir pourquoi. Commencez au milieu. C'est un conseil, pas une excuse.",
  ],

  howToPlay: [
    {
      title: "Choisir une case",
      body: "Appuyez sur une case vide. Elle se met en évidence, avec sa ligne, sa colonne et son bloc, pour que vous voyiez d'un coup ce qui est déjà pris.",
    },
    {
      title: "Poser un chiffre",
      body: "Appuyez sur le chiffre voulu dans le clavier du bas. Sur les grilles d'animaux, ce sont des animaux à la place des chiffres, et rien d'autre ne change.",
    },
    {
      title: "Finir la grille",
      body: "La partie s'arrête quand toutes les cases sont justes. Le temps s'affiche, et s'il bat votre record sur ce niveau il le remplace.",
    },
  ],

  tips: [
    {
      title: "Cherchez la ligne la plus remplie",
      body: "La case la plus facile du plateau est presque toujours dans la ligne, la colonne ou le bloc qui contient déjà le plus de chiffres. Balayez la grille du regard avant de poser quoi que ce soit.",
    },
    {
      title: "Un chiffre à la fois, partout",
      body: "Prenez le 7 et cherchez toutes ses places possibles dans la grille entière. C'est souvent plus rapide que d'examiner case par case, surtout sur le 9x9.",
    },
    {
      title: "Si vous devinez, arrêtez",
      body: "Il n'y a jamais besoin de deviner. Chaque grille est construite avec une solution unique, donc une case qui vous semble ambiguë veut dire qu'une information est ailleurs et que vous ne l'avez pas encore vue.",
    },
  ],

  teaches: [
    {
      title: "L'élimination",
      body: "Le sudoku est un raisonnement par élimination du début à la fin: ce n'est pas 3 parce que la ligne en a déjà un. C'est la même mécanique que la déduction en mathématiques, sans une seule opération à faire.",
    },
    {
      title: "La patience utile",
      body: "Une grille difficile récompense le fait de s'arrêter et de regarder, ce qui est rare dans un jeu. On avance en observant mieux, pas en appuyant plus vite.",
    },
  ],

  ages: [
    {
      title: "4 à 6 ans",
      body: "Les deux grilles d'animaux, en 4x4 et 6x6. Aucun chiffre, aucune lecture, et une règle qui se montre en un tour.",
    },
    {
      title: "7 ans et plus",
      body: "Le 9x9 facile devient accessible dès que les chiffres jusqu'à 9 sont familiers. 39 cases à remplir, ce qui reste une partie longue pour un enfant.",
    },
    {
      title: "Adultes",
      body: "Moyen et difficile pour une pause, expert pour une vraie séance. Le temps est là si vous voulez vous mesurer à vous-même.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser. Les cases sont grandes et le clavier de chiffres est fixe, donc la cible ne bouge jamais. Les grilles d'animaux donnent une version sans chiffres pour qui n'est pas à l'aise avec les nombres, et la mise en évidence de la ligne aide à suivre la grille sans compter les cases du doigt.",

  together: [
    {
      title: "Le repérage à deux",
      body: "Un adulte demande où pourrait aller le 4, sans le dire. L'enfant cherche, l'adulte confirme. Ça transforme une partie silencieuse en conversation, et ça va beaucoup plus vite qu'on ne croit.",
    },
    {
      title: "La grille partagée",
      body: "Chacun son tour, une case chacun, sans se conseiller. La partie dure plus longtemps et les erreurs deviennent drôles au lieu d'être agaçantes.",
    },
  ],

  faq: [
    {
      q: "Le sudoku est-il gratuit ?",
      a: "Oui, tous les niveaux, sans limite de parties. Il n'y a pas de version payante et pas de publicité.",
    },
    {
      q: "Faut-il un compte pour garder son temps ?",
      a: "Non. Le record est écrit sur l'appareil, sans compte et sans adresse e-mail.",
    },
    {
      q: "Y a-t-il toujours une seule solution ?",
      a: "Oui. Chaque grille est vérifiée à la génération, et une grille qui aurait deux solutions n'est pas proposée. Vous n'avez donc jamais à deviner.",
    },
    {
      q: "Un enfant peut-il y jouer sans savoir compter ?",
      a: "Oui, avec les grilles d'animaux en 4x4 et 6x6. Les cases portent des dessins et la règle est identique.",
    },
    {
      q: "Combien de cases faut-il remplir ?",
      a: "7 sur 16 pour les animaux, 39 sur 81 en facile, et 56 en expert. Le niveau expert part de 24,7 cases données en moyenne.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les grilles sont générées sur l'appareil, donc aucune connexion n'est nécessaire pour jouer.",
    },
  ],

  keywords: [
    "sudoku gratuit",
    "sudoku en ligne",
    "sudoku enfant",
    "sudoku 4x4",
    "sudoku expert",
    "jeu de logique",
  ],
};
