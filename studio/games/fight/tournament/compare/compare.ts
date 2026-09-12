// The compare page's only module. It knows which arm is behind each letter and
// never puts that anywhere the operator can read it - including the DOM.
//
// The frames are opened by replacing the location of a blank iframe rather
// than by setting src, so the arm's name never reaches an attribute either. A
// blind that only hides the label is not a blind: "view source" and "inspect"
// are one keypress each, and the grader is sitting at the keyboard.
//
// The mapping is fetched as a build asset (new URL(..., import.meta.url)), so
// re-lettering means re-running blind.mjs and rebuilding.

interface Letters { seed: number; at: string; letters: Record<string, string> }
interface FightStats { stepsPerFrame: number; distinctDraws: number; ttffMs: number }
type FrameWindow = Window & { __fightStats?: FightStats; __fightTicks?: number };

interface Card {
  letter: string;
  box: HTMLElement;
  wrap: HTMLElement;
  frame: HTMLIFrameElement;
  readout: HTMLElement;
  rank: HTMLInputElement;
  verdict: HTMLTextAreaElement;
}

const VIEW_W = 640;
const VIEW_H = 360;
const GAP = 12;
const TAPE = "versus-600";

const grid = document.getElementById("grid") as HTMLElement;
const goBtn = document.getElementById("go") as HTMLButtonElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;
const closeBtn = document.getElementById("close") as HTMLButtonElement;
const panel = document.getElementById("panel") as HTMLElement;
const out = document.getElementById("out") as HTMLElement;
const seedEl = document.getElementById("seed") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One card: the framed arm, its live readout, its rank box and its word. */
function makeCard(letter: string, total: number): Card {
  const box = el("div", "card");
  const top = el("div", "top");
  top.append(el("span", "letter", letter));
  const rankRow = el("label", "rank");
  const rank = el("input");
  rank.type = "number";
  rank.min = "1";
  rank.max = String(total);
  rank.setAttribute("aria-label", `rank for ${letter}`);
  rankRow.append(el("span", undefined, "rank"), rank);
  top.append(rankRow);
  const wrap = el("div", "wrap");
  const frame = el("iframe");
  frame.setAttribute("title", `arm ${letter}`);
  wrap.append(frame);
  const readout = el("div", "readout", "waiting");
  const verdict = el("textarea");
  verdict.rows = 2;
  verdict.placeholder = "one word";
  verdict.setAttribute("aria-label", `verdict for ${letter}`);
  box.append(top, wrap, readout, verdict);
  return { letter, box, wrap, frame, readout, rank, verdict };
}

/**
 * Open the arm without ever naming it in the document. An iframe appended with
 * no src is at about:blank and same-origin, so replacing its location loads
 * the page while the src attribute stays absent.
 */
function openFrame(card: Card, cellId: string): void {
  // the cells are the engine's, under toybox/cells in the built tree; this page is the fight's, so the arms play the fight
  const url = new URL(`../../../../toybox/cells/${cellId}/index.html?game=fight&tape=${TAPE}&wait=1`, location.href).href;
  const win = card.frame.contentWindow;
  if (!win) { card.readout.textContent = "frame did not open"; return; }
  win.location.replace(url);
}

/** Largest scale that puts every card on screen at once - never a scrollbar. */
function layout(cards: Card[]): void {
  if (cards.length === 0) return;
  const chrome = Math.max(0, cards[0].box.offsetHeight - cards[0].wrap.offsetHeight) + 2;
  const availW = grid.clientWidth - 24;
  const availH = grid.clientHeight - 24;
  let best = { k: 0.1, cols: 1 };
  for (let cols = 1; cols <= cards.length; cols++) {
    const rows = Math.ceil(cards.length / cols);
    const w = (availW - GAP * (cols - 1)) / cols - 18;
    const h = (availH - GAP * (rows - 1)) / rows - chrome;
    const k = Math.min(w / VIEW_W, h / VIEW_H);
    if (k > best.k) best = { k, cols };
  }
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${Math.floor(VIEW_W * best.k) + 18}px)`;
  for (const c of cards) {
    c.wrap.style.width = `${Math.floor(VIEW_W * best.k)}px`;
    c.wrap.style.height = `${Math.floor(VIEW_H * best.k)}px`;
    c.frame.style.transform = `scale(${best.k})`;
  }
}

const n2 = (v: number | undefined): string => (typeof v === "number" ? v.toFixed(2) : "-");
const n0 = (v: number | undefined): string => (typeof v === "number" ? Math.round(v).toString() : "-");

/** Poll each frame's own numbers. Engine and version are read and discarded. */
function poll(cards: Card[]): void {
  let ready = 0;
  for (const c of cards) {
    let stats: FightStats | undefined;
    let ticks: number | undefined;
    try {
      const win = c.frame.contentWindow as FrameWindow | null;
      stats = win?.__fightStats;
      ticks = win?.__fightTicks;
    } catch { stats = undefined; }
    if (!stats) { c.readout.textContent = "loading"; continue; }
    ready++;
    c.readout.textContent = `t ${n0(ticks)}   steps/frame ${n2(stats.stepsPerFrame)}   distinct ${n2(stats.distinctDraws)}   first frame ${n0(stats.ttffMs)} ms`;
  }
  goBtn.disabled = ready < cards.length;
  statusEl.textContent = ready < cards.length ? `${ready} of ${cards.length} loaded` : `${cards.length} loaded - press Go`;
}

function verdictText(cards: Card[], seed: number): string {
  const ranked = cards
    .map((c, i) => ({ letter: c.letter, rank: Number(c.rank.value), i }))
    .sort((a, b) => {
      const ar = Number.isFinite(a.rank) && a.rank > 0 ? a.rank : Infinity;
      const br = Number.isFinite(b.rank) && b.rank > 0 ? b.rank : Infinity;
      return ar === br ? a.i - b.i : ar - br;
    });
  const verdicts: Record<string, string> = {};
  for (const c of cards) verdicts[c.letter] = c.verdict.value.trim();
  return JSON.stringify({ seed, ranking: ranked.map((r) => r.letter), verdicts }, null, 2);
}

async function main(): Promise<void> {
  const res = await fetch(new URL("./letters.json", import.meta.url).href);
  const map: Letters = await res.json();
  const letters = Object.keys(map.letters).sort();
  seedEl.textContent = `seed ${map.seed} - ${letters.length} arm(s) - tape ${TAPE}`;
  const cards = letters.map((l) => makeCard(l, letters.length));
  for (const c of cards) grid.append(c.box);
  layout(cards);
  for (const c of cards) openFrame(c, map.letters[c.letter]);
  layout(cards);
  window.addEventListener("resize", () => layout(cards));
  setInterval(() => poll(cards), 500);
  poll(cards);
  goBtn.addEventListener("click", () => {
    for (const c of cards) c.frame.contentWindow?.postMessage("go", "*");
    goBtn.disabled = true;
    statusEl.textContent = "running";
  });
  copyBtn.addEventListener("click", () => {
    const text = verdictText(cards, map.seed);
    out.textContent = text;
    panel.hidden = false;
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  });
  closeBtn.addEventListener("click", () => { panel.hidden = true; });
}

void main();
