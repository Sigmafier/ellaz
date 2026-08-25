import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * THE CHIP HAS TWO HALVES AND TWO FLAGS THAT REMOVE THEM, so there is a state
 * where a caller asks for neither. That is a contradiction rather than a
 * nuance, and left to the render order it resolves to whichever branch happens
 * to be read first - which is a decision nobody made, in the one component that
 * tells a child what they have.
 *
 * `coinsOnly` wins, and it is pinned HERE rather than described in a comment,
 * because the whole point is that the two branches cannot answer it
 * independently. A source scan is the honest instrument: the flags are read in
 * three separate places (the label and the two spans) and a test that rendered
 * the component would prove only that today's render order does what it does.
 */
const SRC = readFileSync(fileURLToPath(new URL("./WalletChip.tsx", import.meta.url)), "utf8");

describe("the wallet chip's two halves", () => {
  it("resolves the both-flags contradiction in exactly one place", () => {
    // One derived value, and the coins win. If this moves, the three readers
    // below start disagreeing with each other.
    expect(SRC).toMatch(/const onlyStars = starsOnly && !coinsOnly;/);
  });

  it("gates the coin half on the DERIVED value, never on the raw flag", () => {
    // `{!starsOnly && (` was the shipped line, and it is the bug: a caller
    // passing both would lose the coins to `starsOnly` and the stars to
    // `coinsOnly`, i.e. an empty chip with a correct aria-label.
    expect(SRC).toMatch(/\{!onlyStars && \(/);
    expect(SRC).not.toMatch(/\{!starsOnly && \(/);
  });

  it("gates the star half on coinsOnly", () => {
    expect(SRC).toMatch(/\{!coinsOnly && \(/);
  });

  it("says out loud what each shape is called", () => {
    // The label is what a screen reader gets, and it is the one surface where
    // "an empty chip" is not observable - so it has to carry all three arms.
    expect(SRC).toMatch(/onlyStars \? `\$\{stars\} stars`/);
    expect(SRC).toMatch(/coinsOnly \? `\$\{coins\} coins`/);
    expect(SRC).toMatch(/`\$\{coins\} coins, \$\{stars\} stars`/);
  });

  it("is what the home bar passes - operator pick, arm P", () => {
    const home = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");
    expect(home).toMatch(/<WalletChip coinsOnly \/>/);
    // The POSITIVE CONTROL for the assertion above: a scan that found nothing
    // would pass it vacuously the day the chip is renamed.
    expect(home).toMatch(/<WalletChip/);
  });
});
