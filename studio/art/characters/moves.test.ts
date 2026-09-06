// The fight data of every fighter agrees with its rig: each state plays a
// clip that exists with exactly that clip's frame count, every box lies
// inside the frame the exporter will cut, the hurt box sits inside the
// drawing at rest, and the graph's inputs are the closed set.

import { describe, expect, it } from "vitest";
import { frameGeometry } from "../../export/pack";
import { CHARACTERS } from "./index";

const FIGHTERS = CHARACTERS.filter((c) => c.moves);

describe("who fights", () => {
  it("the robot and the teddy carry moves; nobody else does yet", () => {
    expect(FIGHTERS.map((c) => c.id).sort()).toEqual(["robot", "teddy"]);
  });
});

for (const c of FIGHTERS) {
  const moves = c.moves!;
  const clips = c.clips();
  const geo = frameGeometry(clips, 1, 4, c.pixel ?? 1);
  const inFrame = (b: { x: number; y: number; w: number; h: number }) => {
    const x = geo.pivot.x + b.x, y = geo.pivot.y + b.y;
    return x >= 0 && y >= 0 && x + b.w <= geo.w && y + b.h <= geo.h;
  };
  describe(`${c.id} moves`, () => {
    it("every state plays a real clip with exactly its frame count", () => {
      for (const [name, st] of Object.entries(moves.states)) {
        const clip = clips.find((k) => k.id === st.clip);
        expect(clip, `${name} plays "${st.clip}"`).toBeDefined();
        expect(st.frames.length, name).toBe(clip!.frames.length);
      }
    });
    it("initial, onHit, next and every on-target name a state; every input is in the vocabulary", () => {
      const has = (s: string) => s in moves.states;
      expect(has(moves.initial)).toBe(true);
      expect(has(moves.onHit.light) && has(moves.onHit.heavy)).toBe(true);
      for (const [name, st] of Object.entries(moves.states)) {
        if (st.next) expect(has(st.next), `${name}.next`).toBe(true);
        for (const [input, target] of Object.entries(st.on ?? {})) {
          expect(moves.inputs, `${name} on ${input}`).toContain(input);
          expect(has(target), `${name} on ${input} -> ${target}`).toBe(true);
        }
      }
    });
    it("every box lies inside the exported frame at scale 1", () => {
      for (const [name, st] of Object.entries(moves.states)) st.frames.forEach((f, i) => {
        for (const b of f.bdy ?? []) expect(inFrame(b), `${name}[${i}] bdy`).toBe(true);
        for (const h of f.itr ?? []) expect(inFrame(h.box), `${name}[${i}] itr`).toBe(true);
        if (f.push) expect(inFrame(f.push), `${name}[${i}] push`).toBe(true);
      });
    });
    it("the attack has an active hit box that reaches past the standing hurt box, and the ko ends untargetable", () => {
      const rest = moves.states.idle.frames[0].bdy![0];
      const hits = moves.states.attack.frames.flatMap((f) => f.itr ?? []);
      expect(hits.length).toBeGreaterThan(0);
      for (const h of hits) {
        expect(h.damage).toBeGreaterThan(0);
        expect(h.box.x + h.box.w).toBeGreaterThan(rest.x + rest.w);
      }
      const last = moves.states.ko.frames.at(-1)!;
      expect(last.bdy ?? []).toEqual([]);
    });
    it("the standing hurt box lies inside the drawing at rest", () => {
      const rest = moves.states.idle.frames[0].bdy![0];
      const [hx, hy, hw, hh] = c.rig!.hitbox;
      expect(rest.x).toBeGreaterThanOrEqual(hx);
      expect(rest.y).toBeGreaterThanOrEqual(hy);
      expect(rest.x + rest.w).toBeLessThanOrEqual(hx + hw);
      expect(rest.y + rest.h).toBeLessThanOrEqual(hy + hh);
    });
  });
}
