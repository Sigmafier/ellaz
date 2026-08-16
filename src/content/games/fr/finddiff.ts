import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr finddiff`. STAGED. */
export const finddiffFr: GameCopy = {
  name: "Les différences",
  metaTitle: "Jeu des différences gratuit en ligne | Ellaz",
  metaDescription:
    "Six scènes, cinq différences chacune, trente en tout. Jeu des différences gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Deux images côte à côte, cinq choses qui ne vont pas ensemble. Six scènes, trente différences, et pas de fin.",

  body: [
    "Le principe se passe d'explication et c'est justement pourquoi ce jeu marche à trois ans. Deux dessins presque identiques, l'un à côté de l'autre. Appuyez là où ils diffèrent. Une marque apparaît sur les deux images en même temps, pour que l'enfant voie bien qu'il a raison des deux côtés.",
    "Il y a 6 scènes et 5 différences dans chacune, donc 30 au total. Quand les 6 sont passées, le jeu recommence au début et le compteur de niveau monte d'un cran. Sans fin.",
    "Le record est le nombre de scènes réussies depuis le début, et pas le niveau affiché à l'écran. La différence compte : le niveau ne monte qu'après un tour complet des six scènes, donc si nous enregistrions celui-là, l'immense majorité des joueurs garderait un record de 1 pendant des semaines. Une scène terminée est un vrai progrès, et le compteur doit avancer quand quelque chose avance.",
    "Rien n'est chronométré. Un enfant peut regarder une image pendant 2 minutes sans que rien ne le presse ni ne lui souffle la réponse.",
    "L'honnêteté oblige à dire que six scènes, ce n'est pas beaucoup. Un enfant attentif les connaît par coeur au bout de trois ou quatre passages, et à partir de là le jeu devient un exercice de mémoire plutôt qu'un exercice d'observation. C'est encore utile, mais ce n'est plus le même jeu, et nous préférons l'écrire ici plutôt que de laisser croire à un catalogue sans fond.",
  ],

  howToPlay: [
    {
      title: "Comparer les deux images",
      body: "Regardez les deux dessins côte à côte. Ils sont identiques, sauf à cinq endroits.",
    },
    {
      title: "Appuyer sur la différence",
      body: "Appuyez à l'endroit qui change, sur l'une ou l'autre image. Les deux se marquent en même temps.",
    },
    {
      title: "Passer à la scène suivante",
      body: "Quand les cinq différences sont trouvées, la scène suivante arrive toute seule. Après la sixième, le jeu repart au début avec un niveau de plus.",
    },
  ],

  tips: [
    {
      title: "Balayez par bandes",
      body: "Regardez le haut des deux images, puis le milieu, puis le bas. C'est beaucoup plus efficace que de sauter d'un détail à l'autre, et c'est une méthode qu'un enfant retient.",
    },
    {
      title: "Cherchez ce qui manque, pas ce qui change",
      body: "Une différence sur deux est un objet retiré plutôt qu'un objet modifié. Les yeux repèrent mal une absence, donc il faut y penser exprès.",
    },
    {
      title: "Les couleurs en dernier",
      body: "Les changements de forme sautent aux yeux, les changements de couleur beaucoup moins. Quand il reste une différence introuvable, c'est presque toujours une teinte.",
    },
  ],

  teaches: [
    {
      title: "L'observation méthodique",
      body: "Comparer deux images demande de regarder dans un ordre plutôt qu'au hasard, et c'est exactement la compétence qu'on utilise plus tard pour relire un texte ou vérifier un calcul.",
    },
    {
      title: "La persévérance tranquille",
      body: "La cinquième différence résiste toujours. Comme rien n'est chronométré et qu'aucune erreur n'est punie, l'enfant apprend à rester sur un problème sans stress.",
    },
    {
      title: "Décrire ce qu'on voit",
      body: "Trouver une différence oblige souvent à la nommer pour être sûr : le chapeau est bleu ici et rouge là. Le vocabulaire progresse en même temps que l'oeil.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Un adulte peut jouer à côté et poser des questions à voix haute. Rien n'est à lire et une erreur ne coûte rien.",
    },
    {
      title: "6 ans et plus",
      body: "Seul, sans aide, avec l'objectif de finir les six scènes sans se tromper une seule fois.",
    },
    {
      title: "Adultes",
      body: "La cinquième différence de chaque scène résiste à tout le monde. Un adulte qui joue sérieusement met plusieurs minutes sur certaines.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser et sans double appui, et les zones à toucher sont larges. Rien n'est chronométré, donc le temps de regarder n'entre jamais en jeu. Les différences portent sur des formes et des objets autant que sur des couleurs, ce qui laisse toujours des différences trouvables à un enfant daltonien.",

  together: [
    {
      title: "Chacun son image",
      body: "Un joueur ne regarde que l'image de gauche, l'autre celle de droite, et ils se décrivent ce qu'ils voient. C'est plus lent, beaucoup plus drôle, et ça travaille le vocabulaire.",
    },
    {
      title: "La course à cinq",
      body: "Deux enfants, un appareil, celui qui trouve annonce. On compte à la fin de la scène plutôt qu'au fil de l'eau, ce qui évite les disputes.",
    },
    {
      title: "Chacun sa scène",
      body: "Deux joueurs, deux tours d'affilée, on compare le temps mis sur la même scène. Comme les six reviennent, la comparaison est juste.",
    },
  ],

  faq: [
    {
      q: "Le jeu des différences est-il gratuit ?",
      a: "Oui, les six scènes, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien y a-t-il de différences ?",
      a: "Cinq par scène et six scènes, donc 30 en tout avant que le jeu recommence.",
    },
    {
      q: "Que compte le record ?",
      a: "Le nombre de scènes réussies depuis le début, et pas le niveau affiché. Le niveau ne monte qu'après un tour complet, donc il avancerait beaucoup trop lentement.",
    },
    {
      q: "Y a-t-il un chronomètre ?",
      a: "Non. Un enfant peut regarder aussi longtemps qu'il veut, et une erreur ne coûte rien.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Trois ans avec un adulte à côté, six ans tout seul. Il n'y a rien à lire.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les six scènes sont sur l'appareil.",
    },
  ],

  keywords: [
    "jeu des différences",
    "trouver les différences",
    "jeu d'observation enfant",
    "jeu gratuit sans téléchargement",
    "cherche et trouve",
    "jeu maternelle en ligne",
  ],
};
