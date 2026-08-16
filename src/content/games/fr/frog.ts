import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr frog`. STAGED. */
export const frogFr: GameCopy = {
  name: "La grenouille",
  metaTitle: "Jeu de la grenouille à attraper | Ellaz",
  metaDescription:
    "Une grenouille saute de nénuphar en nénuphar, attrapez-la. Jeu de rapidité gratuit pour enfants, sans compte et jouable hors ligne.",

  lede: "Une seule grenouille, quelques nénuphars, et 2,94 secondes pour la trouver au premier saut. Elle ne reste jamais où elle est.",

  body: [
    "La grenouille se pose sur un nénuphar. Appuyez dessus. Elle saute ailleurs. Et ça recommence.",
    "Il y a toujours exactement une grenouille à l'écran, et elle ne se pose jamais deux fois de suite sur le même nénuphar. Ces 2 règles ont l'air techniques et elles changent l'expérience: un enfant n'a jamais à chercher laquelle des grenouilles est la bonne, et il n'a jamais à se demander si elle a bougé ou pas.",
    "Le temps d'attente se raccourcit au fil du tour, mais bien moins vite qu'on ne l'imagine. Sur le niveau facile, la grenouille attend 2,94 secondes au premier saut et encore 2,49 au dernier du tour. Le plancher, à 1,74 seconde, n'est atteint qu'après 14 sauts, ce qui veut dire qu'il n'arrive jamais pendant une partie facile. Seul le niveau difficile l'atteint à l'intérieur d'un tour, au huitième saut sur dix. Autrement dit, pour un enfant de trois ans, ce jeu ne s'emballe pas.",
    "Les niveaux offrent 4, 5 ou 6 nénuphars. Il faut 6, 8 ou 10 prises par tour.",
    "L'aveu: c'est le jeu le plus simple du catalogue, et un enfant de six ans en fait le tour en quelques minutes. Il est fait pour les tout-petits qui apprennent à viser, et il n'a rien à offrir au-delà. Ce n'est pas un défaut à corriger, c'est ce à quoi il sert.",
  ],

  howToPlay: [
    {
      title: "Trouver la grenouille",
      body: "Elle est posée sur l'un des nénuphars. Il n'y en a jamais plus d'une à l'écran.",
    },
    {
      title: "Appuyer dessus",
      body: "Un appui sur la grenouille la compte. Elle saute aussitôt sur un autre nénuphar, jamais le même.",
    },
    {
      title: "Finir le tour",
      body: "6, 8 ou 10 prises selon le niveau. Le tour suivant démarre tout seul.",
    },
  ],

  tips: [
    {
      title: "Regardez tous les nénuphars, pas un seul",
      body: "Fixer l'endroit où elle était garantit de la chercher au mauvais endroit, puisqu'elle n'y revient jamais. Un regard large trouve plus vite.",
    },
    {
      title: "Le doigt au centre",
      body: "Laisser le doigt au milieu de l'écran entre deux prises raccourcit tous les trajets. C'est un conseil bête et il fait gagner une demi-seconde à chaque saut.",
    },
    {
      title: "Prenez le temps qu'il faut",
      body: "Le niveau facile laisse presque 3 secondes par saut et ne descend jamais sous 1,74 seconde. Rien ne presse autant que l'écran en donne l'impression.",
    },
  ],

  teaches: [
    {
      title: "Viser une cible",
      body: "Diriger un doigt vers un point précis de l'écran est un geste qui s'apprend, et il s'apprend précisément à cet âge. C'est le préalable de tous les autres jeux du site.",
    },
    {
      title: "Balayer du regard",
      body: "Chercher une chose parmi 6 emplacements demande de regarder dans un ordre plutôt qu'au hasard. C'est la même compétence qu'un enfant utilisera pour suivre une ligne de texte.",
    },
    {
      title: "Attendre le bon moment",
      body: "La grenouille se pose, puis repart. Appuyer trop tôt ou trop tard ne marche pas, et régler son geste sur ce rythme est un apprentissage réel à deux ans.",
    },
  ],

  ages: [
    {
      title: "2 à 4 ans",
      body: "Le facile, à 4 nénuphars et 6 prises. Rien à lire, rien à comprendre, et presque 3 secondes par saut.",
    },
    {
      title: "5 ans",
      body: "Le difficile, à 6 nénuphars et 10 prises. Au-delà de cet âge le jeu devient trop simple.",
    },
    {
      title: "Adultes",
      body: "Rien ici pour un adulte, sauf tenir l'appareil et compter à voix haute pendant qu'un petit joue. C'est déjà beaucoup.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant, sans glisser, sur des nénuphars larges. Le temps d'attente ne descend jamais sous 1,74 seconde, et sur le niveau facile ce plancher n'est jamais atteint, ce qui rend le jeu utilisable avec une aide à la saisie. Une erreur ne coûte rien et ne produit aucun son désagréable. Rien n'est écrit à l'écran.",

  together: [
    {
      title: "À tour de rôle",
      body: "Un saut chacun, sur le même appareil. Les tout-petits apprennent à attendre leur tour, ce qui est plus difficile que le jeu lui-même.",
    },
    {
      title: "Le guide",
      body: "Un adulte dit où elle est allée, sans montrer du doigt: en haut à droite. Le vocabulaire de position se met en place tout seul.",
    },
    {
      title: "La grenouille annoncée",
      body: "L'adulte dit haut et fort quand elle se pose, sans montrer où. L'enfant cherche plus vite parce qu'il sait qu'il y a quelque chose à trouver.",
    },
  ],

  faq: [
    {
      q: "Ce jeu de la grenouille est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps pour attraper la grenouille ?",
      a: "2,94 secondes au premier saut en facile, encore 2,49 au dernier du tour. Le plancher de 1,74 seconde n'est atteint qu'après 14 sauts.",
    },
    {
      q: "Peut-elle rester au même endroit ?",
      a: "Non, jamais. Elle change toujours de nénuphar, et il n'y en a jamais qu'une à l'écran.",
    },
    {
      q: "Combien de nénuphars y a-t-il ?",
      a: "4, 5 ou 6 selon le niveau, avec 6, 8 ou 10 prises pour finir un tour.",
    },
    {
      q: "À partir de quel âge ?",
      a: "Deux ans. C'est le jeu le plus simple du site, et il devient trop facile vers six ans.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu de la grenouille",
    "jeu pour tout-petits",
    "jeu de rapidité 3 ans",
    "attraper la grenouille",
    "jeu maternelle gratuit",
    "jeu sans lecture",
  ],
};
