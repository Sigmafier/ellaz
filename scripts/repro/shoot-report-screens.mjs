// Photograph EVERY screen the reporting feature can put in front of a player,
// on the built artifact, in a browser.
//
//   npx vite build --outDir dist-screens
//   npx vite preview --outDir dist-screens --port 5176 --strictPort &
//   PREVIEW_URL=http://localhost:5176 DIST_DIR=dist-screens \
//     node scripts/repro/shoot-report-screens.mjs
//
// WHY NOT MOCKS
// `.claude/rules/a-build-gate-that-never-runs-the-artifact.md`. A drawing of a
// screen proves nothing about the screen; this drives the real bundle and the
// real transport, and each scene reports back what it actually saw so a shot
// that captured the WRONG thing says so rather than looking plausible.
//
// HOW EACH OUTCOME IS FORCED
// The iframe's own `fetch` is replaced - same origin, so it really is the fetch
// the bundle calls. Auth is answered so an identity exists, and the Firestore
// write is answered with the status this scene wants: 200 -> sent, 409 ->
// throttled, 403 -> refused. `failed` is forced one layer up, by refusing AUTH,
// because that is the real shape of it: no identity, no report.
//
// THE CRASH SCENES need a game that throws during render, which no stub can do
// from outside. They are captured on an arm built with one game's renderer
// deliberately throwing - see `--crash`, and the caller that builds that arm.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5176";
const DIST_DIR = process.env.DIST_DIR ?? "dist-screens";
const OUT = process.env.OUT_DIR ?? "screenshots/report-screens";
const ONLY = process.env.ONLY ?? "";
const TMP = "/tmp/ellaz-report-screens";

mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

/** page: what the iframe loads · locale/theme: written to storage first ·
 *  auth/write: the stubbed statuses · act: what to click, by stable hook. */
