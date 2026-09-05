// Parametric generator: knobs in, rig out, clips shared. The robot here is
// built from the same buildBiped that made the teddy - a rect head, a rect
// torso, no ears, robot colours - to show what the knobs can and cannot do.

import { bakePose } from "../rig/rig";
import { buildBiped } from "../characters/parametric";
import { ROBOT_COLOURS as k } from "../characters/robot/static";
import type { Technique } from "./types";

export const parametricRobot = buildBiped({
  id: "robotp",
  height: 64,
  heads: 3.2,
  head: "rect",
  torso: "rect",
  girth: 0.42,
  ears: false,
  colours: { body: k.shell, belly: k.chest, dark: k.shellDark, eye: k.eye, accent: k.visor },
});

export const parametric: Technique = {
  id: "parametric",
  name: "Parametric character generator",
  input: "a dozen knobs: height, heads, shapes, girth, colours",
  costPerAnimation: "zero - every generated character shares the standard clips",
  summary: "One generator builds a rigged biped from knobs, and every rig it builds carries the same clips. Ten enemy variants cost ten lines. The price is sameness: a generated robot is a bear-shaped robot, and anything with real character detail (a visor, a sword) still wants the parts rig.",
  sample: () => bakePose(parametricRobot, {}),
};
