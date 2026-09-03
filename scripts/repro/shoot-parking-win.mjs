// Photograph what a player actually sees the moment a game is WON, on the
// built artifact, in a browser.
//
//   npx vite build --outDir=dist-win
//   npx vite preview --outDir=dist-win --port 5176 --strictPort &
//   PREVIEW_URL=http://localhost:5176 DIST_DIR=dist-win \
//     node scripts/repro/shoot-parking-win.mjs
//
// WHY THIS EXISTS
// The operator's own report, filed as issue #22: "Show a win screen with
// restart and share so users have actions to do when game is finished." A
// screenshot of a game mid-play cannot answer that; only the won board can.
//
// HOW THE WIN IS REACHED
// Not by solving a dealt board - `newGame` is a randomised search, so the
// board a probe gets is not the board it planned for. A SESSION is planted
// instead: `ellaz:parking:session` holds a real `{v, at, s}` envelope carrying
// a legal six-car easy board that is one slide from solved, which the game
// restores through its OWN `SessionSpec.validate`. Two taps then win it. So
// the shot is of the real win path - the real `winMoment`, the real payout,
// the real chip - and nothing about the ending is faked.
//
// THE CONTROL
// A board this script cannot win must not photograph as a win. Every scene
// reports `solved`, read from the live DOM, and `--control` plants the SAME
// board with the exit lane BLOCKED, where the second tap is refused: it must
// come back solved=false. Without it, a rig that silently failed to tap would
// produce a perfectly plausible picture of a game still in progress.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5176";
const DIST_DIR = process.env.DIST_DIR ?? "dist-win";
const OUT = process.env.OUT_DIR ?? "screenshots/parking-win";
const TMP = "/tmp/ellaz-parking-win";

mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const SIZE = 6;
const cell = (r, c) => r * SIZE + c;

/** A legal easy board (6 cars), player at row 2 col 2, exit lane clear. */
const winnable = {
  size: 6,
  exitRow: 2,
  cars: [
    { id: 0, axis: "h", len: 2, row: 2, col: 2 },
    { id: 1, axis: "v", len: 2, row: 0, col: 0 },
    { id: 2, axis: "v", len: 3, row: 3, col: 1 },
    { id: 3, axis: "h", len: 2, row: 0, col: 2 },
    { id: 4, axis: "h", len: 3, row: 5, col: 3 },
    { id: 5, axis: "v", len: 2, row: 3, col: 5 },
  ],
  selected: null,
  moves: 0,
  history: [],
};

/** The control: car 5 sits ACROSS the exit lane, so the same taps cannot win. */
const blocked = {
  ...winnable,
  cars: winnable.cars.map((c) => (c.id === 5 ? { ...c, row: 1, col: 5, len: 2 } : c)),
};

function harness({ board, theme }) {
  const envelope = JSON.stringify({ v: 1, at: Date.now(), s: { level: "easy", state: board } });
  return `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}</style>
<script>
  try {
    localStorage.setItem("ellaz:consent:v1", "denied");
    localStorage.setItem("ellaz:parking:level", JSON.stringify("easy"));
    localStorage.setItem("ellaz:parking:session", ${JSON.stringify(envelope)});
    ${theme ? `localStorage.setItem("ellaz:theme", ${JSON.stringify(theme)});` : ""}
  } catch {}
</script>
<iframe id="f" src="/games/parking/" style="width:390px;height:844px;border:0"></iframe>
<script>
(async () => {
  const out = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const f = document.getElementById("f");
  await new Promise((r) => f.addEventListener("load", r, { once: true }));
  const d = f.contentDocument;
  out.path = d ? d.location.pathname : null;

  // The board is what proves the plant was adopted: 36 cells, in index order.
  let cells = [];
  for (let i = 0; i < 120; i++) {
    cells = [...d.querySelectorAll('button[aria-label]')].filter((b) => /\\d-\\d$/.test(b.getAttribute('aria-label')));
    if (cells.length === 36) break;
    await sleep(100);
  }
  out.cells = cells.length;
  out.restored = cells.length === 36 ? cells[${cell(2, 2)}].getAttribute('aria-label') : null;

  if (cells.length === 36) {
    cells[${cell(2, 2)}].dispatchEvent(new f.contentWindow.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    await sleep(250);
    cells[${cell(2, 5)}].dispatchEvent(new f.contentWindow.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    // The car drives out (420ms), then winMoment runs, then the confetti.
    // 4s rather than 2.2: the two arms are photographed by SEPARATE chrome
    // runs, so a wait that only just clears the animation photographs one arm
    // mid-drive and the other settled - a second variable in a pair that is
    // supposed to have one.
    await sleep(4000);
  }

  const body = d.body;
  out.text = (body.innerText || body.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 400);
  // The youWon string itself, en and he. Written /You won/ first,
  // which reads as 'the board was not won' on a board that WAS - the shipped
  // string is 'You win!'. See a-diagnostic-that-truncates-what-it-compares.md.
  out.solved = /You win!|כל הכבוד!/.test(out.text);
  out.buttons = [...d.querySelectorAll('button')]
    .map((b) => (b.innerText || b.textContent || '').trim().replace(/\\s+/g, ' '))
    .filter(Boolean).slice(0, 14);
  document.title = "PROBE" + JSON.stringify(out);
})();
</script>`;
}

function chrome(args) {
  return execFileSync("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--user-data-dir=${TMP}/profile`, ...args,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
}

const scenes = [
  { id: "win-market", board: winnable, theme: null, wantSolved: true },
  { id: "win-night", board: winnable, theme: "night", wantSolved: true },
  { id: "control-blocked", board: blocked, theme: null, wantSolved: false },
];

let bad = 0;
for (const s of scenes) {
  writeFileSync(`${DIST_DIR}/__win.html`, harness(s));
  let dom = "";
  try {
    dom = chrome(["--window-size=420,900", "--virtual-time-budget=30000", "--dump-dom", `${BASE}/__win.html`]);
  } catch (e) {
    console.log(`  FAIL  ${s.id}: chrome ${String(e.message ?? e).slice(0, 120)}`);
    bad++;
    continue;
  }
  const m = dom.match(/<title>PROBE(.*?)<\/title>/s);
  if (!m) {
    console.log(dom.includes("__win")
      ? `  FAIL  ${s.id}: the harness ran and never reported`
      : `  FAIL  ${s.id}: the harness was NOT served - is preview pointed at ${DIST_DIR}? use --outDir=${DIST_DIR}, the space form is dropped`);
    bad++;
    continue;
  }
  const r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  const ok = r.solved === s.wantSolved && r.cells === 36;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${s.id}: cells=${r.cells} restored=${r.restored} solved=${r.solved} (want ${s.wantSolved})`);
  console.log(`        buttons: ${JSON.stringify(r.buttons)}`);
  console.log(`        text: ${r.text.slice(0, 200)}`);
  if (s.wantSolved) {
    chrome(["--window-size=420,900", "--force-device-scale-factor=2", "--virtual-time-budget=30000",
      `--screenshot=${OUT}/${s.id}.png`, `${BASE}/__win.html`]);
    console.log(`        shot: ${OUT}/${s.id}.png`);
  }
}
rmSync(`${DIST_DIR}/__win.html`, { force: true });
console.log(bad === 0 ? "\nall scenes agreed with their control" : `\n${bad} scene(s) disagreed`);
process.exit(bad === 0 ? 0 : 1);