const SCENES = [
  { id: "01-entry-game",   page: "/games/snake/",  act: "none",   want: /Snake|Classics/i,
    note: "the flag, beside full-screen - platform chrome, never the game panel" },
  { id: "02-sheet-open",   page: "/games/snake/",  act: "open",   want: /Snake/i,
    note: "step 1: what happened, as taps. No typing is ever required" },
  { id: "03-sheet-typed",  page: "/games/snake/",  act: "type",   want: /Snake/i,
    note: "a reason picked and a sentence typed, 300 chars max" },
  { id: "04-sheet-consent",page: "/games/snake/",  act: "scroll", want: /./,
    note: "step 3: everything that will leave, in words, before the button" },
  { id: "05-result-sent",  page: "/games/snake/",  act: "send",   write: 200, want: /Thank/i },
  { id: "06-result-soon",  page: "/games/snake/",  act: "send",   write: 409, want: /minute|just sent/i },
  { id: "07-result-refused",page:"/games/snake/",  act: "send",   write: 403, want: /won't help|couldn't take/i },
  { id: "08-result-failed",page: "/games/snake/",  act: "send",   auth: 500,  want: /did not send/i },
  { id: "09-crash-card",   page: "/games/memory/", act: "none",   crash: true, want: /went wrong|not your fault/i,
    note: "the boundary catching a REAL throw - no blank rectangle" },
  { id: "10-crash-armed",  page: "/games/memory/", act: "crashreport", crash: true, want: /WHAT HAPPENED|Send/i,
    note: "the crash card's button, opening the sheet already holding the stack" },
  { id: "11-home-entry",   page: "/",              act: "none",   want: /./,
    note: "the same reporter on Home, in the trailing shelf" },
  { id: "12-sheet-hebrew", page: "/he/games/snake/", locale: "he", act: "open", want: /./,
    note: "the RTL arm - the whole sheet mirrors" },
  { id: "13-sheet-night",  page: "/games/snake/",  theme: "night", act: "open", want: /Snake/i,
    note: "night, one tap away on Home - the theme the contrast fix had to clear too" },
  { id: "14-refused-night",page: "/games/snake/",  theme: "night", act: "send", write: 403, want: /won't help/i },
];

function harnessFor(s) {
  const auth = s.auth ?? 200;
  const write = s.write ?? 200;
  return `<!doctype html><meta charset="utf-8"><title>probe-pending</title>
<style>html,body{margin:0;padding:0;background:#fff}</style>
<script>
  // Same origin as the artifact, so this IS the storage the app reads.
  try {
    ${s.locale ? `localStorage.setItem("ellaz:locale", ${JSON.stringify(s.locale)});` : ""}
    ${s.theme ? `localStorage.setItem("ellaz:theme", ${JSON.stringify(s.theme)});` : ""}
    // Answer the consent bar so it is not sitting over every shot. This is a
    // real control the player has; declining is the privacy-preserving arm.
    localStorage.setItem("ellaz:consent:v1", "denied");
  } catch {}
</script>
<iframe id="f" src="${s.page}" style="width:390px;height:844px;border:0"></iframe>
<script>
(async () => {
  const out = { scene: ${JSON.stringify(s.id)} };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const f = document.getElementById("f");
  await new Promise((r) => f.addEventListener("load", r, { once: true }));
  const d = f.contentDocument, w = f.contentWindow;
  out.path = d ? d.location.pathname : null;

  const real = w.fetch.bind(w);
  const hdrs = () => ({ "content-type": "application/json", date: new Date().toUTCString() });
  w.fetch = async (url, init) => {
    const u = String(url && url.url ? url.url : url);
    if (u.includes("identitytoolkit") || u.includes("securetoken")) {
      out.authStatus = ${auth};
      return new w.Response(JSON.stringify(${auth} === 200
        ? { localId: "probe-uid", idToken: "probe-token", refreshToken: "probe-refresh", access_token: "probe-token" }
        : { error: { code: ${auth}, message: "no" } }), { status: ${auth}, headers: hdrs() });
    }
    if (u.includes("firestore.googleapis.com")) {
      out.writeCalls = (out.writeCalls || 0) + 1;
      out.writeStatus = ${write};
      return new w.Response(JSON.stringify(${write} === 200
        ? { name: "projects/x/databases/(default)/documents/reports/u/items/28333338" }
        : { error: { code: ${write}, message: "no" } }), { status: ${write}, headers: hdrs() });
    }
    return real(url, init);
  };

  const waitFor = async (sel, n = 90) => {
    for (let i = 0; i < n; i++) { const e = d.querySelector(sel); if (e) return e; await sleep(100); }
    return null;
  };

  // Give the app time to boot and reveal its chrome whatever the scene does.
  for (let i = 0; i < 90; i++) {
    if (d.querySelector("[data-report]") || d.querySelector("button")) break;
    await sleep(100);
  }
  await sleep(600);

  const act = ${JSON.stringify(s.act)};
  const openSheet = async () => {
    const b = d.querySelector("[data-report]");
    out.entryPresent = !!b;
    if (b) { b.click(); await waitFor("[data-report-sheet]"); }
  };

  if (act === "open" || act === "type" || act === "scroll" || act === "send") await openSheet();

  if (act === "type" || act === "scroll" || act === "send") {
    const box = d.querySelector("[data-report-sheet] textarea");
    out.boxPresent = !!box;
    if (box) {
      // React/preact controlled input: set through the native setter so the
      // framework's own onChange fires. Assigning .value alone is reverted.
      const setter = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, "value").set;
      setter.call(box, "The snake goes through the wall on the left side, only on hard.");
      box.dispatchEvent(new w.Event("input", { bubbles: true }));
      await sleep(300);
    }
  }
  if (act === "scroll") {
    const dlg = d.querySelector("[data-report-sheet]");
    if (dlg) { dlg.scrollTop = dlg.scrollHeight; await sleep(400); out.scrolled = dlg.scrollTop; }
  }
  if (act === "send") {
    const send = d.querySelector("[data-report-send]");
    out.sendPresent = !!send;
    if (send) { send.click(); for (let i = 0; i < 100 && d.querySelector("[data-report-send]"); i++) await sleep(100); }
  }
  if (act === "crashreport") {
    // The crash card's own button, found by its text among the card's buttons -
    // the card has no stable hook, and adding one to ship for a probe is worse
    // than reading it here where a miss is reported rather than silent.
    const btns = [...d.querySelectorAll("button")];
    out.cardButtons = btns.map((b) => (b.innerText || b.textContent || "").trim()).filter(Boolean);
    const tell = btns.find((b) => /^(Tell us|ספרו לנו)$/i.test((b.innerText || b.textContent || "").trim()));
    out.tellPresent = !!tell;
    if (tell) { tell.click(); await waitFor("[data-report-sheet]"); await sleep(400); }
  }

  const dlg = d.querySelector("[data-report-sheet]");
  out.sheetOpen = !!dlg;
  const root = dlg || d.body;
  out.text = (root.innerText || root.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 260);
  out.buttons = [...root.querySelectorAll("button")].map((b) => (b.innerText || b.textContent || "").trim()).filter(Boolean).slice(0, 8);
  document.title = "PROBE" + JSON.stringify(out);
})();
</script>`;
}

function chrome(args) {
  return execFileSync("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--user-data-dir=${TMP}/profile`, ...args,
  ], { encoding: "utf8", timeout: 180_000, stdio: ["ignore", "pipe", "pipe"] });
}

