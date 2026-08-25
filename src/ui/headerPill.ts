import type { CSSProperties } from "react";

/**
 * The round 48px control in the home bar. ONE object, because there were four.
 *
 * The trophy, the globe and the theme toggle were three hand-written style
 * blocks agreeing on nine declarations and disagreeing on three - and the one
 * that disagreed on `display` is the reason this file exists. `ThemeToggle`
 * omitted `display/alignItems/justifyContent`, so its `<svg>` laid out as
 * inline text at the START of a block box: measured on the live site, the moon
 * sat **15px left of the button's centre**, at 320px and at 1440px alike, while
 * its two neighbours were dead centre. Reported by the operator, not by any
 * gate here - a glyph off-centre inside a correctly-sized button is invisible
 * to every check this repo owns.
 *
 * Three copies is not a duplication problem, it is a DRIFT problem: the fourth
 * one would have drifted too, and the defect only ever shows up as "that button
 * looks a bit odd". Sharing the object makes it unrepresentable rather than
 * merely fixed, and `header-pills-are-one-shape.test.ts` refuses a fourth copy.
 *
 * Deliberately NOT the card-style toggle: that one lives in the icon rail and
 * is a 64px two-line card. A 48px round pill among those reads as a stray
 * control, which is a different decision and not a drifted one.
 *
 * A plain object rather than a class, because these three are React inline
 * styles today and a class would need `global.css` to own a name that the
 * emitted document pages also carry - two owners for one shape.
 */
export const HEADER_PILL: CSSProperties = {
  // `--hpill` is `--tap` (48px) on a tablet and up, 40px on a phone - see the
  // token's own comment for why it is not just a smaller `--tap`. Both axes, so
  // it is a circle rather than a pill that happens to look round while its
  // glyph fits, and both read the SAME name so they cannot drift apart.
  minHeight: "var(--hpill)",
  minWidth: "var(--hpill)",
  // No horizontal padding: `minWidth` already holds the target, and on a narrow
  // header every pixel here comes out of the title.
  padding: 0,
  // The group around it wraps and shrinks (`flex: 0 1 auto`), so without this a
  // squeezed row squashes the controls instead of dropping them to a new line.
  flexShrink: 0,
  // THE THREE THAT WERE MISSING. A button is a block box by default and an
  // `<svg>` inside one is an inline child, so it lands at the start of the line
  // box rather than in the middle of the button.
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-pill)",
  border: "none",
  // THE CARD TREATMENT. Operator pick, 2026-08-25, of four drawn on the real
  // bar: "the icon are not looking like buttons in light mode, they lose the
  // card DS".
  //
  // It is a contrast defect with a number, not a taste call. `--surface-2` on
  // the page background:
  //
  //     night    #262b52 on #0f1226   1.37 : 1   reads as a shape
  //     market   #fff3e0 on #fff6e9   1.02 : 1   nothing at all
  //
  // 3:1 is the WCAG floor for a graphical object, so on the light theme these
  // were not quiet buttons, they were invisible ones - and the bug is
  // invisible in the dark theme most of this work is done in.
  //
  // `--surface` is the CARD fill, lighter than the page rather than recessed
  // into it, and `--shadow-1` is the hard ink offset every DS `Button` and the
  // wallet chip 8px away already carry. Neither is a new value: this pill had
  // drifted out of the design system, the system did not lack an answer.
  background: "var(--surface)",
  boxShadow: "var(--shadow-1)",
  color: "var(--text)",
  // For the trophy, which is an <a> - it is a LINK so middle-click and
  // long-press behave, and a link carries an underline unless told otherwise.
  textDecoration: "none",
  fontSize: 18,
  lineHeight: 1,
};
