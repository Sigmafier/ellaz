import { CHARACTERS } from "../../../art/characters";
import { FULL_STYLES } from "../../../art/styles/registry";
import { animationPlayer, packInBrowser } from "../player";
import { chips, el, mount } from "../ui";

export function spritesPage(root: HTMLElement, params: URLSearchParams): void {
  const charId = CHARACTERS.some((c) => c.id === params.get("char")) ? params.get("char")! : "robot";
  const styleId = FULL_STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "snes16";
  const packed = packInBrowser(charId, styleId, 2);
  const sheetView = el("div", { class: "stage" }, el("h2", { text: `the sheet (${packed.atlas.meta.size.w} x ${packed.atlas.meta.size.h}, ${Object.keys(packed.atlas.frames).length} frames)` }), packed.sheet);
  mount(root,
    el("h1", { text: "Sprites" }),
    el("p", { class: "lede", text: "Every clip of every character, packed exactly as npm run export packs it, and played back through the canvas adapter - so this page is the adapter's test scene. Pink box: the hitbox. Pink dot: the pivot." }),
    chips(CHARACTERS.map((c) => ({ id: c.id, label: c.name })), charId, (id) => { location.hash = `#/sprites?char=${id}&style=${styleId}`; }),
    chips(FULL_STYLES.map((s) => ({ id: s.id, label: s.name })), styleId, (id) => { location.hash = `#/sprites?char=${charId}&style=${id}`; }),
    animationPlayer(charId, styleId, 2),
    sheetView,
  );
}
