// The turn HUD's layout, against a real view of the meadow: the party panel
// has one row per hero, the banner text follows the code, the strike label
// appears only when a foe will strike, and the log's words come from the
// codes and the names.

import { gameDir, loadTurnMode } from "../../data/load";
import { createState } from "../../turn/battle";
import { compileTurn } from "../../turn/compile";
import { stepTurn } from "../../turn/step";
import { viewTurn } from "../../turn/view";
import { ACT_INPUT_PICK, ACT_INPUT_WAIT } from "../../turn/types";
import type { TurnHud } from "../../sim/view";
import { LAYOUT, logText, turnHudOps } from "./hud-turn";

const data = compileTurn(loadTurnMode("meadow", gameDir("ember")));
const VIEW = data.view;
const hudOf = (s: ReturnType<typeof createState>): TurnHud => viewTurn(s, s, 256, data).hud.turn!;

describe("turnHudOps", () => {
  const s0 = createState(data);
  const t0 = hudOf(s0);

  it("lays out one party row per hero with a name, a status, a bar and hp/max, under TURN 1", () => {
    const ops = turnHudOps(t0, VIEW);
    expect(t0.party.map((p) => p.name)).toEqual(["KNIGHT", "WIZARD"]);
    const words = ops.texts.map((t) => t.text);
    expect(words).toContain("TURN 1");
    expect(words).toContain("KNIGHT");
    expect(words).toContain("WIZARD");
    expect(words.filter((w) => w === "READY").length).toBe(2);
    expect(words).toContain("30/30");
    expect(words).toContain("18/18");
    // the panel is tall enough for two rows
    const panel = ops.rects.find((r) => r.x === LAYOUT.PANEL_X && r.y === LAYOUT.PANEL_Y)!;
    expect(panel.h).toBe(LAYOUT.PANEL_HEAD + LAYOUT.ROW_H * 2);
  });

  it("shows YOUR TURN while the first banner runs, then no banner, and SPACE: END TURN throughout the player's phase", () => {
    expect(turnHudOps(t0, VIEW).texts.map((t) => t.text)).toContain("YOUR TURN");
    let s = s0;
    for (let i = 0; i < data.rules.firstBannerTicks; i++) s = stepTurn(s, [], data);
    const later = turnHudOps(hudOf(s), VIEW).texts.map((t) => t.text);
    expect(later).not.toContain("YOUR TURN");
    expect(later).toContain("SPACE: END TURN");
  });

  it("a strike label appears over the hero a foe will strike, one per striking foe: the near bat's on the knight", () => {
    expect(t0.strikeLabels.length).toBe(1);
    expect(turnHudOps(t0, VIEW).texts.map((t) => t.text)).toContain("-3");
    // a state where nothing strikes: no label
    const none: TurnHud = { ...t0, strikeLabels: [] };
    expect(turnHudOps(none, VIEW).texts.map((t) => t.text)).not.toContain("-3");
  });

  it("an hp bar over every standing unit, green for the party and red for the foes; a fallen unit has none", () => {
    expect(t0.bars.length).toBe(5);
    const ops = turnHudOps(t0, VIEW);
    expect(ops.rects.filter((r) => r.w === LAYOUT.HEAD_BAR_W && r.color === "#2ec08a").length).toBe(2);
    expect(ops.rects.filter((r) => r.w === LAYOUT.HEAD_BAR_W && r.color === "#ff4d5e").length).toBe(3);
    const s = createState(data);
    s.units[2].hp = 0;
    expect(hudOf(s).bars.length).toBe(4);
  });

  it("the enemies' phase shows ENEMY TURN and no SPACE hint; the end shows VICTORY or DEFEAT", () => {
    const s = stepTurn(s0, [{ c: 0, r: 0, act: ACT_INPUT_WAIT }], data);
    const words = turnHudOps(hudOf(s), VIEW).texts.map((t) => t.text);
    expect(words).toContain("ENEMY TURN");
    expect(words).not.toContain("SPACE: END TURN");
    const won: TurnHud = { ...t0, phase: 3, banner: 3, bannerT: 0 };
    expect(turnHudOps(won, VIEW).texts.map((t) => t.text)).toContain("VICTORY");
    const lost: TurnHud = { ...t0, phase: 4, banner: 4, bannerT: 0 };
    const defeat = turnHudOps(lost, VIEW).texts.find((t) => t.text === "DEFEAT")!;
    expect(defeat.color).toBe("#ff4d5e");
  });

  it("the log's words follow the code and the names, and a pick writes the hero's line", () => {
    const names = data.units.map((u) => u.name);
    expect(logText({ kind: 0, a: -1, b: -1, n: 0 }, names)).toBe("CLICK A HERO");
    expect(logText({ kind: 5, a: 0, b: 2, n: 7 }, names)).toBe("KNIGHT HITS SLIME FOR 7");
    expect(logText({ kind: 6, a: 4, b: 1, n: 3 }, names)).toBe("BAT HITS WIZARD FOR 3 - DOWN");
    const picked = stepTurn(s0, [{ c: 1, r: 2, act: ACT_INPUT_PICK }], data);
    expect(turnHudOps(hudOf(picked), VIEW).texts.map((t) => t.text)).toContain("KNIGHT: BLUE TILES TO MOVE - RED FOES TO STRIKE");
    expect(turnHudOps(hudOf(picked), VIEW).texts.map((t) => t.text)).toContain("ACTIVE");
  });

  it("every rect and text run sits inside the view", () => {
    const ops = turnHudOps(t0, VIEW);
    for (const r of ops.rects) expect({ r, ok: r.x >= 0 && r.y >= 0 && r.x + r.w <= VIEW.w && r.y + r.h <= VIEW.h }).toMatchObject({ ok: true });
    for (const t of ops.texts) expect({ t, ok: t.x >= 0 && t.y >= 0 && t.x < VIEW.w && t.y < VIEW.h }).toMatchObject({ ok: true });
  });
});
