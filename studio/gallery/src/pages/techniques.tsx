import { useMemo } from "react";
import { TECHNIQUES } from "../../../art/techniques";
import { FULL_STYLES, STYLES } from "../../../art/styles/registry";
import { E, R, bounds, place, type Scene } from "../../../art/scene-ops";
import { go } from "../router";
import { Badge, Grid, Lede, Note, SideList, Tile } from "../ui";
import type { PageProps } from ".";

export function techniqueTile(id: string, styleId: string, scale = 2): HTMLCanvasElement | null {
  const t = TECHNIQUES.find((x) => x.id === id)!;
  if (!t.sample) return null;
  const st = STYLES.find((s) => s.id === styleId)!;
  const ops = t.sample();
  const [x, y, w, h] = bounds(ops)!;
  const W = Math.ceil(Math.max(w, 60) * scale + 40 * scale), H = Math.ceil((h + 40) * scale), ground = Math.ceil((h + 24) * scale);
  const scene: Scene = { id: `tech-${id}`, w: W, h: H, ops: [R(0, 0, W, H, "#e8eef7", false), R(0, ground, W, H - ground, "#c9d3e3", false), E(W / 2, ground + 2 * scale, 18 * scale, 3 * scale, "rgba(0,0,0,.2)", false), ...place(ops, W / 2 - (x + w / 2) * scale, ground - (y + h) * scale, scale)] };
  return st.render(scene);
}

const styleOf = (params: URLSearchParams) => STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "flat";

export function TechniquesSide({ params }: PageProps) {
  return <SideList label="Style" options={FULL_STYLES.map((s) => ({ id: s.id, label: s.name }))} current={styleOf(params)} onPick={(id) => go("techniques", { style: id })} />;
}

export function TechniquesMain({ params }: PageProps) {
  const styleId = styleOf(params);
  const tiles = useMemo(() => TECHNIQUES.map((t) => ({ t, canvas: techniqueTile(t.id, styleId) })), [styleId]);
  return (
    <>
      <Lede>How frames are MADE, independent of how they look. Every sampled technique produces the same robot, so the difference across the grid is the technique. Cards are real techniques blocked on something outside the repo.</Lede>
      <Grid>
        {tiles.map(({ t, canvas }) => canvas ? (
          <Tile key={t.id} id={t.id} picture={canvas} title={t.name} sub={t.costPerAnimation} badge={{ text: "sample", kind: "sample" }} />
        ) : (
          <div key={t.id} className="rounded-xl border-2 bg-card px-3 py-2 shadow-[var(--shadow-card)]">
            <b className="block text-[15px]">{t.name}<Badge kind="card">card</Badge></b>
            <span className="text-[13px] text-muted-foreground">{t.summary}</span>
            <div className="mt-2"><Note>blocked on: {t.blockedOn}</Note></div>
          </div>
        ))}
      </Grid>
    </>
  );
}
