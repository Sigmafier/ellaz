// The boss bar is one layout for every kind: centred on the view, filled in
// proportion to the boss's hp and never past its ends, with the name under it.

import { bossHudOps } from "./hud-boss";

const fills = (ops: ReturnType<typeof bossHudOps>) => ops.rects.filter((r) => r.color === "#e02e48");

describe("the boss bar", () => {
  it("is centred on the view and names the boss", () => {
    const ops = bossHudOps({ name: "TEDDY KING", hp: 50, maxHp: 100 }, { w: 640, h: 360 });
    const back = ops.rects[1];
    expect(back.x + back.w / 2).toBe(320);
    expect(ops.texts.map((t) => t.text)).toEqual(["TEDDY KING"]);
  });

  it("fills in proportion to hp (control: full, half and zero differ, and zero draws no fill)", () => {
    const at = (hp: number) => fills(bossHudOps({ name: "B", hp, maxHp: 100 }, { w: 640, h: 360 }));
    const full = at(100)[0].w, half = at(50)[0].w;
    expect(full).toBe(256);
    expect(half).toBe(128);
    expect(at(0)).toEqual([]);
  });

  it("never draws past its ends on an hp above max, and caps its width on a wide view", () => {
    const over = bossHudOps({ name: "B", hp: 500, maxHp: 100 }, { w: 640, h: 360 });
    expect(fills(over)[0].w).toBe(256);
    expect(bossHudOps({ name: "B", hp: 1, maxHp: 1 }, { w: 1200, h: 750 }).rects[1].w).toBe(360);
  });
});
