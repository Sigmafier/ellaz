#!/usr/bin/env node
// The gallery wears the ellaz design tokens, and the studio may not import
// from src/ (assert-boundary refuses it). So gallery/src/tokens.css is a
// COPY of src/ui/tokens.css, and a copy drifts the day somebody tunes a
// colour on one side. This gate holds the two byte-equal.
//
//   node scripts/assert-tokens-parity.mjs             # compare the real pair
//   node scripts/assert-tokens-parity.mjs --control   # plant a drift, require it to fire
//
// When it reds, the fix is one command, and it is printed: copy the app's
// file over the studio's. Never edit the studio copy by hand - the app is
// the source of truth for what ellaz looks like, and the gallery's whole
// job is to show art in the app's own clothes.

import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runControls, report } from "./lib/control.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDIO = resolve(HERE, "..");
const REPO = resolve(STUDIO, "..");
export const SOURCE = join(REPO, "src", "ui", "tokens.css");
export const COPY = join(STUDIO, "gallery", "src", "tokens.css");

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** The first line where two texts differ, 1-based, with both lines whole. */
export function firstDifference(a, b) {
  const la = a.split("\n"), lb = b.split("\n");
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) return { line: i + 1, source: la[i] ?? "<end of file>", copy: lb[i] ?? "<end of file>" };
  }
  return null;
}

/** Failures for a (source, copy) pair of paths. Empty means parity. */
export function check(sourcePath, copyPath) {
  const failures = [];
  if (!existsSync(sourcePath)) return [`source missing: ${sourcePath}`];
  if (!existsSync(copyPath)) return [`copy missing: ${copyPath} - run: cp ${sourcePath} ${copyPath}`];
  const a = readFileSync(sourcePath), b = readFileSync(copyPath);
  if (a.equals(b)) return failures;
  const d = firstDifference(a.toString("utf8"), b.toString("utf8"));
  failures.push(
    `tokens drifted: ${relative(REPO, copyPath)} (sha256 ${sha(b)}, ${b.length} bytes) is not ${relative(REPO, sourcePath)} (sha256 ${sha(a)}, ${a.length} bytes)` +
    (d ? `\n        first difference at line ${d.line}\n        source: ${d.source}\n        copy:   ${d.copy}` : "") +
    `\n        fix: cp ${sourcePath} ${copyPath}`,
  );
  return failures;
}

function main() {
  const control = process.argv.includes("--control");
  if (!control) {
    const failures = check(SOURCE, COPY);
    process.exit(report("assert-tokens-parity", `1 pair compared: ${relative(REPO, COPY)} vs ${relative(REPO, SOURCE)} (${readFileSync(SOURCE).length} bytes)`, failures));
  }
  const dir = mkdtempSync(join(tmpdir(), "studio-tokens-"));
  const real = readFileSync(SOURCE, "utf8");
  const plant = (name, text) => { const p = join(dir, name); writeFileSync(p, text); return p; };
  const src = plant("source.css", real);
  const controls = [
    { name: "positive: a byte-identical copy is parity", expect: "PASS", run: () => check(src, plant("same.css", real)) },
    { name: "one colour retuned on the app side", expect: "FIRE", run: () => check(src, plant("retuned.css", real.replace("--brand: #ff4d8d", "--brand: #ff4d8e"))) },
    { name: "a token added to the app and not copied", expect: "FIRE", run: () => check(src, plant("short.css", real.replace("--tap: 48px;", ""))) },
    { name: "trailing byte differs (the part a truncated print would hide)", expect: "FIRE", run: () => check(src, plant("tail.css", real + " ")) },
    { name: "copy missing entirely", expect: "FIRE", run: () => check(src, join(dir, "nowhere.css")) },
  ];
  // every planted mutation must actually have changed the bytes, or the control measures nothing
  for (const c of controls.slice(1, 4)) {
    const p = join(dir, c.name.includes("retuned") ? "retuned.css" : c.name.includes("added") ? "short.css" : "tail.css");
    if (existsSync(p) && readFileSync(p, "utf8") === real) { console.log(`  control  ${c.name}: ERROR - the mutation did not land`); process.exit(1); }
  }
  const ok = runControls("assert-tokens-parity", controls);
  rmSync(dir, { recursive: true, force: true });
  process.exit(ok ? 0 : 1);
}

main();
