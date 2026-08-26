import type { GameCopy } from "../../types";

/**
 * Mots meles, en francais. Ecrit et non traduit. Les quatre versions partagent
 * leurs faits et rien d'autre, parce qu'une traduction garde le rythme de la
 * langue de depart, et que ce rythme est exactement ce qui sonne machine.
 *
 * Tous les chiffres viennent de `scripts/sim/wordsearch-grids.mjs`, qui fait
 * tourner les regles livrees sur 4 000 grilles par niveau et par langue.
 *
 * Les espaces avant les deux-points, les points-virgules, les points
 * d'interrogation et d'exclamation sont des espaces INSECABLES (U+00A0), comme
 * l'exige la typographie francaise. `voice.ts` le verifie.
 */
export const wordsearchFr: GameCopy = {
  name: "Mots mêlés",
  metaTitle: "Mots mêlés gratuits dans le navigateur | Ellaz",
  metaDescription:
    "Une grille de lettres et une liste de mots à retrouver. Touchez la première lettre puis la dernière. Trois tailles de grille, sans compte ni publicité.",

  lede: "Des mots mêlés gratuits, directement dans le navigateur. Une grille de lettres, une liste de mots cachés dedans, et un appui à chaque bout du mot pour le marquer. La liste s'affiche en anglais ou en espagnol, quelle que soit la langue des boutons.",

  body: [
    "On touche la première lettre. Puis la dernière. Le mot se colore. Le glissement du doigt fait pareil, et il n'est jamais obligatoire.",

    "La grille est fabriquée à l'envers de ce qu'on imagine. Le jeu pose d'abord chaque mot de la liste à une vraie position et dans une vraie direction, et ce n'est qu'ensuite qu'il remplit le reste avec des lettres isolées. La liste affichée à côté du plateau est donc exactement l'ensemble des mots qui sont entrés. Un générateur qui sème des lettres puis regarde ce qui en sort finit par donner à un enfant une liste contenant un mot absent, et un enfant ne fait pas la différence entre un mot absent et un mot bien caché. Il cherche encore. Puis il abandonne. Sur 36 000 grilles distribuées, aucune liste n'est sortie plus courte que ce que son niveau réclame et aucune grille n'a dû être jetée puis refaite.",

    "La difficulté bouge trois choses en même temps. La grille passe de 8 à 10 puis à 12 cases de côté, la liste de 6 mots à 8 puis à 10, et les directions autorisées de deux à trois puis aux huit. C'est ce dernier axe qui décide vraiment de la sensation.",

    "Le remplissage compte plus qu'on ne croit. Sur la petite grille, 44,1 pour cent des cases n'appartiennent à aucun mot, et sur la grande on monte à 55,6 pour cent. Ces lettres ne sont pas tirées au hasard uniforme non plus : chaque langue a sa propre table de fréquences, parce qu'une grille pleine de lettres rares fait ressortir les mots posés et il n'y a alors plus rien à chercher. Un mot mesure 6,5 lettres en moyenne sur la grande grille.",

    "L'aveu. Le record ici est le temps, et l'horloge repart où elle s'était arrêtée : une grille laissée en plan pendant le goûter revient avec ses minutes dessus. C'est voulu, sinon chaque partie abandonnée deviendrait un record que personne n'a gagné, mais cela veut dire qu'un bon temps demande de finir d'une traite. Le bouton de reprise remet le compteur à zéro, et c'est la seule façon de repartir proprement.",
  ],

  howToPlay: [
    {
      title: "Choisir la langue des mots",
      body: "Les boutons sous le plateau font passer la liste de l'anglais à l'espagnol. La grille est redistribuée dans cette langue et le reste de l'application ne bouge pas.",
    },
    {
      title: "Repérer la première lettre",
      body: "Lisez un mot de la liste, puis cherchez sa lettre initiale sur le plateau. Un appui la marque d'un anneau de couleur.",
    },
    {
      title: "Toucher l'autre bout",
      body: "Un second appui sur la dernière lettre ferme la ligne. Les deux extrémités doivent être sur une même ligne, une même colonne ou une même diagonale.",
    },
    {
      title: "Se tromper gratuitement",
      body: "Une sélection qui n'est pas un mot fait trembler le plateau et disparaît. Rien ne se bloque, rien n'est retiré, et l'essai suivant part tout de suite.",
    },
    {
      title: "Vider la liste",
      body: "Tous les mots marqués ferment la grille et arrêtent l'horloge. Le record, c'est ce temps, gardé séparément pour chaque taille de grille.",
    },
  ],

  tips: [
    {
      title: "Chercher une lettre, pas un mot",
      body: "Balayez la grille en ne cherchant que l'initiale. Un caractère seul se repère bien plus vite qu'une suite, et c'est une fois l'oeil arrêté qu'on regarde par où ça continue.",
    },
    {
      title: "Les longs mots ont peu de place",
      body: "Un mot de huit lettres sur une grille de 12 sur 12 ne tient qu'à de très rares endroits. C'est donc le moins cher à trouver en premier, et les courts se dénouent presque seuls après.",
    },
    {
      title: "Lire des lignes entières",
      body: "Plutôt que de poursuivre un mot précis, parcourez une ligne d'un bout à l'autre et voyez ce qui saute aux yeux. En facile, chaque mot est sur une ligne ou une colonne.",
    },
    {
      title: "La direction oubliée",
      body: "Quand un mot semble manquer sur la grande grille, il part presque toujours en arrière ou vers le haut. Essayez ces quatre directions avant de tout relire.",
    },
  ],

  teaches: [
    {
      title: "Voir un mot comme une forme",
      body: "Au bout de quelques grilles, l'oeil cesse de lire lettre à lettre et reconnaît le mot entier à sa silhouette. C'est exactement le saut qui transforme le déchiffrage en lecture.",
    },
    {
      title: "Chercher avec méthode",
      body: "On ne couvre pas 144 cases au hasard. Un enfant qui se met à avancer ligne par ligne a appris une manière de chercher, et cela sert bien au-delà du jeu.",
    },
    {
      title: "Deux alphabets",
      body: "Changer la langue de la liste met un lecteur rapide devant une grille qu'il ne reconnaît plus. Il y a 215 mots anglais et 185 espagnols, écrits séparément plutôt que traduits.",
    },
    {
      title: "Tenir dans la durée",
      body: "Un seul mot peut prendre une minute. Aucun compte à rebours, aucune façon de perdre, donc cette minute entraîne la patience et non la précipitation.",
    },
  ],

  ages: [
    {
      title: "5 à 6 ans",
      body: "La grille de 8 sur 8 avec six mots dans deux directions. La moyenne y est de 6 lettres par mot, assez pour le reconnaître et assez court pour finir.",
    },
    {
      title: "7 à 9 ans",
      body: "La grille de 10 sur 10 avec huit mots, et la diagonale descendante entre en jeu. C'est là que relire des lignes ne suffit plus.",
    },
    {
      title: "10 ans et plus",
      body: "La grille de 12 sur 12, dix mots, les huit directions. Plus de la moitié du plateau est du remplissage et l'horloge devient intéressante.",
    },
    {
      title: "Adultes",
      body: "Une grille difficile en moins de deux minutes. Passez ensuite la liste dans une langue que vous ne lisez pas couramment et le même jeu redevient difficile.",
    },
  ],

  accessibility:
    "Chaque case est un vrai bouton qui annonce sa lettre ainsi que sa ligne et sa colonne, et deux appuis suffisent pour n'importe quel mot du jeu. Le glissement du doigt est un raccourci et jamais une obligation, ce qui compte pour une petite main qui vise encore mal et pour les dispositifs de pointage alternatifs. Les touches Entrée et Espace font exactement ce que fait un doigt, donc une grille entière se résout au clavier. Un mot trouvé est marqué par une couleur et par un trait qui le barre dans la liste, si bien que la distinction ne repose jamais sur la seule couleur, et les dix couleurs de marquage sont réparties aussi en clarté. Aucun compte à rebours, aucun son d'erreur : une sélection fausse répond par un petit tremblement, rien de plus.",

  together: [
    {
      title: "Se partager la liste",
      body: "Distribuez les mots avant de commencer. Chacun a les siens, et on voit vite combien de fois une même initiale mène à deux endroits différents.",
    },
    {
      title: "Le dire avant de toucher",
      body: "Celui qui repère un mot annonce d'abord sa direction, et touche seulement ensuite. Un coup d'oeil chanceux devient quelque chose qui s'explique.",
    },
    {
      title: "Jouer dans l'autre langue",
      body: "Changez la liste et recommencez. Un adulte qui lit l'anglais sans effort découvre qu'une grille dans un autre alphabet le ralentit autant qu'un enfant.",
    },
    {
      title: "Course contre la montre",
      body: "Deux personnes résolvent le même niveau et comparent. Les records sont gardés par grille, donc comparer une facile et une difficile n'a aucun sens.",
    },
  ],

  faq: [
    {
      q: "Tous les mots de la liste sont-ils vraiment dans la grille ?",
      a: "Oui, et cela découle de la fabrication. Chaque mot est posé avant qu'une seule lettre de remplissage existe, et la liste correspond exactement à ce qui a été posé.",
    },
    {
      q: "J'ai trouvé un mot ailleurs et il a compté ?",
      a: "Parce qu'il y était vraiment. Les lettres de remplissage écrivent un mot de la liste par hasard environ 7,5 fois sur 10 000 grilles difficiles, et le jeu accepte n'importe quelle occurrence.",
    },
    {
      q: "Peut-on jouer avec des mots anglais ?",
      a: "Oui, avec les boutons sous le plateau. La grille est redistribuée et l'application reste dans votre langue.",
    },
    {
      q: "Faut-il glisser le doigt ?",
      a: "Non. Deux appuis, un à chaque bout, font la même chose, et le clavier aussi.",
    },
    {
      q: "Y a-t-il un indice ?",
      a: "Aucun, volontairement. Un indice permettrait de sauter le balayage, et le balayage est tout le jeu.",
    },
    {
      q: "Que se passe-t-il si je ferme l'onglet ?",
      a: "La grille, les mots déjà marqués et l'horloge vous attendent au retour.",
    },
    {
      q: "Est-ce payant ?",
      a: "Non. La page s'ouvre et on joue, sans inscription et sans publicité.",
    },
  ],

  keywords: ["mots mêlés", "grille de lettres", "jeu de lettres", "chercher des mots", "lecture"],
};
