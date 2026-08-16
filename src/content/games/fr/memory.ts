import type { GameCopy } from "../../types";

/**
 * Pilote #1 en francais.
 *
 * Ecrit a partir de `node scripts/brief.mjs fr memory`, jamais a partir de la
 * page anglaise. Les chiffres viennent de `scripts/sim/memory-moves.mjs`; tout
 * le reste est ecrit ici, dans cette langue, avec ses propres exemples.
 *
 * STAGED: not yet wired into `memory.ts`. Adding an `fr:` key to that file's
 * `copy` literal is an excess-property error until `fr` joins PAGE_LOCALES, so
 * French lands as standalone `GameCopy` values first and is referenced on the
 * day of the flip. See `.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md`.
 */
export const memoryFr: GameCopy = {
  name: "Mémoire",
  metaTitle: "Jeu de mémoire gratuit pour enfants | Ellaz",
  metaDescription:
    "Un jeu de mémoire gratuit dans le navigateur, à 6, 8 ou 10 paires. Sans compte, sans publicité, et il marche hors ligne.",

  lede: "Retournez deux cartes. Si elles vont ensemble, elles restent ouvertes. Trois tailles de grille, un record par niveau, et rien à installer.",

  body: [
    "Le jeu tient en une règle, et un enfant de quatre ans la comprend avant la fin du premier tour. Deux cartes se retournent, puis se referment si elles ne vont pas ensemble. Il n'y a pas de texte à lire, pas de bouton à comprendre, pas d'écran qui demande quelque chose avant de jouer.",
    "C'est tout.",
    "La grille facile porte 6 paires, la moyenne 8, la difficile 10. Le record compte les coups, et moins il y en a, mieux c'est. Chaque niveau garde le sien de son côté, parce qu'un score obtenu sur 6 paires ne dit rien de ce que vaut une partie sur 10. Le record reste sur l'appareil. Il ne part nulle part. Personne ici ne sait qui l'a fait.",
    "Nous avons simulé 20 000 parties pour savoir à quoi ressemble une bonne partie. Un joueur qui se souvient de tout finit la grille facile en 9,2 coups; un joueur qui retourne les cartes au hasard en met 36. Sur la grille difficile l'écart devient brutal: 15,6 contre 104,3. Le minimum théorique, lui, ne bouge pas: il vaut exactement le nombre de paires, donc 6, 8 ou 10, et il suppose que vous n'oubliez jamais rien.",
    "Autrement dit, la mémoire ne vous fait pas gagner un peu. Elle divise votre partie par quatre, puis par sept. C'est énorme.",
  ],

  howToPlay: [
    {
      title: "Retourner une carte",
      body: "Appuyez sur une carte face cachée. Elle se retourne et reste ouverte pendant que vous en cherchez une deuxième.",
    },
    {
      title: "Trouver sa jumelle",
      body: "Appuyez sur une deuxième carte. Si les deux vont ensemble, elles restent ouvertes pour de bon. Sinon elles se referment, et c'est à vous de retenir où elles étaient.",
    },
    {
      title: "Vider la grille",
      body: "La partie se termine quand toutes les paires sont ouvertes. Le nombre de coups s'affiche, et s'il bat votre record il devient le nouveau.",
    },
  ],

  tips: [
    {
      title: "Commencez par les coins",
      body: "Les coins et les bords sont plus faciles à situer de mémoire que le milieu de la grille. Ouvrir ces cartes en premier vous donne des repères solides pour la suite.",
    },
    {
      title: "Retenez la place, pas l'image",
      body: "Beaucoup de joueurs essaient de retenir les dessins. La place marche mieux: deuxième rangée, tout à droite. Une position se retrouve. Une image se confond avec sa voisine.",
    },
    {
      title: "Ne vous pressez pas au début",
      body: "Les premiers coups servent à voir, pas à gagner. Une partie où vous ouvrez calmement six cartes inconnues finit presque toujours mieux qu'une partie où vous devinez tout de suite.",
    },
  ],

  teaches: [
    {
      title: "La mémoire de travail",
      body: "Garder en tête où se trouvent quatre ou cinq cartes pendant qu'on en cherche une autre, c'est exactement l'exercice que font les orthophonistes. Ici il se fait tout seul, sans que personne appelle ça un exercice.",
    },
    {
      title: "L'attention qui tient",
      body: "Une grille de 10 paires demande deux ou trois minutes de concentration continue. C'est court pour un adulte et long pour un enfant de cinq ans, et c'est précisément la bonne longueur pour progresser.",
    },
  ],

  ages: [
    {
      title: "À partir de 3 ans",
      body: "La grille facile, à 6 paires, se finit sans savoir lire ni compter. Un adulte peut jouer à côté et nommer les images à voix haute.",
    },
    {
      title: "5 à 8 ans",
      body: "La grille moyenne devient un vrai défi, et le compteur de coups donne une raison de recommencer sans que personne ait à insister.",
    },
    {
      title: "Adultes",
      body: "10 paires en moins de 20 coups, c'est déjà bien. En dessous de 16, vous jouez sérieusement.",
    },
  ],

  accessibility:
    "Tout se joue au doigt, sur de grandes cartes, sans glisser et sans double appui. Les images sont dessinées à plat, avec des formes différentes et pas seulement des couleurs différentes, donc un enfant daltonien les distingue aussi bien. Aucun son n'est nécessaire pour jouer.",

  together: [
    {
      title: "À deux, chacun son tour",
      body: "Un joueur retourne, l'autre regarde. Celui qui trouve une paire rejoue. C'est le jeu de société classique, sur un seul appareil, sans cartes à ramasser sous la table.",
    },
    {
      title: "Le coup dicté",
      body: "L'enfant tient l'écran et un adulte dit où appuyer, sans montrer du doigt. Ça travaille la gauche, la droite et les rangées, et ça rend le jeu bavard, ce qui est bien.",
    },
  ],

  faq: [
    {
      q: "Le jeu de mémoire est-il vraiment gratuit ?",
      a: "Oui, entièrement, et il le restera. Il n'y a pas de version payante, pas de publicité et rien à débloquer.",
    },
    {
      q: "Faut-il créer un compte ?",
      a: "Non. Il n'y a ni inscription, ni adresse e-mail, ni mot de passe. Le record est écrit sur l'appareil et nulle part ailleurs.",
    },
    {
      q: "Est-ce qu'il marche sans connexion ?",
      a: "Oui, après la première visite. Le jeu reste disponible dans le navigateur même en avion ou dans une voiture sans réseau.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Trois ans pour la grille facile. Il n'y a rien à lire, donc un enfant qui ne lit pas encore joue seul.",
    },
    {
      q: "Combien de coups pour une bonne partie ?",
      a: "Sur 6 paires, 9,2 coups est le score d'une mémoire parfaite. Sur 10 paires, c'est 15,6. Si vous approchez de ces chiffres, vous ne devinez plus grand-chose.",
    },
    {
      q: "Sur quels appareils ?",
      a: "Téléphone, tablette et ordinateur. La grille s'adapte à l'écran, à l'endroit comme à l'envers.",
    },
  ],

  keywords: [
    "jeu de mémoire",
    "memory enfant",
    "jeu de paires",
    "cartes retournées",
    "jeu gratuit maternelle",
    "concentration enfant",
  ],
};
