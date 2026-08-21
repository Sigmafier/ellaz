import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// `src/content` is data the BUILD reads. The app must never import it.
//
// The failure is not a crash. One stray import in a portal component pulls
// every word of every game page into the shell chunk - which is precached, so
// a child downloads all 21 pages in both languages before they have chosen a
// game. First visit is 69,624 B gz today; the prose alone would roughly triple
// it, and the build would stay green the whole way.
//
// Same shape as logic-is-pure.test.ts: scan the tree rather than a list of
// known files, so a component added tomorrow is covered the moment it exists.

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..");

/** Directories that ship to the browser. */
const APP_DIRS = ["portal", "ui", "sdk", "games", "juice", "shared", "i18n"];

/** `from "…/content…"` and `import("…/content…")`, relative or aliased. */
/**
 * An import of the FULL roster. `./gamesRest` and `./gameArt` must NOT trip it -
 * the closing quote right after `games` is what keeps them out, and the control
 * below plants both.
 */
const IMPORTS_ROSTER =
  /(?:from\s*|import\s*\(\s*)["'`](?:[^"'`]*\/portal\/games|\.\/games)["'`]/;

const IMPORTS_CONTENT =
  /(?:from\s*|import\s*\(\s*)["'`][^"'`]*\/content(?:\/[^"'`]*)?["'`]/;

/**
 * The same rule one layer over. `src/build/**` READS `src/content`, so an app
 * module that imports the page renderer pulls the prose in behind it - the
 * boundary above would still be green, and the shell would still triple.
 */
const IMPORTS_BUILD = /(?:from\s*|import\s*\(\s*)["'`][^"'`]*\/build(?:\/[^"'`]*)?["'`]/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    // Tests may import content freely - content.test.ts has to.
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const APP_FILES = APP_DIRS.flatMap((d) => {
  try {
    return sourceFiles(join(SRC, d));
  } catch {
    return [];
  }
});

describe("src/content is build-time only", () => {
  it("no app module imports it", () => {
    const offenders = APP_FILES.filter((f) => IMPORTS_CONTENT.test(readFileSync(f, "utf8"))).map(
      (f) => relative(SRC, f),
    );

    expect(
      offenders,
      `These modules ship to the browser and import the page prose:\n  ${offenders.join("\n  ")}\n` +
        `That puts every word of every game page into the precached shell. The build-time ` +
        `renderer is the only thing allowed to read src/content.`,
    ).toEqual([]);
  });

  it("no app module imports the page renderer either", () => {
    const offenders = APP_FILES.filter((f) => IMPORTS_BUILD.test(readFileSync(f, "utf8"))).map((f) =>
      relative(SRC, f),
    );
    expect(
      offenders,
      `These modules ship to the browser and import src/build:\n  ${offenders.join("\n  ")}\n` +
        `src/build reads src/content, so importing it pulls the prose in behind it and the ` +
        `content boundary above stays green while the shell triples.`,
    ).toEqual([]);
  });

  it("no shipped module imports the FULL roster", () => {
    // `portal/games.ts` concatenates `shellRoster.ts` and `gamesRest.ts`, so one
    // import from anything that ships puts all 33 games' metadata back in the
    // shell bundle and undoes the split - silently, behind a green build, which
    // is precisely how the card art shipped unmoved for four days. App code
    // wants `shellRoster.ts` (ids + the games above the fold) or `catalog.ts`.
    //
    // The LAB is deliberately NOT in this population, and that is a decision
    // rather than an oversight: the design bench lists every game by name, so it
    // genuinely wants the full roster. It is covered by `manualChunks` instead -
    // `games.ts` and `gamesRest.ts` are pinned OUT of the shell, so a lab import
    // lands in a lazy chunk. If an app module ever imports the roster, the shell
    // imports from that lazy chunk and `assert-first-visit.mjs` reds by name.
    const offenders = APP_FILES.filter((f) => IMPORTS_ROSTER.test(readFileSync(f, "utf8"))).map(
      (f) => relative(SRC, f),
    );
    // ADVISORY until ROSTER_GATE=1, and the arming condition is written here so
    // whoever removes the last offender finds the switch: `catalog.ts` must merge
    // `gamesRest` on idle and `dailyRotation.ts` must resolve today's game
    // through it. Both are known, both are named on every run, and neither can
    // be fixed by the commit that added this gate - a gate that reds on day one
    // for something nobody can fix that day teaches its reader to ignore it.
    // See .claude/rules/a-gate-that-reds-on-day-one-teaches-you-to-ignore-it.md
    const message =
      `These modules ship to a browser and import the full roster:\n  ${offenders.join("\n  ")}\n` +
      `That is ~91 B gz per game in the shell, paid by every child on their first ` +
      `visit, for cards most of them never scroll to. Import ./shellRoster instead.`;
    if (process.env.ROSTER_GATE === "1") {
      expect(offenders, message).toEqual([]);
      return;
    }
    // Not an assertion-free test: it still fails if the SPLIT itself is undone,
    // which is the regression this guards. Only the last two known callers are
    // tolerated, by name, and a THIRD one reds immediately.
    expect(offenders.sort()).toEqual(["portal/catalog.ts", "portal/dailyRotation.ts"]);
    console.warn(`ADVISORY (set ROSTER_GATE=1 to enforce)\n${message}`);
  });

  it("the matcher fires on the shape it claims to catch", () => {
    expect(IMPORTS_CONTENT.test('import { CONTENT } from "../content";')).toBe(true);
    expect(IMPORTS_CONTENT.test('import { memory } from "../../content/games/memory";')).toBe(true);
    expect(IMPORTS_CONTENT.test('const c = await import("../content/index");')).toBe(true);
    // Must NOT trip: a word containing "content", or a DOM property.
    expect(IMPORTS_CONTENT.test('import { x } from "../portal/contentish";')).toBe(false);
    expect(IMPORTS_CONTENT.test("el.textContent = title;")).toBe(false);
    expect(IMPORTS_CONTENT.test('import { GameHost } from "./GameHost";')).toBe(false);

    expect(IMPORTS_BUILD.test('import { gamePage } from "../build/gamePage";')).toBe(true);
    expect(IMPORTS_BUILD.test('const p = await import("../../build/pages");')).toBe(true);
    expect(IMPORTS_BUILD.test('import { x } from "./rebuild";')).toBe(false);
    expect(IMPORTS_BUILD.test("const built = build(x);")).toBe(false);

    expect(IMPORTS_ROSTER.test('import { GAMES } from "./games";')).toBe(true);
    expect(IMPORTS_ROSTER.test('import { GAMES as R } from "../../portal/games";')).toBe(true);
    expect(IMPORTS_ROSTER.test('const g = await import("../portal/games");')).toBe(true);
    // The two neighbours a loose matcher eats, and the split dies quietly if it does.
    expect(IMPORTS_ROSTER.test('import { REST } from "./gamesRest";')).toBe(false);
    expect(IMPORTS_ROSTER.test('import { SHELL_GAMES } from "./shellRoster";')).toBe(false);
    expect(IMPORTS_ROSTER.test('import { art } from "@ui/gameArt";')).toBe(false);
  });

  it("actually scanned the app tree", () => {
    // Zero files scanned satisfies the assertion above forever.
    expect(APP_FILES.length).toBeGreaterThan(40);
  });
});
