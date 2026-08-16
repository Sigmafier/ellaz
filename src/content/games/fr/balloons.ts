import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr balloons`. STAGED. */
export const balloonsFr: GameCopy = {
  name: "Les ballons",
  metaTitle: "Jeu de ballons à éclater pour enfants | Ellaz",
  metaDescription:
    "Éclatez la bonne couleur, 5 formes distinctes, de 2,4 à 4,2 secondes par ballon. Jeu gratuit pour enfants, sans compte et hors ligne.",

  lede: "Une couleur demandée, des ballons qui montent. Éclatez les bons. Le ballon attendu arrive toujours, garanti.",

  body: [
    "Des ballons traversent l'écran. La consigne montre lequel viser. On appuie dessus, il éclate.",
    "Le temps qu'un ballon passe à l'écran est le seul réglage de difficulté : 4,2 secondes en facile, 3,2 en moyen, 2,4 en difficile. C'est long, et c'est délibéré. Un enfant de trois ans a besoin de voir la couleur, de la comparer à la consigne, de décider, puis de viser, et cette chaîne prend bien plus de temps qu'un adulte ne l'imagine. Un jeu de rapidité pour les petits qui va trop vite ne devient pas plus difficile, il devient impossible, et l'enfant arrête.",
    "Il y a une garantie dans le code qui mérite d'être connue : après 2 ballons qui ne sont pas la couleur demandée, le suivant l'est forcément. Un enfant ne peut donc jamais attendre longtemps sans occasion de réussir, même quand le tirage est malchanceux.",
    "Les 5 couleurs portent chacune une forme différente, donc un enfant daltonien joue sans dépendre de la teinte. Les tours demandent 5, 7 ou 9 ballons selon le niveau.",
    "L'aveu : éclater des ballons n'apprend rien de scolaire. Ce jeu travaille la vitesse de réaction et la précision du geste, ce qui est utile à trois ans, et rien d'autre. Si vous cherchez un jeu qui fait progresser en lecture ou en calcul, il y en a sur ce site, et celui-ci n'en fait pas partie.",
  ],

  howToPlay: [
    {
      title: "Regarder la consigne",
      body: "Le ballon à viser s'affiche en haut de l'écran et y reste pendant tout le tour.",
    },
    {
      title: "Éclater les bons",
      body: "Appuyez sur les ballons de la couleur demandée pendant qu'ils traversent l'écran.",
    },
    {
      title: "Finir le tour",
      body: "5, 7 ou 9 ballons selon le niveau. Le tour suivant demande une autre couleur.",
    },
  ],

  tips: [
    {
      title: "Visez le milieu de l'écran",
      body: "Un ballon en bas vient d'arriver et repartira dans quelques secondes. Attendre qu'il soit au centre laisse le temps de vérifier la couleur sans rien perdre.",
    },
    {
      title: "Répétez la consigne à voix haute",
      body: "Rouge. Rouge. Dire la couleur pendant le tour évite l'erreur la plus fréquente, qui est d'oublier ce qu'on cherchait et d'appuyer sur le premier ballon venu.",
    },
    {
      title: "Restez en facile plus longtemps",
      body: "Les 4,2 secondes du niveau facile ne sont pas de trop pour un enfant de trois ans. Montez seulement quand plus rien n'est raté, pas quand ça devient ennuyeux pour l'adulte à côté.",
    },
  ],

  teaches: [
    {
      title: "La coordination oeil et main",
      body: "Viser une cible mobile avec un doigt est un geste précis qui s'apprend, et cet âge est exactement celui où il s'installe. Un écran est un mauvais terrain pour beaucoup de choses, et un très bon pour celle-là.",
    },
    {
      title: "Tenir une consigne en tête",
      body: "Garder une couleur en mémoire pendant que 5 autres passent devant les yeux est un vrai exercice d'inhibition. C'est ce qui rend le jeu plus difficile qu'il en a l'air.",
    },
    {
      title: "Suivre une cible des yeux",
      body: "Accompagner un ballon du regard pendant qu'il traverse l'écran entraîne les yeux à suivre une cible. Ils s'en serviront ensuite pour suivre une ligne de texte.",
    },
  ],

  ages: [
    {
      title: "2 à 4 ans",
      body: "Le niveau facile, avec 4,2 secondes par ballon et 5 par tour. Rien à lire, rien à comprendre.",
    },
    {
      title: "5 ans et plus",
      body: "Le difficile, à 2,4 secondes et 9 ballons. Il devient un vrai jeu de rapidité.",
    },
    {
      title: "Adultes",
      body: "Rien à gagner ici, sauf annoncer les couleurs à voix haute pendant qu'un petit joue. C'est le rôle qui fait la différence sur ce jeu.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser, sur des cibles larges. Les 5 couleurs portent chacune une forme distincte, donc rien ne dépend uniquement de la teinte. Le niveau facile laisse 4,2 secondes par ballon, ce qui reste jouable avec une aide à la saisie. Un ballon raté ne coûte rien : aucun son désagréable, aucune perte de points.",

  together: [
    {
      title: "L'annonceur",
      body: "Un adulte annonce la couleur à voix haute à chaque fois qu'un bon ballon apparaît. L'enfant appuie, et le taux de réussite change du tout au tout.",
    },
    {
      title: "Chacun sa couleur",
      body: "Deux enfants, un appareil, chacun surveille une moitié de l'écran. C'est plus rapide, plus bruyant, et personne n'attend son tour.",
    },
    {
      title: "Le décompte inversé",
      body: "Un adulte compte les ballons restants à voix haute. L'enfant entend le tour se rapprocher de sa fin, ce qui l'aide à tenir jusqu'au bout.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de ballons est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps dure un ballon à l'écran ?",
      a: "4,2 secondes en facile, 3,2 en moyen et 2,4 en difficile.",
    },
    {
      q: "Le bon ballon peut-il ne jamais venir ?",
      a: "Non. Après 2 ballons qui ne sont pas la couleur demandée, le suivant l'est avec certitude.",
    },
    {
      q: "Convient-il à un enfant daltonien ?",
      a: "Oui. Chacune des 5 couleurs porte une forme distincte, donc rien ne repose sur la teinte seule.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Deux ans pour le niveau facile. Il n'y a rien à lire et une erreur ne fait rien perdre.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de ballons",
    "éclater des ballons",
    "jeu pour tout-petits",
    "jeu de couleurs enfant",
    "jeu de rapidité maternelle",
    "jeu gratuit 3 ans",
  ],
};
