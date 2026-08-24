/* Ellaz key art - flat-SVG scenes, drawn rather than fetched.
   ===========================================================================

   WHY DRAWN AND NOT SCREENSHOTS. The home grid ships in the SHELL bundle
   (`catalog.ts` imports every `meta.ts` statically), so whatever a game card
   shows is downloaded before a child has picked anything. 21 raster
   screenshots would be hundreds of KB on a first visit against a 76,000 B gz
   ceiling - and a screenshot of memory is a grid of identical card backs,
   which tells a five-year-old nothing. Each scene here is built from a SHARED
   vocabulary (one background system, one deco system, one ink), which is what
   makes 21 of them compress to a few KB instead of reading as 21 unrelated
   drawings.

   Every scene is authored on a 200x150 stage. No <defs>, no gradients, no
   filters: ids collide when the same SVG is inlined 21 times on one page, and
   flat shapes gzip far better than gradient stops.

   THIS FILE HOLDS ONLY THE SCENES ABOVE THE FOLD. It used to hold all of them,
   and that made the first visit grow with the catalogue - 163 B gz per game,
   paid by every child, for cards most of them never scroll to. The rest live in
   `gameArtRest.ts` and arrive on browser idle; `SHELL_ART_COUNT` below says how
   the line is drawn and `game-art-split.test.ts` enforces it. Adding a game
   costs this file nothing, which is the whole point.

   THIS FILE IMPORTS NOTHING, on purpose and for the same reason `themes.ts`
   does: `src/build/**` renders the emitted game pages as pure strings with no
   React and no DOM, and it may read this. The app renders the identical markup
   on the home grid. One source, two consumers, no second implementation to
   drift - which is exactly what happened when there was none: the art was
   approved on 2026-08-03, recorded in the plan as "reused, not reinvented",
   and never wired, so every game shipped as one OS emoji on a colour block for
   four days while every gate reported green. None of them looked at pictures.
   `gameArtRest.ts` imports this one for the palette and nothing else, so the
   arrow only ever points that way and the leaf stays a leaf.

   The palette is warmer and higher-contrast than Flat UI, picked so any two
   adjacent thumbnails in a grid stay distinguishable, and `ink` is a deep plum
   rather than black because black on saturated colour reads harsh at
   thumbnail size. */

/* EXPORTED for `gameArtRest.ts`, which draws in the same vocabulary. Nothing
   else may read it: the palette is the art's own, not a theme. */
export const PAL = {
  ink:       "#241C3B",
  inkSoft:   "#4A4066",
  paper:     "#FFF7EC",
  raspberry: "#FF4D8D",
  tangerine: "#FF8A3D",
  sunflower: "#FFC730",
  lime:      "#6FD44E",
  jade:      "#17B98A",
  lagoon:    "#26B0E6",
  indigo:    "#4F5BD5",
  orchid:    "#A855C9",
  clay:      "#E4572E",
};
export const I = PAL.ink;

/* ---------------------------------------------------------------------------
   Background deco. One of four, chosen per game so a scrolled grid has rhythm
   rather than 21 identical colour fields.
--------------------------------------------------------------------------- */
export type Deco = "circle" | "band" | "arc" | "hill";

const DECO: Record<Deco, (c: string) => string> = {
  circle: (c) => `<circle cx="168" cy="24" r="62" fill="${c}"/>`,
  band:   (c) => `<path d="M0 104 200 56v94H0z" fill="${c}"/>`,
  arc:    (c) => `<path d="M0 150C0 74 45 30 100 30s100 44 100 120z" fill="${c}"/>`,
  hill:   (c) => `<path d="M-10 150c30-46 62-62 110-62s72 22 110 62z" fill="${c}"/>`,
};

/* Sparse confetti, drawn only where a scene leaves room. Kept as a helper so
   the same six marks are reused instead of 21 bespoke ones. */
export const dots = (c: string, o?: number): string =>
  `<g fill="${c}" opacity="${o || 0.5}"><circle cx="22" cy="26" r="4"/><circle cx="44" cy="14" r="2.6"/>` +
  `<circle cx="14" cy="52" r="2.6"/><circle cx="182" cy="118" r="3.4"/><circle cx="164" cy="136" r="2.4"/></g>`;

