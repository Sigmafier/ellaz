import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr vanish`. STAGED. */
export const vanishFr: GameCopy = {
  name: "Qui a disparu",
  metaTitle: "Jeu de mémoire visuelle pour enfants | Ellaz",
  metaDescription:
    "Des objets s'affichent, puis un disparaît. Trois niveaux, de 3 à 6 objets, avec au moins 1,5 seconde par objet. Gratuit et hors ligne.",

  lede: "Regardez bien. Les objets s'en vont, et il faut dire lequel manque. De 3 à 6 objets, avec le temps de les regarder.",

  body: [
    "Une poignée d'objets s'affiche. Ils disparaissent. Ils reviennent, sauf un, et l'enfant doit désigner celui qui manque.",
    "Le temps d'observation n'est pas décoratif, il est calculé. Le facile montre 3 objets pendant 7 secondes, soit 2,33 secondes par objet. Le moyen montre 4 objets pendant 8 secondes, donc 2 secondes chacun. Le difficile montre 6 objets pendant 9 secondes, ce qui fait 1,5 seconde par objet. Ce dernier chiffre est aussi un plancher : aucun niveau, jamais, ne descend en dessous de 1,5 seconde par objet ni de 5 secondes au total, quoi qu'il arrive. Un jeu de mémoire qui affiche trop vite ne teste plus la mémoire, il teste la vitesse de lecture, et ce n'est pas la même chose.",
    "Avec 3 objets, une réponse au hasard tombe juste 33,3% du temps. Avec 4, c'est 25%. Avec 6, 16,7%.",
    "Rien n'est écrit à aucun moment et rien ne demande de compter. Un enfant de trois ans joue au niveau facile sans qu'on lui explique la règle : on la lui montre une fois et c'est fini.",
    "La limite honnête : 6 objets, c'est peu pour un adulte. Le niveau difficile de ce jeu est un exercice confortable pour n'importe qui de plus de dix ans, et il n'est pas prévu pour être davantage. C'est un jeu pour les petits, et l'élargir vers le haut voudrait dire afficher plus vite, ce que le plancher interdit exprès.",
  ],

  howToPlay: [
    {
      title: "Regarder les objets",
      body: "Ils restent affichés entre 7 et 9 secondes selon le niveau. Rien ne presse pendant ce temps.",
    },
    {
      title: "Attendre le retour",
      body: "Les objets disparaissent puis reviennent, avec un manquant. Leur position peut avoir changé.",
    },
    {
      title: "Désigner le manquant",
      body: "Appuyez sur l'objet qui n'est pas revenu, parmi ceux proposés. Une erreur ne coûte rien et le tour recommence.",
    },
  ],

  tips: [
    {
      title: "Nommez chaque objet",
      body: "Dire chat, ballon, étoile à voix haute pendant qu'ils sont affichés multiplie les chances de s'en souvenir. C'est le procédé de mémorisation le plus simple qui existe, et il marche à tout âge.",
    },
    {
      title: "Racontez une histoire",
      body: "Le chat joue au ballon sous l'étoile. Trois objets liés par une phrase se retiennent mieux que trois objets séparés, et cette astuce tient jusqu'au niveau difficile.",
    },
    {
      title: "Ne comptez pas sur la position",
      body: "Les objets peuvent revenir ailleurs qu'à leur place. Retenir la forme plutôt que l'emplacement évite de se faire piéger.",
    },
  ],

  teaches: [
    {
      title: "La mémoire visuelle à court terme",
      body: "Retenir 6 images pendant quelques secondes est exactement ce que mesurent les tests de mémoire de travail. Ici c'est un jeu, et l'enfant recommence de lui-même.",
    },
    {
      title: "Se donner une méthode",
      body: "Un enfant qui découvre que nommer les objets l'aide vient d'inventer une stratégie de mémorisation. C'est plus important que le score, et ça se transfère à l'école.",
    },
    {
      title: "Regarder exprès",
      body: "Savoir qu'on a 7 secondes et les utiliser à observer plutôt qu'à attendre est un choix. Beaucoup d'enfants le découvrent après trois ou quatre tours.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le facile, avec 3 objets et 7 secondes pour les regarder. Aucune lecture n'est nécessaire.",
    },
    {
      title: "6 à 9 ans",
      body: "Le difficile, avec 6 objets. Au-delà de cet âge, le jeu devient confortable et c'est assumé.",
    },
    {
      title: "Adultes",
      body: "Rien de difficile ici pour un adulte, et c'est assumé. Le plaisir est de jouer à côté d'un enfant qui gagne.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grandes images, sans glisser. Le temps d'affichage ne descend jamais sous 1,5 seconde par objet ni sous 5 secondes au total, quel que soit le niveau, donc personne n'est bousculé. Les objets se distinguent par leur forme et pas seulement par leur couleur. Aucun son n'est nécessaire et rien n'est écrit.",

  together: [
    {
      title: "Nommer ensemble",
      body: "Un adulte nomme les objets à voix haute pendant l'affichage, avec l'enfant. La réussite grimpe d'un coup, et l'enfant reprend l'habitude tout seul deux tours plus tard.",
    },
    {
      title: "Le même jeu sur la table",
      body: "Cinq objets réels, un drap, on en retire un. C'est le même exercice sans écran, et jouer aux deux versions dans la même journée marche très bien.",
    },
    {
      title: "Le témoin",
      body: "Les deux regardent, un seul répond, et on alterne. Celui qui ne répond pas doit se taire, ce qui est la partie la plus difficile du jeu.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de mémoire est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps pour regarder les objets ?",
      a: "7 secondes pour 3 objets, 8 pour 4 et 9 pour 6, soit 2,33, 2 et 1,5 seconde par objet.",
    },
    {
      q: "Le jeu peut-il devenir trop rapide ?",
      a: "Non. Un plancher de 1,5 seconde par objet et de 5 secondes au total ne peut être franchi par aucun niveau.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. Tout est en images et rien n'est écrit sur l'écran de jeu.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Trois ans pour le niveau facile. C'est un jeu pour les enfants : il reste confortable pour un adulte, volontairement.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans aucune connexion.",
    },
  ],

  keywords: [
    "jeu de mémoire visuelle",
    "qui a disparu",
    "mémoire enfant",
    "jeu d'observation maternelle",
    "jeu éducatif gratuit",
    "objet manquant",
  ],
};
