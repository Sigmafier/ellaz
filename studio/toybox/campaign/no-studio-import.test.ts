// The campaign layer imports its siblings and the sim's types, and nothing
// else: no studio module, no game, no node built-in in flow.ts or save.ts (the
// shell may name the DOM - it binds the reducer to a page - but the reducer
// and the save must run in node exactly as they run in the browser).

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const sources = () => readdirSync(HERE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const IMPORT = /^\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/gm;
/** a sibling, or one of the engine's own directories one level up */
const ALLOWED = /^(\.\/[a-z-]+|\.\.\/(sim|cells)\/[a-z-]+(\/[a-z-]+)?)$/;
/** the pure half: no DOM, no clock, no random */
const PURE = ["flow.ts", "save.ts"];

function importsOf(file: string): string[] {
  return [...readFileSync(join(HERE, file), "utf8").matchAll(IMPORT)].map((m) => m[1]);
}

describe("the campaign layer imports only the engine", () => {
  it("has the reducer and the save to check", () => {
    for (const f of PURE) expect(sources()).toContain(f);
  });

  it("every import is a sibling or an engine directory", () => {
    const bad: string[] = [];
    for (const f of sources()) for (const spec of importsOf(f)) if (!ALLOWED.test(spec)) bad.push(`${f}: ${spec}`);
    expect(bad).toEqual([]);
  });

  it("the reducer and the save name no DOM, timer or random global (a storage is handed in)", () => {
    const banned = [/\bdocument\b/, /\bwindow\b/, /\bperformance\./, /\brequestAnimationFrame\b/, /\bMath\.random\b/, /\bsetTimeout\b/, /\bDate\.now\b/];
    const bad: string[] = [];
    for (const f of PURE) {
      const text = readFileSync(join(HERE, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const re of banned) if (re.test(text)) bad.push(`${f}: ${re.source}`);
    }
    expect(bad).toEqual([]);
  });

  it("the control: a planted game import and a planted studio import are both caught", () => {
    const planted = `import { x } from "../../games/fight/data/load";\nimport { y } from "../../export/moves";\nimport type { Z } from "../sim/types";\nimport { w } from "./flow";`;
    const specs = [...planted.matchAll(IMPORT)].map((m) => m[1]);
    expect(specs.filter((s) => !ALLOWED.test(s))).toEqual(["../../games/fight/data/load", "../../export/moves"]);
  });
});
