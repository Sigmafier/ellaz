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
const CHIP = readFileSync(fileURLToPath(new URL("./WalletChip.tsx", import.meta.url)), "utf8");

/** The <header> element's own style object, so a `flexWrap` elsewhere in the file cannot pass for it. */
function headerStyle(): string {
  const at = HEADER.indexOf("<header");
  expect(at, "Home.tsx has no <header>").toBeGreaterThan(-1);
  const open = HEADER.indexOf("style={{", at);
  expect(open, "the <header> carries no inline style").toBeGreaterThan(-1);
  const end = HEADER.indexOf("}}", open);
  return HEADER.slice(open, end);
}

/** The wrapper holding the controls, from its opening tag to the picker inside it. */
function controlGroup(): string {
  // `<WalletChip`, not `<WalletChip />` - it carries `starsOnly` since
  // 2026-08-24, and a matcher built on the old self-closing spelling returns
  // -1, which `lastIndexOf("<div", -1)` then turns into a slice of the WHOLE
  // file. Every assertion under it passes, over the wrong text.
  const wallet = HEADER.indexOf("<WalletChip");
  const picker = HEADER.indexOf("<LanguagePicker");
  expect(wallet, "Home.tsx no longer renders <WalletChip>").toBeGreaterThan(-1);
  expect(picker, "<LanguagePicker> must sit after <WalletChip>").toBeGreaterThan(wallet);
  return HEADER.slice(HEADER.lastIndexOf("<div", wallet), picker);
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
    expect(controlGroup()).toMatch(/flexWrap:\s*"wrap"/);
    expect(controlGroup()).toMatch(/marginInlineStart:\s*"auto"/);
  });

  it("lets that group SHRINK, or its own wrap can never fire", () => {
    // The subtle half, and it shipped wrong first. At `flex: 0 0 auto` the
    // group keeps its max-content width - 431px in Indonesian with the autonym
    // shown - so it is never squeezed, so the flexWrap above is unreachable and
    // it overflows instead. Measured at exactly 430px, the width where the
    // label returns: 21px of sideways travel and three controls outside the
    // viewport. The original bug, reproduced in a 1px band.
    expect(controlGroup()).toMatch(/flex:\s*"0 1 auto"/);
    expect(controlGroup()).toMatch(/minWidth:\s*0/);
  });
});

