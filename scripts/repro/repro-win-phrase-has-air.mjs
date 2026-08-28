#!/usr/bin/env node
/**
 * Does the win actually SOUND like a phrase, in a real audio graph?
 *
 *   npm install --no-save playwright      # not a dependency, like every repro here
 *   npm run build && npx vite preview --port 5177 &
 *   node scripts/repro/repro-win-phrase-has-air.mjs --base http://localhost:5177
 *   node scripts/repro/repro-win-phrase-has-air.mjs --base http://localhost:5177 --control
 *
 * Add `--browser <path to chrome>` where playwright pins a build it has not
 * downloaded. Measured 2026-08-27 on the artifact at 390x844:
 *
 *   win  -20 .. 519 ms (12 partials)   coin 729   star 990   air 209 ms
 *
 * and with `--control`, which puts 450/620 back in the same build:
 *
 *   TWO events, not three - the coin and the star merge and start at 430 ms,
 *   while the fanfare is still ringing until 510. That is the report, measured.
 *
 * Reported 2026-08-27: *"the sound of success after winning and then right away
 * the sound of coins sounds bad"*. It was exactly that - the coin chime fired
 * at a hardcoded 620 ms against a win voice with 961 ms of body, so the two ran
 * on top of each other in every win in every game.
 *
 * `src/shared/winPhrase.test.ts` pins the arithmetic. It cannot see the audio
 * graph, and that is the gap this fills: `voiceEngine` schedules every partial
 * itself, DROPS any that lives its whole life above Nyquist, applies a
 * level-matching trim measured in an offline render, and sends each voice
 * through a reverb. A phrase correct on paper can still come out smeared - or,
 * the failure that would be silent and total, a voice can schedule nothing at
 * all and the "gap" becomes the whole win.
 *
 * SO IT MEASURES ONSETS, NOT CONSTANTS. Every scheduled source start is
 * timestamped on the AudioContext's own clock - which is what the ear hears; a
 * `setTimeout` timestamp is a different clock and would smear the reading - and
 * the run is judged on where they cluster.
 *
 * THREE THINGS THAT ARE NOT INCIDENTAL, each of which reported a wrong answer
 * before it was fixed:
 *
 *  - `OscillatorNode` does NOT own `start()` in Chrome; it inherits it from
 *    `AudioScheduledSourceNode`. Patching only the two leaf classes catches
 *    nothing, and "nothing" reads exactly like "no sound was scheduled".
 *  - `warmVoices` renders all nine voices in an OfflineAudioContext to
 *    level-match them, on a different clock. Counted in, that is 46 phantom
 *    onsets piled at t=0 - which would fill the gap this probe exists to
 *    measure. They are filtered by their context's class name.
 *  - The strip is found by `[data-lab="win-moment"]`. Found by button TEXT, the
 *    first version matched "buzz: win" in the haptics row and measured a
 *    vibration.
 *
 * TWO CONTROLS, because every assertion here passes vacuously over an empty
 * list and an empty list is what a broken hook produces:
 *
 *  1. a live onset must be recorded from the chord-only button BEFORE anything
 *     is measured, so a run that heard nothing reports BLIND rather than clean;
 *  2. `--control` rewrites the two phrase delays back to the numbers that
 *     caused the report (740 -> 620, 1000 -> 450) inside the same build, and
 *     the run MUST come back red. It aborts if that rewrite does not land,
 *     because a control that silently did not apply is a control that passed.
 *
 * It drives the lab's win-moment demo rather than winning a game, because no
 * harness can win 42 different games. That is sound only because the demo and
 * `winMoment` read the SAME `WIN_PHRASE` object - which `winPhrase.test.ts`
 * asserts by scanning both sources for a `setTimeout` off a bare number. The
 * two halves cover each other and neither is sufficient alone.
 */

import { chromium } from "playwright";

const BASE = argOf("--base") ?? "http://localhost:5177";
const CONTROL = process.argv.includes("--control");
const HEAD = process.argv.includes("--headed");
const EXE = argOf("--browser");

/** Minimum clear air between the win's last onset and the coin, in ms. */
const AIR_FLOOR = 150;
/** What the control puts back. The defect, exactly as it shipped. */
const OLD_COIN_MS = 620;
const OLD_STAR_MS = 450;

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

/**
 * Group sources into EVENTS: anything starting within `gap` ms of the last one
 * is the same sound. Each event carries `last`, the latest scheduled stop among
 * its own sources - which is when that sound actually finishes, not when its
 * final note began.
 */
function cluster(nodes, gap = 130) {
  const out = [];
  for (const n of [...nodes].sort((a, b) => a.start - b.start)) {
    const cur = out[out.length - 1];
    const end = n.end ?? n.start;
    if (cur && n.start - cur.lastStart <= gap) {
      cur.lastStart = n.start;
      cur.last = Math.max(cur.last, end);
      cur.n++;
    } else out.push({ start: n.start, lastStart: n.start, last: end, n: 1 });
  }
  return out;
}

