import type { GameCopy } from "../../types";

/**
 * Ecrit en francais, jamais traduit. L'aveu de cette page n'est celui d'aucune
 * des trois autres. Les chiffres mesures viennent de
 * `scripts/sim/parking-jams.mjs`. Le plancher de 5 coups essaye puis refuse
 * en facile est declare par `src/games/parking/logic.ts` et n'a pas ete
 * remesure ici - voir les lignes `provenance` de la page.
 *
 * Espace INSECABLE avant `: ; ? !`, partout, sans exception - `voice.ts` le
 * mesure, et l'incoherence est ce qu'un lecteur francais remarque en premier.
 */
export const parkingFr: GameCopy = {
  name: "Sortir du parking",
  metaTitle: "Sortir du parking - jeu d'embouteillage | Ellaz",
  metaDescription:
    "Un parking de 6 sur 6, chaque voiture bloquée sur son axe. Dégagez la voie et sortez la voiture orange par la brèche. Gratuit, sans compte, hors ligne.",

  lede: "Un parking de 6 sur 6, une brèche dans le mur de droite, et une voiture orange coincée au milieu. Chaque voiture glisse sur son axe et sur rien d'autre. Le record compte les coups, et le plus petit gagne.",

  body: [
    "On appuie sur une voiture. Des points montrent où elle peut aller. On appuie sur un point. Elle y va.",

    "Ce parking n'a pas été mélangé au hasard puis vérifié. Il a été construit à l'envers : le jeu part de la position gagnante, la voiture orange collée à la sortie, et s'en éloigne coup par coup en notant l'inverse de chacun. Comme un glissement s'annule toujours par le glissement contraire, refaire ce chemin dans l'autre sens gagne la partie. La solution existe donc avant l'affichage de la grille, et c'est une propriété de la fabrication plutôt qu'une promesse commerciale.",

    "Ce chemin de fabrication est long : 56,1 coups en facile, 73 en difficile, mesurés sur 400 grilles par niveau. La meilleure solution, elle, tient en 4,2 coups en facile et 5,4 en difficile, et ce minimum est exact - une recherche en largeur parcourt l'espace des positions au lieu de l'estimer. Facteur 13 en difficile. Et un coup ici est un glissement entier : traverser quatre cases n'en coûte qu'un, là où les jeux d'embouteillage classiques comptent case par case et affichent des chiffres près de trois fois plus gros.",

    "L'aveu : le niveau facile ne peut pas être rendu plus profond. Un plancher de 5 coups y a été essayé puis refusé, parce qu'environ une grille sur cinq ne l'atteignait jamais. La disposition elle-même n'a pas de position plus lointaine à offrir, quelle que soit la durée du mélange, et le facile tourne donc autour de 4,2 coups, tout près de ce que ses dispositions permettent. Les 12 voitures du difficile n'achètent qu'un coup de plus, et sept d'entre elles ne bougent même pas dans la meilleure ligne.",

    "Personne ne peut se bloquer ici. Chaque glissement s'annule, donc toute position atteinte garde au moins le coup qui l'a produite : sur 480 000 positions parcourues, aucune n'était sans issue. Le bouton retour fait redescendre le compteur avec la voiture, alors réfléchir ne coûte rien.",
  ],

  howToPlay: [
    {
      title: "Prendre une voiture",
      body: "Un appui la soulève. Les points qui s'allument sont exactement les cases où elle peut se rendre, ni plus ni moins.",
    },
    {
      title: "La faire glisser",
      body: "Appuyez sur une case libre alignée avec elle. Le nez de la voiture s'arrête sur la case touchée ; un appui hors de son axe la fait seulement tressaillir.",
    },
    {
      title: "Changer d'avis",
      body: "Appuyer sur une autre voiture prend celle-là à la place. Appuyer sur celle qu'on tient la repose. Rien de tout cela ne compte comme un coup.",
    },
    {
      title: "Sortir",
      body: "La voiture orange doit atteindre le mur de droite sur la ligne de la brèche. Le second compteur indique combien de voitures restent en travers.",
    },
    {
      title: "Revenir en arrière",
      body: "Le bouton retour défait un glissement par appui, autant de fois qu'il le faut, et le compteur de coups redescend avec lui.",
    },
  ],

  tips: [
    {
      title: "Regardez d'abord la ligne de sortie",
      body: "Le second compteur dit combien de voitures barrent la route, en général une à trois. Chacune doit bouger au moins une fois, et vous aussi, donc ce nombre plus un est le plancher de votre propre solution.",
    },
    {
      title: "Demandez-vous où la gênante peut aller",
      body: "Une voiture verticale a besoin d'une case libre au-dessus ou en dessous. Si les deux sont prises, la question devient : qui libérera cette case ? C'est là que commencent les grilles à trois coups.",
    },
    {
      title: "Ne rangez pas le parking",
      body: "Déplacer une voiture parce qu'elle a l'air mal garée coûte un coup et ne rapporte rien. Sept des douze voitures ne servent à rien dans la meilleure ligne.",
    },
    {
      title: "Refaites la même grille",
      body: "Le retour ramène jusqu'à la distribution. Descendre à trois coups sur une grille déjà finie apprend davantage que dix grilles neuves.",
    },
  ],

  teaches: [
    {
      title: "Trier l'utile du visible",
      body: "Douze voitures à l'écran, cinq qui comptent. Chercher ce qui gêne vraiment plutôt que tout examiner est une habitude qui sert bien au-delà d'un parking dessiné.",
    },
    {
      title: "Enchaîner deux idées",
      body: "Dégager la voiture qui bloque demande parfois d'en pousser une autre d'abord. Deux coups liés, c'est le premier vrai raisonnement en plusieurs étapes d'un enfant.",
    },
    {
      title: "Se tromper sans conséquence",
      body: "Le retour est illimité et gratuit. Un enfant qui sait qu'aucun geste ne casse rien essaie beaucoup plus, ce qui est exactement ce qu'on lui demande ici.",
    },
    {
      title: "Le sens des axes",
      body: "Une voiture couchée ne monte jamais, une voiture debout ne se décale jamais. Cette règle unique fait toute la géométrie du jeu.",
    },
  ],

  ages: [
    {
      title: "4 à 5 ans",
      body: "Le niveau facile, 6 voitures. Le générateur refuse toute grille qui se résout en moins de 4 coups, donc même la plus douce demande une petite suite.",
    },
    {
      title: "6 à 8 ans",
      body: "Le moyen, 9 voitures. Assez de circulation pour qu'il faille chercher la gênante, pas assez pour décourager.",
    },
    {
      title: "9 ans et plus",
      body: "Le difficile, 12 voitures. Le plaisir passe du fait de sortir à celui de sortir en 5 coups plutôt qu'en 50.",
    },
    {
      title: "Adultes",
      body: "Une grille difficile bouclée en 5 ou 6 coups est une grille lue correctement. La pire vue sur 400 en demandait 11.",
    },
  ],

  accessibility:
    "Tout se joue par appuis, jamais en glissant le doigt, et chaque case du parking est une cible de la même taille quelle que soit la voiture posée dessus. La voiture du joueur ne se reconnaît pas qu'à sa couleur : elle porte une flèche vers la sortie et un contour plus épais, pour un enfant qui distingue mal l'orange du bleu. Aucun chronomètre, aucune limite de coups, donc on peut poser la tablette au milieu d'une réflexion. Un glissement impossible répond par un petit tremblement, sans son d'erreur.",

  together: [
    {
      title: "Chacun son coup",
      body: "A tour de rôle sur la même grille. Le compteur commun rend les gestes inutiles visibles par tout le monde, ce qui suffit à lancer la discussion.",
    },
    {
      title: "Annoncer avant de toucher",
      body: "Dire à voix haute quelle voiture gêne et pourquoi, avant d'y aller. Un enfant capable de répondre lit la grille, il ne tape plus dessus.",
    },
    {
      title: "Le pari sur le plancher",
      body: "Devinez ensemble si la grille se ferme en exactement 5 coups. C'est le cas 73,8% du temps en difficile, ce qui rend le pari amusant surtout quand on le perd.",
    },
    {
      title: "La même grille, deux téléphones",
      body: "Même niveau, chacun sa partie, et on compare les compteurs. Sans horloge, personne ne se dépêche.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de parking est-il gratuit ?",
      a: "Oui, les trois niveaux. Pas de publicité, pas de compte, aucune version payante.",
    },
    {
      q: "Toutes les grilles ont-elles une solution ?",
      a: "Oui, par construction. Le jeu part de la position gagnante et s'en éloigne par des coups qu'un coup légal annule, donc le chemin de retour existe avant l'affichage.",
    },
    {
      q: "Peut-on rester bloqué sans aucun coup possible ?",
      a: "Non. Chaque glissement s'annule, donc toute position garde au moins un coup légal : 480 000 positions parcourues, zéro impasse.",
    },
    {
      q: "Combien de coups pour une bonne partie ?",
      a: "Le minimum réel tourne autour de 4,2 coups en facile et 5,4 en difficile, et le générateur refuse tout ce qui descend sous 4 en facile ou 5 en difficile. Atteindre ce plancher est le mieux que la grille autorise.",
    },
    {
      q: "Le retour en arrière pénalise-t-il le record ?",
      a: "Non, le compteur redescend d'un cran à chaque retour. Un coup annulé n'est pas un coup joué.",
    },
    {
      q: "Quelle différence entre facile et difficile ?",
      a: "Le nombre de voitures, 6 contre 12, sur le même parking de 6 sur 6. La meilleure solution s'allonge peu : 4,2 coups contre 5,4.",
    },
    {
      q: "A partir de quel âge ?",
      a: "Vers 4 ans en facile. Rien n'a besoin d'être lu pour jouer, donc un enfant qui ne lit pas encore joue seul.",
    },
    {
      q: "Faut-il installer quelque chose ?",
      a: "Non, cela tourne dans le navigateur et fonctionne hors ligne après la première visite.",
    },
  ],

  keywords: [
    "jeu de parking",
    "jeu d'embouteillage",
    "sortir la voiture",
    "casse-tête de logique",
    "jeu de réflexion enfant",
    "puzzle de voitures gratuit",
  ],
};
