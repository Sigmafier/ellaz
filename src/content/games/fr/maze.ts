import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr maze`. STAGED. */
export const mazeFr: GameCopy = {
  name: "Le labyrinthe",
  metaTitle: "Labyrinthe en ligne pour enfants, gratuit | Ellaz",
  metaDescription:
    "Une souris, des miettes, quatre tailles de labyrinthe. Le meilleur trajet est calculé à chaque fois. Gratuit, sans compte et hors ligne.",

  lede: "Une souris, 2 à 5 miettes, et un labyrinthe neuf à chaque fois. Le jeu connaît le trajet le plus court avant vous.",

  body: [
    "La souris part d'un coin. Il faut ramasser toutes les miettes. Le chemin se dessine au doigt. Ou aux flèches.",
    "Les 4 tailles font 5 sur 5 avec 2 miettes, 6 sur 6 avec 3, 7 sur 7 avec 4, et 8 sur 8 avec 5. L'ordre de ramassage est le vrai sujet : avec 4 miettes il y a 24 ordres possibles et 120 avec 5, et le jeu les essaie tous pour connaître le trajet le plus court avant que vous ne bougiez. Le record compte les labyrinthes parfaits d'affilée, donc ceux faits dans ce nombre de pas exactement.",
    "Nous avons distribué 20 000 labyrinthes par taille pour savoir si les deux réflexes naturels sont bons, et la réponse est : l'un des deux seulement. Aller vers la miette la plus proche donne le trajet optimal sur 92,7% des petits labyrinthes et encore 68,6% des 7 sur 7. Les ramasser dans l'ordre de lecture, de haut en bas et de gauche à droite, ne réussit que sur 44,6% de ces mêmes labyrinthes. Sur le 7 sur 7, le meilleur trajet fait 39,53 pas en moyenne, la souris qui va au plus proche en fait 43,91, et le pire ordre en coûte 84,35. Choisir l'ordre du ramassage vaut donc plus du double du trajet lui-même.",
    "Le petit labyrinthe se boucle en 13,58 pas en moyenne et le moyen en 24,41. Le 8 sur 8, lui, est là pour ceux que le 7 sur 7 ne retient plus. Cinq miettes, 64 cases, et aucune impasse rouverte, donc un seul chemin relie deux cases quelconques. Chaque erreur se repaie. Le meilleur trajet y fait 55,17 pas en moyenne, et la souris qui va toujours au plus proche ne le trouve que sur 61,6% des labyrinthes contre 68,6% sur la taille en dessous.",
    "Les culs-de-sac sont volontairement rares chez les petits : 9 sur 10 sont rouverts sur le 5 sur 5, ce qui laisse 0,35 impasse par labyrinthe. Le 7 sur 7 en garde 5,92, et le 8 sur 8, où rien n'est rouvert, 8,17. Et sur 10,3% des petits labyrinthes, tous les ordres coûtent exactement pareil.",
    "L'aveu : le petit labyrinthe est presque trop indulgent. Avec 0,35 impasse et 2 miettes, un enfant de quatre ans réussit sans jamais se tromper, ce qui est rassurant et n'apprend pas grand-chose. Le vrai jeu commence sur le 7 sur 7.",
  ],

  howToPlay: [
    {
      title: "Diriger la souris",
      body: "Faites glisser le doigt dans une direction, ou utilisez les flèches. La souris avance d'une case à la fois.",
    },
    {
      title: "Ramasser les miettes",
      body: "2 à 5 miettes selon la taille. L'ordre dans lequel vous les prenez décide de la longueur du trajet.",
    },
    {
      title: "Viser le parcours parfait",
      body: "Le labyrinthe connaît son trajet le plus court. Le faire dans ce nombre de pas exactement compte comme un labyrinthe parfait.",
    },
  ],

  tips: [
    {
      title: "Allez toujours à la plus proche",
      body: "C'est le bon réflexe et c'est mesuré : il donne le trajet optimal sur 92,7% des petits labyrinthes, 68,6% des 7 sur 7 et 61,6% des 8 sur 8. Aucune autre règle simple n'approche ce résultat.",
    },
    {
      title: "N'utilisez pas l'ordre de lecture",
      body: "Ramasser de haut en bas et de gauche à droite semble naturel et ne marche que sur 44,6% des 7 sur 7 et 35,4% des 8 sur 8. C'est l'erreur la plus fréquente.",
    },
    {
      title: "Regardez avant de partir",
      body: "Sur le 7 sur 7, le pire ordre coûte 84,35 pas contre 39,53 pour le meilleur. Dix secondes d'observation valent plus que n'importe quelle vitesse d'exécution.",
    },
  ],

  teaches: [
    {
      title: "Choisir un ordre",
      body: "Ce jeu n'est pas un exercice de trajet, c'est un exercice d'ordre. Comprendre que la suite des étapes coûte plus cher que chaque étape prise seule est une idée qui sert partout.",
    },
    {
      title: "Se repérer dans l'espace",
      body: "Suivre un couloir, reconnaître une impasse, revenir sur ses pas : c'est le vocabulaire de base du repérage spatial, et un labyrinthe est le meilleur terrain qui existe pour lui.",
    },
    {
      title: "Revenir sur ses pas",
      body: "Reconnaître une impasse et faire demi-tour sans se décourager est une expérience utile. Le 7 sur 7 en offre 5,92 par partie, et le 8 sur 8 en garde 8,17.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le 5 sur 5, avec 2 miettes et presque aucune impasse. Rien à lire et il est très difficile de se perdre.",
    },
    {
      title: "6 ans et plus",
      body: "Le 7 sur 7, ses 5,92 impasses et ses 24 ordres possibles de ramassage.",
    },
    {
      title: "9 ans et plus",
      body: "Le 8 sur 8, cinq miettes et 120 ordres possibles. Rien n'y est rouvert, donc 8,17 impasses attendent en moyenne.",
    },
    {
      title: "Adultes",
      body: "Le 8 sur 8, avec l'objectif du parcours parfait. Trouver le meilleur des 120 ordres possibles à l'oeil est un vrai petit problème.",
    },
  ],

  accessibility:
    "La souris se dirige au glissement de doigt ou aux flèches du clavier. Aucune case ne se touche, c'est une image et pas une cible. Elles font environ 49 pixels sur le 7 sur 7 et 43 sur le 8 sur 8, sur un écran de 390 pixels de large, et chacune est annoncée par son contenu, sa colonne et sa rangée, ce qui rend le labyrinthe utilisable au lecteur d'écran. Rien n'est chronométré. Les murs se voient par leur épaisseur et pas seulement par leur couleur.",

  together: [
    {
      title: "Le trajet annoncé",
      body: "Avant de bouger, chacun annonce l'ordre dans lequel il prendrait les miettes. On compare les nombres de pas à la fin, ce qui rend le sujet du jeu visible.",
    },
    {
      title: "Le copilote",
      body: "Un joueur dirige, l'autre dit la direction à voix haute. Le vocabulaire gauche et droite se met en place très vite, et le copilote voit mieux.",
    },
    {
      title: "Le pari sur l'ordre",
      body: "Chacun annonce dans quel ordre il prendrait les miettes, puis on joue les deux. Les nombres de pas tranchent le débat en dix secondes.",
    },
  ],

  faq: [
    {
      q: "Ce labyrinthe est-il gratuit ?",
      a: "Oui, les quatre tailles, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Quelles sont les tailles ?",
      a: "5 sur 5 avec 2 miettes, 6 sur 6 avec 3, 7 sur 7 avec 4, et 8 sur 8 avec 5 pour le niveau expert. Chaque labyrinthe est fabriqué au moment où il commence.",
    },
    {
      q: "Quelle est la meilleure façon de jouer ?",
      a: "Aller toujours vers la miette la plus proche. C'est le trajet optimal sur 92,7% des petits labyrinthes, 68,6% des 7 sur 7 et 61,6% des 8 sur 8.",
    },
    {
      q: "Combien de pas pour un bon parcours ?",
      a: "13,58 en moyenne sur le petit, 24,41 sur le moyen, 39,53 sur le 7 sur 7 et 55,17 sur le 8 sur 8.",
    },
    {
      q: "Que compte le record ?",
      a: "Les labyrinthes parfaits d'affilée, c'est-à-dire bouclés dans le nombre de pas le plus court possible.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les labyrinthes sont fabriqués sur l'appareil.",
    },
  ],

  keywords: [
    "labyrinthe en ligne",
    "jeu de labyrinthe enfant",
    "jeu de repérage",
    "labyrinthe gratuit",
    "jeu de logique maternelle",
    "souris et fromage",
  ],
};
