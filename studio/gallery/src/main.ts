// Hash router over six pages. Every page is a function of (root, params)
// that renders synchronously from art/ - no server, no fetch, so the built
// single-file gallery opens from file:// and from the Visual Hall alike.

import { stylesPage } from "./pages/styles";
import { charactersPage } from "./pages/characters";
import { spritesPage } from "./pages/sprites";
import { palettesPage } from "./pages/palettes";
import { techniquesPage } from "./pages/techniques";
import { gamesPage } from "./pages/games";
import { el } from "./ui";

export const PAGES: { id: string; label: string; render: (root: HTMLElement, params: URLSearchParams) => void }[] = [
  { id: "styles", label: "Styles", render: stylesPage },
  { id: "characters", label: "Characters", render: charactersPage },
  { id: "sprites", label: "Sprites", render: spritesPage },
  { id: "palettes", label: "Palettes", render: (r) => palettesPage(r) },
  { id: "techniques", label: "Techniques", render: techniquesPage },
  { id: "games", label: "Games", render: gamesPage },
];

function route(): { id: string; params: URLSearchParams } {
  const [path, q] = location.hash.replace(/^#\/?/, "").split("?");
  const id = PAGES.some((p) => p.id === path) ? path : "styles";
  return { id, params: new URLSearchParams(q ?? "") };
}

function render(): void {
  const { id, params } = route();
  const nav = document.getElementById("nav")!;
  nav.replaceChildren(...PAGES.map((p) => el("a", { href: `#/${p.id}`, class: p.id === id ? "on" : "", text: p.label })));
  const root = document.getElementById("page")!;
  try {
    PAGES.find((p) => p.id === id)!.render(root, params);
    document.title = `Ellaz Studio · ${PAGES.find((p) => p.id === id)!.label}`;
    (window as unknown as { __galleryReady: string }).__galleryReady = id;
  } catch (e) {
    root.replaceChildren(el("p", { class: "note", text: `this page failed to render: ${String(e)}` }));
    (window as unknown as { __galleryError: string }).__galleryError = String(e);
    throw e;
  }
}

window.addEventListener("hashchange", render);
render();
