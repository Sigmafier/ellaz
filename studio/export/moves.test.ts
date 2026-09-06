import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../art/characters";
import { buildMovesFile, gridBox, standardGraph } from "./moves";
import { frameGeometry } from "./pack";

describe("gridBox", () => {
  it("names a box by inclusive grid corners and returns body units from the pivot", () => {
    const B = gridBox([17, 48], 5);
    expect(B(9, 0, 25, 47)).toEqual({ x: -40, y: -240, w: 85, h: 240 });
    expect(B(17, 47, 17, 47)).toEqual({ x: 0, y: -5, w: 5, h: 5 });
  });
});

describe("the standard graph", () => {
  it("has the five states over the five clips, a closed input set, and hurt/ko as the hit targets", () => {
    const f = { bdy: [] };
    const g = standardGraph({ idle: [f], walk: [f], attack: [f], hurt: [f], ko: [f] });
    expect(Object.keys(g.states)).toEqual(["idle", "walk", "attack", "hurt", "ko"]);
    expect(g.inputs).toEqual(["move", "stop", "attack"]);
    expect(g.onHit).toEqual({ light: "hurt", heavy: "ko" });
    expect(g.states.ko.next).toBeUndefined();
    expect(g.states.attack.next).toBe("idle");
  });
});

describe("buildMovesFile", () => {
  const robot = CHARACTERS.find((c) => c.id === "robot")!;
  const clips = robot.clips();
  const geo = frameGeometry(clips, 2, 4, robot.pixel!);
  const file = buildMovesFile("robot", "snes16", 2, geo, robot.moves!);
  it("converts every box and vector to frame pixels the way the manifest converts the hitbox, and keeps the graph", () => {
    const src = robot.moves!.states.idle.frames[0].bdy![0];
    const out = file.states.idle.frames[0].bdy![0];
    expect(out).toEqual({ x: geo.pivot.x + src.x * 2, y: geo.pivot.y + src.y * 2, w: src.w * 2, h: src.h * 2 });
    const hit = robot.moves!.states.attack.frames.find((f) => f.itr)!.itr![0];
    const hitOut = file.states.attack.frames.find((f) => f.itr)!.itr![0];
    expect(hitOut.knock).toEqual({ dx: hit.knock!.dx * 2, dy: hit.knock!.dy * 2 });
    expect(hitOut.damage).toBe(hit.damage);
    expect(Object.keys(file.states)).toEqual(Object.keys(robot.moves!.states));
    expect(file).toMatchObject({ character: "robot", style: "snes16", scale: 2, initial: "idle" });
  });
  it("carries only keys the schema allows", () => {
    const schema = JSON.parse(readFileSync(new URL("./moves.schema.json", import.meta.url), "utf8"));
    const allowedFrame = Object.keys(schema.$defs.frame.properties);
    for (const st of Object.values(file.states)) for (const f of st.frames) for (const k of Object.keys(f)) expect(allowedFrame).toContain(k);
    expect(Object.keys(file).sort()).toEqual(schema.required.slice().sort());
  });
});
