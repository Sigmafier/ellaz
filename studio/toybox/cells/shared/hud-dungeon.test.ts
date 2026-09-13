// The dungeon HUD's layout, against a real view of the crypt: two orbs whose
// liquid follows hp and mp, the coin plate, no banner in the fight, THE DOOR
// OPENS while its ticks run, VICTORY and DEFEAT held with the restart hint,
// and a bar only over a hurt foe.

import { gameDir, loadDungeonMode } from "../../data/load";
import { compileDungeon } from "../../dungeon/compile";
import { hurt } from "../../dungeon/hits";
import { createState } from "../../dungeon/room";
import { stepDungeon } from "../../dungeon/step";
import { BANNER_DEFEAT, BANNER_DOOR, BANNER_VICTORY, NO_DUNGEON_INPUT, PHASE_DOOR, PHASE_LOST, PHASE_WON, ST_GONE } from "../../dungeon/types";
import { viewDungeon } from "../../dungeon/view";
import type { DungeonHud } from "../../sim/view";
import { LAYOUT, dungeonHudOps } from "./hud-dungeon";

const data = compileDungeon(loadDungeonMode("crypt", gameDir("hollow")));
const VIEW = data.view;
const hudOf = (s: ReturnType<typeof createState>): DungeonHud => viewDungeon(s, s, 256, data).hud.dungeon!;
const liquid = (ops: ReturnType<typeof dungeonHudOps>, color: string, cx: number): number => ops.rects.filter((r) => r.color === color && r.x <= cx && r.x + r.w >= cx).length;

describe("dungeonHudOps", () => {
  const s0 = createState(data);
  const t0 = hudOf(s0);
  const HP_CX = LAYOUT.ORB_INSET_X + LAYOUT.ORB_R, MP_CX = VIEW.w - LAYOUT.ORB_INSET_X - LAYOUT.ORB_R;

  it("the model at the start: full orbs, no coins, no banner, no bars", () => {
    expect(t0).toMatchObject({ hp: 100, maxHp: 100, mp: 60, maxMp: 60, coins: 0, phase: 0, banner: 0, bars: [], floats: [] });
  });

  it("lays out a full red orb bottom-left and a full blue orb bottom-right, and the coin plate top-left reading 0", () => {
    const ops = dungeonHudOps(t0, VIEW);
    expect(liquid(ops, LAYOUT.HP, HP_CX)).toBeGreaterThan(20);
    expect(liquid(ops, LAYOUT.MP, MP_CX)).toBeGreaterThan(20);
    expect(ops.texts.map((t) => t.text)).toContain("0");
    const coin = ops.texts.find((t) => t.text === "0")!;
    expect(coin.x).toBeLessThan(LAYOUT.PLATE_X + LAYOUT.PLATE_W);
    expect(coin.y).toBeLessThan(LAYOUT.PLATE_Y + LAYOUT.PLATE_H);
    expect(ops.texts.map((t) => t.text)).not.toContain("THE DOOR OPENS");
    expect(ops.rects.every((r) => /^#[0-9a-f]{6}$/.test(r.color))).toBe(true);
  });

  it("the liquid falls with hp: half hp draws fewer red rows than full, and none at 0", () => {
    const half = { ...t0, hp: 50 }, empty = { ...t0, hp: 0 };
    const full = liquid(dungeonHudOps(t0, VIEW), LAYOUT.HP, HP_CX);
    expect(liquid(dungeonHudOps(half, VIEW), LAYOUT.HP, HP_CX)).toBeLessThan(full);
    expect(liquid(dungeonHudOps(empty, VIEW), LAYOUT.HP, HP_CX)).toBe(0);
    expect(liquid(dungeonHudOps({ ...t0, mp: 0 }, VIEW), LAYOUT.MP, MP_CX)).toBe(0);
  });

  it("the banners: THE DOOR OPENS while its ticks run and gone after; VICTORY and DEFEAT held with R RESTARTS", () => {
    const door = dungeonHudOps({ ...t0, phase: PHASE_DOOR, banner: BANNER_DOOR, bannerT: 30 }, VIEW).texts.map((t) => t.text);
    expect(door).toContain("THE DOOR OPENS");
    expect(door).not.toContain("R RESTARTS");
    const after = dungeonHudOps({ ...t0, phase: PHASE_DOOR, banner: BANNER_DOOR, bannerT: 0 }, VIEW).texts.map((t) => t.text);
    expect(after).not.toContain("THE DOOR OPENS");
    const won = dungeonHudOps({ ...t0, phase: PHASE_WON, banner: BANNER_VICTORY, bannerT: 0 }, VIEW).texts.map((t) => t.text);
    expect(won).toContain("VICTORY");
    expect(won).toContain("R RESTARTS");
    const lost = dungeonHudOps({ ...t0, phase: PHASE_LOST, banner: BANNER_DEFEAT, bannerT: 0 }, VIEW);
    expect(lost.texts.find((t) => t.text === "DEFEAT")!.color).toBe("#ff4d5e");
  });

  it("a bar appears over a hurt foe only, and a float over a hit", () => {
    const s = createState(data);
    hurt(s, data, 0, 3, 5, s.actors[0].x, s.actors[0].y);
    const h = hudOf(s);
    expect(h.bars.length).toBe(1);
    expect(h.bars[0]).toMatchObject({ hp: 25, maxHp: 30, bar: data.actors[1].bar });
    expect(h.floats.length).toBe(1);
    const ops = dungeonHudOps(h, VIEW);
    expect(ops.texts.map((t) => t.text)).toContain("-5");
    expect(ops.rects.some((r) => r.w === LAYOUT.HEAD_BAR_W)).toBe(true);
    // a foe that is gone carries no bar
    s.actors[3].state = ST_GONE;
    expect(hudOf(s).bars).toEqual([]);
  });

  it("the coins count the purse", () => {
    let s = createState(data);
    s.drops.push({ x: s.actors[0].x, y: s.actors[0].y, value: 3, t: data.rules.pickupDelayTicks });
    s = stepDungeon(s, [NO_DUNGEON_INPUT], data);
    expect(hudOf(s).coins).toBe(3);
    expect(dungeonHudOps(hudOf(s), VIEW).texts.map((t) => t.text)).toContain("3");
  });
});
