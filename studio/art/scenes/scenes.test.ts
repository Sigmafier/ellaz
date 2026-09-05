import { describe, expect, it } from "vitest";
import { bounds, validate } from "../scene-ops";
import { SCENES, SCENE_IDS } from "./index";

describe("reference scenes", () => {
  it("there are three, each keyed by its own id", () => {
    expect(SCENE_IDS.sort()).toEqual(["brawl-room", "ember-field", "reference"]);
    for (const id of SCENE_IDS) expect(SCENES[id].id).toBe(id);
  });

  for (const id of SCENE_IDS) {
    const scene = SCENES[id];
    it(`${id} validates`, () => expect(validate(scene)).toEqual([]));
    it(`${id} has both a background and a foreground`, () => {
      expect(scene.ops.some((o) => !o.fg)).toBe(true);
      expect(scene.ops.some((o) => o.fg)).toBe(true);
    });
    it(`${id}'s foreground sits inside the frame`, () => {
      const [x, y, w, h] = bounds(scene.ops.filter((o) => o.fg))!;
      // the raised sword and antenna may poke above y=0 by a little, never off the sides
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(scene.w);
      expect(y).toBeGreaterThan(-20);
      expect(y + h).toBeLessThanOrEqual(scene.h);
    });
  }
});
