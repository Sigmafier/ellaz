// The clock, tick by tick. Which frame is showing, and when does a state end.
//
// Both rules are exercised against real compiled data rather than a hand-built
// CState: the robot's idle and attack come straight out of the exported sprite
// set, and the wait-authored state is compiled through the same compileFight()
// the game will use - so `timing()` is under test here too, not only the lookup.
// A CState written as a literal would agree with whatever compile.ts produced,
// including a starts[] that was off by one.
//
// The drift sweep at the bottom is the one that matters over a long match: a
// frame index that creeps by one every few hundred ticks is invisible for the
// first minute and then the fighter is animating a frame behind its own boxes.

import { loadMode } from "../data/load";
import { compileFight } from "./compile";
import { canCancel, frameAt, frameIndexAt, stateDone, stateIndex } from "./moves";
import type { CFighter, CState, FightData } from "./types";

const input = loadMode("versus");
const data: FightData = compileFight(input);

const byId = (d: FightData, id: string): CFighter => {
  const f = d.fighters.find((x) => x.id === id);
  if (!f) throw new Error(`no compiled fighter "${id}"`);
  return f;
};
const at = (f: CFighter, name: string): CState => {
  const i = stateIndex(f, name);
  if (i < 0) throw new Error(`fighter "${f.id}" has no state "${name}"`);
  return f.states[i];
};
const robot = byId(data, "robot");

/** the real input with one extra state whose frames authored `wait` */
function withHoldState(): CState {
  const raw = structuredClone(input);
  // clip "hurt" is 3 frames at 10 fps, one-shot - so the frame COUNT matches
  // and the fps is deliberately the wrong answer: 60/10 = 6 ticks a frame,
  // which none of 3 / 5 / 2 is. If the fps rule leaked in, these numbers move.
  raw.sets["robot--snes16"].moves.states.hold = {
    clip: "hurt",
    frames: [{ wait: 3 }, { wait: 5 }, { wait: 2 }],
  };
  return at(byId(compileFight(raw), "robot"), "hold");
}

describe("the fps rule: no wait authored, the clip's fps places the frame", () => {
  it("walks the robot's idle one frame per ten ticks and wraps at its total", () => {
    const idle = at(robot, "idle"); // 6 fps, loop, 4 frames -> 10 ticks a frame, total 40
    expect(idle).toMatchObject({ fps: 6, loop: true, starts: [], total: 40 });

    const seen: number[] = [];
    for (let t = 0; t <= 40; t++) seen.push(frameIndexAt(idle, t));
    expect(seen.slice(0, 10)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(seen.slice(10, 20)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(seen.slice(20, 30)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(seen.slice(30, 40)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(seen[40]).toBe(0);
  });

  it("never ends a looping state", () => {
    const idle = at(robot, "idle");
    for (const t of [0, 39, 40, 41, 4000]) expect(stateDone(idle, t)).toBe(false);
  });

  it("holds the robot's attack on its last frame and ends it at total", () => {
    const attack = at(robot, "attack"); // 12 fps, one-shot, 6 frames -> 5 ticks a frame, total 30
    expect(attack).toMatchObject({ fps: 12, loop: false, starts: [], total: 30 });

    expect(frameIndexAt(attack, 24)).toBe(4);
    for (const t of [25, 26, 29, 30, 60, 600]) expect(frameIndexAt(attack, t)).toBe(5);

    expect(stateDone(attack, 29)).toBe(false);
    expect(stateDone(attack, 30)).toBe(true);
    expect(stateDone(attack, 31)).toBe(true);
  });

  it("hands back the frame record the index points at, addressed by state INDEX", () => {
    const attack = at(robot, "attack");
    const i = stateIndex(robot, "attack");
    expect(frameAt(robot, i, 0)).toBe(attack.frames[0]);
    expect(frameAt(robot, i, 12).itr.length).toBe(1); // floor(12 * 12 / 60) = 2, the armed frame
    expect(frameAt(robot, i, 600)).toBe(attack.frames[5]);
  });
});

describe("the wait rule: an authored wait replaces the fps entirely", () => {
  const hold = withHoldState();

  it("compiles [3, 5, 2] into starts [0, 3, 8] and a total of 10", () => {
    expect(hold.starts).toEqual([0, 3, 8]);
    expect(hold.total).toBe(10);
    expect(hold.fps).toBe(10); // taken off the clip, and deliberately not used
    expect(hold.loop).toBe(false);
  });

  it("places every tick of the pass on the frame its wait says", () => {
    const seen = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => frameIndexAt(hold, t));
    expect(seen).toEqual([0, 0, 0, 1, 1, 1, 1, 1, 2, 2]);
    expect(frameIndexAt(hold, 7)).toBe(1);
    expect(frameIndexAt(hold, 8)).toBe(2);
  });

  it("holds the last frame past the end and ends at total", () => {
    for (const t of [10, 11, 500]) expect(frameIndexAt(hold, t)).toBe(2);
    expect(stateDone(hold, 9)).toBe(false);
    expect(stateDone(hold, 10)).toBe(true);
  });
});

describe("no index drift over a long match", () => {
  it("keeps every state inside its own frame array for 3600 ticks", () => {
    let checked = 0;
    for (const f of data.fighters) {
      for (const st of f.states) {
        for (let t = 0; t < 3600; t++) {
          const i = frameIndexAt(st, t);
          if (i < 0 || i >= st.frames.length) {
            throw new Error(`${f.id}.${st.name} at t=${t} gave frame ${i} of ${st.frames.length}`);
          }
          checked++;
        }
      }
    }
    expect(checked).toBe(data.fighters.length * 5 * 3600); // 2 fighters, 5 states each
  });

  it("cycles a looping state with a period of exactly its total", () => {
    const looping = data.fighters.flatMap((f) => f.states.filter((s) => s.loop));
    expect(looping.map((s) => s.name)).toEqual(["idle", "walk", "idle", "walk"]);
    for (const st of looping) {
      for (let t = 0; t < 3600; t++) {
        expect(frameIndexAt(st, t)).toBe(frameIndexAt(st, t + st.total));
      }
    }
  });

  it("does NOT cycle a one-shot state, so the sweep above could have failed", () => {
    const attack = at(robot, "attack");
    expect(frameIndexAt(attack, 0)).toBe(0);
    expect(frameIndexAt(attack, attack.total)).toBe(5);
  });
});

describe("cancelling", () => {
  it("opens the robot's attack from its cancelFrom frame onward", () => {
    const attack = at(robot, "attack");
    expect(attack.cancelFrom).toBe(4);
    expect([0, 1, 2, 3].map((i) => canCancel(attack, i))).toEqual([false, false, false, false]);
    expect([4, 5].map((i) => canCancel(attack, i))).toEqual([true, true]);
  });

  it("reads a cancelFrom of -1 as never, not as from frame -1 onward", () => {
    const idle = at(robot, "idle");
    expect(idle.cancelFrom).toBe(-1);
    for (const i of [0, 1, 2, 3, 99]) expect(canCancel(idle, i)).toBe(false);
  });
});

describe("stateIndex", () => {
  it("finds every state by name and answers -1 for one that is absent", () => {
    for (const f of data.fighters) {
      for (const [i, st] of f.states.entries()) expect(stateIndex(f, st.name)).toBe(i);
      expect(stateIndex(f, "nosuchstate")).toBe(-1);
    }
  });
});
