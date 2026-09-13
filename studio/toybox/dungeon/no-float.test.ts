// Every number in the dungeon state is an integer at every sampled tick, and
// the sources divide only through floorDiv, roll only through the rng, and
// name no trig.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gameDir, loadDungeonMode } from "../data/load";
import { compileDungeon } from "./compile";
import { createState } from "./room";
import { stepDungeon } from "./step";
import { ACT_INPUT_CLICK, ACT_INPUT_SWING, NO_DUNGEON_INPUT } from "./types";
import type { DungeonInput } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url));
const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));

const SCRIPT: Record<number, DungeonInput> = {
  5: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 1664, y: 2688 },
  200: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  240: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  280: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_SWING },
  400: { ...NO_DUNGEON_INPUT, act: ACT_INPUT_CLICK, x: 2432, y: 1920 },
};
const scriptAt = (tick: number): DungeonInput[] => [SCRIPT[tick] ?? (tick >= 300 && tick < 360 ? { ...NO_DUNGEON_INPUT, dx: 1, dy: 1 } : NO_DUNGEON_INPUT)];

function nonIntegers(o: unknown, path = "$"): string[] {
  if (typeof o === "number") return Number.isInteger(o) ? [] : [`${path}=${o}`];
  if (Array.isArray(o)) return o.flatMap((v, i) => nonIntegers(v, `${path}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => nonIntegers(v, `${path}.${k}`));
  return [];
}

describe("no float in the dungeon state", () => {
  it("compiled data is all integers", () => {
    expect(nonIntegers(data)).toEqual([]);
  });

  it("the state is all integers at every 50th tick and at the end, through walks, strikes, bites, drops and floats", () => {
    let s = createState(data), floats = 0, drops = 0;
    for (let t = 0; t < 900; t++) {
      s = stepDungeon(s, scriptAt(t), data);
      floats += s.floats.length; drops += s.drops.length;
      if (t % 50 === 0 || t === 899) expect(nonIntegers(s)).toEqual([]);
    }
    expect(floats).toBeGreaterThan(0);
    expect(drops).toBeGreaterThan(0);
  });

  it("the control: the walker sees a planted float", () => {
    const s = JSON.parse(JSON.stringify(createState(data)));
    s.actors[1].x = 0.5;
    expect(nonIntegers(s)).toEqual(["$.actors[1].x=0.5"]);
  });
});

describe("the sources", () => {
  const sim = () => readdirSync(HERE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "view.ts" && f !== "types.ts");
  const strip = (text: string): string => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/"[^"\n]*"/g, '""').replace(/`[^`]*`/g, "``");

  it("has sources to check", () => {
    expect(sim().length).toBeGreaterThan(6);
  });

  it("divide only through floorDiv, roll only through the rng, and name no trig (view.ts may: it is pixels, never hashed)", () => {
    const bad: string[] = [];
    for (const f of sim()) {
      const text = strip(readFileSync(join(HERE, f), "utf8"));
      // a bare `/` that is not `/=` in a regex-free source: the sim divides through floorDiv alone
      if (/[^/*]\/[^/*=]/.test(text.replace(/\bfloorDiv\b/g, ""))) bad.push(`${f}: a bare /`);
      for (const re of [/Math\.random/, /Math\.(sin|cos|tan|atan2|hypot|exp)\b/, /\bparseFloat\b/]) if (re.test(text)) bad.push(`${f}: ${re.source}`);
    }
    expect(bad).toEqual([]);
  });

  it("the control: the same scan sees a planted division, a planted trig call and a planted random", () => {
    const planted = strip(`const a = x / 2; const b = Math.sin(1); const c = Math.random();`);
    expect(/[^/*]\/[^/*=]/.test(planted)).toBe(true);
    expect(/Math\.(sin|cos|tan|atan2|hypot|exp)\b/.test(planted)).toBe(true);
    expect(/Math\.random/.test(planted)).toBe(true);
    expect(/[^/*]\/[^/*=]/.test(strip("const d = floorDiv(a, b); // x / y"))).toBe(false);
  });
});
