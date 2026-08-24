import type { GameCopy } from "../../types";

/**
 * Ecrit a partir du brief du jeu, jamais depuis la page anglaise : deux pages
 * ecrites depuis le meme brief partagent les faits, deux pages ecrites l'une
 * depuis l'autre partagent la structure, et c'est la structure qui fait un
 * doublon.
 */
export const lettercrossFr: GameCopy = {
      name: "Lettres croisées",
      metaTitle: "Lettres croisées - Jeu de mots gratuit, sans téléchargement",
      metaDescription:
        "Posez des jetons de lettres sur un plateau de 11 sur 11 et formez des mots croisés. Quatre jokers, 94 jetons. Gratuit, sans compte, hors ligne.",
      lede:
        "Lettres croisées est un jeu de jetons qui s'ouvre et se joue tout de suite. Vous recevez huit lettres. Vous posez un mot sur le plateau. Chaque mot suivant doit toucher ce qui s'y trouve déjà.",
      body: [
        "Le plateau fait onze cases sur onze. C'est plus petit que celui que vous imaginez sans doute, et cela change la partie bien plus que ça n'en a l'air : les bords arrivent vite, les cases colorées ne sont jamais loin, et une partie se termine dans le temps dont vous disposez vraiment, pas dans celui qu'un jeu de société suppose.",
        "Il y a 94 jetons. Quatre-vingt-dix sont des lettres et quatre sont des jokers, soit deux fois plus que d'habitude. Un joker prend la lettre que vous voulez. Il ne rapporte aucun point, et il reste le plus souvent le meilleur jeton de la main, parce que la lettre qui vous manque est justement celle qui bloque le mot que vous voyez déjà.",
        "Les mots se posent à l'horizontale ou à la verticale. Deux lettres suffisent. C'est tout.",
        "Quand vous posez des jetons contre des lettres déjà présentes, chaque nouvelle suite de deux lettres ou plus doit également former un vrai mot. C'est la partie qui surprend, et c'est aussi celle qui rend le jeu intéressant plutôt que mécanique.",
        "Le score, ce sont les lettres plus les cases. Une lettre rare vaut 12 points et une lettre courante en vaut un. Certaines cases doublent ou triplent la lettre posée dessus et d'autres multiplient le mot entier, et la case centrale, celle que le premier mot doit traverser, ne multiplie rien du tout.",
        "Le dictionnaire compte 28,515 mots anglais. Il est construit à partir d'une liste du domaine public puis filtré, et le filtrage est voulu : les mots obscurs de deux lettres qui n'existent qu'en compétition n'y sont pas.",
      ],
      howToPlay: [
        {
          title: "Touchez une lettre puis une case",
          body: "Choisissez un jeton sur le chevalet. Touchez l'endroit voulu. Touchez-le à nouveau pour le reprendre. Rien ne se glisse au doigt, donc cela fonctionne pareil sur téléphone, sur tablette et sur ordinateur.",
        },
        {
          title: "Le premier mot passe par le centre",
          body: "Le mot d'ouverture doit couvrir la case centrale. Ensuite, tout ce que vous construisez doit toucher une lettre déjà posée.",
        },
        {
          title: "Appuyez sur jouer quand cela vous convient",
          body: "Le plateau vérifie tous les mots que vos jetons ont formés, y compris ceux de l'autre sens. Si quelque chose n'est pas un mot, les jetons restent en place et le jeu vous dit pourquoi.",
        },
      ],
      tips: [
        {
          title: "Gardez le joker",
          body: "On a envie de dépenser un joker dès qu'il arrive. Gardez-le. Le tour où il vous manque une seule lettre revient souvent, et c'est là que le joker vaut le plus cher.",
        },
        {
          title: "Les mots de deux lettres font tout",
          body: "Poser un mot le long d'un autre marque chaque paire ainsi créée, d'un seul coup. Un mot de cinq lettres posé en parallèle d'un autre peut marquer six mots en un tour.",
        },
        {
          title: "Regardez les cases avant les lettres",
          body: "Une case triple avec une lettre chère dessus vaut mieux qu'un long mot posé n'importe où. Trouvez la case d'abord, cherchez ce qui rentre ensuite.",
        },
      ],
      teaches: [
        {
          title: "De l'orthographe qui sert",
          body: "Ce ne sont pas des exercices. Vous cherchez un mot qui entre dans une forme donnée, ce qui est une opération mentale très différente de celle qu'on vous demande en dictée, et cela reste mieux en tête.",
        },
        {
          title: "Du calcul sans fiche d'exercices",
          body: "Additionner un mot avec une lettre doublée et un mot triplé, c'est du calcul mental pour de bon, et personne ne le vit comme un devoir de maths.",
        },
        {
          title: "Anticiper d'un tour",
          body: "La meilleure case du plateau est souvent une case qu'il vaut mieux ne pas ouvrir. Le remarquer, c'est de la stratégie, et les enfants l'attrapent plus vite que les adultes ne le croient.",
        },
      ],
      ages: [
        {
          title: "Seul à partir de huit ans",
          body: "Un lecteur à l'aise joue seul sans problème. Le niveau facile distribue neuf jetons au lieu de huit, donc plus de choix et moins de tours bloqués.",
        },
        {
          title: "Plus jeune, à côté de quelqu'un",
          body: "Un enfant de cinq ans ne jouera pas à cela tout seul, et nous n'allons pas prétendre le contraire. S'asseoir à côté d'un adulte et chercher ensemble des mots de trois lettres est un vrai bon moment pour les deux.",
        },
        {
          title: "Les adultes, sans s'excuser",
          body: "Ce n'est pas un jeu pour enfants avec un mode adulte ajouté par-dessus. Le niveau difficile distribue sept jetons au lieu de huit, ce qui est réellement plus dur, et le plateau de 11 sur 11 récompense celui qui voit deux tours à l'avance.",
        },
      ],
      accessibility:
        "Chaque jeton est un bouton, accessible au clavier et lisible par un lecteur d'écran. Rien n'exige de glisser ni de maintenir appuyé. Le plateau est fixé de gauche à droite même quand le reste du site est en hébreu, si bien que les mots ne sortent jamais à l'envers.",
      together: [
        {
          title: "Passez le téléphone",
          body: "Jouez chacun votre tour sur le même appareil et notez les scores séparément sur une feuille. Le jeu ne l'impose pas, ce qui vous laisse assouplir les règles pour un plus jeune sans discuter avec le logiciel.",
        },
        {
          title: "Vérifiez avant d'abandonner",
          body: "Quand le plateau refuse un mot, cherchez-le ensemble plutôt que de passer à autre chose. C'est le moment où quelqu'un apprend un mot, et c'est le seul moment que le jeu fabrique exprès.",
        },
        {
          title: "Jouez les cases, pas le score",
          body: "Essayez une manche dont le seul but est de poser un jeton sur chaque case colorée au moins une fois. Cela donne quelque chose à gagner au joueur le plus faible pendant que l'autre court après les points.",
        },
      ],
      faq: [
        {
          q: "Lettres croisées, c'est gratuit ?",
          a: "Oui. Pas de compte, pas de publicité, rien à acheter. Votre meilleur score est enregistré sur votre appareil et n'est envoyé nulle part.",
        },
        {
          q: "Peut-on jouer sans connexion ?",
          a: "Oui. Une fois la page chargée, elle continue de fonctionner hors ligne.",
        },
        {
          q: "Combien de mots le jeu connaît-il ?",
          a: "‏28,515 mots anglais, de deux à six lettres. Ils viennent d'une liste du domaine public et sont filtrés, de sorte que le jeu n'accepte ni les mots que personne ne connaît ni les mots qu'aucun enfant ne devrait voir.",
        },
        {
          q: "Pourquoi onze cases et pas quinze ?",
          a: "Parce qu'une partie plus courte est une partie qu'on termine. Un petit plateau met aussi les cases multiplicatrices à portée presque à chaque tour, ce qui rend une main de lettres ordinaire plus intéressante.",
        },
        {
          q: "Combien vaut un joker ?",
          a: "Rien. Il marque zéro point où que vous le posiez. Cela vaut quand même la peine de le jouer, car il permet de terminer un mot autrement impossible.",
        },
        {
          q: "Le jeu garde-t-il mon score ?",
          a: "Chacun des trois niveaux garde son propre record, parce qu'une main de sept jetons et une main de neuf ne sont pas le même jeu. Il est enregistré sur votre appareil et n'en sort pas.",
        },
      ],
      keywords: [
        "jeu de mots",
        "mots croisés",
        "jetons de lettres",
        "jeu de mots gratuit",
        "jeu de mots en ligne",
        "jeu d'orthographe",
        "mots fléchés",
        "puzzle de mots",
      ],
    };
