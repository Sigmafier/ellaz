// Drive the check/fold box in a real browser, at a real table.
//
//   node scripts/repro/pre-action.mjs                # local dev (vite + wrangler)
//   SITE=https://ellaz-holdem.pages.dev/ node scripts/repro/pre-action.mjs
//
// Nothing in the suite can see this feature work. There is no DOM in this
// workspace's vitest environment, so preAction.test.ts proves the rules and
// cannot prove the bar wires them up — and the whole failure mode here is a
// control that renders perfectly and answers no tap
// (.claude/rules/a-control-that-carries-an-imperative-must-be-a-control.md).
// So this sits down at the practice table, arms the box, and reports what the
// SOCKET carried, which is the only thing the server ever sees.
//
// It binds to `[data-preaction]`, never to the caption: a probe that fails
// because a word was reworded reads exactly like the feature being broken.
//
// Prints one PASS/FAIL block and exits 1 on failure.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "http://localhost:5175/";
const CODE = process.env.CODE ?? "PRACT";
const MINUTES = Number(process.env.MINUTES ?? 3);

// PLAYWRIGHT_CHROMIUM overrides the browser binary: a sandbox that ships a
// pinned Chromium of its own has no matching download for playwright-core's
// pinned revision, and `npx playwright install` is not the answer there.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.addInitScript(() => {
  // Every `act` this tab sends, in order, with the state it was sent under.
  window.__sent = [];
  const Real = window.WebSocket;
  window.WebSocket = function (u, p) {
    const s = p === undefined ? new Real(u) : new Real(u, p);
    const send = s.send.bind(s);
    s.send = (data) => {
      try {
        const m = JSON.parse(data);
        if (m.t === "act") {
          // The legal set AS IT WAS when the frame left, read from the store
          // rather than sampled by the poll loop afterwards — the `you` that
          // answers this act clears `legal`, so a later read cannot say what
          // the box was choosing between.
          const you = window.__holdem?.getState().you;
          window.__sent.push({ ...m, legal: you?.legal?.actions ?? null, at: Date.now() });
        }
      } catch {
        /* not ours */
      }
      return send(data);
    };
    return s;
  };
  window.WebSocket.prototype = Real.prototype;
  for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) window.WebSocket[k] = Real[k];
  localStorage.setItem("holdem:bots", "1");
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.evaluate((code) => (location.hash = `#/room/${code}`), CODE);
await page.waitForTimeout(3500);

// Sit. "Sit here" opens the buy-in sheet; the sheet's own confirm is "Sit".
await page
  .getByRole("button", { name: /sit here|לשבת כאן/i })
  .first()
  .click({ timeout: 15_000 })
  .catch((e) => console.log("no empty seat:", e.message));
await page.waitForTimeout(1200);
for (const b of await page.$$("button")) {
  const label = ((await b.textContent()) ?? "").trim();
  if (/^(Sit|שב)$/i.test(label)) {
    await b.click().catch(() => {});
    break;
  }
}
await page.waitForTimeout(3000);

const seat = await page.evaluate(() => window.__holdem?.getState().you?.seatIdx ?? -1);
if (seat < 0) {
  console.error("FAIL: never got a seat — is the practice table up?");
  await browser.close();
  process.exit(1);
}
console.log(`seated at ${seat}, watching for ${MINUTES} minute(s)`);

const obs = {
  boxSeenWaiting: 0, // offered while somebody else is to act
  boxSeenOnTurn: 0, // OFFERED ON OUR OWN TURN — must stay 0
  armedTicks: 0,
  deadTaps: 0, // a tap the box answered with nothing, the turn not having arrived
  fired: [], // { move, legal, handNo }
  stillArmedAfterFire: 0,
  armedIntoNextHand: 0,
  hands: new Set(),
};

let armedForHand = null;
const deadline = Date.now() + MINUTES * 60_000;

