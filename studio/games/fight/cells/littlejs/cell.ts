// The LittleJS 1.18 arm. Same look as the canvas bar, same draw scale, same
// HUD layout, same box colours - what differs is WHERE the pixels land.
//
// LittleJS is a HYBRID renderer and it ships TWO canvases: `glCanvas` (WebGL2,
// the batched sprite/primitive path) with `mainCanvas` (Canvas2D) layered on
// top of it for "text, UI, and custom drawing" - the engine's own words. So
// this cell puts the arena, the shadows, the fighters and every particle
// through the engine's GL batch, and the HUD and the box overlay onto
// `mainContext`, which is the layer the engine exists to give you for exactly
// that. Both canvases are 640x360 and both are reported in the write-up.
//
// GL is ON, deliberately: pixi8 and phaser4 are WebGL arms and an arm that
// quietly fell back to 2D would be compared against them on a different
// pipeline. `glSetAntialias(false)` before init, so SAMPLES reads 0 like the
// other two and a rect edge is a hard pixel, not a blend.
//
// The engine owns a requestAnimationFrame loop the contract has no method for,
// so `setEngineManualStep(true)` turns it off and `endFrame` calls
// `engineStep(1)`. Drawn frames then equal harness frames - the same decision
// the pixi and phaser arms made for the same reason.
//
// The WORLD<->VIEW mapping, established once and proved with ?boxes=1:
// LittleJS draws in world units with y UP and the camera at the canvas centre.
// With `setCameraScale(1)` and the camera at (320, 180) a world point (wx, wy)
// lands at framebuffer (wx, 360 - wy), so view (vx, vy) is world (vx, 360-vy)
// and one view pixel is one world unit. The screen shake rides the CAMERA
// (`setCameraPos(320 - ox, 180 + oy)`) rather than every coordinate, which is
// what a camera is for - and it is also why the HUD, which must NOT shake,
// lives on the un-camera'd 2D overlay.
//
// One draw scale, 0.2, for the reason the other arms state: the arena file
// says scale {num:1, den:5} and the sheets are drawn at that art scale. A
// constant, so a cell cannot quietly disagree with the arena it draws into.

import {
  Color, TileInfo, drawCircle, drawRect, drawTile, engineInit, engineStep, engineVersion,
  glCanvas, glContext, glSetAntialias, mainCanvas, mainContext, setCameraPos, setCameraScale,
  setCanvasClearColor, setCanvasFixedSize, setCanvasPixelated, setDebugWatermark,
  setEngineManualStep, setShowSplashScreen, setSoundEnable, textureInfos, vec2,
} from "littlejsengine";
import type { Atlas, Manifest, Point } from "../../../../adapters/manifest";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";

const DRAW_SCALE = 1 / 5;
const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const SHADOW = "#28140a";
const SHADOW_ALPHA = 0.28;
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

// The demo brawler's 5x7 bitmap font, the same table the canvas arm carries.
// Duplicated rather than imported for the reason the pixi arm logged: a cell
// must ship beside its engine alone, and importing a sibling arm's module puts
// a shared chunk in BOTH arms' byte report, moving a number the tournament reads.
const GLYPHS: Record<string, string> = {
  " ": "00000000000000", "0": "0E11131519110E", "1": "040C040404040E", "2": "0E11010204081F",
  "3": "1F02040201110E", "4": "02060A121F0202", "5": "1F101E0101110E", "6": "0608101E11110E",
  "7": "1F010204080808", "8": "0E11110E11110E", "9": "0E11110F01020C", A: "0E1111111F1111",
  B: "1E11111E11111E", C: "0E11101010110E", D: "1C12111111121C", E: "1F10101E10101F",
  F: "1F10101E101010", G: "0E11101711110F", H: "1111111F111111", I: "0E04040404040E",
  J: "0702020202120C", K: "11121418141211", L: "1010101010101F", M: "111B1515111111",
  N: "11111915131111", O: "0E11111111110E", P: "1E11111E101010", Q: "0E11111115120D",
  R: "1E11111E141211", S: "0F10100E01011E", T: "1F040404040404", U: "1111111111110E",
  V: "11111111110A04", W: "1111111515150A", X: "11110A040A1111", Y: "1111110A040404",
  Z: "1F01020408101F", "+": "0004041F040400", "-": "0000001F000000", ">": "08040201020408",
  "<": "02040810080402", ":": "000C0C000C0C00", "!": "04040404040004", ".": "00000000000C0C",
  "/": "00010204081000", x: "00110A040A1100",
};
const ADVANCE = 6;
const ROWS = 7;

