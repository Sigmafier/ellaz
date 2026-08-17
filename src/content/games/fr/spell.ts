import type { GameCopy } from "../../types";

/**
 * Ecrit a partir de `node scripts/brief.mjs fr spell`, jamais traduit d'une
 * autre langue de cette page.
 *
 * L'aveu de cette page-ci lui est propre et n'existe dans aucune des trois
 * autres : le jeu fait epeler en hebreu, en anglais ou en espagnol, et pas en
 * francais. Un lecteur francophone doit l'apprendre en haut de la page plutot
 * qu'au bout de trois minutes de jeu.
 */
export const spellFr: GameCopy = {
  name: "Écris le mot",
  metaTitle: "Écris le mot - jeu d'orthographe | Ellaz",
  metaDescription:
    "Une image, et son nom entier à reconstituer lettre par lettre. 67 images, trois niveaux et un indice qui remplit la lettre suivante. Gratuit, sans compte.",

  lede:
    "Une image apparaît et l'enfant reconstitue son nom entier à partir de lettres. Une lettre fausse n'entre jamais dans la case, donc le mot affiché est correct à chaque instant. 67 images, trois niveaux, et un bouton d'indice qui remplit la lettre suivante quand il le faut.",

  body: [
    "Une image. En dessous, une case vide par lettre de son nom. On appuie sur les lettres dans l'ordre. C'est tout.",

    "La lettre fausse est refusée. On appuie dessus, elle tremble, elle pâlit et elle reste où elle était, si bien que la ligne du haut est juste à tout moment où un enfant la regarde. Cette seule décision explique que le jeu tienne à quatre ans et pas à six. Un enfant qui place cinq lettres et s'entend dire ensuite que le mot entier est faux ne reçoit rien dont il puisse se servir, puisque personne ne peut lui montrer laquelle des cinq a péché. Ici l'erreur reçoit sa réponse à la seconde où elle arrive, sur la seule lettre qu'elle concerne, et l'image ne disparaît pas.",

    "Le niveau facile ne pioche que dans les mots courts et ne met aucune lettre en trop : rien à écarter, seulement un ordre à trouver. Cela représente 38 images sur 67 en anglais, 46 en hébreu et 23 en espagnol, l'écart venant de la longueur des mots dans chaque langue. Le moyen ajoute deux lettres intruses et des mots jusqu'à six lettres. Le difficile ouvre la liste entière, jusqu'à un chocolat de neuf lettres, avec quatre intruses sur le plateau.",

    "L'indice remplit la première lettre encore inconnue. On peut appuyer autant de fois qu'il le faut. Il n'est jamais rationné, parce qu'un indice qu'il faut mériter est un indice indisponible à la seconde précise où l'enfant bloque, et un enfant de quatre ans bloqué sans issue ferme l'écran.",

    "L'aveu, et il est de taille pour un lecteur francophone : on épelle ici en hébreu, en anglais ou en espagnol, jamais en français. Les trois alphabets se changent dans le jeu, le français n'en fait pas partie aujourd'hui et rien sur cette page ne le fera apparaître. Le reste est mesuré : un joueur qui appuie complètement au hasard termine un mot facile en 5,9 appuis environ et un mot difficile en 18,2. Le niveau facile est donc proche du hasard pour un enfant qui a cessé de regarder, ce qui est le prix d'un niveau qu'un débutant finit vraiment.",
  ],

  howToPlay: [
    {
      title: "Regarder l'image",
      body: "Le mot n'est écrit nulle part. Sous l'image, une case vide par lettre, donc la longueur du mot est connue avant même la première lettre.",
    },
    {
      title: "Appuyer sur les lettres dans l'ordre",
      body: "La première d'abord. La bonne lettre tombe dans sa case ; la mauvaise tremble et pâlit, et pourra resservir à la lettre suivante, où elle a parfois sa place.",
    },
    {
      title: "Appuyer sur l'indice quand ça bloque",
      body: "Il remplit la première lettre inconnue et rend la main. Les lettres venues d'un indice sont dessinées dans un ton plus pâle, pour voir après coup lesquelles ont été offertes.",
    },
    {
      title: "Changer d'alphabet, pas d'interface",
      body: "Les boutons sous le jeu changent la langue que l'on épelle. Les menus restent dans la langue où ils étaient.",
    },
  ],

  tips: [
    {
      title: "Dire le mot lentement, à voix haute",
      body: "L'étirer. Ba-na-ne. Entendre où un son s'arrête est l'essentiel de l'orthographe à cet âge, et cela sert bien plus que de montrer les lettres du doigt.",
    },
    {
      title: "Commencer en facile même s'il lit",
      body: "Sans lettre intruse, la tâche est un pur ordre à retrouver, ce qui est une compétence différente d'écarter une lettre qui n'a rien à faire là. Un enfant qui lit couramment peut y être lent.",
    },
    {
      title: "Laisser les lettres ennuyeuses à l'indice",
      body: "Une lettre muette ou une double relèvent de la mémoire et non du son. Donner le second r de perro et lui laisser le reste garde le rythme et ne coûte rien.",
    },
    {
      title: "Surveiller la première lettre, pas le record",
      body: "Le moment qui compte, c'est quand il cesse de balayer tout le plateau et va droit à la lettre initiale. La compétence arrive là, des semaines avant que le record ne bouge.",
    },
  ],

  teaches: [
    {
      title: "Du son à la lettre",
      body: "L'enfant entend le mot dans sa tête et cherche la lettre qui fait chaque son. Cette correspondance est le socle de la lecture comme de l'écriture, et elle se travaille ici une lettre à la fois.",
    },
    {
      title: "L'ordre, pas seulement la reconnaissance",
      body: "Connaître toutes les lettres d'un mot et savoir dans quel ordre elles viennent sont deux savoirs distincts. Le niveau facile isole le second entièrement.",
    },
    {
      title: "La longueur d'un mot",
      body: "Les cases vides se voient dès le départ, donc un enfant apprend qu'un mot compte un nombre fixe de lettres avant de savoir les compter lui-même.",
    },
    {
      title: "Un second alphabet sans douleur",
      body: "Épeler la même image dans une autre langue est l'une des entrées les moins coûteuses vers elle, et ici cela tient à un bouton.",
    },
  ],

  ages: [
    {
      title: "Quatre et cinq ans",
      body: "Le niveau facile seulement, avec un adulte qui nomme l'image à voix haute. Il y aura beaucoup d'indices pendant un temps. C'est l'indice qui fonctionne, pas l'enfant qui échoue.",
    },
    {
      title: "Six et sept ans",
      body: "Le niveau moyen est celui qui convient, avec ses deux lettres intruses à écarter. La plupart des enfants commencent alors à refuser l'indice d'eux-mêmes, et il vaut mieux les laisser faire.",
    },
    {
      title: "Huit ans et plus",
      body: "Le difficile, ou le même jeu dans la langue apprise à l'école. Neuf lettres avec quatre intruses sur le plateau, c'est une vraie tâche même pour un adulte dans un alphabet qu'il connaît mal.",
    },
  ],

  accessibility:
    "Chaque lettre est un appui sur une cible d'au moins 52 pixels, et rien ici n'exige de faire glisser, de balayer ni de maintenir le doigt. Aucune horloge, aucune façon de perdre : un enfant qui s'arrête au milieu d'un mot ne perd rien à prendre une minute. Le son reste facultatif : le bouton du haut-parleur dit le mot à voix haute pour qui le veut, et le jeu est entier sans aucun son.",

  together: [
    {
      title: "Nommer l'image avant de commencer",
      body: "Dire ce que c'est. Cela supprime la seule vraie injustice du jeu, une image que l'enfant appelle autrement.",
    },
    {
      title: "Se partager les lettres",
      body: "Vous les impaires, lui les paires. Cela divise par deux l'effort d'un mot long et garde dans la partie un enfant fatigué.",
    },
    {
      title: "Redemander le mot après",
      body: "Une fois le mot formé, cachez l'écran et demandez par quelle lettre il commençait. Se le rappeler quelques secondes plus tard vaut mieux que de l'avoir épelé.",
    },
  ],

  faq: [
    {
      q: "Le jeu d'orthographe est-il gratuit ?",
      a: "Oui, et il n'y a rien à acheter dedans. Sans compte, sans téléchargement, et il continue de marcher hors ligne.",
    },
    {
      q: "Peut-on épeler en français ?",
      a: "Non, pas aujourd'hui. Le jeu fait épeler en hébreu, en anglais ou en espagnol, et ce sont les trois alphabets que les boutons proposent sous le jeu.",
    },
    {
      q: "Mon enfant doit-il déjà savoir lire ?",
      a: "Non. Il doit connaître les lettres et savoir comment s'appelle l'image. Lire un mot entier est ce vers quoi ce jeu mène, pas ce qu'il demande.",
    },
    {
      q: "Et s'il appelle l'image autrement ?",
      a: "Alors sa réponse est juste dans sa tête et fausse à l'écran, et aucun jeu ne peut lui expliquer cet écart. Dites le mot à voix haute avant de commencer. C'est le seul endroit où un adulte change vraiment quelque chose ici.",
    },
    {
      q: "Se servir de l'indice coûte-t-il quelque chose ?",
      a: "Non. Les indices sont comptés pour qu'un adulte voie l'aide qu'une partie a demandée, et le mot compte quand même s'il s'est terminé par un indice. Rien n'est retiré, rien n'est verrouillé.",
    },
    {
      q: "Que mesure le record ?",
      a: "Les mots formés dans une même partie, séparément pour chaque niveau et chaque langue. Il repart à zéro quand une partie commence et ne baisse jamais.",
    },
    {
      q: "Y a-t-il un temps limite ?",
      a: "Il n'y en a pas. Rien ne bouge tout seul à l'écran, et un mot peut rester à moitié formé aussi longtemps qu'il le faut.",
    },
  ],

  keywords: [
    "jeu d'orthographe",
    "apprendre à écrire les mots",
    "jeu de lettres pour enfant",
    "premiers mots",
    "orthographe gratuit",
  ],
};
