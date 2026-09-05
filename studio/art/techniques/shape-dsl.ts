// Shape DSL per frame: the scene-ops constructors, written by hand, one op
// list per pose. This is how the four static references were drawn.

import { bounds, place } from "../scene-ops";
import { robotOps } from "../characters/robot/static";
import type { Technique } from "./types";

export const shapeDsl: Technique = {
  id: "shape-dsl",
  name: "Shape DSL per frame",
  input: "rect / circle / ellipse / polygon op lists",
  costPerAnimation: "one op list per frame, by hand",
  summary: "Write each pose as a list of filled shapes in scene units. Resolution-independent, renders in every style, and reads like a drawing. The slime's clips are made this way because a blob has no bones. Animation costs a full list per frame, which is fine for four frames and painful for forty.",
  sample: () => {
    const ops = robotOps();
    const [x, y, w, h] = bounds(ops)!;
    return place(ops, -(x + w / 2), -(y + h));
  },
};