/* ---------------------------------------------------------------------------
   A scene. `a` is the ground, `b` the deco shape, `d` which deco.
--------------------------------------------------------------------------- */
export interface Scene {
  /** the ground colour - this game's identity, like `meta.color` */
  a: string;
  /** the deco shape's colour */
  b: string;
  /** which of the four background shapes */
  d: Deco;
  /** the scene itself */
  s: string;
}

/**
 * How many of the roster's games keep their scene in the SHELL.
 *
 * 16, and it is a MEASUREMENT rather than a round number. Driven in a real
 * browser against a production build with a fresh profile - the worst case,
 * since a returning player's keep-playing row pushes the grid further down:
 *
 *   390 x 844 phone     3 columns,  6 cards start above the fold, 3 fully visible
 *   1280 x 800 desktop  8 columns, 16 cards start above the fold, 8 fully visible
 *
 * 16 is the largest number of cards anyone was measured to reach without
 * scrolling, so nothing a visitor can see on first paint waits for a network
 * request. Erring large costs 163 B gz per extra scene ONCE and nothing per
 * game after that - the slope is set by which side of the split a NEW game
 * lands on, and a new game is appended to the roster, so it is always lazy.
 * Erring small costs a visible emoji-to-art flash on the one screen every
 * session starts on, which is what the 2026-08-11 ceiling note already refused
 * to pay for.
 */
// 15, not 16, since the big/small game was removed from the middle of the
// roster and its scene left the shell half with it — the split stays aligned
// with the roster and one fewer scene ships on a first visit.
export const SHELL_ART_COUNT = 15;

/**
 * The scenes a first visit carries. The rest are in `gameArtRest.ts`.
 *
 * A FUNCTION-FREE object literal on purpose, same as before: `src/build/**`
 * reads this in Node to emit the game pages and the og cards.
 */
