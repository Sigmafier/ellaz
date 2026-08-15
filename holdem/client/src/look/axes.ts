// The art registry — every look decision on this table, one strip each.
//
// This is the lab's half of the look system and it ships in the lab-* chunk:
// names and blurbs are for a person choosing, and a player who never opens the
// lab never downloads a word of it. What they DO download is lookStore.ts (two
// short strings) and look.css (what the strings mean).
//
// EVERY ARM ID HERE MUST HAVE A RULE IN look.css, and every `current: true`
// arm must have NO rule — the shipped look is the plain CSS with no attribute
// selected, so naming it as an arm with its own rule would put the default in
// two places and let them drift. axes.test.ts checks both directions against
// the real stylesheet, which is the only way to catch an arm that renders as
// "no change at all" and reads to the operator as a boring option rather than
// as a bug.
//
// ARM IDS ARE PERSISTED FOREVER. Rename one and every player who picked it
// silently falls back to the default, with nothing anywhere to say so — the
// same rule the ellaz shop item ids and name-pool word ids carry.

import type { LookKey } from "./lookStore";

export interface Arm {
  id: string;
  name: string;
  /** One line, said in terms of what you will SEE, never of CSS. */
  blurb: string;
  /** The one that ships today. Exactly one per axis. */
  current?: true;
}

export interface Axis {
  key: LookKey;
  label: string;
  /** Where on the table to look while tapping through this strip. */
  when: string;
  arms: Arm[];
}

