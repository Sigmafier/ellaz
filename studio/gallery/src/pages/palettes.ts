import { PALETTES, toGpl, toHex } from "../../../art/palettes";
import { el, mount } from "../ui";

export function palettesPage(root: HTMLElement): void {
  const list = el("div");
  for (const p of PALETTES) {
    const sw = el("div", { class: "swatches" });
    for (const c of p.colors) sw.append(el("div", { class: "swatch" }, el("i", { style: `background:${c.hex}` }), el("b", { text: c.name }), el("span", { text: `${c.hex}${c.role ? ` · ${c.role}` : ""}` })));
    const gpl = el("details", {}, el("summary", { text: ".gpl / .hex" }), el("pre", { text: toGpl(p) + "\n" + toHex(p) }));
    list.append(el("h2", { text: `${p.name} ` }, el("code", { text: p.id })), el("p", { class: "lede", text: p.note }), sw, gpl);
  }
  mount(root,
    el("h1", { text: "Palettes" }),
    el("p", { class: "lede", text: "The canonical JSON in art/palettes, with its .gpl and .hex exports (what Aseprite, GIMP and Lospec read). Roles are the art bible's: player, enemy, interactable, warning, ground, text." }),
    list,
  );
}
