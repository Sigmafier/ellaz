import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr echo`. STAGED. */
export const echoFr: GameCopy = {
  name: "Écho",
  metaTitle: "Jeu de suite lumineuse à répéter | Ellaz",
  metaDescription:
    "Les touches s'allument, vous répétez la suite. 4, 5 ou 6 touches selon le niveau. Jeu de mémoire gratuit, sans compte et hors ligne.",

  lede: "Les touches s'allument dans un ordre. Répétez-le. La suite s'allonge à chaque tour, et il n'y a pas de plafond.",

  body: [
    "Une touche s'allume. Vous appuyez dessus. Deux touches s'allument, vous refaites les deux dans l'ordre. Trois, puis quatre, et ainsi de suite jusqu'à ce que la mémoire lâche. C'est le jeu le plus vieux du monde des jouets électroniques et il n'a jamais eu besoin d'une règle écrite.",
    "Le nombre de touches change avec la difficulté: 4, 5 ou 6. Cela paraît peu. L'effet est énorme. Avec 4 touches, une suite de 3 a 64 formes possibles. Avec 6 touches, une suite de 5 en a 7 776, et une suite de 7 en a 279 936. La difficulté ne vient donc pas de la vitesse, elle vient du nombre de possibilités que la mémoire doit départager.",
    "L'éclairage commence à 460 millisecondes par touche et se raccourcit au fil des tours jusqu'à un plancher de 260, avec un intervalle de 170 millisecondes entre deux. Le plancher existe pour la même raison que partout ailleurs sur ce site: une suite affichée trop vite ne teste plus la mémoire, elle teste la vue.",
    "Rien n'est écrit. Le son n'est pas nécessaire pour jouer.",
    "L'aveu, et il est important pour les parents: ce jeu produit une frustration réelle. On perd toujours, forcément, puisque la suite s'allonge sans fin, et un enfant qui rate au huitième tour a le sentiment d'avoir échoué alors qu'il vient de retenir sept choses de suite. Un adulte qui dit ce chiffre à voix haute change complètement la façon dont l'enfant vit la partie.",
  ],

  howToPlay: [
    {
      title: "Regarder la suite",
      body: "Les touches s'allument l'une après l'autre. Chaque éclairage dure entre 460 et 260 millisecondes selon l'avancée.",
    },
    {
      title: "Répéter dans l'ordre",
      body: "Appuyez sur les touches dans le même ordre. Rien ne presse pendant votre tour: le jeu attend.",
    },
    {
      title: "Un pas de plus",
      body: "Une réussite ajoute une touche à la suite. Une erreur termine le tour, et vous recommencez du début.",
    },
  ],

  tips: [
    {
      title: "Dites les couleurs à voix haute",
      body: "Rouge, jaune, jaune, bleu. Nommer la suite pendant qu'elle s'allume la transforme en phrase, et une phrase se retient bien mieux qu'une série de lumières.",
    },
    {
      title: "Groupez par trois",
      body: "Au delà de cinq éléments, découpez mentalement la suite en petits paquets. C'est ce que tout le monde fait avec un numéro de téléphone, et ça marche ici aussi.",
    },
    {
      title: "Ne regardez pas vos doigts",
      body: "Beaucoup d'erreurs viennent d'un appui à côté plutôt que d'un oubli. Les touches sont grandes: regardez la suite dans votre tête, pas l'écran.",
    },
  ],

  teaches: [
    {
      title: "La mémoire séquentielle",
      body: "Retenir un ordre est différent de retenir un contenu, et c'est exactement ce que demande une consigne en plusieurs étapes à l'école. Ce jeu l'entraîne sans jamais le dire.",
    },
    {
      title: "La concentration soutenue",
      body: "Une suite de sept demande une attention continue de plusieurs secondes, sans distraction. C'est court pour un adulte et considérable pour un enfant de cinq ans.",
    },
    {
      title: "Se corriger sans aide",
      body: "Une erreur ramène au début et ne dit pas où elle était. L'enfant doit retrouver seul ce qu'il a oublié, ce qui est plus formateur qu'une correction donnée.",
    },
  ],

  ages: [
    {
      title: "4 à 6 ans",
      body: "Le niveau à 4 touches. Il n'y a rien à lire et une erreur ne fait que ramener au début.",
    },
    {
      title: "7 ans et plus",
      body: "Le niveau à 6 touches, où une suite de 5 a déjà 7 776 formes possibles.",
    },
    {
      title: "Adultes",
      body: "Une suite de 9 sur 6 touches met tout le monde en difficulté. C'est le jeu du site où l'écart entre un adulte et un enfant est le plus faible.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grandes touches, sans glisser et sans limite de temps pendant votre tour. Chaque touche porte une couleur et une forme distincte, donc un enfant daltonien suit la suite sans difficulté. Le son accompagne l'éclairage mais n'est jamais nécessaire: le jeu se joue entièrement en silence. Le rythme d'affichage ne descend jamais sous 260 millisecondes par touche.",

  together: [
    {
      title: "Un appui chacun",
      body: "Deux joueurs répètent la suite en alternant les touches. Il faut suivre ce que fait l'autre en plus de se souvenir, ce qui est bien plus dur qu'il n'y paraît.",
    },
    {
      title: "L'annonceur",
      body: "Un joueur dit les couleurs à voix haute pendant l'éclairage, l'autre appuie. Les deux progressent, et le score commun monte beaucoup plus haut.",
    },
    {
      title: "Le record commun",
      body: "Une seule partie, deux mémoires: l'un retient la première moitié de la suite, l'autre la seconde. Le score monte spectaculairement.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de mémoire est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de touches y a-t-il ?",
      a: "4, 5 ou 6 selon la difficulté. Avec 6 touches, une suite de 5 a 7 776 formes possibles.",
    },
    {
      q: "Le jeu accélère-t-il ?",
      a: "Un peu. L'éclairage passe de 460 à 260 millisecondes par touche, et ne descend jamais plus bas.",
    },
    {
      q: "Faut-il le son pour jouer ?",
      a: "Non. Le son accompagne l'éclairage, mais la suite est entièrement visible sans lui.",
    },
    {
      q: "Y a-t-il une fin ?",
      a: "Non. La suite s'allonge tant que vous réussissez, donc toute partie finit par une erreur.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de mémoire sonore",
    "répéter la suite",
    "jeu de séquences",
    "simon jeu de mémoire",
    "jeu de concentration enfant",
    "jeu gratuit sans téléchargement",
  ],
};
