// A parametric biped: turn a handful of knobs into a full Rig that carries
// the standard clips. The teddy is built from it; so could a dozen enemy
// variants be, with zero new animation work - which is the whole point of
// the technique (docs/techniques.md, "Parametric generator").
//
// Body units: feet at (0, 0). Proportions in HEADS, per the art bible.

import { C, E, R, type Op } from "../scene-ops";
import type { Rig } from "../rig/types";
import { standardClips } from "./clips";

export interface BipedKnobs {
  id: string;
  /** total height in body units */
  height: number;
  /** heads tall: 2.5 chibi, 3 kid, 4 hero, 5 brawler */
  heads: number;
  /** head shape */
  head: "circle" | "rect";
  /** torso shape */
  torso: "ellipse" | "rect";
  /** torso width as a fraction of height */
  girth: number;
  ears: boolean;
  colours: { body: string; belly: string; dark: string; eye: string; accent: string };
  face?: "calm" | "angry";
}

function headOps(k: BipedKnobs, r: number): Op[] {
  const c = k.colours;
  const o: Op[] = [];
  if (k.ears) o.push(C(-r * 0.7, -r * 1.55, r * 0.42, c.body), C(r * 0.7, -r * 1.55, r * 0.42, c.body), C(-r * 0.7, -r * 1.55, r * 0.2, c.belly), C(r * 0.7, -r * 1.55, r * 0.2, c.belly));
  if (k.head === "circle") o.push(C(0, -r, r, c.body));
  else o.push(R(-r, -2 * r, 2 * r, 2 * r, c.body, true, r * 0.3));
  o.push(E(0, -r * 0.65, r * 0.42, r * 0.28, c.belly));
  o.push(C(-r * 0.36, -r * 1.2, r * 0.14, c.eye), C(r * 0.36, -r * 1.2, r * 0.14, c.eye), C(0, -r * 0.78, r * 0.11, c.eye));
  if (k.face === "angry") {
    o.push({ k: "p", pts: [[-r * 0.65, -r * 1.55], [-r * 0.15, -r * 1.42], [-r * 0.15, -r * 1.3], [-r * 0.65, -r * 1.45]], f: c.dark, fg: true });
    o.push({ k: "p", pts: [[r * 0.65, -r * 1.55], [r * 0.15, -r * 1.42], [r * 0.15, -r * 1.3], [r * 0.65, -r * 1.45]], f: c.dark, fg: true });
  }
  return o;
}

/** Build a rigged biped from knobs. Every bone name is the standard one, so `standardClips` fits. */
export function buildBiped(k: BipedKnobs): Rig {
  const c = k.colours;
  const headR = k.height / k.heads / 2;
  const legH = k.height * 0.16;
  const torsoH = k.height - 2 * headR - legH;
  const torsoW = k.height * k.girth;
  const armW = torsoW * 0.28, armH = torsoW * 0.22;
  const torsoOps: Op[] =
    k.torso === "ellipse"
      ? [E(0, -torsoH / 2, torsoW / 2, torsoH / 2, c.body), E(0, -torsoH * 0.42, torsoW * 0.27, torsoH * 0.3, c.belly)]
      : [R(-torsoW / 2, -torsoH, torsoW, torsoH, c.body, true, torsoW * 0.15), R(-torsoW * 0.2, -torsoH * 0.7, torsoW * 0.4, torsoH * 0.4, c.belly, true, 2)];
  const foot = (dir: number): Op[] => [E(0, legH * 0.5, legH * 0.42, legH * 0.42, c.body), E(dir * legH * 0.1, legH * 0.75, legH * 0.5, legH * 0.25, c.dark)];
  return {
    id: k.id,
    bones: [
      { id: "root", parent: null, x: 0, y: 0 },
      { id: "torso", parent: "root", x: 0, y: -legH },
      { id: "head", parent: "torso", x: 0, y: -torsoH },
      { id: "armL", parent: "torso", x: -torsoW * 0.45, y: -torsoH * 0.62 },
      { id: "armR", parent: "torso", x: torsoW * 0.45, y: -torsoH * 0.62 },
      { id: "legL", parent: "root", x: -torsoW * 0.28, y: -legH },
      { id: "legR", parent: "root", x: torsoW * 0.28, y: -legH },
    ],
    parts: [
      { id: "armL", bone: "armL", z: 0, ops: [E(-armW * 0.5, 0, armW * 0.55, armH * 0.5, c.body)] },
      { id: "legL", bone: "legL", z: 1, ops: foot(-1) },
      { id: "legR", bone: "legR", z: 1, ops: foot(1) },
      { id: "torso", bone: "torso", z: 2, ops: torsoOps },
      { id: "head", bone: "head", z: 3, ops: headOps(k, headR) },
      { id: "armR", bone: "armR", z: 4, ops: [E(armW * 0.5, 0, armW * 0.55, armH * 0.5, c.body)] },
      { id: "fx", bone: "armR", z: 5, ops: [] },
    ],
    sockets: { hand: { bone: "armR", x: armW, y: 0 }, head: { bone: "head", x: 0, y: -headR * 2 } },
    hitbox: [-torsoW / 2, -k.height, torsoW, k.height],
    clips: standardClips({
      attack: { fx: [E(armW * 1.3, 0, armW * 0.35, armW * 0.35, c.accent)] },
      hurt: { head: headOps({ ...k, face: "calm" }, headR).map((o) => (o.f === c.eye ? { ...o, f: c.accent } : o)) },
      ko: { head: headOps({ ...k, face: "calm" }, headR).filter((o) => !(o.k === "c" && o.f === c.eye && o.r < headR * 0.2)) },
    }),
  };
}
