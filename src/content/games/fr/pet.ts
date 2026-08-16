import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr pet`. STAGED. */
export const petFr: GameCopy = {
  name: "Mon animal",
  metaTitle: "Jeu d'animal à élever pour enfants | Ellaz",
  metaDescription:
    "Nourrissez, lavez, jouez: 3 créatures et 5 tailles à faire grandir. Jeu gratuit pour enfants, sans compte, sans publicité et hors ligne.",

  lede: "Une créature, une bulle qui dit ce qu'elle veut, et 5 tailles à franchir. Répondre au bon souhait vaut 3 fois plus.",

  body: [
    "La créature affiche une bulle avec ce dont elle a envie: manger, être lavée, jouer. Vous appuyez sur l'action correspondante. Elle grandit. C'est tout.",
    "Répondre au souhait exact vaut 3 points, faire autre chose en vaut 1. La cinquième et dernière taille demande 80 points de soins au total, donc un enfant qui lit la bulle à chaque fois arrive à la taille maximale en 27 appuis. Les 3 créatures ensemble se finissent en 81.",
    "Nous voulions savoir ce que coûte le fait de ne pas regarder la bulle, alors nous avons fait jouer deux programmes sur 2 000 parties chacun, pour 320 541 appuis au total. Un programme qui appuie au hasard tombe juste 24,9% du temps et finit en 53,8 appuis. Un programme qui ne regarde jamais la bulle finit en 79,5. Face à 27 appuis pour un enfant attentif, l'écart est de un à trois: lire la bulle triple la vitesse. Et le point important est ailleurs, dans un chiffre qui n'apparaît pas: aucun de ces 320 541 appuis n'a été refusé. Il n'existe aucune mauvaise action dans ce jeu, seulement des actions moins efficaces.",
    "7 pièces d'or arrivent sur le chemin de la taille maximale, et le record ne fait que monter.",
    "L'aveu: il n'y a rien à faire une fois les 3 créatures arrivées à leur taille maximale. Le jeu se termine et il n'y a pas de suite. C'est une séance de vingt minutes plutôt qu'un compagnon quotidien, et nous ne voulions pas d'un animal qui a faim pendant la nuit et culpabilise un enfant le lendemain matin. Rien ici ne se dégrade quand personne ne regarde.",
  ],

  howToPlay: [
    {
      title: "Lire la bulle",
      body: "La créature montre en image ce dont elle a envie. Rien n'est écrit et rien n'est chronométré.",
    },
    {
      title: "Choisir l'action",
      body: "Appuyez sur nourrir, laver ou jouer. Le souhait exact rapporte 3 points, une autre action en rapporte 1.",
    },
    {
      title: "Faire grandir",
      body: "5 tailles se succèdent, la dernière à 80 points de soins. Les 3 créatures se font l'une après l'autre.",
    },
  ],

  tips: [
    {
      title: "Regardez la bulle en premier",
      body: "C'est le seul conseil qui compte. 27 appuis en lisant la bulle, contre 79,5 en ne la regardant jamais, mesuré sur 2 000 parties.",
    },
    {
      title: "Un enfant qui n'a pas compris appuie vite",
      body: "Si les appuis s'enchaînent sans pause, c'est le signe que la bulle n'est pas vue. Un adulte qui la montre du doigt une seule fois suffit à corriger le réflexe.",
    },
    {
      title: "Faites les 3 créatures",
      body: "Chacune a ses images et ses réactions. Un enfant qui n'en fait qu'une passe à côté des deux tiers du jeu, pour 54 appuis de plus.",
    },
  ],

  teaches: [
    {
      title: "Lire une intention",
      body: "Comprendre qu'une image dans une bulle exprime un besoin, et agir en conséquence, est une compétence sociale avant d'être une compétence de jeu.",
    },
    {
      title: "Prendre soin",
      body: "Nourrir, laver, jouer. Ce sont les gestes qu'un enfant reçoit tous les jours et qu'il n'a presque jamais l'occasion de donner. L'inversion des rôles lui plaît énormément.",
    },
    {
      title: "Faire attention à autre chose qu'à soi",
      body: "Le jeu ne demande pas ce que l'enfant veut, il demande ce que la créature veut. Ce déplacement du point de vue est le vrai sujet.",
    },
  ],

  ages: [
    {
      title: "2 à 4 ans",
      body: "Une créature suffit, avec un adulte qui montre la bulle. Aucune lecture n'est nécessaire.",
    },
    {
      title: "5 ans et plus",
      body: "Les 3 créatures d'affilée, en 81 appuis si chaque souhait est bien lu.",
    },
    {
      title: "Adultes",
      body: "Rien à jouer pour un adulte, mais beaucoup à observer: un enfant qui lit la bulle et un enfant qui appuie au hasard se repèrent en dix secondes.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grands boutons, sans glisser et sans limite de temps. Aucune action n'est jamais refusée, sur aucun état: sur 320 541 appuis simulés, pas un seul n'a été rejeté, donc un enfant qui appuie n'importe où voit toujours quelque chose se passer. Les besoins sont montrés en images, pas en mots, et la créature ne se dégrade jamais quand le jeu est fermé.",

  together: [
    {
      title: "Le souhait annoncé",
      body: "L'adulte nomme ce que la créature veut à voix haute, l'enfant appuie. Le vocabulaire des besoins se met en place tout seul en quelques minutes.",
    },
    {
      title: "Une créature chacun",
      body: "Deux enfants font grandir deux créatures différentes en parallèle. On compare les tailles à la fin, sans que personne ne perde.",
    },
    {
      title: "Le besoin deviné",
      body: "Avant chaque appui, l'adulte demande ce dont la créature a envie. L'enfant répond avec des mots, puis appuie.",
    },
  ],

  faq: [
    {
      q: "Ce jeu d'animal est-il gratuit ?",
      a: "Oui, les 3 créatures, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de temps pour faire grandir une créature ?",
      a: "27 appuis en répondant au bon souhait à chaque fois, 53,8 en appuyant au hasard, 79,5 sans jamais regarder la bulle.",
    },
    {
      q: "La créature peut-elle être malheureuse ?",
      a: "Non. Rien ne se dégrade quand le jeu est fermé, et aucune action n'est jamais refusée.",
    },
    {
      q: "Combien de tailles et de créatures ?",
      a: "5 tailles et 3 créatures, soit 81 appuis pour tout finir en lisant chaque souhait.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. Les souhaits sont montrés en images.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu d'animal virtuel",
    "élever un animal",
    "jeu pour tout-petits",
    "prendre soin d'un animal",
    "jeu maternelle gratuit",
    "jeu calme enfant",
  ],
};
