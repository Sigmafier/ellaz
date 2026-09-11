// The PixiJS 8 arm. Same look as the canvas bar, same draw scale, same HUD
// layout, same box colours - what differs is that nothing in here draws.
//
// Every harness call MUTATES a retained scene graph: two pooled Sprites (one
// per `who`), five Graphics, a small pool of text Sprites. `endFrame` is the
// only thing that paints, and it paints EXPLICITLY - the ticker is stopped at
// mount and `renderer.render(stage)` runs once per harness frame. Leaving the
// ticker on would let the engine paint at its own rate and the sweep would be
// comparing a different number of drawn frames per arm; stopping it makes
// drawn frames == harness frames, which is the fair comparison.
//
// One draw scale, 0.2, for the same reason the canvas arm states: the arena
// file says scale {num:1, den:5} and the sheets are drawn at that art scale.
// A constant, so a cell cannot quietly disagree with the arena it draws into.

import { Application, Assets, Container, Graphics, Sprite, Spritesheet, Texture, VERSION } from "pixi.js";
import type { SpritesheetData, WebGLRenderer } from "pixi.js";
import type { Atlas, Manifest, Point } from "../../../../adapters/manifest";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";

const DRAW_SCALE = 1 / 5;
const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const SHADOW = 0x28140a;
const SHADOW_ALPHA = 0.28;
const TICK_ALPHA = 0.25;
const BAR = [
  { fill: "#ff4d8d", light: "#ff9dc0" },   // side 0, the player
  { fill: "#4a8cff", light: "#9dc0ff" },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], string> = { bdy: "#2ec08a", itr: "#ff3b30", push: "#4a8cff" };

// The demo brawler's 5x7 bitmap font, the same table the canvas arm carries.
// It is duplicated rather than imported because a cell must be able to ship
// beside its engine alone - and because importing a sibling arm's module
// would put a shared chunk in BOTH arms' byte report, moving a number the
// tournament is reading.
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

/** the glyph rows painted onto a 2D context, which is then uploaded once as a texture */
function paintText(g: CanvasRenderingContext2D, str: string, size: number, color: string): void {
  g.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const glyph = GLYPHS[str[i]] ?? GLYPHS[str[i].toUpperCase()] ?? GLYPHS[" "];
    for (let r = 0; r < ROWS; r++) {
      const bits = parseInt(glyph.substr(r * 2, 2), 16);
      for (let b = 0; b < 5; b++) {
        if (bits & (16 >> b)) g.fillRect((i * ADVANCE + b) * size, r * size, size, size);
      }
    }
  }
}

