import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DOCUMENT_CSS, SERVED_CSS } from "./layout";

/**
 * THE PROSE BESIDE THE CODE MUST NOT CONTRADICT IT.
 *
 * `DOCUMENT_CSS` is a template literal emitted into the head of 164 documents,
 * so for ~40 hours its comments really did go out on the wire, and three notes
 * in `layout.ts` told the next author to keep them short. `1b8f2b9` (2026-08-22)
 * added `SERVED_CSS = stripCssComments(DOCUMENT_CSS)` and made them free - and
 * nothing updated the notes, so the file went on instructing everyone who read
 * it to under-explain in the one stylesheet no browser devtool will ever show
 * them.
 *
 * That is not a hypothetical cost. `42a5b77` is a commit whose entire message is
 * "Trim the breadcrumb comment, because comments in DOCUMENT_CSS are SERVED".
 *
 * `build.test.ts` already asserts the STRIPPING works, from both ends. What
 * nothing asserted is that the file's own prose agrees with it. Same shape as
 * `analytics.test.ts`, which reads its own doc comment for a consent state the
 * tag does not ship - and for the same reason: when a comment and a literal
 * disagree, the comment wins the argument with the next reader.
 */

const LAYOUT = readFileSync(new URL("./layout.ts", import.meta.url), "utf8");

/** Comment bodies only - the assertions below must not match their own prose. */
const COMMENTS = (LAYOUT.match(/\/\*[\s\S]*?\*\//g) ?? []).join("\n");

describe("comments in DOCUMENT_CSS are free, and the file says so", () => {
  /**
   * The positive control, FIRST. Every assertion under this one passes
   * vacuously over an empty string, which is exactly what a regex that quietly
   * stopped matching would produce - and this file's whole subject is a claim
   * that silently stopped being true.
   */
  it("can actually see the comments it is scanning, and ONLY them", () => {
    // Both halves. A regex returning nothing satisfies every "must not
    // contain" below; a regex returning the whole FILE satisfies them too once
    // the source stops carrying the phrase, and then this file would be
    // grading code as if it were prose.
    const blocks = LAYOUT.match(/\/\*[\s\S]*?\*\//g) ?? [];
    expect(blocks.length).toBeGreaterThan(20);
    expect(COMMENTS.length).toBeGreaterThan(4000);
    expect(COMMENTS, "the matcher is returning code, not comments").not.toContain(
      "export const SERVED_CSS",
    );
  });

  it("strips them, so the claim is true", () => {
    expect(DOCUMENT_CSS).toContain("/*");
    expect(SERVED_CSS).not.toContain("/*");
  });

  it("has exactly ONE emission site, and it emits the stripped copy", () => {
    // The claim is only true while nothing emits DOCUMENT_CSS raw. A second
    // emitter is how it would come back - not by the stripping being deleted.
    const emitted = [...LAYOUT.matchAll(/\$\{raw\((DOCUMENT_CSS|SERVED_CSS)\)\}/g)].map((m) => m[1]);
    expect(emitted).toEqual(["SERVED_CSS"]);
  });

  it("no longer tells its author that comments here cost bytes", () => {
    // The three that shipped, verbatim in shape:
    //   "(Comments in DOCUMENT_CSS are SERVED; keep them short here.)"
    //   "(Comments in DOCUMENT_CSS are SERVED, unlike the ones in global.css...)"
    //   "(Comments here are SERVED - keep them short.)"
    const claims = COMMENTS.match(/Comments[^*]{0,80}are SERVED/gi) ?? [];
    expect(claims, `layout.ts still tells its author comments are served: ${claims.join(" | ")}`).toEqual([]);
  });

  it("says the true thing once, where the fact lives", () => {
    // Once, at the declaration - not three times beside three rules, which is
    // how one stale copy becomes three.
    const said = COMMENTS.match(/do comments here cost bytes/gi) ?? [];
    expect(said).toHaveLength(1);
  });
});
