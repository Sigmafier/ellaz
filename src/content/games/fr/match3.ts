import type { GameCopy } from "../../types";

/**
 * Ecrit a partir de `node scripts/brief.mjs fr match3`, jamais depuis la page
 * anglaise : deux pages ecrites depuis le meme brief partagent les faits, deux
 * pages ecrites l'une depuis l'autre partagent la structure, et c'est la
 * structure qui fait un doublon.
 */
export const match3Fr: GameCopy = {
  name: "Trois d'affilée",
  metaTitle: "Trois d'affilée - jeu de gemmes gratuit | Ellaz",
  metaDescription:
    "Jeu de trois d'affilée gratuit dans le navigateur. Échangez deux gemmes voisines, alignez trois couleurs identiques, regardez le reste tomber. Sans compte.",

  lede: "Un jeu de trois d'affilée gratuit, directement dans le navigateur. Vous appuyez sur une gemme, puis sur sa voisine, et elles échangent leur place. Trois couleurs identiques alignées disparaissent et tout ce qui était au-dessus tombe dans le trou. Aucune horloge, aucune façon de perdre.",

  body: [
    "Vous appuyez sur une gemme. Puis sur sa voisine. Elles échangent leur place, et trois couleurs identiques disparaissent.",

    "La suite est la vraie raison d'y jouer. Les gemmes du dessus tombent dans le trou, et parfois cette chute en aligne trois autres que personne n'avait prévues, puis trois encore. Nous l'avons mesuré sur 2 000 tours par niveau : en facile, 59,2 % des échanges réussis se prolongent en une chaîne d'au moins deux étapes, et en difficile seulement 36,2 %. La plus longue chaîne enregistrée a atteint quatorze étapes sur une grille de six sur six. Chaque étape sonne une note plus haut que la précédente, donc on entend jusqu'où c'est allé sans même regarder.",

    "Ici la difficulté, ce sont les couleurs, jamais la vitesse. Quatre couleurs sur une grille de six sur six, cinq sur sept sur sept, six sur huit sur huit. Plus il y a de couleurs, moins les choses s'alignent toutes seules, et c'est pour cela que le niveau facile ressemble à un feu d'artifice et le difficile à un travail calme. L'échange moyen nettoie 9,96 gemmes en facile et 5,33 en difficile.",

    "Voici maintenant ce qui nous a surpris. Nous avons opposé un programme qui prend n'importe quel échange valide à un programme qui examine toute la grille et prend le plus gros. En facile, bien regarder vaut 1,27 fois plus d'avancée par tour. En difficile, cela vaut 1,07 fois. Autrement dit, le niveau censé récompenser la réflexion est celui qui la récompense le moins, parce que six couleurs rétrécissent chaque échange jusqu'à ce que le coup malin et le coup ordinaire se confondent presque. Nous préférons l'écrire plutôt que prétendre que le difficile est le niveau intelligent.",

    "Une grille sans aucun échange valide se remélange toute seule, avec exactement les mêmes gemmes. Cela n'arrive presque jamais. Sur 2 000 tours difficiles, cela s'est déclenché 0,001 fois par tour, et sur les deux autres niveaux pas une seule fois.",
  ],

  howToPlay: [
    { title: "Choisir un niveau", body: "Facile, moyen ou difficile. Ce qui change, c'est le nombre de couleurs et la taille de la grille." },
    { title: "Appuyer sur une gemme", body: "Un contour apparaît autour d'elle. Si vous appuyez à nouveau dessus, vous la reposez." },
    { title: "Appuyer sur une voisine", body: "En haut, en bas, à gauche ou à droite. La diagonale ne compte pas." },
    { title: "Regarder la chute", body: "Si les gemmes qui tombent en alignent trois autres, celles-là disparaissent aussi et la note monte d'un cran." },
    { title: "Terminer le tour", body: "Chaque tour demande un nombre de gemmes. La barre sous la grille indique combien il en reste." },
  ],

  tips: [
    {
      title: "Regardez la ligne du bas",
      body: "Nettoyer trois gemmes près du sol fait tomber toute la colonne au-dessus. Les mêmes trois tout en haut ne déplacent presque rien.",
    },
    {
      title: "Quatre vaut mieux que trois",
      body: "Un échange qui en aligne quatre en nettoie quatre, et ouvre un trou plus large par lequel d'autres gemmes tombent. C'est là que les chaînes commencent.",
    },
    {
      title: "Ne prenez pas le premier vu",
      body: "Il n'y a pas d'horloge. L'échange qui saute aux yeux est souvent un simple trois, et trente secondes d'observation en trouvent souvent un qui continue.",
    },
    {
      title: "En difficile, continuez",
      body: "Bien regarder n'y vaut que 7 %. Une suite régulière d'échanges ordinaires rapporte plus qu'un échange parfait cherché pendant une minute.",
    },
  ],

  teaches: [
    { title: "Repérer des motifs", body: "Trouver trois gemmes identiques parmi quarante-neuf, c'est la même recherche visuelle que demande l'apprentissage de la lecture." },
    { title: "Penser un coup plus loin", body: "Ce qui tombe après un échange est prévisible. Un enfant qui commence à le prévoir ne joue plus au même jeu." },
    { title: "Patience", body: "Rien ne presse ici. Observez la grille." },
    { title: "Accepter la chance", body: "Une longue chaîne est parfois un plan et parfois une chute heureuse. Les deux comptent." },
  ],

  ages: [
    { title: "4 à 5 ans", body: "Facile uniquement. Quatre couleurs sur une petite grille, donc presque tous les échanges fonctionnent." },
    { title: "6 à 7 ans", body: "Moyen. Cinq couleurs sur sept sur sept, et il faut désormais chercher." },
    { title: "8 ans et plus", body: "Difficile. Six couleurs, et l'échange moyen ne nettoie que 5,33 gemmes." },
    { title: "Adultes", body: "Le même jeu. Le difficile demande quarante gemmes au premier tour, puis dix de plus à chaque tour suivant." },
  ],

  accessibility:
    "Un appui par action, sans faire glisser et sans maintenir, donc le jeu fonctionne avec des entrées alternatives comme avec une petite main qui vise encore mal. Chaque couleur possède aussi sa propre forme, un losange, un cercle, un carré, un triangle, une étoile et un hexagone, parce qu'environ un garçon sur douze ne sépare pas la gemme rouge de la verte et qu'un trois d'affilée dont le seul indice est la teinte est un jeu qui leur est fermé. Aucune horloge et aucun compte à rebours, on peut donc s'arrêter au milieu et réfléchir autant qu'on veut. Un échange qui ne forme aucune ligne répond par un contour orange et non par un son d'erreur, et la grille reste exactement telle qu'elle était. Chaque case porte sa colonne et sa ligne dans son étiquette, pour qu'un lecteur d'écran les distingue au lieu de lire quarante-neuf fois la même chose. On peut jouer en silence complet sans rien perdre.",

  together: [
    { title: "Qui le voit en premier", body: "Regardez la même grille et montrez du doigt dès que vous trouvez un échange. L'enfant gagnera plus souvent que vous ne le pensez." },
    { title: "Devinez la chute", body: "Avant d'appuyer, demandez si celui-ci va enchaîner. Ensuite vous regardez ensemble." },
    { title: "Un coup chacun", body: "À tour de rôle sur le même appareil, un échange à la fois. Le tour se termine plus vite qu'il n'y paraît." },
    { title: "Chaînes seulement", body: "Essayez un tour où vous ne prenez que des échanges censés continuer. C'est bien plus long, et c'est justement l'intérêt." },
  ],

  faq: [
    {
      q: "Peut-on perdre ?",
      a: "Non. Il n'y a pas d'horloge, pas de limite d'échanges, et la grille se remélange toute seule si elle se retrouve sans coup valide. La seule chose qui arrive, c'est qu'un tour se termine et qu'un tour légèrement plus grand commence.",
    },
    {
      q: "Pourquoi mon échange ne marche pas ?",
      a: "Parce qu'il n'aligne pas trois couleurs identiques. Les gemmes reviennent à leur place, un contour orange apparaît, et rien ne vous est retiré. Vous pouvez réessayer aussitôt.",
    },
    {
      q: "Qu'est-ce qui change entre les niveaux ?",
      a: "Le nombre de couleurs et la taille de la grille. Quatre couleurs sur six sur six, cinq sur sept sur sept, six sur huit sur huit. La vitesse ne change jamais, puisqu'il n'y a pas de vitesse.",
    },
    {
      q: "Le jeu se souvient-il de ma partie ?",
      a: "Oui. La grille, le tour et le score reviennent tels que vous les avez laissés, sur cet appareil, sans rien vous demander.",
    },
    {
      q: "Que mesure le record ?",
      a: "Le tour le plus élevé que vous avez atteint, gardé séparément pour chaque niveau. Un tour sur une grille à six couleurs n'est pas le même exploit qu'un tour sur une grille à quatre.",
    },
    {
      q: "Pourquoi le son monte-t-il ?",
      a: "Chaque étape d'une chaîne joue une note plus haut, sur une gamme de cinq notes, pour qu'on entende jusqu'où la chute est allée sans la regarder. La gamme s'arrête en haut au lieu de repartir du bas, parce qu'un enfant qui réussit ne doit pas soudain s'entendre revenu au début.",
    },
  ],

  keywords: ["trois d'affilée", "jeu de gemmes", "jeu gratuit", "casse-tête", "jeux pour enfants", "sans téléchargement"],
};
