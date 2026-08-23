#!/usr/bin/env node
/**
 * Reproducer - the design bench on the phone it exists for, found 2026-08-22.
 *
 * RUNNABLE, and it asserts. Against a served build:
 *
 *     npm run build && npm run preview &
 *     node scripts/repro/repro-bench-on-a-phone.mjs http://localhost:5180
 *
 * Exits 1 if any of it comes back. It needs `playwright` and a browser, which
 * this repo does not depend on, so it is a repro rather than a gate -
 * `src/lab/design/the-bench-works-on-a-phone.test.ts` is the part that runs in
 * CI, and it pins the mechanism rather than the rendered behaviour.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REPRODUCES - reported as one sentence, "the lab doesnt do anything i
 * tried moving stuff around", and it was two defects wearing one symptom.
 * Measured on ellaz.fun at 390x844:
 *
 *                                              before          after
 *   a wheel OVER the preview                   scrolled 0px    scrolled 763px
 *   the same wheel 40px lower                  scrolled 1146px    - same -
 *   a knob, at the instant the pointer is up   nothing         --gc-tap: 85px
 *   the same knob 1.2s later                   --gc-tap: 87px     - same -
 *   the viewport INSIDE a "390px" preview      388px           390px
 *
 * 1. An iframe is a separate document, so a swipe that lands on the preview
 *    scrolls THAT page - and a game page is `body{overflow:hidden}`, so it
 *    scrolls nothing and the gesture is eaten. The preview spanned y=182..742,
 *    two thirds of the screen, so the knobs were below the fold behind a dead
 *    zone. `Preview` lays a transparent sheet over the frame.
 *
 * 2. Every knob change REBUILT the 500ms interval that did the applying, so a
 *    drag reset the clock faster than it could tick. `useLiveApply` applies on
 *    the change and polls only for the frame to boot.
 *
 * 3. `* { box-sizing: border-box }` made a 1px border on a `width: 390` frame
 *    preview a 388px viewport, on a bench whose subject is rows that wrap by
 *    ONE pixel. A box-shadow paints and does not lay out.
 *
 * WHY "reachable" is `elementFromPoint` and not a rectangle: the preview is
 * PINNED on a phone, and a pinned preview satisfies every rectangle test while
 * covering the control completely. That is how the pin shipped broken once.
 *
 * ---------------------------------------------------------------------------
 * DRIVEN BY ROUTE, NOT BY TAB LABEL - 2026-08-23, and this file is why the
 * rule is written here. It clicked four literal strings ("SHARED · the bar"
 * and friends); the bench was rebuilt as one tap-a-part screen, two of those
 * tabs were deleted and the other two moved to `#/lab/footers`, and this
 * reproducer began timing out on its first line with a message naming the
 * BENCH. A repro that fails because the thing it drives was renamed reads
 * exactly like the thing it drives being broken, which is the one thing a
 * reproducer must never do.
 *
 * So a surface is a ROUTE plus the shape it is expected to have. A route is
 * pinned by `App.tsx` and by a test; a button's caption is prose.
 *
 * The two surfaces also SCROLL DIFFERENTLY on a phone now, and asserting one
 * rule over both would be wrong rather than strict: the inspector is a fixed
 * 100dvh shell whose PAGE deliberately cannot scroll (a knob below a fold is
 * a knob that does not exist), so its scroller is the knob sheet. The footers
 * screen is still an ordinary long page.
 *
 * ---------------------------------------------------------------------------
 * 4. THE DEAD ZONE - this file found it on 2026-08-23 and it is fixed. A swipe
 *    over the preview scrolled NOTHING, across 44% of the screen:
 *
 *                                  before      after
 *      y= 80 (the picture)            0px      123px
 *      y=240 (the picture)            0px      123px
 *      y=400 (the picture)            0px      123px
 *      y=470 (the sheet)            123px      123px
 *
 *    Scroll chaining walks only the ANCESTOR chain. The old layout worked by
 *    accident of hierarchy - the page was the scroller, so it was an ancestor
 *    of everything. The fixed shell removed that ancestor deliberately, and
 *    the sheet is a SIBLING, so the gesture had nowhere to go. The preview
 *    zone forwards wheel/touchmove to the sheet now.
 *
 *    Verified with real hit-testing, both arms: shield UP the picture forwards
 *    (123px), shield DOWN - "tap to play" - it stops (0px) and the game owns
 *    the gesture again, because an iframe's events never reach its parent.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:5180";
const SHOT = process.argv[3] || null;
/**
 * route · what it is · does it have knobs · which element is its scroller.
 * `sheet` = the fixed shell (the page cannot scroll; the knob sheet does).
 */
