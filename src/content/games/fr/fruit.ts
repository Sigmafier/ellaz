import type { GameCopy } from "../../types";

/**
 * Cascade de Fruits, en francais. Ecrit, pas traduit.
 *
 * Les chiffres viennent de `scripts/sim/fruit-chain.mjs`, qui pilote la
 * physique reellement livree, et de `src/games/fruit/logic.ts`.
 *
 * Toute ponctuation double porte une espace insecable devant, comme le veut
 * l'orthotypographie francaise. `voice.ts` le verifie.
 */
export const fruitFr: GameCopy = {
  name: "Cascade de Fruits",
  metaTitle: "Cascade de Fruits - jeu de fusion | Ellaz",
  metaDescription:
    "Faites tomber des fruits dans une caisse ouverte. Deux fruits identiques qui se touchent en forment un plus gros, et la pile part en cascade.",

  lede: "Un jeu de fusion de fruits, gratuit et dans le navigateur. Les fruits tombent dans une caisse ouverte, deux fruits identiques qui se touchent deviennent le suivant de la chaîne, et toute la pile se replace sous eux. Dix rangs, de la myrtille à la pastèque. La partie s'arrête quand un fruit s'immobilise au-dessus de la ligne du haut.",

  body: [
    "On appuie sur la caisse. Un fruit tombe. Deux fruits pareils qui se touchent n'en font plus qu'un, et tout ce qui se trouve dessous se remet en place. Voilà toute la règle.",

    "La physique est écrite à la main dans le fichier de règles du jeu, sans moteur, et cela explique ce qu'elle sait faire. Tout est un cercle. Deux cercles se chevauchent exactement quand la distance entre leurs centres est plus petite que la somme de leurs rayons, et on les sépare le long de cette même ligne. Ni polygone ni rotation. Une quarantaine de lignes d'arithmétique suffisent, et le calcul reste une fonction pure : la même caisse et le même pas de temps redonnent toujours la même pile, sur un téléphone comme sur un ordinateur. Le pas est fixé à 120 sous-étapes par seconde, et l'affichage consomme le temps qui s'est vraiment écoulé, donc un écran à 60 Hz et un écran à 120 Hz avancent à la même vitesse.",

    "Le chiffre que nous sommes allés chercher est celui-ci. Une fusion ne fait pas que marquer des points, elle change la forme de tout ce qui est en dessous, donc la pile se replace et peut réunir deux autres paires que personne n'avait alignées. Sur 240 parties simulées avec la physique livrée, 33,2 % des fusions d'un programme prudent ont été déclenchées par une fusion précédente et non par sa propre chute. Un programme qui laisse tomber au hasard monte à 47,5 %. Entre un tiers et la moitié de ce jeu se joue donc tout seul, et c'est exactement la partie qui fait plaisir.",

    "Deux programmes, 40 parties par caisse pour chacun. Celui qui vise au hasard tient 123,1 fruits dans la caisse large et 82,0 dans l'étroite, pour 589 et 378 points. Une seule règle change tout : viser un jumeau réellement atteignable, et laisser tomber n'importe où quand il n'y en a pas. Ce programme-là tient 156,8 fruits et marque 946 points dans la caisse large.",

    "L'aveu. Le solveur fait cinq passes de correction par sous-étape, et cinq ne suffisent pas dans une pile profonde : mesuré sur la pile finale de chaque repos, deux fruits se sont retrouvés enfoncés l'un dans l'autre de 1,6 unité, soit la moitié du rayon d'une myrtille. Rien ne roule non plus, puisqu'un fruit n'a aucune rotation à garder. Regardez une caisse bien pleine et vous le verrez.",
  ],

  howToPlay: [
    {
      title: "Viser",
      body: "Le fruit en attente suit votre doigt le long du haut de la caisse. Les flèches du clavier le déplacent aussi.",
    },
    {
      title: "Laisser tomber",
      body: "Un appui, et il part. Entrée ou Espace font la même chose au clavier.",
    },
    {
      title: "Réunir deux fruits pareils",
      body: "Deux fruits identiques qui se touchent deviennent le rang suivant. Ils n'ont pas besoin d'être posés l'un sur l'autre, il suffit qu'ils se frôlent.",
    },
    {
      title: "Surveiller le haut",
      body: "La partie s'arrête quand un fruit reste immobile une demi-seconde au-dessus de la ligne. Tant qu'il bouge, rien ne se passe.",
    },
  ],

  tips: [
    {
      title: "Les gros fruits sur les côtés",
      body: "Un fruit qui grossit pousse ses voisins. Contre une paroi il ne pousse que d'un côté, et la place gagnée reste au milieu, là où vous en avez besoin.",
    },
    {
      title: "Un jumeau atteignable vaut mieux qu'un jumeau idéal",
      body: "Le programme qui gagne le plus ne vise jamais un fruit enterré sous trois autres. Il prend le jumeau sur lequel une chute droite tombe vraiment, et cette nuance vaut 33,7 fruits de plus par partie dans la caisse large.",
    },
    {
      title: "Ne comblez pas les creux avec des myrtilles",
      body: "La caisse ne distribue que les cinq premiers rangs, jamais plus haut. Une myrtille posée dans un trou pour le boucher y restera jusqu'à ce qu'une autre myrtille arrive, et elle gêne la remontée de la pile en attendant.",
    },
  ],

  teaches: [
    {
      title: "Anticiper une réaction",
      body: "Un tiers des fusions vient d'une autre fusion. Voir venir celle-là avant d'appuyer est un raisonnement en deux temps, appris sans une seule consigne écrite.",
    },
    {
      title: "Ranger par taille",
      body: "Dix rangs qui se suivent, chacun environ 1,2 fois plus large que le précédent. Un enfant apprend l'ordre en le manipulant plutôt qu'en le récitant.",
    },
    {
      title: "Accepter le désordre",
      body: "Une pile ne se range jamais complètement, et la partie continue quand même. Jouer avec un résultat imparfait est une leçon en soi.",
    },
  ],

  ages: [
    {
      title: "4 à 5 ans",
      body: "La caisse large. Il n'y a rien à lire, un appui suffit, et les fruits fusionnent tout seuls assez souvent pour que ce soit gratifiant.",
    },
    {
      title: "6 à 8 ans",
      body: "La caisse moyenne, où viser commence à rapporter. Le programme prudent y tient 120,7 fruits contre 98,6 pour le hasard.",
    },
    {
      title: "Adultes",
      body: "La caisse étroite, 52 unités de large. Une pastèque en mesure 35,6 à elle seule, donc deux ne tiendront jamais côte à côte et la fin de la chaîne devient un vrai objectif.",
    },
  ],

  accessibility:
    "Un appui suffit pour tout, et le glissement pour viser n'est jamais obligatoire. La caisse est un vrai bouton : les flèches gauche et droite déplacent le fruit en attente, Entrée ou Espace le laissent tomber, donc la partie se joue entièrement au clavier. Chaque rang a sa propre teinte, sa propre taille et son propre dessin, si bien qu'un joueur qui distingue mal les couleurs reconnaît les fruits à autre chose. Aucun chronomètre nulle part. La pile s'arrête de bouger toute seule et une partie interrompue est retrouvée telle quelle.",

  together: [
    {
      title: "Un fruit chacun",
      body: "Chacun laisse tomber à son tour dans la même caisse. Le score commun rend les mauvais choix collectifs, ce qui est plus drôle que de perdre seul.",
    },
    {
      title: "Annoncer la cascade",
      body: "Avant d'appuyer, dire combien de fusions la chute va déclencher. Une fusion sur trois en amène une autre, donc le pari est rarement gagné du premier coup.",
    },
    {
      title: "La chasse à la pastèque",
      body: "Sur 240 parties simulées, une pastèque n'est apparue que dans 3 d'entre elles, toutes dans la caisse large, et deux ne se sont jamais rencontrées. Un joueur humain y arrive mieux, et cela vaut le détour.",
    },
  ],

  faq: [
    {
      q: "Que se passe-t-il avec deux pastèques ?",
      a: "Elles disparaissent toutes les deux et laissent la place vide. Le rang du dessus n'existe pas, donc la paire rapporte 155 points d'un coup au lieu de fabriquer un onzième fruit.",
    },
    {
      q: "Combien de fruits différents ?",
      a: "Dix rangs. La caisse ne vous en donne jamais que cinq, les plus petits, tirés au sort avec un poids plus fort sur le plus petit de tous. Les cinq du haut se construisent.",
    },
    {
      q: "Qu'est-ce qui change entre les niveaux ?",
      a: "La largeur de la caisse, et rien d'autre : 74, 62 ou 52 unités. Les fruits, la chaîne et le tirage sont identiques partout, donc changer de niveau ne veut pas dire apprendre un autre jeu.",
    },
    {
      q: "Combien de fruits dure une partie ?",
      a: "Environ 91 dans la caisse étroite et 157 dans la large pour notre meilleur programme, sur 40 parties par caisse. Un début de partie humain ressemble plutôt au tirage au hasard, soit 82 et 123.",
    },
    {
      q: "Y a-t-il un bouton pause ?",
      a: "Non, et c'est voulu : rien ne bouge quand la pile est posée, aucun chronomètre ne tourne, donc s'éloigner ne coûte rien.",
    },
    {
      q: "Comment est calculé le record ?",
      a: "En points, le plus grand gagne, et chaque largeur de caisse garde le sien. Deux myrtilles valent 1 point, la paire du rang au-dessus en vaut 3, et cela grimpe ensuite.",
    },
    {
      q: "Est-ce que ça marche hors ligne ?",
      a: "Oui, après la première visite. Rien à installer et aucun compte à créer.",
    },
  ],

  keywords: [
    "jeu de fusion de fruits",
    "cascade de fruits",
    "jeu de pastèque",
    "puzzle de fusion gratuit",
    "jeu enfant navigateur",
  ],
};
