import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * `label-content-name-mismatch`: AN ACCESSIBLE NAME MUST CONTAIN THE WORDS THE
 * EYE CAN READ.
 *
 * A voice-control user says what they see. If a card's visible text is "My world
 * / Play to earn coins / Enter" and its `aria-label` says only "My world", none
 * of the three phrases they can say will activate it - and a screen reader loses
 * the coin count too, because an `aria-label` REPLACES the contents rather than
 * adding to them.
 *
 * Measured on the built home screen, 2026-09-07, with a probe faithful to axe
 * (name lowercased, visible text stripped of emoji and punctuation, `aria-hidden`
 * subtrees skipped): four failures before, one after. The survivor is
 * Tic-Tac-Toe, whose name contains the visible words in order and differs only
 * because axe strips the hyphens.
 *
 * WHY A SOURCE SCAN AND NOT A RENDER. The rendered check is the real one and it
 * lives in `scripts/repro/`; this is the cheap ratchet that reds in `npm test`
 * when somebody reaches for `aria-label` on these three components again. It
 * pins the DECISION, not the behaviour, and says so.
 */
const HOME = readFileSync(resolve(new URL(".", import.meta.url).pathname, "Home.tsx"), "utf8");

/**
 * The body of one `function <name>(` declaration, brace-balanced.
 *
 * The FIRST `{` after the name is not the body - every one of these components
 * destructures its props and annotates them, so the signature is
 * `function GameCard({ entry, ... }: { entry: CatalogEntry; ... }) {` and two
 * object braces come first. Walking the PARENS to depth zero finds the real one;
 * the first version of this took `indexOf("{")` and read 17 characters, which is
 * why every assertion below is preceded by a length check.
 */
function bodyOf(name: string): string {
  const at = HOME.indexOf(`function ${name}(`);
  expect(at, `${name} is gone from Home.tsx - this test is measuring nothing`).toBeGreaterThan(-1);
  let parens = 0;
  let i = HOME.indexOf("(", at);
  for (; i < HOME.length; i++) {
    if (HOME[i] === "(") parens++;
    else if (HOME[i] === ")" && --parens === 0) break;
  }
  const open = HOME.indexOf("{", i);
  let depth = 0;
  for (let i = open; i < HOME.length; i++) {
    if (HOME[i] === "{") depth++;
    else if (HOME[i] === "}" && --depth === 0) return HOME.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces reading ${name}`);
}

describe("an accessible name contains the visible text", () => {
  // Both cards render several visible phrases - a title, a stat line, a pill -
  // and no single-phrase label can contain all of them. Named from contents,
  // the name is the visible text by construction and cannot drift from it.
  it.each(["WorldHero", "DailyCard"])("%s is named from its own contents", (fn) => {
    const body = bodyOf(fn);
    expect(body.length, `${fn} read as empty`).toBeGreaterThan(200);
    expect(
      body.includes("aria-label={"),
      `${fn} sets an aria-label again. It REPLACES the card's own text, so the ` +
        `coin count / the Play pill stop being announced and the visible words ` +
        `stop working for voice control. Put extra state in visible text instead.`,
    ).toBe(false);
  });

  // This one KEEPS its label - the star count is aria-hidden, so it is not
  // visible text and has nowhere else to go. What it must not do is omit the
  // beta badge, which IS visible.
  it("a game card's label leads with the beta word, from the same source as the badge", () => {
    const body = bodyOf("GameCard");
    expect(body.includes("aria-label={"), "GameCard lost its label; the star count is unannounced").toBe(true);
    expect(
      body.includes("betaWord(locale)"),
      "GameCard's aria-label no longer starts with betaWord(locale), so a beta " +
        "tile's visible 'Beta' is missing from its accessible name",
    ).toBe(true);
    // and the badge draws from that same function, so the two cannot diverge
    expect(bodyOf("BetaPill").includes("betaWord(locale)")).toBe(true);
  });
});
