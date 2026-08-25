import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The three round controls in the home bar are ONE object, not three copies.
 *
 * Origin: the operator, 2026-08-25 - "the dark/light mode button is not
 * centered in homepage". Measured on the live site, at 320px and at 1440px
 * alike, comparing the four siblings:
 *
 *     Leaderboards   display:flex     glyph dx =   0
 *     Language       display:flex     glyph dx =   0
 *     Theme: Night   display:block    glyph dx = -15    <- the odd one out
 *     CardStyle      display:flex     (centred, in the rail)
 *
 * `ThemeToggle` was the only one of three hand-written style blocks that
 * omitted `display/alignItems/justifyContent`, so its `<svg>` laid out as an
 * inline child at the start of a block box. Nine declarations agreed and three
 * did not, which is what three copies of one shape always end in.
 *
 * WHY THIS TEST AND NOT A GREP FOR "flex". A grep would have reported the
 * property PRESENT the moment the word appeared anywhere in the block, and
 * `display: block` winning by DEFAULT leaves no token to search for at all -
 * the defect is an absence. So this asserts the three call sites hand the
 * shared object over whole, and that the object itself still carries the three
 * declarations. A fourth copy is what it refuses.
 */

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const PILL = read("./headerPill.ts");
const HOME = read("../portal/Home.tsx");
const PICKER = read("./LanguagePicker.tsx");

/**
 * The opening tag containing `at`, brace-aware.
 *
 * JSX attributes hold arrow functions, so the first `>` after the attribute is
 * usually inside `onClick={() => ...}` rather than the end of the tag. Depth
 * counting is what tells those apart.
 */
function tagAround(src: string, at: number): string {
  const start = src.lastIndexOf("<", at);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return src.slice(start, i + 1);
  }
  throw new Error("unterminated JSX tag");
}

/** The three declarations whose absence was the bug. */
const CENTRING = [/display:\s*"flex"/, /alignItems:\s*"center"/, /justifyContent:\s*"center"/];

describe("the shared header pill", () => {
  it("carries the three declarations the theme toggle was missing", () => {
    for (const re of CENTRING) expect(PILL, `HEADER_PILL lost ${re}`).toMatch(re);
  });

  it("holds the platform tap target on BOTH axes", () => {
    // One axis makes it a pill that happens to look round while its glyph
    // fits - which is a different control at a different width the first time
    // somebody puts two characters in it.
    expect(PILL).toMatch(/minHeight:\s*"var\(--hpill\)"/);
    expect(PILL).toMatch(/minWidth:\s*"var\(--hpill\)"/);
  });

  it("survives the group being squeezed rather than being squashed", () => {
    // The control group is `flex: 0 1 auto` so its own wrap can fire. Without
    // flexShrink:0 on the items, that shrink lands on the buttons instead and
    // the row never wraps at all.
    expect(PILL).toMatch(/flexShrink:\s*0/);
  });
});

describe("every round control in the home bar", () => {
  it("is the shared object, spelled the same way at all three call sites", () => {
    // `style={HEADER_PILL}` exactly - not a spread with overrides. An override
    // is how the fourth copy starts, and the two that drifted apart before
    // (18px of width, from one `padding: 0 14px`) each looked like a local
    // tweak at the time.
    const home = HOME.match(/style=\{HEADER_PILL\}/g) ?? [];
    expect(home.length, "Home.tsx no longer hands both its pills the shared object").toBe(2);
    expect(PICKER, "the language button stopped using the shared pill").toMatch(
      /style=\{HEADER_PILL\}/,
    );
  });

  it("declares no competing display of its own", () => {
    // THE CONTROL, and the reason this file is not just three `toMatch`es. An
    // inline `display` beside the spread wins over the object, silently, and
    // every assertion above still passes - which is exactly the shape of the
    // bug this file was written for.
    for (const [name, src] of [
      ["Home.tsx", HOME],
      ["LanguagePicker.tsx", PICKER],
    ] as const) {
      let from = src.indexOf("style={HEADER_PILL}");
      expect(from, `${name} has no shared pill to check`).toBeGreaterThan(-1);
      while (from > -1) {
        // THAT ELEMENT'S OWN opening tag, not a fixed window. A 400-character
        // slice was the first attempt and it reached into the NEXT element -
        // LanguagePicker's backdrop <div> carries an inline style 300 chars
        // later - so the check failed on a sibling it has no business
        // reading. A window tuned against the text in front of you goes stale
        // exactly like any other threshold here.
        expect(
          tagAround(src, from),
          `${name} carries a second style object on the same element`,
        ).not.toMatch(/style=\{\{/);
        from = src.indexOf("style={HEADER_PILL}", from + 1);
      }
    }
  });

  it("does NOT claim the card-style toggle, which is a rail item", () => {
    // A 48px round pill among 64px two-line cards reads as a stray control.
    // That is a decision, not a drift, and the note in headerPill.ts says so -
    // without this the next reader "finishes the job" and moves it over.
    const at = HOME.indexOf("function CardStyleToggle");
    expect(at, "CardStyleToggle is gone").toBeGreaterThan(-1);
    const body = HOME.slice(at, at + 1400);
    expect(body, "CardStyleToggle was folded into the header pill").not.toMatch(
      /style=\{HEADER_PILL\}/,
    );
    expect(body, "the CardStyleToggle slice is empty - the matcher moved").toMatch(
      /flexDirection:\s*"column"/,
    );
    expect(PILL, "headerPill.ts lost the note saying why the rail item is excluded").toMatch(
      /card-style toggle/,
    );
  });
});
