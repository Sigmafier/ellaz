import { GAMES } from "../../../art/games";
import { STYLES } from "../../../art/styles/registry";
import { SCENES } from "../../../art/scenes";
import { CHARACTERS } from "../../../art/characters";
import { characterTile } from "./characters";
import { chips, el, mount, tile } from "../ui";

export function gamesPage(root: HTMLElement, params: URLSearchParams): void {
  const list = el("div");
  for (const g of GAMES) {
    const styleId = g.candidateStyles.includes(params.get(`${g.id}`) ?? "") ? params.get(g.id)! : g.style;
    const st = STYLES.find((s) => s.id === styleId)!;
    const scene = SCENES[g.scene];
    const cast = el("div", { class: "grid" });
    for (const id of g.cast) cast.append(tile(characterTile(id, styleId), CHARACTERS.find((c) => c.id === id)!.name, id));
    const kv = el("dl", { class: "kv" },
      el("dt", { text: "style" }), el("dd", { text: `${st.name} (${styleId})${styleId === g.style ? " - the binding" : " - a candidate"}` }),
      el("dt", { text: "palette" }), el("dd", { text: g.palette }),
      el("dt", { text: "technique" }), el("dd", { text: g.technique }),
      el("dt", { text: "scale" }), el("dd", { text: String(g.scale) }),
      el("dt", { text: "decided" }), el("dd", { text: g.decided }),
    );
    list.append(
      el("h2", { text: g.name }, el("span", { class: "badge pick", text: g.id })),
      el("p", { class: "lede", text: g.pitch }),
      chips(g.candidateStyles.map((id) => ({ id, label: STYLES.find((s) => s.id === id)!.name })), styleId, (id) => { const p = new URLSearchParams(location.hash.split("?")[1] ?? ""); p.set(g.id, id); location.hash = `#/games?${p}`; }),
      el("div", { class: "stage" }, st.render(scene)),
      kv,
      cast,
    );
  }
  mount(root,
    el("h1", { text: "Games" }),
    el("p", { class: "lede", text: "Per-game bindings from art/games/*.json: the style a game chose, the other styles you picked as candidates (switch to compare), its palette, technique and cast. A game engine reads the same file." }),
    list,
  );
}
