/* Ellaz key art - the scenes BELOW the fold, in their own lazy chunk.
   ===========================================================================

   WHY THIS FILE EXISTS. `gameArt.ts` used to be one object literal holding
   every scene, so every scene shipped in the SHELL bundle - the home grid is
   statically imported, so whatever a card can draw is downloaded before a child
   has chosen anything. Measured 2026-08-13: 163 B gz per game, unconditional,
   on a screen that shows about eight cards. That is a first visit whose size
   grows with the catalogue, which is the one property a catalogue must not have.

   So the scenes for the cards a visitor can actually SEE on first paint stay in
   `gameArt.ts`, and everything else lives here, fetched on browser idle and
   drawn as it arrives. The grid shows the game's emoji until then - the same
   fallback it has always drawn for a game whose scene nobody has made yet.

   WHICH SCENES BELONG HERE IS NOT A JUDGEMENT CALL. `gameArt.ts` holds exactly
   the first `SHELL_ART_COUNT` games of the roster and this file holds the rest;
   `game-art-split.test.ts` reads both files and the roster and fails the build
   if they disagree. Reordering the roster therefore names the scene to move,
   rather than quietly moving a visible card into the lazy half.

   THIS FILE IMPORTS ONLY `gameArt.ts`, for the vocabulary the scenes are drawn
   in. Reach for anything else - React, the portal, a game - and this stops being
   a data file that `src/build/**` can read in Node with no DOM.

   `dots()` is deliberately NOT imported: no scene here uses it, and an unused
   import is a type error. Import it if one ever does. */
import { I, PAL, type Scene } from "./gameArt";