while (Date.now() < deadline) {
  const shot = await page.evaluate(() => {
    const s = window.__holdem?.getState();
    const el = document.querySelector("[data-preaction]");
    return {
      box: el ? { armed: el.getAttribute("data-armed") === "1" } : null,
      yourTurn: !!s?.you?.legal,
      actions: s?.you?.legal?.actions ?? null,
      handNo: s?.you?.handNo ?? -1,
      sent: window.__sent.length,
      lastSent: window.__sent[window.__sent.length - 1] ?? null,
    };
  });

  if (shot.handNo >= 0) obs.hands.add(shot.handNo);
  if (shot.box) {
    if (shot.yourTurn) obs.boxSeenOnTurn++;
    else obs.boxSeenWaiting++;
    if (shot.box.armed) obs.armedTicks++;
  }

  // Arm it whenever it is offered and not already armed. Once per hand is
  // enough to see it fire; re-arming in the same hand after it fired would
  // measure nothing new.
  if (shot.box && !shot.box.armed && !shot.yourTurn && armedForHand !== shot.handNo) {
    await page.click("[data-preaction]").catch(() => {});
    armedForHand = shot.handNo;
    // A tap that does not stick is either the defect this whole probe exists
    // for (a control that answers nothing) or the turn arriving between the
    // click and the read, which unmounts the box and is correct. They print
    // differently, because one of them is a bug report and the other is noise.
    const after = await page.evaluate(() => {
      const el = document.querySelector("[data-preaction]");
      const s = window.__holdem?.getState();
      return { armed: el?.getAttribute("data-armed") ?? null, gone: !el, yourTurn: !!s?.you?.legal };
    });
    if (after.armed !== "1") {
      console.log(
        after.gone || after.yourTurn
          ? "  (armed as the turn landed — the box is gone because it acted or the hand moved)"
          : "  (ARM DID NOT STICK — the tap was answered by nothing)",
      );
      if (!after.gone && !after.yourTurn) obs.deadTaps++;
    }
  }

  // Did it act? A send that lands while we were armed for THIS hand is the box.
  //
  // KEYED BY HAND AND SEQ, not by seq. `actionSeq` restarts at 0 every hand, so
  // a seq-only key reported one fire across seven hands and still printed PASS —
  // the probe agreeing with itself about a feature it had stopped watching.
  const last = shot.lastSent;
  const key = last && `${last.handNo}:${last.actionSeq}`;
  if (last && last.handNo === armedForHand && !obs.fired.some((f) => f.key === key)) {
    obs.fired.push({ key, seq: last.actionSeq, move: last.action, handNo: last.handNo, legal: last.legal });
    console.log(`  hand ${last.handNo}: sent ${last.action}  (legal: ${(last.legal ?? []).join("/") || "?"})`);
    const after = await page.evaluate(() => {
      const el = document.querySelector("[data-preaction]");
      return el ? el.getAttribute("data-armed") : "gone";
    });
    if (after === "1") obs.stillArmedAfterFire++;
  }

  // 120ms, not 250: the practice table's bots answer instantly, so the window
  // where somebody else is thinking and the box is on screen can be under a
  // quarter second. A poll slower than the window measures the poll.
  await page.waitForTimeout(120);
}

// Did an armed box survive into a hand it was not armed for? The tick count is
// per hand: an armed observation whose handNo is past the hand we armed in.
const survived = await page.evaluate(() => {
  const el = document.querySelector("[data-preaction]");
  const s = window.__holdem?.getState();
  return el?.getAttribute("data-armed") === "1" ? (s?.you?.handNo ?? -1) : null;
});
if (survived !== null && armedForHand !== null && survived !== armedForHand) obs.armedIntoNextHand++;

const fails = [];
if (obs.hands.size < 2) fails.push(`only ${obs.hands.size} hand(s) ran — nothing was really measured`);
if (obs.boxSeenWaiting === 0) fails.push("the box was never offered while waiting for the turn");
if (obs.boxSeenOnTurn > 0) fails.push(`the box was showing on our own turn ${obs.boxSeenOnTurn}x`);
if (obs.armedTicks === 0) fails.push("the box never read as armed — the tap was answered by nothing");
if (obs.deadTaps > 0) fails.push(`${obs.deadTaps} tap(s) answered by nothing while the box was still on screen`);
if (obs.fired.length === 0) fails.push("armed, and no action was ever sent");
for (const f of obs.fired) {
  if (f.move !== "check" && f.move !== "fold") fails.push(`hand ${f.handNo}: sent ${f.move}, not check or fold`);
  // The rule itself, end to end: free street -> check, anything else -> fold.
  // preAction.test.ts pins this against the engine; this pins that the bar
  // sends what the rule chose.
  if (f.legal) {
    const want = f.legal.includes("check") ? "check" : "fold";
    if (f.move !== want) fails.push(`hand ${f.handNo}: legal ${f.legal.join("/")} -> sent ${f.move}, wanted ${want}`);
  }
}
if (obs.stillArmedAfterFire > 0) fails.push(`stayed armed after firing ${obs.stillArmedAfterFire}x`);
if (obs.armedIntoNextHand > 0) fails.push("stayed armed into the next hand");
if (errors.length) fails.push(`page errors: ${errors.join(" | ")}`);

console.log("\n--- pre-action ---");
console.log(`hands seen              ${obs.hands.size}`);
console.log(`box offered (waiting)   ${obs.boxSeenWaiting} samples`);
console.log(`box offered (own turn)  ${obs.boxSeenOnTurn} samples  [must be 0]`);
console.log(`armed samples           ${obs.armedTicks}`);
console.log(`dead taps               ${obs.deadTaps}  [must be 0]`);
console.log(`fired                   ${obs.fired.map((f) => `${f.handNo}:${f.move}`).join(", ") || "none"}`);
const moves = new Set(obs.fired.map((f) => f.move));
console.log(`moves seen              ${[...moves].join(", ") || "none"}${moves.has("fold") ? "" : "   (no fold arm this run)"}`);
console.log(fails.length ? `\nFAIL\n - ${fails.join("\n - ")}` : "\nPASS");

await browser.close();
process.exit(fails.length ? 1 : 0);