const ART: Record<string, Scene> = {
  /* two cards, one turned up on a star — the moment the pair matches */
  memory: { a: "#FF4D8D", b: "#FF7FAC", d: "circle", s: `
    <g transform="rotate(-9 74 84)"><rect x="42" y="46" width="64" height="82" rx="9" fill="${PAL.paper}"/>
      <rect x="50" y="54" width="48" height="66" rx="6" fill="${PAL.indigo}"/>
      <circle cx="74" cy="87" r="13" fill="${PAL.paper}"/><circle cx="74" cy="87" r="6" fill="${PAL.indigo}"/></g>
    <g transform="rotate(8 130 82)"><rect x="98" y="42" width="64" height="82" rx="9" fill="${PAL.paper}"/>
      <path d="M130 58l7.4 15 16.6 2.4-12 11.7 2.8 16.5-14.8-7.8-14.8 7.8 2.8-16.5-12-11.7 16.6-2.4z" fill="${PAL.sunflower}"/></g>` },

  /* egg → chick → beast, left to right: the whole game in one line */
  evolve: { a: "#17B98A", b: "#3FD1A4", d: "hill", s: `
    <ellipse cx="42" cy="112" rx="17" ry="21" fill="${PAL.paper}"/>
    <path d="M25 112a17 21 0 0 0 34 0z" fill="#E7DCC6"/>
    <g><ellipse cx="100" cy="106" rx="23" ry="21" fill="${PAL.sunflower}"/>
      <circle cx="94" cy="100" r="3.4" fill="${I}"/><path d="M104 104l11 4-11 4z" fill="${PAL.tangerine}"/>
      <path d="M92 127h5v8h-5zM106 127h5v8h-5z" fill="${PAL.tangerine}"/></g>
    <g><path d="M136 122c0-24 12-38 30-38s28 12 28 30c0 14-8 20-8 20z" fill="${PAL.lime}"/>
      <path d="M150 84l7-14 6 14zM166 82l7-16 6 16z" fill="${PAL.jade}"/>
      <circle cx="180" cy="98" r="3.6" fill="${I}"/><path d="M136 122h58v10h-58z" fill="${PAL.jade}"/></g>` },

  /* a butterfly, half filled and half still outline — the game's actual state */
  coloring: { a: "#FF8A3D", b: "#FFAA6B", d: "arc", s: `
    <path d="M100 40v78" stroke="${I}" stroke-width="6" stroke-linecap="round"/>
    <path d="M98 46c-26-22-56-16-56 10s26 40 56 30z" fill="${PAL.orchid}"/>
    <path d="M98 92c-22-6-44 6-44 24s22 24 44 4z" fill="${PAL.lagoon}"/>
    <path d="M102 46c26-22 56-16 56 10s-26 40-56 30z" fill="none" stroke="${I}" stroke-width="5"/>
    <path d="M102 92c22-6 44 6 44 24s-22 24-44 4z" fill="none" stroke="${I}" stroke-width="5"/>
    <path d="M100 40c-4-10-12-12-16-10M100 40c4-10 12-12 16-10" stroke="${I}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g transform="rotate(28 168 120)"><rect x="162" y="88" width="13" height="40" rx="3" fill="${PAL.paper}"/>
      <path d="M162 128h13l-6.5 16z" fill="${PAL.raspberry}"/></g>` },

  /* two panels, one dot different, one already circled */
  finddiff: { a: "#26B0E6", b: "#5BC7F0", d: "band", s: `
    <rect x="14" y="34" width="76" height="82" rx="9" fill="${PAL.paper}"/>
    <rect x="110" y="34" width="76" height="82" rx="9" fill="${PAL.paper}"/>
    <g fill="${PAL.jade}"><circle cx="40" cy="62" r="12"/><circle cx="136" cy="62" r="12"/></g>
    <g fill="${PAL.tangerine}"><rect x="56" y="82" width="24" height="22" rx="4"/><rect x="152" y="82" width="24" height="22" rx="4"/></g>
    <circle cx="68" cy="58" r="7" fill="${PAL.raspberry}"/>
    <circle cx="164" cy="58" r="12" fill="none" stroke="${PAL.raspberry}" stroke-width="4" stroke-dasharray="5 4"/>` },

  /* eyes peering out of the dark, one lit by the glass */
  hidden: { a: "#4F5BD5", b: "#6E78E6", d: "circle", s: `
    <g fill="${PAL.paper}"><ellipse cx="56" cy="70" rx="17" ry="12"/><ellipse cx="96" cy="70" rx="17" ry="12"/></g>
    <circle cx="58" cy="70" r="6.5" fill="${I}"/><circle cx="94" cy="70" r="6.5" fill="${I}"/>
    <g opacity=".45" fill="${PAL.paper}"><ellipse cx="44" cy="112" rx="12" ry="8"/><ellipse cx="74" cy="112" rx="12" ry="8"/></g>
    <circle cx="146" cy="86" r="34" fill="none" stroke="${PAL.sunflower}" stroke-width="8"/>
    <circle cx="146" cy="86" r="27" fill="${PAL.paper}" opacity=".3"/>
    <path d="M170 110l20 20" stroke="${PAL.sunflower}" stroke-width="10" stroke-linecap="round"/>` },

  /* number blocks and the sign that joins them */
  math: { a: "#6FD44E", b: "#93E378", d: "hill", s: `
    <g transform="rotate(-7 46 84)"><rect x="18" y="56" width="56" height="56" rx="10" fill="${PAL.paper}"/>
      <path d="M46 70v28M32 84h28" stroke="${PAL.jade}" stroke-width="9" stroke-linecap="round"/></g>
    <path d="M92 84h20M102 74v20" stroke="${I}" stroke-width="8" stroke-linecap="round"/>
    <g transform="rotate(6 156 82)"><rect x="128" y="54" width="56" height="56" rx="10" fill="${PAL.paper}"/>
      <path d="M142 82h28" stroke="${PAL.raspberry}" stroke-width="9" stroke-linecap="round"/></g>
    ${dots(PAL.paper, 0.55)}` },

  /* Two intact balloons and one already burst. Redrawn at small size: the first
     version's radial rays read as a SUN, which is worse than illegible — it
     looked like a different game. Curved FRAGMENTS flying apart, plus the knot
     left dangling on its string, say "popped" with no ambiguity. */

  /* a row that plainly continues, ending in the card you must fill */
  sequence: { a: "#A855C9", b: "#C079DC", d: "band", s: `
    <rect x="12" y="56" width="38" height="38" rx="7" fill="${PAL.sunflower}"/>
    <circle cx="79" cy="75" r="19" fill="${PAL.lagoon}"/>
    <rect x="98" y="56" width="38" height="38" rx="7" fill="${PAL.sunflower}"/>
    <rect x="146" y="52" width="46" height="46" rx="8" fill="${PAL.paper}" stroke="${I}" stroke-width="4" stroke-dasharray="7 6"/>
    <path d="M162 70c0-7 5-11 11-11s10 4 10 10c0 7-9 7-9 13" stroke="${I}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="174" cy="90" r="3.4" fill="${I}"/>` },

  /* three shapes, the middle one leaving in a puff */
  vanish: { a: "#17B98A", b: "#4BD3AF", d: "circle", s: `
    <rect x="16" y="58" width="42" height="42" rx="8" fill="${PAL.sunflower}"/>
    <circle cx="164" cy="79" r="22" fill="${PAL.raspberry}"/>
    <g fill="${PAL.paper}" opacity=".9"><circle cx="96" cy="76" r="17"/><circle cx="114" cy="66" r="11"/><circle cx="82" cy="62" r="9"/><circle cx="110" cy="90" r="8"/></g>
    <g stroke="${PAL.paper}" stroke-width="4" stroke-linecap="round" opacity=".8">
      <path d="M96 44v-9M74 50l-6-7M120 50l6-7"/></g>` },

  /* Object and its cast shadow. Redrawn: an ink star at 55% on an indigo ground
     had almost no edge at 104px — the pair read as one star and a smudge. The
     shadow now sits on a PALE panel, so it is a hard silhouette against light
     rather than dark-on-dark, which is what makes the pairing legible. */
  "2048": { a: "#FFC730", b: "#FFDD8A", d: "circle", s: `
    <rect x="20" y="52" width="52" height="52" rx="9" fill="${PAL.paper}"/>
    <rect x="128" y="52" width="52" height="52" rx="9" fill="${PAL.paper}"/>
    <text x="46" y="88" font-family="Rubik,system-ui,sans-serif" font-size="30" font-weight="700" fill="${PAL.tangerine}" text-anchor="middle">2</text>
    <text x="154" y="88" font-family="Rubik,system-ui,sans-serif" font-size="30" font-weight="700" fill="${PAL.tangerine}" text-anchor="middle">2</text>
    <path d="M84 78h32M104 66l12 12-12 12" stroke="${I}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="${PAL.paper}" opacity=".85"><circle cx="100" cy="34" r="4"/><circle cx="118" cy="122" r="3.4"/></g>` },

  /* The winning line, already drawn. Redrawn for the shrink: the first version
     had a 6px grid, three Os, two Xs AND a strike line all fighting at 104px.
     Now the grid is a thin guide, the winning diagonal is the boldest thing on
     the tile, and only two Xs remain — enough to read as a game, few enough to
     leave the line room. */
  tictactoe: { a: "#26B0E6", b: "#63C9F0", d: "hill", s: `
    <g stroke="${PAL.paper}" stroke-width="4" stroke-linecap="round" opacity=".75">
      <path d="M76 24v104M124 24v104M48 50h104M48 102h104"/></g>
    <g stroke="${PAL.raspberry}" stroke-width="9" stroke-linecap="round">
      <path d="M92 30l16 16M108 30l-16 16"/><path d="M56 108l16 16M72 108l-16 16"/></g>
    <!-- strike UNDER the winning marks, and in ink at low weight: drawn on top
         at 8px it swallowed the three Os it was supposed to be celebrating. -->
    <path d="M54 30l92 92" stroke="${I}" stroke-width="5" stroke-linecap="round" opacity=".38"/>
    <g stroke="${PAL.sunflower}" stroke-width="11" stroke-linecap="round" fill="none">
      <circle cx="62" cy="38" r="14"/><circle cx="100" cy="76" r="14"/><circle cx="138" cy="114" r="14"/></g>` },

  /* a flag planted next to a number that tells you where not to go */
  minesweeper: { a: "#4F5BD5", b: "#828BEE", d: "band", s: `
    <g fill="${PAL.paper}"><rect x="16" y="34" width="50" height="50" rx="6"/><rect x="74" y="34" width="50" height="50" rx="6"/>
      <rect x="16" y="92" width="50" height="50" rx="6"/></g>
    <g fill="${PAL.inkSoft}" opacity=".22"><rect x="132" y="34" width="50" height="50" rx="6"/><rect x="74" y="92" width="50" height="50" rx="6"/></g>
    <text x="41" y="72" font-family="Rubik,system-ui,sans-serif" font-size="30" font-weight="700" fill="${PAL.indigo}" text-anchor="middle">3</text>
    <text x="41" y="130" font-family="Rubik,system-ui,sans-serif" font-size="30" font-weight="700" fill="${PAL.jade}" text-anchor="middle">1</text>
    <path d="M96 74V44" stroke="${I}" stroke-width="5" stroke-linecap="round"/>
    <path d="M96 44l22 8-22 9z" fill="${PAL.raspberry}"/>
    <path d="M86 74h20v5H86z" fill="${I}"/>` },

  /* a grid with just enough filled in to look solvable */
  sudoku: { a: "#A855C9", b: "#C68BDC", d: "circle", s: `
    <rect x="26" y="16" width="148" height="118" rx="8" fill="${PAL.paper}"/>
    <g stroke="${PAL.orchid}" stroke-width="2.6" opacity=".5"><path d="M75 16v118M125 16v118M26 55h148M26 94h148"/></g>
    <g stroke="${I}" stroke-width="4"><path d="M75 16v118M125 16v118M26 55h148M26 94h148"/></g>
    <g font-family="Rubik,system-ui,sans-serif" font-size="24" font-weight="700" text-anchor="middle">
      <text x="50" y="45" fill="${PAL.indigo}">5</text><text x="150" y="45" fill="${PAL.indigo}">9</text>
      <text x="100" y="84" fill="${PAL.raspberry}">7</text>
      <text x="50" y="123" fill="${PAL.indigo}">2</text><text x="150" y="123" fill="${PAL.jade}">4</text></g>` },

  /* the snake, the apple, and the gap between them */
  snake: { a: "#17B98A", b: "#4CD4B0", d: "hill", s: `
    <path d="M28 118h44a18 18 0 0 0 0-36H56a18 18 0 0 1 0-36h30" fill="none" stroke="${PAL.lime}"
          stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 118h44a18 18 0 0 0 0-36H56a18 18 0 0 1 0-36h30" fill="none" stroke="${PAL.paper}"
          stroke-width="6" stroke-linecap="round" stroke-dasharray="2 20" opacity=".55"/>
    <circle cx="92" cy="46" r="15" fill="${PAL.lime}"/>
    <circle cx="97" cy="42" r="3.6" fill="${I}"/>
    <path d="M106 48l12 3-12 4z" fill="${PAL.raspberry}"/>
    <circle cx="158" cy="92" r="20" fill="${PAL.raspberry}"/>
    <path d="M158 72v-9" stroke="${PAL.jade}" stroke-width="5" stroke-linecap="round"/>
    <path d="M158 66c6-8 15-7 15-7s0 10-15 7z" fill="${PAL.jade}"/>` },

  /* one piece still falling, over a stack with a gap exactly its shape - the
     decision the game is made of, drawn rather than described */
  blocks: { a: "#6D4BD6", b: "#8A6CE4", d: "band", s: `
    <g stroke="${I}" stroke-width="3">
      <rect x="70" y="16" width="26" height="26" rx="5" fill="${PAL.sunflower}"/>
      <rect x="96" y="16" width="26" height="26" rx="5" fill="${PAL.sunflower}"/>
      <rect x="96" y="42" width="26" height="26" rx="5" fill="${PAL.sunflower}"/>
    </g>
    <path d="M108 76v16M100 86l8 8 8-8" stroke="${PAL.paper}" stroke-width="5"
          stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".8"/>
    <g stroke="${I}" stroke-width="3">
      <rect x="18" y="98" width="26" height="26" rx="5" fill="${PAL.lagoon}"/>
      <rect x="44" y="98" width="26" height="26" rx="5" fill="${PAL.jade}"/>
      <rect x="18" y="124" width="26" height="26" rx="5" fill="${PAL.raspberry}"/>
      <rect x="44" y="124" width="26" height="26" rx="5" fill="${PAL.tangerine}"/>
      <rect x="70" y="124" width="26" height="26" rx="5" fill="${PAL.lime}"/>
      <rect x="122" y="98" width="26" height="26" rx="5" fill="${PAL.clay}"/>
      <rect x="148" y="98" width="26" height="26" rx="5" fill="${PAL.orchid}"/>
      <rect x="122" y="124" width="26" height="26" rx="5" fill="${PAL.lagoon}"/>
      <rect x="148" y="124" width="26" height="26" rx="5" fill="${PAL.sunflower}"/>
      <rect x="174" y="124" width="26" height="26" rx="5" fill="${PAL.jade}"/>
    </g>` },

  /* A guessed row and a blank one under it. The two SOLVED tiles are jade and
     orchid — the same pair the board uses, so the card teaches the colour
     language before the game is even opened. No letters: a glyph at 36px on a
     thumbnail is mush, and drawing Hebrew here would make the card wrong in
     English. The bars inside stand in for writing in either direction. */
  wordguess: { a: "#A855C9", b: "#C077DE", d: "arc", s: `
    <g stroke="${I}" stroke-width="3">
      <rect x="19" y="38" width="36" height="36" rx="8" fill="${PAL.jade}"/>
      <rect x="61" y="38" width="36" height="36" rx="8" fill="${PAL.orchid}"/>
      <rect x="103" y="38" width="36" height="36" rx="8" fill="${PAL.paper}"/>
      <rect x="145" y="38" width="36" height="36" rx="8" fill="${PAL.jade}"/>
      <rect x="19" y="84" width="36" height="36" rx="8" fill="${PAL.paper}"/>
      <rect x="61" y="84" width="36" height="36" rx="8" fill="${PAL.paper}"/>
      <rect x="103" y="84" width="36" height="36" rx="8" fill="${PAL.paper}"/>
      <rect x="145" y="84" width="36" height="36" rx="8" fill="${PAL.paper}"/>
    </g>
    <path d="M29 50v12M45 50v12M71 50v12M87 56v6M155 56v6M171 50v12"
          stroke="${PAL.paper}" stroke-width="4" stroke-linecap="round"/>` },

  /* Three tubes: one already sorted, one still mixed, one part-filled. That is
     the entire game in one picture and it needs no word of text, which matters
     because this card is read by four-year-olds in three languages.

     A cool ground on purpose - the balls are the subject, and they only pop
     against something that is not competing with them. The other `think` games
     sit on yellow, purple, indigo and jade, so lagoon also keeps two adjacent
     thumbnails apart, which is the one property this palette was chosen for. */
};

