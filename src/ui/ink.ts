/**
 * Which ink is readable on this colour.
 *
 * A game's `meta.color` is the accent behind its name strip on the home grid.
 * That strip used to hardcode `#1b1b2b`, which is correct for a sunflower
 * yellow and unreadable on a slate grey - measured 2026-08-03, minesweeper came
 * out at 3.23:1 and sequence at 3.49:1 against a 4.5:1 floor. The failure was
 * not a bug in either colour; it was one ink asked to serve twenty-one.
 *
 * So the ink is DERIVED from the colour it sits on rather than chosen once.
 *
 * The two candidates are deliberately NOT theme tokens. A name strip sits on a
 * saturated accent, not on the page, so what makes it readable is the accent -
 * and that does not change when the page around it goes from night to daylight.
 * A theme-varying ink here would make the same card readable in one theme and
 * not the other, which is the bug this function exists to remove.
 */

/** Near-black. Readable on every light and mid accent. */
export const INK_DARK = "#1b1b2b";
/** Near-white. Readable on every dark and saturated accent. */
export const INK_LIGHT = "#ffffff";

/** WCAG 2.x relative luminance of an `#rgb` or `#rrggbb` colour. */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const channel = (i: number) => {
    const v = parseInt(full.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast ratio between two colours. 1 = identical, 21 = black on white. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The more readable of the two inks on `background`.
 *
 * Ties go to the dark ink, which is the value every card used before this
 * existed - so a colour that genuinely does not care keeps the look it had.
 */
export function inkFor(background: string): string {
  return contrastRatio(background, INK_LIGHT) > contrastRatio(background, INK_DARK)
    ? INK_LIGHT
    : INK_DARK;
}

/**
 * The contrast the chosen ink achieves. Exported so a test can assert the
 * floor per game rather than trusting that a choice was made at all - picking
 * the BETTER of two inks says nothing about whether the better one is good
 * enough, and for one colour in this repo it was not.
 */
export function inkContrast(background: string): number {
  return contrastRatio(background, inkFor(background));
}
