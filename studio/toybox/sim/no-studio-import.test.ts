// The core imports nothing outside core/: no studio module, no node built-in,
// no engine, no DOM global. That is what makes the promotion into
// src/games/fight/ a `git mv`, and what keeps seven engine cells running one
// program. The check is a regex over the sources, so it holds whether or not
// the bundler happens to tree-shake a stray import away.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const sources = () => readdirSync(HERE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const IMPORT = /^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm;

function importsOf(file: string): string[] {
  const text = readFileSync(join(HERE, file), "utf8");
  return [...text.matchAll(IMPORT)].map((m) => m[1]);
}

describe("the fight core imports only its siblings", () => {
  it("has sources to check", () => {
    expect(sources().length).toBeGreaterThan(5);
  });

  it("every import is ./sibling", () => {
    const bad: string[] = [];
    for (const f of sources()) for (const spec of importsOf(f)) if (!/^\.\/[a-z-]+$/.test(spec)) bad.push(`${f}: ${spec}`);
    expect(bad).toEqual([]);
  });

  it("names no DOM, timer or random global", () => {
    const banned = [/\bdocument\b/, /\bwindow\b/, /\bperformance\./, /\brequestAnimationFrame\b/, /\bMath\.random\b/, /\bsetTimeout\b/, /\bDate\.now\b/];
    const bad: string[] = [];
    for (const f of sources()) {
      // strip block comments too: a JSDoc line naming `window` is prose, not a call
      const text = readFileSync(join(HERE, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const re of banned) if (re.test(text)) bad.push(`${f}: ${re.source}`);
    }
    expect(bad).toEqual([]);
  });

  it("the control: a planted studio import is caught by the matcher", () => {
    const planted = `import { x } from "../../../export/moves";\nimport type { Y } from "./types";`;
    const specs = [...planted.matchAll(IMPORT)].map((m) => m[1]);
    expect(specs).toEqual(["../../../export/moves", "./types"]);
    expect(specs.filter((s) => !/^\.\/[a-z-]+$/.test(s))).toEqual(["../../../export/moves"]);
  });
});
