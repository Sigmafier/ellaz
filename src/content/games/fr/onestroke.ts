import type { GameCopy } from "../../types";

/**
 * Un Seul Trait, en francais. Ecrit et non traduit. Les quatre versions
 * partagent leurs chiffres et rien d'autre : une traduction garde le rythme de
 * la langue de depart, et ce rythme est exactement ce qui sonne machine.
 *
 * Tous les chiffres viennent de `scripts/sim/onestroke-paths.mjs`, qui fait
 * tourner les regles livrees sur 2 000 grilles distribuees par niveau.
 *
 * L'aveu de cette page lui appartient : le record est une horloge, donc un
 * joueur lent ne peut pas y figurer meme avec un trait parfait. Les trois
 * autres langues avouent autre chose.
 *
 * Les espaces avant les deux-points, les points-virgules, les points
 * d'interrogation et d'exclamation sont des espaces INSECABLES (U+00A0), comme
 * l'exige la typographie francaise. `voice.ts` le verifie.
 */
export const oneStrokeFr: GameCopy = {
  name: "Un Seul Trait",
  metaTitle: "Un Seul Trait - jeu de tracé gratuit | Ellaz",
  metaDescription:
    "Tracez une ligne unique qui passe par toutes les cases libres, sans lever le doigt ni repasser. Trois grilles, au doigt ou au clavier, sans compte.",

  lede: "Un casse-tête de tracé gratuit, dans le navigateur. Une case porte une marque. À partir d'elle, vous tirez une seule ligne continue qui doit passer par toutes les cases libres de la grille, sans jamais se croiser et sans jamais reprendre une case déjà traversée.",

  body: [
    "La ligne attend déjà sur la case marquée. Appuyez sur la case voisine. Puis la suivante. On continue jusqu'à ce qu'il ne reste plus rien de vide.",

    "La grille n'est pas semée puis vérifiée, elle est fabriquée à l'envers, et l'ordre des opérations est tout. Le jeu trace d'abord une promenade qui passe une fois par chaque case du rectangle, puis il la brasse : en difficile, elle se replie 6 813 fois, chaque pli la laissant passer par chaque case exactement une fois. Les murs sont ensuite retirés des DEUX BOUTS de cette promenade, jamais de son milieu. Ce qui reste est donc encore une seule ligne continue sur exactement les cases qui restent, et la case marquée est l'endroit où cette ligne commence. La réponse existe avant l'affichage, et personne n'a eu à chercher quoi que ce soit pour le savoir. La colonne qui compte les grilles restées sur le zigzag de départ affiche 0 %, et elle est là pour le rester.",

    "Trois tailles, et le nombre de cases libres est la vraie mesure : 23 en facile, 30 en moyen, 38 en difficile, soit 77,6 % du plateau une fois les 11 murs posés. Comme chaque case libre se couvre une fois et une seule, toute réponse à une grille difficile fait exactement 37 pas. Ni plus, ni moins.",

    "Aller vers la première case libre venue ne marche presque jamais : 6,3 % des grilles difficiles se terminent ainsi, et le plateau reste couvert à 60 %. Viser d'abord la case la plus étroite, celle qui a le moins de voisines libres, en termine 50,7 %.",

    "L'aveu, et il est dans le score. Le record est un temps, parce que le compte des pas est identique pour tous ceux qui finissent une grille et ne classerait personne. Un enfant qui aime regarder longtemps avant de poser son doigt trouvera donc de très belles réponses sans jamais améliorer son propre record. C'est un vrai coût, et nous n'avons pas trouvé mieux : la seule autre chose que la grille sait mesurer, ce sont les retours en arrière, et compter les repentirs punirait exactement l'enfant qui réfléchit.",
  ],

  howToPlay: [
    {
      title: "Partir de la marque",
      body: "Une case porte un anneau. La ligne y attend déjà, et elle ne peut commencer nulle part ailleurs.",
    },
    {
      title: "Avancer d'une case",
      body: "Chaque appui suivant avance sur une case voisine, jamais en diagonale et jamais sur un mur. Le glissement du doigt fait la même chose plus vite, et il n'est jamais obligatoire.",
    },
    {
      title: "Ne jamais repasser",
      body: "Une case déjà traversée est refusée. La grille tremble un peu et rien ne bouge, ce qui coûte donc exactement zéro.",
    },
    {
      title: "Revenir d'un pas",
      body: "Le bouton sous la grille retire la dernière case. Appuyer sur la case d'où l'on vient fait rigoureusement la même chose, un pas à la fois.",
    },
    {
      title: "Tout recouvrir",
      body: "La grille est finie quand la ligne occupe chaque case libre. Une seule case vide suffit à la laisser ouverte.",
    },
  ],

  tips: [
    {
      title: "La case la plus étroite d'abord",
      body: "Entre deux directions, prenez celle qui mène vers la case ayant le moins de voisines libres. Cette seule règle termine 50,7 % des grilles difficiles contre 6,3 % pour la première venue.",
    },
    {
      title: "Les impasses se traversent en dernier",
      body: "Une case avec une seule voisine libre ne peut être que la fin du trait. Sur 40,6 % des grilles difficiles il y en a une, alors trouvez-la avant de partir.",
    },
    {
      title: "Longer le bord",
      body: "Les cases du pourtour ont moins de voisines, donc moins d'occasions d'être reprises plus tard. Les avaler tôt laisse le centre ouvert, et le centre pardonne.",
    },
    {
      title: "Ne coupez pas la grille en deux",
      body: "Un trait qui traverse le plateau de part en part laisse deux moitiés séparées. La ligne ne peut en visiter qu'une, et l'autre restera vide quoi que vous fassiez ensuite.",
    },
    {
      title: "Un pas en arrière n'est pas un échec",
      body: "Le bouton de retour ne coûte rien du tout et n'apparaît nulle part dans le score. Beaucoup de bonnes grilles se finissent après trois ou quatre retours.",
    },
  ],

  teaches: [
    {
      title: "Recouvrir sans trou",
      body: "Remplir une surface sans oublier de case et sans repasser deux fois est une idée de géométrie que ce jeu fait toucher du doigt bien avant qu'on sache la nommer.",
    },
    {
      title: "Regarder avant d'agir",
      body: "Le trait se décide un peu à l'avance ou il se coince. Au bout de quelques grilles, l'enfant compte les voisines libres d'une case au lieu de suivre son doigt.",
    },
    {
      title: "Défaire calmement",
      body: "Rien ici n'est définitif. Un pas en arrière, puis un autre, et la ligne repart ailleurs sans que personne n'ait perdu quoi que ce soit.",
    },
    {
      title: "Compter pour de vrai",
      body: "Savoir qu'il reste six cases à couvrir et que le coin en contient quatre est un calcul, et il sert dans la seconde.",
    },
  ],

  ages: [
    {
      title: "5 à 6 ans",
      body: "La grille 5x5 et ses 2 murs. Vingt-trois cases à couvrir, et l'anneau de départ se voit de loin.",
    },
    {
      title: "7 à 9 ans",
      body: "Le 6x6 et ses 30 cases libres. Six murs suffisent à créer des recoins qu'il faut avoir prévus.",
    },
    {
      title: "10 ans et plus",
      body: "Le 7x7, 38 cases, 37 pas. L'ordre dans lequel on avale les recoins décide de toute la fin.",
    },
    {
      title: "Adultes",
      body: "Une grille difficile du premier coup, sans un seul retour en arrière. C'est plus rare que cela n'en a l'air.",
    },
  ],

  accessibility:
    "Chaque case libre est un vrai bouton, annoncé par sa ligne et sa colonne, et l'appui suffit à tout faire. Le glissement du doigt est un raccourci et jamais une obligation, ce qui compte pour une petite main comme pour un pointeur alternatif. La touche Entrée et la barre d'espace avancent la ligne aussi bien qu'un doigt, donc la partie se joue entièrement au clavier. Le trait est d'une seule couleur, si bien qu'aucune information ne dépend de la teinte. Un geste refusé répond par une petite secousse plutôt que par un son d'erreur, parce qu'un refus n'est pas une réprimande. Le bouton de retour reste appuyable même quand il n'y a rien à retirer.",

  together: [
    {
      title: "Chacun son tour",
      body: "Une case chacun, à tour de rôle, sur la même ligne. On se rend vite compte que le voisin vient de fermer le chemin qu'on visait.",
    },
    {
      title: "Annoncer avant de poser",
      body: "Dire à voix haute où la ligne ira ensuite, puis y aller. Un enfant qui sait répondre joue vraiment au jeu.",
    },
    {
      title: "La chasse aux impasses",
      body: "Avant de commencer, cherchez ensemble les cases qui n'ont qu'une seule voisine libre. Il y en a sur 40,6 % des grilles difficiles, et elles décident de la fin.",
    },
    {
      title: "Deux grilles, un chronomètre",
      body: "Le même niveau chacun sur son appareil, et on compare les temps. Les grilles diffèrent, la longueur de la réponse non.",
    },
  ],

  faq: [
    {
      q: "Toutes les grilles ont-elles une solution ?",
      a: "Oui, et elle est fabriquée plutôt que vérifiée. Le jeu retire les murs des deux bouts d'une promenade qui passait déjà par chaque case, donc ce qui reste est encore une ligne complète.",
    },
    {
      q: "Faut-il finir sur une case précise ?",
      a: "Non. Seul le départ est marqué, alors toute ligne qui recouvre tout gagne, même si elle ne ressemble pas du tout à la nôtre.",
    },
    {
      q: "Que faire quand la ligne est bloquée ?",
      a: "Revenir en arrière avec le bouton, une case à la fois, jusqu'à un endroit où une autre direction s'ouvre. Le bouton recommencer redonne la même grille toute vide.",
    },
    {
      q: "Faut-il glisser le doigt ?",
      a: "Non. Appuyer case après case fait exactement la même chose, au clavier également.",
    },
    {
      q: "Combien de pas fait une bonne partie ?",
      a: "Toujours le même nombre : 22, 29 ou 37 selon la grille. C'est le temps qui distingue deux joueurs, pas le nombre de pas.",
    },
    {
      q: "Le jeu est-il gratuit ?",
      a: "Entièrement. Aucun paiement, aucune publicité, aucune inscription.",
    },
    {
      q: "Marche-t-il sans connexion ?",
      a: "Oui, après la première visite. La grille en cours est retrouvée telle quelle si vous fermez l'onglet.",
    },
    {
      q: "Comment le record est-il compté ?",
      a: "En temps, le plus court gagne, et séparément pour chaque grille. Un 5x5 et un 7x7 ne valent pas la même chose.",
    },
  ],

  keywords: [
    "un seul trait",
    "jeu de tracé",
    "casse-tete de ligne",
    "jeu de logique gratuit",
    "puzzle de grille",
    "tracer sans lever le doigt",
  ],
};
