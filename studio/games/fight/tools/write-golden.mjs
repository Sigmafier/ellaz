#!/usr/bin/env node
// Re-record the golden tape hash. The core is TypeScript and the studio's
// toolchain for running it is vitest, so this runs the golden test with
// WRITE_GOLDEN=1: the test replays tournament/tapes/versus-600.json, prints
// the OLD and NEW golden whole (never a prefix - a diff hidden past a
// truncation is how a gate reads as broken), and rewrites
// tournament/data/versus-600.golden.json. Run it only after a deliberate
// change to the sim or the tape, and say why in the commit.
//
//   node games/fight/tools/write-golden.mjs

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const r = spawnSync("npx", ["vitest", "run", "games/fight/core/golden-tape.test.ts"], {
    cwd: STUDIO,
    env: { ...process.env, WRITE_GOLDEN: "1" },
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}
