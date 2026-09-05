import { useMemo } from "react";
import { CHARACTERS } from "../../../art/characters";
import { FULL_STYLES } from "../../../art/styles/registry";
import { packInBrowser } from "../pack";
import { AnimationPlayer } from "../player";
import { go } from "../router";
import { CanvasView, Lede, SideList, Stage } from "../ui";
import type { PageProps } from ".";

const charOf = (params: URLSearchParams) => CHARACTERS.some((c) => c.id === params.get("char")) ? params.get("char")! : "robot";
const styleOf = (params: URLSearchParams) => FULL_STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "snes16";

export function SpritesSide({ params }: PageProps) {
  const charId = charOf(params), styleId = styleOf(params);
  return (
    <>
      <SideList label="Character" options={CHARACTERS.map((c) => ({ id: c.id, label: c.name }))} current={charId} onPick={(id) => go("sprites", { char: id, style: styleId })} />
      <SideList label="Style" options={FULL_STYLES.map((s) => ({ id: s.id, label: s.name }))} current={styleId} onPick={(id) => go("sprites", { char: charId, style: id })} />
    </>
  );
}

export function SpritesMain({ params }: PageProps) {
  const charId = charOf(params), styleId = styleOf(params);
  const packed = useMemo(() => packInBrowser(charId, styleId, 2), [charId, styleId]);
  return (
    <>
      <Lede>Every clip of every character, packed exactly as npm run export packs it, and played back through the canvas adapter - so this page is the adapter's test scene. Pink box: the hitbox. Pink dot: the pivot.</Lede>
      <AnimationPlayer packed={packed} scale={2} />
      <Stage className="mt-4">
        <h2 className="mb-2 text-lg font-bold">the sheet ({packed.atlas.meta.size.w} x {packed.atlas.meta.size.h}, {packed.frames} frames)</h2>
        <CanvasView canvas={packed.sheet} className="[&>canvas]:mx-auto [&>canvas]:max-w-[900px] [&>canvas]:rounded-lg" />
      </Stage>
    </>
  );
}
