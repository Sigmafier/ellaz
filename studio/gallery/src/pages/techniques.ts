import { TECHNIQUES } from "../../../art/techniques";
import { FULL_STYLES, STYLES } from "../../../art/styles/registry";
import { E, R, place, bounds, type Scene } from "../../../art/scene-ops";
import { chips, el, mount, tile } from "../ui";

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

export function techniquesPage(root: HTMLElement, params: URLSearchParams): void {
  const styleId = STYLES.some((s) => s.id === params.get("style")) ? params.get("style")! : "flat";
  const grid = el("div", { class: "grid" });
  for (const t of TECHNIQUES) {
    const c = techniqueTile(t.id, styleId);
    if (c) {
      grid.append(tile(c, t.name, t.costPerAnimation, { text: "sample" }));
    } else {
      grid.append(el("div", { class: "tile" }, el("div", { class: "cap" }, el("b", { text: t.name }, el("span", { class: "badge card", text: "card" })), el("span", { text: t.summary }), el("p", { class: "note", text: `blocked on: ${t.blockedOn}` }))));
    }
  }
  mount(root,
    el("h1", { text: "Techniques" }),
    el("p", { class: "lede", text: "How frames are MADE, independent of how they look. Every sampled technique produces the same robot, so the difference across the grid is the technique. Cards are real techniques blocked on something outside the repo." }),
    chips(FULL_STYLES.map((s) => ({ id: s.id, label: s.name })), styleId, (id) => { location.hash = `#/techniques?style=${id}`; }),
    grid,
  );
}
