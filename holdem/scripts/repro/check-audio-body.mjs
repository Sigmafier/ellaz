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
  // ONSETS, and they are what counts EVENTS.
  //
  // The first version of the bounce check counted oscillators and reported
  // "Dropped 9, Clay 14" - a real number that answers the wrong question. A
  // node count is partials x events, so an arm with three landings on a
  // two-partial click has FEWER nodes than one landing on a four-partial chip,
  // and the arm that lands three times reads as the simpler sound. What a
  // bounce actually is, is separate START TIMES.
  window.__onsets = [];
  const make = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const o = make.call(this);
    const setV = o.frequency.setValueAtTime.bind(o.frequency);
    o.frequency.setValueAtTime = (v, t) => {
      window.__osc.push(v);
      return setV(v, t);
    };
    const st = o.start.bind(o);
    o.start = (when) => {
      window.__onsets.push(when);
      return st(when);
    };
    return o;
  };
  const mkbs = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function () {
    const b = mkbs.call(this);
    const st = b.start.bind(b);
    b.start = (when, ...rest) => {
      window.__onsets.push(when);
      return st(when, ...rest);
    };
    return b;
  };

  // FILTER SWEEPS, for the second wave.
  //
  // The claim `friction()` makes is that a sliding sound MOVES - the band of
  // noise starts at one frequency and ends at another. That is a claim about a
  // ramp, and an oscillator count cannot see it: a swept card and a burst card
  // create the same number of nodes and the same amount of noise. So this
  // records the pairs, and a card arm with zero of them is one that does not
  // actually slide however it is described.
  window.__ramps = [];
  const mkf = AudioContext.prototype.createBiquadFilter;
  AudioContext.prototype.createBiquadFilter = function () {
    const f = mkf.call(this);
    const setV = f.frequency.setValueAtTime.bind(f.frequency);
    const ramp = f.frequency.exponentialRampToValueAtTime.bind(f.frequency);
    let from = null;
    f.frequency.setValueAtTime = (v, t) => {
      from = v;
      return setV(v, t);
    };
    f.frequency.exponentialRampToValueAtTime = (v, t) => {
      window.__ramps.push([from, v]);
      return ramp(v, t);
    };
    return f;
  };
});

