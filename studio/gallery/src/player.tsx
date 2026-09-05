// The animation player: plays a packed sheet through the canvas adapter -
// ClipPlayer + drawFrame - so this page IS the canvas adapter's test scene.
// Controls: clip, speed, onion skin, play/pause, step. All shadcn.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ClipPlayer } from "../../adapters/canvas/player";
import { drawFrame } from "../../adapters/canvas/draw-frame";
import { Stage } from "./ui";
import type { Packed } from "./pack";

export function AnimationPlayer({ packed, scale }: { packed: Packed; scale: number }) {
  const { manifest } = packed;
  const fw = manifest.frameSize.w, fh = manifest.frameSize.h;
  const clipIds = Object.keys(manifest.animations);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clip, setClip] = useState(clipIds[0]);
  const [playing, setPlaying] = useState(true);
  const [onion, setOnion] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [info, setInfo] = useState({ frame: "", index: 0, count: 0, fps: 0, state: "" });
  const stepRef = useRef(0);
  const live = useRef({ playing, onion, speed });
  live.current = { playing, onion, speed };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const player = new ClipPlayer(manifest);
    player.play(clip);
    let last = performance.now(), raf = 0, alive = true;
    const draw = () => {
      const a = manifest.animations[player.current];
      const x = fw + 20, y = manifest.pivot.y + 20;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e8eef7"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#c9d3e3"; ctx.fillRect(0, y, canvas.width, canvas.height);
      if (live.current.onion && player.index > 0) {
        ctx.globalAlpha = 0.3;
        drawFrame(ctx, packed.sheet, packed.atlas, manifest, a.frames[player.index - 1], x, y);
        ctx.globalAlpha = 1;
      }
      drawFrame(ctx, packed.sheet, packed.atlas, manifest, player.frame, x, y);
      // hitbox and pivot, so what the engine sees is what you see
      ctx.strokeStyle = "rgba(255,77,141,.7)"; ctx.lineWidth = 1;
      ctx.strokeRect(x - manifest.pivot.x + manifest.hitbox.x, y - manifest.pivot.y + manifest.hitbox.y, manifest.hitbox.w, manifest.hitbox.h);
      ctx.fillStyle = "#ff4d8d"; ctx.fillRect(x - 2, y - 2, 4, 4);
      setInfo({ frame: player.frame, index: player.index, count: a.frames.length, fps: a.fps, state: a.loop ? "loop" : player.finished ? "held" : "" });
    };
    const tick = (now: number) => {
      if (!alive) return;
      // a rAF timestamp is the FRAME's start and can precede a performance.now() taken between frames - clamp, never throw
      const dt = Math.max(0, now - last) / 1000; last = now;
      if (live.current.playing) player.advance(dt * live.current.speed);
      if (stepRef.current) { player.advance(stepRef.current); stepRef.current = 0; }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [packed, manifest, clip, fw, fh]);

  return (
    <Stage>
      <Tabs value={clip} onValueChange={setClip}>
        <TabsList>{clipIds.map((id) => <TabsTrigger key={id} value={id} className="font-bold">{id}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Toggle pressed={!playing} onPressedChange={(p) => setPlaying(!p)} variant="outline" className="font-bold" aria-label={playing ? "pause" : "play"}>{playing ? "pause" : "play"}</Toggle>
        <Button variant="outline" className="font-bold" onClick={() => { setPlaying(false); stepRef.current = 1 / manifest.animations[clip].fps + 0.0001; }}>step</Button>
        <Toggle pressed={onion} onPressedChange={setOnion} variant="outline" className="font-bold">onion skin</Toggle>
        <label className="ms-2 flex items-center gap-2 font-bold">speed
          <Slider className="w-40" min={0.25} max={3} step={0.25} value={[speed]} onValueChange={(v) => setSpeed(v[0])} aria-label="speed" />
          <span className="text-sm text-muted-foreground">x{speed.toFixed(2)}</span>
        </label>
      </div>
      <canvas ref={canvasRef} width={fw * 2 + 40} height={fh + 40} className="mx-auto mt-3 block w-full max-w-[900px] rounded-lg" />
      <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3.5 gap-y-1 text-sm">
        <dt className="font-bold text-muted-foreground">frame</dt><dd>{info.frame} ({info.index + 1}/{info.count})</dd>
        <dt className="font-bold text-muted-foreground">fps</dt><dd>{info.fps} x {speed.toFixed(2)}{info.state && ` · ${info.state}`}</dd>
        <dt className="font-bold text-muted-foreground">frame size</dt><dd>{fw} x {fh} px at scale {scale}</dd>
      </dl>
    </Stage>
  );
}