/** width in view pixels of `str` at `size` (the trailing inter-glyph gap is not counted) */
function textWidth(str: string, size = 1): number {
  return Math.max(0, str.length * ADVANCE - 1) * size;
}

/** the glyph rows painted straight onto the 2D overlay, one fillRect per lit pixel */
function paintText(g: CanvasRenderingContext2D, str: string, x: number, y: number, size: number, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const glyph = GLYPHS[str[i]] ?? GLYPHS[str[i].toUpperCase()] ?? GLYPHS[" "];
    for (let r = 0; r < ROWS; r++) {
      const bits = parseInt(glyph.substr(r * 2, 2), 16);
      for (let b = 0; b < 5; b++) {
        if (bits & (16 >> b)) g.fillRect(x + (i * ADVANCE + b) * size, y + r * size, size, size);
      }
    }
  }
}

interface Sheet { atlas: Atlas; pivot: Point; tiles: Map<string, TileInfo> }

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`littlejs cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

const EMPTY_ARENA: readonly ArenaDrawOp[] = [];
const EMPTY_FX: readonly FxOp[] = [];
const EMPTY_BOXES: readonly BoxOp[] = [];

export class LittleJsCell implements Cell {
  readonly id = "littlejs";
  private root = document.createElement("div");
  private sheets = new Map<string, Sheet>();
  private view = { w: 640, h: 360 };
  private drawn = 0;

  // the recorded plan: the harness hands over fresh arrays every frame, so this
  // KEEPS them rather than copying - a copy would be work no other arm is doing
  private arena: readonly ArenaDrawOp[] = EMPTY_ARENA;
  private shadows: ShadowOp[] = [];
  private sprites: SpriteOp[] = [];
  private fx: readonly FxOp[] = EMPTY_FX;
  private boxes: readonly BoxOp[] = EMPTY_BOXES;
  private hud: HudModel | null = null;
  private ox = 0;
  private oy = 0;

  private colors = new Map<string, Color>();
  private scratch = new Color();
  private clear = new Color(0, 0, 0, 0);

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    const loaded = await Promise.all(sets.map(async (set) => ({
      set,
      atlas: await json<Atlas>(set.atlas),
      manifest: await json<Manifest>(set.manifest),
    })));
    setShowSplashScreen(false);
    setCanvasFixedSize(vec2(this.view.w, this.view.h));
    setCanvasPixelated(true);
    setCanvasClearColor(this.colorOf(CREAM));
    setCameraScale(1);
    setCameraPos(vec2(this.view.w / 2, this.view.h / 2));
    glSetAntialias(false);       // the other GL arms report SAMPLES 0; so must this one
    setEngineManualStep(true);   // the contract has no method for an engine-owned loop
    setDebugWatermark(false);    // the dev build paints an FPS line over the top-right
    setSoundEnable(false);       // an AudioContext is work the plain-canvas bar is not doing
    await engineInit(
      () => {}, () => {}, () => {},
      () => this.paintWorld(),
      () => this.paintOverlay(),
      loaded.map((l) => l.set.png),
      this.root,
    );
    loaded.forEach((l, i) => this.adopt(l.set, l.atlas, l.manifest, i));
  }

  /**
   * Bind one sheet to the texture the engine loaded at `index`, and check that
   * it IS that sheet: LittleJS's loader resolves on `image.onerror` as well as
   * `onload`, so a 404 becomes a 1x1 white texture and every fighter draws as a
   * white slab with nothing raised anywhere.
   */
  private adopt(set: SpriteSetRef, atlas: Atlas, manifest: Manifest, index: number): void {
    const info = textureInfos[index];
    const want = atlas.meta.size;
    if (!info || info.size.x !== want.w || info.size.y !== want.h) {
      const got = info ? `${info.size.x}x${info.size.y}` : "missing";
      throw new Error(`littlejs cell: texture ${index} for "${set.name}" is ${got}, the atlas says ${want.w}x${want.h} (${set.png})`);
    }
    const tiles = new Map<string, TileInfo>();
    for (const [name, f] of Object.entries(atlas.frames)) {
      tiles.set(name, new TileInfo(vec2(f.frame.x, f.frame.y), vec2(f.frame.w, f.frame.h), info, 0, 0));
    }
    // the MANIFEST's pivot, in view pixels - not the atlas frame's own `pivot`
    // fraction. Both are present and they agree today, which is exactly why a
    // drift would be silent; the bar reads the manifest, so this reads it too.
    const pivot = { x: manifest.pivot.x * DRAW_SCALE, y: manifest.pivot.y * DRAW_SCALE };
    this.sheets.set(set.name, { atlas, pivot, tiles });
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    this.view = view;
    // engineInit REPLACED this element's cssText with its own; everything here
    // has to be written after it, and `position:relative` is load-bearing - the
    // engine's canvases are absolutely positioned and centre on the nearest
    // positioned ancestor, which would otherwise be the viewport.
    this.root.style.cssText = "position:relative;margin:0 auto;overflow:hidden;background:#fff4dc;line-height:0";
    host.appendChild(this.root);
    const fit = (): void => {
      // the bar's integer upscale, applied to the WRAPPER: the engine sizes its
      // canvases to 100% of it every frame, so this is the one place to say it
      const k = Math.max(1, Math.floor(Math.min(window.innerWidth / view.w, window.innerHeight / view.h)));
      this.root.style.width = `${view.w * k}px`;
      this.root.style.height = `${view.h * k}px`;
    };
    fit();
    window.addEventListener("resize", fit);
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  private colorOf(hex: string, alpha = 1): Color {
    const key = alpha === 1 ? hex : `${hex}|${alpha}`;
    let c = this.colors.get(key);
    if (!c) {
      c = new Color().setHex(hex);
      c.a = alpha;
      this.colors.set(key, c);
    }
    return c;
  }

  /** a view-space rect drawn as a world quad: y flips, the centre is the anchor */
  private rect(x: number, y: number, w: number, h: number, color: Color): void {
    drawRect(vec2(x + w / 2, this.view.h - (y + h / 2)), vec2(w, h), color);
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    this.ox = Math.round(shakeX - camX);
    this.oy = Math.round(shakeY);
    setCameraPos(vec2(this.view.w / 2 - this.ox, this.view.h / 2 + this.oy));
    this.arena = EMPTY_ARENA;
    this.shadows.length = 0;
    this.sprites.length = 0;
    this.fx = EMPTY_FX;
    this.boxes = EMPTY_BOXES;
    this.hud = null;
  }

  drawArena(ops: readonly ArenaDrawOp[]): void { this.arena = ops; }
  drawShadow(op: ShadowOp): void { this.shadows.push(op); }
  drawFx(ops: readonly FxOp[]): void { this.fx = ops; }
  drawHud(model: HudModel): void { this.hud = model; }
  drawBoxes(boxes: readonly BoxOp[]): void { this.boxes = boxes; }

  drawSprite(op: SpriteOp): void {
    const sheet = this.sheets.get(op.set);
    if (!sheet) throw new Error(`littlejs cell: no sprite set "${op.set}"`);
    if (!sheet.tiles.has(op.frame)) throw new Error(`littlejs cell: atlas has no frame "${op.frame}"`);
    this.sprites.push(op);
    this.drawn += 1;
  }

  /** the ONE paint: the engine's own loop is off, so drawn frames == harness frames */
  endFrame(): void {
    engineStep(1);
  }

  // ---- gameRender: the arena, the shadows, the fighters, the particles -------

  private paintWorld(): void {
    for (const op of this.arena) this.rect(op.x, op.y, op.w, op.h, this.colorOf(op.color));
    for (const op of this.shadows) this.paintShadow(op);
    for (const op of this.sprites) this.paintSprite(op);
    for (const op of this.fx) this.paintFx(op);
  }

  /** a pixel ellipse: rows of rect, so it lands on the same grid as the sprites */
  private paintShadow(op: ShadowOp): void {
    const color = this.colorOf(SHADOW, SHADOW_ALPHA);
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = Math.round(op.x);
    const cy = Math.round(op.y);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) this.rect(cx - hw, cy + dy, hw * 2, 1, color);
    }
  }

  /**
   * `drawTile` anchors a tile by its CENTRE, and the contract hands over the
   * point the PIVOT (the feet) must land on - so the centre is the pivot plus
   * half the drawn frame, and the flip mirrors that offset about the pivot
   * COLUMN rather than about the frame's middle. Both sheets happen to have
   * pivot.x at the frame's centre, so the two are identical today and would
   * part company on the first character whose feet are off-centre.
   */
  private paintSprite(op: SpriteOp): void {
    const sheet = this.sheets.get(op.set) as Sheet;
    const tile = sheet.tiles.get(op.frame) as TileInfo;
    const w = tile.size.x * DRAW_SCALE;
    const h = tile.size.y * DRAW_SCALE;
    const dx = w / 2 - sheet.pivot.x;
    const cx = op.x + (op.flip ? -dx : dx);
    const cy = op.y + h / 2 - sheet.pivot.y;
    drawTile(vec2(cx, this.view.h - cy), vec2(w, h), tile, undefined, 0, op.flip);
  }

  private paintFx(op: FxOp): void {
    const alpha = Math.max(0, Math.min(1, op.alpha));
    const color = this.scratch.setHex(op.color);
    color.a = alpha;
    if (op.kind === "dot") drawCircle(vec2(op.x, this.view.h - op.y), Math.max(0.5, op.r) * 2, color);
    else if (op.kind === "star") this.paintStar(op, color);
    else drawCircle(vec2(op.x, this.view.h - op.y), Math.max(0.5, op.r) * 2, this.clear, 1, color);
  }

  private paintStar(op: FxOp, color: Color): void {
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    const d = Math.max(1, Math.round(r / 2));
    this.rect(x - r, y, r * 2 + 1, 1, color);
    this.rect(x, y - r, 1, r * 2 + 1, color);
    this.rect(x - d, y - d, 1, 1, color);
    this.rect(x + d, y - d, 1, 1, color);
    this.rect(x - d, y + d, 1, 1, color);
    this.rect(x + d, y + d, 1, 1, color);
  }

  // ---- gameRenderPost: the HUD and the boxes, on the engine's 2D overlay -----

  private paintOverlay(): void {
    if (this.hud) this.paintHud(this.hud, mainContext);
    if (this.boxes.length) this.paintBoxes(mainContext);
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const c = BAR[side % BAR.length];
    g.fillStyle = INK;
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = PANEL;
    g.fillRect(x, y, w, h);
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      g.fillStyle = c.fill;
      g.fillRect(sx, y, n, h);
      g.fillStyle = c.light;
      g.fillRect(sx, y, n, 2);
    }
    g.fillStyle = "rgba(26,18,48,0.25)";
    for (let i = 1; i < 10; i++) g.fillRect(x + Math.round((w * i) / 10), y + 2, 1, h - 2);
  }

  private paintHud(model: HudModel, g: CanvasRenderingContext2D): void {
    const w = 180;
    const h = 12;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - w : 12;
      this.hpBar(g, x, 14, w, h, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      const tx = rtl ? x + w - textWidth(name, 1) : x;
      paintText(g, name, tx, 30, 1, INK);
    });
    if (model.phase >= 2) this.paintKo(model, g);
  }

  private paintKo(model: HudModel, g: CanvasRenderingContext2D): void {
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    g.fillStyle = INK;
    g.fillRect(x - 6, y - 5, textWidth(line, scale) + 12, 7 * scale + 10);
    g.fillStyle = CREAM;
    g.fillRect(x - 4, y - 3, textWidth(line, scale) + 8, 7 * scale + 6);
    paintText(g, line, x, y, scale, INK);
  }

  /**
   * The overlay is un-camera'd, so the boxes - which DO shake, while the HUD
   * does not - carry the shake themselves. The +0.5 is the canvas arm's, and it
   * means the same thing here: a 1px stroke centred on a half-pixel covers
   * exactly one pixel column.
   */
  private paintBoxes(g: CanvasRenderingContext2D): void {
    g.lineWidth = 1;
    // the engine sets lineJoin/lineCap to "round" on this context every frame,
    // and a round join on a 1px stroke leaves four partially-covered corner
    // pixels per box - 16 antialiased pixels the bar does not have
    g.lineJoin = "miter";
    g.lineCap = "butt";
    for (const b of this.boxes) {
      g.strokeStyle = BOX_COLOR[b.kind];
      const x = Math.round(b.x) + this.ox + 0.5;
      const y = Math.round(b.y) + this.oy + 0.5;
      g.strokeRect(x, y, Math.max(1, Math.round(b.w) - 1), Math.max(1, Math.round(b.h) - 1));
    }
  }

  stats(): CellStats {
    // TWO canvases when GL is on. The one the tournament measures is the one
    // the fight is rasterised into, and `document.querySelector("canvas")`
    // finds the same one - glInit appends glCanvas before mainCanvas exists.
    const surface = glCanvas ?? mainCanvas;
    const gl = glContext as WebGL2RenderingContext | undefined;
    return {
      engine: "littlejs",
      version: engineVersion,
      drawn: this.drawn,
      backbuffer: [surface ? surface.width : 0, surface ? surface.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
