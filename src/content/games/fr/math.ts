import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr math`. STAGED. */
export const mathFr: GameCopy = {
  name: "Calcul",
  metaTitle: "Jeu de calcul mental gratuit, 7 niveaux | Ellaz",
  metaDescription:
    "Compter, additionner, soustraire, multiplier: 7 niveaux du dénombrement aux tables. Jeu de calcul gratuit, sans compte et hors ligne.",

  lede: "Sept niveaux, de compter jusqu'à 10 aux tables jusqu'à 5 fois 5. Trois réponses proposées, une seule juste, et rien à écrire.",

  body: [
    "Une question, 3 réponses, un appui. C'est tout. Le premier niveau demande de compter des objets jusqu'à 10, le dernier des multiplications jusqu'à 5 fois 5, et entre les deux il y a la reconnaissance de quantités, les images à dénombrer, puis les additions et soustractions jusqu'à 5, puis 10, puis 20.",
    "Avec 3 réponses proposées, un enfant qui appuie au hasard a raison une fois sur trois, soit 33,3%. Ce n'est pas un défaut. C'est un choix. Un enfant qui doit saisir un nombre au clavier passe la moitié de son temps à chercher les touches, et les tout-petits abandonnent avant d'avoir fait un seul calcul. Trois grosses réponses lisibles laissent toute l'attention sur la question. Et si un enfant réussit vingt questions d'affilée, personne au monde ne croit qu'il a eu de la chance vingt fois.",
    "Le niveau de reconnaissance de quantités s'arrête à 6 et pas plus haut, pour une raison précise: les groupes d'objets servent eux-mêmes de boutons de réponse, et personne ne distingue un groupe de 7 d'un groupe de 8 d'un simple coup d'oeil. Au-delà de 6, l'enfant se met à compter au lieu de reconnaître, ce qui est un autre exercice et il existe déjà à côté.",
    "L'équation reste écrite de gauche à droite, dans les 2 sens de lecture du site, parce qu'un calcul se note ainsi partout. Partout, sans exception.",
    "L'aveu honnête: ce jeu ne remplace rien. Il entraîne la rapidité sur des calculs qu'un enfant sait déjà poser, et il ne lui apprendra pas pourquoi 7 plus 5 font 12. Cette explication vient d'un adulte, avec des objets sur une table. Ce que le jeu apporte ensuite, c'est la répétition, qui est ennuyeuse à faire sur une feuille et supportable ici.",
  ],

  howToPlay: [
    {
      title: "Choisir un niveau",
      body: "7 niveaux vont du dénombrement aux multiplications. Prenez-en un plus bas que ce que vous croyez: la vitesse compte autant que la difficulté.",
    },
    {
      title: "Lire la question",
      body: "Elle s'affiche en grand, en chiffres ou en images selon le niveau. Rien d'autre n'est écrit à l'écran.",
    },
    {
      title: "Appuyer sur la bonne réponse",
      body: "3 réponses sont proposées. Une erreur ne coûte rien: la question reste, et l'enfant réessaie tout de suite.",
    },
  ],

  tips: [
    {
      title: "Descendez d'un niveau",
      body: "Un enfant qui hésite sur chaque question n'apprend rien, il souffre. Le bon niveau est celui où 8 réponses sur 10 tombent sans réfléchir, et où c'est la vitesse qui progresse.",
    },
    {
      title: "Les additions à 10 avant tout",
      body: "Savoir instantanément que 6 et 4 font 10 est la base de tout le calcul mental qui suivra. Ce niveau mérite plus de temps que les autres, et de loin.",
    },
    {
      title: "Des séances courtes",
      body: "5 minutes tous les jours valent mieux qu'une demi-heure le dimanche. C'est vrai de toutes les tables de multiplication depuis toujours, et un écran n'y change rien.",
    },
  ],

  teaches: [
    {
      title: "Le calcul automatique",
      body: "L'objectif n'est pas de savoir calculer, c'est de ne plus avoir à le faire. Un enfant qui répond 12 sans passer par ses doigts a libéré la place mentale nécessaire aux problèmes plus grands.",
    },
    {
      title: "La quantité avant le chiffre",
      body: "Les premiers niveaux montrent des objets plutôt que des symboles. Un enfant qui voit 5 canards avant de voir le chiffre 5 comprend ce que le chiffre représente.",
    },
    {
      title: "Accepter de se tromper",
      body: "Une erreur laisse la question à l'écran et n'enlève rien. Un enfant qui n'a rien à perdre essaie, ce qui est le contraire de ce que produit une feuille corrigée en rouge.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Compter jusqu'à 10 et reconnaître des quantités jusqu'à 6. Aucune lecture n'est nécessaire.",
    },
    {
      title: "6 à 8 ans",
      body: "Additions et soustractions jusqu'à 20, qui couvrent le programme des premières années d'école.",
    },
    {
      title: "9 ans et plus",
      body: "Les multiplications jusqu'à 5 fois 5, pour la vitesse plus que pour la découverte.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grands boutons, sans glisser et sans clavier. Le calcul est écrit de gauche à droite quelle que soit la langue de l'interface. Une erreur ne produit aucun son désagréable et ne fait rien perdre, donc un enfant qui appuie à côté ne subit rien. Les premiers niveaux ne demandent aucune lecture.",

  together: [
    {
      title: "L'adulte qui se trompe",
      body: "Un adulte joue et donne volontairement une mauvaise réponse de temps en temps. L'enfant corrige, ce qui est infiniment plus efficace que d'être corrigé.",
    },
    {
      title: "La course des 10 questions",
      body: "Chacun 10 questions au même niveau, on compte les réussites. Les écarts sont plus petits qu'on ne croit dès que l'adulte joue vite.",
    },
    {
      title: "Le calcul du quotidien",
      body: "Après une partie, comptez à voix haute les assiettes sur la table ou les marches de l'escalier. Le lien entre l'écran et le réel est ce qui fait tenir l'apprentissage.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de calcul est-il gratuit ?",
      a: "Oui, les 7 niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Quels calculs sont couverts ?",
      a: "Compter jusqu'à 10, reconnaître des quantités jusqu'à 6, dénombrer des images, additionner et soustraire jusqu'à 5, 10 puis 20, et multiplier jusqu'à 5 fois 5.",
    },
    {
      q: "Pourquoi seulement 3 réponses proposées ?",
      a: "Pour qu'un enfant de trois ans puisse jouer sans clavier. Le hasard vaut 33,3%, mais une série de bonnes réponses ne s'explique pas par la chance.",
    },
    {
      q: "Pourquoi les quantités s'arrêtent-elles à 6 ?",
      a: "Parce que les groupes d'objets servent de boutons, et qu'un groupe de 7 ne se distingue pas d'un groupe de 8 d'un coup d'oeil.",
    },
    {
      q: "Faut-il un compte ?",
      a: "Non, ni compte, ni adresse e-mail. Le record est écrit sur l'appareil.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les questions sont fabriquées sur l'appareil.",
    },
  ],

  keywords: [
    "jeu de calcul mental",
    "additions enfant",
    "tables de multiplication",
    "apprendre à compter",
    "jeu de maths gratuit",
    "calcul CP",
  ],
};
