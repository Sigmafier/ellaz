import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr 2048`. STAGED. */
export const n2048Fr: GameCopy = {
  name: "2048",
  metaTitle: "2048 gratuit en ligne, 3 grilles | Ellaz",
  metaDescription:
    "Le 2048 dans le navigateur, en 3x3, 4x4 ou 5x5. Gratuit, sans compte, sans publicité, et il marche hors ligne après la première visite.",

  lede: "Faites glisser, additionnez, recommencez. Trois grilles, trois objectifs, et une case 2048 qui demande 1 024 apparitions pour exister.",

  body: [
    "Deux cases identiques qui se rencontrent n'en font plus qu'une, qui vaut le double. C'est toute la règle, et elle s'explique sans un mot: un enfant regarde une partie pendant dix secondes et sait jouer. Ce qui prend des heures, c'est de jouer bien, parce que chaque coup déplace la grille entière et pas seulement la case que vous visiez.",
    "Trois grilles, et elles ne sont pas trois difficultés du même jeu. Le 5x5 vise 256 et laisse de la place: un joueur qui pousse au hasard atteint l'objectif dans 94% des parties. Le 4x4 vise 2048. Le 3x3 vise 512 sur neuf cases, ce qui veut dire qu'une seule mauvaise poussée peut fermer la grille. Sur ces deux dernières, le hasard n'arrive jamais au but, jamais une seule fois sur 1 500 parties simulées par grille.",
    "Nous avons mesuré ce que vaut la stratégie la plus connue, celle qui consiste à garder sa plus grosse case dans un angle et à ne jamais l'en sortir. La meilleure case atteinte passe de 105 à 198 sur le 4x4, de 517 à 714 sur le 5x5, de 28 à 46 sur le 3x3. Presque le double partout. Et cela reste très loin de 2048, ce qui donne une idée honnête de la distance entre pousser dans une direction et jouer.",
    "Une partie dure ce que la grille permet: 509 coups sur le 5x5, 116 sur le 4x4, 30 sur le 3x3, en moyenne et sans réfléchir. Le 3x3 se finit donc pendant qu'on attend le bus.",
    "La limite, elle est réelle. Le 2048 est un jeu qui se termine par une défaite dans la quasi-totalité des parties, y compris les bonnes, et certains enfants le vivent mal. Il n'y a rien à débloquer et rien à rattraper: la grille se remplit, et c'est fini. Si c'est un problème chez vous, les jeux pour enfants du catalogue se finissent tous par une réussite.",
  ],

  howToPlay: [
    {
      title: "Pousser la grille",
      body: "Faites glisser le doigt dans une direction, ou utilisez les flèches. Toutes les cases partent de ce côté en même temps, pas seulement celle que vous regardiez.",
    },
    {
      title: "Additionner",
      body: "Deux cases de même valeur qui se touchent après la poussée fusionnent et doublent. Une case ne fusionne qu'une fois par coup.",
    },
    {
      title: "Atteindre l'objectif",
      body: "256 sur la grande grille, 2048 sur la classique, 512 sur la petite. La partie continue ensuite si vous voulez pousser le score plus loin.",
    },
  ],

  tips: [
    {
      title: "Choisissez un angle et n'en bougez plus",
      body: "Décidez que votre plus grosse case vit en bas à gauche, et n'utilisez plus jamais la flèche du haut. C'est la seule habitude qui double vos résultats, et c'est mesuré.",
    },
    {
      title: "Poussez dans deux directions, pas quatre",
      body: "Alterner bas et gauche garde la grille rangée. Dès qu'on ajoute une troisième direction, la grosse case remonte et la partie devient impossible à retenir.",
    },
    {
      title: "La grande grille n'est pas plus facile, elle est plus lente",
      body: "Elle pardonne davantage parce qu'il reste toujours une case libre, mais une partie y dure quatre fois plus longtemps. C'est un choix de durée autant que de difficulté.",
    },
  ],

  teaches: [
    {
      title: "Penser un coup en avance",
      body: "La question n'est jamais ce que fait cette poussée, mais dans quel état elle laisse la grille. C'est le premier vrai raisonnement de planification qu'un enfant rencontre dans un jeu.",
    },
    {
      title: "Les puissances de deux",
      body: "2, 4, 8, 16, et ainsi de suite jusqu'en haut. Personne n'explique rien, et au bout de vingt parties la suite est apprise pour de bon.",
    },
    {
      title: "Le renoncement",
      body: "Une poussée qui range la grille sans rien fusionner est souvent le meilleur coup de la partie. Accepter de ne pas marquer maintenant pour marquer plus tard est une idée difficile, et elle se comprend ici en jouant.",
    },
  ],

  ages: [
    {
      title: "5 à 8 ans",
      body: "La grille de 5x5 avec l'objectif à 256. Elle laisse de la place, elle pardonne les erreurs, et elle se finit vraiment.",
    },
    {
      title: "Ados et adultes",
      body: "La grille classique pour une vraie partie, la petite quand vous avez trois minutes et l'envie de perdre vite.",
    },
    {
      title: "Adultes",
      body: "La grille de 3x3, où 30 coups suffisent à finir une partie et où chaque poussée compte vraiment.",
    },
  ],

  accessibility:
    "La grille se dirige au glissement de doigt ou aux flèches du clavier, et les deux sont équivalentes. Rien n'est chronométré, donc vous pouvez regarder l'écran aussi longtemps qu'il faut avant chaque coup. Les cases portent des chiffres et pas seulement des couleurs, et la grille garde la même orientation quelle que soit la langue de l'interface, pour que la flèche de droite envoie bien les cases à droite.",

  together: [
    {
      title: "Un coup chacun",
      body: "Chacun pousse à son tour sur la même grille, sans se conseiller. Le score final appartient aux deux, et la discussion sur qui a tout gâché fait partie du jeu.",
    },
    {
      title: "Le pari sur la case",
      body: "Avant de commencer, chacun annonce la meilleure case qu'il pense atteindre. C'est plus intéressant que le score, parce que tout le monde comprend ce que vaut une case 256.",
    },
    {
      title: "Le tournoi sur la petite grille",
      body: "Trois parties chacun sur le 3x3, on garde la meilleure. Une partie dure une minute, donc le tournoi entier tient dans une pause.",
    },
  ],

  faq: [
    {
      q: "Le 2048 est-il gratuit ?",
      a: "Oui, les trois grilles, sans limite de parties, sans publicité et sans version payante.",
    },
    {
      q: "Combien de cases faut-il pour faire un 2048 ?",
      a: "Il faut 1 024 apparitions de cases pour construire une seule case 2048, en supposant que rien ne soit gâché en route.",
    },
    {
      q: "La stratégie de l'angle marche-t-elle vraiment ?",
      a: "Oui, et l'écart est mesurable. La meilleure case moyenne passe de 105 à 198 sur la grille classique quand on garde la plus grosse case dans un angle.",
    },
    {
      q: "Faut-il un compte pour garder son score ?",
      a: "Non. Le record est écrit sur l'appareil, sans compte et sans adresse e-mail.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Aucune connexion n'est nécessaire pour jouer une partie.",
    },
    {
      q: "Quelle grille pour un enfant ?",
      a: "La grande, en 5x5, avec l'objectif à 256. Un joueur qui pousse au hasard y arrive dans 94% des parties, donc un enfant de cinq ans la termine.",
    },
  ],

  keywords: [
    "2048 gratuit",
    "jeu 2048 en ligne",
    "jeu de chiffres",
    "puzzle de nombres",
    "2048 sans téléchargement",
    "jeu de réflexion",
  ],
};
