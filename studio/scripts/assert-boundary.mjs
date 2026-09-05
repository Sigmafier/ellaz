#!/usr/bin/env node
// The studio is a THIRD independent workspace in this repository, beside the
// games platform (src/) and the poker table (holdem/). The whole point of it
// is reuse by any engine and any game - which is only true while nothing in
// it depends on the ellaz app and nothing in the app depends on it.
//
// Two directions, two different failures:
//
//   studio -> src      the studio silently becomes an ellaz feature. A Godot
//                      game or the poker table can no longer take a sprite
//                      from it without dragging the ellaz SDK along.
//   src    -> studio   the studio lands in the ellaz first visit. Every
//                      renderer, every character, every recipe - downloaded by
//                      a child before choosing a game. The root payload gate
//                      would catch the bytes; this catches the import.
//
// Both directions are asserted here from source, before any build exists.
//
//   node scripts/assert-boundary.mjs             # scan the real tree
//   node scripts/assert-boundary.mjs --control   # plant each defect, require each to fire
//
// The matcher reads import specifiers, not whole lines, so a comment that
// MENTIONS `src/` (like this one) is not a violation - the holdem purity gate
// fired on its own comment once, and that lesson is why the regex below
// anchors on import/export/require syntax.

import { readdirSync, readFileSync, statSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");
const REPO = resolve(STUDIO, "..");

const SOURCE_EXT = new Set([".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-export", ".git", "shots"]);

/** Every source file under `root`, as absolute paths. */
export function walk(root) {
  const out = [];
  if (!statSync(root, { throwIfNoEntry: false })) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith("dist-")) continue;
      out.push(...walk(p));
    } else if (SOURCE_EXT.has(p.slice(p.lastIndexOf(".")))) {
      out.push(p);
    }
  }
  return out;
}

// import x from "…" · import "…" · export … from "…" · import("…") · require("…")
const SPECIFIER = /(?:\bimport\s*(?:[^'"()]*?\bfrom\s*)?|\bexport\s+[^'"]*?\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** The import specifiers a file names, in order. */
export function specifiers(text) {
  const out = [];
  for (const m of text.matchAll(SPECIFIER)) out.push(m[1]);
  return out;
}

/**
 * Does `spec`, written in `file`, resolve into `forbiddenRoot`? Relative
 * specifiers are resolved against the file; bare aliases are matched by name.
 * Returns a reason string, or null.
 */
export function crosses(repo, file, spec, forbiddenRoot, aliases) {
  for (const a of aliases) {
    if (spec === a || spec.startsWith(a + "/")) return `alias ${a}`;
  }
  if (spec.startsWith(".")) {
    const target = resolve(dirname(file), spec);
    if (target === forbiddenRoot || target.startsWith(forbiddenRoot + sep)) return `resolves to ${relative(repo, target)}`;
  }
  return null;
}

/**
 * Scan every file under `fromRoot` for imports that reach `intoRoot`.
 * Returns human-readable failures, operands whole.
 */
export function violations(repo, fromRoot, intoRoot, aliases, exempt = new Set()) {
  const out = [];
  for (const file of walk(fromRoot)) {
    if (exempt.has(relative(repo, file))) continue;
    const text = readFileSync(file, "utf8");
    for (const spec of specifiers(text)) {
      const why = crosses(repo, file, spec, intoRoot, aliases);
      if (why) out.push(`${relative(repo, file)} imports "${spec}" (${why})`);
    }
  }
  return out;
}

// The ONE file allowed to contain crossing imports as text: this gate, whose
// control fixtures are the planted defects. It is exempted by exact path, and
// the control block asserts the path still exists - an exemption naming a
// file that was renamed is a hole, not a rule.
export const SELF_EXEMPT = new Set(["studio/scripts/assert-boundary.mjs"]);

const ELLAZ_ALIASES = ["@sdk", "@ui", "@juice", "@i18n", "@shared"];
const STUDIO_ALIASES = ["@art", "@export", "@adapters"];

function scan(repo) {
  const src = join(repo, "src");
  const holdem = join(repo, "holdem");
  const studio = join(repo, "studio");
  return [
    ...violations(repo, studio, src, ELLAZ_ALIASES, SELF_EXEMPT).map((v) => `studio -> src: ${v}`),
    ...violations(repo, studio, holdem, [], SELF_EXEMPT).map((v) => `studio -> holdem: ${v}`),
    ...violations(repo, src, studio, STUDIO_ALIASES).map((v) => `src -> studio: ${v}`),
    ...violations(repo, holdem, studio, STUDIO_ALIASES).map((v) => `holdem -> studio: ${v}`),
  ];
}

function population(repo) {
  const n = (d) => walk(join(repo, d)).length;
  return `${n("studio")} studio files · ${n("src")} src files · ${n("holdem")} holdem files scanned`;
}

// ---------------------------------------------------------------------------
// Controls: a synthetic repo in a temp dir, one planted defect per control,
// plus a positive control (a clean tree, and a comment that only MENTIONS the
// other side) that must stay quiet.
// ---------------------------------------------------------------------------
function plant(files) {
  const root = mkdtempSync(join(tmpdir(), "studio-boundary-"));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

function withTree(files, fn) {
  const root = plant(files);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const CLEAN = {
  "src/portal/App.tsx": `import { x } from "@sdk/economy";\n// the studio lives in studio/ and this comment mentions ../studio/art on purpose\nexport const a = x;\n`,
  "studio/art/scene-ops.ts": `import { p } from "./passes/pixelate";\n// nothing here imports from ../src, and saying so is not importing it\nexport const b = p;\n`,
  "holdem/shared/src/deck.ts": `export const c = 1;\n`,
};

function controls() {
  return [
    {
      name: "the self-exemption names a file that exists",
      expect: "PASS",
      run: () => [...SELF_EXEMPT].filter((p) => !statSync(join(REPO, p), { throwIfNoEntry: false })).map((p) => `exempt path missing: ${p}`),
    },
    {
      name: "the self-exemption is not a blanket one",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "studio/scripts/other-gate.mjs": `import { PAL } from "../../src/ui/gameArt";\n` }, scan),
    },
    { name: "clean tree, comments mention the other side", expect: "PASS", run: () => withTree(CLEAN, scan) },
    {
      name: "studio -> src by relative path",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "studio/art/oops.ts": `import { PAL } from "../../src/ui/gameArt";\n` }, scan),
    },
    {
      name: "studio -> src by ellaz alias",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "studio/art/oops.ts": `import { winMoment } from "@shared";\n` }, scan),
    },
    {
      name: "studio -> holdem",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "studio/export/oops.ts": `export * from "../../holdem/shared/src/deck";\n` }, scan),
    },
    {
      name: "src -> studio by dynamic import",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "src/games/snake/index.ts": `const m = import("../../../studio/art/styles/registry");\nexport default m;\n` }, scan),
    },
    {
      name: "src -> studio by studio alias",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "src/ui/x.ts": `import { styles } from "@art/styles/registry";\n` }, scan),
    },
    {
      name: "holdem -> studio",
      expect: "FIRE",
      run: () => withTree({ ...CLEAN, "holdem/client/src/x.ts": `import "../../../studio/adapters/canvas/draw-frame";\n` }, scan),
    },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes("--control")) {
    process.exit(runControls("assert-boundary", controls()) ? 0 : 1);
  }
  process.exit(report("assert-boundary", population(REPO), scan(REPO)));
}