let fail = 0;
const rows = [];
const wantCrash = process.argv.includes("--crash");

for (const s of SCENES) {
  if (ONLY && !s.id.includes(ONLY)) continue;
  // The crash arm is a DIFFERENT build. Running the wrong scene against the
  // wrong arm would photograph a working game and call it a crash card, so the
  // two sets are never mixed in one run.
  if (!!s.crash !== wantCrash) continue;

  const path = `${DIST_DIR}/__shoot.html`;
  writeFileSync(path, harnessFor(s));
  let dom = "";
  try {
    dom = chrome(["--window-size=420,900", "--virtual-time-budget=30000", "--dump-dom", `${BASE}/__shoot.html`]);
  } catch (e) {
    console.log(`  FAIL  ${s.id}: chrome  ${String(e.message ?? e).slice(0, 120)}`);
    fail++; rmSync(path, { force: true }); continue;
  }
  const m = /PROBE(\{.*?\})<\/title>/s.exec(dom);
  if (!m) {
    // TWO different faults produce no PROBE title, and they send you to
    // opposite places - so say which one it was rather than guessing.
    // Measured here twice in one session: `vite preview --outDir X` (space
    // form) silently DROPPED the flag and served `dist/`, so the harness file
    // 404'd into the SPA fallback and every scene read as "never ran".
    const served = dom.includes("probe-pending") || dom.includes("PROBE{");
    console.log(served
      ? `  FAIL  ${s.id}: the harness was SERVED but its script never finished - read the DOM`
      : `  FAIL  ${s.id}: the harness was NOT served (${BASE}/__shoot.html fell through to the SPA) - is the preview pointed at ${DIST_DIR}? use --outDir=${DIST_DIR}, the space form is dropped`);
    fail++; rmSync(path, { force: true }); continue;
  }
  const r = JSON.parse(m[1]);
  // THE PER-SCENE CONTROL: every shot must be able to say it caught the screen
  // it was aiming at. Without this a run of fourteen plausible pictures of the
  // wrong thing reads as a complete set.
  const ok = s.want.test(r.text || "");
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${s.id}  ${JSON.stringify(r.text || "").slice(0, 120)}`);
  rows.push({ id: s.id, note: s.note ?? "", text: r.text, buttons: r.buttons, ok });

  try {
    chrome(["--window-size=420,900", "--force-device-scale-factor=2", "--virtual-time-budget=30000",
      `--screenshot=${OUT}/${s.id}.png`, `${BASE}/__shoot.html`]);
  } catch { console.log(`        (screenshot failed for ${s.id})`); }
  rmSync(path, { force: true });
}

writeFileSync(`${OUT}/scenes.json`, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length} scene(s), ${fail} failed  ->  ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
