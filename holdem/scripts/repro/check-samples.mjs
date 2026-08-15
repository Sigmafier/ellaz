// Does a recorded arm actually play a RECORDING?
//
// It is a fair question, because the honest runtime behaviour here makes the
// failure invisible: `playSample` returns false whenever a file has not
// decoded, and `play()` then covers that hit with the synth voice. A card
// still makes a sound. So a wrong URL, a 404, a browser that cannot decode
// Opus, or a mapping typo all present as "it works, and it sounds like it did
// before" - which is the exact verdict that started this whole thread.
//
// So this asserts the mechanism rather than the outcome:
//
//   a RECORDED arm  -> a network fetch of sfx/v1/*.opus, a BufferSource
//                      started, and ZERO oscillators
//   a SYNTH arm     -> oscillators, and ZERO BufferSources
//
// The synth arm is the control and it is load-bearing. Without it, "a
// BufferSource was created" proves nothing: the unsilencer, the reverb
// convolver and anything else could account for one, and a probe that cannot
// tell the two paths apart reports green over a bank that never loaded.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.addInitScript(() => {
  window.__osc = 0;
  window.__buf = 0;
  // The DURATION of every buffer that is started, because a count alone
  // cannot tell the two paths apart: this engine renders every `noise` layer
  // through a BufferSource too, so a purely noisy SYNTH voice also reports
  // "buffer sources, no oscillators". Found by running it - the first control
  // here was `card-old`, which is one noise layer and nothing else, and it
  // looked exactly like a recording.
  window.__durs = [];
  const mkOsc = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    window.__osc++;
    return mkOsc.call(this);
  };
  const mkBuf = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function () {
    const b = mkBuf.call(this);
    const st = b.start.bind(b);
    // Count it when it STARTS, not when it is created. A node that is built
    // and never started makes no sound, and this probe's whole job is to
    // distinguish "the code ran" from "something was played".
    b.start = (...a) => {
      window.__buf++;
      if (b.buffer) window.__durs.push(Number(b.buffer.duration.toFixed(3)));
      return st(...a);
    };
    return b;
  };
});

/** Every .opus the page actually asked the network for. */
const fetched = [];
page.on("request", (r) => {
  if (r.url().includes(".opus")) fetched.push(r.url().split("/").pop());
});

await page.goto(`${URL}#/lab`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
await page.locator('button[aria-label="Pause"]').first().click({ timeout: 10_000 }).catch(() => {});
await page.waitForTimeout(2500);

// Scoped to the strip and anchored to the name - a substring match over 200+
// arms silently matches the wrong button, which cost a wrong measurement once
// already.
async function tap(stripLabel, armName, settle = 1600) {
  await page.evaluate(() => {
    window.__osc = 0;
    window.__buf = 0;
    window.__durs.length = 0;
  });
  const strip = page
    .locator("section")
    .filter({ has: page.locator("strong", { hasText: new RegExp(`^${stripLabel}$`) }) })
    .first();
  const btn = strip.locator("button").filter({ has: page.locator("span", { hasText: new RegExp(`^${armName}( ·|$)`) }) }).first();
  const n = await btn.count();
  if (n !== 1) {
    console.log(`FAIL  "${stripLabel} / ${armName}" matched ${n} buttons`);
    await browser.close();
    process.exit(1);
  }
  await btn.click({ timeout: 15_000 });
  await page.waitForTimeout(settle);
  return page.evaluate(() => ({ osc: window.__osc, buf: window.__buf, durs: [...window.__durs] }));
}

// The recorded arm first. It gets longer to settle because the first tap has
// to fetch and decode before anything can be played back - the studio taps
// twice for exactly this reason.
const rec = await tap("Deal", "Real deal", 2600);
const recFetched = [...fetched];
// TWO synth controls, and the second one is the lesson.
//   "Cloth"             is one noise layer - it creates a BufferSource and no
//                       oscillator, which is what a recording looks like.
//   "Lands and settles" mixes a struck body in, so it has oscillators.
// A control that cannot produce the opposite reading is not a control.
const synNoise = await tap("Deal", "Cloth");
const synPitched = await tap("Deal", "Lands and settles");

// A second tap of the recorded arm, now that the bank is warm. This is the
// one that proves a real hand would get a recording rather than the fallback:
// the first tap is allowed to be covered by the synth.
const rec2 = await tap("Deal", "Real deal");

await page.screenshot({ path: "/tmp/holdem-samples.png", fullPage: false });
await browser.close();

console.log(`fetched ${recFetched.length} .opus files: ${recFetched.slice(0, 8).join(" ")}${recFetched.length > 8 ? " …" : ""}`);
const line = (n, r) => `${n.padEnd(24)} ${String(r.buf).padStart(2)} buffers, ${String(r.osc).padStart(2)} osc, durations ${JSON.stringify(r.durs)}`;
console.log(line("recorded, cold", rec));
console.log(line("synth: Cloth (noise)", synNoise));
console.log(line("synth: Lands and settles", synPitched));
console.log(line("recorded, warm", rec2));
console.log("");

// THE DISCRIMINATOR, DERIVED RATHER THAN HARDCODED.
//
// Measured: every buffer this synth engine starts is exactly 2.000 s - it
// allocates ONE white-noise buffer and windows it with the gain envelope, so
// "long buffer" and "short buffer" do not separate the two paths at all. What
// does separate them is that a decoded file has a length the engine cannot
// produce.
//
// Taken from the PITCHED control at run time instead of written down, so it
// cannot go stale the day somebody changes the engine's buffer length.
const engineLengths = new Set(synPitched.durs);
const decoded = rec2.durs.filter((d) => !engineLengths.has(d));

const checks = [
  [recFetched.length > 0, `picking a recorded arm fetches the bank (${recFetched.length} files)`],
  [recFetched.every((f) => f.startsWith("card-slide")), "and fetches THIS arm's takes, not the whole bank"],
  [
    decoded.length > 0,
    `a warm recorded arm plays a DECODED file - ${JSON.stringify(decoded)}s, a length the engine never generates (it only makes ${[...engineLengths].join("/")}s)`,
  ],
  [rec2.osc === 0, "and plays no synthesised voice alongside it"],
  // Control 1: the counter works at all.
  [synPitched.osc > 0, `control: a pitched synth arm still draws oscillators (${synPitched.osc})`],
  // Control 2: an INDEPENDENT synth arm - a different one, pure noise, the
  // shape most easily mistaken for a recording - produces no length outside
  // the engine's own set. Without this, "a new length appeared" could just be
  // what any second sound does.
  [
    synNoise.durs.length > 0 && synNoise.durs.every((d) => engineLengths.has(d)),
    `control: a different synth arm produces only engine lengths (${JSON.stringify(synNoise.durs)})`,
  ],
];

let bad = 0;
for (const [ok, line] of checks) {
  console.log(`${ok ? "OK  " : "FAIL"}  ${line}`);
  if (!ok) bad++;
}
process.exit(bad ? 1 : 0);
