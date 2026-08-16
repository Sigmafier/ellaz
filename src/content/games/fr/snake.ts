import type { GameCopy } from "../../types";

/**
 * Pilote #3 en francais - le classique, et celui dont le record est en points.
 *
 * Ecrit a partir de `node scripts/brief.mjs fr snake`. Les chiffres viennent de
 * `scripts/sim/snake-speed.mjs`, qui les derive des constantes de la scene.
 *
 * STAGED: pas encore branche sur `snake.ts`.
 */
export const snakeFr: GameCopy = {
  name: "Serpent",
  metaTitle: "Jeu du serpent gratuit en ligne | Ellaz",
  metaDescription:
    "Le serpent classique, gratuit dans le navigateur, sur une grille de 17x17. Trois vitesses de départ, sans compte et hors ligne.",

  lede: "Mangez, allongez-vous, ne vous touchez pas. Une grille de 17 sur 17, trois vitesses de départ, et aucune fin prévue.",

  body: [
    "Le serpent avance tout seul et ne s'arrête jamais. Vous choisissez seulement où il tourne, en glissant le doigt ou avec une flèche. Chaque pomme le rallonge d'une case. Au bout d'un moment, le seul adversaire est son propre corps.",
    "La grille fait 17 sur 17, donc 289 cases. Le score maximum est 286, ce qui suppose de remplir le plateau presque entièrement sans jamais se croiser. Personne n'y arrive. C'est bien la question.",
    "Les trois vitesses ne changent pas la fin de la partie, elles changent sa longueur. Toutes convergent vers le même pas de 60 millisecondes : après 20 pommes en rapide, 45 en normale, 70 en lente. Au départ, traverser le plateau prend 2,9 secondes en lente et 1,5 en rapide ; à pleine vitesse, il faut 1 seconde pour tout le monde. Choisir « lente » ne rend donc pas le jeu facile. Ça vous donne plus de temps avant qu'il cesse de l'être.",
    "Une pièce d'or tombe toutes les 5 pommes, sans confettis et sans interruption : le serpent continue d'avancer pendant, parce qu'une célébration au milieu d'une partie de serpent est une façon de mourir. Le record se vérifie une seule fois, à la mort.",
    "Il faut le dire. Ce jeu ne pardonne rien. Une erreur d'un dixième de seconde termine une partie de quatre minutes, et il n'y a ni vie supplémentaire ni retour en arrière. C'est le principe du serpent depuis toujours, et c'est aussi la raison pour laquelle il ne convient pas à tous les enfants.",
  ],

  howToPlay: [
    {
      title: "Tourner",
      body: "Glissez le doigt dans une direction, ou utilisez les flèches du clavier. Le serpent tourne au pas suivant ; il n'accélère pas et ne s'arrête pas.",
    },
    {
      title: "Manger",
      body: "Chaque pomme rallonge le serpent d'une case et ajoute un point. Une nouvelle pomme apparaît aussitôt ailleurs sur la grille.",
    },
    {
      title: "Éviter le mur et soi-même",
      body: "La partie se termine au contact d'un bord ou de son propre corps. Le score final s'affiche, et s'il dépasse votre record il devient le nouveau.",
    },
  ],

  tips: [
    {
      title: "Longez les bords au début",
      body: "Tant que le serpent est court, tourner près d'un bord coûte peu et laisse tout le centre libre. Les joueurs qui commencent au milieu s'enferment beaucoup plus tôt qu'ils ne le pensent.",
    },
    {
      title: "Laissez-vous un couloir",
      body: "Quand le corps s'allonge, ce qui compte n'est plus la pomme mais la sortie. Avant de vous engager dans un espace, regardez par où vous en ressortirez.",
    },
    {
      title: "La vitesse lente n'est pas un abri",
      body: "Elle repousse le moment où le pas descend à 60 millisecondes, elle ne l'annule pas. Après 70 pommes, la partie est exactement aussi rapide que les autres.",
    },
  ],

  teaches: [
    {
      title: "Anticiper au lieu de réagir",
      body: "Le serpent punit la réaction et récompense le plan. Au bout de quelques parties on cesse de regarder la pomme pour regarder l'espace, et c'est un vrai changement de façon de jouer.",
    },
    {
      title: "Le calme sous contrainte",
      body: "Le rythme monte, le corps s'allonge, et la seule chose qui aide est de ralentir la tête pendant que le jeu accélère. C'est plus facile à dire qu'à faire, et ça s'apprend.",
    },
    {
      title: "Accepter la fin",
      body: "Toute partie finit par une défaite, y compris les bonnes. Apprendre qu'un score de 40 est une réussite même s'il se termine mal vaut plus que le score.",
    },
  ],

  ages: [
    {
      title: "6 ans et plus",
      body: "Il faut savoir viser une direction avant d'en avoir besoin. En dessous, la partie se termine trop vite pour être agréable.",
    },
    {
      title: "Ados et adultes",
      body: "La vitesse rapide dès le départ, pour aller vite à l'endroit intéressant. C'est le mode où le score devient une affaire de place, pas de réflexes.",
    },
    {
      title: "8 à 11 ans",
      body: "La vitesse lente, qui laisse 2,9 secondes pour traverser le plateau au départ. C'est le seul réglage où une partie dure assez longtemps pour apprendre quelque chose.",
    },
  ],

  accessibility:
    "Le serpent se dirige au glissement de doigt ou aux flèches, et les deux marchent aussi bien. Les cibles sont grandes et il n'y a rien à viser précisément. En revanche c'est un jeu qui demande de la vitesse, donc il est le moins adapté du site à qui joue avec une aide à la saisie ; les autres jeux du catalogue se finissent tous sans contrainte de temps.",

  together: [
    {
      title: "Le meilleur des trois",
      body: "Chacun sa partie, on additionne, on compare. Le record par appareil rend la chose naturelle : il n'y a rien à configurer, juste une partie chacun.",
    },
    {
      title: "Le copilote",
      body: "Un joueur dirige, l'autre annonce le danger à voix haute. On se rend vite compte que le copilote voit mieux, ce qui est exactement l'idée.",
    },
    {
      title: "Le relais",
      body: "Chacun joue jusqu'à sa première erreur de trajectoire, puis passe l'appareil. La partie dure plus longtemps et personne ne joue seul.",
    },
  ],

  faq: [
    {
      q: "Le jeu du serpent est-il gratuit ?",
      a: "Oui, entièrement. Sans publicité, sans version payante et sans achat pour aller plus loin.",
    },
    {
      q: "Quel est le score maximum ?",
      a: "286. La grille fait 17 sur 17, soit 289 cases, et il faudrait la remplir presque entièrement sans jamais se croiser.",
    },
    {
      q: "Les trois vitesses changent-elles la difficulté ?",
      a: "Elles changent la durée, pas la fin. Toutes atteignent le même pas de 60 millisecondes, après 20, 45 ou 70 pommes selon celle que vous choisissez.",
    },
    {
      q: "Faut-il un compte pour garder son score ?",
      a: "Non. Le record est écrit sur l'appareil, sans compte, et il n'est envoyé nulle part.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Le jeu reste jouable dans le navigateur sans aucune connexion.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Six ans environ. Le serpent ne pardonne pas une erreur, ce qui frustre les plus jeunes ; les jeux pour enfants du site sont plus indulgents.",
    },
  ],

  keywords: [
    "jeu du serpent",
    "snake gratuit",
    "serpent en ligne",
    "jeu classique",
    "jeu rétro",
    "jeu sans téléchargement",
  ],
};
