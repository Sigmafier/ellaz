import { describe, it, expect } from "vitest";
import { GLOSSARY, type Glossary } from "./glossary";

/**
 * The glossary is the one part of an unreviewed language that gets human-grade
 * scrutiny, so it has to be internally coherent before anything is written
 * against it. These check the SHAPE - that the vocabulary can be obeyed at all.
 * Whether "navigateur" is the right French word is a dictionary question, and
 * that is exactly the question forty terms makes answerable.
 */

/** Word-boundary match, so "coin" does not fire inside "rejoindre". */
function usesWord(haystack: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, "iu").test(haystack);
}

export function violations(text: string, glossary: Glossary): string[] {
  const out: string[] = [];
  for (const t of glossary) {
    for (const bad of t.avoid ?? []) {
      if (usesWord(text, bad)) out.push(`"${bad}" — use "${t.term}" (${t.concept})`);
    }
  }
  return out;
}

describe("the locked vocabulary is coherent", () => {
  for (const [locale, glossary] of Object.entries(GLOSSARY)) {
    describe(locale, () => {
      it("has enough terms to be worth locking", () => {
        // Small enough to verify by hand is the point; too small and it stops
        // covering the words that actually recur on every page.
        expect(glossary.length).toBeGreaterThanOrEqual(30);
      });

      it("names each concept once", () => {
        const concepts = glossary.map((t) => t.concept);
        expect(new Set(concepts).size, "a concept is locked twice").toBe(concepts.length);
      });

      it("never forbids a word it also requires", () => {
        // The unsatisfiable glossary: `avoid` on one entry naming another
        // entry's locked term. Every page would then violate by construction
        // and the gate would be impossible to satisfy rather than merely
        // strict. This is the check that caught `pièce` serving as coin, tile
        // AND room at once.
        const locked = new Set(glossary.map((t) => t.term.toLowerCase()));
        for (const t of glossary) {
          for (const bad of t.avoid ?? []) {
            expect(
              locked.has(bad.toLowerCase()),
              `"${bad}" is forbidden by "${t.concept}" but is the locked term for another concept`,
            ).toBe(false);
          }
        }
      });

      it("never forbids a substring of one of its own locked terms", () => {
        // Subtler than the above and it bit this file on the first draft: the
        // room entry forbade "la pièce", which matches inside "la pièce d'or" -
        // the locked term for a coin. Every correct page would have failed.
        for (const t of glossary) {
          for (const bad of t.avoid ?? []) {
            const collides = glossary.filter((o) => usesWord(o.term, bad));
            expect(
              collides.map((o) => o.term),
              `"${bad}" is forbidden but appears inside a locked term`,
            ).toEqual([]);
          }
        }
      });

      it("locks the terms every page repeats", () => {
        // Not an arbitrary list: these are the concepts that appear on all 29
        // pages because they are the platform's own promises. A glossary that
        // covers the games but not these has locked the rare words and left
        // the common ones to drift.
        const concepts = glossary.map((t) => t.concept);
        for (const must of ["game", "free of charge", "browser", "offline", "no account", "child"]) {
          expect(concepts, `nothing locked for "${must}"`).toContain(must);
        }
      });
    });
  }
});

describe("the violation matcher", () => {
  const g = GLOSSARY.fr;

  it("catches an anglicism the glossary forbids", () => {
    expect(violations("Jouez dans le browser, sans compte.", g)).toHaveLength(1);
    expect(violations("Jouez dans le browser, sans compte.", g)[0]).toContain("navigateur");
  });

  it("passes prose that uses the locked terms", () => {
    expect(violations("Jouez dans le navigateur, sans compte et hors ligne.", g)).toEqual([]);
  });

  it("respects word boundaries", () => {
    // "coin" is forbidden as an English word for a coin. It is also a perfectly
    // ordinary French word meaning "corner", and it hides inside "rejoindre".
    // A substring matcher would red correct French on both counts, which is how
    // a gate gets switched off.
    expect(violations("Venez nous rejoindre.", g)).toEqual([]);
    expect(violations("dans le coin de l'écran", g).length).toBeGreaterThan(0);
  });

  it("reports the term to use, not merely that something is wrong", () => {
    const [msg] = violations("Trois niveaux et un high score.", g);
    expect(msg).toContain("record");
  });
});