await page.goto(URL + "#/lab", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

// A real tap, because that is what unlocks audio - and because the studio's
// rule is that tapping a candidate PLAYS it through the shipping path.
// SCOPED TO THE STRIP, AND ANCHORED TO THE START OF THE NAME.
//
// This used to be `locator("button").filter({ hasText: label }).first()`, which
// was unambiguous when there were 98 arms and stopped being so at 208 without
// anything failing. "Riffle" is an arm in the Shuffle strip AND a prefix of
// "Riffled first" in the Raise strip, which sits higher on the page - so the
// row printed as `shuffle (Riffle)` was measuring a chip sound, and reported 27
// oscillators for a voice that is pure noise and creates none.
//
// A substring match over a list that grows is the same defect as a row that
// grows with the catalogue: correct on the day it is written, wrong later, and
// silent about it. Both coordinates are needed, and both are anchored.
async function tapAndCollect(stripLabel, armName) {
  await page.evaluate(() => {
    window.__osc.length = 0;
    window.__ramps.length = 0;
    window.__onsets.length = 0;
  });
  const strip = page
    .locator("section")
    .filter({ has: page.locator("strong", { hasText: new RegExp(`^${stripLabel}$`) }) })
    .first();
  const btn = strip.locator("button").filter({ has: page.locator("span", { hasText: new RegExp(`^${armName}( ·|$)`) }) }).first();
  const found = await btn.count();
  if (found !== 1) {
    console.log(`FAIL  "${stripLabel} / ${armName}" matched ${found} buttons - the probe cannot name what it measured`);
    await browser.close();
    process.exit(1);
  }
  await btn.click({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  return page.evaluate(() => ({
    hz: [...window.__osc].filter((f) => Number.isFinite(f) && f > 0),
    // Distinct to the millisecond, relative to the first. Layers of one impact
    // are scheduled at the same instant; a second landing is a second time.
    onsets: (() => {
      const t = [...window.__onsets].filter(Number.isFinite);
      if (!t.length) return 0;
      const t0 = Math.min(...t);
      return new Set(t.map((x) => Math.round((x - t0) * 1000))).size;
    })(),
    // Only the ones that actually MOVE. A static filter still calls
    // setValueAtTime, and counting those would report every burst as a sweep.
    ramps: [...window.__ramps].filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1),
  }));
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

const rows = {};
for (const [key, name, strip, arm] of [
  ["clay", "Chips / Clay - the shipped one", "Chips", "Clay"],
  ["dry", "Chips / No body - the old sound", "Chips", "No body"],
  ["riffle", "Shuffle / Riffle - the shipped one", "Shuffle", "Riffle"],
  // The second wave, 2026-08-15. One arm per new MECHANISM, because the claim
  // being tested is that these differ by kind and not by setting.
  ["dropped", "Chips / Dropped - bounces and settles", "Chips", "Dropped"],
  ["slid", "Chips / Slid forward - a chip that scrapes", "Chips", "Slid forward"],
]) {
  const { hz, ramps, onsets } = await tapAndCollect(strip, arm);
  const low = hz.filter((x) => x < 600);
  rows[key] = { name, count: hz.length, lowest: hz.length ? Math.round(Math.min(...hz)) : null, under600: low.length, ramps: ramps.length, onsets };
  // Print the frequencies themselves. A count is a claim; the list is the
  // evidence, and it is what showed the 440s were not real.
  const uniq = [...new Set(hz.map((x) => Math.round(x)))].sort((a, b) => a - b);
  const sweep = ramps.length ? `   sweeps ${ramps.length}: ${ramps.map(([a, b]) => `${Math.round(a)}->${Math.round(b)}`).join(" ")}\n` : "";
  console.log(
    `${name}\n   oscillators ${hz.length}, lowest ${hz.length ? Math.round(Math.min(...hz)) : "-"} Hz, ${low.length} below 600 Hz\n   onsets ${onsets}\n${sweep}   Hz: ${uniq.join(" ") || "(none - this voice is pure noise)"}`,
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

const { clay, dry, riffle, dropped, slid } = rows;
console.log("");

const checks = [
  // Wave one: the body is really there, and the arm that has none really has none.
  [clay.under600 > 0 && dry.under600 === 0, `the shipped chip reaches ${clay.lowest} Hz; the old one bottoms out at ${dry.lowest} Hz`],

  // Wave two, mechanism 1 - BOUNCE. A dropped chip is more separate impacts
  // than a placed one: not louder, not a different material, more EVENTS.
  // Clay is the control and must stay at one landing.
  [
    dropped.onsets > clay.onsets && dropped.onsets >= 3,
    `Dropped starts sound at ${dropped.onsets} separate moments to Clay's ${clay.onsets} - it lands, bounces, and settles`,
  ],

  // Wave two, mechanism 2 - FRICTION where there was none.
  //
  // NOT "sweeps exist now". They already did, in the two card arms, hand-written
  // per layer - `card-old` sweeps 700->3000 and has since before any of this.
  // Measuring against a card would have "proved" a thing that was already true,
  // which is worse than proving nothing. What is actually new is that a sweep is
  // a BUILDER, so it can go under a chip - and no chip has ever scraped.
  [
    slid.ramps > 0 && clay.ramps === 0 && riffle.ramps === 0,
    `Slid forward sweeps its filter ${slid.ramps}x; Clay and the shipped Riffle sweep ${clay.ramps} and ${riffle.ramps}`,
  ],
];

let bad = 0;
for (const [ok, line] of checks) {
  console.log(`${ok ? "OK  " : "FAIL"}  ${line}`);
  if (!ok) bad++;
}
if (bad) process.exit(1);
