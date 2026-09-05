// The teddy is not hand-rigged: it is the parametric biped with teddy knobs.
// Change a knob, get a different bear; the five clips come for free.

import { buildBiped } from "../parametric";
import { TEDDY_COLOURS as k } from "./static";

export const teddyRig = buildBiped({
  id: "teddy",
  height: 62,
  heads: 3,
  head: "circle",
  torso: "ellipse",
  girth: 0.5,
  ears: true,
  face: "angry",
  colours: { body: k.fur, belly: k.furLight, dark: k.furDark, eye: k.eye, accent: "#ff4d8d" },
});
