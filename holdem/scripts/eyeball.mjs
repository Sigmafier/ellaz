// Drive the built client in a real browser at 390px, with a real second
// player, against a real Durable Object. Asserts on the RENDERED page, never
// on markup presence — a component that mounts and paints nothing passes every
// "is it in the DOM" check.

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// playwright-core is NOT a dependency of this workspace, on purpose: it is a
// ~120 MB install that CI does not need, since holdem.yml runs the unit suite
// and the smoke. Point PLAYWRIGHT_CORE at any checkout that has one.
//   PLAYWRIGHT_CORE=~/some-project/node_modules/playwright-core/index.mjs \
//   CHROME=~/.cache/ms-playwright/chromium-1237/chrome-linux64/chrome \
//   node scripts/eyeball.mjs
const { chromium } = await import(
  process.env.PLAYWRIGHT_CORE ?? "playwright-core"
).catch(() => {
  console.error(
    "eyeball needs playwright-core. Set PLAYWRIGHT_CORE to an index.mjs from any checkout that has one.",
  );
  process.exit(2);
});

const HOLDEM = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = process.env.EYEBALL_CLIENT ?? "http://localhost:4173";
const SERVER = process.env.EYEBALL_SERVER ?? "http://localhost:8787";
const SHOTS = process.env.EYEBALL_SHOTS ?? join(HOLDEM, "eyeball-shots");
mkdirSync(SHOTS, { recursive: true });

const problems = [];
const check = (ok, msg) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
  if (!ok) problems.push(msg);
};

const browser = await chromium.launch({
  headless: true,
  // Undefined lets playwright find its own browser; CHROME points at one from
  // another checkout's cache when this workspace has never installed any.
  executablePath: process.env.CHROME || undefined,
});

