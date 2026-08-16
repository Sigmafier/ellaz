import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr bubbles`. STAGED. */
export const bubblesFr: GameCopy = {
  name: "Les bulles",
  metaTitle: "Jeu de lettres et chiffres en bulles | Ellaz",
  metaDescription:
    "Attrapez la bonne lettre ou le bon chiffre parmi des bulles qui montent. Jeu d'apprentissage gratuit, sans compte et jouable hors ligne.",

  lede: "Des bulles montent, chacune portant une lettre ou un chiffre. Attrapez celle qui est demandée. En facile, aucune ne se ressemble.",

  body: [
    "La consigne montre une lettre ou un chiffre en grand. Des bulles traversent l'écran. On appuie sur la bonne. Voilà tout.",
    "Le réservoir contient les 10 chiffres plus les lettres de la langue en cours, soit 26 majuscules en français et en anglais, ou 22 lettres de base en hébreu. Les formes finales de l'hébreu sont écartées, parce qu'un enfant qui apprend l'alphabet n'a aucune raison de rencontrer deux dessins pour la même lettre avant d'avoir appris la première.",
    "Le niveau facile a une propriété que nous avons vérifiée plutôt que supposée: sur 120 tours mesurés par langue, il ne produit jamais deux bulles qui se ressemblent. Jamais un O à côté d'un 0, jamais un l à côté d'un 1. Un enfant qui commence tout juste à reconnaître ses lettres n'a pas à départager deux dessins presque identiques, ce qui est un exercice de vision plutôt qu'un exercice de lecture. Aux niveaux supérieurs, les paires ambiguës reviennent, et c'est à ce moment-là qu'elles ont un sens.",
    "Une bulle reste 4,2 secondes à l'écran en facile et 2,4 en difficile. Il faut 4, 5 ou 6 bonnes prises pour finir un niveau.",
    "L'aveu: ce jeu fait réviser des lettres, il ne les enseigne pas. Un enfant qui n'a jamais vu la lettre M ne l'apprendra pas ici, parce que rien ne la lui nomme ni ne la lui explique. Ce jeu sert quand la lettre a déjà été rencontrée ailleurs, avec un adulte, et qu'il s'agit de la reconnaître vite.",
  ],

  howToPlay: [
    {
      title: "Regarder la consigne",
      body: "La lettre ou le chiffre à attraper s'affiche en grand et reste visible pendant tout le niveau.",
    },
    {
      title: "Attraper la bonne bulle",
      body: "Appuyez sur la bulle qui porte le bon signe pendant qu'elle monte à l'écran.",
    },
    {
      title: "Finir le niveau",
      body: "4, 5 ou 6 bonnes prises selon la difficulté. Le niveau suivant demande un autre signe.",
    },
  ],

  tips: [
    {
      title: "Nommez le signe à voix haute",
      body: "Le M de maman. Associer la lettre à un mot connu accélère énormément la reconnaissance, et c'est la méthode qu'utilisent les enseignants depuis toujours.",
    },
    {
      title: "Commencez par les chiffres",
      body: "Les 10 chiffres sont moins nombreux et plus distincts que les lettres. Un enfant qui les attrape sans hésiter est prêt pour l'alphabet.",
    },
    {
      title: "Ne montez pas trop vite",
      body: "Les niveaux supérieurs réintroduisent les signes qui se ressemblent. Tant que le facile n'est pas parfait, monter transforme un exercice de lecture en exercice de vue.",
    },
  ],

  teaches: [
    {
      title: "La reconnaissance rapide des signes",
      body: "Lire commence par identifier une lettre sans avoir à y penser. C'est exactement ce que ce jeu entraîne, et c'est le préalable de tout le reste.",
    },
    {
      title: "La discrimination visuelle fine",
      body: "Aux niveaux difficiles, distinguer un 6 d'un 9 ou un O d'un 0 travaille la même compétence qui servira à ne pas confondre b et d en lecture.",
    },
    {
      title: "Associer un son et un signe",
      body: "Voir la lettre M et entendre son nom au même moment est exactement le lien que la lecture demande. Le jeu le répète des dizaines de fois sans jamais le nommer.",
    },
  ],

  ages: [
    {
      title: "3 à 5 ans",
      body: "Le facile, avec les chiffres d'abord. Aucune paire ambiguë n'apparaît à ce niveau, ce qui a été mesuré.",
    },
    {
      title: "5 à 7 ans",
      body: "Les lettres aux niveaux moyen et difficile, une fois l'alphabet rencontré ailleurs.",
    },
    {
      title: "Adultes",
      body: "Le difficile, avec 2,4 secondes par bulle et les paires ambiguës, reste un exercice d'attention honnête pour un adulte pressé.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser, sur des bulles larges. Le niveau facile laisse 4,2 secondes par bulle, ce qui reste jouable avec une aide à la saisie. Les signes sont écrits en grand et en fort contraste, et la consigne reste affichée pendant tout le niveau pour ne rien demander à la mémoire. Une bulle ratée ne coûte rien.",

  together: [
    {
      title: "L'alphabet à deux voix",
      body: "L'adulte nomme le signe demandé, l'enfant le cherche. Puis on inverse: l'enfant nomme et l'adulte attrape, ce qui est bien plus efficace qu'il n'y paraît.",
    },
    {
      title: "La chasse dans la maison",
      body: "Après une partie, chercher la même lettre sur une boîte de céréales. Le passage de l'écran au monde réel est ce qui ancre vraiment la reconnaissance.",
    },
    {
      title: "La lettre du jour",
      body: "Choisissez une lettre le matin et jouez seulement sur elle. La répétition sur un seul signe ancre bien plus qu'une partie qui les balaie tous.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de lettres est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Quels signes apparaissent ?",
      a: "Les 10 chiffres plus les lettres de la langue en cours: 26 majuscules en français, ou 22 lettres de base en hébreu, formes finales exclues.",
    },
    {
      q: "Les signes qui se ressemblent posent-ils problème ?",
      a: "Pas au niveau facile: sur 120 tours mesurés par langue, il n'en produit aucune paire. Les niveaux supérieurs les réintroduisent volontairement.",
    },
    {
      q: "Combien de temps dure une bulle ?",
      a: "4,2 secondes en facile et 2,4 en difficile.",
    },
    {
      q: "Ce jeu apprend-il l'alphabet ?",
      a: "Non, il le fait réviser. Rien ici ne nomme ni n'explique une lettre inconnue: la rencontre se fait ailleurs, avec un adulte.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de lettres enfant",
    "reconnaître les lettres",
    "apprendre l'alphabet",
    "jeu de chiffres maternelle",
    "jeu éducatif gratuit",
    "bulles à attraper",
  ],
};
