// Tiny DOM helpers. No framework: the gallery is six pages of tiles and one
// player, and a dependency would be most of its bytes.

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | number | boolean> = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = String(v);
    else if (k === "text") n.textContent = String(v);
    else if (k.startsWith("data-")) n.setAttribute(k, String(v));
    else (n as unknown as Record<string, unknown>)[k] = v;
  }
  for (const c of children) if (c != null) n.append(c);
  return n;
}

export function tile(canvas: HTMLCanvasElement, title: string, sub = "", badge?: { text: string; kind?: string }): HTMLElement {
  const cap = el("div", { class: "cap" });
  const b = el("b", { text: title });
  if (badge) b.append(el("span", { class: `badge ${badge.kind ?? ""}`, text: badge.text }));
  cap.append(b, el("span", { text: sub }));
  return el("div", { class: "tile" }, canvas, cap);
}

export function chips<T extends string>(options: { id: T; label: string }[], current: T, onPick: (id: T) => void): HTMLElement {
  const row = el("div", { class: "row" });
  for (const o of options) {
    const c = el("button", { class: `chip ${o.id === current ? "on" : ""}`, text: o.label, type: "button" });
    c.addEventListener("click", () => onPick(o.id));
    row.append(c);
  }
  return row;
}

/** A page mounting function: clear the main element, fill it. */
export function mount(root: HTMLElement, ...children: (Node | string)[]): void {
  root.replaceChildren(...children);
}

/** Split a recipe.md into H2 sections for rendering (headings kept, prose as paragraphs). */
export function recipeSections(md: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = [];
  let cur: { heading: string; body: string } | null = null;
  for (const line of md.split("\n")) {
    const h = line.match(/^## (.+)/);
    if (h) { cur = { heading: h[1], body: "" }; out.push(cur); continue; }
    if (cur && !line.startsWith("#")) cur.body += line + "\n";
  }
  return out;
}
