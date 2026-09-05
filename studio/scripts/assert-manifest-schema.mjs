#!/usr/bin/env node
// Every exported manifest validates against export/manifest.schema.json -
// the contract every engine adapter reads. A manifest with a missing pivot
// or an fps of 0 is a sprite that loads and then does something wrong,
// silently, in a game.
//
//   node scripts/assert-manifest-schema.mjs             # dist-export/
//   node scripts/assert-manifest-schema.mjs --control   # plant each defect
//
// The checker is scripts/lib/schema.mjs, a sixty-line subset validator; the
// controls prove IT as much as the manifests, because a validator that
// silently skips a keyword reads as a clean corpus.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";
import { readExport, STUDIO } from "./lib/export-index.mjs";
import { validate } from "./lib/schema.mjs";

const SCHEMA = JSON.parse(readFileSync(join(STUDIO, "export", "manifest.schema.json"), "utf8"));

export function checkManifest(name, m) {
  return validate(SCHEMA, m).map((v) => `${name}: ${v}`);
}

function scan(ex) {
  const out = [];
  for (const s of ex.sets) out.push(...checkManifest(`${s.character}--${s.style}`, s.manifest));
  return out;
}

function controls(ex) {
  const good = ex.sets[0].manifest;
  const clone = () => JSON.parse(JSON.stringify(good));
  const mutate = (fn) => { const m = clone(); fn(m); if (JSON.stringify(m) === JSON.stringify(good)) throw new Error("control changed nothing"); return checkManifest("ctl", m); };
  return [
    { name: "the real export's first manifest", expect: "PASS", run: () => checkManifest("real", good) },
    { name: "pivot removed", expect: "FIRE", run: () => mutate((m) => delete m.pivot) },
    { name: "an unexpected top-level key", expect: "FIRE", run: () => mutate((m) => { m.extra = 1; }) },
    { name: "fps of 0", expect: "FIRE", run: () => mutate((m) => { m.animations.idle.fps = 0; }) },
    { name: "a frame name outside the grammar", expect: "FIRE", run: () => mutate((m) => { m.animations.idle.frames[0] = "robot-idle-0"; }) },
    { name: "a clip missing (hurt)", expect: "FIRE", run: () => mutate((m) => delete m.animations.hurt) },
    { name: "an empty frame list", expect: "FIRE", run: () => mutate((m) => { m.animations.ko.frames = []; }) },
    { name: "frameSize as a float", expect: "FIRE", run: () => mutate((m) => { m.frameSize.w = 10.5; }) },
    { name: "a socket point missing y", expect: "FIRE", run: () => mutate((m) => { const k = Object.keys(m.sockets)[0]; const f = Object.keys(m.sockets[k])[0]; delete m.sockets[k][f].y; }) },
    { name: "a commit that is not a sha", expect: "FIRE", run: () => mutate((m) => { m.built.commit = "yesterday"; }) },
    { name: "hitbox with negative width", expect: "FIRE", run: () => mutate((m) => { m.hitbox.w = -1; }) },
    { name: "loop as a string", expect: "FIRE", run: () => mutate((m) => { m.animations.walk.loop = "true"; }) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ex = readExport();
  if (process.argv.includes("--control")) process.exit(runControls("assert-manifest-schema", controls(ex)) ? 0 : 1);
  process.exit(report("assert-manifest-schema", `${ex.sets.length} manifests in ${ex.root}`, scan(ex)));
}
