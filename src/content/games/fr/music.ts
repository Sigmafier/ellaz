import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr music`. STAGED. */
export const musicFr: GameCopy = {
  name: "Petite musique",
  metaTitle: "Jeu de musique à composer pour enfants | Ellaz",
  metaDescription:
    "Composez une mélodie sur une grille de 6 notes et 4 à 8 temps. Aucune note ne sonne faux. Gratuit, sans compte et jouable hors ligne.",

  lede: "Une grille, 6 notes, jusqu'à 8 temps. Appuyez où vous voulez: aucune combinaison ne sonne faux, et il y en a 281 474 976 710 656.",

  body: [
    "Chaque case allumée sur la grille joue une note à son temps. On appuie. On écoute. On change d'avis. Il n'y a rien à réussir.",
    "Le choix des 6 notes est la seule décision technique de ce jeu et c'est celle qui fait tout. Sur les 15 paires possibles, aucune n'est séparée d'un demi-ton et aucune n'est un triton, les deux intervalles qui grincent. Les deux notes les plus proches sont à un ton l'une de l'autre. Résultat: un enfant qui allume les 48 cases d'un coup entend un accord dense et agréable, et non un bruit. C'est ce qui autorise l'écran à ne jamais dire non.",
    "Une grille de 8 temps a 48 cases, donc 281 474 976 710 656 mélodies différentes. Le bouton surprise, lui, ne va pas si loin: il compose 1 679 616 mélodies possibles sur la grille longue et 1 296 sur la courte, parce qu'il pose une note par temps plutôt que d'allumer les cases au hasard.",
    "Raccourcir une mélodie de 8 temps à 4 en garde environ la moitié des notes, et rallonger reprend celles qui existaient. La grille ne redistribue jamais rien: ce que vous avez écrit reste écrit.",
    "L'aveu: ce n'est pas un jeu, c'est un jouet. Il n'y a pas d'objectif, pas de progression et le record se contente de compter les notes posées, avec 48 comme maximum possible. Un enfant qui cherche un défi s'ennuiera en trois minutes. Un enfant qui aime fabriquer y passera une heure, et les deux réactions sont normales.",
  ],

  howToPlay: [
    {
      title: "Allumer une case",
      body: "Appuyez sur n'importe quelle case de la grille. Elle joue sa note aussitôt, pour que le geste et le son aillent ensemble.",
    },
    {
      title: "Écouter la mélodie",
      body: "Le bouton de lecture parcourt les temps de gauche à droite. Chaque rangée a sa couleur de note.",
    },
    {
      title: "Changer la longueur",
      body: "De 4 à 8 temps. Raccourcir garde les notes qui rentrent encore, rallonger laisse les autres en place.",
    },
  ],

  tips: [
    {
      title: "Commencez par 4 temps",
      body: "Une mélodie courte s'entend en entier et se corrige facilement. La grille de 8 temps est plus impressionnante et beaucoup plus difficile à écouter d'une seule oreille.",
    },
    {
      title: "Une note par temps, au début",
      body: "C'est ce que fait le bouton surprise, et le résultat sonne comme une mélodie plutôt que comme un accord. Empiler les notes vient après.",
    },
    {
      title: "Utilisez les 3 voix",
      body: "La même mélodie change complètement de caractère selon la voix choisie. C'est le réglage le plus amusant du jeu et celui que les enfants trouvent en dernier.",
    },
  ],

  teaches: [
    {
      title: "Le lien entre voir et entendre",
      body: "Une case plus haute sonne plus aigu. Comprendre que la hauteur d'un son se dessine dans l'espace est le fondement de toute notation musicale, et il s'installe ici sans une seule leçon.",
    },
    {
      title: "Fabriquer plutôt que réussir",
      body: "Presque tous les écrans posent une question. Celui-ci propose de faire quelque chose qui n'existait pas, ce qui est une expérience différente et beaucoup plus rare.",
    },
    {
      title: "Écouter ce qu'on vient de faire",
      body: "Poser une note puis relire la mélodie entière oblige à comparer une intention à un résultat. C'est le geste de base de toute création.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "La grille de 4 temps. Rien à lire, aucune erreur possible, et le son arrive au moment du geste.",
    },
    {
      title: "6 ans et plus",
      body: "La grille de 8 temps et ses 48 cases, où l'on commence à écrire de vraies phrases musicales.",
    },
    {
      title: "Adultes",
      body: "Une grille de 8 temps et 3 voix suffit à écrire quelque chose d'écoutable. C'est le jeu le plus calme du site.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser et sans limite de temps. Chaque case est annoncée par son temps et par son état, allumée ou éteinte, ce qui rend la grille utilisable au lecteur d'écran. Les rangées se distinguent par leur couleur et par leur position, donc un enfant daltonien s'y repère par la hauteur. Le jeu produit du son par nature, mais rien n'y est jamais faux.",

  together: [
    {
      title: "Une note chacun",
      body: "Chacun allume une case à son tour, sans se concerter, puis on écoute le résultat. Comme rien ne peut sonner faux, la mélodie commune est toujours écoutable.",
    },
    {
      title: "Rejouer une chanson connue",
      body: "Essayez de retrouver les premières notes d'une comptine sur la grille. C'est plus difficile qu'il n'y paraît, et c'est un excellent exercice d'oreille pour un adulte aussi.",
    },
    {
      title: "Une rangée chacun",
      body: "Chacun ne peut allumer que sa propre rangée de notes. La mélodie devient une conversation, et la contrainte donne de meilleurs résultats que la liberté totale.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de musique est-il gratuit ?",
      a: "Oui, entièrement, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Peut-on faire une mélodie qui sonne faux ?",
      a: "Non. Sur les 15 paires de notes possibles, aucune n'est à un demi-ton ni un triton, donc toutes les combinaisons restent agréables.",
    },
    {
      q: "Combien de mélodies différentes existent ?",
      a: "281 474 976 710 656 sur la grille de 8 temps et ses 48 cases. Le bouton surprise en atteint 1 679 616.",
    },
    {
      q: "Que se passe-t-il si je raccourcis la grille ?",
      a: "Les notes qui rentrent encore sont gardées, environ la moitié en passant de 8 temps à 4. Rien n'est redistribué au hasard.",
    },
    {
      q: "Y a-t-il un score ?",
      a: "Un compteur de notes posées, avec 48 comme maximum. Une grille pleine rapporte 8 pièces d'or.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les sons sont fabriqués sur l'appareil.",
    },
  ],

  keywords: [
    "jeu de musique enfant",
    "composer une mélodie",
    "jeu musical gratuit",
    "grille de notes",
    "éveil musical",
    "jeu créatif en ligne",
  ],
};
