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
  | "heart";

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
};

/**
 * `label` gives the icon an accessible name. Omit it when the icon sits inside a
 * button that already has an `aria-label` - a name on both makes a screen reader
 * announce the control twice.
 */
export function Icon({ name, label }: { name: IconName; label?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
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
