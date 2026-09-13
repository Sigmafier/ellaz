#!/usr/bin/env node
// Drive a BUILT game page's campaign headlessly, title to VICTORY, the way a
// player would - the end-to-end proof no unit test gives (2026-09-14, first run
// on Brawl in the three-levels-and-a-boss plan):
//
//   title -> START -> the level pick (every label, and a pressed locked BOSS wiggles and stays locked)
//   -> LEVEL 1 played IDLE until the hero falls -> TRY AGAIN, the save unchanged, no canvas left
//   -> RETRY -> every level played by the keyboard policy through its CLEAR card, the purse
//   carried into the next -> BOSS CLEAR -> FINISH -> VICTORY -> reload, and the title counts
//   every level cleared.
//
// Any page error or console error fails the drive. Fight-kind campaigns only today:
// the policy presses keys off window.__fightFighters; a turn or dungeon campaign is
// refused by name until its own pointer policy lands (plan tasks L3, L4).
//
//   cd studio && npx vite build --config toybox/vite.config.ts
//   node toybox/harness/drive-campaign.mjs --game fight --campaign brawl [--shots <dir>]

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { DEFAULT_DIST, ORIGIN, routeDisk, STUDIO } from "./run-tape.mjs";

const GAMES_DIR = join(STUDIO, "games");

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const game = arg("game", "fight"), campaignId = arg("campaign"), shots = arg("shots", null);
if (!campaignId) { console.error("drive-campaign: --campaign <id> is required"); process.exit(3); }
const campaignFile = join(GAMES_DIR, game, "data", "campaign", `${campaignId}.json`);
if (!existsSync(campaignFile)) { console.error(`drive-campaign: ${game} has no campaign "${campaignId}" (${campaignFile})`); process.exit(3); }
const campaign = JSON.parse(readFileSync(campaignFile, "utf8"));
if (campaign.worlds.length !== 1) { console.error(`drive-campaign: ${campaignId} has ${campaign.worlds.length} worlds; this drive walks one`); process.exit(3); }
const levels = campaign.worlds[0].stages;
const kind = JSON.parse(readFileSync(join(GAMES_DIR, game, "data", "modes", `${levels[0]}.json`), "utf8")).kind ?? "fight";
if (kind !== "fight") { console.error(`drive-campaign: ${game}/${campaignId} is a ${kind} campaign; only the fight kind has a driving policy yet`); process.exit(3); }
const names = levels.map((_, i) => (i + 1 === levels.length ? "BOSS" : `LEVEL ${i + 1}`));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await routeDisk(ctx, DEFAULT_DIST);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/GL Driver Message/.test(m.text())) errors.push(`console.${m.type()}: ${m.text()}`); });
const flow = () => page.evaluate(() => window.__fightCampaign ?? null);
const canvases = () => page.evaluate(() => document.querySelectorAll("canvas").length);
const visible = () => page.evaluate(() => ["campaign-title", "campaign-pick", "campaign-card"].filter((id) => getComputedStyle(document.getElementById(id)).display !== "none"));
const cardTitle = () => page.evaluate(() => document.querySelector("#campaign-card .campaign-title")?.textContent ?? null);
const shot = async (name) => { if (shots) await page.screenshot({ path: join(shots, `${game}-${name}.png`) }); };
const fail = async (why) => { console.log(`drive-campaign FAIL ${why}`); if (errors.length) console.log(errors.join("\n")); await browser.close(); process.exit(1); };

async function waitLevelStart(label) {
  // a stopped run's window fields persist until the next run publishes, so wait on a FRESH tick count and one canvas
  await page.waitForFunction(() => window.__fightCampaign?.screen === "stage" && window.__fightStage?.wphase === 0 && window.__fightTicks < 200 && document.querySelectorAll("canvas").length === 1, null, { timeout: 30000 });
  const s = await page.evaluate(() => ({ stage: window.__fightCampaign.stage, coins: window.__fightStage.coins, level: window.__fightStage.level }));
  console.log(`${label} starts ${JSON.stringify(s)}`);
  if ((await visible()).length) await fail(`${label}: a panel is visible during play (${await visible()})`);
  return s;
}

