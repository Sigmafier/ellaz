// The engine's boundary: nothing under toybox/ imports a game. A source
// under toybox/ may import its siblings, anything else under toybox/, and the
// studio's adapters (../adapters/* - the engine-neutral sprite loaders both
// halves answer to). The engine's NODE side - the harness .mjs and the tests -
// may also reach the studio's shared test tooling under scripts/lib/ (the one
// schema validator, the one control runner, the export index): tooling, not a
// game. Every other resolved target, and games/ above all, is a violation.
//
// The check is a regex over the sources resolved against the importing file,
// so it holds whether or not a bundler happens to tree-shake a stray import
// away, and the population is the tree (every .ts and .mjs under toybox/,
// node_modules excluded) rather than a hand-kept list. The planted controls
// run the same function over text the tree does not contain, so a matcher
// that silently stopped matching would red them.

import { readdirSync, statSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");

/** every .ts / .mjs under toybox/, node_modules and dist excluded */
function sources(dir: string = HERE, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith("dist")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(ts|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** static imports/exports-from, dynamic import(), and new URL("...", import.meta.url) */
const SPECIFIERS = [
  /^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g,
];

export function specifiersOf(text: string): string[] {
  // comments are prose: a JSDoc line quoting a specifier is not an import
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out: string[] = [];
  for (const re of SPECIFIERS) for (const m of code.matchAll(re)) out.push(m[1]);
  return out;
}

/** node-side files may reach the studio's shared tooling; a cell or the sim may not */
const nodeSide = (file: string): boolean => file.endsWith(".mjs") || file.endsWith(".test.ts");

/**
 * The violations of one file: every relative specifier that resolves outside
 * toybox/ and outside adapters/ (and, for node-side files, scripts/lib/).
 * A bare specifier is a package and is not a path into this tree.
 */
export function violationsOf(file: string, text: string, studio: string = STUDIO): string[] {
  const bad: string[] = [];
  for (const spec of specifiersOf(text)) {
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(file), spec);
    const rel = relative(studio, target).replace(/\\/g, "/");
    const inside = rel.startsWith("toybox/") || rel.startsWith("adapters/") || (nodeSide(file) && rel.startsWith("scripts/lib/"));
    if (!inside) bad.push(`${relative(studio, file)}: ${spec} -> ${rel}`);
  }
  return bad;
}

describe("the engine imports no game", () => {
  const files = sources();

  it("has a population - the sim, the cells, the harness, the data gate", () => {
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((f) => f.endsWith("/sim/step.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("/harness/run-tape.mjs"))).toBe(true);
  });

  it("every relative import under toybox/ resolves into toybox/, adapters/, or (node side) scripts/lib/", () => {
    const bad = files.flatMap((f) => violationsOf(f, readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("no specifier under toybox/ names games/ at all", () => {
    const named = files.flatMap((f) => specifiersOf(readFileSync(f, "utf8")).filter((s) => /(^|\/)games\//.test(s)).map((s) => `${relative(STUDIO, f)}: ${s}`));
    expect(named).toEqual([]);
  });
});

// The planted lines are BUILT from these helpers rather than written out, because
// this file is in its own population: a literal `from "../../../games/..."` here
// would be caught by the gate it is a control for (it was, on the first run).
const staticImport = (spec: string): string => `import { x } from "${spec}";`;
const dynamicImport = (spec: string): string => `const m = await import("${spec}");`;
const urlOf = (spec: string): string => `const u = new URL("${spec}", import.meta.url);`;
const GAME_LOADER = ["..", "..", "..", "games", "fight", "data", "load"].join("/");

describe("the controls: the same checker over text the tree does not contain", () => {
  const cell = join(HERE, "cells", "canvas", "cell.ts");
  const test = join(HERE, "sim", "golden-tape.test.ts");

  it("a planted import of a game's loader from a cell is caught, and named whole", () => {
    const planted = `${staticImport(GAME_LOADER)}\n${staticImport("../../sim/types")}`;
    expect(violationsOf(cell, planted)).toEqual([`toybox/cells/canvas/cell.ts: ${GAME_LOADER} -> games/fight/data/load`]);
  });

  it("a planted dynamic import and a planted URL are seen by the matcher too", () => {
    const planted = `${dynamicImport(GAME_LOADER)}\n${urlOf(`${GAME_LOADER}.json`)}`;
    expect(violationsOf(cell, planted).length).toBe(2);
  });

  it("the adapters are allowed from a cell; scripts/lib is allowed from a test and refused from a cell", () => {
    expect(violationsOf(cell, staticImport("../../../adapters/canvas/draw-frame"))).toEqual([]);
    expect(violationsOf(test, urlOf("../../scripts/lib/schema.mjs"))).toEqual([]);
    expect(violationsOf(cell, staticImport("../../../scripts/lib/schema.mjs")).length).toBe(1);
  });

  it("a specifier quoted in a comment is prose, not an import", () => {
    expect(violationsOf(cell, `// see ${GAME_LOADER} for the shape\n/* ${staticImport(GAME_LOADER)} */`)).toEqual([]);
  });

  it("and the matcher itself sees a static import, a dynamic one and a URL (the population of forms)", () => {
    expect(specifiersOf(`${staticImport("./a")}\n${dynamicImport("./b")}\n${urlOf("./c")}`)).toEqual(["./a", "./b", "./c"]);
  });
});