// A fresh context per player: same-origin means shared localStorage, so two
// tabs would share one device token and BE the same player. This is the trap
// that would make a two-player test silently test one player.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => consoleErrors.push(`requestfailed ${r.url()}`));
page.on("response", (r) => { if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`); });

let cli;
try {
  // ---------------------------------------------------------------- home
  await page.goto(CLIENT, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".banner", { timeout: 10_000 });

  const nameBefore = await page.locator(".banner strong").first().innerText();
  check(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(nameBefore), `assigned a pooled name: "${nameBefore}"`);

  await page.getByRole("button", { name: "pick another name" }).click();
  const nameAfter = await page.locator(".banner strong").first().innerText();
  check(nameAfter !== nameBefore, `reroll changed the name: "${nameBefore}" -> "${nameAfter}"`);

  // Nothing may overflow a 390px phone.
  const overflow = await page.evaluate(() => {
    const wide = [...document.querySelectorAll("*")].filter(
      (el) => el.getBoundingClientRect().width > document.documentElement.clientWidth + 1,
    );
    return { docScroll: document.documentElement.scrollWidth, wide: wide.length };
  });
  check(overflow.docScroll <= 390, `no horizontal overflow (scrollWidth ${overflow.docScroll})`);
  check(overflow.wide === 0, `no element wider than the viewport (${overflow.wide})`);

  await page.screenshot({ path: `${SHOTS}/1-home.png` });

  // -------------------------------------------------------------- create
  await page.getByRole("button", { name: "start a table" }).click();
  await page.waitForFunction(() => location.search.includes("t="), { timeout: 15_000 });
  const code = new URL(page.url()).searchParams.get("t");
  check(!!code && code.length === 5, `created table ${code}, code is in the URL (a link is the invite)`);

  await page.waitForSelector(".seat", { timeout: 10_000 });
  const seats = await page.locator(".seat").count();
  check(seats === 6, `six seats rendered (${seats})`);
  await page.screenshot({ path: `${SHOTS}/2-empty-table.png` });

  // ----------------------------------------------------------- player 1 sits
  await page.locator(".seat.empty").first().click();
  await page.waitForFunction(() => document.querySelectorAll(".seat.empty").length === 5, {
    timeout: 10_000,
  });
  check(true, "player 1 took a seat");

  // ----------------------------------------------------------- player 2 joins
  // The CLI harness is a genuinely separate client with its own token — a
  // second browser tab would share storage and be the same player.
  cli = spawn("node", ["scripts/cli-client.mjs", code, "Robot", "1"], {
    cwd: HOLDEM,
    env: { ...process.env, HOLDEM_URL: SERVER },
    stdio: ["pipe", "pipe", "pipe"],
  });
  cli.stdout.on("data", () => {});
  cli.stderr.on("data", () => {});

  // ------------------------------------------------------------- a hand runs
  await page.waitForSelector(".card.mine:not(.back)", { timeout: 30_000 });
  const hole = await page.locator(".card.mine:not(.back)").count();
  check(hole === 2, `dealt two hole cards, face up, to me only (${hole})`);

  const others = await page.locator(".seat .card.back").count();
  check(others >= 2, `the other player's cards are face DOWN (${others} backs)`);

  // My own seat must NOT also show face-down cards — my real ones are already
  // on screen, larger, at the bottom. Two backs there read as a second hand.
  const myBacks = await page.evaluate(() => {
    const mine = [...document.querySelectorAll(".seat")].find((s) =>
      s.textContent?.includes("(you)"),
    );
    return mine ? mine.querySelectorAll(".card.back").length : -1;
  });
  check(myBacks === 0, `my own seat shows no duplicate card backs (${myBacks})`);

  // Every seat name must fit rather than ellipse.
  const ellipsed = await page.evaluate(
    () =>
      [...document.querySelectorAll(".seat-name span:last-child")].filter(
        (el) => el.scrollWidth > Math.ceil(el.getBoundingClientRect().width),
      ).length,
  );
  check(ellipsed === 0, `no seat name is clipped (${ellipsed} clipped)`);

  const potText = await page.locator(".pot").innerText();
  check(/pot \d+/.test(potText) && !/pot 0$/.test(potText), `blinds are in the pot: "${potText}"`);

  await page.screenshot({ path: `${SHOTS}/3-hand-dealt.png` });

  // --------------------------------------------------------------- my turn
  const acted = await page
    .waitForSelector(".controls .btn-fold", { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  if (acted) {
    check(true, "betting controls appeared when it was my turn");

    const tap = await page.evaluate(() => {
      const rects = [...document.querySelectorAll(".controls button")].map((b) =>
        b.getBoundingClientRect(),
      );
      return { n: rects.length, min: Math.min(...rects.map((r) => r.height)) };
    });
    check(tap.min >= 44, `every control is at least 44px tall (smallest ${tap.min}px)`);

    // Text must not be clipped INSIDE a button — the quiet half of the
    // overflow bug, invisible to a container-width check.
    const clipped = await page.evaluate(
      () =>
        [...document.querySelectorAll(".controls button")].filter(
          (b) => b.scrollWidth > Math.ceil(b.getBoundingClientRect().width),
        ).length,
    );
    check(clipped === 0, `no control has clipped text (${clipped} clipped)`);

    const timer = await page.locator(".timer-fill").count();
    check(timer === 1, "the action clock is showing");

    await page.screenshot({ path: `${SHOTS}/4-my-turn.png` });

    await page.locator(".controls .btn-fold, .controls .btn-call").first().click();
    check(true, "acted without an error");
  } else {
    check(false, "never got a turn within 30s");
  }

  // ------------------------------------------------------------- desktop
  // ellaz shipped a difficulty toggle 1193px wide on a laptop because every
  // row was `flex: 1 1 0` with no ceiling. One media query caps the screen;
  // this is the check that proves it is doing something.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  const wide = await page.evaluate(() => {
    const screen = document.querySelector(".screen");
    const btn = document.querySelector(".controls button");
    return {
      screen: screen ? Math.round(screen.getBoundingClientRect().width) : -1,
      button: btn ? Math.round(btn.getBoundingClientRect().width) : -1,
    };
  });
  check(wide.screen <= 680, `the table is capped on a laptop (${wide.screen}px, not 1440)`);
  // Derived, not guessed: buttons share the capped panel, so the honest claim
  // is "no single control spans the whole row". 260 was a number I invented
  // and it failed a correct layout — a threshold argued against nothing is
  // just a second bug wearing a gate's clothes.
  check(
    wide.button <= wide.screen / 2,
    `no control spans the panel (${wide.button}px of ${wide.screen}px)`,
  );
  await page.screenshot({ path: `${SHOTS}/5-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });

  // ----------------------------------------------------------------- log
  const logLines = await page.locator(".log > div").count();
  check(logLines > 0, `the hand log is narrating (${logLines} lines)`);

  check(consoleErrors.length === 0, `no console errors (${consoleErrors.slice(0, 6).join(" | ")})`);
} finally {
  cli?.kill();
  await browser.close();
}

console.log("");
if (problems.length) {
  console.log(`EYEBALL FAIL — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log("EYEBALL OK — the table plays in a real browser at 390px");