/**
 * The lazy half, by id, with the ground colour it draws on.
 *
 * TWO THINGS THIS BUYS, and neither is optional:
 *
 *   `hasArt` stays EXACT before the chunk lands. The home grid asks it once,
 *   per card, to decide whether to render the picture or the emoji-on-a-tint
 *   branch - and a card that answered "no picture" at first paint would keep
 *   the emoji for the whole session, because nothing re-renders that decision.
 *   Answering "yes, shortly" instead means only the INSIDE of the card swaps.
 *
 *   `artGround` stays CORRECT. It is read at build time to colour each game
 *   page's header bar, and a missing entry falls back to one indigo - a
 *   plausible picture with no error anywhere, which is precisely the failure
 *   CLAUDE.md records under "--g is not ambient".
 *
 * The colours are duplicated from the scenes they describe, so
 * `game-art-split.test.ts` pins each one against `REST`'s own `a`.
 */
const LAZY_GROUNDS: Record<string, string> = {
  lettercross: "#B33A3A",
  balloons: "#FF4D8D",
  bubbles: "#26B0E6",
  shadows: "#4F5BD5",
  echo: "#FFC730",
  bees: "#FFC730",
  frog: "#6FD44E",
  reaction: "#3FC46B",
  sort: "#26B0E6",
  merge: "#FF8A3D",
  pet: "#FF4D8D",
  fit: "#17B98A",
  music: "#A855C9",
  maze: "#6FD44E",
  letters: "#6355E0",
  spell: "#0E9F94",
  bubbleshooter: "#2BA8F0",
  match3: "#B43594",
  jigsaw: "#17798F",
};

