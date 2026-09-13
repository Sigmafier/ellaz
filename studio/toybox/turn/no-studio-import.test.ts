// The turn sim imports its siblings and four files of the fight's sim - the
// integer helpers, the hash bytes, and the view and tape TYPES the loop's
// contract is written in - and nothing else: no studio module, no node
// built-in, no DOM global. The check is a regex over the sources, so it holds
// whether or not a bundler tree-shakes a stray import away.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const sources = () => readdirSync(HERE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const IMPORT = /^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm;
const ALLOWED = /^(\.\/[a-z-]+|\.\.\/sim\/(fixed|hash|view|tape))$/;

function importsOf(file: string): string[] {
  return [...readFileSync(join(HERE, file), "utf8").matchAll(IMPORT)].map((m) => m[1]);
}

describe("the turn sim imports only its siblings and the fight sim's four helpers", () => {
  it("has sources to check", () => {
    expect(sources().length).toBeGreaterThan(7);
  });

  it("every import is ./sibling or ../sim/{fixed,hash,view,tape}", () => {
    const bad: string[] = [];
    for (const f of sources()) for (const spec of importsOf(f)) if (!ALLOWED.test(spec)) bad.push(`${f}: ${spec}`);
    expect(bad).toEqual([]);
  });

  it("names no DOM, timer or random global", () => {
    const banned = [/\bdocument\b/, /\bwindow\b/, /\bperformance\./, /\brequestAnimationFrame\b/, /\bMath\.random\b/, /\bsetTimeout\b/, /\bDate\.now\b/];
    const bad: string[] = [];
    for (const f of sources()) {
      const text = readFileSync(join(HERE, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const re of banned) if (re.test(text)) bad.push(`${f}: ${re.source}`);
    }
    expect(bad).toEqual([]);
  });

  it("the control: a planted studio import and a planted sim/step import are both caught", () => {
    const planted = `import { x } from "../../../export/moves";\nimport { step } from "../sim/step";\nimport type { Y } from "./types";\nimport { floorDiv } from "../sim/fixed";`;
    const specs = [...planted.matchAll(IMPORT)].map((m) => m[1]);
    expect(specs.filter((s) => !ALLOWED.test(s))).toEqual(["../../../export/moves", "../sim/step"]);
  });
});