const HOOK = `
  window.__nodes = [];
  let __seq = 0;
  // BOTH start AND stop, correlated per node. Onsets alone cannot answer this
  // probe's question: the fanfare's four notes START within 132 ms and then
  // RING for another 390, so a gap measured between the last onset and the coin
  // reads ~500 ms whether the coin lands in the silence or on top of the ring.
  // That instrument was written first and its own control caught it - it
  // reported 498 ms of air with the defect forced back on. \`voiceEngine\`
  // schedules a real stop() per source, so the audible end is measurable rather
  // than inferred.
  //
  // OscillatorNode and AudioBufferSourceNode do not both OWN these methods: in
  // Chrome the oscillator inherits them from AudioScheduledSourceNode. Patch
  // whichever of the three owns each one, or the hook silently sees half the
  // graph - and half a graph reads exactly like a quiet one.
  for (const name of ["OscillatorNode", "AudioBufferSourceNode", "AudioScheduledSourceNode"]) {
    const C = window[name];
    if (!C) continue;
    if (Object.prototype.hasOwnProperty.call(C.prototype, "start")) {
      const start = C.prototype.start;
      C.prototype.start = function (when, ...rest) {
        try {
          const c = this.context;
          this.__pid = ++__seq;
          window.__nodes.push({
            id: this.__pid,
            start: (when ?? c.currentTime) * 1000,
            end: null,
            ctx: c.constructor.name,
          });
        } catch {}
        return start.call(this, when, ...rest);
      };
    }
    if (Object.prototype.hasOwnProperty.call(C.prototype, "stop")) {
      const stop = C.prototype.stop;
      C.prototype.stop = function (when, ...rest) {
        try {
          const c = this.context;
          const n = window.__nodes.find((x) => x.id === this.__pid);
          if (n) n.end = (when ?? c.currentTime) * 1000;
        } catch {}
        return stop.call(this, when, ...rest);
      };
    }
  }
  const AC = window.AudioContext;
  window.AudioContext = function (...a) {
    const c = new AC(...a);
    window.__ac = c;
    return c;
  };
  window.AudioContext.prototype = AC.prototype;
  // \`warmVoices\` renders all nine voices in an OfflineAudioContext to
  // level-match them, on a different clock. Counted in, that is dozens of
  // phantom sources piled at t=0 - filling the very gap this measures.
  window.__live = () => window.__nodes.filter((n) => !/Offline/.test(n.ctx));
  window.__mark = () => (window.__ac ? window.__ac.currentTime * 1000 : 0);
`;



const SQUASH = `
  // THE POSITIVE CONTROL: put the reported defect back, in this build, by
  // rewriting the two phrase delays to the constants that shipped it.
  window.__squashed = 0;
  const st = window.setTimeout;
  window.setTimeout = function (fn, ms, ...rest) {
    let d = ms;
    if (ms === __COIN__) { d = ${OLD_COIN_MS}; window.__squashed++; }
    else if (ms === __STAR__) { d = ${OLD_STAR_MS}; window.__squashed++; }
    return st.call(window, fn, d, ...rest);
  };
`;

