import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { ICON_PATHS, ICON_STROKE, type IconName } from "./icons";

/**
 * Three properties of the icon set, all mechanical.
 *
 * The one that motivated the file: `<Icon>` and `iconNode()` are TWO renderers
 * of the same glyph, and nothing about a drift between them is loud. The flying
 * coin and the coin in the wallet would simply become two different pictures,
 * on a screen where they appear one after the other, and every test would stay
 * green because each renderer is individually fine.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = readFileSync(join(ROOT, "ui/icons.tsx"), "utf8");

describe("the two renderers are one drawing", () => {
  it("both read their geometry from the same table", () => {
    // Not a string comparison of the output - jsdom is not loaded here and a
    // rendered-DOM assertion would only prove the renderer ran. What must hold
    // is that neither renderer has its OWN copy of a path, which is what a
    // second `d="M..."` literal in this file would be.
    const literals = SRC.match(/\bd="M[^"]+"/g) ?? [];
    expect(literals).toEqual([]);

    // Both build their path from PATHS[name], and nothing else does.
    expect(SRC.match(/PATHS\[name\]/g)?.length).toBe(2);
  });

  it("both use the same stroke weight, from the same constant", () => {
    expect(ICON_STROKE).toBe(2.1);
    expect(SRC).toContain("strokeWidth={STROKE}");
    expect(SRC).toContain('svg.setAttribute("stroke-width", String(STROKE))');

    // A hard-coded weight anywhere but the constant is a second source of
    // truth. Comments name the weight repeatedly and must not count - the
    // first draft of this check counted them and reported 3, which is the
    // matcher being wrong rather than the file.
    const code = SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
    const weights = code.filter((l) => l.includes("2.1"));
    expect(weights).toEqual(["const STROKE = 2.1;"]);
  });
});

describe("every glyph is well formed", () => {
  const names = Object.keys(ICON_PATHS) as IconName[];

  it("has the icons the currency needs", () => {
    // The wallet, the flying coins, the shop price and the home card badge all
    // draw these two. They were emoji until 2026-08-08.
    expect(names).toContain("coin");
    expect(names).toContain("star");
  });

  it("starts every subpath AFTER THE FIRST with an absolute M", () => {
    // A relative `m` is measured from the previous subpath's end point, so
    // concatenating two relative shapes flings the second one off the grid -
    // silently, since the glyph still renders. The FIRST subpath is exempt and
    // `star` uses it: with nothing before it, `m12 4.3` and `M12 4.3` are the
    // same point. (My first draft banned relative m outright and failed on
    // star, which is a correct glyph. The invariant is about concatenation.)
    for (const name of names) {
      const moves = ICON_PATHS[name].match(/[Mm]/g) ?? [];
      expect(moves.length, `${name} has no move command`).toBeGreaterThan(0);
      expect(moves.slice(1).filter((c) => c === "m"), `${name} concatenates a relative m`).toEqual(
        [],
      );
    }
  });

  it("fires on a planted relative concatenation", () => {
    const bad = "M4 4h6" + "m2 2h6";
    const moves = bad.match(/[Mm]/g) ?? [];
    expect(moves.slice(1).filter((c) => c === "m")).toEqual(["m"]);
  });

  it("draws share as the three-node mark the operator picked", () => {
    // Five subpaths: three nodes and the two edges between them. Operator
    // ruling 2026-08-25, chosen from five glyphs rendered on the real utility
    // row - so this is a RECORD of a decision, not a style preference, and a
    // silent swap back to a box-and-arrow is what it exists to catch.
    expect((ICON_PATHS.share.match(/[Mm]/g) ?? []).length).toBe(5);
    // Three `a` commands, one per node - each carries TWO arc segments (the
    // second is an implicit repeat with no letter of its own, which is why this
    // counts 3 and not 6; the first draft expected 6 and was wrong about SVG,
    // not about the glyph). A box-and-arrow, a plane, a forward arrow and a
    // link all have zero, which is what makes this discriminate rather than
    // merely pass.
    expect((ICON_PATHS.share.match(/a2\.6 2\.6 /g) ?? []).length).toBe(3);
  });

  it("draws the coin as something other than the clock", () => {
    // The first coin was the clock's own ring with a dot in it, and at the
    // wallet chip's real 17px that renders as a bullseye. It is now an ellipse
    // face over a body - a different shape, not the same shape with a different
    // filling. The clock ring must not appear in it at all.
    expect(ICON_PATHS.coin).not.toBe(ICON_PATHS.clock);
    expect(ICON_PATHS.coin).not.toContain("M20 12a8 8 0 1 1-16 0");
    // Three subpaths: the face and two coins under it. ONE of them alone is a
    // lens; two is a database cylinder - both were tried and both were wrong at
    // the size this actually renders at.
    expect((ICON_PATHS.coin.match(/[Mm]/g) ?? []).length).toBe(3);
  });
});

/**
 * The currency has ONE picture. This is the check that would have caught the
 * shipped state: an emoji coin in the wallet chip, an emoji coin in flight, an
 * emoji coin on every shop price - four surfaces, four characters the operating
 * system draws however it likes, and no code anywhere that could disagree.
 */
describe("no emoji currency in the shell", () => {
  const SHELL = ["portal", "ui", "juice", "shared"];
  // Coin and star only. The category glyphs, the room's slot icons and the dice
  // are a separate question and are deliberately NOT claimed here - a rule that
  // overclaims gets waived wholesale.
  const CURRENCY = /[\u{1FA99}\u{2B50}\u{2606}\u{1F4B0}\u{1F31F}]/u;

  /**
   * Not a currency, despite the character. Exemptions carry their reason
   * because an allowlist without one becomes a place to hide a mistake.
   */
  const EXEMPT = new Map<string, string>([
    [
      "shared/cast.ts",
      "the star here is a CAST MEMBER - one of the things kids games draw and " +
        "name aloud, beside a mushroom and a rainbow. Game content is emoji by " +
        "design (meta.emoji, the whole cast); this rule is about the currency " +
        "the wallet is denominated in, and claiming game art too would get it " +
        "waived wholesale.",
    ],
  ]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
    }
    return out;
  }

  it("draws coins and stars as SVG everywhere", () => {
    const offenders: string[] = [];
    for (const dir of SHELL) {
      for (const file of walk(join(ROOT, dir))) {
        if (EXEMPT.has(file.slice(ROOT.length))) continue;
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (CURRENCY.test(line)) offenders.push(`${file.slice(ROOT.length)}:${i + 1}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("fires on a planted emoji (the detector works)", () => {
    // Without this, a broken regex reports a clean shell forever.
    expect(CURRENCY.test('<span aria-hidden="true">\u{1FA99}</span>')).toBe(true);
    expect(CURRENCY.test("`\u{2B50} ${item.requiresStars}`")).toBe(true);
    expect(CURRENCY.test('<Icon name="coin" />')).toBe(false);
  });
});