interface Sheet { sheet: Spritesheet; atlas: Atlas }

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`pixi8 cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export class Pixi8Cell implements Cell {
  readonly id = "pixi8";
  private app: Application | null = null;
  private sheets = new Map<string, Sheet>();
  private view = { w: 640, h: 360 };
  private drawn = 0;

  // the retained scene: `world` carries the shake, `hud` never does, and the
  // boxes sit above the hud because the harness draws them after it
  private world = new Container();
  private spriteLayer = new Container();
  private hudLayer = new Container();
  private arenaG = new Graphics();
  private shadowG = new Graphics();
  private fxG = new Graphics();
  private hudG = new Graphics();
  private boxG = new Graphics();

  private fighters = new Map<number, Sprite>();
  private texts: Sprite[] = [];
  private textUsed = 0;
  private textCache = new Map<string, Texture>();

  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    const app = new Application();
    await app.init({
      width: this.view.w,
      height: this.view.h,
      background: CREAM,
      antialias: false,
      resolution: 1,
      autoDensity: false,
      preference: "webgl",
    });
    app.stop();
    this.app = app;
    await Promise.all(sets.map(async (set) => {
      const [atlas, texture] = await Promise.all([
        json<Atlas>(set.atlas),
        // the manifest is fetched for parity with the bar's loader; the pivot
        // this cell anchors on is the atlas frame's own 0-1 fraction
        json<Manifest>(set.manifest).then(() => Assets.load<Texture>(set.png)),
      ]);
      texture.source.scaleMode = "nearest";
      const sheet = new Spritesheet(texture, atlas as unknown as SpritesheetData);
      await sheet.parse();
      this.sheets.set(set.name, { sheet, atlas });
    }));
  }

  private need(): Application {
    if (!this.app) throw new Error("pixi8 cell: used before load()");
    return this.app;
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const app = this.need();
    this.view = view;
    if (app.renderer.width !== view.w || app.renderer.height !== view.h) app.renderer.resize(view.w, view.h);
    this.spriteLayer.sortableChildren = true;
    this.world.addChild(this.arenaG, this.shadowG, this.spriteLayer, this.fxG);
    this.hudLayer.addChild(this.hudG);
    app.stage.addChild(this.world, this.hudLayer, this.boxG);
    const canvas = app.canvas as HTMLCanvasElement;
    canvas.style.cssText = "display:block;image-rendering:pixelated;touch-action:none;margin:0 auto";
    host.appendChild(canvas);
    const fit = (): void => {
      const k = Math.max(1, Math.floor(Math.min(window.innerWidth / view.w, window.innerHeight / view.h)));
      canvas.style.width = `${view.w * k}px`;
      canvas.style.height = `${view.h * k}px`;
    };
    fit();
    window.addEventListener("resize", fit);
  }

  /** the harness reads the keyboard through shared/input; a cell may add its own later */
  readInput(_side: number): InputFrame {
    return NO_INPUT;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    this.arenaG.clear();
    this.shadowG.clear();
    this.fxG.clear();
    this.hudG.clear();
    this.boxG.clear();
    for (const s of this.fighters.values()) s.visible = false;
    for (const t of this.texts) t.visible = false;
    this.textUsed = 0;
    const ox = Math.round(shakeX - camX);
    const oy = Math.round(shakeY);
    this.world.position.set(ox, oy);
    this.boxG.position.set(ox, oy);
  }

  /**
   * One fill per RUN of same-coloured rects rather than one per rect. The
   * order is untouched and every arena colour is opaque, so the pixels are
   * identical; what it saves is ~240 fill instructions a frame rebuilt into
   * the same geometry.
   */
  drawArena(ops: readonly ArenaDrawOp[]): void {
    const g = this.arenaG;
    let color = "";
    let open = false;
    for (const op of ops) {
      if (open && op.color !== color) { g.fill({ color }); open = false; }
      color = op.color;
      g.rect(op.x, op.y, op.w, op.h);
      open = true;
    }
    if (open) g.fill({ color });
  }

  /** a pixel ellipse: rows of rect, so it lands on the same grid as the sprites */
  drawShadow(op: ShadowOp): void {
    const g = this.shadowG;
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = Math.round(op.x);
    const cy = Math.round(op.y);
    let any = false;
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) { g.rect(cx - hw, cy + dy, hw * 2, 1); any = true; }
    }
    if (any) g.fill({ color: SHADOW, alpha: SHADOW_ALPHA });
  }

  drawSprite(op: SpriteOp): void {
    const entry = this.sheets.get(op.set);
    if (!entry) throw new Error(`pixi8 cell: no sprite set "${op.set}"`);
    const texture = entry.sheet.textures[op.frame];
    const frame = entry.atlas.frames[op.frame];
    if (!texture || !frame) throw new Error(`pixi8 cell: atlas has no frame "${op.frame}"`);
    const pivot: Point = frame.pivot;
    let s = this.fighters.get(op.who);
    if (!s) {
      s = new Sprite();
      this.spriteLayer.addChild(s);
      this.fighters.set(op.who, s);
    }
    s.texture = texture;
    s.anchor.set(pivot.x, pivot.y);
    s.position.set(op.x, op.y);
    // the flip mirrors about the pivot column, which is what a negative x
    // scale on an anchored sprite does - no translate, no second draw path
    s.scale.set(op.flip ? -DRAW_SCALE : DRAW_SCALE, DRAW_SCALE);
    s.zIndex = op.depth;
    s.visible = true;
    this.drawn += 1;
  }

  drawFx(ops: readonly FxOp[]): void {
    const g = this.fxG;
    for (const op of ops) {
      const alpha = Math.max(0, Math.min(1, op.alpha));
      if (op.kind === "dot") g.circle(op.x, op.y, Math.max(0.5, op.r)).fill({ color: op.color, alpha });
      else if (op.kind === "star") this.fxStar(op, alpha);
      else g.circle(op.x, op.y, Math.max(0.5, op.r)).stroke({ width: 1, color: op.color, alpha, alignment: 0.5 });
    }
  }

  private fxStar(op: FxOp, alpha: number): void {
    const g = this.fxG;
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    const d = Math.max(1, Math.round(r / 2));
    g.rect(x - r, y, r * 2 + 1, 1);
    g.rect(x, y - r, 1, r * 2 + 1);
    g.rect(x - d, y - d, 1, 1);
    g.rect(x + d, y - d, 1, 1);
    g.rect(x - d, y + d, 1, 1);
    g.rect(x + d, y + d, 1, 1);
    g.fill({ color: op.color, alpha });
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const g = this.hudG;
    const c = BAR[side % BAR.length];
    g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: INK });
    g.rect(x, y, w, h).fill({ color: PANEL });
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      g.rect(sx, y, n, h).fill({ color: c.fill });
      g.rect(sx, y, n, 2).fill({ color: c.light });
    }
    for (let i = 1; i < 10; i++) g.rect(x + Math.round((w * i) / 10), y + 2, 1, h - 2);
    g.fill({ color: INK, alpha: TICK_ALPHA });
  }

  drawHud(model: HudModel): void {
    const w = 180;
    const h = 12;
    model.hp.forEach((hp, side) => {
      const rtl = side > 0;
      const x = rtl ? this.view.w - 12 - w : 12;
      this.hpBar(x, 14, w, h, hp / Math.max(1, model.maxHp[side]), side, rtl);
      const name = (model.names[side] ?? "").toUpperCase();
      const tx = rtl ? x + w - textWidth(name, 1) : x;
      this.textAt(name, tx, 30, 1, INK);
    });
    if (model.phase >= 2) this.drawKo(model);
  }

  private drawKo(model: HudModel): void {
    const g = this.hudG;
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const x = Math.round((this.view.w - textWidth(line, scale)) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    g.rect(x - 6, y - 5, textWidth(line, scale) + 12, 7 * scale + 10).fill({ color: INK });
    g.rect(x - 4, y - 3, textWidth(line, scale) + 8, 7 * scale + 6).fill({ color: CREAM });
    this.textAt(line, x, y, scale, INK);
  }

  drawBoxes(boxes: readonly BoxOp[]): void {
    const g = this.boxG;
    for (const b of boxes) {
      // the +0.5 is the canvas arm's, and it means the same thing here: a
      // 1px stroke centred on a half-pixel covers exactly one pixel column
      const x = Math.round(b.x) + 0.5;
      const y = Math.round(b.y) + 0.5;
      const w = Math.max(1, Math.round(b.w) - 1);
      const h = Math.max(1, Math.round(b.h) - 1);
      g.rect(x, y, w, h).stroke({ width: 1, color: BOX_COLOR[b.kind], alignment: 0.5 });
    }
  }

  /** the pooled text sprite for one line, its glyphs already baked into a texture */
  private textAt(str: string, x: number, y: number, size: number, color: string): void {
    const texture = this.textTexture(str, size, color);
    let s = this.texts[this.textUsed];
    if (!s) {
      s = new Sprite();
      s.anchor.set(0, 0);
      this.hudLayer.addChild(s);
      this.texts.push(s);
    }
    this.textUsed += 1;
    s.texture = texture;
    s.position.set(Math.round(x), Math.round(y));
    s.visible = true;
  }

  private textTexture(str: string, size: number, color: string): Texture {
    const key = `${str}|${size}|${color}`;
    const hit = this.textCache.get(key);
    if (hit) return hit;
    const c = document.createElement("canvas");
    c.width = Math.max(1, textWidth(str, size));
    c.height = ROWS * size;
    const g = c.getContext("2d");
    if (!g) throw new Error("pixi8 cell: no 2d context for the text cache");
    paintText(g, str, size, color);
    const texture = Texture.from(c);
    texture.source.scaleMode = "nearest";
    if (this.textCache.size > 400) this.textCache.clear();
    this.textCache.set(key, texture);
    return texture;
  }

  /** the ONE paint: the ticker is stopped, so drawn frames == harness frames */
  endFrame(): void {
    const app = this.need();
    app.renderer.render(app.stage);
  }

  stats(): CellStats {
    const app = this.app;
    const c = app ? (app.canvas as HTMLCanvasElement) : null;
    const gl = app ? (app.renderer as WebGLRenderer).gl : null;
    return {
      engine: "pixi8",
      version: VERSION,
      drawn: this.drawn,
      backbuffer: [c ? c.width : 0, c ? c.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
