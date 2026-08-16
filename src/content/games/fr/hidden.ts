import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr hidden`. STAGED. */
export const hiddenFr: GameCopy = {
  name: "Objets cachés",
  metaTitle: "Jeu d'objets cachés gratuit en ligne | Ellaz",
  metaDescription:
    "Retrouvez 3 à 5 objets parmi 16, 24 ou 32. Un cherche-et-trouve gratuit dans le navigateur, sans compte, sans publicité et hors ligne.",

  lede: "Une consigne en image, un tas d'objets, et 3 à 5 choses à retrouver dedans. Chaque tour est fabriqué au moment où il commence.",

  body: [
    "L'écran montre ce qu'il faut trouver, puis un fouillis d'objets par-dessus. On appuie sur les bons. C'est tout. Rien n'est écrit.",
    "Le facile pose 16 objets et en cache 3 à retrouver. Le moyen monte à 24 objets pour 4. Le difficile va à 32 objets pour 5, ce qui remplit l'écran d'un téléphone assez densément pour qu'il faille vraiment chercher plutôt que balayer du regard.",
    "Ce jeu n'a pas de scènes. Rien n'est dessiné à l'avance et rien n'est réutilisé: chaque tour tire ses objets et leurs positions au moment où il démarre, ce qui veut dire qu'un enfant qui a joué cent tours n'a jamais vu deux fois la même image. C'est une différence importante avec un cherche-et-trouve classique, qui s'épuise dès que les images sont connues par coeur. Ici il n'y a rien à apprendre par coeur, donc rien ne s'use.",
    "Le record compte les tours réussis, et chaque niveau garde le sien. Un tour à 32 objets ne se compare pas à un tour à 16. Les deux vivent séparément.",
    "La limite est le revers exact de ce qui précède. Comme les images sont fabriquées et non dessinées, elles ne racontent rien: ce sont des objets posés sur un fond, pas une forêt ni une chambre. Un enfant qui aime les grandes scènes illustrées trouvera celles-ci un peu sèches, et il aura raison. Nous avons échangé la beauté d'une image contre le fait de ne jamais rejouer la même.",
  ],

  howToPlay: [
    {
      title: "Regarder la consigne",
      body: "Les objets à retrouver s'affichent en grand au début du tour. Ils restent visibles en haut de l'écran pendant toute la recherche.",
    },
    {
      title: "Chercher et appuyer",
      body: "Appuyez sur chaque objet demandé au milieu des autres. Un objet trouvé se marque et ne bouge plus.",
    },
    {
      title: "Enchaîner les tours",
      body: "Quand tous les objets sont trouvés, un nouveau tour est fabriqué aussitôt, avec de nouveaux objets et de nouvelles positions.",
    },
  ],

  tips: [
    {
      title: "Cherchez une chose à la fois",
      body: "Retenez un seul objet et balayez tout l'écran pour lui, puis passez au suivant. Chercher 5 objets en même temps est beaucoup plus lent, même si l'inverse paraît évident.",
    },
    {
      title: "Commencez par les bords",
      body: "Les objets posés en bordure sont moins recouverts et se repèrent plus vite. Les trouver d'abord réduit le fouillis pour la suite.",
    },
    {
      title: "Montez de niveau tôt",
      body: "Le facile devient trop simple très vite, parce que 16 objets sur un écran laissent beaucoup d'espace. Passez au moyen dès que deux tours d'affilée sont réussis sans hésiter.",
    },
  ],

  teaches: [
    {
      title: "L'attention sélective",
      body: "Garder une cible en tête pendant que 31 autres choses cherchent à attirer le regard est précisément l'exercice que les tests d'attention utilisent. Ici il se fait en riant.",
    },
    {
      title: "La reconnaissance des formes",
      body: "Un objet partiellement recouvert doit être reconnu à un morceau de sa silhouette. C'est la même compétence qui servira plus tard à reconnaître une lettre mal écrite.",
    },
    {
      title: "Garder plusieurs cibles en tête",
      body: "Au niveau difficile, il faut retenir 5 objets demandés en même temps. C'est de la mémoire de travail au sens strict, et elle se muscle.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le niveau facile, avec 16 objets et 3 à trouver. Aucune lecture n'est nécessaire, puisque la consigne est une image.",
    },
    {
      title: "6 ans et plus",
      body: "Le niveau difficile, à 32 objets. C'est là que le jeu cesse d'être facile pour un adulte aussi.",
    },
    {
      title: "Adultes",
      body: "Le difficile, à 32 objets, prend une bonne minute même en cherchant sérieusement. Il n'a rien d'enfantin.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser, et les objets sont assez grands pour un doigt d'enfant. Rien n'est chronométré: le tour attend aussi longtemps qu'il faut, et une erreur ne coûte rien. Les objets se distinguent par leur forme autant que par leur couleur, et la consigne reste affichée pendant toute la recherche pour ne rien demander à la mémoire.",

  together: [
    {
      title: "Le guide à la voix",
      body: "Un joueur voit l'écran, l'autre lui dit où chercher avec des mots seulement, sans montrer du doigt. En haut à gauche, sous le rond bleu. C'est un excellent exercice de repérage dans l'espace.",
    },
    {
      title: "Le tour partagé",
      body: "Chacun cherche un objet différent de la consigne, en même temps, sur le même écran. Ça va deux fois plus vite et personne n'attend son tour.",
    },
    {
      title: "Le chronomètre de cuisine",
      body: "Deux tours chacun au même niveau, minutés à la main. Comme chaque tour est fabriqué neuf, personne ne peut avoir mémorisé l'image.",
    },
  ],

  faq: [
    {
      q: "Ce jeu d'objets cachés est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien y a-t-il d'objets ?",
      a: "16 objets et 3 à trouver en facile, 24 et 4 en moyen, 32 et 5 en difficile.",
    },
    {
      q: "Les scènes se répètent-elles ?",
      a: "Non. Chaque tour est fabriqué au moment où il commence, avec des objets et des positions tirés au sort, donc la même image ne revient jamais.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. La consigne est une image, pas un mot, et rien d'autre n'est écrit sur l'écran de jeu.",
    },
    {
      q: "Le record est-il gardé par niveau ?",
      a: "Oui, chacun le sien. Le nombre de tours réussis en facile ne se compare pas à celui du difficile.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite. Les tours sont fabriqués sur l'appareil, donc aucune connexion n'est nécessaire.",
    },
  ],

  keywords: [
    "objets cachés",
    "cherche et trouve",
    "jeu d'observation",
    "jeu gratuit enfant",
    "jeu sans téléchargement",
    "attention enfant",
  ],
};
