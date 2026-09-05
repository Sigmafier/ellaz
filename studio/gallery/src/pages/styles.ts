import { STYLES } from "../../../art/styles/registry";
import { SCENES, SCENE_IDS } from "../../../art/scenes";
import { chips, el, mount, recipeSections, tile } from "../ui";

const recipes = import.meta.glob("../../../art/styles/*/recipe.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const recipeFor = (id: string): string => recipes[`../../../art/styles/${id}/recipe.md`] ?? "";

export function stylesPage(root: HTMLElement, params: URLSearchParams): void {
  const sceneId = SCENE_IDS.includes(params.get("scene") ?? "") ? params.get("scene")! : "reference";
  const open = params.get("open");
  const scene = SCENES[sceneId];
  const grid = el("div", { class: "grid" });
  for (const s of STYLES) {
    const c = s.render(scene);
    const t = tile(c, s.name, s.tagline, { text: s.tier === "full" ? "full" : "card", kind: s.tier === "full" ? "" : "card" });
    t.style.cursor = "pointer";
    t.addEventListener("click", () => { location.hash = `#/styles?scene=${sceneId}&open=${s.id}`; });
    grid.append(t);
  }
  const detail = el("div");
  if (open) {
    const s = STYLES.find((x) => x.id === open);
    if (s) {
      const big = s.render(scene);
      const sections = recipeSections(recipeFor(s.id));
      const rec = el("div", { class: "recipe" }, el("h2", { text: `${s.name} recipe` }));
      for (const sec of sections) rec.append(el("h3", { text: sec.heading }), ...sec.body.trim().split(/\n\n+/).map((p) => el("p", { text: p.replace(/\n/g, " ") })));
      detail.append(el("h2", { text: s.name }), el("div", { class: "stage" }, big), rec);
    }
  }
  mount(root,
    el("h1", { text: "Styles" }),
    el("p", { class: "lede", text: "Every style renders the same scene, so the only thing that differs across the grid is the style. Click a tile for its recipe: nine headings, identical in every style." }),
    chips(SCENE_IDS.map((id) => ({ id, label: id })), sceneId, (id) => { location.hash = `#/styles?scene=${id}${open ? `&open=${open}` : ""}`; }),
    grid,
    detail,
  );
}
