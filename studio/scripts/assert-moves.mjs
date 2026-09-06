#!/usr/bin/env node
// Every exported moves file (the fight half of a character) validates against
// export/moves.schema.json AND agrees with the manifest it sits beside: every
// state plays a clip the manifest has, with exactly that clip's frame count;
// every transition, the initial state and both onHit targets name a state
// that exists; every input key comes from the closed vocabulary; every box
// lies inside the frame. A box off the frame is a punch that lands where no
// pixel is drawn, and a state naming a missing clip is a fighter that freezes
// on its first input - neither throws anywhere.
//
//   node scripts/assert-moves.mjs             # dist-export/
//   node scripts/assert-moves.mjs --control   # plant each defect

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runControls, report } from "./lib/control.mjs";
import { readExport, STUDIO } from "./lib/export-index.mjs";
import { validate } from "./lib/schema.mjs";

const SCHEMA = JSON.parse(readFileSync(join(STUDIO, "export", "moves.schema.json"), "utf8"));

const inside = (b, w, h) => b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h;
const fmt = (b) => `[${b.x},${b.y} ${b.w}x${b.h}]`;

export function checkMoves(name, moves, manifest) {
  const out = validate(SCHEMA, moves).map((v) => `${name}: ${v}`);
  if (out.length) return out;
  const states = Object.keys(moves.states);
  const has = (st) => Object.prototype.hasOwnProperty.call(moves.states, st);
  if (!has(moves.initial)) out.push(`${name}: initial state "${moves.initial}" does not exist (states: ${states.join(", ")})`);
  for (const k of ["light", "heavy"]) if (!has(moves.onHit[k])) out.push(`${name}: onHit.${k} names "${moves.onHit[k]}", which is not a state`);
  if (moves.character !== manifest.character || moves.style !== manifest.style) out.push(`${name}: moves say ${moves.character}--${moves.style}, manifest says ${manifest.character}--${manifest.style}`);
  const { w, h } = manifest.frameSize;
  for (const [st, s] of Object.entries(moves.states)) {
    const anim = manifest.animations[s.clip];
    if (!anim) { out.push(`${name}: state "${st}" plays clip "${s.clip}", which the manifest does not have (${Object.keys(manifest.animations).join(", ")})`); continue; }
    if (anim.frames.length !== s.frames.length) out.push(`${name}: state "${st}" has ${s.frames.length} frames, clip "${s.clip}" has ${anim.frames.length}`);
    if (s.next !== undefined && !has(s.next)) out.push(`${name}: state "${st}" goes next to "${s.next}", which is not a state`);
    if (s.cancelFrom !== undefined && s.cancelFrom >= s.frames.length) out.push(`${name}: state "${st}" cancels from frame ${s.cancelFrom} but has ${s.frames.length} frames`);
    for (const [input, target] of Object.entries(s.on ?? {})) {
      if (!moves.inputs.includes(input)) out.push(`${name}: state "${st}" listens for "${input}", which is not in inputs (${moves.inputs.join(", ")})`);
      if (!has(target)) out.push(`${name}: state "${st}" on "${input}" goes to "${target}", which is not a state`);
    }
    s.frames.forEach((f, i) => {
      const boxes = [...(f.bdy ?? []).map((b) => ["bdy", b]), ...(f.itr ?? []).map((x) => ["itr", x.box]), ...(f.push ? [["push", f.push]] : [])];
      for (const [kind, b] of boxes) if (!inside(b, w, h)) out.push(`${name}: state "${st}" frame ${i} ${kind} box ${fmt(b)} is outside the ${w}x${h} frame`);
      for (const x of f.itr ?? []) if (x.kind === "hit" && !(x.damage > 0)) out.push(`${name}: state "${st}" frame ${i} has a hit that does ${x.damage} damage`);
    });
  }
  return out;
}

function scan(ex) {
  const out = [];
  for (const s of ex.sets) if (s.moves) out.push(...checkMoves(`${s.character}--${s.style}`, s.moves, s.manifest));
  return out;
}

function controls(ex) {
  const set = ex.sets.find((s) => s.moves);
  if (!set) throw new Error("no exported set carries a moves file - the controls have nothing real to mutate");
  const good = set.moves, manifest = set.manifest;
  const clone = () => JSON.parse(JSON.stringify(good));
  const mutate = (fn) => { const m = clone(); fn(m); if (JSON.stringify(m) === JSON.stringify(good)) throw new Error("control changed nothing"); return checkMoves("ctl", m, manifest); };
  const attackHit = (m) => m.states.attack.frames.find((f) => f.itr && f.itr.length);
  return [
    { name: `the real ${set.character}--${set.style} moves file`, expect: "PASS", run: () => checkMoves("real", good, manifest) },
    { name: "a hurt box past the right edge of the frame", expect: "FIRE", run: () => mutate((m) => { m.states.idle.frames[0].bdy[0].w = manifest.frameSize.w * 2; }) },
    { name: "a hit box above the frame (negative y)", expect: "FIRE", run: () => mutate((m) => { attackHit(m).itr[0].box.y = -1; }) },
    { name: "a state playing a clip the manifest lacks", expect: "FIRE", run: () => mutate((m) => { m.states.attack.clip = "uppercut"; }) },
    { name: "a state with one frame too few", expect: "FIRE", run: () => mutate((m) => { m.states.walk.frames.pop(); }) },
    { name: "an input outside the vocabulary", expect: "FIRE", run: () => mutate((m) => { m.states.idle.on.jump = "walk"; }) },
    { name: "a transition to a state that does not exist", expect: "FIRE", run: () => mutate((m) => { m.states.attack.next = "taunt"; }) },
    { name: "an initial state that does not exist", expect: "FIRE", run: () => mutate((m) => { m.initial = "spawn"; }) },
    { name: "onHit.heavy naming no state", expect: "FIRE", run: () => mutate((m) => { m.onHit.heavy = "flattened"; }) },
    { name: "a hit that does no damage", expect: "FIRE", run: () => mutate((m) => { attackHit(m).itr[0].damage = 0; }) },
    { name: "a hit of an unknown kind", expect: "FIRE", run: () => mutate((m) => { attackHit(m).itr[0].kind = "tickle"; }) },
    { name: "a stray key on a frame", expect: "FIRE", run: () => mutate((m) => { m.states.idle.frames[0].hitbox = 1; }) },
    { name: "cancelFrom past the last frame", expect: "FIRE", run: () => mutate((m) => { m.states.attack.cancelFrom = 99; }) },
    { name: "a moves file for a different character than its manifest", expect: "FIRE", run: () => mutate((m) => { m.character = "ghost"; }) },
  ];
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const ex = readExport();
  const n = ex.sets.filter((s) => s.moves).length;
  if (n === 0) { console.error("assert-moves: no exported set carries a moves file - a gate over nothing is not a pass"); process.exit(1); }
  if (process.argv.includes("--control")) process.exit(runControls("assert-moves", controls(ex)) ? 0 : 1);
  process.exit(report("assert-moves", `${n} moves files beside ${ex.sets.length} sprite sets in ${ex.root}`, scan(ex)));
}
