// Does the low body actually reach the audio graph?
//
// pokerVoices.test.ts asserts the SPEC has a component under 600 Hz. That is
// arithmetic on a data structure, and it would keep passing if the engine threw
// the layer away - the trim cache, the Nyquist skip added for the star sound,
// or a validate step could each drop it silently. So this counts the
// oscillators the browser is actually asked to make, at their actual
// frequencies, on the deployed bundle.
//
// It taps `createOscillator` rather than listening, because nothing here can
// hear. What it can prove is that a chip sound now asks for something around
// 200 Hz where it used to ask for nothing below 2400.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// RECORD ONLY EXPLICIT ASSIGNMENTS, never `frequency.value` at start().
//
// The first version of this hook also pushed `o.frequency.value` when the
// oscillator started, on the reasonable-sounding theory that it would catch a
// voice that set its pitch some other way. What it actually caught was
// WebAudio's DEFAULT of 440 Hz, because the engine schedules with
// setValueAtTime(f, when) and `.value` still reads 440 until `when` arrives.
//
// So the body-LESS control arm reported "8 oscillators below 600 Hz, lowest
// 440" - a voice whose every component is at or above 2800 Hz, apparently
// carrying eight low ones. The instrument was fabricating exactly the property
// it existed to measure, in the arm that proves the measurement works.
await page.addInitScript(() => {
  window.__osc = [];
  const make = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const o = make.call(this);
    const setV = o.frequency.setValueAtTime.bind(o.frequency);
    o.frequency.setValueAtTime = (v, t) => {
      window.__osc.push(v);
      return setV(v, t);
    };
    return o;
  };
});

await page.goto(URL + "#/lab", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

// A real tap, because that is what unlocks audio - and because the studio's
// rule is that tapping a candidate PLAYS it through the shipping path.
async function tapAndCollect(label) {
  await page.evaluate(() => (window.__osc.length = 0));
  const btn = page.locator("button").filter({ hasText: label }).first();
  await btn.click({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return page.evaluate(() => [...window.__osc].filter((f) => Number.isFinite(f) && f > 0));
}

// PAUSE THE FELT FIRST, and this is the whole difference between a
// measurement and a number.
//
// The studio's table is dealing a real hand the entire time, playing real
// chips and cards into the same audio graph. Sampling without pausing gave the
// body-less control arm "8 oscillators below 600 Hz" - it has none, by
// construction - and gave the shuffle 98 oscillators when a riffle is pure
// noise and creates zero. Both readings were of the hand in the background.
//
// The control is what exposed it: an arm that CANNOT have low content
// reporting low content is the tell. Without a control forcing the opposite
// reading, "the shipped chip reaches 224 Hz" looked perfect and proved nothing.
await page.locator('button[aria-label="Pause"]').first().click({ timeout: 10_000 }).catch(() => {});
await page.waitForTimeout(2500); // let anything in flight finish


// A silence control: with the felt paused and nothing tapped, the graph must
// be still. If this is not zero, every row below it is measuring the room.
{
  await page.evaluate(() => (window.__osc.length = 0));
  await page.waitForTimeout(2000);
  const idle = await page.evaluate(() => window.__osc.length);
  console.log(`idle (felt paused, nothing tapped): ${idle} oscillators`);
  if (idle > 0) {
    console.log("FAIL  the felt is still playing - every reading below would be contaminated");
    await browser.close();
    process.exit(1);
  }
}

const rows = [];
for (const [name, label] of [
  ["chips (Clay - the shipped one)", "Clay"],
  ["chips (No body - the old sound)", "No body"],
  ["shuffle (Riffle - new)", "Riffle"],
]) {
  const f = await tapAndCollect(label);
  const low = f.filter((x) => x < 600);
  rows.push({ name, count: f.length, lowest: f.length ? Math.round(Math.min(...f)) : null, under600: low.length });
  // Print the frequencies themselves. A count is a claim; the list is the
  // evidence, and it is what showed the 440s were not real.
  const uniq = [...new Set(f.map((x) => Math.round(x)))].sort((a, b) => a - b);
  console.log(
    `${name}\n   oscillators ${f.length}, lowest ${f.length ? Math.round(Math.min(...f)) : "-"} Hz, ${low.length} below 600 Hz\n   Hz: ${uniq.join(" ") || "(none - this voice is pure noise)"}`,
  );
}

await page.screenshot({ path: "/tmp/holdem-studio.png" });
await page.goto(URL + "#/look", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
await page.screenshot({ path: "/tmp/holdem-look.png" });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/holdem-home.png" });

await browser.close();

const clay = rows[0];
const dry = rows[1];
console.log("");
if (clay.under600 > 0 && dry.under600 === 0) {
  console.log(`OK  the shipped chip reaches ${clay.lowest} Hz; the old one bottoms out at ${dry.lowest} Hz`);
} else {
  console.log(`FAIL  shipped under-600 count ${clay.under600}, old ${dry.under600} — expected some and none`);
  process.exit(1);
}
