// The Phaser 4 arm. Retained mode, which is the whole point of measuring it:
// Phaser owns a scene graph and its own requestAnimationFrame, the harness
// owns the clock and the draw plan, and the two must not fight over either.
//
// So this cell keeps ONE Game with ONE Scene and a pool of objects that
// persist between frames - two Sprites (one per `who`), five Graphics layers,
// and a handful of Images carrying baked text. A harness draw call MUTATES
// those objects; `endFrame` does nothing, because Phaser paints on its own
// next tick. The Scene's `update()` is deliberately absent: a cell has no
// method through which it could step anything, and a Phaser animation would
// be a second clock beside the core's.
//
// One draw scale, 0.2, the same constant the canvas arm carries and for the
// same reason - data/arena/playroom.json says scale {num:1, den:5}, and a
// cell that computed it could quietly disagree with the arena it draws into.
//
// Depth bands, not insertion order: the harness calls arena -> shadows ->
// sprites -> fx -> hud -> boxes every frame, but a retained display list
// keeps whatever order it was built in, so each layer is pinned to a band and
// sprites take 10 + their position in the (already z-sorted) call order.

import Phaser from "phaser";
import type { Manifest } from "../../../../adapters/manifest";
import { loadStudioAtlas, originFor } from "../../../../adapters/phaser/load-atlas";
import { NO_INPUT } from "../../core/types";
import type { InputFrame } from "../../core/types";
import type { BoxOp, HudModel, ShadowOp, SpriteOp } from "../../core/view";
import type { ArenaDrawOp, Cell, CellStats, FxOp, SpriteSetRef } from "../contract";
import { drawText, textWidth } from "../canvas/font";

const DRAW_SCALE = 1 / 5;
const INK = 0x1a1230;
const CREAM = 0xfff4dc;
const PANEL = 0xf7e2b8;
const SHADOW = 0x281408;
const SHADOW_ALPHA = 0.28;
const INK_CSS = "#1a1230";
const BAR = [
  { fill: 0xff4d8d, light: 0xff9dc0 },   // side 0, the player
  { fill: 0x4a8cff, light: 0x9dc0ff },   // side 1, the CPU
];
const BOX_COLOR: Record<BoxOp["kind"], number> = { bdy: 0x2ec08a, itr: 0xff3b30, push: 0x4a8cff };

/** one band per harness call, so the display list cannot drift out of draw order */
const BAND = { arena: 0, shadow: 1, sprite: 10, fx: 100, hud: 200, text: 201, boxes: 300 };

/** the size the Game boots at; `mount` resizes it to whatever the arena file says */
const BOOT = { w: 640, h: 360 };

interface Layers {
  arena: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Graphics;
  fx: Phaser.GameObjects.Graphics;
  hud: Phaser.GameObjects.Graphics;
  boxes: Phaser.GameObjects.Graphics;
}

const hexCache = new Map<string, number>();

/** "#rrggbb" as the integer Phaser's Graphics wants; cached, because the arena is ~240 rects a frame */
function hex(css: string): number {
  const hit = hexCache.get(css);
  if (hit !== undefined) return hit;
  const m = /^#([0-9a-f]{6})$/i.exec(css);
  if (!m) throw new Error(`phaser4 cell: cannot read colour "${css}"`);
  const n = parseInt(m[1], 16);
  hexCache.set(css, n);
  return n;
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`phaser4 cell: ${r.status} fetching ${url}`);
  return (await r.json()) as T;
}

export class Phaser4Cell implements Cell {
  readonly id = "phaser4";
  private game: Phaser.Game | null = null;
  private scene: Phaser.Scene | null = null;
  private layers: Layers | null = null;
  private readonly parent = document.createElement("div");
  private readonly origins = new Map<string, { x: number; y: number }>();
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly texts: Phaser.GameObjects.Image[] = [];
  private view = { w: 0, h: 0 };
  private drawn = 0;
  private order = 0;
  private textUsed = 0;

