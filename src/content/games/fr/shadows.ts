import type { GameCopy } from "../../types";

/** Ecrit a partir de `node scripts/brief.mjs fr shadows`. STAGED. */
export const shadowsFr: GameCopy = {
  name: "Les ombres",
  metaTitle: "Jeu des ombres à associer, gratuit | Ellaz",
  metaDescription:
    "Retrouvez à qui appartient l'ombre, parmi 3 ou 4 propositions. Jeu d'observation gratuit pour enfants, sans compte et jouable hors ligne.",

  lede: "Une silhouette noire, et 3 ou 4 candidats. Le difficile les prend tous dans la même famille, ce qui change tout.",

  body: [
    "Une ombre s'affiche au milieu de l'écran. En dessous, des images. Une seule correspond. L'enfant appuie dessus.",
    "Le facile propose 3 réponses, donc le hasard vaut 33,3%. Le moyen et le difficile en proposent 4, ce qui ramène le hasard à 25% sur les deux. La vraie différence entre ces deux niveaux n'est donc pas le nombre de choix, c'est ce qu'on met dedans.",
    "Le facile et le moyen mélangent les catégories: une ombre de chat contre un camion, une maison et un poisson. Les silhouettes n'ont rien à voir entre elles et la réponse saute aux yeux. Le difficile tire ses 4 propositions dans une seule famille, donc 4 animaux, ou 4 véhicules. Il faut alors regarder la forme des oreilles ou le nombre de roues plutôt que la silhouette générale, et c'est un exercice complètement différent avec le même nombre de boutons à l'écran.",
    "Le record compte les niveaux réussis. Chaque difficulté garde le sien.",
    "L'aveu: le niveau facile s'épuise très vite. Un enfant de cinq ans y répond juste presque à chaque fois au bout de deux minutes, parce que distinguer un chat d'un camion n'est pas un problème passé trois ans. C'est voulu, cela sert de rampe d'accès, mais il ne faut pas y rester. Passez au difficile dès que deux tours de suite tombent sans hésitation.",
  ],

  howToPlay: [
    {
      title: "Regarder l'ombre",
      body: "Une silhouette noire s'affiche en grand. Rien n'est chronométré et rien n'est écrit.",
    },
    {
      title: "Choisir l'image",
      body: "Appuyez sur celle des propositions qui correspond à l'ombre. Il y en a 3 en facile et 4 aux autres niveaux.",
    },
    {
      title: "Continuer",
      body: "Une bonne réponse passe à l'ombre suivante. Une erreur ne coûte rien et laisse réessayer aussitôt.",
    },
  ],

  tips: [
    {
      title: "Regardez un détail, pas la forme entière",
      body: "Au niveau difficile, les 4 silhouettes se ressemblent. Choisissez un seul détail, les oreilles ou la queue, et comparez-le sur les quatre plutôt que de tout regarder à la fois.",
    },
    {
      title: "Éliminez au lieu de choisir",
      body: "Écarter les 3 mauvaises est souvent plus facile que reconnaître la bonne. C'est le même raisonnement qu'un adulte utilise sur un questionnaire à choix multiples.",
    },
    {
      title: "Montez au difficile rapidement",
      body: "Le facile ne demande plus rien après quelques tours. Le vrai jeu commence quand les 4 propositions viennent de la même famille.",
    },
  ],

  teaches: [
    {
      title: "Reconnaître par la silhouette",
      body: "Identifier un objet à partir de son contour seul, sans couleur ni détail interne, est une étape importante de la perception visuelle. C'est aussi la compétence qui sert à distinguer un b d'un d.",
    },
    {
      title: "La comparaison fine",
      body: "Au niveau difficile, la bonne réponse tient à un détail de quelques pixels. Apprendre à chercher où deux choses diffèrent plutôt que si elles diffèrent est un vrai progrès.",
    },
    {
      title: "Aller du contour à l'objet",
      body: "Une ombre ne donne ni couleur ni détail, seulement une forme. Reconstruire l'objet entier à partir de si peu est un vrai travail de perception.",
    },
  ],

  ages: [
    {
      title: "3 à 4 ans",
      body: "Le facile, avec 3 propositions venues de catégories différentes. Aucune lecture n'est nécessaire.",
    },
    {
      title: "5 ans et plus",
      body: "Le difficile, où les 4 propositions appartiennent toutes à la même famille.",
    },
    {
      title: "Adultes",
      body: "Le difficile, où quatre animaux de la même famille se départagent sur la queue ou les oreilles, n'est pas immédiat pour un adulte pressé.",
    },
  ],

  accessibility:
    "Tout se joue en appuyant sur de grandes images, sans glisser et sans double appui. Rien n'est chronométré. Le jeu repose entièrement sur la forme et jamais sur la couleur, puisque l'ombre est noire, ce qui en fait l'un des jeux les plus adaptés du site à un enfant daltonien. Rien n'est écrit à l'écran.",

  together: [
    {
      title: "Décrire avant de montrer",
      body: "L'enfant décrit l'ombre à voix haute avant de choisir: elle a quatre pattes et une longue queue. Le vocabulaire progresse autant que l'observation.",
    },
    {
      title: "Les ombres de la maison",
      body: "Une lampe de poche, un mur, des objets de la cuisine. Reconnaître l'ombre d'une vraie cuillère après avoir joué à celui-ci referme bien la boucle.",
    },
    {
      title: "Le portrait chinois",
      body: "Un joueur décrit une ombre sans la nommer, l'autre devine. C'est le même exercice que le jeu, avec des mots à la place des boutons.",
    },
  ],

  faq: [
    {
      q: "Ce jeu des ombres est-il gratuit ?",
      a: "Oui, les trois niveaux, sans publicité, sans compte et sans version payante.",
    },
    {
      q: "Combien de propositions par tour ?",
      a: "3 au niveau facile, ce qui donne 33,3% au hasard, et 4 aux niveaux moyen et difficile, soit 25%.",
    },
    {
      q: "Quelle différence entre moyen et difficile ?",
      a: "Le nombre de propositions est le même. Le difficile les tire toutes d'une seule famille, donc il faut comparer des détails plutôt que des silhouettes différentes.",
    },
    {
      q: "Faut-il savoir lire ?",
      a: "Non. Le jeu est entièrement en images.",
    },
    {
      q: "Convient-il à un enfant daltonien ?",
      a: "Oui, particulièrement. L'ombre est noire et la réponse repose uniquement sur la forme.",
    },
    {
      q: "Est-ce qu'il marche hors ligne ?",
      a: "Oui, après la première visite, sans connexion.",
    },
  ],

  keywords: [
    "jeu des ombres",
    "associer les ombres",
    "jeu d'observation enfant",
    "silhouettes à reconnaître",
    "jeu maternelle gratuit",
    "jeu éducatif en ligne",
  ],
};
