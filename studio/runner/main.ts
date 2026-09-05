// The browser-side half of every headless job. Built by vite into ONE
// script (dist-runner/studio.iife.js) that a Playwright page can load with
// `addScriptTag` - no server, no port, no module CORS - and drive through
// `window.studio`.
//
// Everything here is a thin door onto art/: the registry, the scenes, and
// "render this style on this scene and hand me the PNG bytes". Nothing here
// decides anything; the node side does.

import { STYLES, styleById } from "../art/styles/registry";
import { SCENES } from "../art/scenes";
import { validate, type Scene } from "../art/scene-ops";

export interface RenderResult {
  styleId: string;
  sceneId: string;
  w: number;
  h: number;
  /** data:image/png;base64,... */
  png: string;
  /** count of non-transparent pixels sampled on a 16x16 grid, a cheap "did it draw" */
  inkSamples: number;
}

function sampleInk(c: HTMLCanvasElement): number {
  const x = c.getContext("2d")!;
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let j = 0; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      const px = Math.floor(((i + 0.5) / 16) * c.width);
      const py = Math.floor(((j + 0.5) / 16) * c.height);
      const k = (py * c.width + px) * 4;
      // "ink" = not the pure white the canvas starts as, and opaque
      if (d[k + 3] > 0 && !(d[k] === 255 && d[k + 1] === 255 && d[k + 2] === 255)) n++;
    }
  }
  return n;
}

function renderOne(styleId: string, scene: Scene): RenderResult {
  const style = styleById(styleId);
  if (!style) throw new Error(`no style "${styleId}"`);
  const problems = validate(scene);
  if (problems.length) throw new Error(`scene ${scene.id} invalid: ${problems.join("; ")}`);
  const c = style.render(scene);
  return { styleId, sceneId: scene.id, w: c.width, h: c.height, png: c.toDataURL("image/png"), inkSamples: sampleInk(c) };
}

const api = {
  styles: STYLES.map(({ id, name, tier, family, tagline }) => ({ id, name, tier, family, tagline })),
  sceneIds: Object.keys(SCENES),
  render(styleId: string, sceneId: string): RenderResult {
    const scene = SCENES[sceneId];
    if (!scene) throw new Error(`no scene "${sceneId}"`);
    return renderOne(styleId, scene);
  },
  /** Render an ad-hoc scene the node side hands over (used by controls and, later, sprites). */
  renderScene(styleId: string, scene: Scene): RenderResult {
    return renderOne(styleId, scene);
  },
};

declare global {
  interface Window { studio: typeof api }
}
window.studio = api;