/* ---------------------------------------------------------------------------
   Loading the rest.

   The dynamic import lives inside a FUNCTION, never at module scope. A
   module-scope `import()` (or a `lazy(() => import(...))`) keeps the chunk in
   the production module graph, and Vite then writes a `<link
   rel="modulepreload">` for it into index.html - an eager download that no
   globIgnores entry can prevent, because a preload is not the precache. That
   shipped once already; see .claude/rules/precache-glob-sweeps-new-chunks.md.

   Three changes make this real and they are all in that rule: this import, the
   NAMED `art-rest` branch in vite.config manualChunks, and the matching
   `art-rest-*.js` entry in globIgnores. Two of three leaves the payload exactly
   where it was, behind a green build.
--------------------------------------------------------------------------- */

let restState: "idle" | "loading" | "ready" = "idle";
let revision = 0;
const listeners = new Set<() => void>();

/**
 * Fold a set of scenes into the registry.
 *
 * Exported because `src/build/**` and the share card need EVERY scene
 * synchronously, and they are free to: neither is in the shell bundle, so a
 * static import of the lazy half costs a first visit nothing.
 */
export function registerArt(more: Record<string, Scene>): void {
  Object.assign(ART, more);
  restState = "ready";
  revision += 1;
  for (const notify of [...listeners]) notify();
}

