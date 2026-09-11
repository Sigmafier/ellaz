// The melonJS 20.4 arm. Same look as the canvas bar, same draw scale, same
// HUD layout, same box colours - what differs is WHERE the pixels land.
//
// melonJS 20 has NO `me.video.init`. The `video` namespace this version
// exports is four renderer CONSTANTS and nothing else; an application is
// `new Application(w, h, settings)` followed by an awaited `app.init()`. That
// is written down here because the engine notes for this lane carried the old
// call, and a signature recalled rather than read is the defect this lane paid
// first (see defects/melonjs.md).
//
// GL is ON, deliberately: pixi8, phaser4 and littlejs are WebGL arms and an
// arm that quietly fell back to Canvas2D would be compared against them on a
// different pipeline. `antiAlias: false` so SAMPLES reads 0 like the others,
// and `failIfMajorPerformanceCaveat: false` because melonJS defaults it TRUE
// and headless chromium rasterises through SwiftShader - the default would
// have REJECTED `init()` outright rather than falling back.
//
// The engine owns a requestAnimationFrame loop the contract has no method for
// (`state`'s run loop, started when the default stage comes up at the end of
// `init()`). `state.stop()` turns it off and `endFrame` calls `app.draw()`
// once, so drawn frames equal harness frames - the same decision the pixi,
// phaser and littlejs arms made for the same reason.
//
// The VIEW mapping: one `Renderable` marked `floating`, which melonJS draws in
// SCREEN space (`resetTransform` + the camera's screen projection), y DOWN,
// one world unit per canvas pixel. So a view pixel is a canvas pixel with no
// flip and no fudge, and `?boxes=1` is what proves it.
//
// One draw scale, 0.2, for the reason the other arms state: the arena file
// says scale {num:1, den:5} and the sheets are drawn at that art scale. A
// constant, so a cell cannot quietly disagree with the arena it draws into.

import { Application, Color, Renderable, state, version, video } from "melonjs";
import type { CanvasRenderer, WebGLRenderer } from "melonjs";
import type { Atlas, Manifest, Point } from "../../../../adapters/manifest";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";

type AnyRenderer = CanvasRenderer | WebGLRenderer;

const DRAW_SCALE = 1 / 5;
const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const SHADOW = "#28140a";
const SHADOW_ALPHA = 0.28;
const TICK_ALPHA = 0.25;
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

// The demo brawler's 5x7 bitmap font, the same table the canvas arm carries.
// Duplicated rather than imported for the reason the pixi and littlejs lanes
// logged: a cell must ship beside its engine alone, and importing a sibling
// arm's module puts a shared chunk in BOTH arms' byte report, moving a number
// the tournament reads.
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

