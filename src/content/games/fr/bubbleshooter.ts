import type { GameCopy } from "../../types";

/**
 * Écrit à partir de `node scripts/brief.mjs fr bubbleshooter`, jamais depuis la
 * page anglaise.
 *
 * Les espaces avant `: ; ? !` sont des espaces INSÉCABLES (U+00A0), posées
 * mécaniquement plutôt qu'à la main : la faute typique n'est pas de toutes les
 * oublier, c'est d'en oublier une seule, et l'incohérence est précisément ce
 * qu'un lecteur francophone remarque en premier.
 */
export const bubbleshooterFr: GameCopy = {
  name: "Tir à bulles",
  metaTitle: "Tir à bulles - jeu gratuit dans le navigateur | Ellaz",
  metaDescription:
    "Visez, faites rebondir sur un mur et faites éclater trois bulles de la même couleur. Jeu gratuit dans le navigateur, trois niveaux, sans compte et hors ligne.",

  lede: "Un jeu de tir à bulles gratuit qui tourne dans le navigateur. Vous visez, vous tirez, et trois bulles de la même couleur éclatent. Ce qui pendait en dessous tombe, et une bulle qui tombe vaut le double d'une bulle qui éclate.",

  body: [
    "Visez un trou, tirez, et trois bulles de la même couleur disparaissent. Vous connaissez déjà ce jeu. Ce que vous ignorez sans doute, c'est la part de la grille qui se cache derrière un mur.",
    "Une grille facile s'ouvre sur 38 bulles, réparties en 4 rangées et 4 couleurs. Le niveau moyen, c'est 48 bulles sur 5 rangées, le difficile 57 sur 6, et chaque couleur ajoutée rend un groupe de trois d'autant plus rare. Le plafond sert d'horloge. Il descend d'une rangée toutes les 12 balles en facile, toutes les 9 en moyen et toutes les 6 en difficile, si bien qu'en ne faisant éclater strictement rien vous auriez 96 tirs en facile et 36 en difficile avant que les bulles n'atteignent la ligne du bas. Faire éclater est la seule chose qui rachète cette place.",
    "Nous avons mesuré les murs, et la première réponse a été zéro. Zéro exception. En tirant 121 angles sur 40 grilles de départ par niveau, chaque emplacement atteint par un tir avec rebond était aussi atteignable en ligne droite. Une grille pleine n'a pas d'ombre. Quarante tirs plus tard, tout change : sur une grille déjà jouée, entre un et quatre des quinze emplacements encore accessibles se trouvent derrière un mur, et nulle part ailleurs.",
    "Nous avons ensuite écrit un robot pour savoir combien de temps tient une partie. Il fait éclater dès qu'il le peut, et sinon il colle la bulle contre une bulle de sa couleur, ce que fait à peu près un joueur au bout de dix minutes. En facile et en moyen il n'a jamais perdu : 300 tirs, vingt parties par niveau, et il tenait encore quand nous l'avons arrêté. Le difficile est un autre jeu. Là, la partie médiane est morte au bout de 58 tirs, et 5 parties sur 20 seulement ont vidé une grille. Si le difficile vous semble injuste, c'est le niveau et pas vous.",
    "Videz toutes les bulles et une nouvelle grille arrive, votre score intact. C'est la seule fin heureuse.",
  ],

  howToPlay: [
    {
      title: "Viser",
      body: "Appuyez sur la grille sans relâcher, ou déplacez la souris. Une ligne pointillée trace la trajectoire, rebonds compris, et un anneau marque la case exacte où la bulle finira.",
    },
    {
      title: "Tirer",
      body: "Relevez le doigt. Au clavier, les flèches déplacent la visée et la barre d'espace tire ; les deux boutons sous la grille font exactement la même chose.",
    },
    {
      title: "En réunir trois",
      body: "Trois bulles de la même couleur qui se touchent éclatent. Deux, non. La deuxième que vous posez est donc un placement d'avance.",
    },
    {
      title: "Couper l'appui",
      body: "Chaque bulle pend du plafond par ses voisines. Cassez la chaîne et tout ce qui est en dessous tombe, à 20 points la bulle tombée contre 10 pour une bulle éclatée.",
    },
    {
      title: "Surveiller la ligne",
      body: "Le trait rouge pointillé du bas marque la fin de la partie. Une bulle qui s'y arrête, ou en dessous, termine le jeu.",
    },
  ],

  tips: [
    {
      title: "Tirez dans le mur exprès",
      body: "Le trou coincé sous une avancée n'a aucune ligne droite qui y mène, et un tir qui frôle le mur arrive sous un angle qu'aucun tir direct n'obtient. C'est la seule adresse de ce jeu qu'un casse-tête sur grille ne demande pas.",
    },
    {
      title: "La rangée du haut est le levier",
      body: "Les bulles collées au plafond portent tout ce qui se trouve dessous. Un seul tir bien placé là-haut fait tomber une douzaine de bulles que vous n'avez pas touchées.",
    },
    {
      title: "Collez d'abord, éclatez ensuite",
      body: "Quand rien n'éclate, ne jetez pas la bulle dans le premier trou venu. Posez-la contre sa couleur. Le robot qui s'est mis à faire cela est passé de 17 tirs avant de mourir en difficile à 58.",
    },
    {
      title: "Raccourcissez les côtés",
      body: "La grille atteint la ligne par son point le plus bas, et c'est presque toujours une colonne du bord. Nettoyer les bords achète plus de temps que nettoyer le centre.",
    },
    {
      title: "Le lanceur est honnête",
      body: "Il ne donne qu'une couleur encore présente sur la grille. Aucun tir n'est donc perdu d'avance, et recevoir une couleur inutilisable n'arrive jamais ici.",
    },
  ],

  teaches: [
    {
      title: "Les angles",
      body: "Le rebond est une réflexion, et quelques centaines de tirs l'enseignent mieux qu'un schéma. Visez haut sur le mur et le tir retombe court.",
    },
    {
      title: "Les conséquences",
      body: "Une bulle posée maintenant décide de ce qui sera possible trois tirs plus loin. C'est le vrai sujet du jeu, et les enfants le saisissent sans qu'on le leur dise.",
    },
    {
      title: "Compter jusqu'à trois",
      body: "Le seuil est trois, toujours, à tous les niveaux. Un enfant de quatre ans garde cette règle en tête tout en faisant autre chose.",
    },
    {
      title: "La patience sous une horloge",
      body: "Le plafond descend quoi que vous fassiez. Un tir précipité et un tir réfléchi coûtent donc exactement pareil, ce qui est bon à découvrir.",
    },
  ],

  ages: [
    {
      title: "4 à 5 ans",
      body: "Facile, et sans parler de score. Quatre couleurs et une rangée neuve seulement toutes les 12 balles laissent à un petit enfant de quoi rater beaucoup et voir quand même des bulles éclater.",
    },
    {
      title: "6 à 8 ans",
      body: "Facile puis moyen. C'est là que le rebond contre le mur se comprend, d'abord par accident le plus souvent.",
    },
    {
      title: "9 ans et plus",
      body: "Moyen, puis difficile quand le moyen cesse de finir. Notre robot a vidé 79 grilles en 20 parties de niveau moyen, et 5 seulement en 20 parties difficiles.",
    },
    {
      title: "Les adultes",
      body: "Difficile. Six couleurs sur 57 bulles avec une rangée qui descend toutes les 6 balles, c'est un vrai combat, et le score y compte plus que la survie.",
    },
  ],

  accessibility:
    "Chaque bulle porte une forme en plus d'une couleur : un point, un anneau, un triangle, une étoile, un losange ou une croix. C'est une décision et non un ornement, car environ un garçon sur douze ne sépare pas ici le rouge du vert, et un jeu d'appariement qui reposerait sur la seule teinte ne serait pas difficile pour lui, il serait impraticable. Tout le jeu se joue au clavier, les flèches déplaçant la visée et la barre d'espace tirant, et les deux boutons sous la grille rendent le même service à qui ne peut pas tenir un doigt immobile sur une cible qui bouge. Rien n'est chronométré, et la ligne de visée montre où le tir arrivera avant qu'il ne coûte quoi que ce soit.",

  together: [
    {
      title: "Annoncer le tir",
      body: "L'un désigne le trou, l'autre vise. Rater est plus drôle quand la cible a été choisie par quelqu'un d'autre.",
    },
    {
      title: "Un tir chacun",
      body: "À tour de rôle. Un jeu silencieux devient une discussion sur l'appui à couper, et c'est la bonne sorte de discussion.",
    },
    {
      title: "Rien que des bandes",
      body: "Décidez que chaque tir doit toucher un mur avant tout le reste. Les scores s'effondrent et la géométrie rentre pour de bon.",
    },
    {
      title: "Deviner la chute",
      body: "Avant un tir qui coupe un appui, chacun annonce combien de bulles vont tomber. Le score dira qui avait raison.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de bulles est-il gratuit ?",
      a: "Oui, et il n'y a rien à acheter dedans. Pas de compte, aucun téléchargement et aucune publicité.",
    },
    {
      q: "Faut-il installer quelque chose ?",
      a: "Non. Le jeu tourne dans le navigateur sur téléphone, tablette ou ordinateur. Ajouter le site à l'écran d'accueil permet aussi d'y jouer hors ligne.",
    },
    {
      q: "Comment gagne-t-on ?",
      a: "En vidant la grille de toutes ses bulles. Une nouvelle grille arrive alors et le score est conservé, si bien qu'une longue partie est une pile de grilles vidées plutôt qu'une fin.",
    },
    {
      q: "Combien y a-t-il de couleurs ?",
      a: "Quatre en facile, cinq en moyen et six en difficile. Le lanceur ne propose qu'une couleur encore présente sur la grille.",
    },
    {
      q: "Pourquoi ces bulles sont-elles tombées sans éclater ?",
      a: "Elles pendaient de celles que vous avez fait éclater. Tout ce qui n'est plus relié au plafond tombe, et chacune de ces bulles vaut 20 points contre 10 pour une bulle éclatée.",
    },
    {
      q: "Peut-on faire rebondir un tir sur le mur ?",
      a: "Oui, et sur une grille trouée certains emplacements ne s'atteignent pas autrement. La ligne de visée dessine le rebond à l'avance.",
    },
    {
      q: "La partie est-elle sauvegardée ?",
      a: "Oui. Quittez au milieu d'une grille et elle vous attend là où vous l'avez laissée, sur cet appareil, avec le score et le compte de tirs.",
    },
    {
      q: "Est-ce adapté à un enfant de quatre ans ?",
      a: "En facile, oui. Il n'y a rien à lire, les cibles sont grandes, et les formes portées par les bulles font que la vision des couleurs n'est pas requise.",
    },
  ],

  keywords: ["tir à bulles", "bulles", "arcade", "visée", "couleurs", "classique"],
};
