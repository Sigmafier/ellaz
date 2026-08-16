import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr wordguess`. STAGED. */
export const wordguessFr: GameCopy = {
  name: "Devine le mot",
  metaTitle: "Jeu de mots à deviner, gratuit | Ellaz",
  metaDescription:
    "Devinez le mot caché en 4, 5 ou 6 lettres, avec des indices de couleur à chaque essai. Gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Un mot caché, des essais, et une couleur par lettre qui dit ce qui est juste. Le premier mot que vous tapez décide de la moitié de la partie.",

  body: [
    "Vous proposez un mot de la bonne longueur. Chaque lettre se colore. Bien placée, présente ailleurs, ou absente. Vous recommencez avec ce que vous venez d'apprendre, et ainsi de suite jusqu'à trouver.",
    "La partie se joue dans la langue de l'interface, avec sa propre liste de mots. La liste anglaise de 4 lettres en compte 53, celle de 5 lettres 47, celle de 6 lettres 37. Ce sont des listes courtes et choisies, pas un dictionnaire : nous préférons 53 mots qu'un enfant connaît à 4 000 mots dont il n'a jamais entendu parler.",
    "Le premier essai vaut beaucoup plus que les suivants, et nous l'avons mesuré sur chaque liste. En anglais, commencer par road ramène les 53 mots possibles à 4,81 en moyenne. Commencer par plum en laisse 20,36, soit quatre fois plus de travail derrière. Sur les mots de six lettres, planet laisse 1,27 possibilité et banana en laisse 7. La différence tient entièrement au fait qu'un bon mot de départ contient des lettres fréquentes et ne répète aucune lettre.",
    "En espagnol, sapo réduit une liste de 65 mots à 4,82, là où kiwi en laisse 44,29. Presque dix fois pire. Même longueur, pourtant.",
    "L'aveu : ce jeu demande de savoir lire et écrire, ce qui en fait le moins accessible du catalogue. Un enfant qui commence tout juste à lire y passera plus de temps à chercher les lettres du clavier qu'à réfléchir, et l'expérience sera pénible. Les jeux de lettres pour les petits, sur ce site, se jouent en appuyant sur des images.",
  ],

  howToPlay: [
    {
      title: "Proposer un mot",
      body: "Saisissez un mot de la bonne longueur et validez. Le mot doit exister dans la liste de la langue en cours.",
    },
    {
      title: "Lire les couleurs",
      body: "Chaque lettre reçoit une couleur : bien placée, présente mais ailleurs, ou absente du mot. Les indices se cumulent d'un essai à l'autre.",
    },
    {
      title: "Recommencer avec ce que vous savez",
      body: "Chaque nouvel essai doit tenir compte de tout ce que les précédents ont révélé. Un essai qui ignore un indice est un essai gâché.",
    },
  ],

  tips: [
    {
      title: "Un bon premier mot, toujours le même",
      body: "Choisissez un mot de départ riche en lettres fréquentes et sans lettre répétée, et gardez-le pour toutes vos parties. En anglais, road laisse 4,81 possibilités là où plum en laisse 20,36.",
    },
    {
      title: "Le deuxième essai sert encore à chercher",
      body: "Si le premier n'a presque rien donné, ne tentez pas de gagner tout de suite. Un deuxième mot qui teste quatre lettres neuves en apprend plus qu'un mot qui reprend les mêmes.",
    },
    {
      title: "Écrivez ce qui est éliminé",
      body: "Sur une longue partie, la mémoire lâche avant la logique. Regarder le clavier grisé après chaque essai évite de reproposer une lettre déjà éliminée, ce qui est l'erreur la plus fréquente.",
    },
  ],

  teaches: [
    {
      title: "Le raisonnement par indices",
      body: "Chaque essai est une expérience dont le résultat contraint la réponse. C'est la démarche scientifique en miniature, dans un jeu qui dure quatre minutes.",
    },
    {
      title: "L'orthographe sans exercice",
      body: "Chercher des mots qui rentrent dans une contrainte oblige à parcourir son vocabulaire dans un ordre inhabituel. C'est un travail de mémoire lexicale que peu d'exercices scolaires provoquent aussi bien.",
    },
    {
      title: "Éliminer méthodiquement",
      body: "Chaque essai réduit l'ensemble des mots possibles, et un bon essai le réduit beaucoup plus qu'un autre. C'est de la théorie de l'information, jouée sans le mot.",
    },
  ],

  ages: [
    {
      title: "8 ans et plus",
      body: "Les mots de 4 lettres, une fois la lecture bien installée. En dessous, la saisie au clavier prend toute l'attention.",
    },
    {
      title: "Ados et adultes",
      body: "Les mots de 6 lettres, où le choix du premier essai fait la différence entre 1,27 et 7 possibilités restantes.",
    },
    {
      title: "Adultes",
      body: "Les mots de 6 lettres, où le premier essai décide de la partie : 1,27 possibilité restante contre 7 selon le mot choisi.",
    },
  ],

  accessibility:
    "Le jeu se joue au clavier tactile ou physique, ce qui en fait le plus exigeant du site pour qui a des difficultés de saisie. Rien n'est chronométré, donc le temps de réflexion n'entre pas en compte. Les indices ne reposent pas uniquement sur la couleur : chaque lettre porte aussi une marque de forme, pour qu'un joueur daltonien distingue bien placé de présent ailleurs.",

  together: [
    {
      title: "Le mot d'ouverture partagé",
      body: "Chacun propose son premier essai, on compare le nombre d'indices obtenus. C'est la meilleure façon de comprendre pourquoi tous les mots de départ ne se valent pas.",
    },
    {
      title: "Un essai chacun",
      body: "Deux joueurs alternent sur la même grille, sans se concerter. On voit très vite qui écoute les indices de l'autre.",
    },
    {
      title: "Le mot commun",
      body: "Deux joueurs, une grille, chacun propose un essai à son tour. On voit tout de suite qui tient compte des indices de l'autre.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de mots est-il gratuit ?",
      a: "Oui, toutes les longueurs, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de mots contiennent les listes ?",
      a: "En anglais, 53 mots de 4 lettres, 47 de 5 et 37 de 6. En espagnol, 65, 55 et 46. Les listes sont courtes et choisies volontairement.",
    },
    {
      q: "Quel est le meilleur premier mot ?",
      a: "Un mot riche en lettres fréquentes et sans répétition. En anglais, road ramène 53 possibilités à 4,81, contre 20,36 pour plum.",
    },
    {
      q: "Dans quelle langue se joue la partie ?",
      a: "Dans la langue de l'interface, avec sa propre liste de mots. Changer de langue change la liste.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Huit ans environ, car il faut lire et saisir au clavier. Les jeux de lettres pour les plus jeunes se jouent en appuyant sur des images.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les listes de mots sont sur l'appareil.",
    },
  ],

  keywords: [
    "jeu de mots à deviner",
    "mot caché",
    "jeu de lettres gratuit",
    "jeu de vocabulaire",
    "devinette de mots",
    "jeu de mots en ligne",
  ],
};