interface Sheet { img: HTMLImageElement; atlas: Atlas; pivot: Point }

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`melonjs cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

/**
 * Decode the sheet ourselves rather than through `me.loader`. Two of the five
 * defect logs already record a loader that RESOLVES on `image.onerror`, and a
 * 404 sheet that becomes a blank texture draws a white slab with nothing
 * thrown; `img.decode()` REJECTS, which is the behaviour the admission gate
 * can see.
 */
async function decode(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

const EMPTY_ARENA: readonly ArenaDrawOp[] = [];
const EMPTY_FX: readonly FxOp[] = [];
const EMPTY_BOXES: readonly BoxOp[] = [];

/**
 * The one thing in the world: a screen-space renderable whose `draw` paints
 * the plan the harness recorded. `floating` is what puts it in screen space;
 * it is also what makes it draw at all, because `Container.draw` skips a child
 * whose `inViewport` is false and nothing sets that without an engine update.
 */
class PlanLayer extends Renderable {
  private readonly painter: (renderer: AnyRenderer) => void;

  constructor(w: number, h: number, painter: (renderer: AnyRenderer) => void) {
    super(0, 0, w, h);
    this.painter = painter;
    this.floating = true;
    this.applyAnchorTransform = false;
    this.alwaysUpdate = true;
  }

  draw(renderer: AnyRenderer): void {
    this.painter(renderer);
  }
}

export class MelonJsCell implements Cell {
  readonly id = "melonjs";
  private root = document.createElement("div");
  private app: Application | null = null;
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

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    await Promise.all(sets.map(async (set) => {
      const [atlas, manifest, img] = await Promise.all([
        json<Atlas>(set.atlas),
        json<Manifest>(set.manifest),
        decode(set.png),
      ]);
      this.adopt(set, atlas, manifest, img);
    }));
    this.app = await this.boot();
  }

  /**
   * Bind one decoded sheet, and check that it IS that sheet: the atlas's own
   * `meta.size` is the only statement of how big the png must be, and a
   * mismatched pair would place every frame somewhere else on the sheet with
   * nothing thrown.
   *
   * The pivot comes from the MANIFEST, in view pixels - not the atlas frame's
   * own 0-1 fraction. Both are present and they agree today, which is exactly
   * why a drift would be silent; the bar reads the manifest, so this reads it
   * too.
   */
  private adopt(set: SpriteSetRef, atlas: Atlas, manifest: Manifest, img: HTMLImageElement): void {
    const want = atlas.meta.size;
    if (img.naturalWidth !== want.w || img.naturalHeight !== want.h) {
      throw new Error(`melonjs cell: "${set.name}" png is ${img.naturalWidth}x${img.naturalHeight}, the atlas says ${want.w}x${want.h} (${set.png})`);
    }
    const pivot = { x: manifest.pivot.x * DRAW_SCALE, y: manifest.pivot.y * DRAW_SCALE };
    this.sheets.set(set.name, { img, atlas, pivot });
  }

  /** the Application, its loop stopped, with the plan layer in the world */
  private async boot(): Promise<Application> {
    const app = new Application(this.view.w, this.view.h, {
      parent: this.root,
      renderer: video.WEBGL,          // WEBGL means WebGL 2 or reject - never a silent 2D fallback
      scale: 1,
      scaleMethod: "manual",          // no auto-scaling; the canvas stays at the view size
      antiAlias: false,               // the other GL arms report SAMPLES 0; so must this one
      textureFilter: "nearest",
      subPixel: false,
      transparent: false,
      blendMode: "normal",
      // melonJS defaults this TRUE, and `renderer: WEBGL` REJECTS rather than
      // falling back - so on a driver chromium flags, the default turns a
      // working arm into a failed init. NOT exercised here: measured
      // 2026-09-12, flipping it back to true changes nothing (the arm still
      // comes up WebGL2 and the pixel diff reads the same 415 px). It is kept
      // for the machine that is not this one, not for a win on this one.
      failIfMajorPerformanceCaveat: false,
      physic: "none",                 // a physics step is work the plain-canvas bar is not doing
      gpuTilemap: false,
      consoleHeader: false,           // the banner is the only thing melonJS writes unasked
      backgroundColor: CREAM,
    });
    await app.init();
    app.pauseOnBlur = false;
    app.resumeOnFocus = false;
    app.stopOnBlur = false;
    app.isAlwaysDirty = true;         // `draw()` is a no-op unless the app is dirty
    state.stop();                     // the contract has no method for an engine-owned loop
    app.world.addChild(new PlanLayer(this.view.w, this.view.h, (r) => this.paint(r)));
    return app;
  }

  private need(): Application {
    if (!this.app) throw new Error("melonjs cell: used before load()");
    return this.app;
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const app = this.need();
    this.view = view;
    if (app.renderer.width !== view.w || app.renderer.height !== view.h) app.renderer.resize(view.w, view.h);
    this.root.style.cssText = "margin:0 auto;line-height:0";
    host.appendChild(this.root);
    const canvas = app.renderer.getCanvas();
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    this.fit();
    window.addEventListener("resize", () => this.fit());
  }

  /**
   * The bar's integer upscale, expressed through the engine's OWN scale path
   * rather than by writing `canvas.style.width` behind its back: melonJS
   * rewrites those two properties on every resize from `settings.scale`, so
   * the setting is the only place a caller can say this once.
   */
  private fit(): void {
    const app = this.need();
    const k = Math.max(1, Math.floor(Math.min(window.innerWidth / this.view.w, window.innerHeight / this.view.h)));
    (app.renderer.settings as { scale: number }).scale = k;
    app.resize();
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    this.ox = Math.round(shakeX - camX);
    this.oy = Math.round(shakeY);
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
    if (!sheet) throw new Error(`melonjs cell: no sprite set "${op.set}"`);
    if (!sheet.atlas.frames[op.frame]) throw new Error(`melonjs cell: atlas has no frame "${op.frame}"`);
    this.sprites.push(op);
    this.drawn += 1;
  }

  /** the ONE paint: the engine's own loop is stopped, so drawn frames == harness frames */
  endFrame(): void {
    this.need().draw();
  }

  // ---- the paint, called back from the plan layer -----------------------------

  /**
   * `setColor` MULTIPLIES the incoming colour's alpha by whatever alpha the
   * renderer is already carrying (`currentColor.alpha` is both the global
   * alpha and the colour's), so an alpha set once would stick to every later
   * colour. Every fill goes through here, and here always states the alpha.
   */
  private ink(renderer: AnyRenderer, hex: string, alpha = 1): void {
    let c = this.colors.get(hex);
    if (!c) { c = new Color().parseCSS(hex); this.colors.set(hex, c); }
    renderer.setGlobalAlpha(alpha);
    renderer.setColor(c);
  }

  private paint(renderer: AnyRenderer): void {
    this.ink(renderer, CREAM);
    renderer.fillRect(0, 0, this.view.w, this.view.h);
    renderer.save();
    renderer.translate(this.ox, this.oy);
    for (const op of this.arena) {
      this.ink(renderer, op.color);
      renderer.fillRect(op.x, op.y, op.w, op.h);
    }
    for (const op of this.shadows) this.paintShadow(renderer, op);
    for (const op of this.sprites) this.paintSprite(renderer, op);
    for (const op of this.fx) this.paintFx(renderer, op);
    renderer.restore();
    // the HUD never shakes; the boxes, drawn after it, do
    if (this.hud) this.paintHud(renderer, this.hud);
    if (this.boxes.length) this.paintBoxes(renderer);
  }

  /** a pixel ellipse: rows of fillRect, so it lands on the same grid as the sprites */
  private paintShadow(renderer: AnyRenderer, op: ShadowOp): void {
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = Math.round(op.x);
    const cy = Math.round(op.y);
    this.ink(renderer, SHADOW, SHADOW_ALPHA);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) renderer.fillRect(cx - hw, cy + dy, hw * 2, 1);
    }
  }

  /**
   * The contract hands over the point the PIVOT (the feet) must land on, and
   * the flip mirrors about that COLUMN rather than about the frame's middle -
   * the bar's `drawFrame` geometry, one for one. Both sheets happen to have
   * pivot.x at the frame's centre, so the two are identical today and would
   * part company on the first character whose feet are off-centre.
   */
  private paintSprite(renderer: AnyRenderer, op: SpriteOp): void {
    const sheet = this.sheets.get(op.set) as Sheet;
    const src = sheet.atlas.frames[op.frame].frame;
    const dw = src.w * DRAW_SCALE;
    const dh = src.h * DRAW_SCALE;
    const dx = op.x - sheet.pivot.x;
    const dy = op.y - sheet.pivot.y;
    // a quad takes its alpha from the renderer's GLOBAL alpha, which the
    // shadow above just left at 0.28 - a sprite drawn without this is a ghost
    renderer.setGlobalAlpha(1);
    if (!op.flip) {
      renderer.drawImage(sheet.img, src.x, src.y, src.w, src.h, dx, dy, dw, dh);
      return;
    }
    renderer.save();
    renderer.translate(op.x, 0);
    renderer.scale(-1, 1);
    renderer.drawImage(sheet.img, src.x, src.y, src.w, src.h, dx - op.x, dy, dw, dh);
    renderer.restore();
  }

  private paintFx(renderer: AnyRenderer, op: FxOp): void {
    const alpha = Math.max(0, Math.min(1, op.alpha));
    const r = Math.max(0.5, op.r);
    this.ink(renderer, op.color, alpha);
    if (op.kind === "dot") renderer.fillEllipse(op.x, op.y, r, r);
    else if (op.kind === "star") this.paintStar(renderer, op);
    else renderer.strokeEllipse(op.x, op.y, r, r);
  }

  private paintStar(renderer: AnyRenderer, op: FxOp): void {
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    const d = Math.max(1, Math.round(r / 2));
    renderer.fillRect(x - r, y, r * 2 + 1, 1);
    renderer.fillRect(x, y - r, 1, r * 2 + 1);
    renderer.fillRect(x - d, y - d, 1, 1);
    renderer.fillRect(x + d, y - d, 1, 1);
    renderer.fillRect(x - d, y + d, 1, 1);
    renderer.fillRect(x + d, y + d, 1, 1);
  }

  /** the glyph rows painted as one fillRect per lit pixel, the bar's 5x7 font */
  private paintText(renderer: AnyRenderer, str: string, x: number, y: number, size: number, color: string): void {
    this.ink(renderer, color);
    for (let i = 0; i < str.length; i++) {
      const glyph = GLYPHS[str[i]] ?? GLYPHS[str[i].toUpperCase()] ?? GLYPHS[" "];
      for (let r = 0; r < ROWS; r++) {
        const bits = parseInt(glyph.substr(r * 2, 2), 16);
        for (let b = 0; b < 5; b++) {
          if (bits & (16 >> b)) renderer.fillRect(x + (i * ADVANCE + b) * size, y + r * size, size, size);
        }
      }
    }
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(renderer: AnyRenderer, x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const c = BAR[side % BAR.length];
    this.ink(renderer, INK);
    renderer.fillRect(x - 2, y - 2, w + 4, h + 4);
    this.ink(renderer, PANEL);
    renderer.fillRect(x, y, w, h);
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      this.ink(renderer, c.fill);
      renderer.fillRect(sx, y, n, h);
      this.ink(renderer, c.light);
      renderer.fillRect(sx, y, n, 2);
    }
    this.ink(renderer, INK, TICK_ALPHA);
    for (let i = 1; i < 10; i++) renderer.fillRect(x + Math.round((w * i) / 10), y + 2, 1, h - 2);
  }

  private paintHud(renderer: AnyRenderer, model: HudModel): void {
    const w = 180;
    const h = 12;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - w : 12;
      this.hpBar(renderer, x, 14, w, h, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      const tx = rtl ? x + w - textWidth(name, 1) : x;
      this.paintText(renderer, name, tx, 30, 1, INK);
    });
    if (model.phase >= 2) this.paintKo(renderer, model);
  }

  private paintKo(renderer: AnyRenderer, model: HudModel): void {
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    this.ink(renderer, INK);
    renderer.fillRect(x - 6, y - 5, textWidth(line, scale) + 12, 7 * scale + 10);
    this.ink(renderer, CREAM);
    renderer.fillRect(x - 4, y - 3, textWidth(line, scale) + 8, 7 * scale + 6);
    this.paintText(renderer, line, x, y, scale, INK);
  }

  /**
   * The boxes carry the shake themselves, because the HUD above them must not.
   *
   * Four fillRects rather than `strokeRect`, and that is a measurement, not a
   * taste: melonJS's GL `strokeRect` emits the rect as four `gl.LINES`
   * segments, and OpenGL's diamond-exit rule drops each segment's final pixel,
   * so one CORNER pixel per box went missing against the bar - 4 px at tick
   * 120, each a solid box colour on the bar and bare floor here. A 1px border
   * built from rects lands on the same integer grid the bar's half-pixel
   * stroke covers, with no line rasterisation rule in it at all.
   */
  private paintBoxes(renderer: AnyRenderer): void {
    renderer.save();
    renderer.translate(this.ox, this.oy);
    for (const b of this.boxes) {
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const w = Math.max(1, Math.round(b.w) - 1);
      const h = Math.max(1, Math.round(b.h) - 1);
      this.ink(renderer, BOX_COLOR[b.kind]);
      renderer.fillRect(x, y, w + 1, 1);
      renderer.fillRect(x, y + h, w + 1, 1);
      renderer.fillRect(x, y, 1, h + 1);
      renderer.fillRect(x + w, y, 1, h + 1);
    }
    renderer.restore();
  }

  stats(): CellStats {
    const renderer = this.app ? this.app.renderer : null;
    const canvas = renderer ? renderer.getCanvas() : null;
    const gl = renderer
      ? ((renderer as { gl?: WebGL2RenderingContext }).gl
        ?? (canvas ? (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) : null))
      : null;
    return {
      engine: "melonjs",
      version,
      drawn: this.drawn,
      backbuffer: [canvas ? canvas.width : 0, canvas ? canvas.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