/** the scripted hero's policy on the keyboard, off the published fighters; it stops itself when the level ends */
async function installPolicy() {
  await page.evaluate(() => {
    const FP = 256, LANE = 3 * FP, REACH = 50 * FP, ZBAND = 12 * FP;
    const held = new Set();
    const key = (code, down) => { if (down === held.has(code)) return; window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: code, bubbles: true })); if (down) held.add(code); else held.delete(code); };
    const set = (mx, mz, attack) => { key("ArrowRight", mx > 0); key("ArrowLeft", mx < 0); key("ArrowDown", mz > 0); key("ArrowUp", mz < 0); key("Space", attack); };
    let swingUntil = 0;
    const loop = () => {
      const f = window.__fightFighters, st = window.__fightStage;
      if (!f || !st || window.__fightCampaign?.screen !== "stage" || st.wphase >= 2) { set(0, 0, false); return; }
      const hero = f[0];
      let foe = null, best = 0;
      f.forEach((x, i) => { if (i === 0 || x.active === 0 || x.active === 3 || x.hp <= 0) return; const d = Math.abs(x.x - hero.x) + Math.abs(x.z - hero.z); if (!foe || d < best) { foe = x; best = d; } });
      if (!foe) { set(st.wphase === 1 ? 1 : 0, 0, false); requestAnimationFrame(loop); return; }
      const dx = foe.x - hero.x, dz = foe.z - hero.z;
      const far = Math.abs(dx) > REACH;
      const now = performance.now();
      const attack = !far && Math.abs(dz) <= ZBAND && hero.cool === 0 && Math.sign(dx) === hero.face && now > swingUntil;
      if (attack) swingUntil = now + 120;
      set(far ? Math.sign(dx) : Math.sign(dx) !== hero.face ? Math.sign(dx) : 0, Math.abs(dz) > LANE ? Math.sign(dz) : 0, attack || now < swingUntil - 60);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

async function waitScreen(label, want, budgetMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    await page.waitForTimeout(2000);
    const c = await flow();
    if (c.screen === want) return c;
    if (errors.length) await fail(`${label}: errors during play`);
  }
  return fail(`${label}: no "${want}" within ${budgetMs / 1000} s (screen ${(await flow()).screen}, tick ${await page.evaluate(() => window.__fightTicks)})`);
}

await page.goto(`${ORIGIN}/games/${game}/page/index.html?campaign=${campaignId}`);
await page.waitForFunction(() => window.__fightCampaign?.screen === "title", null, { timeout: 20000 });
if ((await visible()).join() !== "campaign-title") await fail(`panels at the title: ${await visible()}`);
await shot("1-title");
await page.getByRole("button", { name: "START" }).click();
await page.waitForFunction(() => window.__fightCampaign?.screen === "pick", null, { timeout: 5000 });
const labels = await page.evaluate(() => [...document.querySelectorAll("#campaign-pick button")].map((b) => b.textContent));
const want = names.map((n, i) => (i === 0 ? n : `${n}  -  locked`));
if (JSON.stringify(labels.slice(0, names.length)) !== JSON.stringify(want)) await fail(`pick labels ${JSON.stringify(labels)}, expected ${JSON.stringify(want)}`);
await page.getByRole("button", { name: /^BOSS/ }).click();
await page.waitForTimeout(100);
if ((await flow()).screen !== "pick") await fail("a locked BOSS opened");
if (!(await page.evaluate((n) => document.querySelectorAll("#campaign-pick button")[n].classList.contains("campaign-wiggle"), names.length - 1))) await fail("a locked BOSS did not wiggle");
console.log(`pick ${JSON.stringify(labels)} - the locked BOSS wiggled and stayed locked`);
await shot("2-pick");

await page.getByRole("button", { name: names[0] }).click();
await waitLevelStart(`${names[0]} (idle)`);
const lost = await waitScreen(`${names[0]} (idle)`, "lost", 150000);
if ((await cardTitle()) !== "TRY AGAIN") await fail(`the lost card reads ${await cardTitle()}`);
if (lost.levels.length !== 0) await fail(`a lost level changed the save: ${JSON.stringify(lost)}`);
if ((await canvases()) !== 0) await fail("a canvas outlived the lost level");
console.log(`${names[0]} lost idle -> TRY AGAIN, save unchanged, no canvas`);
await shot("3-try-again");
await page.getByRole("button", { name: "RETRY" }).click();

let purse = null;
for (let i = 0; i < names.length; i++) {
  const s = await waitLevelStart(names[i]);
  if (purse && (s.coins !== purse.coins || s.level !== purse.level)) await fail(`${names[i]} started with ${s.coins}/${s.level}, the card carried ${purse.coins}/${purse.level}`);
  await installPolicy();
  const c = await waitScreen(names[i], "clear", 180000);
  purse = c.purse;
  if ((await cardTitle()) !== `${names[i]} CLEAR`) await fail(`the card reads ${await cardTitle()}`);
  if ((await canvases()) !== 0) await fail(`a canvas outlived ${names[i]}`);
  console.log(`${names[i]} CLEAR at tick ${c.best[c.stage]}, purse ${purse.coins} coins / level ${purse.level}`);
  await page.getByRole("button", { name: i + 1 === names.length ? "FINISH" : "NEXT" }).click();
}
await page.waitForFunction(() => window.__fightCampaign?.screen === "victory", null, { timeout: 5000 });
if ((await cardTitle()) !== "VICTORY") await fail(`the victory card reads ${await cardTitle()}`);
await shot("4-victory");
await page.reload();
await page.waitForFunction(() => window.__fightCampaign?.screen === "title", null, { timeout: 20000 });
const line = await page.evaluate(() => document.querySelectorAll("#campaign-title .campaign-line")[0]?.textContent);
if (line !== `${names.length} of ${names.length} levels cleared`) await fail(`after a reload the title reads ${line}`);
console.log(`VICTORY; after a reload the title reads "${line}"`);
await browser.close();
if (errors.length) { console.log(`drive-campaign FAIL ${errors.join(" | ")}`); process.exit(1); }
console.log(`drive-campaign ${game}/${campaignId}: PASS - ${names.length} levels, one loss, zero errors`);
