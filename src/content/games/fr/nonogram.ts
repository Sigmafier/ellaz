import type { GameCopy } from "../../types";

/**
 * Logique en images, en francais. Ecrit et non traduit. Les quatre versions
 * partagent leurs chiffres et rien d'autre, parce qu'une traduction garde le
 * rythme de la langue de depart, et que ce rythme est exactement ce qui sonne
 * machine.
 *
 * Tous les chiffres viennent de `scripts/sim/nonogram-solvable.mjs`, qui fait
 * tourner les regles livrees sur 4 000 images candidates par niveau.
 *
 * L'aveu de cette page lui appartient : le glissement du doigt peint ce que sa
 * PREMIERE case est devenue, donc un geste parti d'une case deja pleine efface
 * la rangee au lieu de la remplir. Les trois autres pages avouent autre chose.
 *
 * Les espaces avant les deux-points, les points-virgules, les points
 * d'interrogation et d'exclamation sont des espaces INSECABLES (U+00A0), comme
 * l'exige la typographie francaise. `voice.ts` le verifie.
 */
export const nonogramFr: GameCopy = {
  name: "Logique en images",
  metaTitle: "Picross gratuit - logique en images | Ellaz",
  metaDescription:
    "Un picross gratuit dans le navigateur. Les nombres comptent les cases pleines de chaque ligne, et une image sort de la grille. Trois tailles, sans compte.",

  lede: "Un jeu de logique en images, gratuit et directement dans le navigateur. Chaque rangée et chaque colonne porte la longueur de ses suites de cases pleines. Remplissez les bonnes cases et une petite image sort de la grille, sans jamais avoir eu besoin de deviner.",

  body: [
    "On lit une ligne. Les nombres disent combien de cases pleines s'y suivent, dans l'ordre. On remplit. C'est tout le jeu.",

    "La grille n'est pas semée puis vérifiée. Elle commence par une image. Le jeu la dessine, lit les longueurs de suites dessus, puis confie ces nombres à un solveur qui n'a le droit d'écrire une case que lorsque toutes les dispositions légales de cette ligne sont d'accord sur elle. Si le solveur termine la grille entière, alors les nombres imposent une seule image et un joueur peut y arriver sans deviner une seule fois. S'il bloque quelque part, l'image part à la poubelle et le jeu en dessine une autre. Sur 4 000 images candidates par niveau, 87,7 % passent cette épreuve sur la petite grille et 82,0 % sur la grande, ce qui revient à 1,25 image dessinée par partie et cinq dans le pire cas mesuré.",

    "Le chiffre qui décrit vraiment la difficulté est ailleurs. Un seul passage sur toutes les rangées puis toutes les colonnes règle 85,3 % de la petite grille tout seul. Sur la grande, le même passage n'en règle que 58,2 %, et le reste n'arrive qu'en lisant un axe contre l'autre, sur 4,15 passages en moyenne et jusqu'à 12. La grille a triplé de côté. Le va-et-vient entre les deux axes, lui, a fait bien plus que tripler.",

    "Environ la moitié des cases finit pleine à chaque taille, et c'est voulu. Une grille remplie aux trois quarts donne une image plus sombre, jamais un puzzle plus profond. La grande porte 53 nombres sur ses bords, contre 15 pour la petite.",

    "L'aveu, maintenant. Le glissement du doigt peint ce que sa PREMIÈRE case est devenue, et pas autre chose. Partir d'une case déjà pleine et balayer une rangée la vide donc entièrement, ce qui est exactement ce qu'il faut quand on corrige, et exactement ce qu'il ne faut pas quand on visait la case d'à côté. Le geste est cohérent et rien ne l'annonce avant le premier essai raté. Sur la grande grille il coûte parfois une rangée de quinze cases.",
  ],

  howToPlay: [
    {
      title: "Lire les nombres",
      body: "Chaque rangée et chaque colonne porte ses longueurs de suites, dans l'ordre. Le « 4 1 » d'une rangée annonce quatre cases pleines, au moins une vide, puis une pleine.",
    },
    {
      title: "Remplir une case",
      body: "Un appui la remplit. Le même appui au même endroit la vide à nouveau, donc revenir en arrière ne demande aucun bouton à trouver.",
    },
    {
      title: "Écarter une case",
      body: "Le second mode marque une case comme vide. Ce sont vos notes : le jeu ne les exige jamais et ne les vérifie pas.",
    },
    {
      title: "Suivre ce qui s'efface",
      body: "Les nombres d'une ligne pâlissent dès que cette ligne dit exactement ce qu'ils annoncent. C'est tout le retour que le jeu donne.",
    },
    {
      title: "Voir l'image",
      body: "Quand toutes les rangées et toutes les colonnes tombent juste, l'image est finie et l'horloge s'arrête.",
    },
  ],

  tips: [
    {
      title: "Commencez par les lignes pleines",
      body: "Une suite plus longue que la moitié de la ligne se recoupe avec elle-même où qu'on la place. Sur la grande grille la plus longue suite mesure 12,8 cases en moyenne, donc elle donne presque toute sa ligne.",
    },
    {
      title: "Le zéro est le meilleur nombre",
      body: "Une ligne marquée 0 est entièrement vide, et elle coupe en deux toutes les colonnes qu'elle traverse. Cherchez-les avant de chercher quoi que ce soit d'autre.",
    },
    {
      title: "Écartez autant que vous remplissez",
      body: "Une case dont vous savez qu'elle est vide vaut autant qu'une case pleine, parce qu'elle empêche une suite de s'y étendre. Le premier passage règle 58,2 % de la grande grille, et une bonne moitié en est des cases écartées.",
    },
    {
      title: "Changez d'axe dès que ça coince",
      body: "Une rangée qui ne donne plus rien a presque toujours été débloquée par une colonne entre-temps. Le solveur du jeu fait ce va-et-vient 4,15 fois avant d'avoir fini.",
    },
    {
      title: "Ne devinez jamais",
      body: "Aucune grille distribuée ici n'a besoin d'un pari. Si vous êtes tenté d'en faire un, la déduction qui manque est ailleurs sur le plateau.",
    },
  ],

  teaches: [
    {
      title: "Lire une contrainte",
      body: "« 3 1 » n'est pas une quantité, c'est une forme avec un ordre et un espace obligatoire dedans. Le comprendre, c'est déjà lire une notation.",
    },
    {
      title: "Croiser deux sources",
      body: "Une rangée seule ne suffit presque jamais. La réponse naît de la rencontre entre une rangée et une colonne, la forme même du raisonnement par recoupement.",
    },
    {
      title: "Écrire ce qu'on a éliminé",
      body: "Marquer une case comme vide, c'est noter une conclusion pour ne pas la refaire. Cette habitude finit la grande grille bien plus vite.",
    },
    {
      title: "Tenir la certitude",
      body: "Comme rien ici ne demande de pari, chaque case posée est démontrée. C'est une manière discrète d'apprendre la différence entre savoir et penser.",
    },
  ],

  ages: [
    {
      title: "6 à 8 ans",
      body: "La grille de 25 cases, avec 15 nombres autour d'elle. Un seul passage en règle déjà 85,3 %, donc l'enfant avance presque sans blocage.",
    },
    {
      title: "9 à 12 ans",
      body: "La grille de 100 cases. Les nombres par ligne y tombent à 1,27 en moyenne, ce qui veut dire de longues suites et des déductions qui portent loin.",
    },
    {
      title: "13 ans et plus",
      body: "La grille de 225 cases et ses 53 nombres. Le premier passage n'en donne que 58,2 %, et le reste se gagne un axe après l'autre.",
    },
    {
      title: "Adultes",
      body: "La grande grille sans jamais écarter une seule case. Faisable et pénible, ce qui fait bien comprendre à quoi servent les notes.",
    },
  ],

  accessibility:
    "Chaque case est un vrai bouton qui annonce sa rangée et sa colonne, et un simple appui suffit pour tout faire dans ce jeu. Le glissement du doigt n'est qu'un raccourci, ce qui compte pour une petite main et pour tout dispositif de pointage alternatif. La touche Entrée et la barre d'espace remplissent une case exactement comme un doigt, donc une grille entière se joue au clavier. Le choix entre remplir et écarter est une paire de boutons de taille normale, jamais un appui long ni un second doigt. Aucune limite de temps ne pousse, et une grille laissée en plan revient telle quelle. Les cases pleines ne se distinguent pas seulement par la couleur : une case écartée porte une croix, et une case vide reste vide.",

  together: [
    {
      title: "Un axe chacun",
      body: "L'un ne lit que les rangées, l'autre que les colonnes, et on se passe le doigt. L'autre voit des choses invisibles de votre côté.",
    },
    {
      title: "Dire avant de poser",
      body: "Annoncer à voix haute pourquoi cette case est forcément pleine, puis la remplir. Un enfant qui sait répondre joue au jeu au lieu de suivre son intuition.",
    },
    {
      title: "Le pari sur l'image",
      body: "À mi-parcours, chacun devine ce que représente l'image. La moitié des cases est pleine à la fin, donc à mi-chemin il y a déjà de quoi se tromper joyeusement.",
    },
    {
      title: "La chasse aux vides",
      body: "Ne remplir aucune case pendant deux minutes et ne marquer que les cases sûrement vides. La grille avance quand même, ce qui surprend toujours.",
    },
  ],

  faq: [
    {
      q: "Que veulent dire les nombres ?",
      a: "Les longueurs des suites de cases pleines de cette ligne, dans l'ordre, séparées par au moins une case vide. « 4 1 » annonce quatre pleines, un trou, une pleine.",
    },
    {
      q: "Est-ce qu'une grille peut avoir deux solutions ?",
      a: "Non. Chaque grille est vérifiée avant d'être montrée, et celles qui admettent deux images sont jetées. Sur la grande taille, 18 % des images dessinées finissent à la poubelle pour cette raison.",
    },
    {
      q: "Faut-il deviner à un moment ?",
      a: "Jamais. La vérification est plus stricte que l'unicité : elle exige qu'un raisonnement ligne par ligne suffise à remplir toute la grille.",
    },
    {
      q: "À quoi servent les croix ?",
      a: "À noter les cases dont vous savez qu'elles sont vides. Le jeu ne les compte pas et ne les demande pas, mais elles sont ce qui débloque la grande grille.",
    },
    {
      q: "Le jeu dit-il quand je me trompe ?",
      a: "Non. Les nombres d'une ligne juste pâlissent, et c'est le seul retour. Une case fausse reste en place jusqu'à ce qu'une autre ligne refuse de tomber juste.",
    },
    {
      q: "Combien de temps prend une grille ?",
      a: "La petite se lit presque d'un coup. La grande demande 4,15 allers-retours entre les deux axes rien que pour la partie mécanique.",
    },
    {
      q: "Le jeu est-il gratuit ?",
      a: "Entièrement. Aucun paiement, aucune publicité, aucune inscription.",
    },
    {
      q: "Ça marche sans connexion ?",
      a: "Oui, après une première visite. La grille en cours est gardée aussi, donc fermer l'onglet ne l'efface pas.",
    },
    {
      q: "Comment est mesuré le record ?",
      a: "Au chronomètre, le plus rapide gagnant, et séparément pour chaque taille de grille. Quatre minutes sur 225 cases et quatre minutes sur 25 ne sont pas le même après-midi.",
    },
  ],

  keywords: ["picross", "nonogramme", "logique", "puzzle", "grille", "réflexion"],
};
