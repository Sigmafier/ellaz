// Does the reporter actually OPEN, in a browser, on the built artifact?
//
//   npm run preview &            # dist/ on :5180
//   node scripts/repro/repro-report-opens.mjs
//
// WHY THIS EXISTS
// `.claude/rules/a-build-gate-that-never-runs-the-artifact.md`: a bundle whose
// own module had been stubbed out passed every byte-level assertion in this
// repo and rendered "The game didn't load". Every gate this feature has -
// types, payload, precache, the rules probe - answers "does it contain the
// right things". None answers "does it work".
//
// It drives Chrome headless in WSL, which the operator cannot see, so it also
// SCREENSHOTS what it found. Three assertions, and the third is the one with
// teeth: the button exists, tapping it renders the sheet, and the sheet names
// the game the player was actually on.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const BASE = process.env.PREVIEW_URL ?? "http://localhost:5180";
const PAGE = `${BASE}/games/snake/`;
const OUT = "screenshots";
const TMP = "/tmp/ellaz-report-probe";

mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  ${detail}`}`);
  ok ? pass++ : fail++;
  return ok;
};

// HOW THIS DRIVES THE PAGE, and why it is not the obvious way.
//
// `--evaluate-on-new-document` is a CDP method, NOT a Chrome CLI flag - passing
// it is silently ignored, the probe never runs, and the failure reads exactly
// like "the server is down". Measured here on the first attempt.
//
// So the harness is a page of our own, written into `dist/` (a build output,
// disposable) so it is SAME ORIGIN as the artifact and can reach into an
// iframe's document. It clicks the real button on the real built page and
// reports what it found through the harness's own title, which `--dump-dom`
// can see.
const harness = `<!doctype html><meta charset="utf-8"><title>probe-pending</title>
<iframe id="f" src="/games/snake/" style="width:390px;height:844px;border:0"></iframe>
<script>
(async () => {
  const out = {};
  const f = document.getElementById("f");
  // NEVER short-circuit on readyState. A fresh iframe holds about:blank, which
  // reports "complete" BEFORE it navigates - so a readyState check resolves
  // instantly against a blank document, finds no button, and reports exactly
  // what a genuinely missing button looks like. Measured here: 0 of 5 checks
  // failing against a page whose HTML demonstrably carried the button.
  await new Promise((r) => f.addEventListener("load", r, { once: true }));
  const d = f.contentDocument;
  // The positive control. If this is not the game page, nothing below means
  // anything, and it must say so rather than blaming the button.
  out.framePath = d ? d.location.pathname : null;
  out.frameTitle = d ? d.title : null;
  out.frameLoaded = !!d && d.location.pathname.includes("/games/snake/");
  // The app boots, then reveals the button. Wait for the reveal, not the load.
  for (let i = 0; i < 80; i++) {
    const b = d.querySelector("[data-report]");
    if (b && !b.hidden) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const btn = d.querySelector("[data-report]");
  out.buttonPresent = !!btn;
  out.buttonHidden = btn ? btn.hidden : null;
  out.buttonLabel = btn ? btn.getAttribute("aria-label") : null;
  if (btn) {
    btn.click();
    for (let i = 0; i < 80 && !d.querySelector("[data-report-sheet]"); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  // BY THE STABLE HOOK, not by role: the consent bar is a role="dialog" too,
  // and on a first visit it is the one a role selector finds first. The probe
  // reported "the sheet opened" about the cookie bar until this changed.
  const dlg = d.querySelector("[data-report-sheet]");
  out.sheetOpened = !!dlg;
  out.sheetText = dlg ? (dlg.innerText || dlg.textContent || "").replace(/\\s+/g, " ").slice(0, 400) : "";
  out.buttons = dlg ? [...dlg.querySelectorAll("button")].map((b) => (b.innerText || b.textContent).trim()) : [];
  document.title = "PROBE" + JSON.stringify(out);
})();
</script>`;

const harnessPath = "dist/__report-probe.html";
writeFileSync(harnessPath, harness);

function chrome(args) {
  return execFileSync("google-chrome", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--user-data-dir=${TMP}/profile`, ...args,
  ], { encoding: "utf8", timeout: 120_000, stdio: ["ignore", "pipe", "pipe"] });
}

console.log(`probing ${PAGE}`);

let dom = "";
try {
  dom = chrome([
    "--window-size=420,900",
    "--virtual-time-budget=20000",
    "--dump-dom",
    `${BASE}/__report-probe.html`,
  ]);
} catch (e) {
  rmSync(harnessPath, { force: true });
  console.error("chrome failed:", String(e.message ?? e).slice(0, 300));
  process.exit(1);
}

const m = /PROBE(\{.*?\})<\/title>/s.exec(dom);
if (!m) {
  console.log("  FAIL  the probe never ran - is `npm run preview` up on 5180?");
  process.exit(1);
}
const r = JSON.parse(m[1]);
// Print what the browser actually saw. A probe that reports a failure without
// showing its own reading sends the reader to the wrong place.
console.log("  probe saw:", JSON.stringify(r).slice(0, 300));

// The control first: every assertion under it is meaningless if the harness was
// looking at the wrong document.
const loaded = check(
  "CONTROL - the harness is looking at the game page",
  r.frameLoaded,
  `path=${r.framePath} title=${r.frameTitle}`,
);
check("the report button is emitted on a game page", r.buttonPresent);
check("and the runtime revealed it", r.buttonHidden === false, `hidden=${r.buttonHidden}`);
check("tapping it opens the sheet", r.sheetOpened);
check(
  "the sheet names the game the player was on",
  /snake/i.test(r.sheetText),
  `text was: ${r.sheetText.slice(0, 120)}`,
);
check("and offers a send button", (r.buttons ?? []).length >= 2, (r.buttons ?? []).join(" | "));

// The picture, because a headless browser in WSL is one the operator cannot see.
try {
  chrome([
    "--window-size=420,900", "--force-device-scale-factor=2",
    "--virtual-time-budget=20000",
    `--screenshot=${OUT}/report-live-sheet.png`,
    `${BASE}/__report-probe.html`,
  ]);
  console.log(`  shot: ${OUT}/report-live-sheet.png`);
} catch {
  console.log("  (screenshot failed - the assertions above still stand)");
}

rmSync(harnessPath, { force: true });

if (!loaded) {
  console.log("\nCONTROL FAILED - the harness never reached the game page, so every");
  console.log("failure above is about the harness, not about the reporter.");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