const SURFACES = [
  ["#/lab/buttons", "the bench - tap a part", true, "sheet"],
  ["#/lab/footers", "per-game footers", true, "page"],
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 120)); });

await p.goto(`${BASE}/#/lab/buttons`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);

const fail = [];
const ok = (cond, msg) => { console.log(`${cond ? "  ok  " : "  FAIL"} ${msg}`); if (!cond) fail.push(msg); };

for (const [route, name, knobbed, scroller] of SURFACES) {
  console.log(`\n--- ${name}  (${route})`);
  await p.goto(`${BASE}/${route}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  // The consent bar covers the bottom of any screen on a FIRST visit, and a
  // fresh browser context is always a first visit. The operator dismissed it
  // once and never will again, so a probe that leaves it up measures a state
  // nobody is in - it reported 3 knobs unreachable that were all fine.
  await p.evaluate(() => { const c = document.querySelector(".consent button"); if (c) c.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { document.querySelector("section").scrollTop = 0; });

  const geo = await p.evaluate(() => {
    const de = document.documentElement;
    const s = document.querySelector("section");
    const f = document.querySelector('iframe[title]:not([style*="-9999"])');
    const r = f && f.getBoundingClientRect();
    const wider = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().width > innerWidth + 1)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 20)}`);
    return {
      overflowX: de.scrollWidth - innerWidth,
      wider: wider.slice(0, 4),
      scrollable: s.scrollHeight - s.clientHeight,
      // The fixed shell's own scroller, which is NOT the section.
      sheetScrollable: (() => {
        const d = [...s.querySelectorAll("div")].find((x) => getComputedStyle(x).overflowY === "auto");
        return d ? d.scrollHeight - d.clientHeight : null;
      })(),
      frame: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) } : null,
      innerW: f && f.contentWindow ? f.contentWindow.innerWidth : null,
      ranges: document.querySelectorAll('input[type="range"]').length,
    };
  });
  ok(geo.overflowX <= 0, `no sideways scroll (overflow ${geo.overflowX}${geo.wider.length ? " " + geo.wider.join(",") : ""})`);
  if (geo.frame) {
    ok(geo.frame.w <= 390, `preview fits the screen (${geo.frame.w}px wide on 390)`);
    ok(geo.innerW === 390 || geo.innerW === 1100, `the frame is still a real viewport inside (innerWidth ${geo.innerW})`);
  }

  // The fixed shell is SUPPOSED to have a page that cannot scroll - that is
  // the fix, not a regression - so assert the shape each surface claims.
  if (scroller === "sheet") {
    ok(geo.scrollable === 0, `the page itself cannot scroll (${geo.scrollable}px) - there is no fold to be below`);
    ok(geo.sheetScrollable !== null, `the knob sheet is the one scroller (${geo.sheetScrollable}px of travel)`);
  }

  // THE defect: a swipe over the preview must scroll SOMETHING.
  if (geo.frame && (geo.scrollable > 0 || geo.sheetScrollable > 0)) {
    const y = Math.min(830, Math.max(20, Math.round((geo.frame.top + geo.frame.bottom) / 2)));
    await p.mouse.move(195, y);
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(350);
    const moved = await p.evaluate(() => {
      const s = document.querySelector("section");
      const d = [...s.querySelectorAll("div")].find((x) => getComputedStyle(x).overflowY === "auto");
      return Math.max(s.scrollTop, d ? d.scrollTop : 0);
    });
    ok(moved > 100, `a swipe OVER the preview scrolls the lab (scrollTop ${moved} after a wheel at y=${y})`);
  }

  if (knobbed) {
    // The footer standard is behind an "apply the standard" checkbox, and the
    // knobs are deliberately inert until it is ticked. Arm it, or the probe
    // measures the checkbox rather than the knob.
    const arm = p.locator('input[type="checkbox"]');
    if (await arm.count()) { await arm.first().check(); await p.waitForTimeout(1200); }
    // Every knob must be reachable by scrolling.
    const reach = await p.evaluate(() => {
      const rs = [...document.querySelectorAll('input[type="range"]')];
      if (!rs.length) return { n: 0, reachable: 0 };
      const s = document.querySelector("section");
      // "Reachable" means the finger lands on the KNOB - not merely that its
      // rectangle is inside the viewport. A sticky preview pinned to the top
      // satisfies the rectangle test while covering the control completely.
      let n = 0; const blocked = [];
      for (const r of rs) {
        // `end`, not `center`: the preview is PINNED to the top on a phone, so
        // the middle of the viewport is behind it. A person scrolls until the
        // knob appears in the free strip underneath, which is what this does.
        r.scrollIntoView({ block: "end" });
        const q = r.getBoundingClientRect();
        const hit = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
        // `<=`, not `<`. `block:"end"` lands the bottom EXACTLY on the
        // viewport bottom, so a strict compare reported 0 of 9 unreachable
        // over nine knobs that `elementFromPoint` said were hittable.
        if (q.top > 0 && q.bottom <= innerHeight + 0.5 && hit === r) n++;
        else blocked.push((hit && hit.tagName) + "." + String((hit && hit.className) || "").slice(0, 16));
      }
      // How much room is left to work in under a pinned preview.
      const f = document.querySelector('iframe[title]:not([style*="-9999"])');
      const pinned = f && getComputedStyle(f.closest("div[style]").parentElement).position === "sticky";
      // Only meaningful while it is pinned; unpinned the frame runs past the
      // fold and the number is a negative nobody should read.
      const strip = pinned ? Math.round(innerHeight - f.getBoundingClientRect().bottom) : null;
      s.scrollTop = 0;
      return { n: rs.length, reachable: n, blocked: blocked.slice(0, 3), pinned: !!pinned, strip };
    });
    ok(reach.n > 0 && reach.reachable === reach.n, `every knob is reachable by finger (${reach.reachable}/${reach.n}${reach.blocked && reach.blocked.length ? " blocked by " + reach.blocked.join(",") : ""}) · ${reach.pinned ? reach.strip + "px free under the pinned preview" : "not pinned"}`);

    // And a knob must land while you are still dragging it.
    const r0 = p.locator('input[type="range"]').first();
    await p.evaluate(() => document.querySelector('input[type="range"]').scrollIntoView({ block: "end" }));
    await p.waitForTimeout(250);
    const box = await r0.boundingBox();
    const before = await p.evaluate(() => {
      const f = document.querySelector('iframe[title]:not([style*="-9999"])');
      const d = f && f.contentDocument;
      return d ? (d.body.getAttribute("style") || "") + "|" + (d.getElementById("fk-standard")?.textContent || "") : "?";
    });
    await p.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.92, box.y + box.height / 2, { steps: 10 });
    await p.waitForTimeout(60); // still HOLDING the slider
    const during = await p.evaluate(() => {
      const f = document.querySelector('iframe[title]:not([style*="-9999"])');
      const d = f && f.contentDocument;
      return d ? (d.body.getAttribute("style") || "") + "|" + (d.getElementById("fk-standard")?.textContent || "") : "?";
    });
    await p.mouse.up();
    let i = 0; while (i < before.length && before[i] === during[i]) i++;
    ok(during !== before, `the knob lands WHILE dragging (differs at ${i}: "${before.slice(i, i + 34)}" -> "${during.slice(i, i + 34)}")`);
  }
}

if (SHOT) {
  await p.goto(`${BASE}/#/lab/buttons`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  await p.evaluate(() => { const c = document.querySelector(".consent button"); if (c) c.click(); });
  const row = p.locator("button", { hasText: "the game row" }).first();
  if (await row.count()) { await row.click(); await p.waitForTimeout(2500); }
  await p.screenshot({ path: SHOT, fullPage: true });
}
console.log("\npage errors:", errs.length ? errs.slice(0, 4) : "none");
console.log(fail.length ? `\nFAILED ${fail.length}` : "\nALL GREEN");
await b.close();
process.exit(fail.length ? 1 : 0);
