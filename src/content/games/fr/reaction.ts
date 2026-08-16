import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr reaction`. STAGED. */
export const reactionFr: GameCopy = {
  name: "Le temps de réaction",
  metaTitle: "Test de temps de réaction gratuit | Ellaz",
  metaDescription:
    "Attendez le vert, appuyez le plus vite possible. Trois niveaux d'attente imprévisible. Gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Attendez le vert. Appuyez. Le plus court gagne, et l'attente est faite pour qu'on ne puisse pas la deviner.",

  body: [
    "L'écran est rouge. Il devient vert. Vous appuyez. Le temps écoulé s'affiche en millisecondes.",
    "Toute la difficulté tient dans l'attente, et elle est construite exprès pour être imprévisible. Le facile attend entre 1 000 et 2 600 millisecondes, le moyen entre 1 100 et 3 800, le difficile entre 1 200 et 5 000. D'un niveau à l'autre, l'attente moyenne est multipliée par 1,72 seulement, tandis que la largeur de la fourchette est multipliée par 2,38. C'est ce deuxième chiffre qui compte : ce n'est pas d'attendre plus longtemps qui est dur, c'est de ne pas savoir combien de temps.",
    "Nous avons calculé ce que rapporterait la triche la plus évidente, qui consiste à appuyer toujours au même moment sans regarder. Le meilleur instant fixe se trompe de 400 millisecondes en facile, de 675 en moyen et de 951 en difficile. Autrement dit, la stratégie d'anticipation coûte à peu près une seconde entière au niveau le plus dur, ce qui est très largement pire que de simplement regarder l'écran. C'est la seule façon honnête de prouver qu'un test de réaction en est bien un.",
    "Le jeu félicite en dessous de 350, 550 et 900 millisecondes selon le niveau. Au-delà, il ne dit rien : pas de reproche, pas de message. Un temps lent est un temps, pas une faute.",
    "L'aveu : ce jeu mesure quelque chose que l'entraînement ne fait presque pas progresser. Le temps de réaction visuel d'un adulte est ce qu'il est, et gagner 20 millisecondes demande beaucoup de parties pour un gain qui ne sert nulle part. C'est amusant à comparer entre deux personnes, et ce n'est pas un exercice.",
  ],

  howToPlay: [
    {
      title: "Attendre le vert",
      body: "L'écran reste rouge pendant une durée tirée au sort, entre 1 000 et 5 000 millisecondes selon le niveau.",
    },
    {
      title: "Appuyer",
      body: "Dès que l'écran devient vert, appuyez n'importe où. Le temps écoulé s'affiche aussitôt.",
    },
    {
      title: "Recommencer",
      body: "Un appui avant le vert annule la tentative. Le record est le temps le plus court, et le plus court gagne.",
    },
  ],

  tips: [
    {
      title: "Ne regardez pas le centre",
      body: "Un regard légèrement flou sur tout l'écran détecte un changement de couleur plus vite qu'un regard fixé sur un point. C'est une propriété de la vision périphérique, pas une astuce de jeu.",
    },
    {
      title: "N'anticipez pas",
      body: "Le meilleur instant fixe se trompe de 951 millisecondes au niveau difficile. Appuyer au jugé est toujours pire que regarder, et le calcul le prouve.",
    },
    {
      title: "Le doigt déjà posé",
      body: "Gardez le doigt à quelques millimètres de l'écran plutôt qu'à côté de l'appareil. Le trajet du bras coûte plus cher que la réaction elle-même.",
    },
  ],

  teaches: [
    {
      title: "Attendre sans agir",
      body: "Résister à l'envie d'appuyer pendant 5 secondes d'attente rouge est un exercice d'inhibition, et c'est ce que le jeu entraîne vraiment, bien plus que la vitesse.",
    },
    {
      title: "Lire un chiffre qui vous concerne",
      body: "Voir 412 millisecondes affiché après son propre geste rend une mesure concrète. Beaucoup d'enfants rencontrent ici pour la première fois l'idée qu'on peut chiffrer un réflexe.",
    },
    {
      title: "Comparer honnêtement",
      body: "Un seul essai ne prouve rien, cinq essais commencent à dire quelque chose. Comprendre qu'une mesure a besoin d'être répétée est une idée scientifique de base.",
    },
  ],

  ages: [
    {
      title: "5 ans et plus",
      body: "Le facile, qui attend au plus 2,6 secondes. Un enfant plus jeune appuie avant le vert et ne comprend pas pourquoi ça ne compte pas.",
    },
    {
      title: "Ados et adultes",
      body: "Le difficile, où l'attente va jusqu'à 5 secondes et où l'anticipation ne rapporte rien.",
    },
    {
      title: "Adultes",
      body: "Le difficile, avec ses attentes jusqu'à 5 secondes. C'est le seul jeu du site où un adulte perd régulièrement contre un enfant de dix ans.",
    },
  ],

  accessibility:
    "Un seul geste, un appui n'importe où sur l'écran, sans viser et sans glisser. Le changement d'état est signalé par la couleur et par un changement de forme, donc un joueur daltonien le voit aussi bien. Aucun son n'est nécessaire. Ce jeu mesure une vitesse, donc il est par nature peu adapté à qui joue avec une aide à la saisie, et c'est le seul du site dont ce soit le sujet même.",

  together: [
    {
      title: "Le meilleur de cinq",
      body: "Chacun cinq essais, on garde le meilleur de chacun. Cinq essais suffisent à écarter le coup de chance, ce qui rend la comparaison honnête.",
    },
    {
      title: "Enfant contre adulte",
      body: "Le résultat surprend souvent : un enfant de dix ans bat régulièrement un adulte de quarante. C'est vrai, c'est mesurable, et ça fait rire tout le monde.",
    },
    {
      title: "La chaîne",
      body: "Trois personnes, chacune cinq essais, on écrit les temps sur un papier. La liste obtenue à la fin est plus intéressante que n'importe quel classement en ligne.",
    },
  ],

  faq: [
    {
      q: "Ce test de réaction est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps dure l'attente ?",
      a: "Entre 1 000 et 2 600 millisecondes en facile, 1 100 à 3 800 en moyen et 1 200 à 5 000 en difficile.",
    },
    {
      q: "Peut-on tricher en appuyant au bon moment ?",
      a: "Non. Le meilleur instant fixe se trompe de 400 millisecondes en facile et de 951 en difficile, ce qui est bien pire que de regarder.",
    },
    {
      q: "Qu'est-ce qu'un bon temps ?",
      a: "Le jeu félicite en dessous de 350 millisecondes en facile, 550 en moyen et 900 en difficile. Au-delà, il ne dit rien du tout.",
    },
    {
      q: "Peut-on progresser ?",
      a: "Un peu, et pas beaucoup. Le temps de réaction visuel se travaille mal, ce qui fait de ce jeu une comparaison plus qu'un entraînement.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "test de réaction",
    "temps de réaction",
    "jeu de réflexes",
    "mesurer sa vitesse",
    "jeu rapide gratuit",
    "test de réflexes en ligne",
  ],
};
