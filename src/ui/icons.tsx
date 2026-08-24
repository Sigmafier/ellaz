import type { ReactElement } from "react";

/**
 * The app's icon set. Inline SVG, `stroke="currentColor"`, one geometry.
 *
 * Every glyph is drawn on the SAME 24-unit grid at the SAME 2.1 stroke weight,
 * with round caps and joins. That uniformity is the whole point and it is not
 * decoration: the set this replaced mixed solid fills (home, star) with hairline
 * stroked arcs (speaker), so the home read heavy beside the speaker and the row
 * looked collected rather than drawn. Nobody can say which icon is wrong when
 * that happens - they just say the screen looks cheap.
 *
 * So: adding an icon means drawing it at 2.1 on the 24 grid with round caps. An
 * icon that needs a different weight to look right is drawn wrong, not weighted
 * wrong.
 *
 * Emoji are not an option here - they cannot take `currentColor`, they render
 * differently on every OS, and they carry no accessible name.
 */
export type IconName =
  | "home"
  | "redo"
  | "sound"
  | "muted"
  | "trophy"
  | "clock"
  | "star"
  | "draw"
  | "cards"
  | "moves"
  | "flag"
  | "layers"
  | "bolt"
  | "check"
  | "heart"
  | "coin"
  | "back"
  | "expand"
  | "pause"
  | "play"
  | "globe"
  | "sun"
  | "moon";

const PATHS: Record<IconName, string> = {
  home:
    "M3.8 10.6 12 4.2l8.2 6.4" +
    "M5.9 12.2v6.6a1.4 1.4 0 0 0 1.4 1.4h9.4a1.4 1.4 0 0 0 1.4-1.4v-6.6" +
    "M9.9 20.2v-4.6h4.2v4.6",
  redo: "M20 12a8 8 0 1 1-2.34-5.66M20.4 4.2v4.4h-4.4",
  sound: "M4.4 9.6h2.9L11.6 6v12L7.3 14.4H4.4zM15.1 9.5a4.4 4.4 0 0 1 0 5M17.9 6.9a8.4 8.4 0 0 1 0 10.2",
  muted: "M4.4 9.6h2.9L11.6 6v12L7.3 14.4H4.4zM15.4 10.2l4.4 4.4M19.8 10.2l-4.4 4.4",
  // The base I drew first was a single arc that crossed itself and rendered as
  // an hourglass under the cup. A trapezoid plus a foot is the shape a trophy
  // actually has, and it survives being scaled down to 18px.
  trophy:
    "M7.6 4.4h8.8v4.3a4.4 4.4 0 0 1-8.8 0z" +
    "M7.6 5.9H5.2v1a2.9 2.9 0 0 0 2.4 2.8" +
    "M16.4 5.9h2.4v1a2.9 2.9 0 0 1-2.4 2.8" +
    "M12 13.1v2.9M10.1 19.4l.6-3.7h2.6l.6 3.7M8.7 19.4h6.6",
  clock: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0M12 7.4V12l3 1.8",
  // Two equal bars. Added because tictactoe's third number is DRAWS and the
  // nearest existing glyph was a clock - a wrong icon is worse than no icon,
  // because it is read as information rather than as decoration.
  draw: "M5.4 9.4h13.2M5.4 14.6h13.2",
  star: "m12 4.3 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",

  // The stat glyphs. Every subpath below starts with an ABSOLUTE M on purpose:
  // a relative `m` after a previous subpath is measured from that subpath's end
  // point, so concatenating two relative shapes silently flings the second one
  // off the grid. `star` above gets away with it only by being alone.
  //
  // A pair of cards - memory's "pairs".
  cards:
    "M9.4 4.6h9a1.4 1.4 0 0 1 1.4 1.4v9a1.4 1.4 0 0 1-1.4 1.4h-9A1.4 1.4 0 0 1 8 15v-9a1.4 1.4 0 0 1 1.4-1.4z" +
    "M5.4 8.2A1.4 1.4 0 0 0 4 9.6V18a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4",
  // Two arrows passing each other - a count of TURNS taken, not of time.
  moves: "M4.6 9.2h12.8M14.4 6.2l3 3-3 3M19.4 14.8H6.6M9.6 17.8l-3-3 3-3",
  flag: "M6.4 20.4V4.4M6.4 5.4h11.4l-2.5 3.6 2.5 3.6H6.4",
  // Stacked sheets - how far up an endless ladder a run has climbed.
  layers: "M12 3.8 19.6 7.8 12 11.8 4.4 7.8z" + "M4.4 12 12 16 19.6 12" + "M4.4 16.2 12 20.2 19.6 16.2",
  bolt: "M13.4 3.6 5.6 13.2h5.4L9.6 20.4 17.4 10.8H12z",
  check: "M4.8 12.6 9.6 17.4 19.2 6.9",
  heart: "M12 20.2C12 20.2 3.8 15.4 3.8 9.8A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8.2 2.4c0 5.6-8.2 10.4-8.2 10.4z",
  // The currency: a stack of three coins seen at an angle.
  //
  // It took six candidates rendered at the wallet chip's REAL 17px to get here,
  // and the two obvious ones both failed there while looking fine at 24:
  //   - two concentric circles reads as a BULLSEYE - the inner circle collapses
  //     to a dot inside a ring - and it is the `clock` glyph with a filling,
  //     which is the neighbour it most has to stay distinct from;
  //   - one coin on its side reads as a DATABASE CYLINDER, which is the same
  //     shape with different proportions and no way to tell from the source.
  // A filled disc is legible and says nothing; a single coin with a currency
  // mark degrades into a smudge. Three stacked discs still read as money at
  // 17px, which is the only size that matters here.
  //
  // Judge a glyph by rendering it at the size it ships at. Reading the path,
  // or looking at it at 24px, tells you nothing about any of the above.
  coin:
    "M19 7.6a7 2.8 0 1 1-14 0 7 2.8 0 0 1 14 0" +
    "M5 7.6v3.4c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V7.6" +
    "M5 11v3.4c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V11",

  // The game-page header's two glyphs, drawn rather than typed for the same
  // reason the coin above is: a character is a different picture on every
  // device, and the fullscreen one is missing from plenty of fonts outright.
  //
  // A back affordance, NOT a directional one. An arrow is never bidi-mirrored
  // by the renderer - U+2190 draws pointing left whatever the direction is -
  // so in Hebrew the CALLER flips it, rather than the glyph being left to
  // point the wrong way.
  back: "M19.4 12H5.6M11.4 6.2 5.6 12l5.8 5.8",
  // Four corners pushing outward. Absolute M on every subpath: a relative one
  // is measured from the previous corner's end point and throws the shape off
  // the grid entirely.
  expand: "M4.6 9.4V4.6h4.8M19.4 9.4V4.6h-4.8M4.6 14.6v4.8h4.8M19.4 14.6v4.8h-4.8",

  // The pause pair. Two STROKED bars rather than two filled rectangles, so the
  // glyph is built the same way `draw` is and sits at the same weight as every
  // other icon in the row it appears in - a filled pair reads noticeably heavier
  // beside a hollow home and a hollow speaker, which is the exact mixture this
  // set was drawn to end.
  pause: "M9.4 5.6v12.8M14.6 5.6v12.8",
  // The resume triangle, closed with `z` so the round joins meet at all three
  // corners. Left edge at 8.6 rather than 8: a triangle centred on its own
  // bounding box reads as sitting left of centre, because its mass is on that
  // side. Every other glyph here is centred by eye for the same reason.
  play: "M8.6 5.4 18.2 12l-9.6 6.6z",
  // The language control. It lived in LanguagePicker.tsx as a bespoke <svg> of
  // <circle>/<ellipse>/<path> at weight 2.0 with no round caps - so the one
  // control a first visit cannot do without was the one drawn outside this set,
  // sitting beside a 2.1 round-capped star that it did not match.
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" +
    "M16 12a4 9 0 1 1-8 0 4 9 0 0 1 8 0" +
    "M3.4 9h17.2M3.4 15h17.2",
  // Day and night. These were the text characters U+2600 and U+263E, which is
  // the failure this file's own header names: a font decides what they look
  // like, so the toggle rendered as a hairline outline on one machine and a
  // solid block on another, next to icons drawn at a fixed weight.
  sun:
    "M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0" +
    // 2.2 rather than 2.1, and that is not arbitrary: `icons.test.ts` forbids
    // the string "2.1" on any line but the STROKE constant, because a
    // hardcoded weight would be a second source of truth. A ray LENGTH of 2.1
    // is not a weight - but the coordinate is worth a tenth of a pixel and the
    // guard is worth keeping at its strictest, so the drawing moved.
    "M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2" +
    "M5.9 5.9l1.5 1.5M16.6 16.6l1.5 1.5M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5",
  // A crescent, not a circle with a bite: one closed subpath, so it survives
  // being scaled to the 18px this actually renders at.
  moon: "M20.1 14.7A8.7 8.7 0 0 1 9.3 3.9 8.7 8.7 0 1 0 20.1 14.7z",
};