  /**
   * The manifests are fetched here rather than through Phaser's loader: the
   * pivot is needed as an ORIGIN FRACTION before any sprite exists, and the
   * atlas's own per-frame pivot is a different fact that happens to agree.
   * Reading it from the manifest keeps one source of truth for the feet.
   */
  async load(sets: readonly SpriteSetRef[]): Promise<void> {
    await Promise.all(sets.map(async (s) => {
      this.origins.set(s.name, originFor(await json<Manifest>(s.manifest)));
    }));
    this.parent.style.cssText = "line-height:0";
    await this.boot(sets);
  }

  /** create the Game, queue every sheet in the Scene's preload, resolve on create */
  private boot(sets: readonly SpriteSetRef[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const cell = this;
      class CellScene extends Phaser.Scene {
        preload(): void {
          this.load.on("loaderror", (f: { key: string; url: string }) => {
            reject(new Error(`phaser4 cell: sheet "${f.key}" failed to load (${f.url})`));
          });
          for (const s of sets) loadStudioAtlas(this, s.name, s.png.replace(/\.png$/, ""));
        }
        create(): void { cell.onCreate(this); resolve(); }
      }
      this.game = new Phaser.Game({
        type: Phaser.WEBGL,
        width: BOOT.w,
        height: BOOT.h,
        parent: this.parent,
        backgroundColor: CREAM,
        transparent: false,
        pixelArt: true,
        // NONE + zoom 1 means the ScaleManager never writes canvas.style, so the
        // integer upscaling below is the cell's, matching the canvas arm exactly
        scale: { mode: Phaser.Scale.NONE, zoom: 1 },
        banner: false,
        autoFocus: false,
        // no physics, no input, no audio: none of them is in the contract, and
        // every one of them is work the plain-canvas bar is not doing
        input: false,
        audio: { noAudio: true },
        scene: CellScene,
      });
    });
  }

  private onCreate(scene: Phaser.Scene): void {
    this.scene = scene;
    const layer = (depth: number, fixed = false): Phaser.GameObjects.Graphics => {
      const g = scene.add.graphics().setDepth(depth);
      if (fixed) g.setScrollFactor(0);
      return g;
    };
    this.layers = {
      arena: layer(BAND.arena),
      shadow: layer(BAND.shadow),
      fx: layer(BAND.fx),
      // the HUD never shakes; the camera carries the shake, so the HUD opts out
      hud: layer(BAND.hud, true),
      boxes: layer(BAND.boxes),
    };
  }

  mount(host: HTMLElement, view: { w: number; h: number }): void {
    const game = this.game;
    if (!game) throw new Error("phaser4 cell: mount before load");
    this.view = view;
    game.scale.resize(view.w, view.h);
    host.appendChild(this.parent);
    const canvas = game.canvas;
    canvas.style.cssText = "display:block;image-rendering:pixelated;touch-action:none;margin:0 auto";
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

  private gfx(): Layers {
    if (!this.layers) throw new Error("phaser4 cell: draw before mount");
    return this.layers;
  }

  beginFrame(camX: number, shakeX: number, shakeY: number): void {
    const l = this.gfx();
    l.arena.clear();
    l.shadow.clear();
    l.fx.clear();
    l.hud.clear();
    l.boxes.clear();
    for (const s of this.sprites.values()) s.setVisible(false);
    for (const t of this.texts) t.setVisible(false);
    this.order = 0;
    this.textUsed = 0;
    // the canvas arm translates the world by (shakeX - camX, shakeY); a camera
    // scroll of s moves the world by -s, so the sign flips here and nowhere else
    const cam = (this.scene as Phaser.Scene).cameras.main;
    cam.setScroll(-Math.round(shakeX - camX), -Math.round(shakeY));
  }

  drawArena(ops: readonly ArenaDrawOp[]): void {
    const g = this.gfx().arena;
    for (const op of ops) {
      g.fillStyle(hex(op.color), 1);
      g.fillRect(op.x, op.y, op.w, op.h);
    }
  }

  /** a pixel ellipse: rows of fillRect, so it lands on the same grid as the sprites */
  drawShadow(op: ShadowOp): void {
    const g = this.gfx().shadow;
    const rx = Math.max(1, Math.round(op.w / 2));
    const ry = Math.max(1, Math.round(op.h / 2));
    const cx = Math.round(op.x);
    const cy = Math.round(op.y);
    g.fillStyle(SHADOW, SHADOW_ALPHA);
    for (let dy = -ry; dy <= ry; dy++) {
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (hw > 0) g.fillRect(cx - hw, cy + dy, hw * 2, 1);
    }
  }

  /**
   * One retained Sprite per `who`. The origin is the manifest pivot as a
   * fraction, so (op.x, op.y) is the feet; a NEGATIVE scaleX mirrors about
   * that origin column, which is what `flip` means - flipX would mirror about
   * the frame's centre instead, and only agrees while the pivot happens to sit
   * there. `?boxes=1` is the check that says which one is true.
   */
  drawSprite(op: SpriteOp): void {
    const o = this.origins.get(op.set);
    if (!o) throw new Error(`phaser4 cell: no sprite set "${op.set}"`);
    const s = this.spriteFor(op.who, op.set, op.frame);
    if (s.texture.key !== op.set) s.setTexture(op.set, op.frame);
    else s.setFrame(op.frame, true, false);
    // ALWAYS after setFrame: Phaser reads the atlas's own per-frame pivot when
    // it updates an origin, and the manifest is this cell's one source for it
    s.setOrigin(o.x, o.y);
    s.setPosition(op.x, op.y);
    s.setScale(op.flip ? -DRAW_SCALE : DRAW_SCALE, DRAW_SCALE);
    s.setDepth(BAND.sprite + this.order++);
    s.setVisible(true);
    this.drawn += 1;
  }

  private spriteFor(who: number, set: string, frame: string): Phaser.GameObjects.Sprite {
    const hit = this.sprites.get(who);
    if (hit) return hit;
    const scene = this.scene;
    if (!scene) throw new Error("phaser4 cell: drawSprite before mount");
    const s = scene.add.sprite(0, 0, set, frame);
    this.sprites.set(who, s);
    return s;
  }

  drawFx(ops: readonly FxOp[]): void {
    const g = this.gfx().fx;
    for (const op of ops) {
      const alpha = Math.max(0, Math.min(1, op.alpha));
      if (op.kind === "dot") {
        g.fillStyle(hex(op.color), alpha);
        g.fillCircle(op.x, op.y, Math.max(0.5, op.r));
      } else if (op.kind === "star") {
        this.fxStar(g, op, alpha);
      } else {
        g.lineStyle(1, hex(op.color), alpha);
        g.strokeCircle(op.x, op.y, Math.max(0.5, op.r));
      }
    }
  }

  private fxStar(g: Phaser.GameObjects.Graphics, op: FxOp, alpha: number): void {
    const r = Math.max(1, Math.round(op.r));
    const x = Math.round(op.x);
    const y = Math.round(op.y);
    const d = Math.max(1, Math.round(r / 2));
    g.fillStyle(hex(op.color), alpha);
    g.fillRect(x - r, y, r * 2 + 1, 1);
    g.fillRect(x, y - r, 1, r * 2 + 1);
    for (const [dx, dy] of [[-d, -d], [d, -d], [-d, d], [d, d]]) g.fillRect(x + dx, y + dy, 1, 1);
  }

  /** a chunky panelled bar per side, the demo brawler's look, in the bitmap font */
  private hpBar(x: number, y: number, w: number, h: number, frac: number, side: number, rtl: boolean): void {
    const g = this.gfx().hud;
    const c = BAR[side % BAR.length];
    g.fillStyle(INK, 1);
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(PANEL, 1);
    g.fillRect(x, y, w, h);
    const n = Math.round(w * Math.max(0, Math.min(1, frac)));
    if (n > 0) {
      const sx = rtl ? x + w - n : x;
      g.fillStyle(c.fill, 1);
      g.fillRect(sx, y, n, h);
      g.fillStyle(c.light, 1);
      g.fillRect(sx, y, n, 2);
    }
    g.fillStyle(INK, 0.25);
    for (let i = 1; i < 10; i++) g.fillRect(x + Math.round((w * i) / 10), y + 2, 1, h - 2);
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
      this.text(name, tx, 30, 1, INK_CSS);
    });
    if (model.phase >= 2) this.drawKo(model);
  }

  private drawKo(model: HudModel): void {
    const g = this.gfx().hud;
    const name = model.winner >= 0 ? (model.names[model.winner] ?? "").toUpperCase() : "";
    const line = name ? `KO  ${name} WINS` : "KO  DRAW";
    const scale = 2;
    const tw = textWidth(line, scale);
    const x = Math.round((this.view.w - tw) / 2);
    const y = Math.round(this.view.h / 2 - 7 * scale);
    g.fillStyle(INK, 1);
    g.fillRect(x - 6, y - 5, tw + 12, 7 * scale + 10);
    g.fillStyle(CREAM, 1);
    g.fillRect(x - 4, y - 3, tw + 8, 7 * scale + 6);
    this.text(line, x, y, scale, INK_CSS);
  }

  /**
   * The HUD's 5x7 bitmap font, baked once per distinct string into a Phaser
   * CanvasTexture by the canvas arm's own `drawText`. Shared rather than
   * re-typed: two copies of a glyph table drift, and the tournament compares
   * arms on the same HUD. `textures.exists` first because `createCanvas` on a
   * live key console.errors, and a console.error disqualifies the arm.
   */
  private text(str: string, x: number, y: number, scale: number, color: string): void {
    const scene = this.scene;
    if (!scene) throw new Error("phaser4 cell: drawHud before mount");
    const key = `fight-text|${str}|${scale}|${color}`;
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, Math.max(1, textWidth(str, scale)), 7 * scale);
      if (!tex) throw new Error(`phaser4 cell: no canvas texture for "${str}"`);
      drawText(tex.context, str, 0, 0, scale, color);
      tex.refresh();
    }
    const img = this.textAt(this.textUsed++);
    img.setTexture(key);
    img.setOrigin(0, 0);
    img.setPosition(Math.round(x), Math.round(y));
    img.setVisible(true);
  }

  private textAt(i: number): Phaser.GameObjects.Image {
    const hit = this.texts[i];
    if (hit) return hit;
    const scene = this.scene as Phaser.Scene;
    const img = scene.add.image(0, 0, "__DEFAULT").setDepth(BAND.text + i).setScrollFactor(0);
    this.texts[i] = img;
    return img;
  }

  drawBoxes(boxes: readonly BoxOp[]): void {
    const g = this.gfx().boxes;
    for (const b of boxes) {
      g.lineStyle(1, BOX_COLOR[b.kind], 1);
      g.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.max(1, Math.round(b.w) - 1), Math.max(1, Math.round(b.h) - 1));
    }
  }

  endFrame(): void {
    // nothing to flush: Phaser paints the mutated scene graph on its own next tick
  }

  private gl(): WebGLRenderingContext | null {
    const r = this.game?.renderer;
    return r && "gl" in r ? (r as Phaser.Renderer.WebGL.WebGLRenderer).gl : null;
  }

  stats(): CellStats {
    const c = this.game ? this.game.canvas : null;
    const gl = this.gl();
    return {
      engine: "phaser4",
      version: Phaser.VERSION,
      drawn: this.drawn,
      backbuffer: [c ? c.width : 0, c ? c.height : 0],
      dpr: window.devicePixelRatio,
      samples: gl ? (gl.getParameter(gl.SAMPLES) as number) : null,
    };
  }
}