export const REST: Record<string, Scene> = {
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
  sort: { a: "#26B0E6", b: "#5CC8F0", d: "band", s: `
    <g stroke="${I}" stroke-width="3">
      <rect x="30" y="36" width="28" height="90" rx="14" fill="${PAL.paper}"/>
      <rect x="86" y="36" width="28" height="90" rx="14" fill="${PAL.paper}"/>
      <rect x="142" y="36" width="28" height="90" rx="14" fill="${PAL.paper}"/></g>
    <g fill="${PAL.raspberry}"><circle cx="44" cy="114" r="10"/><circle cx="44" cy="94" r="10"/>
      <circle cx="44" cy="74" r="10"/><circle cx="44" cy="54" r="10"/></g>
    <g><circle cx="100" cy="114" r="10" fill="${PAL.sunflower}"/><circle cx="100" cy="94" r="10" fill="${PAL.lime}"/>
      <circle cx="100" cy="74" r="10" fill="${PAL.sunflower}"/><circle cx="100" cy="54" r="10" fill="${PAL.lime}"/></g>
    <g fill="${PAL.orchid}"><circle cx="156" cy="114" r="10"/><circle cx="156" cy="94" r="10"/></g>` },

  /* Two identical caterpillars below, one butterfly above - which is literally
     what the Hebrew title says, "two make one". Drawn as the RESULT beside the
     ingredients rather than as a left-to-right ladder, because `evolve` already
     owns the ladder picture and two cards telling the same visual story is how
     a grid stops being scannable. */
  merge: { a: "#FF8A3D", b: "#FFAD6E", d: "hill", s: `
    <g fill="${PAL.orchid}">
      <ellipse cx="76" cy="50" rx="21" ry="14" transform="rotate(-22 76 50)"/>
      <ellipse cx="124" cy="50" rx="21" ry="14" transform="rotate(22 124 50)"/></g>
    <g fill="${PAL.sunflower}">
      <ellipse cx="82" cy="74" rx="15" ry="11" transform="rotate(18 82 74)"/>
      <ellipse cx="118" cy="74" rx="15" ry="11" transform="rotate(-18 118 74)"/></g>
    <ellipse cx="100" cy="62" rx="5" ry="20" fill="${I}"/>
    <path d="M98 44c-3-8-9-11-14-12M102 44c3-8 9-11 14-12" fill="none"
          stroke="${I}" stroke-width="2.5" stroke-linecap="round"/>
    <g fill="${PAL.lime}" stroke="${I}" stroke-width="3">
      <circle cx="24" cy="112" r="13"/><circle cx="44" cy="112" r="13"/><circle cx="64" cy="112" r="13"/>
      <circle cx="136" cy="112" r="13"/><circle cx="156" cy="112" r="13"/><circle cx="176" cy="112" r="13"/></g>
    <g fill="${I}"><circle cx="68" cy="107" r="3"/><circle cx="132" cy="107" r="3"/></g>` },

  // Deliberately the SAME silhouette the game itself draws in `PetArt.tsx` -
  // round body, lighter belly, side ears, a sprout on the head, closed happy
  // eyes - because this card is the promise and the screen is what a child
  // gets. A card showing a creature the game does not contain is the same
  // defect as prose claiming a difficulty the game does not have.
  //
  // Drawn back-to-front on purpose: shadow, feet, ears and sprout all go down
  // BEFORE the body, so the body's own outline crops them. Painting an ear
  // after the body leaves a full ellipse stuck to the side of a circle, which
  // reads as a mistake rather than as an ear.
  //
  // Cream body on a raspberry ground rather than the game's pink-on-white: the
  // ground is the card, and a pink creature on a pink field is a silhouette
  // nobody can read at grid size. The pink survives in the belly and the blush.
  pet: { a: "#FF4D8D", b: "#FF9BC0", d: "hill", s: `
    <ellipse cx="100" cy="129" rx="40" ry="7" fill="${I}" opacity="0.14"/>
    <g fill="${I}"><ellipse cx="85" cy="122" rx="12" ry="6"/><ellipse cx="115" cy="122" rx="12" ry="6"/></g>
    <path d="M100 48 L100 30" stroke="${I}" stroke-width="3" stroke-linecap="round"/>
    <path d="M99 32C88 30 84 18 97 14C106 19 106 29 99 32Z" fill="${PAL.lime}"
          stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M101 32C112 30 116 18 103 14C94 19 94 29 101 32Z" fill="${PAL.jade}"
          stroke="${I}" stroke-width="3" stroke-linejoin="round"/>
    <g fill="${PAL.paper}" stroke="${I}" stroke-width="3">
      <ellipse cx="63" cy="80" rx="8" ry="14" transform="rotate(-18 63 80)"/>
      <ellipse cx="137" cy="80" rx="8" ry="14" transform="rotate(18 137 80)"/></g>
    <ellipse cx="100" cy="83" rx="38" ry="40" fill="${PAL.paper}" stroke="${I}" stroke-width="3.5"/>
    <ellipse cx="100" cy="95" rx="23" ry="24" fill="#FFE0EA"/>
    <g fill="${PAL.raspberry}" opacity="0.42"><circle cx="76" cy="87" r="6.5"/><circle cx="124" cy="87" r="6.5"/></g>
    <path d="M82 75c4-5 10-5 14 0M104 75c4-5 10-5 14 0M94 88c3 4 9 4 12 0"
          fill="none" stroke="${I}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M156 40c0-7 9-9 9-2 0-7 9-5 9 2 0 8-9 14-9 14s-9-6-9-14Z"
          fill="${PAL.paper}" stroke="${I}" stroke-width="2.6" stroke-linejoin="round"/>` },

  // A row and a column clearing at the same instant, crossing where they meet.
  //
  // That crossing IS the game, and it is the whole reason this card is not the
  // `blocks` card: blocks shows a piece FALLING, with a down arrow, because
  // gravity on a timer is what that game is. Nothing falls here and nothing is
  // timed - a player picks a shape from the tray on the left and decides where
  // it goes - so the card shows a decision landing rather than a piece dropping.
  // Rows AND columns clear here; only rows do in blocks.
  //
  // The two clears are one rect each rather than ten tile rects. Ten would read
  // identically at grid size and cost five times the bytes, and every scene in
  // this file is downloaded by anyone who scrolls.
  fit: { a: "#17B98A", b: "#3FD1A4", d: "arc", s: `
    <g fill="${PAL.raspberry}" stroke="${I}" stroke-width="3">
      <rect x="8" y="30" width="24" height="24" rx="5"/>
      <rect x="8" y="54" width="24" height="24" rx="5"/>
      <rect x="8" y="78" width="24" height="24" rx="5"/></g>
    <rect x="40" y="20" width="110" height="110" rx="9" fill="${PAL.paper}" stroke="${I}" stroke-width="3.5"/>
    <g stroke="${I}" stroke-width="2" opacity="0.16">
      <path d="M62 20v110M84 20v110M106 20v110M128 20v110"/>
      <path d="M40 42h110M40 64h110M40 86h110M40 108h110"/></g>
    <rect x="43" y="67" width="104" height="16" rx="5" fill="${PAL.sunflower}"/>
    <rect x="109" y="23" width="16" height="104" rx="5" fill="${PAL.lagoon}"/>
    <rect x="45" y="25" width="14" height="14" rx="4" fill="${PAL.orchid}"/>
    <rect x="67" y="111" width="14" height="14" rx="4" fill="${PAL.orchid}"/>
    <path d="M170 62l7 7 13-15" fill="none" stroke="${PAL.paper}" stroke-width="6"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` },

  // A tune half-written: four squares lit on a grid of twelve, and a play
  // triangle beside it.
  //
  // The EMPTY squares are the subject as much as the lit ones - this is the
  // only game in the catalogue with nothing to solve, so the card has to say
  // "there is room here for whatever you want" rather than "here is a puzzle".
  // A grid of all-lit squares would read as a finished thing.
  //
  // Deliberately not `echo`'s card, for the reason written into the head of
  // `music/logic.ts`: there the app plays and the child copies, and the notes
  // are the QUESTION. Here the notes are the answer.
  music: { a: "#A855C9", b: "#C079DC", d: "hill", s: `
    <g stroke="${I}" stroke-width="3">
      <rect x="24" y="46" width="26" height="26" rx="6" fill="${PAL.raspberry}"/>
      <rect x="56" y="46" width="26" height="26" rx="6" fill="${PAL.paper}" opacity="0.42"/>
      <rect x="88" y="46" width="26" height="26" rx="6" fill="${PAL.lagoon}"/>
      <rect x="120" y="46" width="26" height="26" rx="6" fill="${PAL.paper}" opacity="0.42"/>
      <rect x="24" y="78" width="26" height="26" rx="6" fill="${PAL.paper}" opacity="0.42"/>
      <rect x="56" y="78" width="26" height="26" rx="6" fill="${PAL.sunflower}"/>
      <rect x="88" y="78" width="26" height="26" rx="6" fill="${PAL.paper}" opacity="0.42"/>
      <rect x="120" y="78" width="26" height="26" rx="6" fill="${PAL.lime}"/></g>
    <g fill="${PAL.paper}">
      <ellipse cx="60" cy="26" rx="8" ry="6" transform="rotate(-18 60 26)"/>
      <rect x="66" y="6" width="3.4" height="18" rx="1.7"/>
      <ellipse cx="104" cy="20" rx="7" ry="5.4" transform="rotate(-18 104 20)"/>
      <rect x="109" y="3" width="3.2" height="16" rx="1.6"/></g>
    <path d="M158 60l26 15-26 15z" fill="${PAL.paper}" stroke="${I}" stroke-width="3" stroke-linejoin="round"/>` },

  // A mouse, one crumb, and the burrow it is heading for - the whole errand in
  // one picture, which is the game: everything is visible from the first frame
  // and the only question is the ORDER you do it in.
  //
  // Walls are drawn as thick ink strokes rather than as filled hedge blocks,
  // because at grid size a filled maze reads as a texture and a stroked one
  // still reads as a route. Nothing here is `snake`: nothing moves until a tap
  // and a wall cannot kill anybody, so there is no speed or danger to show.
  maze: { a: "#6FD44E", b: "#93E378", d: "band", s: `
    <rect x="18" y="16" width="164" height="118" rx="9" fill="${PAL.paper}" stroke="${I}" stroke-width="3.5"/>
    <g stroke="${I}" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M58 16v46M98 134V90M138 16v58M18 98h38M98 62h58"/></g>
    <circle cx="122" cy="40" r="7" fill="${PAL.sunflower}" stroke="${I}" stroke-width="3"/>
    <g><path d="M148 134c0-18 12-30 26-30v30z" fill="${I}"/>
      <path d="M156 134c0-11 7-19 15-19v19z" fill="${PAL.inkSoft}"/></g>
    <g><path d="M37 68c-9 5-13 12-11 20" stroke="${I}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="46" r="6" fill="${PAL.paper}" stroke="${I}" stroke-width="3"/>
      <circle cx="58" cy="46" r="6" fill="${PAL.paper}" stroke="${I}" stroke-width="3"/>
      <circle cx="49" cy="58" r="15" fill="${PAL.paper}" stroke="${I}" stroke-width="3"/>
      <circle cx="45" cy="55" r="2.6" fill="${I}"/><circle cx="55" cy="55" r="2.6" fill="${I}"/>
      <circle cx="50" cy="63" r="2.6" fill="${PAL.raspberry}"/></g>` },

  /* A picture and its first letter: an apple on a card, and the tile with A lit
     among two blanks - the whole game in one glance, no word of text to read. */
  letters: { a: "#6355E0", b: "#8B84FF", d: "band", s: `
    <rect x="16" y="24" width="84" height="84" rx="15" fill="${PAL.paper}" stroke="${I}" stroke-width="3.5"/>
    <circle cx="58" cy="70" r="27" fill="${PAL.raspberry}"/>
    <path d="M58 45c-2-9 6-15 14-13-1 8-6 13-14 13z" fill="${PAL.lime}"/>
    <path d="M58 47v-8" stroke="${PAL.inkSoft}" stroke-width="4" stroke-linecap="round"/>
    <g stroke="${I}" stroke-width="3.5">
      <rect x="118" y="30" width="64" height="64" rx="14" fill="${PAL.sunflower}"/>
      <rect x="118" y="104" width="28" height="28" rx="8" fill="${PAL.paper}"/>
      <rect x="154" y="104" width="28" height="28" rx="8" fill="${PAL.paper}"/></g>
    <text x="150" y="76" font-family="Fredoka,system-ui,sans-serif" font-size="46" font-weight="800" text-anchor="middle" fill="${I}">A</text>` },

  /* A picture, the row of boxes its name goes in, and one tile on its way into
     the gap. Two boxes are filled and the third is dashed and empty, which is
     the whole game in one line: the word is built letter by letter and the
     length is visible before the first tile lands.

     NO LETTERS here, unlike its sibling `letters` one entry up, and that is
     `wordguess`'s reasoning rather than an oversight: this card is shown to a
     child spelling in Hebrew, English or Spanish, so a Latin glyph would make
     it wrong for two of the three. The bars stand in for writing in any
     direction, and the ONE letter `letters` can safely draw is exactly what
     tells the two cards apart at thumbnail size. */
  spell: { a: "#0E9F94", b: "#35C7BC", d: "band", s: `
    <g stroke="${I}" stroke-width="3.5">
      <rect x="14" y="34" width="56" height="56" rx="13" fill="${PAL.paper}"/>
      <rect x="82" y="40" width="34" height="34" rx="9" fill="${PAL.jade}"/>
      <rect x="120" y="40" width="34" height="34" rx="9" fill="${PAL.jade}"/>
      <rect x="158" y="40" width="34" height="34" rx="9" fill="${PAL.paper}" stroke-dasharray="7 6"/>
      <rect x="158" y="98" width="34" height="34" rx="9" fill="${PAL.sunflower}"/>
    </g>
    <circle cx="42" cy="64" r="17" fill="${PAL.raspberry}"/>
    <path d="M42 45c-2-7 5-12 11-10-1 7-5 10-11 10z" fill="${PAL.lime}"/>
    <path d="M93 51v12M105 51v12M131 51v12M143 51v12"
          stroke="${PAL.paper}" stroke-width="4" stroke-linecap="round"/>
    <path d="M175 109v12" stroke="${I}" stroke-width="4" stroke-linecap="round"/>
    <path d="M175 92v-8M169 88l6-6 6 6" stroke="${I}" stroke-width="3.5"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },

  /* The whole game in one glance: a packed field with one gap in it, and a
     dashed shot leaving the launcher, bouncing off the right wall and arriving
     exactly at that gap. The BOUNCE is the point - it is what separates this
     card from every other circle-on-a-grid game in the catalogue, and it is the
     one thing a player has to learn to be good at.

     The bubbles carry their MARKS here as well as on the board, because the
     card is where somebody with red-green colour blindness first decides
     whether this game is for them. Geometry: the reflection is real - unfold
     the target across the wall at x=186 and the two segments are one straight
     line, so the picture is not merely suggestive of a bounce. */
  bubbleshooter: { a: "#2BA8F0", b: "#7FD0F7", d: "arc", s: `
    <g stroke="${I}" stroke-width="3">
      <circle cx="22" cy="32" r="13" fill="${PAL.raspberry}"/>
      <circle cx="50" cy="32" r="13" fill="${PAL.lagoon}"/>
      <circle cx="78" cy="32" r="13" fill="${PAL.lime}"/>
      <circle cx="106" cy="32" r="13" fill="${PAL.sunflower}"/>
      <circle cx="134" cy="32" r="13" fill="${PAL.lagoon}"/>
      <circle cx="162" cy="32" r="13" fill="${PAL.raspberry}"/>
      <circle cx="36" cy="56" r="13" fill="${PAL.lime}"/>
      <circle cx="64" cy="56" r="13" fill="${PAL.raspberry}"/>
      <circle cx="92" cy="56" r="13" fill="${PAL.sunflower}"/>
      <circle cx="148" cy="56" r="13" fill="${PAL.lagoon}"/>
    </g>
    <circle cx="120" cy="56" r="12" fill="none" stroke="${PAL.paper}"
            stroke-width="3" stroke-dasharray="5 5"/>
    <g fill="${PAL.paper}" opacity="0.85">
      <circle cx="22" cy="32" r="3.4"/>
      <circle cx="64" cy="56" r="3.4"/>
      <circle cx="162" cy="32" r="3.4"/>
    </g>
    <g stroke="${PAL.paper}" stroke-width="3" fill="none" opacity="0.85">
      <circle cx="50" cy="32" r="4.6"/>
      <circle cx="134" cy="32" r="4.6"/>
      <circle cx="148" cy="56" r="4.6"/>
      <path d="M78 27l5.4 9H72.6zM36 51l5.4 9H30.6z" fill="${PAL.paper}" stroke="none"/>
      <path d="M106 27v10M101 32h10M92 51v10M87 56h10"/>
    </g>
    <path d="M100 126 186 86 120 56" fill="none" stroke="${PAL.paper}" stroke-width="3.4"
          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 9" opacity="0.95"/>
    <path d="M74 128a26 26 0 0 1 52 0z" fill="${PAL.inkSoft}" stroke="${I}" stroke-width="3"/>
    <circle cx="100" cy="120" r="14" fill="${PAL.orchid}" stroke="${I}" stroke-width="3"/>
    <path d="M100 114v12M94 120h12" stroke="${PAL.paper}" stroke-width="3" stroke-linecap="round"/>` },

  /* three gems lining up, the row lit and one trade still arrowed */
  match3: { a: "#B43594", b: "#D96BC0", d: "band", s: `
    <rect x="30" y="56" width="140" height="40" rx="20" fill="${PAL.paper}" opacity=".22"/>
    <g fill="${PAL.lagoon}">
      <circle cx="58" cy="76" r="15"/><circle cx="100" cy="76" r="15"/><circle cx="142" cy="76" r="15"/></g>
    <g fill="${PAL.raspberry}">
      <path d="M58 24 73 38 58 52 43 38Z"/><path d="M142 100 157 114 142 128 127 114Z"/></g>
    <g fill="${PAL.lime}">
      <rect x="87" y="26" width="26" height="26" rx="5"/>
      <rect x="45" y="102" width="26" height="26" rx="5"/></g>
    <g fill="${PAL.sunflower}">
      <path d="M142 24l14 26h-28z"/><path d="M100 102l14 26H86z"/></g>
    <g stroke="${PAL.paper}" stroke-width="3.2" fill="none" stroke-linecap="round">
      <path d="M176 92v22M170 98l6-6 6 6M182 108l-6 6-6-6"/></g>
    <g fill="${PAL.paper}" opacity=".9">
      <circle cx="26" cy="30" r="3.6"/><circle cx="176" cy="40" r="2.8"/><circle cx="20" cy="128" r="2.8"/></g>` },

  /* five pieces in, one held above the gap it belongs in */
  jigsaw: { a: "#17798F", b: "#4FB6CC", d: "hill", s: `
    <g stroke="${I}" stroke-width="3">
      <rect x="34" y="36" width="38" height="38" rx="6" fill="${PAL.raspberry}"/>
      <rect x="76" y="36" width="38" height="38" rx="6" fill="${PAL.sunflower}"/>
      <rect x="34" y="78" width="38" height="38" rx="6" fill="${PAL.lime}"/>
      <rect x="76" y="78" width="38" height="38" rx="6" fill="${PAL.orchid}"/>
      <rect x="118" y="78" width="38" height="38" rx="6" fill="${PAL.tangerine}"/>
    </g>
    <rect x="118" y="36" width="38" height="38" rx="6" fill="${PAL.ink}" opacity=".28"
          stroke="${PAL.paper}" stroke-width="3" stroke-dasharray="6 5"/>
    <g transform="rotate(-12 160 24)">
      <rect x="141" y="6" width="38" height="38" rx="6" fill="${PAL.lagoon}"
            stroke="${I}" stroke-width="3"/>
      <circle cx="160" cy="25" r="6" fill="${PAL.paper}" opacity=".5"/>
    </g>
    <g fill="${PAL.paper}" opacity=".85">
      <circle cx="20" cy="26" r="3.4"/><circle cx="186" cy="70" r="2.8"/><circle cx="24" cy="132" r="2.8"/></g>` },
};
