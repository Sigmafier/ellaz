/**
 * The reach board's copy button, driven the way the operator uses it: a phone-width
 * viewport, a real tap, and the CLIPBOARD read back and compared to the draft.
 *
 * WHY A UNIT CONTROL CANNOT COVER THIS. `build-reach-site.mjs --control` asserts the
 * post text is in the page and that every block has a button. Neither says the button
 * copies, and neither can see the failure this exists for: the page escapes `&` to
 * `&amp;` on the way in, so a button copying an ATTRIBUTE rather than the rendered
 * `textContent` would put `&amp;` into a Facebook group - a valid page, a working
 * button, and a mangled post. The comparison here is byte-exact against `posts.mjs`.
 *
 * It also measures what a desktop cannot report: sideways scroll at 390px, an element
 * wider than its frame, and a tap target under the 40px this app's own tokens ask for.
 *
 *   node scripts/repro/repro-reach-board-copy.mjs        # exits 1 on any failure
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { loadPosts } from "../reach/posts.mjs";
import { buildPages } from "../reach/build-reach-site.mjs";
import { loadRecord } from "../reach/backlinks.mjs";
import { rows as ledgerRows } from "../outreach-ledger.mjs";

/**
 * THE CONTROL POST, and it is the reason this probe builds its own page instead of
 * reading `dist-reach/`. Not one of the seven real posts contains `&`, `<` or `>` -
 * only `"`, which a text node serialises back UNESCAPED - so a handler mutated from
 * `textContent` to `innerHTML` copies identical bytes and the whole escaping check
 * passes over a bug it cannot reach. Measured 2026-08-23: that mutation SURVIVED.
 * This post makes the escaping path real, and the same mutation now reds.
 */
const CONTROL = {
  file: "control", declared: 1,
  posts: [{ file: "control", heading: "Post 0 - the escaping control", where: "nowhere - this is a probe fixture",
    title: "", body: 'Tom & Jerry <b>bold</b> "quoted" 5 > 3 ומשהו בעברית' }],
};

const real = loadPosts(".", ["hebrew.md", "reddit.md"]);
const want = [...real, CONTROL].flatMap((f) => f.posts);
if (want.length < 2) { console.error("repro: ZERO real posts parsed - nothing to compare against."); process.exit(1); }

const built = await buildPages(readFileSync("docs/outreach/backlinks.md", "utf8"), loadRecord(),
  { offline: true, surfaces: ledgerRows("."), posts: [...real, CONTROL] });
const body = Buffer.from(built.files["index.html"]);
const srv = createServer((_, res) => { res.setHeader("content-type", "text/html; charset=utf-8"); res.end(body); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: `http://127.0.0.1:${port}` });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });

const fail = [];
const ok = (cond, name, got = "") => { console.log(`${cond ? "  ok  " : "FAIL  "}${name}${cond ? "" : `  <- ${got}`}`); if (!cond) fail.push(name); };

const layout = await page.evaluate(() => ({
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  wide: [...document.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().width > innerWidth + 1).length,
  small: [...document.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().height < 40).length,
  buttons: document.querySelectorAll("button").length,
  rtl: getComputedStyle(document.querySelector("li.post pre")).direction,
}));
ok(!layout.sideways, "no sideways scroll at 390px");
ok(layout.wide === 0, "nothing wider than the frame", `${layout.wide} element(s)`);
ok(layout.buttons > 0, "the page has copy buttons at all", `${layout.buttons}`);
ok(layout.small === 0, "every button clears a 40px tap target", `${layout.small} under`);
ok(layout.rtl === "rtl", "the Hebrew post renders RTL", layout.rtl);

// The one that matters: TAP it, then read the clipboard, then compare to the draft.
const buttons = await page.locator("li.post button").all();
let checked = 0;
for (const [i, b] of buttons.entries()) {
  const label = (await b.textContent()).trim();
  if (!label.startsWith("copy the post")) continue;
  await b.tap();
  const got = await page.evaluate(() => navigator.clipboard.readText());
  const hit = want.find((p) => p.body === got);
  ok(!!hit, `button ${i} copies a draft post BYTE-EXACT`, `${got.length}B, no draft matches`);
  ok(!/&(amp|lt|gt|quot);/.test(got), `button ${i} copies no HTML escapes`, got.slice(0, 60));
  checked++;
}
// The positive control: a run that tapped nothing passes every assertion above.
ok(checked === want.length, `every parsed post was tapped`, `${checked} tapped / ${want.length} parsed`);
// ...and the control specifically, by name, so a run that lost it says so.
const gotControl = await page.evaluate(() => [...document.querySelectorAll("li.post pre")]
  .some((e) => e.textContent.includes("Tom & Jerry <b>bold</b>")));
ok(gotControl, "the escaping control post is on the page", "absent - the probe cannot see an escaping bug");

await browser.close(); srv.close();
console.log(fail.length ? `\n${fail.length} FAILED\n` : `\nOK  the board copies what the drafts say, at phone width.\n`);
process.exit(fail.length ? 1 : 0);
