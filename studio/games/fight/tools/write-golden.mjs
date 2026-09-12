#!/usr/bin/env node
// Re-record the golden tape hashes. The core is TypeScript and the studio's
// toolchain for running it is vitest, so this runs the golden test with
// WRITE_GOLDEN=1: the test replays EVERY tape under the game's tapes/, prints
// each OLD and NEW golden whole (never a prefix - a diff hidden past a
// truncation is how a gate reads as broken), and rewrites the
// tapes/<tape>.golden.json beside each. Run it only after a deliberate
// change to the sim or a tape, and say why in the commit - and say WHICH
// goldens moved: a Versus-only change that moves the stage golden, or the
// other way round, is the thing the two goldens exist to show.
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
