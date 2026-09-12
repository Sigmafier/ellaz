// The look-demo: the Showcase bar, at the size a game actually draws it.
//
// This page exists to answer ONE operator question - does this clear the bar? -
// so it is a LOOK, not a game: no rules, no waves, no score. Three of the cast
// stand on the survivors arena's own ground, playing the same clip together, so
// the only thing that differs between this and the shipped game is the ART.
//
// THE SIZE IS THE POINT. The exporter emits 980x660 frames for a character that
// is 48 authored pixels tall, because every authored pixel is drawn as a flat
// `unit * scale` block (unit = 5 for the whole cast). A demo shown at frame size
// is a poster, and a poster that gets acked and then ships at 48px is a false
// ack. So `k` below is HOW MANY SCREEN PIXELS ONE AUTHORED PIXEL BECOMES: k=1 is
// literally what the game draws, k=6 is that same art magnified with every pixel
// kept square. Measured 2026-09-12, every k in the picker lands the block on a
// whole number of screen pixels, so nothing here is resampled.
//
// Packed at scale 1 rather than the export's scale 2: identical authored pixels
// (the block is 5 instead of 10 and the zoom divides by it), at a quarter of the
// sheet memory - three characters at scale 2 is 43 million pixels of canvas.

import { useEffect, useMemo, useRef, useState } from "react";
import { packInBrowser } from "../pack";
import { go } from "../router";
import { Lede, Note, SideList, Stage } from "../ui";
import { ClipPlayer } from "../../../adapters/canvas/player";
import { drawFrame } from "../../../adapters/canvas/draw-frame";
import type { PageProps } from ".";

// body units per authored pixel, the whole cast - each rig file under
// art/characters exports its own <NAME>_UNIT and every one of them is 5.
const UNIT = 5;
const SCALE = 1;
const BLOCK = UNIT * SCALE;
const STYLE = "snes16";

/** The survivors arena's own ink, so the two arms differ by the art alone. */
const GROUND = "#0b0d1f";
const GRID = "#171a33";
const GRID_STEP = 42;

const STAGE_W = 980;
const STAGE_H = 520;

/** hero, swarm, boss - the three roles the standard names, in the plan's order. */
const CAST = [
  { id: "slime", label: "Slime", role: "swarm" },
  { id: "robot", label: "Robot", role: "hero" },
  { id: "golem", label: "Golem", role: "boss" },
];

const KS = [1, 2, 3, 4, 6, 8];
const CLIPS = ["idle", "walk", "attack", "hurt", "ko"];

const kOf = (p: URLSearchParams) => {
  const k = Number(p.get("k"));
  return KS.includes(k) ? k : 6;
};
const clipOf = (p: URLSearchParams) => (CLIPS.includes(p.get("clip") ?? "") ? p.get("clip")! : "walk");

export function LookSide({ params }: PageProps) {
  const k = kOf(params), clip = clipOf(params);
  return (
    <>
      <SideList
        label="Size"
        options={KS.map((n) => ({ id: String(n), label: n === 1 ? "1x - real game size" : `${n}x` }))}
        current={String(k)}
        onPick={(id) => go("look", { k: id, clip })}
      />
      <SideList
        label="Clip"
        options={CLIPS.map((c) => ({ id: c, label: c }))}
        current={clip}
        onPick={(id) => go("look", { k: String(k), clip: id })}
      />
    </>
  );
}

export function LookMain({ params }: PageProps) {
  const k = kOf(params), clip = clipOf(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState<{ id: string; tall: number }[]>([]);

  const packs = useMemo(() => CAST.map((c) => ({ ...c, packed: packInBrowser(c.id, STYLE, SCALE) })), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const zoom = k / BLOCK;
    const groundY = Math.round(STAGE_H * 0.82);
    const step = CAST.length + 1;

    const players = packs.map((p) => {
      const pl = new ClipPlayer(p.packed.manifest);
      // a clip a character somehow lacks would throw inside the rAF loop, where
      // the error boundary cannot reach it - fall back rather than kill the page
      pl.play(p.packed.manifest.animations[clip] ? clip : "idle");
      return pl;
    });

    setDrawn(packs.map((p) => ({ id: p.id, tall: Math.round(p.packed.manifest.hitbox.h * zoom) })));

    let last = performance.now(), raf = 0, alive = true;
    const draw = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = GROUND;
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      // the arena's grid, zoomed with the scene so the magnification is legible
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = GRID_STEP * k; x < STAGE_W; x += GRID_STEP * k) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, STAGE_H); }
      for (let y = GRID_STEP * k; y < STAGE_H; y += GRID_STEP * k) { ctx.moveTo(0, y + 0.5); ctx.lineTo(STAGE_W, y + 0.5); }
      ctx.stroke();

      packs.forEach((p, i) => {
        const x = Math.round((STAGE_W / step) * (i + 1));
        drawFrame(ctx, p.packed.sheet, p.packed.atlas, p.packed.manifest, players[i].frame, x, groundY, zoom);
      });
    };
    const tick = (now: number) => {
      if (!alive) return;
      // a rAF timestamp is the FRAME's start and can precede performance.now() - clamp
      const dt = Math.max(0, now - last) / 1000; last = now;
      for (const pl of players) pl.advance(dt);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [packs, k, clip]);

  return (
    <>
      <Lede>
        The Showcase bar, at the size the game draws it. <b>{k}x</b> means one authored pixel is {k} screen
        {k === 1 ? " pixel" : " pixels"} - so 1x is literally what a player sees, and anything above it is that
        same art magnified with every pixel kept square. Nothing here is resampled or smoothed. The ground and
        its grid are the survivors arena's own, so the only thing that differs from the game today is the art.
      </Lede>
      <Stage>
        <canvas
          ref={canvasRef}
          width={STAGE_W}
          height={STAGE_H}
          className="mx-auto block h-auto w-full max-w-[980px] rounded-lg"
        />
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-3.5 gap-y-1 text-sm">
          <dt className="font-bold text-muted-foreground">playing</dt>
          <dd>{clip} · all three on the same beat</dd>
          <dt className="font-bold text-muted-foreground">drawn height</dt>
          <dd>{drawn.map((d) => `${d.id} ${d.tall}px`).join(" · ")}</dd>
          <dt className="font-bold text-muted-foreground">style</dt>
          <dd>{STYLE} · five clips each · idle, walk, attack, hurt, ko</dd>
        </dl>
      </Stage>
      <Note>
        This is a LOOK, not a game - no rules, no waves, no score. Weapons, hit effects, illustrated upgrade
        cards and the boss fight are the build this demo is asking permission to start.
      </Note>
    </>
  );
}
