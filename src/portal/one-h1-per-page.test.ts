import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * A screen that MOUNTS INTO AN EMITTED PAGE MAY NOT RENDER ITS OWN <h1>.
 *
 * The page already has one, written at build time, and it is the one a crawler
 * reads. A second h1 is injected only after JavaScript runs — so it is invisible
 * to every automated check that fetches HTML (assert-pages counts exactly one
 * and is satisfied), and visible to a screen-reader user navigating by heading,
 * who is the person a duplicate top-level heading hurts most.
 *
 * `Home.tsx` is deliberately exempt: it mounts into `index.html`, which carries
 * no h1 of its own, so its heading IS the page's.
 *
 * Scanned as source text rather than rendered, because the repo tests logic and
 * not the DOM — and because the thing being forbidden is a literal tag.
 */
const MOUNTS_INTO_AN_EMITTED_PAGE = [
  "src/portal/Boards.tsx",
  "src/portal/world/World.tsx",
];

describe("one h1 per document", () => {
  it("no page-mounted screen renders its own h1", () => {
    for (const file of MOUNTS_INTO_AN_EMITTED_PAGE) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("<h1"), `${file} renders an <h1>; the emitted page already has one`).toBe(
        false,
      );
    }
  });

  it("the home screen keeps its h1, because index.html has none", () => {
    // The negative control. Without it this suite would still pass if someone
    // deleted every heading in the app, which is not what it is asking for.
    expect(readFileSync("src/portal/Home.tsx", "utf8")).toContain("<h1");
  });
});
