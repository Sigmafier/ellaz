import type { GameCopy } from "../../types";

/**
 * Ecrite en francais, pas traduite. Les chiffres viennent de
 * `scripts/sim/arrowtap-order.mjs` et du code du jeu, jamais d'une estimation.
 *
 * Toutes les ponctuations doubles portent une espace insecable (U+00A0) devant,
 * comme l'exige `voice.ts` pour le francais.
 */
export const arrowtapFr: GameCopy = {
  name: "Libérer les flèches",
  metaTitle: "Libérer les flèches - jeu gratuit | Ellaz",
  metaDescription:
    "Chaque flèche part vers son bord si la voie est libre. Grilles 4x4, 5x5 et 6x6, aucune impasse possible, gratuit et sans compte.",

  lede: "Une grille pleine de flèches. Appuyez sur celles dont la voie est dégagée et elles s'envolent hors du plateau. Videz la grille. Le record est le temps, et le plus rapide gagne.",

  body: [
    "On appuie sur une flèche et elle s'envole. À une condition. Les cases entre elle et son bord doivent être vides. Voilà tout.",

    "Sur une grille neuve, toutes les flèches ne peuvent pas partir, et c'est là que se joue la difficulté. Nous avons distribué 4 000 grilles par niveau pour compter. En facile, 5,7 flèches sur 8 ont déjà la voie libre au premier appui. En moyen, 8,8 sur 14. En difficile, 12,5 sur 22, soit un peu plus de la moitié du plateau ouvert tout de suite, le reste attendant que quelqu'un dégage le passage. L'écart entre deux grilles difficiles est large, de 7 flèches libres à 18, et c'est ce tirage qui décide vraiment si la partie sera confortable.",

    "On ne peut pas se bloquer, et c'est une propriété des règles plutôt qu'une promesse commerciale. Un appui ne fait que vider une case, une case vide n'arrête rien, donc un chemin dégagé le reste pour toujours. Un programme qui appuie au hasard, sans la moindre réflexion, a terminé 12 000 grilles sur 12 000. Aucune n'a fini bloquée.",

    "L'ordre ne change rien, pas même le compte. Une grille difficile se vide en 22 appuis, toujours.",

    "L'aveu. Puisque rien ne peut être perdu, la seule chose mesurée est le temps, et l'horloge tourne pendant qu'on réfléchit. Un enfant qui aime s'installer et préparer trois coups à l'avance ne sera récompensé de rien ici. C'est un jeu d'œil rapide, et quelqu'un qui cherche une vraie énigme finira le niveau difficile en trouvant qu'il manque de mordant.",
  ],

  howToPlay: [
    {
      title: "Regarder les pointes",
      body: "Chaque flèche indique le bord par lequel elle sortira. La forme dit la direction, la couleur ne fait que regrouper.",
    },
    {
      title: "Appuyer sur une voie libre",
      body: "Si toutes les cases entre la flèche et son bord sont vides, elle part. Sinon elle tremble et rien ne bouge.",
    },
    {
      title: "Commencer par les bords",
      body: "Une flèche posée sur le bord qu'elle vise n'a aucune case devant elle. Elle peut donc toujours partir.",
    },
    {
      title: "Vider la grille",
      body: "La partie est finie quand plus aucune flèche ne reste. Le chronomètre s'arrête à ce moment-là.",
    },
  ],

  tips: [
    {
      title: "Ne réfléchissez pas, appuyez",
      body: "Aucun ordre ne gâche une grille, donc l'hésitation est la seule chose qui coûte quelque chose. Prenez la première flèche libre que votre œil trouve.",
    },
    {
      title: "Une direction à la fois",
      body: "Suivez toutes les flèches d'une même couleur avant de changer. L'œil balaie une seule ligne au lieu de fouiller la grille entière, et le temps tombe.",
    },
    {
      title: "Épluchez la bordure",
      body: "Le pourtour se vide vite et chaque départ ouvre le centre. Le plateau ne se referme jamais, il ne fait que s'ouvrir.",
    },
    {
      title: "Le refus est gratuit",
      body: "Une flèche bloquée ne compte rien et ne pénalise rien. Sur un doute, appuyez pour voir plutôt que de compter les cases du regard.",
    },
  ],

  teaches: [
    {
      title: "Lire une direction",
      body: "Savoir dire où pointe une forme et suivre sa ligne jusqu'au bord est une compétence spatiale que la maternelle travaille avec des gestes. Ici elle est le jeu entier.",
    },
    {
      title: "Voir un obstacle",
      body: "La question n'est jamais la flèche, mais ce qui se trouve devant elle. Un enfant apprend vite à regarder le trajet plutôt que l'objet.",
    },
    {
      title: "Balayer vite",
      body: "Trouver l'une des 12,5 flèches libres d'une grille difficile parmi 22 est un exercice d'attention visuelle, et il se mesure au chronomètre.",
    },
  ],

  ages: [
    {
      title: "4 à 5 ans",
      body: "Le facile, 8 flèches sur une grille de 4 cases sur 4. Presque trois flèches sur quatre peuvent partir dès le début, donc un premier appui réussit presque toujours.",
    },
    {
      title: "6 à 8 ans",
      body: "Le moyen, 14 flèches, où il faut déjà suivre une ligne du regard avant d'appuyer.",
    },
    {
      title: "9 ans et plus",
      body: "Le difficile, 22 flèches sur une grille de 6 sur 6. Le plateau tient tout entier à l'écran et le chronomètre devient le vrai adversaire.",
    },
    {
      title: "Adultes",
      body: "Une grille difficile est une pause de quelques dizaines de secondes. Le record se garde par niveau, donc trois barres à battre plutôt qu'une.",
    },
  ],

  accessibility:
    "Un appui par action, jamais de glissement ni d'appui maintenu, donc le jeu répond aux dispositifs d'entrée alternatifs comme à une petite main qui vise encore mal. Chaque case est un bouton atteignable au clavier, avec un intitulé qui annonce sa ligne, sa colonne et la direction de sa flèche. La forme porte l'information, la couleur ne fait que regrouper, et les quatre teintes sont écartées en clarté pour rester distinctes sans dépendre du daltonisme. Sur un téléphone de 390 pixels, une case de la grande grille mesure environ 57 pixels de côté. Une flèche bloquée répond par un tremblement et non par un son d'erreur.",

  together: [
    {
      title: "Chacun son appui",
      body: "À tour de rôle sur la même grille. Personne ne peut abîmer la partie de l'autre, ce qui rend le tour de l'adversaire supportable.",
    },
    {
      title: "Annoncer avant",
      body: "Dire à voix haute par quel bord la flèche va sortir avant d'appuyer. Un enfant qui répond juste a compris la règle entière.",
    },
    {
      title: "La course des couleurs",
      body: "Un joueur ne sort que les flèches d'une couleur, l'autre s'occupe du reste. La grille se vide deux fois plus vite et la dispute porte sur les cases partagées.",
    },
    {
      title: "Deux appareils, un chronomètre",
      body: "Même niveau, départ ensemble, et on compare les temps. Comme les grilles diffèrent, la deuxième manche échange les places.",
    },
  ],

  faq: [
    {
      q: "Peut-on se retrouver bloqué ?",
      a: "Non. Sur 12 000 grilles jouées entièrement au hasard, aucune n'a fini bloquée. Un appui vide une case et une case vide n'arrête rien, donc les chemins dégagés le restent.",
    },
    {
      q: "Combien de flèches par niveau ?",
      a: "8 sur une grille de 4 sur 4, 14 sur une grille de 5 sur 5, et 22 sur une grille de 6 sur 6.",
    },
    {
      q: "L'ordre des appuis compte-t-il ?",
      a: "Pour finir, non. Pour le chronomètre, oui. Une grille difficile demande exactement 22 appuis quel que soit le chemin choisi, donc seul le temps de recherche varie.",
    },
    {
      q: "Comment le record est-il mesuré ?",
      a: "En temps, le plus court gagne, et séparément pour chaque niveau. Une grille de 8 flèches et une grille de 22 ne sont pas la même performance.",
    },
    {
      q: "Que se passe-t-il si j'appuie sur une flèche bloquée ?",
      a: "Elle tremble et rien d'autre. Aucun appui raté n'est compté et aucun message n'apparaît, parce qu'une supposition raisonnable ne mérite pas de reproche.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non, la grille ne contient ni lettre ni chiffre. Un enfant qui ne lit pas encore joue seul.",
    },
    {
      q: "Le jeu est-il gratuit ?",
      a: "Oui, entièrement, sans publicité et sans compte à créer. Après une première visite il fonctionne hors connexion.",
    },
    {
      q: "Retrouve-t-on une partie en cours ?",
      a: "Oui. La grille et le chronomètre sont gardés sur l'appareil, donc reposer la tablette ne coûte rien.",
    },
  ],

  keywords: [
    "libérer les flèches",
    "jeu de flèches",
    "puzzle de logique gratuit",
    "jeu de réflexion enfant",
    "jeu sans lecture",
    "casse-tête de grille",
  ],
};