describe("the language button", () => {
  it("is a globe at EVERY width - no label, no class, no media query", () => {
    // Operator ruling 2026-08-24: "always show language as globe icon but it
    // must be there". Both halves are pinned - this one is "as globe icon",
    // and the one below is "must be there", which is the half that matters.
    // `className="..."`, not the bare token - this file's own doc comment names
    // the retired class while explaining why it went, and a bare-token matcher
    // fires on the explanation. A matcher that cannot tell a mention from a use
    // reports a defect that is not there.
    expect(PICKER, "the language button drew a label again").not.toMatch(
      /className="ellaz-lang-label"/,
    );
    expect(CSS, "the .ellaz-lang-label rules came back").not.toMatch(/\.ellaz-lang-label\s*\{/);
  });

  it("MUST be in the bar, never folded behind a settings button", () => {
    // The load-bearing half. The four home shells emit no language offer bar -
    // they render no DOCUMENT_CSS - so on `/`, `/he/`, `/es/` and `/fr/` this
    // button is the ONLY language affordance in existence. `/` is also the
    // canonical entry and the x-default target, `storedLocale()` answers a
    // first visit in English by design, and 76% of the queries reaching this
    // site are Hebrew. Hiding this control hides the way out.
    // The HEADER, not controlGroup() - that helper slices UP TO the picker, so
    // it can never contain it and the assertion would be unfalsifiable.
    const bar = HEADER.slice(HEADER.indexOf("<header"), HEADER.indexOf("</header>"));
    expect(bar, "the language picker left the home bar").toMatch(/<LanguagePicker/);
  });

  it("carries the autonym in its accessible name instead", () => {
    // Nothing is lost with the label: the name moves to `aria-label`, in the
    // "Theme: Night" shape the sibling toggle already uses.
    expect(PICKER).toMatch(/aria-label=\{`\$\{t\("language"\)\}: \$\{AUTONYM\[locale\]\}`\}/);
  });

  it("never hides the autonyms inside the sheet", () => {
    // The sheet is the whole point of the control - somebody who cannot read
    // the current language finds their own by its own writing.
    const sheet = PICKER.slice(PICKER.indexOf('role="menu"'));
    expect(sheet).toMatch(/\{AUTONYM\[l\]\}/);
  });

  it("holds the 48px tap target once the label is gone", () => {
    // 14px padding + an 18px globe + 14px padding is 46. Without minWidth the
    // button drops under the floor every other control in the header holds,
    // and it does so only on the narrow screens where it matters most.
    const at = PICKER.indexOf("aria-haspopup");
    const style = PICKER.slice(at, PICKER.indexOf("<GlobeIcon", at));
    expect(style).toMatch(/minWidth:\s*"var\(--tap\)"/);
  });

});

/**
 * The operator's ruling of 2026-08-24, verbatim: "always show language as globe
 * icon but it must be there and stars and dark. then my world then games. also
 * add leaderboards icon there".
 *
 * A source scan, with the same weakness stated in the header of this file: it
 * proves the parts are PRESENT, not that the layout is right. The layout was
 * measured on the built page at 320, 360, 390 and 430 - bar 143 -> 70px from
 * 390 up, 116px below it, first game card 471 -> 398px, no sideways scroll at
 * any of the four.
 */
describe("the home bar the operator specified", () => {
  it("carries stars, leaderboards, language and dark - and nothing else", () => {
    const group = controlGroup() + HEADER.slice(HEADER.indexOf("<LanguagePicker"), HEADER.indexOf("</header>"));
    expect(group).toMatch(/<WalletChip starsOnly/);
    expect(group).toMatch(/<BoardsButton/);
    expect(group).toMatch(/<LanguagePicker/);
    expect(group).toMatch(/<ThemeToggle/);
  });

  it("keeps the card-style toggle OUT of the bar", () => {
    // It was not among the four the operator named, and it does not fit: stars
    // plus four 48px icons is 299px of controls beside a 110px identity in a
    // 350px box. It lives above the grid it restyles instead - deleted would
    // have been a feature removed by inference.
    const bar = HEADER.slice(HEADER.indexOf("<header"), HEADER.indexOf("</header>"));
    expect(bar, "CardStyleToggle is back in the header").not.toMatch(/<CardStyleToggle/);
    expect(HEADER, "CardStyleToggle was deleted rather than rehomed").toMatch(/<CardStyleToggle/);
  });

  it("shows the STAR count only, so the room owns the coins", () => {
    expect(HEADER).toMatch(/<WalletChip starsOnly/);
    expect(CHIP, "WalletChip lost the starsOnly prop").toMatch(/starsOnly\?: boolean/);
    expect(CHIP, "the coin half is no longer gated").toMatch(/\{!starsOnly && \(/);
  });

  it("puts the room before the puzzle, and both before the games", () => {
    const world = HEADER.indexOf("<WorldHero");
    const daily = HEADER.indexOf("<DailyCard");
    const rail = HEADER.indexOf("<CategoryRail");
    expect(world, "no <WorldHero>").toBeGreaterThan(-1);
    expect(daily, "<DailyCard> must come after <WorldHero>").toBeGreaterThan(world);
    expect(rail, "the category rail must come after both").toBeGreaterThan(daily);
  });

  it("has no leaderboards CARD left, because the bar icon replaced it", () => {
    // Two doors to one room is the thing this pass undid. If the card comes
    // back, the icon should go - not both.
    expect(HEADER, "the boards card is back beside the boards icon").not.toMatch(
      /boardsHref\([^)]*\)\}\s*\n\s*onClick=\{tap\}\s*\n\s*style=\{\{\s*\n\s*display: "block"/,
    );
  });

  it("hides the tagline on a phone WITHOUT removing it from the document", () => {
    // A media query, never a conditional render: responsive hiding is not
    // cloaking, and not rendering it takes the line from a crawler too.
    expect(HEADER).toMatch(/className="ellaz-tagline"/);
    expect(CSS).toMatch(/\.ellaz-tagline\s*\{\s*display:\s*none/);
    const bare = CSS.search(/\.ellaz-tagline\s*\{\s*display:\s*none/);
    const restored = CSS.indexOf("@media (min-width: 560px)", bare);
    expect(restored, "no 560px restore for the tagline").toBeGreaterThan(bare);
  });
});
