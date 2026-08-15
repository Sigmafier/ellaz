// Does any seat hang off the felt?
//
// On a 1440-wide screen the operator's table drew "Clever Fox 190" with its
// nameplate cut off by the right edge of the window. Seats sit on an ellipse
// at rx 42% of the felt and are CENTRED on that point, so half a nameplate
// hangs outside — and the nameplate scales with the table, so the wider the
// screen the further out it goes.
//
// Measures per seat rather than per row: a box wider than its container is the
// loud version, and a box whose CENTRE is inside while its edge is outside is
// the one that actually shipped.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const SIZES = [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
  [900, 600],
  [844, 390], // landscape phone
  [390, 844], // portrait phone
];

const browser = await chromium.launch({ headless: true });

for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("holdem:bots", "1"));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => (location.hash = "#/room/PRACT"));
  await page.waitForTimeout(4000);

  const r = await page.evaluate(() => {
    const felt = document.getElementById("felt");
    if (!felt) return null;
    const f = felt.getBoundingClientRect();
    const win = { w: innerWidth, h: innerHeight };
    const out = [];
    for (const el of document.querySelectorAll('[id^="seat-"]')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0) continue;
      out.push({
        id: el.id,
        // Against the WINDOW, which is what actually clips — the felt has no
        // overflow of its own, its parent does.
        offLeft: Math.round(Math.max(0, 0 - b.left)),
        offRight: Math.round(Math.max(0, b.right - win.w)),
        offTop: Math.round(Math.max(0, 0 - b.top)),
        offBottom: Math.round(Math.max(0, b.bottom - win.h)),
        w: Math.round(b.width),
      });
    }
    return { felt: { w: Math.round(f.width), h: Math.round(f.height) }, seats: out };
  });

  if (!r) {
    console.log(`${w}x${h}: no felt`);
    await ctx.close();
    continue;
  }
  const bad = r.seats.filter((s) => s.offLeft || s.offRight || s.offTop || s.offBottom);
  const widest = Math.max(...r.seats.map((s) => s.w));
  console.log(
    `${String(w).padStart(4)}x${String(h).padEnd(4)} felt ${r.felt.w}x${r.felt.h}  widest seat ${widest}px  ` +
      (bad.length ? `CLIPPED ${bad.length}: ${bad.map((s) => `${s.id}(${s.offLeft || s.offRight || s.offTop || s.offBottom}px)`).join(" ")}` : "all inside"),
  );
  await ctx.close();
}

await browser.close();
