// Drive the home screen and prove the bots switch does what it says.
//
// Two directions, because a switch that only works one way is a switch that
// looks like it works: OFF must hide the house's table AND not create it, ON
// must bring it back, and the choice must survive a reload.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const URL = process.env.SITE ?? "http://localhost:5176/";
const OUT = process.env.OUT ?? "/tmp/claude-1000/-mnt-c-Users-ytr-o-OneDrive-Desktop-ellaz/986df01d-04c9-4023-baaf-6df51f9c8b63/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const practiceCalls = [];
page.on("request", (r) => {
  if (r.url().includes("/api/practice")) practiceCalls.push(r.url());
});

const codes = async () =>
  page.$$eval("button", (bs) =>
    bs.map((b) => b.querySelector("span")?.textContent?.trim() ?? "").filter((s) => /^[A-Z0-9]{4,7}$/.test(s)),
  );
const switchState = () => page.$eval('[role="switch"]', (el) => el.getAttribute("aria-checked"));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);

console.log(`first visit — switch is ${await switchState()} (want false)`);
console.log(`  tables listed: ${JSON.stringify(await codes())}`);
console.log(`  /api/practice called ${practiceCalls.length} times (want 0)`);
await page.screenshot({ path: `${OUT}/switch-1-off.png` });

await page.click('[role="switch"]');
await page.waitForTimeout(3000);
console.log(`\nafter one tap — switch is ${await switchState()} (want true)`);
console.log(`  tables listed: ${JSON.stringify(await codes())}`);
console.log(`  /api/practice called ${practiceCalls.length} times (want 1+)`);
await page.screenshot({ path: `${OUT}/switch-2-on.png` });

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
console.log(`\nafter a reload — switch is ${await switchState()} (want true, it is remembered)`);
console.log(`  tables listed: ${JSON.stringify(await codes())}`);

await page.click('[role="switch"]');
await page.waitForTimeout(2500);
console.log(`\nswitched back off — switch is ${await switchState()}`);
console.log(`  tables listed: ${JSON.stringify(await codes())}`);
await page.screenshot({ path: `${OUT}/switch-3-off-again.png` });

// And the audio diagnostic, on the tab it lives on.
await page.evaluate(() => (location.hash = "#/lab"));
await page.waitForTimeout(2500);
const audio = await page.evaluate(() => {
  const el = [...document.querySelectorAll("code")].find((c) => c.textContent?.startsWith("audio:"));
  return el ? el.textContent : "(no audio line)";
});
console.log(`\nsounds tab reports: ${audio}`);
await page.screenshot({ path: `${OUT}/switch-4-audio.png` });

await browser.close();
console.log(`\nshots in ${OUT}`);
