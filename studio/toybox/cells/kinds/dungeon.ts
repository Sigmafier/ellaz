// The dungeon room as a SimKind: the third kind the one loop can drive. Every
// value is the dungeon sim's own export (toybox/dungeon/) handed through the
// contract; the things a cell page needs that the sim does not carry are here
// - the http loader, the pointer, and the room's PICTURE. The sim never opens
// the room file's `art`, so this kind does: `arena` hands the loop the void
// fill and the room frame as its own ops (drawn under everything), and keeps
// the props' sprite ops - pillars, crates, the crystal, each at its tile's
// centre with the same depth the actors get - which `view` merges into every
// frame's sprite list. They never move, so they are built once.

import { compileDungeon } from "../../dungeon/compile";
import { hashDungeonEvents, hashDungeonState } from "../../dungeon/hash";
import { alive } from "../../dungeon/hits";
import { createState } from "../../dungeon/room";
import { stepDungeon } from "../../dungeon/step";
import { inputsAtDungeon } from "../../dungeon/tape";
import { TILE } from "../../dungeon/types";
import type { DungeonData, DungeonEvent, DungeonInput, DungeonState, LoadedDungeon } from "../../dungeon/types";
import { viewDungeon } from "../../dungeon/view";
import type { SpriteOp } from "../../sim/view";
import type { ArenaDrawOp, ArenaForCell, SimKind } from "../contract";
import { loadDungeonHttp } from "../shared/assets-dungeon";
import type { RoomArt } from "../shared/assets-dungeon";
import { attachDungeonPointer } from "../shared/pointer-dungeon";

/** the props' `who` ids start here so they never share a retained sprite with an actor */
const PROP_WHO = 100;

/** the props as sprite ops at their tiles' centres; depth (i + j + 1) tiles in FP, the actors' own formula */
function propSprites(loaded: LoadedDungeon, art: RoomArt): SpriteOp[] {
  const g = loaded.room.grid, manifest = loaded.sets[art.scenery]?.manifest;
  if (!manifest) throw new Error(`dungeon: the scenery set "${art.scenery}" was not loaded`);
  return art.props.map((p, k) => {
    const clip = manifest.animations[p.kind];
    if (!clip || clip.frames.length === 0) throw new Error(`dungeon: scenery set "${art.scenery}" has no "${p.kind}" clip for the prop at (${p.i}, ${p.j})`);
    return { set: art.scenery, frame: clip.frames[0], x: g.ox + ((p.i - p.j) * g.tileW) / 2, y: g.oy + ((p.i + p.j + 1) * g.tileH) / 2, flip: false, depth: (p.i + p.j + 1) * TILE, who: PROP_WHO + k };
  });
}

/** the void behind the picture, then the room frame by its top-left at (0, 0) */
function roomOps(loaded: LoadedDungeon, art: RoomArt): ArenaDrawOp[] {
  const manifest = loaded.sets[art.scenery]?.manifest;
  if (!manifest) throw new Error(`dungeon: the scenery set "${art.scenery}" was not loaded`);
  const clip = manifest.animations[art.room];
  if (!clip || clip.frames.length === 0) throw new Error(`dungeon: scenery set "${art.scenery}" has no "${art.room}" clip for the room`);
  return [
    { kind: "rect", x: 0, y: 0, w: loaded.room.view.w, h: loaded.room.view.h, color: art.void },
    { kind: "frame", set: art.scenery, frame: clip.frames[0], x: 0, y: 0 },
  ];
}

let props: SpriteOp[] = [];

export const dungeonKind: SimKind<LoadedDungeon, DungeonData, DungeonState, DungeonInput, DungeonEvent> = {
  id: "dungeon",
  load: loadDungeonHttp,
  compile: compileDungeon,
  sets: (loaded) => Object.keys(loaded.sets),
  arena: (loaded): ArenaForCell => {
    const art = loaded.room.art as RoomArt;
    props = propSprites(loaded, art);
    return { view: loaded.room.view, art, ops: roomOps(loaded, art) };
  },
  // a room's coins are its own; a campaign handing a carry over has the wrong kind
  create: (data, carry) => { if (carry) throw new Error("dungeon kind: a carry was handed to a room, which has no purse to seed"); return createState(data); },
  step: stepDungeon,
  hashState: hashDungeonState,
  hashEvents: hashDungeonEvents,
  tick: (s) => s.tick,
  events: (s) => s.events,
  players: () => 1,
  inputsAt: inputsAtDungeon,
  view: (prev, next, alpha256, data, boxes) => {
    const plan = viewDungeon(prev, next, alpha256, data, boxes);
    plan.sprites = [...plan.sprites, ...props].sort((a, b) => a.depth - b.depth);
    return plan;
  },
  attachInput: attachDungeonPointer,
  publish: (s) => ({
    __fightDungeon: {
      phase: s.phase, coins: s.coins, hp: s.actors[0].hp, mp: s.actors[0].mp,
      alive: s.actors.slice(1).filter((a) => alive(a)).length,
      pos: [s.actors[0].x, s.actors[0].y], state: s.actors[0].state, target: s.actors[0].target, path: s.actors[0].path.length,
      // every foe's world point, altitude and state, so a headless probe can click a LIVE one where it is now
      foes: s.actors.slice(1).map((a) => [a.x, a.y, a.alt, a.state]),
    },
  }),
};
