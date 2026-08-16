import { describe, it, expect } from "vitest";
import { GLOSSARY, violations } from "./glossary";

/**
 * The glossary is the one part of an unreviewed language that gets human-grade
 * scrutiny, so it has to be internally coherent before anything is written
 * against it. These check the SHAPE - that the vocabulary can be obeyed at all.
 * Whether "navigateur" is the right French word is a dictionary question, and
 * that is exactly the question forty terms makes answerable.
 */

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
        //
        // Asked through the PUBLIC matcher rather than a private helper, so it
        // tests the path a real page takes: a locked term, fed to the checker,
        // must never be reported as a violation of the vocabulary it belongs to.
        for (const t of glossary) {
          expect(
            violations(t.term, glossary),
            `the locked term "${t.term}" is itself flagged by the glossary`,
          ).toEqual([]);
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
    // "pub" is forbidden as slang for advertising. It also hides inside
    // "publicité", which is the locked term the rule exists to steer people
    // TOWARDS, and inside "publier". A substring matcher would flag the
    // correct word as a violation of itself.
    expect(violations("Aucune publicité, jamais.", g)).toEqual([]);
    expect(violations("Une page couverte de pub.", g).length).toBeGreaterThan(0);
  });

  it("leaves an ambiguous word alone rather than redding correct prose", () => {
    // "coin" (corner) and "mobile" (moving) are ordinary French words that
    // collide with anglicisms. Banning them reds pages that are perfectly
    // right, which is how a gate gets ignored. Only the unambiguous noun
    // forms are forbidden. Third and fourth instances after "le monde".
    expect(violations("Gardez la plus grosse case dans un coin.", g)).toEqual([]);
    expect(violations("Viser une cible mobile avec un doigt.", g)).toEqual([]);
    expect(violations("Sortez un mobile de votre poche.", g).length).toBeGreaterThan(0);
  });

  it("does not flag a forbidden word used in its innocent sense", () => {
    // "mobile" as a telephone is an anglicism; "une cible mobile" is ordinary
    // French about a moving target. Forbidding the bare word reds a correct
    // page, which is how a gate gets switched off. Only the noun forms are
    // banned. Second instance of this in the file after "le monde".
    expect(violations("Viser une cible mobile avec un doigt.", g)).toEqual([]);
    expect(violations("Sortez un mobile de votre poche.", g).length).toBeGreaterThan(0);
  });

  it("reports the term to use, not merely that something is wrong", () => {
    const [msg] = violations("Trois niveaux et un high score.", g);
    expect(msg).toContain("record");
  });
});
