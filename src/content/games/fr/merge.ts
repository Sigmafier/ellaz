import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr merge`. STAGED. */
export const mergeFr: GameCopy = {
  name: "Fusion d'animaux",
  metaTitle: "Jeu de fusion d'animaux, gratuit | Ellaz",
  metaDescription:
    "Réunissez deux chenilles pour faire un papillon, et montez 14 étages jusqu'au dragon. Gratuit dans le navigateur, sans compte et hors ligne.",

  lede: "Deux chenilles font un papillon. Quatorze étages plus haut, il y a un dragon. Il coûte 8 191 fusions.",

  body: [
    "Appuyez sur deux créatures voisines identiques, elles se réunissent et donnent la suivante. C'est tout ce qu'il faut savoir pour commencer.",
    "L'échelle compte 14 étages. Un papillon, c'est 4 chenilles. Une grenouille, 8. Un manchot, 64. Un dragon tout en haut vaut 8 192 chenilles, soit 8 191 fusions et 212 992 points. Personne n'y va par accident.",
    "Nous avons fait jouer 150 parties simulées pour savoir à quel point ce jeu est calme, et la réponse est: complètement. Aucune de ces 150 parties ne s'est terminée faute de coup possible. Le plateau de 5 sur 5 ne subit aucune pression du tout, et les plateaux de 4 sur 4 ne se bloquent que dans un cas très précis, avec trois créatures du plus haut étage présentes en même temps. Un enfant de quatre ans ne perd donc jamais à ce jeu, ce qui est exactement ce que nous voulions: la seule chose qui peut arriver est de s'arrêter parce qu'on a fini de jouer.",
    "Les premiers étages arrivent vite et les derniers coûtent cher. Une première grenouille demande 18 appuis en facile, 13 en moyen et 50 en difficile. Un premier lion demande 1 530, 1 010 et 3 136. Une baleine a coûté 12 282 appuis sur le plateau calme.",
    "L'aveu: ce jeu n'a pas de fin atteignable. 12 282 appuis pour une baleine, c'est plusieurs heures de jeu réparties sur des semaines, et le dragon est hors de portée pour presque tout le monde. Un enfant qui vise le haut de l'échelle sera déçu, et le bon usage de ce jeu est de le regarder comme un bac à sable où les animaux apparaissent, pas comme une course.",
  ],

  howToPlay: [
    {
      title: "Trouver deux jumelles",
      body: "Deux créatures identiques placées côte à côte peuvent être réunies. Rien n'est chronométré.",
    },
    {
      title: "Les réunir",
      body: "Appuyez dessus. Elles disparaissent et laissent la créature de l'étage au-dessus.",
    },
    {
      title: "Monter l'échelle",
      body: "14 étages se succèdent, de la chenille au dragon. Une nouvelle créature apparaît après chaque fusion sur les petits plateaux.",
    },
  ],

  tips: [
    {
      title: "Fusionnez vers un coin",
      body: "Décidez que les grosses créatures vivent en bas à droite et poussez toujours dans ce sens. Le plateau reste lisible et les jumelles se trouvent bien plus vite.",
    },
    {
      title: "Ne cassez pas une paire en formation",
      body: "Deux créatures séparées par une seule case valent mieux qu'une fusion immédiate ailleurs. Un peu de patience remplace beaucoup d'appuis.",
    },
    {
      title: "Le grand plateau pour découvrir",
      body: "Le plateau de 5 sur 5 ne se bloque jamais et ne met aucune pression. C'est celui où l'on monte le plus haut dans l'échelle, tranquillement.",
    },
  ],

  teaches: [
    {
      title: "Le doublement",
      body: "Chaque étage vaut deux fois le précédent, donc atteindre le sommet demande de doubler 13 fois. C'est une idée mathématique puissante, rencontrée ici comme une suite d'animaux.",
    },
    {
      title: "Le rangement comme stratégie",
      body: "Un plateau en désordre a autant de créatures qu'un plateau rangé et bien moins de possibilités. Comprendre ça est le vrai saut de niveau de ce jeu.",
    },
    {
      title: "Compter sans compter",
      body: "Savoir qu'un manchot vaut 64 chenilles alors que rien ne l'affiche est une intuition du doublement. Elle prépare les puissances bien avant l'école.",
    },
  ],

  ages: [
    {
      title: "3 à 6 ans",
      body: "Le grand plateau, sans pression et sans possibilité de perdre. Aucune lecture n'est nécessaire.",
    },
    {
      title: "7 ans et plus",
      body: "Les petits plateaux, où de nouvelles créatures apparaissent à chaque fusion et où la place se gère vraiment.",
    },
    {
      title: "Adultes",
      body: "Un jeu de fond, à reprendre par tranches de cinq minutes. La baleine à 12 282 appuis est un objectif de plusieurs semaines.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser et sans limite de temps. Les créatures se distinguent par leur silhouette autant que par leur couleur, donc un enfant daltonien suit l'échelle sans difficulté. Sur le grand plateau il est impossible de perdre, ce qui en fait l'un des jeux les plus reposants du site. Rien n'est écrit à l'écran.",

  together: [
    {
      title: "Le prochain animal",
      body: "Avant chaque fusion, l'adulte demande quelle créature va sortir. L'enfant apprend l'échelle par coeur en une seule séance.",
    },
    {
      title: "L'objectif commun",
      body: "Choisissez un animal ensemble, par exemple le manchot à 64 chenilles, et jouez à tour de rôle jusqu'à l'obtenir. Le chiffre rend l'objectif concret.",
    },
    {
      title: "La créature du jour",
      body: "Choisissez ensemble un animal à atteindre avant de commencer, et arrêtez-vous quand il sort. Un objectif nommé rend une partie sans fin satisfaisante.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de fusion est-il gratuit ?",
      a: "Oui, tous les plateaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de créatures y a-t-il ?",
      a: "14 étages, de la chenille au dragon. Un papillon vaut 4 chenilles, une grenouille 8, un manchot 64.",
    },
    {
      q: "Peut-on perdre ?",
      a: "Presque jamais. Sur 150 parties simulées, aucune ne s'est terminée faute de coup possible, et le grand plateau ne se bloque pas.",
    },
    {
      q: "Combien d'appuis pour monter haut ?",
      a: "Une première grenouille demande 18 appuis en facile. Un premier lion en demande 1 530. Une baleine en a coûté 12 282.",
    },
    {
      q: "Le dragon est-il atteignable ?",
      a: "En théorie. Il vaut 8 192 chenilles, soit 8 191 fusions, ce qui le met hors de portée de presque tout le monde.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de fusion",
    "fusion d'animaux",
    "jeu de combinaison enfant",
    "jeu calme gratuit",
    "jeu sans perdre",
    "jeu éducatif en ligne",
  ],
};
