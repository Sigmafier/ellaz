import type { GameCopy } from "../../types";

/**
 * Demeler, en francais. Ecrit et non traduit. Les quatre versions partagent
 * leurs faits et rien d'autre, parce qu'une traduction garde le rythme de la
 * langue de depart, et que ce rythme est exactement ce qui sonne machine.
 *
 * Tous les chiffres viennent de `scripts/sim/untangle-graphs.mjs`, qui fait
 * tourner les regles livrees sur 3 000 grilles distribuees par taille.
 *
 * Les espaces avant les deux-points, les points-virgules, les points
 * d'interrogation et d'exclamation sont des espaces INSECABLES (U+00A0), comme
 * l'exige la typographie francaise. `voice.ts` le verifie.
 */
export const untangleFr: GameCopy = {
  name: "Démêler",
  metaTitle: "Démêler - puzzle de lignes gratuit | Ellaz",
  metaDescription:
    "Des points reliés par des traits qui se coupent. Déplacez les points jusqu'à ce que plus rien ne se croise. Trois tailles, au doigt ou au clavier.",

  lede: "Un puzzle gratuit dans le navigateur. Des points attendent en cercle, des traits les relient deux à deux, et ces traits se coupent partout. Déplacez les points jusqu'à ce qu'aucun trait n'en croise plus un autre.",

  body: [
    "Prenez un point et faites-le glisser. Ou touchez-le, puis touchez l'endroit où il doit aller. Rien à lire. Les flèches du clavier suffisent aussi.",

    "La grille n'est pas semée au hasard puis vérifiée. Elle est construite à l'envers. Les points sont posés d'abord, un par case d'un quadrillage large, et les traits arrivent ensuite paire par paire, du plus court au plus long : un trait n'est gardé que s'il ne coupe aucun trait déjà posé et ne passe par-dessus aucun troisième point. Ce qui sort de là est un dessin à zéro croisement, mesuré par la fonction même qui vous jugera ensuite. Le cercle vient en dernier, et c'est lui qui fabrique l'emmêlement : les points y sont répartis dans un ordre tiré au sort. La réponse existait donc avant la question, et aucun solveur n'a eu à valider quoi que ce soit.",

    "Les chiffres viennent de 3 000 grilles par taille. La petite tient 6 points et 9 traits, la moyenne 9 et 15, la grande 12 points et 21 traits. La grande s'ouvre sur 49,6 croisements en moyenne, et le pire tirage mesuré en comptait 88. La petite est pourtant la plus dense : 60 % des paires de points y portent un trait, contre 31,8 % sur la grande.",

    "Gagner est simple. Zéro croisement. Il n'existe aucune manière de perdre ici.",

    "L'aveu, et il concerne le rangement. Deux points posés exactement au même endroit donnent une grille qui a l'air impeccable : tout est bien serré, plus rien ne traîne. Sauf que les traits partant de ces deux points se rencontrent en ce point-là, et cette rencontre compte comme un croisement. Le compteur reste à un, la grille refuse de se terminer, et la cause est presque invisible parce que le dessin paraît propre. Écartez les points au lieu de les empiler. C'est la seule règle du jeu qui puisse surprendre quelqu'un.",
  ],

  howToPlay: [
    {
      title: "Prendre un point",
      body: "Toucher un point le marque. On peut aussi le faire glisser tout de suite, sans le marquer d'abord.",
    },
    {
      title: "Le reposer",
      body: "Un deuxième appui sur une zone vide y amène le point marqué. Toucher de nouveau le point annule le marquage.",
    },
    {
      title: "Lire les traits",
      body: "Un trait pris dans un croisement change de teinte et devient plus épais. Un trait fin et discret est déjà bien placé.",
    },
    {
      title: "Suivre le compteur",
      body: "La ligne du haut indique combien de croisements restent. C'est le seul nombre qui doit descendre.",
    },
    {
      title: "Finir",
      body: "Zéro croisement et la grille est terminée. Le bouton de reprise en distribue une autre de la même taille.",
    },
  ],

  tips: [
    {
      title: "Tirez vers le centre",
      body: "Tous les points partent du cercle, donc la place libre est au milieu. Un point amené vers le centre raccourcit souvent deux traits d'un coup.",
    },
    {
      title: "Ne regardez que l'épais",
      body: "Oubliez le dessin d'ensemble et suivez les traits marqués. Ce sont les seuls en difficulté, et chaque croisement visible en réunit deux.",
    },
    {
      title: "Un point, puis on relit",
      body: "Bouger un point ne modifie que les traits qui le touchent, jamais les autres. Cette grille se vérifie donc au lieu de se deviner.",
    },
    {
      title: "Acceptez d'aggraver",
      body: "Un robot qui n'accepte qu'une amélioration immédiate démêle la grande grille dans 4,8 % des tirages et se bloque sur tout le reste. Il faut presque toujours passer par une grille pire.",
    },
    {
      title: "Presque tout bouge",
      body: "Sur la grande grille, 11 points sur 12 finissent ailleurs qu'à leur départ, et 4 sur 6 sur la petite. Chercher le point unique qui règle tout revient à chercher ce qui n'existe pas.",
    },
  ],

  teaches: [
    {
      title: "La forme n'est pas le dessin",
      body: "Les traits ne changent jamais et seule la place des points bouge, ce qui transforme un enchevêtrement en dessin lisible. L'idée entre par le doigt bien avant qu'on sache la nommer.",
    },
    {
      title: "Un effet local",
      body: "Un point n'agit que sur les traits qui le touchent. Le comprendre est le moment où la partie cesse de dépendre de la chance.",
    },
    {
      title: "Reculer exprès",
      body: "La grille doit parfois empirer avant de se résoudre, et ici cela ne coûte rien du tout. S'y entraîner est justement le but.",
    },
    {
      title: "Croire un nombre",
      body: "Le compteur de croisements répond à ce que l'oeil rate. Lui faire confiance plutôt qu'à l'image est une vraie compétence.",
    },
  ],

  ages: [
    {
      title: "5 à 6 ans",
      body: "La grille de 6 points. Elle démarre à 5,7 croisements et se règle en quatre déplacements en moyenne.",
    },
    {
      title: "7 à 9 ans",
      body: "Neuf points et 15 traits. Il faut replacer 8 points en moyenne, et l'ordre des déplacements commence à compter.",
    },
    {
      title: "10 ans et plus",
      body: "Douze points, 21 traits et une cinquantaine de croisements ouverts en même temps. Le rangement au coup par coup ne suffit plus.",
    },
    {
      title: "Adultes",
      body: "La même grande grille, jouée contre la montre. La figure était là depuis le début, et la seule question est le temps qu'il faut pour la voir.",
    },
  ],

  accessibility:
    "Chaque point est un vrai bouton portant son propre nom : la touche Entrée ou la barre d'espace le marque, les quatre flèches le déplacent, et la grille entière se résout au clavier seul. Le glissement est un raccourci et jamais une obligation, ce qui compte pour une petite main qui vise encore mal et pour tout dispositif de pointage alternatif, puisque toucher un point puis toucher une destination résout exactement la même grille. La zone à atteindre du doigt est plus large que le cercle dessiné. Un trait pris dans un croisement est marqué par son épaisseur autant que par sa teinte, donc la grille se lit sans distinguer les couleurs. Il y a une horloge et elle ne fait que compter : rien ne s'arrête parce qu'elle avance, et une grille laissée en cours attend telle quelle.",

  together: [
    {
      title: "Un point chacun",
      body: "À tour de rôle, un point par tour. On découvre vite que l'autre vient d'ouvrir le croisement que vous alliez fermer.",
    },
    {
      title: "Le dire avant",
      body: "Annoncer à voix haute où va le point et pourquoi, puis le déplacer. Un enfant capable de répondre joue vraiment, au lieu de suivre son propre doigt.",
    },
    {
      title: "Parier sur la fin",
      body: "Avant le premier déplacement, chacun annonce combien de points finiront ailleurs. Sur la grande grille c'est 11 sur 12, et le pari est presque toujours trop bas.",
    },
    {
      title: "Compter à voix haute",
      body: "Lire le nombre de croisements après chaque déplacement. Les plus petits en déduisent seuls ce qui a causé quoi.",
    },
  ],

  faq: [
    {
      q: "Toutes les grilles ont-elles une solution ?",
      a: "Oui, par construction et non par vérification. Les traits sont posés sans le moindre croisement, les points sont mélangés après, donc un dessin propre existait avant la grille.",
    },
    {
      q: "Faut-il glisser le doigt ?",
      a: "Non. Toucher un point puis toucher sa destination fait la même chose, et les flèches du clavier aussi. Glisser est seulement plus rapide.",
    },
    {
      q: "Et si deux points se retrouvent au même endroit ?",
      a: "Les traits qui en partent se touchent à cet endroit, et cela compte comme un croisement. La grille aura l'air rangée et refusera de finir, donc mieux vaut les écarter.",
    },
    {
      q: "Y a-t-il une limite de temps ?",
      a: "Non. L'horloge se contente de compter, et une grille en cours est encore là après la fermeture du navigateur.",
    },
    {
      q: "Est-ce que cela coûte quelque chose ?",
      a: "C'est gratuit, sans publicité, sans inscription et sans téléchargement. Tout se charge dans le navigateur et continue de marcher hors connexion.",
    },
    {
      q: "À partir de quel âge ?",
      a: "La grille de 6 points marche dès cinq ans, parce que quatre déplacements suffisent en moyenne. La grande intéresse aussi un adulte.",
    },
    {
      q: "Peut-on se retrouver bloqué ?",
      a: "On peut se sentir bloqué, parce qu'il faut parfois amener un point à un endroit qui semble pire. Aucune grille ne se verrouille vraiment et tout déplacement s'annule par un autre.",
    },
  ],

  keywords: [
    "démêler",
    "puzzle de lignes",
    "jeu de logique",
    "planarité",
    "jeu gratuit",
    "casse-tête",
  ],
};
