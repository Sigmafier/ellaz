// A one-cell outline around everything opaque on a layer, drawn onto `dst`
// BEFORE the layer itself so it reads as an edge, not a smear.

import { mk, type Canvas2D, type Ctx2D } from "../canvas";

const OUTLINE_INK = "#1a1230";

/**
 * Draw `layer` shifted one cell in four directions, tint the union with the
 * outline ink, and composite it onto `dst`. Works at any resolution: at a
 * low-res pixel stage one "cell" is one pixel, which is exactly the classic
 * sprite outline.
 */
export function outlineOnto(dst: Ctx2D, layer: Canvas2D, ink = OUTLINE_INK, thickness = 1): void {
  const [ol, ox] = mk(layer.width, layer.height);
  for (const [dx, dy] of [[thickness, 0], [-thickness, 0], [0, thickness], [0, -thickness]]) {
    ox.drawImage(layer, dx, dy);
  }
  ox.globalCompositeOperation = "source-in";
  ox.fillStyle = ink;
  ox.fillRect(0, 0, layer.width, layer.height);
  dst.drawImage(ol, 0, 0);
}
