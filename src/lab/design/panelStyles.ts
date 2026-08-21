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
  { name: "--gc-level-min", label: "level width", shipped: 132, min: 90, max: 200, what: "floor before the row wraps" },
  { name: "--gc-stat-min", label: "card width", shipped: 88, min: 60, max: 160, what: "floor for a wide card" },
  // `--gc-row-display`, `--gc-empty-display` and `--gc-cols` are the same-slots
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
    what: "three floating cards, tiny label over the number, glyph on the left",
    css: "",
  },
  {
    id: "strip",
    name: "B · one strip",
    what: "one surface, hairline dividers - the row reads as a single instrument",
    css: `
.gc-row{background:var(--surface);border-radius:var(--gc-cell-radius,14px);
  box-shadow:var(--shadow-1);padding:0 4px}
.gc-cell{background:transparent!important;box-shadow:none!important;border-radius:0!important}
.gc-cell + .gc-cell{box-shadow:inset 1px 0 0 var(--line)!important}
`,
  },
  {
    id: "big",
    name: "C · number first",
    what: "the number is the card and the word sits under it; no glyph",
    css: `
:root{--gc-value:22px;--gc-label:9.5px;--gc-record:10px}
.gc-icon{display:none!important}
.gc-stat .gc-text{align-items:center!important}
.gc-stat{justify-content:center!important}
.gc-stat .gc-value{order:1;line-height:1.05}
.gc-stat .gc-label{order:2;letter-spacing:.06em;text-transform:uppercase}
.gc-stat .gc-record{order:3}
`,
  },
  {
    id: "quiet",
    name: "D · quiet outline",
    what: "no shadows and no fills - a hairline round each card, flatter and calmer",
    css: `
:root{--gc-cell-radius:12px}
/* INSET, never a border. A 1px border on a fixed-height content-box cell makes
   it 58px where the row is 56, so every card would grow by two pixels and the
   row would wrap one game earlier - a layout change wearing a colour change. */
.gc-cell{background:transparent!important;box-shadow:inset 0 0 0 1px var(--line)!important}
`,
  },
  {
    id: "tinted",
    name: "E · the game's colour",
    what: "each card washed in this game's own hue, glyph in it - playful, per game",
    css: `
.gc-cell{background:color-mix(in oklab, var(--g, var(--brand)) 16%, var(--surface))!important;
  box-shadow:none!important}
.gc-icon{color:var(--g, var(--brand))!important}
.gc-level .gc-value{color:var(--text)}
`,
  },
  {
    id: "slots",
    name: "G · same slots, every game",
    what: "difficulty, a main number, a second number - a dash where a game has none",
    css: `
/* A GRID, not flex. Flex sizes each cell from its own content, so \"Time\" in
   sudoku and \"Score\" in snake land at different widths and the two rows do
   not line up - which is the whole complaint. Fixed tracks make every game's
   row the same row. The ratio is 1.25 / 1 / 0.85 because the difficulty is the
   only cell carrying a WORD and the third is usually a short counter. */
:root{--gc-row-display:grid;--gc-empty-display:flex;
  --gc-cols:minmax(0,1.25fr) minmax(0,1fr) minmax(0,0.85fr)}
/* The floors have to go, or a grid track cannot shrink to its share and the
   row overflows instead of fitting. minmax(0,..) above is the other half. */
.gc-cell{min-width:0!important}
/* A compact cell asked to be sized by its content; in a fixed grid nothing is,
   so it takes its track like everything else. */
.gc-compact{flex:unset!important;padding:0 8px!important}
`,
  },
  {
    id: "pill",
    name: "F · pills",
    what: "fully round cards, bigger number, glyph dropped - the chip look",
    css: `
:root{--gc-cell-radius:99px;--gc-value:20px;--gc-label:9px}
.gc-icon{display:none!important}
.gc-cell{box-shadow:none!important;background:var(--surface-2)!important}
.gc-stat{justify-content:center!important}
.gc-stat .gc-text{align-items:center!important}
`,
  },
];

export const STYLE_BY_ID = (id: string) =>
  PANEL_STYLES.find((s) => s.id === id) ?? PANEL_STYLES[0];
