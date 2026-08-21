/**
 * The game panel - the row carrying difficulty, the score and the stage.
 *
 * Two halves, because a design decision comes in two kinds and only one of them
 * is a number.
 *
 * `PANEL_TOKENS` is the numbers: a size, a gap, a radius. Each is a
 * `var(--gc-*, <literal>)` read in `GameChrome.tsx` whose fallback IS what
 * ships, so the bench turns them over the real component and nothing renders
 * differently until one is baked in.
 *
 * `PANEL_STYLES` is the shapes: a label under its number instead of over it,
 * three cards collapsed into one strip, an icon dropped. No token can express
 * those, so a style is a STYLESHEET the bench injects into the real page,
 * addressing the `gc-*` classes the component now carries.
 *
 * Every style is written against the SHIPPED markup and rendered on a real
 * game, so what the operator looks at is the actual screen and not a drawing of
 * it. A picked style gets baked into the component - the `!important` here is
 * the price of overriding an inline style from outside, and it must never ship.
 */

export type PanelToken = {
  name: string;
  label: string;
  /** What `GameChrome.tsx` falls back to today. Pinned by a test. */
  shipped: number;
  min: number;
  max: number;
  what: string;
};

export const PANEL_TOKENS: PanelToken[] = [
  { name: "--gc-tap", label: "cell height", shipped: 56, min: 40, max: 88, what: "every card in the row" },
  { name: "--gc-gap", label: "gap", shipped: 8, min: 0, max: 20, what: "between the cards" },
  { name: "--gc-head-gap", label: "row spacing", shipped: 9, min: 0, max: 24, what: "under the row, before the board" },
  { name: "--gc-cell-radius", label: "card radius", shipped: 14, min: 0, max: 28, what: "0 is square, 28 is a pill" },
  { name: "--gc-value", label: "number size", shipped: 18, min: 12, max: 34, what: "the score, the clock" },
  { name: "--gc-label", label: "label size", shipped: 10, min: 7, max: 16, what: "SCORE, TIME, DIFFICULTY" },
  { name: "--gc-record", label: "record size", shipped: 10.5, min: 7, max: 16, what: "the Best line" },
  { name: "--gc-stat-icon", label: "icon size", shipped: 18, min: 0, max: 30, what: "the glyph in each card" },
  { name: "--gc-level-value", label: "level size", shipped: 16, min: 10, max: 26, what: "Easy / Normal / Hard" },
  // switch. They are not numbers, so they are not knobs - a style sets them,
  // and `panel-tokens-are-shipped.test.ts` exempts them BY NAME.
];

export type PanelStyle = {
  id: string;
  name: string;
  /** One line, plain English - what a player would notice. */
  what: string;
  css: string;
};

/**
 * The candidates.
 *
 * `shipped` is FIRST and carries no CSS at all: it is the control, and a
 * comparison whose control is itself a restyle cannot tell you what changed.
 */
export const PANEL_STYLES: PanelStyle[] = [
  {
    id: "shipped",
    name: "A · today",
    what: "same slots, three fixed tracks, no glyph, cards in the game's own hue",
    css: "",
  },
  {
    id: "glyph",
    name: "B · put the glyph back",
    what: "a clock, a bolt, a flag - and sudoku's 42/81 ellipsises inside its card",
    css: `
:root{--gc-icon-display:flex}
.gc-stat .gc-text{align-items:flex-start!important;text-align:start!important}
.gc-stat{justify-content:flex-start!important}
`,
  },
  {
    id: "flat",
    name: "C · no game colour",
    what: "one plain surface for every game instead of each in its own hue",
    css: `:root{--gc-cell-bg:var(--surface)}`,
  },
  {
    id: "big",
    name: "D · number first",
    what: "the number is the card and the word sits under it, in small caps",
    css: `
:root{--gc-value:21px;--gc-label:9px;--gc-record:9.5px}
.gc-stat .gc-value{order:1;line-height:1.05}
.gc-stat .gc-label{order:2;letter-spacing:.06em;text-transform:uppercase}
.gc-stat .gc-record{order:3}
`,
  },
  {
    id: "quiet",
    name: "E · quiet outline",
    what: "no fill at all - a hairline round each card, flatter and calmer",
    css: `
:root{--gc-cell-radius:12px}
/* INSET, never a border. A 1px border on a fixed-height content-box cell makes
   it 58px where the row is 56, so every card would grow by two pixels - a
   layout change wearing a colour change. */
.gc-cell{background:transparent!important;box-shadow:inset 0 0 0 1px var(--line)!important}
`,
  },
  {
    id: "pill",
    name: "F · pills",
    what: "fully round cards, bigger number - the chip look",
    css: `:root{--gc-cell-radius:99px;--gc-value:20px;--gc-label:9px}
.gc-cell{box-shadow:none!important}`,
  },
  {
    id: "roomy",
    name: "G · wider still",
    what: "the gutter cut to 4px a side and the gap to 6 - as wide as it goes",
    css: `:root{--gc-head-pad:10px 4px 8px;--gc-gap:6px}`,
  },
];

export const STYLE_BY_ID = (id: string) =>
  PANEL_STYLES.find((s) => s.id === id) ?? PANEL_STYLES[0];
