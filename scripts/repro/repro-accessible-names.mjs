/**
 * label-content-name-mismatch: AN ACCESSIBLE NAME MUST CONTAIN THE VISIBLE TEXT.
 *
 * PLAYWRIGHT IS NOT A DEPENDENCY OF THIS REPO and deliberately is not one - the plan
 * that added the font work refused new packages. Run it from a tree that has one, the
 * same way `e2e-shell-walkthrough.mjs` is run:
 *
 *   mkdir -p ~/<tree-with-playwright>/.e2e && cp scripts/repro/repro-accessible-names.mjs $_
 *   cd $_ && node repro-accessible-names.mjs https://ellaz.fun/
 *   cd $_ && node repro-accessible-names.mjs https://ellaz.fun/ --control   # prove it can fire
 *
 * A voice-control user says what they can see. If a card reads "My world / Coins: 3 /
 * Enter" and its aria-label says only "My world", none of those phrases activates it -
 * and the label also REPLACES the contents, so a screen reader loses the coin count.
 *
 * WHY THIS FILE EXISTS RATHER THAN A CONSOLE SNIPPET. It was written four times on
 * 2026-09-07 and was wrong three of them, each time producing a confident number:
 *
 *   counted the emoji            "🎲 All" vs aria-label "All" is NOT a finding  -> 12
 *   counted the aria-hidden art  the SVG digits inside a game tile are not
 *                                visible text to a screen reader                ->  9
 *   pasted a literal U+2000      the character arrived as a plain space, so the
 *                                class became [ -⁯] and stripped every
 *                                LETTER on the page. Every element's visible text
 *                                became "", nothing could mismatch, and the
 *                                PLANTED CONTROL READ PASS                      ->  0
 *
 * The fourth, below, agrees with axe: the accessible name is only lowercased, while the
 * visible text also loses emoji and punctuation and is read with aria-hidden subtrees
 * skipped. Every non-ASCII codepoint in the patterns is a \\u escape, built through
 * `new RegExp` from an ASCII source string, because a pasted literal is mangled in
 * transit every single time.
 *
 * Known survivor on ellaz: Tic-Tac-Toe. Its name contains the visible words in the
 * order they are read and differs only because axe strips the hyphens. There is no
 * name a person would write that satisfies it, so it is left and recorded.
 */
import { chromium } from "playwright";

const URL = process.argv.find((a) => a.startsWith("http")) ?? "https://ellaz.fun/";
const CONTROL = process.argv.includes("--control");

/* The page-side check. Kept as one string so the escapes survive the trip intact. */
const PROBE = `(() => {
  const EMOJI = new RegExp("\\\\p{Extended_Pictographic}|\\\\uFE0F|\\\\u200D|[\\\\u{1F3FB}-\\\\u{1F3FF}]", "gu");
  const PUNCT = new RegExp("[\\\\u2000-\\\\u206F\\\\u2E00-\\\\u2E7F'!\\"#$%&()*+,\\\\-./:;<=>?@\\\\[\\\\]^_\`{|}~\\\\u2018\\\\u2019\\\\u201C\\\\u201D\\\\u00B7\\\\u2022\\\\u2605\\\\u2606]", "g");
  function srText(el) {                    // what a screen reader would read
    let out = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { out += n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      if (n.getAttribute && n.getAttribute("aria-hidden") === "true") continue;
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      out += " " + srText(n);
    }
    return out;
  }
  const acc = (e) => (e.getAttribute("aria-label") || "").replace(/\\s+/g, " ").trim().toLowerCase();
  const vis = (e) => srText(e).toLowerCase().replace(EMOJI, "").replace(PUNCT, "").replace(/\\s+/g, " ").trim();
  const els = [...document.querySelectorAll("a[aria-label],button[aria-label],[role=button][aria-label]")]
    .filter((e) => e.getClientRects().length);
  const bad = els.filter((e) => { const v = vis(e); return v && !acc(e).includes(v); });

  /* Three controls, because a green run from a broken matcher looks identical to a
     green run from a clean page - and that exact confusion happened here. */
  const mk = (label, text, hidden) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", label);
    b.innerHTML = hidden ? '<span aria-hidden="true">' + hidden + '</span> ' + text : text;
    document.body.appendChild(b);
    const v = vis(b), fired = !!v && !acc(b).includes(v);
    b.remove();
    return fired;
  };
  return {
    population: els.length,
    controls: {
      planted_mustBeTrue:      mk("zzz", "planted mismatch"),
      emojiIgnored_mustBeFalse: mk("all games, everything", "All games", "\\u{1F3B2}"),
      ariaHiddenIgnored_mustBeFalse: mk("sudoku, not played yet", "Sudoku", "5 9 7 2 4"),
    },
    failing: bad.map((e) => ({ tag: e.tagName.toLowerCase(), name: acc(e), visible: vis(e) })),
  };
})()`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(3500);

if (CONTROL) {
  // Plant a real mismatch in the page and require the probe to report it. A gate
  // first run after a fix cannot be told apart from a gate that never fires.
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "#"; a.setAttribute("aria-label", "control");
    a.textContent = "PLANTED VISIBLE TEXT";
    a.style.cssText = "position:fixed;top:0;left:0;z-index:9999";
    document.body.appendChild(a);
  });
}

const r = await page.evaluate(PROBE);
await browser.close();

const ctl = r.controls;
const ctlOk = ctl.planted_mustBeTrue && !ctl.emojiIgnored_mustBeFalse && !ctl.ariaHiddenIgnored_mustBeFalse;

console.log(`\n${URL}`);
console.log(`  population        ${r.population} labelled, rendered controls`);
console.log(`  controls          planted=${ctl.planted_mustBeTrue} emoji=${ctl.emojiIgnored_mustBeFalse} ariaHidden=${ctl.ariaHiddenIgnored_mustBeFalse}`);
if (!ctlOk) {
  console.log("\nABORT: the matcher is broken - its own controls disagree. Every number above is worthless.");
  process.exit(2);
}
for (const f of r.failing) console.log(`  MISMATCH  name "${f.name}"  <-  visible "${f.visible}"`);
if (CONTROL) {
  const found = r.failing.some((f) => f.visible.includes("planted visible text"));
  console.log(found ? "\nCONTROL OK  the planted mismatch was reported." : "\nCONTROL FAILED  the planted mismatch was NOT reported.");
  process.exit(found ? 0 : 1);
}
console.log(`\n${r.failing.length} mismatch(es).`);
process.exit(r.failing.length > 1 ? 1 : 0);   // 1 known survivor: Tic-Tac-Toe
