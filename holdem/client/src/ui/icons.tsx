// Every glyph this app draws, as original SVG.
//
// WHY NOT EMOJI. An emoji is a font the device chooses, not a picture we ship,
// and the device is a phone we have never seen. The four card suits were the
// worst of it: `♠` is a TEXT character that some Android builds promote to a
// full-colour emoji, so the same card is a black spade on one phone and a
// glossy blue-black cartoon on the next — at a poker table, where the suit is
// half the information on the card. Everything else here had the same problem
// in a smaller way: a clock, a trophy and a die rendered as three different
// art styles at three different optical weights beside each other.
//
// The one deliberate exception is the CHAT EMOTES. Those are meant to be
// emoji: a player is picking a face to throw across the table, the platform's
// own set is what they recognise, and the fact that it looks native to their
// phone is the point rather than a defect.
//
// Everything below is `currentColor` and a square viewBox, so an icon takes
// its colour from the button it sits in and its size from one prop. No fills
// of their own, no strokes that do not scale, no external requests.

interface IconProps {
  size?: number;
  /** Purely decorative by default; pass a label when the icon IS the button. */
  title?: string;
}

function Svg({ size = 20, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: "block", flex: "0 0 auto" }}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The four suits.
//
// Drawn to a common optical weight rather than a common bounding box: a
// diamond is all mass and a club is mostly gaps, so a diamond sized to the
// same box reads noticeably heavier. The diamond is inset a little for that
// reason, and it is the only one that is.

export function SuitSpade({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M50 6C50 6 92 36 92 61c0 13-9 22-21 22-8 0-15-4-19-11 0 6 1 12 5 18l4 6H39l4-6c4-6 5-12 5-18-4 7-11 11-19 11-12 0-21-9-21-22C8 36 50 6 50 6z" />
    </Svg>
  );
}

export function SuitHeart({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M50 92C50 92 6 62 6 34 6 19 17 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 11 24 26 0 28-44 58-44 58z" />
    </Svg>
  );
}

export function SuitDiamond({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      {/* Inset to 12/88 rather than 4/96: a solid rhombus at full width has
          more ink than any other suit and reads a size larger than it is. */}
      <path d="M50 8 88 50 50 92 12 50z" />
    </Svg>
  );
}

export function SuitClub({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <circle cx="50" cy="28" r="20" />
      <circle cx="26" cy="58" r="20" />
      <circle cx="74" cy="58" r="20" />
      <path d="M43 62h14c0 10 1 20 6 28l4 6H33l4-6c5-8 6-18 6-28z" />
    </Svg>
  );
}

/** Suit by engine index — 0 clubs, 1 diamonds, 2 hearts, 3 spades. */
export const SUIT_ICON = [SuitClub, SuitDiamond, SuitHeart, SuitSpade] as const;

// ---------------------------------------------------------------------------
// Chrome.

/** The wordmark. A spade, because that is what this game is. */
export function Logo({ size, title }: IconProps) {
  return <SuitSpade size={size} title={title} />;
}

export function IconSoundOn({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M12 38h16l20-18v60L28 62H12z" />
      <path
        d="M62 34c7 5 11 10 11 16s-4 11-11 16M74 22c12 8 18 17 18 28s-6 20-18 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconSoundOff({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M12 38h16l20-18v60L28 62H12z" />
      <path
        d="M64 36l28 28M92 36L64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Hand history — a clock, because it is what happened before now. */
export function IconHistory({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="9" />
      <path
        d="M50 26v26l18 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The league table. A cup. */
export function IconTrophy({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M28 12h44v22c0 13-10 23-22 23S28 47 28 34z" />
      <path
        d="M28 20H16v6c0 9 5 15 13 16M72 20h12v6c0 9-5 15-13 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M44 57h12v17H44zM30 74h40v12H30z" />
    </Svg>
  );
}

/** Another name, please. A die, mid-roll. */
export function IconDice({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <rect x="12" y="12" width="76" height="76" rx="16" fill="none" stroke="currentColor" strokeWidth="9" />
      <circle cx="33" cy="33" r="8" />
      <circle cx="67" cy="33" r="8" />
      <circle cx="50" cy="50" r="8" />
      <circle cx="33" cy="67" r="8" />
      <circle cx="67" cy="67" r="8" />
    </Svg>
  );
}

/** Not listed in the lobby. */
export function IconLock({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path
        d="M32 44V32a18 18 0 0136 0v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect x="20" y="44" width="60" height="44" rx="10" />
    </Svg>
  );
}

/** Watching, not playing. */
export function IconEye({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path
        d="M6 50s18-26 44-26 44 26 44 26-18 26-44 26S6 50 6 50z"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="12" />
    </Svg>
  );
}

export function IconRefresh({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      {/* Three quarters of a circle, with the head ON the arc's own end and
          pointing along its tangent. The first version put a triangle at the
          top-right corner of the box and left the arc ending somewhere else
          entirely, which read as a pie chart with a bite out of it. */}
      <path
        d="M50 16a34 34 0 1 0 34 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path d="M50 3v26L30 16z" />
    </Svg>
  );
}

export function IconLink({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <g fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round">
        <path d="M39 61L61 39" />
        <path d="M35 25l7-7a19 19 0 0127 27l-7 7" />
        <path d="M65 75l-7 7a19 19 0 01-27-27l7-7" />
      </g>
    </Svg>
  );
}

/** The overflow menu. */
export function IconMore({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <circle cx="50" cy="20" r="9" />
      <circle cx="50" cy="50" r="9" />
      <circle cx="50" cy="80" r="9" />
    </Svg>
  );
}

/**
 * Back.
 *
 * A chevron, drawn pointing LEFT and flipped by CSS in an RTL document — back
 * is a direction, not a shape, and a Hebrew page reads the other way. This is
 * the one icon here whose orientation is a translation problem.
 */
export function IconBack({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path
        d="M62 16L28 50l34 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A league table, in the lobby row. */
export function IconCrown({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M10 76V30l20 16 20-28 20 28 20-16v46z" />
    </Svg>
  );
}

export function IconFullscreen({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <g fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 34V14h20M66 14h20v20M86 66v20H66M34 86H14V66" />
      </g>
    </Svg>
  );
}

/**
 * The house.
 *
 * Marks the one table whose other players are not people — on the switch that
 * decides whether it is listed at all, and on the row itself when it is. A
 * head with two eyes and an aerial: the most legible "not a person" shape at
 * 16px, where a face with features reads as a smudge.
 */
export function IconRobot({ size, title }: IconProps) {
  return (
    <Svg size={size} title={title}>
      <path d="M46 6h8v12h-8z" />
      <circle cx="50" cy="6" r="6" />
      <path d="M22 24h56a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8zm12 20a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm32 0a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM34 66h32v6H34z" />
    </Svg>
  );
}
