// The purity guard, adapted from ellaz's logic-is-pure convention: everything
// under shared/src must stay runnable in a Worker and in node vitest — no
// React, no DOM, no Workers-specific globals, no imports that reach into the
// server or client packages. This is what keeps the engine one codebase for
// both sides of the wire.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const BANNED_IMPORTS = [
  /from\s+["']react["']/,
  /from\s+["']react-dom/,
  /from\s+["']phaser["']/,
  /from\s+["'][^"']*\/client\//,
  /from\s+["'][^"']*\/server\//,
  /from\s+["']@holdem\/(client|server)/,
];

const BANNED_GLOBALS = [
  /\bdocument\./,
  /\bwindow\./,
  /\blocalStorage\b/,
  /\bnavigator\./,
  /\bWebSocket\b/,
  /\bfetch\s*\(/,
];

describe("shared/src is pure", () => {
  const files = walk(ROOT);

  it("finds the engine at all (the scan is not vacuous)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file.slice(ROOT.length + 1)} stays DOM-free and package-local`, () => {
      const src = readFileSync(file, "utf8");
      for (const pattern of BANNED_IMPORTS) {
        expect(src, `banned import ${pattern} in ${file}`).not.toMatch(pattern);
      }
      // Test files may use node APIs; engine modules may not touch platform
      // globals at all. crypto.getRandomValues is the one allowed global —
      // it exists in Workers, browsers and node alike.
      if (!file.endsWith(".test.ts") && !file.endsWith("testkit.ts")) {
        for (const pattern of BANNED_GLOBALS) {
          expect(src, `banned global ${pattern} in ${file}`).not.toMatch(pattern);
        }
      }
    });
  }
});
