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

/**
 * Remove line and block comments, leaving string contents intact so that a
 * genuine `"WebSocket"` literal is still caught.
 *
 * This replaced two regexes — `/\/\*[\s\S]*?\*\//g` and `/^\s*\/\/.*$/gm` —
 * which stripped a comment only when it STARTED a line. Measured: a trailing
 * `export const X = 1; // sent over the WebSocket` still fired the ban. That is
 * the same false positive that broke this gate once, one keystroke away from
 * happening again, and a gate that fires on its own documentation gets
 * suppressed — after which it protects nothing.
 *
 * Newlines inside removed comments are preserved so line numbers do not shift.
 *
 * Known limit: this is a character scanner, not a parser, so a REGEX LITERAL
 * containing an escaped slash immediately followed by another slash (`/\//`)
 * would read as the start of a comment. The `stripComments handles the
 * constructs this codebase actually contains` block below pins the real cases,
 * including the one regex literal in engine/cards.ts.
 */
export function stripComments(src: string): string {
  type State = "code" | "line" | "block" | "single" | "double" | "template";
  let state: State = "code";
  let out = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];

    if (state === "code") {
      if (c === "/" && n === "/") {
        state = "line";
        i += 2;
        continue;
      }
      if (c === "/" && n === "*") {
        state = "block";
        i += 2;
        continue;
      }
      if (c === "'") state = "single";
      else if (c === '"') state = "double";
      else if (c === "`") state = "template";
      out += c;
      i++;
      continue;
    }

    if (state === "line") {
      if (c === "\n") {
        state = "code";
        out += c;
      }
      i++;
      continue;
    }

    if (state === "block") {
      if (c === "*" && n === "/") {
        state = "code";
        i += 2;
      } else {
        if (c === "\n") out += c; // keep line numbers stable
        i++;
      }
      continue;
    }

    // Inside a string: copy through, honouring escapes so `\"` does not close it.
    if (c === "\\") {
      out += c + (src[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (
      (state === "single" && c === "'") ||
      (state === "double" && c === '"') ||
      (state === "template" && c === "`")
    ) {
      state = "code";
    }
    out += c;
    i++;
  }

  return out;
}

const BANNED_GLOBALS = [
  /\bdocument\./,
  /\bwindow\./,
  /\blocalStorage\b/,
  /\bnavigator\./,
  /\bWebSocket\b/,
  /\bfetch\s*\(/,
];

/** Returns the banned-global patterns this source actually uses, in code. */
export function bannedGlobalsUsed(src: string): string[] {
  const code = stripComments(src);
  return BANNED_GLOBALS.filter((p) => p.test(code)).map(String);
}

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
        expect(bannedGlobalsUsed(src), `banned globals in ${file}`).toEqual([]);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// The gate's own controls. A gate nobody has watched fail is not a gate: these
// plant the real thing and require it to be caught, and plant the false
// positive that broke this file and require it to pass.

describe("the purity gate itself", () => {
  it("CATCHES a real global, in code", () => {
    const impure = `const ws = new WebSocket("wss://example.com");\n`;
    expect(bannedGlobalsUsed(impure)).toContain(String(/\bWebSocket\b/));
  });

  it("CATCHES a real global that a comment sits directly above", () => {
    const impure = `// opens the socket\nconst ws = new WebSocket(url);\n`;
    expect(bannedGlobalsUsed(impure)).toContain(String(/\bWebSocket\b/));
  });

  it("catches every other banned global too, so only one is not load-bearing", () => {
    expect(bannedGlobalsUsed(`document.querySelector("x");`)).toHaveLength(1);
    expect(bannedGlobalsUsed(`window.location.href;`)).toHaveLength(1);
    expect(bannedGlobalsUsed(`localStorage.getItem("k");`)).toHaveLength(1);
    expect(bannedGlobalsUsed(`navigator.userAgent;`)).toHaveLength(1);
    expect(bannedGlobalsUsed(`await fetch("/x");`)).toHaveLength(1);
  });

  it("IGNORES a mention in a line comment — the false positive that broke this gate", () => {
    expect(bannedGlobalsUsed(`// The WebSocket protocol — one JSON object.\n`)).toEqual([]);
  });

  it("IGNORES a TRAILING line comment, which the old two-regex strip did not", () => {
    // Measured against the previous implementation: this fired the ban.
    expect(bannedGlobalsUsed(`export const X = 1; // sent over the WebSocket\n`)).toEqual([]);
  });

  it("IGNORES a mention in a block comment", () => {
    expect(bannedGlobalsUsed(`/*\n * document.title and window.location\n */\n`)).toEqual([]);
  });

  it("IGNORES a mention in a JSDoc block", () => {
    expect(bannedGlobalsUsed(`/** Sent over the WebSocket. */\nexport type X = 1;\n`)).toEqual([]);
  });

  it("still sees a global mentioned in a string, which is deliberate", () => {
    expect(bannedGlobalsUsed(`const s = "WebSocket";`)).toHaveLength(1);
  });

  it("the real protocol.ts is clean once comments are stripped", () => {
    const src = readFileSync(join(ROOT, "protocol.ts"), "utf8");
    expect(src).toMatch(/\bWebSocket\b/); // the mention is still there...
    expect(bannedGlobalsUsed(src)).toEqual([]); // ...and it is only a mention
  });
});

describe("stripComments handles the constructs this codebase actually contains", () => {
  it("keeps a URL inside a string, whose // must not start a comment", () => {
    expect(stripComments(`const u = "https://example.com/x"; // trailing`)).toBe(
      `const u = "https://example.com/x"; `,
    );
  });

  it("keeps the one regex literal in engine/cards.ts intact", () => {
    const line = `const parts = spec.trim().split(/\\s+/);`;
    expect(stripComments(line)).toBe(line);
  });

  it("preserves line numbers so a failure still points at the right line", () => {
    const src = `a;\n// gone\n/* also\ngone */\nb;\n`;
    expect(stripComments(src).split("\n")).toHaveLength(src.split("\n").length);
  });

  it("does not let an escaped quote close a string early", () => {
    expect(stripComments(`const s = "a\\"// not a comment"; // yes`)).toBe(
      `const s = "a\\"// not a comment"; `,
    );
  });
});
