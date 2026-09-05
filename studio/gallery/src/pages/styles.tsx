import { useMemo } from "react";
import { STYLES } from "../../../art/styles/registry";
import { SCENES, SCENE_IDS } from "../../../art/scenes";
import { go } from "../router";
import { CanvasView, Grid, Lede, SideList, Stage, Tile, recipeSections } from "../ui";
import type { PageProps } from ".";

const recipes = import.meta.glob("../../../art/styles/*/recipe.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const recipeFor = (id: string): string => recipes[`../../../art/styles/${id}/recipe.md`] ?? "";

const sceneOf = (params: URLSearchParams) => SCENE_IDS.includes(params.get("scene") ?? "") ? params.get("scene")! : "reference";

export function StylesSide({ params }: PageProps) {
  const sceneId = sceneOf(params);
  return <SideList label="Scene" options={SCENE_IDS.map((id) => ({ id, label: id }))} current={sceneId} onPick={(id) => go("styles", { scene: id, open: params.get("open") })} />;
}

export function StylesMain({ params }: PageProps) {
  const sceneId = sceneOf(params);
  const open = params.get("open");
  const scene = SCENES[sceneId];
  const tiles = useMemo(() => STYLES.map((s) => ({ s, canvas: s.render(scene) })), [scene]);
  const opened = STYLES.find((x) => x.id === open);
  const big = useMemo(() => (opened ? opened.render(scene) : null), [opened, scene]);
  return (
    <>
      <Lede>Every style renders the same scene, so the only thing that differs across the grid is the style. Click a tile for its recipe: nine headings, identical in every style.</Lede>
      <Grid>
        {tiles.map(({ s, canvas }) => (
          <Tile key={s.id} picture={canvas} title={s.name} sub={s.tagline} badge={{ text: s.tier === "full" ? "full" : "card", kind: s.tier === "full" ? "full" : "card" }} onClick={() => go("styles", { scene: sceneId, open: s.id })} />
        ))}
      </Grid>
      {opened && big && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">{opened.name}</h2>
          <Stage><CanvasView canvas={big} className="[&>canvas]:mx-auto [&>canvas]:max-w-[900px] [&>canvas]:rounded-lg" /></Stage>
          <div className="mt-4 max-w-[80ch] rounded-xl border-2 bg-card px-4 py-2">
            <h2 className="mt-3 text-lg font-bold">{opened.name} recipe</h2>
            {recipeSections(recipeFor(opened.id)).map((sec) => (
              <div key={sec.heading}>
                <h3 className="mb-1 mt-3 text-sm font-bold uppercase tracking-wide text-brand-ink">{sec.heading}</h3>
                {sec.body.trim().split(/\n\n+/).map((p, i) => <p key={i} className="mb-1.5 leading-[1.45]">{p.replace(/\n/g, " ")}</p>)}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
