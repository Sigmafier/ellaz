/**
 * Lets a statistic script import the game's REAL TypeScript modules.
 *
 * Node 24 strips types on its own, but it does not know our `@shared`/`@sdk`
 * aliases, so `import { mulberry32 } from "@shared/rng"` fails to resolve. This
 * hook maps them to `src/`, mirroring `tsconfig.json` and `vite.config.ts`.
 *
 * The alternative was for each script to re-implement the logic it measures,
 * which is the trap the whole provenance idea exists to avoid: a re-implementation
 * measures YOUR READING of the code, agrees with itself, and produces a
 * confident number about a game we do not ship.
 *
 * Usage:
 *   import { register } from "node:module";
 *   register("./alias-hooks.mjs", import.meta.url);
 *   const { generate } = await import("../../src/games/sudoku/logic.ts");
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

// Keep in step with tsconfig `paths`. A stale entry here fails loudly at import
// time rather than silently measuring the wrong module, which is the good
// failure mode.
const ALIASES = {
  "@sdk": join(SRC, "sdk"),
  "@ui": join(SRC, "ui"),
  "@juice": join(SRC, "juice"),
  "@i18n": join(SRC, "i18n"),
  "@shared": join(SRC, "shared"),
};

/** `./foo` -> `./foo.ts`, `./foo.tsx`, `./foo/index.ts`, in the bundler's order. */
const candidates = (base) => [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")];

export async function resolve(specifier, context, next) {
  for (const [alias, dir] of Object.entries(ALIASES)) {
    if (specifier !== alias && !specifier.startsWith(`${alias}/`)) continue;

    const rest = specifier === alias ? "index" : specifier.slice(alias.length + 1);
    for (const candidate of candidates(rest)) {
      const url = pathToFileURL(join(dir, candidate)).href;
      try {
        return await next(url, context);
      } catch {
        // Next candidate. If none resolve, fall through to the real resolver so
        // the error names the specifier rather than our last guess.
      }
    }
  }

  // Extensionless relative imports. TypeScript source writes `./games/memory`
  // and lets the bundler find the file; node will not, so a script importing
  // any real app module dies on the first internal import rather than on the
  // one it asked for. Only tried when the specifier has no extension already.
  if (/^\.{1,2}\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
    for (const candidate of candidates(specifier)) {
      try {
        return await next(candidate, context);
      } catch {
        // Same as above: exhaust the candidates, then let node report honestly.
      }
    }
  }

  return next(specifier, context);
}
