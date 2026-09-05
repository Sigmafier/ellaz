// The one place a canvas is created. Renderers call `mk(w, h)` and never
// touch `document`, so the only thing that changes when a native canvas
// (a future Node fast path) arrives is the factory installed here.
//
// In node with no factory installed, `mk` throws a sentence rather than
// returning undefined - the tests that need a canvas run in headless
// Chromium through the export runner, and a pure-logic test that reaches
// this line has imported the wrong module.

export type Canvas2D = HTMLCanvasElement;
export type Ctx2D = CanvasRenderingContext2D;

type Factory = (w: number, h: number) => Canvas2D;

let factory: Factory | null = null;

export function setCanvasFactory(f: Factory | null): void {
  factory = f;
}

function defaultFactory(w: number, h: number): Canvas2D {
  if (typeof document === "undefined") {
    throw new Error("studio/art/canvas: no canvas factory installed and no `document` - render in a browser (export runner) or call setCanvasFactory()");
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** A canvas and its 2D context, nearest-neighbour scaling on. */
export function mk(w: number, h: number): [Canvas2D, Ctx2D] {
  const c = (factory ?? defaultFactory)(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  const x = c.getContext("2d");
  if (!x) throw new Error("studio/art/canvas: getContext('2d') returned null");
  x.imageSmoothingEnabled = false;
  return [c, x];
}
