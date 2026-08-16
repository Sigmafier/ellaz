import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr sort`. STAGED. */
export const sortFr: GameCopy = {
  name: "Trier les couleurs",
  metaTitle: "Jeu de tri de couleurs en tubes | Ellaz",
  metaDescription:
    "Versez pour regrouper chaque couleur dans son tube. 4, 6 ou 8 couleurs et 2 tubes libres. Gratuit, sans compte et jouable hors ligne.",

  lede: "Des tubes mélangés, 2 tubes libres, et une couleur par tube à la fin. Le record compte les versements, et moins il y en a, mieux c'est.",

  body: [
    "On appuie sur un tube pour prendre sa couleur du dessus, puis sur un autre pour l'y verser. Un versement n'est possible que sur une couleur identique ou sur un tube vide. Le but est simple. Chaque couleur réunie dans son tube.",
    "Il y a 4, 6 ou 8 couleurs selon le niveau, et toujours 2 tubes libres. Ces 2 tubes sont l'espace de manoeuvre du jeu entier: c'est leur nombre, pas celui des couleurs, qui décide de la difficulté réelle.",
    "Nous avons distribué 4 000 grilles par niveau et fait jouer deux programmes pour savoir à quel point ce jeu pardonne. Un programme qui verse au hasard finit quand même 99,7% des grilles faciles, et se bloque sur 10,2% des difficiles contre 0,2% en facile. Un programme qui suit une seule règle simple, celle de préférer un versement qui complète une couleur, boucle le facile en 11 versements, le moyen en 15,5 et le difficile en 19,4. Le mélange lui-même, refait à l'envers, prend 21,8 versements en facile et 34,6 en difficile. Autrement dit, la solution efficace est presque toujours plus courte que le chemin par lequel la grille a été mélangée.",
    "Le record est le nombre de versements. Le plus petit gagne. Chaque niveau garde le sien.",
    "L'aveu: sur le niveau difficile, il est possible d'arriver à une position sans aucun versement légal, et le jeu ne prévient pas avant. 10,2% des parties jouées sans réfléchir finissent ainsi. C'est ce qui rend le niveau intéressant, et c'est aussi ce qui le rend agaçant pour un enfant qui ne comprend pas ce qui s'est passé. En facile, cela n'arrive presque jamais.",
  ],

  howToPlay: [
    {
      title: "Prendre une couleur",
      body: "Appuyez sur un tube. La couleur du dessus se soulève, prête à être versée.",
    },
    {
      title: "La verser",
      body: "Appuyez sur un autre tube. Le versement n'est accepté que si le dessus est de la même couleur, ou si le tube est vide.",
    },
    {
      title: "Réunir chaque couleur",
      body: "La grille est finie quand chaque tube ne contient qu'une seule couleur. Les 2 tubes libres peuvent rester vides.",
    },
  ],

  tips: [
    {
      title: "Ne remplissez pas les 2 tubes libres",
      body: "Ce sont eux qui rendent tout possible. Un tube libre occupé par une couleur isolée sans raison est la cause la plus fréquente des positions bloquées.",
    },
    {
      title: "Cherchez le versement qui termine",
      body: "Un programme qui préfère systématiquement le versement complétant une couleur boucle le difficile en 19,4 coups. C'est une règle unique et elle suffit presque toujours.",
    },
    {
      title: "Regardez avant de verser deux fois",
      body: "Verser une couleur sur une autre pour la déplacer coûte souvent deux coups au lieu d'un. Le record compte les versements, donc chaque geste inutile se paie.",
    },
  ],

  teaches: [
    {
      title: "Planifier une suite de gestes",
      body: "Un versement ne se juge pas seul: il faut savoir ce qu'il libère et ce qu'il enterre. C'est un vrai raisonnement en plusieurs étapes, dans un jeu sans une seule règle écrite.",
    },
    {
      title: "Garder de la place",
      body: "Comprendre qu'un espace vide vaut plus qu'un progrès immédiat est une idée profonde, et ce jeu la fait sentir avant de savoir la nommer.",
    },
    {
      title: "Reconnaître une impasse",
      body: "Une position bloquée se prépare plusieurs coups à l'avance. Apprendre à sentir venir un blocage avant qu'il arrive est le vrai contenu de ce jeu.",
    },
  ],

  ages: [
    {
      title: "4 à 6 ans",
      body: "Le facile, à 4 couleurs. Un programme qui verse au hasard le finit dans 99,7% des cas, donc un enfant y arrive presque toujours.",
    },
    {
      title: "7 ans et plus",
      body: "Le difficile, à 8 couleurs, où une position bloquée devient un vrai risque.",
    },
    {
      title: "Adultes",
      body: "Le difficile, à 8 couleurs, où 10,2% des parties jouées sans attention se terminent bloquées. Il occupe une pause entière.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, jamais en glissant: un appui pour prendre, un appui pour verser. Rien n'est chronométré. Les couleurs sont accompagnées de motifs différents à l'intérieur des tubes, donc un joueur daltonien les distingue sans dépendre de la teinte. Une partie en cours est retrouvée si vous quittez le jeu.",

  together: [
    {
      title: "Un versement chacun",
      body: "Chacun son tour sur la même grille, sans se conseiller. Les positions bloquées deviennent des accusations mutuelles, ce qui est la moitié du plaisir.",
    },
    {
      title: "Le pari sur le nombre",
      body: "Avant de commencer, chacun annonce en combien de versements il finira. Comparer une prévision à un résultat est une leçon qui vaut la partie.",
    },
    {
      title: "Le versement commenté",
      body: "Avant chaque geste, dire ce qu'il libère et ce qu'il enterre. La partie ralentit, le nombre de versements chute, et le record tombe.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de tri est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de couleurs et de tubes libres ?",
      a: "4, 6 ou 8 couleurs selon le niveau, et toujours 2 tubes libres.",
    },
    {
      q: "Peut-on se bloquer ?",
      a: "Oui, surtout en difficile: sur 4 000 grilles, un jeu au hasard se bloque sur 10,2% des difficiles contre 0,2% des faciles.",
    },
    {
      q: "Combien de versements pour une bonne partie ?",
      a: "Une règle simple suffit à boucler le facile en 11 versements, le moyen en 15,5 et le difficile en 19,4.",
    },
    {
      q: "Le record est-il gardé par niveau ?",
      a: "Oui, chacun le sien, et le plus petit nombre de versements gagne.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de tri de couleurs",
    "tri en tubes",
    "puzzle de couleurs",
    "jeu de logique gratuit",
    "jeu de rangement enfant",
    "water sort en français",
  ],
};