/**
 * Fetch the below-the-fold scenes. Idempotent, and never throws: a failed
 * fetch leaves those cards on their emoji, which is a fallback and not a bug.
 */
export function loadRestArt(): void {
  if (restState !== "idle") return;
  restState = "loading";
  void import("./gameArtRest")
    .then((m) => registerArt(m.REST))
    .catch(() => {
      // Let a later mount try again. An offline first paint should not cost a
      // player their pictures for the whole session.
      restState = "idle";
    });
}

/** Re-render when scenes arrive. Paired with `artRevision` for useSyncExternalStore. */
export function subscribeArt(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** A value that CHANGES when new scenes land, and is stable otherwise. */
export function artRevision(): number {
  return revision;
}

/**
 * Every game that has art, loaded or not. Exported so a test can ratchet the
 * count - which is why it must answer for the lazy half too, or the coverage
 * gate would silently only ever check the shell.
 *
 * A FUNCTION, not a `const`. `Object.keys(ART)` at module scope is evaluated
 * when the module loads, which pins the whole scene data into any bundle that
 * touches this file - even one that never draws a single scene. That is not
 * hypothetical: it silently invalidated the first payload control run for the
 * drawings, which reported the art costing 328 B because the data was present
 * in BOTH arms.
 */
export function artIds(): string[] {
  return [...new Set([...Object.keys(ART), ...Object.keys(LAZY_GROUNDS)])].sort();
}

/** Is there a scene for this game - now, or once the lazy half lands? */
export function hasArt(id: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(ART, id) ||
    Object.prototype.hasOwnProperty.call(LAZY_GROUNDS, id)
  );
}

