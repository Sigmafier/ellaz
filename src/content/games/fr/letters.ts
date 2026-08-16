import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr letters`. STAGED. */
export const lettersFr: GameCopy = {
  name: "La première lettre",
  metaTitle: "Jeu de la première lettre des mots | Ellaz",
  metaDescription:
    "Une image, et par quelle lettre commence son nom. 74 images, 2 à 4 choix. Jeu de lecture gratuit, sans compte et jouable hors ligne.",

  lede: "Une image, et 2 à 4 lettres. Par laquelle commence ce mot. 74 images, et les 22 plus simples pour débuter.",

  body: [
    "Une image s'affiche. En dessous, quelques lettres. L'enfant appuie sur la bonne. Rien n'est écrit.",
    "Le niveau facile ne pioche que dans 22 mots, les plus courts et les plus courants, avec 2 lettres proposées seulement. Le moyen passe à 3 choix et le difficile à 4, en ouvrant le réservoir complet de 74 images. La progression porte donc sur deux choses à la fois : la difficulté du mot et le nombre de réponses à écarter.",
    "Le réservoir couvre 19 lettres initiales différentes en français et en anglais, et 23 en espagnol. Ce n'est pas l'alphabet entier, volontairement : certaines lettres ne commencent aucun mot qu'un enfant de quatre ans reconnaît en image, et remplir la liste avec des mots rares transformerait un jeu de sons en un jeu de vocabulaire adulte. Mieux vaut 19 lettres qu'un enfant maîtrise que 26 dont 7 lui sont inconnues.",
    "Rien n'est chronométré et une erreur ne coûte rien. La bonne réponse reste accessible aussitôt.",
    "L'aveu : ce jeu suppose que l'enfant sait comment le mot se dit. Devant l'image d'un panda, il doit penser panda, pas ours. Si un enfant emploie un autre mot que celui attendu, sa réponse sera juste dans sa tête et fausse à l'écran, et il n'y a aucun moyen de le lui expliquer depuis un jeu. Un adulte qui nomme l'image à voix haute règle le problème en une seconde, et c'est pour ce jeu-là que la présence d'un adulte compte le plus.",
  ],

  howToPlay: [
    {
      title: "Regarder l'image",
      body: "Elle s'affiche en grand. Rien d'autre n'est écrit à l'écran que les lettres proposées.",
    },
    {
      title: "Choisir la lettre",
      body: "Appuyez sur la lettre par laquelle commence le nom de l'image. 2, 3 ou 4 lettres selon le niveau.",
    },
    {
      title: "Continuer",
      body: "Une bonne réponse passe à l'image suivante. Une erreur laisse réessayer tout de suite, sans rien perdre.",
    },
  ],

  tips: [
    {
      title: "Dites le mot en détachant le début",
      body: "Pppp, panda. Isoler le son initial à voix haute est exactement ce que font les enseignants, et c'est plus efficace que de regarder les lettres proposées.",
    },
    {
      title: "Commencez par le niveau à 2 choix",
      body: "Avec 22 mots simples et 2 lettres, un enfant réussit souvent et prend confiance. Trois erreurs d'affilée à un niveau supérieur découragent bien plus qu'elles n'apprennent.",
    },
    {
      title: "Nommez l'image avant de choisir",
      body: "La moitié des erreurs viennent d'un mot différent de celui attendu, pas d'une lettre mal reconnue. Dire le mot en premier règle la question.",
    },
  ],

  teaches: [
    {
      title: "La conscience phonologique",
      body: "Entendre le premier son d'un mot et le relier à une lettre est le tout premier pas de la lecture, avant le déchiffrage et avant l'écriture. C'est ce que ce jeu entraîne, et rien d'autre.",
    },
    {
      title: "Nommer précisément",
      body: "Le jeu attend un mot en particulier, donc il pousse à choisir le nom exact de ce qu'on voit. Le vocabulaire s'affine par la contrainte.",
    },
    {
      title: "Écouter avant de lire",
      body: "Détacher le premier son d'un mot est une compétence orale, pas visuelle. Beaucoup d'enfants apprennent ici à entendre quelque chose qu'ils prononçaient déjà.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le facile, avec 22 mots simples et 2 lettres à départager. Un adulte à côté qui nomme les images change tout.",
    },
    {
      title: "5 à 7 ans",
      body: "Le difficile, avec les 74 images et 4 lettres proposées.",
    },
    {
      title: "Adultes",
      body: "Rien à gagner ici pour un adulte, sauf nommer les images et écouter comment l'enfant découpe les mots. C'est très instructif.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grandes cases, sans glisser et sans limite de temps. Les lettres sont écrites en grand et en fort contraste. Une erreur ne produit aucun son désagréable et ne fait rien perdre. Le jeu repose sur le son des mots plutôt que sur la couleur, donc rien n'y dépend de la vision des teintes, mais il suppose que l'enfant connaisse le nom de l'image.",

  together: [
    {
      title: "L'image nommée",
      body: "L'adulte dit le mot à voix haute avant chaque question. Cela supprime d'un coup la principale source d'erreur et laisse l'enfant travailler seulement le son.",
    },
    {
      title: "La chasse à la lettre",
      body: "Après une partie, chercher dans la pièce trois objets commençant par la même lettre. Le passage du jeu au monde réel est ce qui fixe vraiment l'association.",
    },
    {
      title: "Les mots de la maison",
      body: "Choisissez une lettre après la partie et cherchez cinq objets qui commencent par elle. Le jeu prépare, la maison confirme.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de lettres est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien d'images et de lettres ?",
      a: "74 images dans le réservoir complet, dont 22 mots simples au niveau facile, avec 2, 3 ou 4 lettres proposées selon la difficulté.",
    },
    {
      q: "Toutes les lettres de l'alphabet sont-elles couvertes ?",
      a: "Non. 19 lettres initiales en français, et 23 en espagnol. Les lettres qui ne commencent aucun mot reconnaissable en image sont écartées volontairement.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. Il faut reconnaître une lettre et entendre le premier son d'un mot, ce qui vient avant la lecture.",
    },
    {
      q: "Que faire si l'enfant emploie un autre mot ?",
      a: "Nommez l'image à voix haute avant qu'il choisisse. C'est la principale source d'erreur et elle disparaît complètement ainsi.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "première lettre des mots",
    "jeu de lecture enfant",
    "apprendre les sons",
    "conscience phonologique",
    "jeu maternelle gratuit",
    "préparer la lecture",
  ],
};
