// Sit down at the practice table and watch it play.
//
// The socket fix changed the one path every message arrives on, so "the board
// never exceeds five" is only half the check — the other half is that hands
// still happen at all. Checks in on a real seat, folds everything, and reports
// what the board did across several hands.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const MINUTES = Number(process.env.MINUTES ?? 5);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.addInitScript(() => {
  const Real = window.WebSocket;
  window.__ws = { made: 0, open: 0, peak: 0 };
  // @ts-ignore
  window.WebSocket = function (u, p) {
    const s = p === undefined ? new Real(u) : new Real(u, p);
    window.__ws.made++;
    s.addEventListener("open", () => {
      window.__ws.open++;
      window.__ws.peak = Math.max(window.__ws.peak, window.__ws.open);
    });
    s.addEventListener("close", () => window.__ws.open--);
    return s;
  };
  window.WebSocket.prototype = Real.prototype;
  for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) window.WebSocket[k] = Real[k];
  // The practice table is behind a switch now, and this needs it on.
  localStorage.setItem("holdem:bots", "1");
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.evaluate(() => (location.hash = "#/room/PRACT"));
await page.waitForTimeout(4000);

// Sit. "Sit here" opens the buy-in sheet; the sheet's own confirm is "Sit".
const sitHere = page.getByRole("button", { name: /sit here|לשבת כאן/i }).first();
await sitHere.click({ timeout: 10_000 }).catch((e) => console.log("no empty seat:", e.message));
await page.waitForTimeout(1200);
for (const b of await page.$$("button")) {
  const t = ((await b.textContent()) ?? "").trim();
  if (/^(Sit|שב)$/i.test(t)) {
    await b.click().catch(() => {});
    break;
  }
}
await page.waitForTimeout(3000);

const hands = new Set();
const boards = new Map(); // handNo -> max cards seen
let maxDom = 0;
let seated = -1;
const end = Date.now() + MINUTES * 60_000;

while (Date.now() < end) {
  const s = await page.evaluate(() => {
    const st = window.__holdem?.getState?.();
    // Fold whenever it is our turn, so the table keeps moving.
    const fold = [...document.querySelectorAll("button")].find((b) =>
      /^(fold|פולד|לזרוק)$/i.test((b.textContent ?? "").trim()),
    );
    if (fold && st?.you?.legal) fold.click();
    return {
      dom: document.getElementById("board")?.children.length ?? 0,
      store: st?.handBoard?.length ?? 0,
      handNo: st?.view?.hand?.handNo ?? null,
      seat: st?.you?.seatIdx ?? -1,
      ws: { ...window.__ws },
    };
  });
  seated = s.seat;
  maxDom = Math.max(maxDom, s.dom);
  if (s.handNo != null) {
    hands.add(s.handNo);
    boards.set(s.handNo, Math.max(boards.get(s.handNo) ?? 0, s.store));
  }
  await page.waitForTimeout(400);
}

const ws = await page.evaluate(() => ({ ...window.__ws }));
console.log(`seated at ${seated}`);
console.log(`sockets: ${ws.made} constructed, peak ${ws.peak} open at once`);
console.log(`hands watched: ${hands.size} — ${[...hands].join(", ")}`);
console.log(`largest board per hand: ${JSON.stringify([...boards.entries()])}`);
console.log(`most cards ever drawn on the felt: ${maxDom}`);
console.log(maxDom > 5 ? "FAIL — more than five community cards" : "OK — never more than five");
if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(" | ")}`);
await browser.close();
