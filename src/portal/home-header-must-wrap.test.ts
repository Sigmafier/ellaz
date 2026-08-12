import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The home header must wrap, and the language button must be able to drop its
 * label.
 *
 * This row's width grows with the LANGUAGE LIST, which is the same shape as
 * .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md - both earlier
 * instances grew with the catalog instead. `Bahasa Indonesia` made the language
 * control 134px beside three 48px siblings, and measured at 390px the header
 * asked for 509px of a 350px box. All eleven languages overflowed at 320, 360
 * and 390.
 *
 * WHY A SOURCE SCAN AND NOT A RENDERED-WIDTH CHECK. Both checks that rule
 * recommends reported clean over this bug, for the same reason and in a NEW
 * way. `body.app-shell` is overflow:hidden so the document never widened -
 * documentElement.scrollWidth was exactly innerWidth in all 33 cells - and the
 * overflow instead became sideways scroll inside `.ellaz-scroll`, one level in.
 * The per-item clipping check found nothing either, because these children were
 * never squeezed: they were pushed bodily outside the box, where a
 * `scrollWidth > clientWidth` test on the item itself is 0. jsdom measures
 * nothing at all, so a render test here would assert even less than that.
 *
 * The scan is therefore the honest instrument, and its weakness is stated
 * rather than hidden: it proves the properties are PRESENT, not that the
 * layout is right. The layout was verified by driving a real browser at 320,
 * 360, 390 and 430 across all eleven languages, before and after.
 */

const HEADER = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");
const PICKER = readFileSync(
  fileURLToPath(new URL("../ui/LanguagePicker.tsx", import.meta.url)),
  "utf8",
);
const CSS = readFileSync(fileURLToPath(new URL("../ui/global.css", import.meta.url)), "utf8");

/** The <header> element's own style object, so a `flexWrap` elsewhere in the file cannot pass for it. */
function headerStyle(): string {
  const at = HEADER.indexOf("<header");
  expect(at, "Home.tsx has no <header>").toBeGreaterThan(-1);
  const open = HEADER.indexOf("style={{", at);
  expect(open, "the <header> carries no inline style").toBeGreaterThan(-1);
  const end = HEADER.indexOf("}}", open);
  return HEADER.slice(open, end);
}

describe("the home header", () => {
  it("wraps, because its width grows with the language list", () => {
    expect(headerStyle()).toMatch(/flexWrap:\s*"wrap"/);
  });

  it("gives a wrapped row its own vertical gap", () => {
    // Same reason as DifficultySelector: `gap` alone works, and naming rowGap
    // is what makes a second row read as a second row rather than as controls
    // that drifted below the title.
    expect(headerStyle()).toMatch(/rowGap:/);
  });

  it("lets the title block shrink below its content", () => {
    // A flex item defaults to `min-width: auto` and refuses to go under its
    // content width. That is what let the title push the controls off the
    // screen instead of letting the row wrap, so the wrap above does nothing
    // without this.
    expect(HEADER).toMatch(/flex:\s*"1 1 auto",\s*minWidth:\s*0/);
  });

  it("keeps the four controls in one group that wraps as a unit", () => {
    // Without the wrapper the row wraps one control at a time and a phone gets
    // the language pill alone on a second line under its three siblings.
    const wallet = HEADER.indexOf("<WalletChip />");
    const picker = HEADER.indexOf("<LanguagePicker");
    expect(wallet).toBeGreaterThan(-1);
    expect(picker).toBeGreaterThan(wallet);
    const group = HEADER.slice(HEADER.lastIndexOf("<div", wallet), picker);
    expect(group).toMatch(/flexWrap:\s*"wrap"/);
    expect(group).toMatch(/marginInlineStart:\s*"auto"/);
  });
});

describe("the language button", () => {
  it("hides its autonym by default and restores it above a phone width", () => {
    // Mobile-first, because the phone is the case that cannot afford the label.
    // Order matters: the bare rule must come BEFORE the media query, or the
    // media query cannot win at equal specificity.
    const bare = CSS.search(/\.ellaz-lang-label\s*\{\s*display:\s*none/);
    const restored = CSS.search(/@media\s*\(min-width:\s*430px\)/);
    expect(bare, "no .ellaz-lang-label { display: none } rule").toBeGreaterThan(-1);
    expect(restored, "no 430px restore").toBeGreaterThan(bare);
  });

  it("marks the autonym with the class the stylesheet hides", () => {
    expect(PICKER).toMatch(/className="ellaz-lang-label"/);
  });

  it("holds the 48px tap target once the label is gone", () => {
    // 14px padding + an 18px globe + 14px padding is 46. Without minWidth the
    // button drops under the floor every other control in the header holds,
    // and it does so only on the narrow screens where it matters most.
    const at = PICKER.indexOf("aria-haspopup");
    const style = PICKER.slice(at, PICKER.indexOf("<GlobeIcon", at));
    expect(style).toMatch(/minWidth:\s*"var\(--tap\)"/);
  });

  it("never hides the autonyms inside the sheet", () => {
    // The sheet is the whole point of the control - somebody who cannot read
    // the current language finds their own by its own writing. Only the
    // BUTTON's label is negotiable.
    const sheet = PICKER.slice(PICKER.indexOf('role="menu"'));
    expect(sheet).toMatch(/\{AUTONYM\[l\]\}/);
    expect(sheet).not.toMatch(/ellaz-lang-label/);
  });
});
