#!/usr/bin/env node
// Frame names are the contract between the atlas, the manifest and every
// adapter: <character>_<clip>_<nnnn>, four digits from 0000, contiguous,
// in clip order, character matching the manifest's. Phaser's
// generateFrameNames, Godot's SpriteFrames and our own adapters all key on
// this shape, so one renamed frame is a clip that silently plays short.
//
//   node scripts/assert-frame-grammar.mjs             # dist-export/
//   node scripts/assert-frame-grammar.mjs --control   # plant each defect

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";
import { readExport } from "./lib/export-index.mjs";

export const GRAMMAR = /^([a-z0-9]+)_([a-z]+)_(\d{4})$/;
export const STANDARD_CLIPS = ["idle", "walk", "attack", "hurt", "ko"];

export function checkGrammar(name, manifest, atlas) {
  const out = [];
  for (const clip of STANDARD_CLIPS) if (!manifest.animations?.[clip]) out.push(`${name}: manifest has no "${clip}" clip`);
  for (const [clip, a] of Object.entries(manifest.animations ?? {})) {
    (a.frames ?? []).forEach((f, i) => {
      const m = GRAMMAR.exec(f);
      if (!m) { out.push(`${name}/${clip}: frame "${f}" does not match <character>_<clip>_<nnnn>`); return; }
      if (m[1] !== manifest.character) out.push(`${name}/${clip}: frame "${f}" belongs to character "${m[1]}", manifest is "${manifest.character}"`);
      if (m[2] !== clip) out.push(`${name}/${clip}: frame "${f}" names clip "${m[2]}"`);
      if (Number(m[3]) !== i) out.push(`${name}/${clip}: frame "${f}" is at position ${i}, expected index ${String(i).padStart(4, "0")}`);
    });
  }
  for (const f of Object.keys(atlas.frames ?? {})) if (!GRAMMAR.test(f)) out.push(`${name}: atlas frame "${f}" does not match the grammar`);
  return out;
}

function scan(ex) {
  return ex.sets.flatMap((s) => checkGrammar(`${s.character}--${s.style}`, s.manifest, s.atlas));
}

function controls(ex) {
  const s = ex.sets[0];
  const mut = (fn) => {
    const m = JSON.parse(JSON.stringify(s.manifest)), a = JSON.parse(JSON.stringify(s.atlas));
    fn(m, a);
    if (JSON.stringify([m, a]) === JSON.stringify([s.manifest, s.atlas])) throw new Error("control changed nothing");
    return checkGrammar("ctl", m, a);
  };
  return [
    { name: "the real export's first set", expect: "PASS", run: () => checkGrammar("real", s.manifest, s.atlas) },
    { name: "a hyphenated frame name", expect: "FIRE", run: () => mut((m) => { m.animations.idle.frames[1] = `${m.character}-idle-0001`; }) },
    { name: "a skipped index", expect: "FIRE", run: () => mut((m) => { m.animations.walk.frames.splice(2, 1); }) },
    { name: "frames out of order", expect: "FIRE", run: () => mut((m) => { m.animations.walk.frames.reverse(); }) },
    { name: "another character's frame", expect: "FIRE", run: () => mut((m) => { m.animations.idle.frames[0] = "zzz_idle_0000"; }) },
    { name: "a frame filed under the wrong clip", expect: "FIRE", run: () => mut((m) => { m.animations.hurt.frames[0] = `${m.character}_idle_0000`; }) },
    { name: "a standard clip missing", expect: "FIRE", run: () => mut((m) => delete m.animations.ko) },
    { name: "an atlas key outside the grammar", expect: "FIRE", run: () => mut((_m, a) => { a.frames["Robot Idle 1"] = a.frames[Object.keys(a.frames)[0]]; }) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ex = readExport();
  if (process.argv.includes("--control")) process.exit(runControls("assert-frame-grammar", controls(ex)) ? 0 : 1);
  const n = ex.sets.reduce((t, s) => t + Object.keys(s.atlas.frames).length, 0);
  process.exit(report("assert-frame-grammar", `${n} frame names across ${ex.sets.length} sets`, scan(ex)));
}