/** Has a scene ARRIVED - as opposed to being promised by `hasArt`? */
export function artReady(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ART, id);
}

/**
 * The full-bleed key art for a game, as an SVG string.
 *
 * THE THEME REACHES IN THROUGH ONE RECT, and that is deliberate. The obvious
 * way to theme this is to swap `paper` and `ink` for tokens - and it breaks
 * every drawing: a memory card rendered in night's `--surface` is a dark navy
 * playing card, and the shapes stop meaning what they were drawn to mean. The
 * saturated grounds are the game's identity for the same reason `meta.color`
 * is, so those stay too.
 *
 * What genuinely needs to change between themes is how loudly 21 bright tiles
 * shout off a dark page. A single uniform veil does exactly that: it deepens
 * every scene by the same amount, so it cannot disturb the one property the
 * palette was chosen for - that any two adjacent thumbnails stay
 * distinguishable - and it costs one declaration and zero JavaScript.
 *
 * It is `style=`, not `fill=`, because a presentation attribute does not
 * accept `var()`. Inline SVG only, which is what both consumers render.
 */
export function gameArt(id: string, cls?: string): string {
  const t = ART[id];
  if (!t) return "";
  return (
    `<svg class="${cls || "ellaz-art"}" viewBox="0 0 200 150" ` +
    `preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">` +
    `<rect width="200" height="150" fill="${t.a}"/>` +
    DECO[t.d](t.b) +
    t.s +
    `<rect width="200" height="150" style="fill:var(--art-veil,transparent)"/>` +
    `</svg>`
  );
}

/**
 * The ground colour, for chrome that needs to tint with the art.
 *
 * Answers for the lazy half BEFORE it loads, out of `LAZY_GROUNDS`. Without
 * that it would fall back to one indigo for ten of the games - and the caller
 * is the emitted game page's header bar, which would then render a plausible,
 * wrong colour with no error anywhere.
 */
export function artGround(id: string): string {
  return ART[id]?.a ?? LAZY_GROUNDS[id] ?? PAL.indigo;
}