async function run() {
  const browser = await chromium.launch({
    headless: !HEAD,
    ...(EXE ? { executablePath: EXE } : {}),
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(HOOK);

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/#/lab`, { waitUntil: "domcontentloaded" });
  const strip = page.locator('[data-lab="win-moment"]');
  await strip.waitFor({ timeout: 20000 });

  // A fresh browser context always shows the consent bar, and it covers the
  // bottom of the screen - so a probe that leaves it up is clicking through a
  // state the operator dismissed once and never sees again.
  const consent = page.locator("button", { hasText: /^(Allow|אישור|No thanks)/ }).first();
  if (await consent.count()) await consent.click().catch(() => {});

  const buttons = strip.locator("button");
  const chordOnly = buttons.last(); // playWin(0, false) - no coins, picks nothing
  const withCoins = buttons.nth(1); // playWin(8, true)

  // --- control 1: is the hook measuring this app at all? --------------------
  await chordOnly.scrollIntoViewIfNeeded();
  await chordOnly.click();
  // Long enough for the control's OWN phrase to finish. The first version
  // waited 900 ms, and the chord-only button plays a star at ~1000 - so eight
  // of its partials were still un-stopped when the measurement began, landed
  // inside the win event, and dragged its "last note ends" 135 ms past the
  // truth. Air read 45 ms on a correct build.
  await page.waitForTimeout(3000);
  const live = await page.evaluate(() => window.__live().length);
  if (live === 0) {
    console.log(
      "BLIND  no live onset was recorded from a button that plays the win chord.\n" +
        "       The hook is not measuring the app, so every number below would be a\n" +
        "       confident zero. Fix the hook, not the phrase.",
    );
    await browser.close();
    return 2;
  }
  console.log(`control 1: the hook hears the app (${live} live sources on the chord) - OK`);

  if (CONTROL) {
    const phrase = await page.evaluate(() => ({}));
    void phrase;
    // The delays are read out of the page rather than retyped, so a re-voice
    // that moves them does not silently turn the control into a no-op.
    const { coin, star, seen } = await page.evaluate(async () => {
      // The lab schedules off WIN_PHRASE; recover the two values by watching one
      // throwaway win before squashing anything, rather than retyping them - a
      // control that hardcodes what it is replacing goes stale on the first
      // re-voice and then quietly rewrites nothing.
      //
      // The two SMALLEST distinct delays: `flyTo` also schedules its own layer
      // cleanup, at flight + stagger + 160, which is always later than both.
      return await new Promise((res) => {
        const seen = [];
        const st = window.setTimeout;
        window.setTimeout = function (fn, ms, ...r) {
          if (ms > 200 && ms < 2000) seen.push(ms);
          return st.call(window, fn, ms, ...r);
        };
        st.call(
          window,
          () => {
            window.setTimeout = st;
            const uniq = [...new Set(seen)].sort((a, b) => a - b);
            res({ coin: uniq[0], star: uniq[1], seen: uniq });
          },
          400,
        );
        document.querySelectorAll('[data-lab="win-moment"] button')[1].click();
      });
    });
    if (!coin || !star || coin >= star || star > 1500) {
      console.log(
        `CONTROL BROKEN  could not read the two phrase delays out of the page.\n` +
          `                saw [${(seen ?? []).join(", ")}], took coin=${coin} star=${star}.`,
      );
      await browser.close();
      return 2;
    }
    await page.evaluate(
      SQUASH.replace("__COIN__", String(coin)).replace("__STAR__", String(star)),
    );
    console.log(
      `control 2: forcing the reported defect back - ${coin} -> ${OLD_COIN_MS}, ${star} -> ${OLD_STAR_MS}`,
    );
    // The throwaway win used to read those two values is still ringing.
    await page.waitForTimeout(3000);
  }

  // --- the measurement ------------------------------------------------------
  await page.evaluate(() => {
    window.__nodes = [];
  });
  await withCoins.click();
  const t0 = await page.evaluate(() => window.__mark());
  await page.waitForTimeout(2600);

  if (CONTROL) {
    const n = await page.evaluate(() => window.__squashed ?? 0);
    if (n < 2) {
      console.log(
        `CONTROL BROKEN  the rewrite landed ${n} times, expected 2. It did not apply,\n` +
          "                so a green run below would prove nothing.",
      );
      await browser.close();
      return 2;
    }
    console.log(`control 2: the rewrite landed ${n} times - OK`);
  }

  const nodes = (await page.evaluate(() => window.__live()))
    .map((n) => ({ ...n, start: n.start - t0, end: n.end == null ? null : n.end - t0 }))
    .filter((n) => n.start > -60 && n.start < 3000);
  const events = cluster(nodes);

  console.log(`\n${nodes.length} live sources, ${events.length} events:`);
  for (const e of events)
    console.log(
      `  starts ${e.start.toFixed(0).padStart(5)} ms, last note ends ${e.last
        .toFixed(0)
        .padStart(5)} ms   ${e.n} partials`,
    );

  let bad = 0;
  if (events.length < 3) {
    console.log(
      `\nFAIL  expected three events (win, coin, star) and found ${events.length} -` +
        " they have run together.",
    );
    bad++;
  } else {
    const [win, coin, star] = events;
    // The win's audible END, not its last onset. That distinction is the whole
    // instrument - see the note in HOOK.
    const air = coin.start - win.last;
    console.log(
      `\nwin ${win.start.toFixed(0)}..${win.last.toFixed(0)}` +
        `   coin ${coin.start.toFixed(0)}   star ${star.start.toFixed(0)}` +
        `\nclear air between the win's last note ENDING and the coin: ${air.toFixed(0)} ms (floor ${AIR_FLOOR})`,
    );
    if (air < AIR_FLOOR) {
      console.log(`FAIL  the coin lands on the win, with ${air.toFixed(0)} ms of air.`);
      bad++;
    }
    if (star.start <= coin.start) {
      console.log("FAIL  the star does not come last.");
      bad++;
    }
  }
  if (errors.length) {
    console.log(`FAIL  ${errors.length} page errors: ${errors[0]}`);
    bad++;
  }

  await browser.close();
  if (bad) {
    console.log(CONTROL ? "\nOK  the control fired - this probe can come back red." : "");
    return CONTROL ? 0 : 1;
  }
  if (CONTROL) {
    console.log(
      "\nCONTROL FAILED  the defect was forced back and the probe still passed.\n" +
        "                Its green verdict means nothing until this reds.",
    );
    return 2;
  }
  console.log("\nOK  the win is a phrase: fanfare, air, coin, star.");
  return 0;
}

run().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