export const AXES: Axis[] = [
  {
    key: "table",
    label: "The table",
    when: "the shape of the felt",
    arms: [
      { id: "racetrack", name: "Racetrack", blurb: "Straight sides, fully round ends. The tournament shape.", current: true },
      { id: "oval", name: "Oval", blurb: "A card-room oval, wider than it is tall." },
      { id: "circle", name: "Round", blurb: "Even all the way round, with no waist. Friendlier." },
      { id: "rect", name: "Kitchen table", blurb: "A rounded rectangle. Reads as furniture, not as a casino." },
      { id: "diamond", name: "Soft diamond", blurb: "Pinched at the sides, so the board sits in a waist." },
    ],
  },
  {
    key: "cloth",
    label: "The cloth",
    when: "the surface under the cards",
    arms: [
      { id: "weave", name: "Woven", blurb: "A fine cross-hatch weave, lit from above.", current: true },
      { id: "plain", name: "Plain baize", blurb: "No texture at all. Flat colour and one soft light." },
      { id: "speckle", name: "Speckled", blurb: "Flecks in the cloth, like real felt close up." },
      { id: "twill", name: "Twill", blurb: "One diagonal grain instead of a cross-hatch. Calmer." },
      { id: "spot", name: "Spotlit", blurb: "A hard pool of light in the middle, dark at the rail." },
    ],
  },
  {
    key: "rail",
    label: "The rail",
    when: "the edge all the way around",
    arms: [
      { id: "wood", name: "Wood", blurb: "A warm timber edge with a lit lip.", current: true },
      { id: "leather", name: "Padded leather", blurb: "A thick dark armrest. The most expensive-looking one." },
      { id: "chrome", name: "Chrome", blurb: "A bright metal ring. Modern, and a bit cold." },
      { id: "gold", name: "Gold trim", blurb: "A thin gold line inside a dark edge." },
      { id: "none", name: "No rail", blurb: "Cloth to the edge. The table stops being furniture." },
    ],
  },
  {
    key: "cardface",
    label: "The card face",
    when: "any card that is face up",
    arms: [
      {
        id: "clean",
        name: "Big rank",
        blurb: "The rank large in the middle, the suit under it, no corner at all.",
        current: true,
      },
      { id: "index", name: "Corner index", blurb: "Rank and suit in two corners, a faded suit behind. A real card." },
      { id: "big", name: "Rank and corner", blurb: "The big rank, with one corner index kept as well." },
      { id: "quad", name: "Four corners", blurb: "The index in all four corners. Never upside down." },
      { id: "plain", name: "Minimal", blurb: "One corner, nothing behind it. Very quiet cards." },
      { id: "bold", name: "Bold", blurb: "A bigger corner index and a stronger suit behind it." },
    ],
  },
  {
    key: "deck",
    label: "The suits",
    when: "clubs and spades, side by side",
    arms: [
      { id: "two", name: "Two colours", blurb: "Black and red. What a real deck does.", current: true },
      {
        id: "four",
        name: "Four colours",
        blurb: "Clubs green, diamonds blue. Impossible to misread a club for a spade.",
      },
      { id: "contrast", name: "High contrast", blurb: "Pure white cards, pure black and hard red." },
      { id: "soft", name: "Soft", blurb: "Four muted colours. Gentler, and still unambiguous." },
    ],
  },
  {
    key: "cardback",
    label: "The card back",
    when: "every card somebody else is holding",
    arms: [
      { id: "stripe", name: "Maroon stripe", blurb: "Diagonal red stripes. What ships today.", current: true },
      { id: "lattice", name: "Navy lattice", blurb: "A fine criss-cross on deep blue." },
      { id: "weave", name: "Green basket", blurb: "A woven square grid on card-room green." },
      { id: "monogram", name: "Black and gold", blurb: "A gold ring on near-black. The dressiest." },
      { id: "slate", name: "Slate", blurb: "A plain brushed grey. Gets out of the way entirely." },
    ],
  },
  {
    key: "cardshape",
    label: "The card shape",
    when: "the rectangle itself",
    arms: [
      { id: "wide", name: "Wide", blurb: "A little squarer. More room for the rank.", current: true },
      { id: "std", name: "Standard", blurb: "Real playing-card proportions, softly rounded." },
      { id: "tall", name: "Tall", blurb: "Slimmer. Two hole cards take less width." },
      { id: "sharp", name: "Sharp corners", blurb: "Almost square corners. Crisp and technical." },
      { id: "round", name: "Very round", blurb: "Big soft corners. Reads as a tile, or as a toy." },
      { id: "framed", name: "Framed", blurb: "A thin inner line around the face, like a printed border." },
    ],
  },
  {
    key: "seat",
    label: "The player",
    when: "any nameplate around the table",
    arms: [
      { id: "pill", name: "Pill", blurb: "A fully rounded panel with room around the name. Lighter.", current: true },
      { id: "plate", name: "Plate", blurb: "A squarer, tighter panel: animal, name, stack." },
      { id: "plaque", name: "Brass plaque", blurb: "Square corners and a gold rim. Formal." },
      { id: "bare", name: "No plate", blurb: "Just the words on the cloth, with a shadow to lift them." },
      { id: "avatar", name: "Avatar first", blurb: "The animal made big, the name shrunk beside it." },
    ],
  },
  {
    key: "turn",
    label: "Whose turn",
    when: "watch the seat that is thinking",
    arms: [
      { id: "pulse", name: "Pulse", blurb: "A gold ring that breathes around the plate.", current: true },
      { id: "ring", name: "Steady ring", blurb: "A solid gold outline. No motion at all." },
      { id: "spot", name: "Spotlight", blurb: "A pool of light falls on whoever is up." },
      { id: "flood", name: "Gold plate", blurb: "The whole nameplate turns gold. Unmissable." },
      { id: "lift", name: "Lift", blurb: "The seat rises slightly toward you." },
      { id: "calm", name: "Bar only", blurb: "Nothing but the countdown bar. The quietest option." },
    ],
  },
  {
    key: "chips",
    label: "The chips",
    when: "any bet in front of a seat",
    arms: [
      { id: "disc", name: "Discs", blurb: "Flat stacked ellipses, lit on top.", current: true },
      { id: "striped", name: "Edge spots", blurb: "White marks around the rim. What casino chips have." },
      { id: "tall", name: "Chunky", blurb: "Thicker chips, so a stack builds height faster." },
      { id: "flat", name: "Slim", blurb: "Thinner chips. A big pot stays a low pile." },
      { id: "plain", name: "Plain", blurb: "No rim light. Simple coloured counters." },
    ],
  },
  {
    key: "deal",
    label: "Dealing",
    when: "press Deal and watch the cards arrive",
    arms: [
      { id: "flip", name: "Flip", blurb: "Each card turns over where it lands.", current: true },
      { id: "slide", name: "Slide in", blurb: "Cards come in from the side at an angle, like a real deal." },
      { id: "drop", name: "Drop", blurb: "Cards fall onto the cloth from above." },
      { id: "fan", name: "Fan", blurb: "Cards swing in and straighten up." },
      { id: "fade", name: "Fade", blurb: "Cards simply appear. Nothing to wait for." },
    ],
  },
  {
    key: "fold",
    label: "Folding",
    when: "watch a seat give up a hand",
    arms: [
      { id: "fade", name: "Dim", blurb: "The seat goes quiet and stays put.", current: true },
      { id: "grey", name: "Grey out", blurb: "Colour drains from the seat. Still clearly there." },
      { id: "muck", name: "Muck", blurb: "The cards slide away toward the middle and vanish." },
      { id: "shrink", name: "Shrink", blurb: "The cards pull in to nothing." },
      { id: "ghost", name: "Nearly gone", blurb: "The seat almost disappears until the next hand." },
    ],
  },
  {
    key: "award",
    label: "Winning",
    when: "watch the seat that takes the pot",
    arms: [
      { id: "glow", name: "Glow", blurb: "A gold border and a soft halo.", current: true },
      { id: "halo", name: "Big halo", blurb: "A hard gold ring and a wide glow." },
      { id: "flash", name: "Flash", blurb: "The plate blinks gold twice." },
      { id: "rise", name: "Rise", blurb: "The seat lifts as the chips land." },
      { id: "quiet", name: "Quiet", blurb: "A gold border and nothing else." },
    ],
  },
  {
    key: "pace",
    label: "Speed",
    when: "everything on the felt at once",
    arms: [
      { id: "slower", name: "Much slower", blurb: "Double. Every card is an event.", current: true },
      { id: "slow", name: "Slower", blurb: "Half again as long, rather than double." },
      { id: "now", name: "Brisk", blurb: "What the table did before. Cards arrive quickly." },
      { id: "snappy", name: "Snappiest", blurb: "Faster still. For people who know the game." },
    ],
  },
];

/** Total arms, for the lab's own header. Derived, so it cannot go stale. */
export const ARM_COUNT = AXES.reduce((a, x) => a + x.arms.length, 0);
