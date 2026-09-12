import type { GameCopy } from "../../types";

/**
 * Survie Néon, en français, écrit pour son propre lecteur plutôt que traduit.
 *
 * Chaque chiffre vient de `src/games/survivors/logic.ts` - la durée d'une
 * partie, la taille du terrain, les points de vie, les trois vitesses du
 * groupe, les sept améliorations et leur plafond. Rien n'est inventé ici.
 *
 * Le français place une espace insécable avant `: ; ? !`, ce que les trois
 * autres langues ne font pas - voir `voice.ts` § `spacedPunctuation`.
 */
export const survivorsFr: GameCopy = {
  name: "Survie Néon",
  metaTitle: "Survie Néon - Jeu de survie gratuit | Ellaz",
  metaDescription:
    "Votre vaisseau tire tout seul sur la forme la plus proche. Choisissez où vous déplacer, ramassez des gemmes et survivez trois minutes pour gagner.",

  lede:
    "Le vaisseau tire tout seul, toujours sur ce qui est le plus proche, et vous ne décidez que d'une chose : où vous tenir. Survivez trois minutes face à des formes qui arrivent de tous les côtés, et la partie est gagnée.",

  body: [
    "Ici, personne ne vise. Le vaisseau tire de lui-même, toujours sur ce qu'il a de plus proche à portée, et la seule chose qui reste entre vos mains, c'est où vous placer. Ça paraît simple. Ça ne l'est pas.",

    "Le terrain mesure 420 sur 560 unités, assez petit pour que rien ne vous échappe vraiment. Vous commencez avec 3 cœurs. La forme qui atteint votre vaisseau vous coûte un cœur et se détruit en le faisant, si bien que cinq formes arrivant ensemble ne coûtent toujours qu'un seul cœur, pas cinq. Après un coup, vous avez 900 millisecondes pendant lesquelles rien ne peut vous toucher, tout juste de quoi sortir du groupe sans y retourner aussitôt.",

    "Trois types de forme arrivent sur vous. Le triangle est petit et rapide, et meurt en un coup. Le cercle est plus lent et encaisse deux coups. Le losange est le plus grand et le plus lent des trois, et il faut cinq coups avant qu'il n'éclate, donc mieux vaut l'attirer vers un espace dégagé plutôt que de l'affronter là où il vous a rattrapé. Chaque forme qui tombe laisse une gemme, et la gemme est la seule chose que vous poursuivez volontairement.",

    "Calme, Normal et Sauvage changent seulement le groupe qui vous entoure, jamais votre vaisseau. En Calme, le cercle apparaît après 45 secondes et le losange après 75 ; en Sauvage, ils sont déjà là à 18 et à 35. Les formes commencent à arriver toutes les 1150 millisecondes en Calme et toutes les 680 en Sauvage, et cet écart se resserre à mesure que l'horloge tourne, sans jamais descendre sous 320 en Calme ni 165 en Sauvage. Rien de votre propre vaisseau ne change entre les trois, et c'est pour ça que le record est gardé séparément pour chacun : une amélioration gagnée en Sauvage vaut exactement ce qu'elle vaut en Calme.",

    "Ramasser assez de gemmes fait monter votre niveau de puissance. L'horloge s'arrête, et on vous propose trois améliorations parmi sept : tir plus rapide, tir plus fort, un projectile de plus, des jambes plus rapides, une portée de ramassage plus large, un cœur de plus, ou des tirs qui traversent au lieu de s'arrêter. Chacune a un plafond, donc une partie ne devient jamais qu'une seule chose. Survivez les trois minutes en entier et vous gagnez. C'est tout le jeu.",
  ],

  howToPlay: [
    {
      title: "Glisser pour se déplacer",
      body: "Touchez le terrain et glissez le doigt, ou utilisez WASD ou les flèches. Le vaisseau vous suit ; il ne se tourne jamais tout seul vers quoi que ce soit.",
    },
    {
      title: "Il tire tout seul",
      body: "Toutes les 620 millisecondes environ, le vaisseau tire sur la forme la plus proche dans un rayon de 240 unités. Il n'y a aucun bouton de tir dans ce jeu.",
    },
    {
      title: "Esquiver le groupe",
      body: "Les formes arrivent droit sur vous depuis chaque bord. Un coup coûte un cœur ; rester à découvert peut en coûter plusieurs d'un coup.",
    },
    {
      title: "Ramasser les gemmes",
      body: "Une forme qui éclate laisse une gemme. Approchez-vous et elle vient toute seule, attirée depuis un court rayon autour du vaisseau.",
    },
    {
      title: "Choisir une amélioration",
      body: "Assez de gemmes font monter votre niveau de puissance. L'horloge s'arrête, trois cartes apparaissent, et vous en choisissez une avant que quoi que ce soit ne rebouge.",
    },
  ],

  tips: [
    {
      title: "Ne restez pas dans un coin",
      body: "Les formes arrivent de tous les bords à la fois, donc un coin vous enferme entre deux murs au lieu d'aucun. Le tiers central du terrain laisse le plus de place pour s'échapper.",
    },
    {
      title: "Gardez le losange pour la fin",
      body: "Un losange encaisse cinq coups et se déplace le plus lentement des trois, donc c'est rarement lui qui vous tue. C'est le triangle derrière lui, pendant que votre tir est occupé ailleurs.",
    },
    {
      title: "Prenez le cœur en plus tôt en Sauvage",
      body: "Le groupe en Sauvage se resserre jusqu'à une forme toutes les 165 millisecondes, et une seule erreur y rapproche plus de la fin que la même erreur en Calme.",
    },
    {
      title: "L'amélioration de portée se rentabilise seule",
      body: "Une portée de ramassage plus large veut dire moins d'allers-retours pour ce qu'un losange a laissé, et moins d'allers-retours, c'est moins de temps immobile pendant que le groupe cherche où vous êtes.",
    },
  ],

  teaches: [
    {
      title: "Lire un groupe plutôt qu'une cible",
      body: "Il n'y a rien à viser, donc toute l'habileté consiste à décider quelle direction est la plus dégagée maintenant, et ça change à chaque seconde.",
    },
    {
      title: "Décider sous pression",
      body: "Trois cartes d'amélioration, l'horloge arrêtée, et une décision qui façonne le reste de la partie. Il n'y a pas de retour en arrière une fois l'horloge relancée.",
    },
    {
      title: "Composer avec un plafond",
      body: "Chaque amélioration a une limite, de deux cœurs en plus à six améliorations de vitesse, donc une partie doit toujours devenir plus qu'une seule chose.",
    },
    {
      title: "Perdre sans drame",
      body: "Une partie qui se termine après quatre-vingt-dix secondes et une autre qui se termine après deux minutes et demie sont la même sorte de fin, et aucune des deux n'est un échec à corriger avant de recommencer.",
    },
  ],

  ages: [
    {
      title: "6 à 8 ans",
      body: "Calme, où une forme qu'on peut faire éclater prend plus d'une seconde, et le groupe ne demande jamais plus d'une direction à la fois.",
    },
    {
      title: "9 à 11 ans",
      body: "Normal, où le cercle et le losange arrivent tous les deux avant la moitié de la partie, et choisir une amélioration commence vraiment à compter.",
    },
    {
      title: "12 ans et plus",
      body: "Sauvage dès le départ. Une forme toutes les 680 millisecondes qui se resserre jusqu'à 165 est le moment où le jeu cesse d'être une question d'attention pour devenir une question de décision rapide.",
    },
    {
      title: "Adultes",
      body: "Sauvage, et le record gardé séparément par niveau empêche de prétendre qu'une partie en Calme et une partie en Sauvage mesurent la même chose.",
    },
  ],

  accessibility:
    "Le vaisseau se dirige en glissant le doigt n'importe où sur le terrain, avec les flèches, avec WASD, ou avec la croix directionnelle à l'écran, et les quatre méthodes se valent totalement. Le vaisseau tire tout seul, donc rien n'a besoin d'être visé et il n'y a aucun bouton de tir. Un bouton de pause reste affiché en permanence. Les trois formes ennemies se distinguent par leur taille et leur contour, pas seulement par leur couleur, et on peut jouer entièrement en silence.",

  together: [
    {
      title: "On passe la main au premier coup",
      body: "Cédez le vaisseau dès qu'un cœur disparaît, pas quand la partie se termine. Ainsi personne ne garde les trois minutes entières pour lui, et tout le monde arrive à la partie intéressante.",
    },
    {
      title: "Un pilote, un chronomètre",
      body: "L'un tient le vaisseau, l'autre annonce combien il reste sur les trois minutes. Ça change ce qui semble urgent.",
    },
    {
      title: "On joue le niveau, pas le record",
      body: "Jouez deux fois de suite le même niveau et comparez qui a survécu le plus longtemps, plutôt que de courir après le chiffre déjà affiché.",
    },
    {
      title: "On devine l'amélioration ensemble",
      body: "Avant que les cartes n'apparaissent, mettez-vous d'accord à voix haute sur celle des sept que vous prendriez. Vous ne serez pas toujours d'accord, et c'est ça qui est amusant.",
    },
  ],

  faq: [
    {
      q: "Survie Néon est-il gratuit ?",
      a: "Oui, entièrement gratuit : pas de compte, pas de publicité, rien à acheter. Il fonctionne aussi hors ligne, une fois la page chargée une première fois.",
    },
    {
      q: "Comment je dirige le vaisseau ?",
      a: "Glissez le doigt n'importe où sur le terrain, utilisez les flèches ou WASD, ou touchez la croix directionnelle à l'écran. Toucher deux fois la même flèche vous arrête.",
    },
    {
      q: "Est-ce que je vise ou je tire moi-même ?",
      a: "Non. Votre vaisseau tire tout seul sur la forme la plus proche à sa portée. Tout ce que vous faites ne fait que déplacer le vaisseau.",
    },
    {
      q: "Combien de temps dure une partie ?",
      a: "Trois minutes exactement. Arriver au bout, c'est gagner, quel que soit le niveau choisi.",
    },
    {
      q: "Que se passe-t-il quand une forme m'atteint ?",
      a: "Vous perdez un cœur et la forme se détruit en le faisant, donc un groupe entier arrivant ensemble ne coûte toujours qu'un cœur. Ensuite vous avez 900 millisecondes pendant lesquelles rien ne peut vous toucher.",
    },
    {
      q: "Quelle est la différence entre Calme, Normal et Sauvage ?",
      a: "Seulement le groupe. Le cercle et le losange arrivent plus tôt et les formes arrivent plus vite dans les niveaux difficiles, mais votre vaisseau est identique dans les trois.",
    },
    {
      q: "Comment le record est-il mesuré ?",
      a: "En formes détruites, gardé séparément pour Calme, Normal et Sauvage, parce qu'une partie chargée en Sauvage et une partie tranquille en Calme ne sont pas le même exploit.",
    },
    {
      q: "Que font les améliorations ?",
      a: "Sept en tout : tir plus rapide, tir plus fort, un projectile de plus, des jambes plus rapides, une portée de ramassage plus large, un cœur de plus, et des tirs qui traversent une forme au lieu de s'arrêter. Chacune a un plafond, donc une partie ne devient jamais qu'une seule chose.",
    },
  ],

  keywords: [
    "jeu de survie",
    "tir automatique",
    "jeu d'arène",
    "jeu de navigateur",
    "roguelite",
    "esquiver des tirs",
  ],
};
