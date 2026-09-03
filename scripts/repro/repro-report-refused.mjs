// What does a player SEE when the rules refuse their report?
//
//   PREVIEW_URL=http://localhost:5176 DIST_DIR=dist-before OUT_NAME=refused-before \
//     node scripts/repro/repro-report-refused.mjs
//
// WHY THIS EXISTS
// `refused` and `failed` shared one sentence and one retry button until
// 2026-09-03, and nothing in this repo could have shown it: `vitest.config.ts`
// runs the node environment over `*.test.ts`, so the sheet cannot be rendered
// and read back. The operator's standing law is that a UI change is eyeballed
// before and after, so this drives a REAL send down a REAL 403 and photographs
// the screen at the end of it.
//
// HOW IT FORCES THE 403, and why the stub is where it is
// The refusal has to come from the transport, not from a fake component: the
// point is the artifact, not a mock of it. So the iframe's own `fetch` is
// replaced before the send - auth is answered so an identity exists (otherwise
// the outcome is `failed`, which is the OTHER screen and would prove nothing),
// and the Firestore write is answered 403, which is exactly what the rules
// block returns for an oversized field.
//
// THE CONTROL: the same harness run with `--control` answers the write 200
// instead. It must produce the THANKS screen with no retry button. Without it a
// probe that had broken the sheet entirely would still photograph something
// sad-looking and read as a pass.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5180";
const DIST_DIR = process.env.DIST_DIR ?? "dist";
const OUT_NAME = process.env.OUT_NAME ?? "report-refused";
const CONTROL = process.argv.includes("--control");
const OUT = "screenshots";
const TMP = "/tmp/ellaz-report-refused";

mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const WRITE_STATUS = CONTROL ? 200 : 403;

const harness = `<!doctype html><meta charset="utf-8"><title>probe-pending</title>
<style>html,body{margin:0;padding:0}</style>
<iframe id="f" src="/games/snake/" style="width:390px;height:844px;border:0"></iframe>
<script>
(async () => {
  const out = { control: ${CONTROL} };
  const f = document.getElementById("f");
  await new Promise((r) => f.addEventListener("load", r, { once: true }));
  const d = f.contentDocument;
  const w = f.contentWindow;
  out.framePath = d ? d.location.pathname : null;
  out.frameLoaded = !!d && d.location.pathname.includes("/games/snake/");

  // The stub. Same-origin, so this really does replace the fetch the bundle
  // will call. Anything not Google goes to the real one - the page is still
  // loading its own chunks.
  const real = w.fetch.bind(w);
  const body = (o) => JSON.stringify(o);
  w.fetch = async (url, init) => {
    const u = String(url && url.url ? url.url : url);
    const headers = { "content-type": "application/json", date: new Date().toUTCString() };
    if (u.includes("identitytoolkit") || u.includes("securetoken")) {
      out.authCalls = (out.authCalls || 0) + 1;
      return new w.Response(body({ localId: "probe-uid", idToken: "probe-token", refreshToken: "probe-refresh", access_token: "probe-token" }), { status: 200, headers });
    }
    if (u.includes("firestore.googleapis.com")) {
      out.writeCalls = (out.writeCalls || 0) + 1;
      out.writeStatus = ${WRITE_STATUS};
      return new w.Response(body(${WRITE_STATUS} === 200 ? { name: "projects/x/databases/(default)/documents/reports/u/items/28333338" } : { error: { code: 403, message: "Missing or insufficient permissions." } }), { status: ${WRITE_STATUS}, headers });
    }
    return real(url, init);
  };

  for (let i = 0; i < 80; i++) {
    const b = d.querySelector("[data-report]");
    if (b && !b.hidden) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const btn = d.querySelector("[data-report]");
  out.buttonPresent = !!btn;
  if (btn) {
    btn.click();
    for (let i = 0; i < 80 && !d.querySelector("[data-report-sheet]"); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const dlg = d.querySelector("[data-report-sheet]");
  out.sheetOpened = !!dlg;

  // BY THE STABLE HOOK. A caption selector would break on a reworded button and
  // then fail for the wrong reason.
  const send = dlg && dlg.querySelector("[data-report-send]");
  out.sendPresent = !!send;
  if (send) {
    send.click();
    // Wait for the RESULT screen, which is the send button going away.
    for (let i = 0; i < 100; i++) {
      if (!d.querySelector("[data-report-send]")) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const after = d.querySelector("[data-report-sheet]");
  out.resultText = after ? (after.innerText || after.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 200) : "";
  out.buttons = after ? [...after.querySelectorAll("button")].map((b) => (b.innerText || b.textContent).trim()) : [];
  document.title = "PROBE" + JSON.stringify(out);
})();
</script>`;

const harnessPath = `${DIST_DIR}/__report-refused.html`;
writeFileSync(harnessPath, harness);

function chrome(args) {
  return execFileSync("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--user-data-dir=${TMP}/profile`, ...args,
  ], { encoding: "utf8", timeout: 120_000, stdio: ["ignore", "pipe", "pipe"] });
}

console.log(`probing ${BASE} (${DIST_DIR}) - write answers ${WRITE_STATUS}${CONTROL ? "  [CONTROL]" : ""}`);

let dom = "";
try {
  dom = chrome(["--window-size=420,900", "--virtual-time-budget=30000", "--dump-dom", `${BASE}/__report-refused.html`]);
} catch (e) {
  rmSync(harnessPath, { force: true });
  console.error("chrome failed:", String(e.message ?? e).slice(0, 300));
  process.exit(1);
}

const m = /PROBE(\{.*?\})<\/title>/s.exec(dom);
if (!m) {
  rmSync(harnessPath, { force: true });
  console.log(`  FAIL  the probe never ran - is a preview up on ${BASE}?`);
  process.exit(1);
}
const r = JSON.parse(m[1]);
console.log("  probe saw:", JSON.stringify(r).slice(0, 400));

let fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  ${detail}`}`);
  if (!ok) fail++;
};

check("CONTROL - the harness reached the game page", r.frameLoaded, `path=${r.framePath}`);
check("the sheet opened", r.sheetOpened);
check("a real send went down the stubbed transport", r.writeCalls >= 1, `writeCalls=${r.writeCalls}`);
check("and it was answered as intended", r.writeStatus === WRITE_STATUS, `status=${r.writeStatus}`);

try {
  chrome([
    "--window-size=420,900", "--force-device-scale-factor=2",
    "--virtual-time-budget=30000",
    `--screenshot=${OUT}/${OUT_NAME}.png`,
    `${BASE}/__report-refused.html`,
  ]);
  console.log(`  shot: ${OUT}/${OUT_NAME}.png`);
} catch {
  console.log("  (screenshot failed - the readings above still stand)");
}

rmSync(harnessPath, { force: true });
console.log(`  result screen said: ${JSON.stringify(r.resultText)}`);
console.log(`  buttons on it: ${JSON.stringify(r.buttons)}`);
process.exit(fail === 0 ? 0 : 1);
