import { useMemo } from "react";
import { CHARACTERS } from "../../../art/characters";
import { FULL_STYLES, STYLES } from "../../../art/styles/registry";
import { E, R, bounds, place, type Scene } from "../../../art/scene-ops";
import { go } from "../router";
import { Grid, Lede, SideList, Tile } from "../ui";
import type { PageProps } from ".";

/** One character, static pose, on the plain ground, in a style. */
export function characterTile(charId: string, styleId: string, scale = 2): HTMLCanvasElement {
  const ch = CHARACTERS.find((c) => c.id === charId)!;
  const st = STYLES.find((s) => s.id === styleId)!;
  const ops = ch.staticOps();
  const [x, y, w, h] = bounds(ops)!;
  const W = Math.ceil((w + 40) * scale), H = Math.ceil((h + 40) * scale);
  const ground = Math.ceil((h + 24) * scale);
  const scene: Scene = {
    id: `${charId}-${styleId}`, w: W, h: H,
    ops: [R(0, 0, W, H, "#e8eef7", false), R(0, ground, W, H - ground, "#c9d3e3", false), E(W / 2, ground + 2 * scale, w * 0.4 * scale, 3 * scale, "rgba(0,0,0,.2)", false),
      ...place(ops, W / 2 - (x + w / 2) * scale, ground - (y + h) * scale, scale)],
  };
  return st.render(scene);
}

export const STYLE_OPTIONS = [...FULL_STYLES, ...STYLES.filter((s) => s.tier === "card")].map((s) => ({ id: s.id, label: s.name }));
const styleOf = (params: URLSearchParams) => STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "snes16";

export function CharactersSide({ params }: PageProps) {
  return <SideList label="Style" options={STYLE_OPTIONS} current={styleOf(params)} onPick={(id) => go("characters", { style: id })} />;
}

export function CharactersMain({ params }: PageProps) {
  const styleId = styleOf(params);
  const tiles = useMemo(() => CHARACTERS.map((ch) => ({ ch, canvas: characterTile(ch.id, styleId) })), [styleId]);
  return (
    <>
      <Lede>The cast at rest, in one style at a time. Two heroes, two enemies; each carries the same five clips (see Sprites).</Lede>
      <Grid>
        {tiles.map(({ ch, canvas }) => (
          <Tile key={ch.id} id={ch.id} picture={canvas} title={ch.name} sub={`${ch.side} · made by ${ch.technique}`} badge={{ text: ch.side, kind: ch.side === "hero" ? "pick" : "card" }} />
        ))}
      </Grid>
    </>
  );
}