const SVG_NS = "http://www.w3.org/2000/svg";
const STROKE = 2.1;

/**
 * `label` gives the icon an accessible name. Omit it when the icon sits inside a
 * button that already has an `aria-label` - a name on both makes a screen reader
 * announce the control twice.
 *
 * `filled` paints the same path solid at the same stroke weight. It is a STATE,
 * not a style: the home grid marks an earned star solid and an unearned one
 * hollow, which is the distinction the emoji pair used to carry. It is not a
 * licence to fill icons for looks - a set with some glyphs solid and some
 * hollow for no reason is the exact defect this set replaced.
 */
export function Icon({
  name,
  label,
  filled = false,
}: {
  name: IconName;
  label?: string;
  filled?: boolean;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The same glyph as a detached DOM node, for imperative animation code that has
 * no React tree to render into - today, the coins that fly to the wallet.
 *
 * It exists so the flying coin and the coin in the wallet are ONE drawing. They
 * were two before this: an emoji in flight and an emoji in the chip, which
 * happened to match only because both were the same character, and would have
 * silently stopped matching the moment either side changed. `icons.test.ts`
 * pins the two renderers to the same path and the same weight.
 *
 * Sized in `em` exactly like `<Icon>`, so the caller's font-size drives it -
 * which is how `flyTo` gives each coin in the flock a slightly different size.
 */
export function iconNode(name: IconName, filled = false): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  svg.setAttribute("fill", filled ? "currentColor" : "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(STROKE));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", PATHS[name]);
  svg.appendChild(path);
  return svg;
}

/** The geometry, for tests that must prove the two renderers agree. */
export const ICON_PATHS: Readonly<Record<IconName, string>> = PATHS;
export const ICON_STROKE = STROKE;
