import type { GameCopy } from "../../types";

/**
 * Ecrit a partir de `node scripts/brief.mjs fr jigsaw`, jamais depuis la page
 * anglaise : deux pages ecrites depuis le meme brief partagent les faits, deux
 * pages ecrites l'une depuis l'autre partagent la structure, et c'est la
 * structure qui fait un doublon.
 */
export const jigsawFr: GameCopy = {
  name: "Puzzle",
  metaTitle: "Puzzle - jeu d'images à assembler gratuit | Ellaz",
  metaDescription:
    "Puzzle gratuit dans le navigateur pour enfants. Appuyez sur une pièce, appuyez sur sa place, l'image se reconstitue. Six, douze ou vingt pièces. Sans compte.",

  lede: "Un puzzle gratuit, directement dans le navigateur. Vous appuyez sur une pièce du plateau du bas, vous appuyez sur une case de la grille, et la pièce s'y pose. Une mauvaise case l'accepte aussi, et vous pouvez toujours la ressortir. L'image est finie quand chaque pièce est à sa place.",

  body: [
    "Vous appuyez sur une pièce. Vous appuyez sur une case. Voilà.",

    "Ici on ne fait rien glisser, et ce n'est pas de la paresse. La main d'un enfant de quatre ans ne tient pas un tracé continu sur un écran, et celle de quelqu'un qui utilise une entrée alternative non plus. Deux appuis font exactement le même travail et conviennent à tout le monde, donc ce sont deux appuis. On pourra ajouter le glissement par-dessus plus tard, mais il ne remplacera jamais ceci.",

    "Une mauvaise case accepte la pièce. C'est une décision, pas un défaut : essayer une pièce quelque part et voir qu'elle ne va pas, c'est exactement ainsi qu'un puzzle se résout, et refuser le placement en ferait un examen. Combien cela coûte-t-il ? Nous avons lancé 20 000 parties avec un programme qui ne regarde jamais l'image et se souvient seulement de ce qu'il a déjà essayé. Six pièces lui demandent 13,5 poses en moyenne, douze lui en demandent 44,9, et vingt lui en demandent 115,2. Un enfant qui regarde termine en six, douze ou vingt poses exactement. Regarder vaut donc 2,3 fois sur la petite découpe et 5,8 fois sur la grande.",

    "Ce chiffre est sorti deux fois, par deux chemins différents, et c'est pour cela qu'on peut le citer. La simulation a joué le vrai jeu. Le calcul dit que trouver la bonne pièce parmi k en demande (k+1)/2 en moyenne, soit n(n+3)/4 pour la grille entière, ce qui donne 13,5, 45 et 115. Les deux se rejoignent.",

    "Les images sont le dessin principal d'autres jeux du site. Il y en a huit, et c'est l'aveu : un enfant qui résout dix puzzles en reverra une. Nous l'avons choisi exprès, parce qu'un dessin propre à chaque puzzle alourdirait chaque première visite du site, y compris celle de quelqu'un qui n'ouvrira jamais ce jeu.",
  ],

  howToPlay: [
    { title: "Choisir un niveau", body: "Six pièces, douze ou vingt. Changer de niveau distribue aussi une nouvelle image." },
    { title: "Appuyer sur une pièce", body: "Une de celles du plateau, sous la grille. Un contour apparaît autour d'elle." },
    { title: "Appuyer sur une case", body: "La pièce s'y pose, même quand ce n'est pas sa place." },
    { title: "La ressortir", body: "Appuyer sur une pièce déjà posée la renvoie au plateau et vous la met en main." },
    { title: "Échanger", body: "Avec une pièce en main, appuyer sur une case occupée les échange. L'ancienne repart au plateau." },
  ],

  tips: [
    {
      title: "Les coins d'abord",
      body: "Les quatre coins sont les seules pièces à deux côtés plats, donc les plus faciles à reconnaître, et ils fixent l'orientation de tout le reste.",
    },
    {
      title: "Suivez une ligne coupée",
      body: "Une longue ligne du dessin, le bord d'une colline ou d'une table, se prolonge exactement dans la pièce voisine. C'est l'indice le plus fort de la grille.",
    },
    {
      title: "Un aplat de couleur est un indice faible",
      body: "Une pièce entièrement remplie d'une seule couleur de fond va presque partout. Gardez-la pour la fin, quand il ne lui reste que deux cases.",
    },
    {
      title: "Ne sautez pas celui de douze",
      body: "Le jeu à l'aveugle passe de 44,9 poses à 115,2 entre les deux découpes, et cet écart est exactement ce que votre œil doit couvrir. Le niveau moyen est là pour l'apprendre.",
    },
  ],

  teaches: [
    { title: "Raisonnement spatial", body: "Retourner une image dans sa tête et décider où elle va, c'est la capacité que la géométrie demandera plus tard." },
    { title: "Persévérance", body: "Vingt pièces prennent du temps. Une grille qui ne se termine pas en trente secondes apprend à rester." },
    { title: "La partie et le tout", body: "Voir qu'une image est faite de morceaux est l'étape qui précède les fractions." },
    { title: "Corriger sans tout refaire", body: "Une pièce mal posée ne casse rien. On la ressort et on réessaie." },
  ],

  ages: [
    { title: "3 à 4 ans", body: "Six pièces. Résoluble en six poses, et même un programme aveugle termine en 13,5." },
    { title: "5 à 6 ans", body: "Douze. L'image se reconstitue encore à force d'essais, mais regarder commence à payer." },
    { title: "7 ans et plus", body: "Vingt. Il existe 2 432 902 008 176 640 000 façons de les disposer et une seule est l'image." },
    { title: "Adultes", body: "Vingt poses pour vingt pièces, c'est parfait. C'est plus dur qu'il n'y paraît." },
  ],

  accessibility:
    "Un appui par action et aucun glissement nulle part, donc le jeu fonctionne avec des entrées alternatives comme avec une petite main qui vise encore mal. Ce n'est pas une version réduite du puzzle, c'est la seule manière d'y jouer ici. Aucune horloge et aucun compte à rebours, on peut donc s'arrêter au milieu et réfléchir autant qu'on veut. Aucune pose n'est fausse, il n'y a donc pas de son d'erreur ni rien à perdre, et un compteur indique combien de pièces sont déjà à leur place. Chaque case porte sa colonne, sa ligne et la pièce qui l'occupe dans son étiquette, pour qu'un lecteur d'écran les distingue au lieu de lire vingt fois la même chose. On peut jouer en silence complet sans rien perdre.",

  together: [
    { title: "La moitié chacun", body: "L'un prend la ligne du haut, l'autre celle du bas. D'un coup, il faut se parler." },
    { title: "Comptez les poses", body: "Même niveau, deux appareils, et on compte combien il en a fallu. Le minimum possible est le nombre de pièces." },
    { title: "Expliquez le coin", body: "Demandez comment vous saviez que cette pièce était un coin. Un enfant capable de répondre lit déjà l'image." },
    { title: "À l'envers", body: "Défaites une image terminée et remontez-la de la dernière pièce à la première." },
  ],

  faq: [
    {
      q: "Faut-il faire glisser les pièces ?",
      a: "Non, et ce n'est pas possible. Vous appuyez sur une pièce, puis sur une case. Deux appuis font le même travail et conviennent à une petite main comme à une entrée alternative.",
    },
    {
      q: "Que se passe-t-il si je pose une pièce au mauvais endroit ?",
      a: "Rien. Elle y reste jusqu'à ce que vous la ressortiez. Aucun son d'erreur, aucun point retiré, et l'image n'est simplement pas encore terminée.",
    },
    {
      q: "Combien y a-t-il d'images ?",
      a: "Huit, et toutes sont le dessin principal d'autres jeux du site. Après dix puzzles, vous en reverrez une.",
    },
    {
      q: "Que mesure le record ?",
      a: "Le nombre de poses qu'il a fallu pour terminer, et moins il y en a, mieux c'est. Le plancher est le nombre de pièces, soit six, douze ou vingt.",
    },
    {
      q: "Le jeu se souvient-il de ma partie ?",
      a: "Oui. L'image, les pièces déjà placées et ce qui reste au plateau reviennent tels quels, sur cet appareil.",
    },
    {
      q: "Peut-on tourner les pièces ?",
      a: "Ce n'est pas nécessaire. Chaque pièce est déjà dans le bon sens, donc la seule question est de savoir où elle va. Cela retire une étape entière au puzzle d'un enfant de trois ans et laisse la partie qui apprend vraiment quelque chose, lire l'image.",
    },
  ],

  keywords: ["puzzle", "puzzle pour enfants", "image à assembler", "jeu gratuit", "sans téléchargement", "jeu maternelle"],
};
