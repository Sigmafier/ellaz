// Does the client ever hold TWO sockets to one table at once?
//
// The operator: "i see cards in flop go again and again hence i see more than
// 6 7 8 cards on deck". Every guard on the board says that is impossible, and
// they are all guards against ONE stream of events. Two sockets deliver every
// broadcast twice into one store, and `StreetDealt` APPENDS — so a flop
// applied twice is a six-card board made of the right three cards, twice.
//
// `wake()` returns early only when the socket is OPEN. A socket that is
// CONNECTING or CLOSING is neither open nor gone, and `open()` overwrites
// `this.ws` without closing what was there — so a visibilitychange inside that
// window leaves the old socket live, receiving, and (via its own onclose)
// running the reconnect ladder for a socket nobody is using.
//
// This counts WebSocket constructions and how many are simultaneously open,
// and reads the board out of the store while it does it.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const CODE = process.env.CODE ?? "PRACT";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();

// Count sockets from inside the page, before any app code runs.
await page.addInitScript(() => {
  const Real = window.WebSocket;
  window.__ws = { made: [], open: 0, peak: 0 };
  // @ts-ignore
  window.WebSocket = function (url, protocols) {
    const s = protocols === undefined ? new Real(url) : new Real(url, protocols);
    window.__ws.made.push(String(url));
    s.addEventListener("open", () => {
      window.__ws.open += 1;
      window.__ws.peak = Math.max(window.__ws.peak, window.__ws.open);
    });
    s.addEventListener("close", () => {
      window.__ws.open -= 1;
    });
    return s;
  };
  window.WebSocket.prototype = Real.prototype;
  for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) window.WebSocket[k] = Real[k];
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

// Enter the room and hammer the wake path across the connect window, which is
// what a person does by alt-tabbing back to the tab.
await page.evaluate((c) => (location.hash = `#/room/${c}`), CODE);
for (let i = 0; i < 40; i++) {
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(25);
}
await page.waitForTimeout(2000);

const after = await page.evaluate(() => ({ ...window.__ws }));
console.log(`sockets constructed: ${after.made.length}`);
console.log(`peak simultaneously OPEN: ${after.peak}`);
console.log(`still open now: ${after.open}`);

// Now watch the board while the doubled stream plays.
let maxBoard = 0;
let worst = null;
const end = Date.now() + Number(process.env.WATCH_S ?? 150) * 1000;
while (Date.now() < end) {
  const s = await page.evaluate(() => {
    const st = window.__holdem?.getState?.();
    return {
      dom: document.getElementById("board")?.children.length ?? -1,
      store: st?.handBoard?.length ?? -1,
      shown: st?.shownCount ?? -1,
      server: st?.view?.hand?.board?.length ?? null,
      cards: (st?.handBoard ?? []).join(" "),
      pot: st?.lastPot?.amount ?? null,
      open: window.__ws.open,
    };
  });
  if (s.store > maxBoard) {
    maxBoard = s.store;
    worst = s;
  }
  await page.waitForTimeout(120);
}

console.log(`\nmax handBoard seen: ${maxBoard}`);
if (worst) console.log("worst sample:", JSON.stringify(worst));
console.log(worst && worst.store > 5 ? "\nREPRODUCED — the board held more than five cards" : "\nnot reproduced in this window");
await browser.close();
