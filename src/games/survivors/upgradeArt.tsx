import type { ReactElement } from "react";
import type { UpgradeId } from "./logic";

// The seven upgrade cards' illustrations. Original line art, drawn here rather
// than fetched: every one of these is a handful of path commands, so the whole
// set costs no request and rides the lazy `game-survivors-*` chunk with the rest
// of the game. A child who never opens this game downloads none of it.
//
// WHY SVG AND NOT EMOJI. The house rule is inline SVG, always - an emoji cannot
// be styled (it ignores the card's colour), renders as a different picture on
// every operating system, and on some of them renders as a box. These inherit
// `currentColor`, so the card decides the ink in one place.
//
// WHY THE PICTURE IS NEVER THE ONLY CHANNEL. Each card still carries its words,
// in the player's own language, and the pips still carry the count. The drawing
// is a third channel for a five-year-old who cannot read the second one - not a
// replacement for it. Anyone who reads "Longer gem reach" loses nothing.
//
// WHY THIS IS A `Record<UpgradeId, ...>` AND HAS NO TEST. The type IS the
// population check: adding an eighth upgrade to `UPGRADE_CAP` without drawing it
// fails the build, by name, at the line below. A test asserting "all seven have
// art" would be a hand-kept mirror of a list the compiler already holds.
//
// Every shape is a different SILHOUETTE rather than one shape recoloured -
// streaks, a bolt, a fan, a runner, a magnet, a heart, a pierced ring - so they
// are told apart at a glance on a phone, which is the whole point of the card.

const S = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const UPGRADE_ART: Record<UpgradeId, () => ReactElement> = {
  // Faster shots: three streaks of different lengths, running into a chevron.
  rapid: () => (
    <svg {...S}>
      <path d="M2 7h10" />
      <path d="M2 12h13" />
      <path d="M2 17h8" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  ),
  // Stronger shots: a single heavy bolt, the one silhouette that reads as force.
  power: () => (
    <svg {...S}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
    </svg>
  ),
  // One more bolt: a fan of three rays leaving one muzzle.
  spread: () => (
    <svg {...S}>
      <path d="M4 12h5" />
      <path d="M9 12l10-6" />
      <path d="M9 12h11" />
      <path d="M9 12l10 6" />
    </svg>
  ),
  // Quicker feet: a figure mid-stride with motion lines behind it.
  swift: () => (
    <svg {...S}>
      <circle cx="15" cy="5" r="2" />
      <path d="M16 9l-3 4 3 3 1 5" />
      <path d="M13 13l-4 2-1 4" />
      <path d="M2 8h5" />
      <path d="M2 13h4" />
    </svg>
  ),
  // Longer gem reach: a horseshoe magnet, with a gem coming to it.
  magnet: () => (
    <svg {...S}>
      <path d="M5 20V10a7 7 0 0114 0v10" />
      <path d="M5 15h5" />
      <path d="M14 15h5" />
      <path d="M12 7l2 2-2 2-2-2z" />
    </svg>
  ),
  // One more heart. The only one of the seven that changes the present.
  heart: () => (
    <svg {...S}>
      <path d="M12 20s-7-4.3-7-9a4 4 0 017-2.7A4 4 0 0119 11c0 4.7-7 9-7 9z" />
    </svg>
  ),
  // Shots pass through: an arrow already out the far side of a ring.
  pierce: () => (
    <svg {...S}>
      <circle cx="11" cy="12" r="5" />
      <path d="M2 12h19" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  ),
};
