import type { GameCopy } from "../../types";

/**
 * Tuyaux, en francais. Ecrit et non traduit. Les quatre versions partagent
 * leurs faits et rien d'autre, parce qu'une traduction garde le rythme de la
 * langue de depart, et que ce rythme est exactement ce qui sonne machine.
 *
 * Tous les chiffres viennent de `scripts/sim/flow-routes.mjs`, qui fait tourner
 * les regles livrees sur 4 000 grilles distribuees par niveau.
 *
 * Les espaces avant les deux-points, les points-virgules, les points
 * d'interrogation et d'exclamation sont des espaces INSECABLES (U+00A0), comme
 * l'exige la typographie francaise. `voice.ts` le verifie.
 */
export const flowFr: GameCopy = {
  name: "Tuyaux",
  metaTitle: "Tuyaux - jeu de puzzle gratuit | Ellaz",
  metaDescription:
    "Reliez chaque paire de points par un tuyau et recouvrez toutes les cases. Trois grilles, au doigt ou au clavier, sans compte et hors ligne.",

  lede: "Un puzzle de tuyaux gratuit, dans le navigateur. Des paires de points colorés attendent sur une grille, et vous tirez un tuyau de chaque point jusqu'à son jumeau en passant de case voisine en case voisine. La grille est finie quand toutes les paires sont reliées et qu'il ne reste plus une seule case vide.",

  body: [
    "On appuie sur un point. Puis sur la case d'à côté, puis sur la suivante, jusqu'au point de la même couleur. C'est tout.",

    "La grille n'est pas semée au hasard puis vérifiée. Elle est construite à l'envers. Le jeu trace d'abord un chemin unique qui passe par chaque case exactement une fois, puis il le découpe en morceaux, un par couleur, et les deux bouts de chaque morceau deviennent une paire de points. Comme ces morceaux se partagent un chemin qui avait déjà couvert toute la grille, ils la recouvrent entièrement et ne peuvent pas se croiser. La solution existe donc avant même que la grille ne s'affiche. Ce chemin n'est d'ailleurs pas cherché, il est brassé : il part d'un zigzag ordinaire, ligne après ligne, et se replie 9 800 fois sur la grande grille, chaque pli le laissant passer par chaque case une seule fois. Sur 4 000 grilles distribuées par niveau, un tuyau mesure en moyenne 6,3 cases en facile, 7,2 en moyen et 8,2 en difficile.",

    "Le chiffre à retenir est ailleurs. En difficile, les deux points d'une paire sont séparés de 5,1 cases à vol d'oiseau, et le tuyau qui les relie en parcourt 8,2. Un détour de 1,61 fois. Cet écart est le jeu tout entier : une paire qui ressemble à un petit saut réclame un trajet qui tourne, parce que les cases qu'il évite devront bien être remplies par quelqu'un.",

    "Relier n'est pas gagner. Un programme qui relie chaque paire par son plus court chemin ne recouvre que 61,2 % de la grille difficile, soit presque quatre cases sur dix laissées nues. Pire, il enferme une couleur sans aucun trajet libre sur 29,5 % des grilles difficiles.",

    "L'aveu. Une fois le tuyau posé, il n'y a pas de retour en arrière case par case. Repartir de son point efface le tuyau entier, donc un trajet de onze cases faux sur les deux dernières se redessine depuis le début. Pendant le tracé, revenir sur ses pas marche très bien. Après, non. C'est le prix de n'avoir aucun bouton à lire, et sur la grande grille ce prix se sent.",
  ],

  howToPlay: [
    {
      title: "Partir d'un point",
      body: "Appuyez sur un point coloré. Le tuyau commence là, et il ne peut commencer que sur un point.",
    },
    {
      title: "Avancer case par case",
      body: "Chaque appui suivant avance d'une case voisine, jamais en diagonale. Le glissement du doigt fait la même chose plus vite, et il n'est jamais obligatoire.",
    },
    {
      title: "Fermer sur le jumeau",
      body: "Arriver sur le point de la même couleur ferme le tuyau. Il compte alors pour un seul coup, qu'il fasse trois cases ou onze.",
    },
    {
      title: "Se tromper sans rien casser",
      body: "Repartir du point d'une couleur efface son tuyau. Traverser le tuyau d'une autre couleur le coupe à l'endroit du choc au lieu de refuser le passage.",
    },
    {
      title: "Remplir la dernière case",
      body: "Toutes les paires reliées et toutes les cases occupées, dans cet ordre ou dans l'autre. Une seule case vide suffit à laisser la grille ouverte.",
    },
  ],

  tips: [
    {
      title: "Commencez par les coins",
      body: "Un coin n'a que deux voisines. Le tuyau qui y passe est donc obligé d'y tourner, ce qui vous offre deux cases de trajet sans avoir rien deviné.",
    },
    {
      title: "Les cases vides sont l'indice",
      body: "Quand tout est relié et qu'il reste un trou, ce trou désigne le coupable. La couleur qui le longe est presque toujours celle qui est passée trop droit.",
    },
    {
      title: "Le plus court chemin est un piège",
      body: "Relier chaque paire par sa route la plus courte enferme une couleur sans issue sur 29,5 % des grilles difficiles. Quand un trajet a le choix, prenez celui qui avale une case que personne d'autre n'atteint.",
    },
    {
      title: "N'ayez pas peur de couper",
      body: "Passer à travers un autre tuyau ne bloque rien, cela le raccourcit. Traverser puis refaire l'autre couleur va souvent plus vite que de chercher l'ordre parfait.",
    },
    {
      title: "Une couleur vaut un quart",
      body: "Le plus long tuyau d'une grille difficile mesure 11,2 cases en moyenne, soit 22,8 % du plateau. Trouver celui-là en premier décide du reste.",
    },
  ],

  teaches: [
    {
      title: "Couvrir un espace",
      body: "Remplir une surface sans laisser de trou et sans repasser deux fois est une idée de géométrie que ce jeu fait toucher du doigt bien avant qu'on sache la nommer.",
    },
    {
      title: "Prévoir un trajet",
      body: "Un tuyau se décide avant d'être tracé. Au bout de quelques grilles, on regarde où il faudra bien passer plutôt que la ligne droite qui saute aux yeux.",
    },
    {
      title: "Se corriger sans peine",
      body: "Aucune erreur n'est définitive ici. On repart du point, le tuyau disparaît, et essayer coûte donc exactement zéro.",
    },
    {
      title: "Compter pour de vrai",
      body: "Savoir qu'il reste quatre cases à couvrir et que le tuyau en cours en occupe déjà six est un calcul, et il sert dans la seconde.",
    },
  ],

  ages: [
    {
      title: "5 à 6 ans",
      body: "La grille 5x5 et ses 4 paires. Les trajets y font 6,3 cases en moyenne, ce qui tient dans une tête de cet âge.",
    },
    {
      title: "7 à 9 ans",
      body: "La grille 6x6. Cinq couleurs, et le moment où l'on comprend que la case vide au fond compte autant que la paire évidente.",
    },
    {
      title: "10 ans et plus",
      body: "Le 7x7 et ses 6 paires. Un tuyau peut y courir sur onze cases, et l'ordre dans lequel on les pose commence à peser.",
    },
    {
      title: "Adultes",
      body: "Une grille difficile en 6 coups, c'est-à-dire un seul trajet par couleur et aucun repentir. C'est plus rare que cela n'en a l'air.",
    },
  ],

  accessibility:
    "Chaque case est un vrai bouton, annoncé par sa ligne et sa colonne, et l'appui suffit à tout faire. Le glissement du doigt est un raccourci et jamais une obligation, ce qui compte pour une petite main comme pour un pointeur alternatif. La touche Entrée et la barre d'espace posent le tuyau aussi bien qu'un doigt, donc la partie se joue entièrement au clavier. Rien n'est chronométré, aucune horloge ne tourne, et une grille laissée de côté reste exactement comme vous l'avez quittée. Un geste refusé répond par une petite secousse plutôt que par un son d'erreur. Les huit couleurs sont réparties en clarté autant qu'en teinte, si bien que deux tuyaux confondus par un joueur daltonien restent un pâle et un foncé.",

  together: [
    {
      title: "Une couleur chacun",
      body: "À tour de rôle, une couleur par personne. On découvre vite que le trajet de l'autre passait là où vous comptiez aller.",
    },
    {
      title: "Annoncer avant de tracer",
      body: "Dire à voix haute par où le tuyau va passer, puis le tracer. Un enfant qui sait répondre joue vraiment au jeu au lieu de suivre son doigt.",
    },
    {
      title: "La chasse au trou",
      body: "Reliez tout n'importe comment, puis cherchez ensemble les cases restées vides. Sur la grande grille elles sont près de quatre sur dix, et elles racontent l'erreur.",
    },
    {
      title: "Le pari du plus long",
      body: "Avant de commencer, chacun devine quelle couleur aura le plus long tuyau. C'est une question de lecture de grille, et elle se vérifie à la fin.",
    },
  ],

  faq: [
    {
      q: "Toutes les grilles ont-elles une solution ?",
      a: "Oui, et elle est construite plutôt que vérifiée. Le jeu découpe un chemin qui avait déjà visité chaque case, donc les morceaux couvrent la grille et ne se croisent jamais.",
    },
    {
      q: "Pourquoi la grille refuse-t-elle de se terminer alors que tout est relié ?",
      a: "Parce qu'il reste une case vide. Relier les paires par le plus court chemin ne recouvre que 61,2 % du plateau difficile, et la grille attend celles que personne n'a touchées.",
    },
    {
      q: "Que se passe-t-il si je traverse un autre tuyau ?",
      a: "Il est coupé à l'endroit du choc et vous passez. Rien n'est bloqué, c'est l'autre couleur qui devra être refaite.",
    },
    {
      q: "Faut-il glisser le doigt ?",
      a: "Non. Appuyer case par case fait exactement la même chose, au clavier également, et un tuyau de onze cases compte pour un coup dans les deux cas.",
    },
    {
      q: "Combien de coups pour une bonne partie ?",
      a: "Autant que de paires, soit 4, 5 ou 6 selon la grille. Chaque tuyau refait au-delà de ce compte est un repentir.",
    },
    {
      q: "Le jeu est-il gratuit ?",
      a: "Entièrement. Aucun paiement, aucune publicité, aucune inscription.",
    },
    {
      q: "Marche-t-il sans connexion ?",
      a: "Oui, après la première visite. La partie en cours est aussi retrouvée si vous fermez l'onglet.",
    },
    {
      q: "Comment le record est-il compté ?",
      a: "En coups, le plus petit gagne, et séparément pour chaque grille. Onze tuyaux sur un 5x5 et onze sur un 7x7 ne valent pas la même chose.",
    },
  ],

  keywords: [
    "jeu de tuyaux",
    "relier les points",
    "puzzle de couleurs gratuit",
    "jeu de logique en ligne",
    "casse-tete grille",
    "flow en francais",
  ],
};
