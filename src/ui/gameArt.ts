/* Ellaz key art - 21 flat-SVG scenes, drawn rather than fetched.
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

   THIS FILE IMPORTS NOTHING, on purpose and for the same reason `themes.ts`
   does: `src/build/**` renders the emitted game pages as pure strings with no
   React and no DOM, and it may read this. The app renders the identical markup
   on the home grid. One source, two consumers, no second implementation to
   drift - which is exactly what happened when there was none: the art was
   approved on 2026-08-03, recorded in the plan as "reused, not reinvented",
   and never wired, so every game shipped as one OS emoji on a colour block for
   four days while every gate reported green. None of them looked at pictures.

   The palette is warmer and higher-contrast than Flat UI, picked so any two
   adjacent thumbnails in a grid stay distinguishable, and `ink` is a deep plum
   rather than black because black on saturated colour reads harsh at
   thumbnail size. */

const PAL = {
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
const I = PAL.ink;

/* ---------------------------------------------------------------------------
   Background deco. One of four, chosen per game so a scrolled grid has rhythm
   rather than 21 identical colour fields.
--------------------------------------------------------------------------- */
type Deco = "circle" | "band" | "arc" | "hill";

const DECO: Record<Deco, (c: string) => string> = {
  circle: (c) => `<circle cx="168" cy="24" r="62" fill="${c}"/>`,
  band:   (c) => `<path d="M0 104 200 56v94H0z" fill="${c}"/>`,
  arc:    (c) => `<path d="M0 150C0 74 45 30 100 30s100 44 100 120z" fill="${c}"/>`,
  hill:   (c) => `<path d="M-10 150c30-46 62-62 110-62s72 22 110 62z" fill="${c}"/>`,
};

/* Sparse confetti, drawn only where a scene leaves room. Kept as a helper so
   the same six marks are reused instead of 21 bespoke ones. */
const dots = (c: string, o?: number): string =>
  `<g fill="${c}" opacity="${o || 0.5}"><circle cx="22" cy="26" r="4"/><circle cx="44" cy="14" r="2.6"/>` +
  `<circle cx="14" cy="52" r="2.6"/><circle cx="182" cy="118" r="3.4"/><circle cx="164" cy="136" r="2.4"/></g>`;

/* ---------------------------------------------------------------------------
   The 21 scenes. `a` is the ground, `b` the deco shape, `d` which deco.
--------------------------------------------------------------------------- */
interface Scene {
  /** the ground colour - this game's identity, like `meta.color` */
  a: string;
  /** the deco shape's colour */
  b: string;
  /** which of the four background shapes */
  d: Deco;
  /** the scene itself */
  s: string;
}

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
  balloons: { a: "#FF4D8D", b: "#FF83B0", d: "arc", s: `
    <g><path d="M44 92c-15 0-25-12-25-27s11-27 25-27 25 12 25 27-10 27-25 27z" fill="${PAL.lagoon}"/>
      <path d="M38 90h12l-6 9z" fill="${PAL.lagoon}"/>
      <ellipse cx="34" cy="52" rx="6" ry="9" fill="${PAL.paper}" opacity=".55" transform="rotate(-20 34 52)"/>
      <path d="M44 99c-6 7 6 9 0 16s5 9 0 15" stroke="${PAL.paper}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
    <g fill="${PAL.sunflower}">
      <path d="M104 34c14 2 22 12 20 22-9-4-18-4-26 2 0-9 2-17 6-24z"/>
      <path d="M78 52c-8 10-7 22 1 28 3-9 9-15 17-18-6-4-12-7-18-10z"/>
      <path d="M124 66c8 6 10 16 5 24-5-7-12-11-20-11 5-5 10-9 15-13z"/></g>
    <circle cx="101" cy="82" r="6" fill="${PAL.sunflower}"/>
    <path d="M101 88c-5 7 6 9 0 16s5 9 0 14" stroke="${PAL.paper}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <g><path d="M158 98c-15 0-25-12-25-27s11-27 25-27 25 12 25 27-10 27-25 27z" fill="${PAL.lime}"/>
      <path d="M152 96h12l-6 9z" fill="${PAL.lime}"/>
      <ellipse cx="148" cy="58" rx="6" ry="9" fill="${PAL.paper}" opacity=".55" transform="rotate(-20 148 58)"/>
      <path d="M158 105c-6 7 6 9 0 16s5 7 0 13" stroke="${PAL.paper}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>` },

  /* bubbles rising, the near one about to be caught */
  bubbles: { a: "#26B0E6", b: "#68CDF2", d: "circle", s: `
    <g fill="${PAL.paper}" opacity=".92">
      <circle cx="62" cy="94" r="30"/><circle cx="126" cy="60" r="20"/><circle cx="158" cy="112" r="14"/><circle cx="30" cy="42" r="11"/></g>
    <g fill="${PAL.lagoon}" opacity=".5"><circle cx="62" cy="94" r="20"/><circle cx="126" cy="60" r="13"/></g>
    <g fill="${PAL.paper}"><circle cx="52" cy="82" r="6"/><circle cx="118" cy="52" r="4"/></g>
    <circle cx="62" cy="94" r="38" fill="none" stroke="${PAL.sunflower}" stroke-width="5" stroke-dasharray="8 7"/>` },

  /* The same creature at three sizes. Redrawn: the first pass was white discs
     with 2px eyes, which at 104px became three anonymous blobs. Ears, a snout
     and eyes big enough to survive the shrink make it read as one animal
     growing rather than as abstract circles. */
  sortsize: { a: "#E4572E", b: "#F0805B", d: "band", s: `
    <g fill="${PAL.paper}">
      <circle cx="30" cy="116" r="8"/><circle cx="34" cy="120" r="14"/>
      <circle cx="80" cy="94" r="13"/><circle cx="86" cy="102" r="23"/>
      <circle cx="152" cy="50" r="19"/><circle cx="160" cy="66" r="34"/></g>
    <g fill="${I}">
      <circle cx="31" cy="118" r="2.6"/><circle cx="39" cy="118" r="2.6"/>
      <circle cx="80" cy="99" r="4"/><circle cx="93" cy="99" r="4"/>
      <circle cx="150" cy="60" r="5.6"/><circle cx="170" cy="60" r="5.6"/></g>
    <g fill="${PAL.clay}">
      <ellipse cx="35" cy="126" rx="4" ry="3"/><ellipse cx="86" cy="110" rx="6.5" ry="5"/>
      <ellipse cx="160" cy="79" rx="10" ry="7.5"/></g>` },

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
  shadows: { a: "#4F5BD5", b: "#7B85EA", d: "hill", s: `
    <path d="M96 20h96v110H96z" fill="${PAL.paper}" opacity=".9"/>
    <path d="M56 38l10.5 22 24 3.5-17.5 17 4 24L56 93.5 35 104.5l4-24-17.5-17 24-3.5z" fill="${PAL.sunflower}"/>
    <path d="M144 38l10.5 22 24 3.5-17.5 17 4 24L144 93.5 123 104.5l4-24-17.5-17 24-3.5z" fill="${I}"/>
    <ellipse cx="56" cy="122" rx="27" ry="6" fill="${I}" opacity=".3"/>
    <ellipse cx="144" cy="122" rx="27" ry="6" fill="${I}" opacity=".16"/>` },

  /* four pads, one lit and ringing */
  echo: { a: "#FFC730", b: "#FFD86E", d: "circle", s: `
    <path d="M96 30H62a10 10 0 0 0-10 10v34h44z" fill="${PAL.raspberry}"/>
    <path d="M104 30h34a10 10 0 0 1 10 10v34h-44z" fill="${PAL.lagoon}"/>
    <path d="M96 82H52v34a10 10 0 0 0 10 10h34z" fill="${PAL.jade}"/>
    <path d="M104 82h44v34a10 10 0 0 1-10 10h-34z" fill="${PAL.paper}"/>
    <g stroke="${PAL.paper}" stroke-width="4" fill="none" opacity=".95">
      <path d="M156 60a22 22 0 0 1 0 36"/><path d="M168 48a38 38 0 0 1 0 60"/></g>` },

  /* honeycomb and the one thing you are allowed to tap */
  bees: { a: "#FFC730", b: "#FFDA7A", d: "band", s: `
    <g fill="${PAL.paper}" opacity=".85">
      <path d="M40 44l16 9v18l-16 9-16-9V53z"/><path d="M40 88l16 9v18l-16 9-16-9V97z"/>
      <path d="M74 66l16 9v18l-16 9-16-9V75z"/></g>
    <g transform="rotate(-12 146 80)">
      <ellipse cx="146" cy="80" rx="30" ry="21" fill="${PAL.sunflower}"/>
      <path d="M132 60h11v40h-11zM154 60h11v40h-11z" fill="${I}"/>
      <ellipse cx="146" cy="80" rx="30" ry="21" fill="none" stroke="${I}" stroke-width="3.5"/>
      <ellipse cx="136" cy="56" rx="18" ry="11" fill="${PAL.paper}" opacity=".92"/>
      <ellipse cx="160" cy="56" rx="16" ry="10" fill="${PAL.paper}" opacity=".92"/>
      <circle cx="172" cy="74" r="3.6" fill="${I}"/></g>` },

  /* frog on a pad, mid-blink */
  frog: { a: "#6FD44E", b: "#98E67D", d: "arc", s: `
    <ellipse cx="100" cy="126" rx="62" ry="16" fill="${PAL.jade}"/>
    <path d="M100 110c-32 0-46-16-46-32s20-30 46-30 46 14 46 30-14 32-46 32z" fill="${PAL.lime}"/>
    <circle cx="76" cy="52" r="16" fill="${PAL.lime}"/><circle cx="124" cy="52" r="16" fill="${PAL.lime}"/>
    <circle cx="76" cy="50" r="9" fill="${PAL.paper}"/><circle cx="124" cy="50" r="9" fill="${PAL.paper}"/>
    <circle cx="78" cy="51" r="4.6" fill="${I}"/><circle cx="126" cy="51" r="4.6" fill="${I}"/>
    <path d="M80 88q20 14 40 0" stroke="${I}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="164" cy="44" r="7" fill="${PAL.paper}" opacity=".8"/>` },

  /* the light turns green and the world lurches forward */
  reaction: { a: "#3FC46B", b: "#6BD68F", d: "band", s: `
    <rect x="70" y="20" width="60" height="112" rx="26" fill="${I}"/>
    <circle cx="100" cy="48" r="15" fill="${PAL.paper}" opacity=".22"/>
    <circle cx="100" cy="84" r="15" fill="${PAL.paper}" opacity=".22"/>
    <circle cx="100" cy="114" r="16" fill="${PAL.lime}"/>
    <g stroke="${PAL.paper}" stroke-width="7" stroke-linecap="round" opacity=".9">
      <path d="M22 62h30M14 88h38M28 112h24"/></g>
    <g stroke="${PAL.paper}" stroke-width="7" stroke-linecap="round" opacity=".9">
      <path d="M148 62h30M148 88h38M156 112h24"/></g>` },

  /* two tiles about to become one */
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
};

/**
 * Every game that has art. Exported so a test can ratchet the count.
 *
 * A FUNCTION, not a `const`. `Object.keys(ART)` at module scope is evaluated
 * when the module loads, which pins the whole 14 KB of scene data into any
 * bundle that touches this file - even one that never draws a single scene.
 * That is not hypothetical: it silently invalidated the first payload control
 * run for this change, which reported the art costing 328 B because the data
 * was present in BOTH arms.
 */
export function artIds(): string[] {
  return Object.keys(ART).sort();
}

export function hasArt(id: string): boolean {
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

/** The ground colour, for chrome that needs to tint with the art. */
export function artGround(id: string): string {
  return ART[id] ? ART[id].a : PAL.indigo;
}
