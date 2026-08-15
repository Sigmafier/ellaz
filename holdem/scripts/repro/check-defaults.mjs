// Did the six decisions actually land on the live table?
//
// Every one of them is a COMPUTED style, which is the only reading that counts:
// the look system's whole failure mode is a rule that matches and is then beaten
// by an inline style, and that is invisible from the source of either file. It
// was live in the Pill arm for as long as the arm existed.
//
// Fresh context per check so the service worker cannot serve this morning's
// bundle, which is how a shipped fix reads as un-shipped.

import { chromium } from "playwright-core";

const URL = process.env.SITE ?? "https://poker.ellaz.fun/";
const browser = await chromium.launch({ headless: true });

async function page(hash) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem("holdem:bots", "1"));
  await p.goto(URL + hash, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(hash ? 4500 : 2500);
  return { p, ctx };
}

const results = [];
const check = (name, got, want, ok) => {
  results.push({ name, got, want, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}\n       got ${got}\n       want ${want}`);
};

// ---- the table -----------------------------------------------------------
// MEASURED ON THE STUDIO'S FELT, not on the practice table, and that is a
// correction worth keeping. A spectator at a real table sees other players'
// CARD BACKS and no faces at all until a flop - and most bot hands end before
// one. So the first two runs of this probe reported "0 cards, the big rank is
// missing, the corner index is missing": three failures that were one wrong
// SURFACE, and would have read as the card-face change never landing.
//
// The studio's felt is a real <Table> fed by the real store over a real dealt
// hand, and it is always mid-hand, which is exactly what this needs.
{
  const { p, ctx } = await page("#/look");
  await p.waitForSelector(".hm-card", { timeout: 45_000 }).catch(() => {});
  const r = await p.evaluate(() => {
    const felt = document.getElementById("felt");
    const card = document.querySelector(".hm-card");
    const rank = document.querySelector(".hm-card-rank");
    const idx = document.querySelector(".hm-card-idx-1");
    const plate = document.querySelector(".hm-plate");
    const root = getComputedStyle(document.documentElement);
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const cardBox = card?.getBoundingClientRect();
    return {
      feltRadius: felt ? cs(felt).borderRadius : "no felt",
      pace: root.getPropertyValue("--pace").trim(),
      cardRatio: root.getPropertyValue("--card-ratio").trim(),
      cardShape: cardBox ? +(cardBox.height / cardBox.width).toFixed(3) : null,
      rankShown: rank ? cs(rank).display : "missing",
      rankSize: rank ? cs(rank).fontSize : "missing",
      cornerShown: idx ? cs(idx).display : "missing",
      plateRadius: plate ? cs(plate).borderRadius : "no plate",
      platePadX: plate ? cs(plate).paddingLeft : "no plate",
      cards: document.querySelectorAll(".hm-card").length,
    };
  });

  check("the felt is a racetrack", r.feltRadius, "999px (fully round ends)", /999px/.test(r.feltRadius));
  check("the pace is doubled", r.pace, "2", r.pace === "2");
  check("the cards are wide", `--card-ratio ${r.cardRatio}, measured ${r.cardShape}`, "1.32", r.cardRatio === "1.32");
  check("the big rank is shown", r.rankShown, "flex", r.rankShown === "flex");
  check("no corner index", r.cornerShown, "none", r.cornerShown === "none");
  check("the nameplate is a pill", r.plateRadius, "999px", /999px/.test(r.plateRadius));
  // THE ONE THAT WAS BROKEN. The pill's padding-inline never applied, because an
  // inline `padding` shorthand beat it. u(10) at this scale is ~10-26px; the
  // pill multiplies by 2.1, so anything at or below the base is the old defect.
  check(
    "the pill has its extra padding (the fix)",
    r.platePadX,
    "> 20px — 2.1x the base, not the base",
    Number.parseFloat(r.platePadX) > 20,
  );
  check("cards are on the felt at all", `${r.cards} cards`, "at least 2", r.cards >= 2);
  await ctx.close();
}

// ---- the way in ----------------------------------------------------------
{
  const { p, ctx } = await page("");
  const r = await p.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim());
    return { studio: btns.find((t) => /Make it yours|לעצב/.test(t)) ?? null, count: btns.length };
  });
  check("the studio is on the home screen", r.studio ?? "(not found)", "a 'Make it yours' row", !!r.studio);
  await ctx.close();
}

// ---- the studio ----------------------------------------------------------
{
  const { p, ctx } = await page("#/look");
  const look = await p.evaluate(() => {
    const txt = document.body.innerText;
    return {
      settled: /Settled · (\d+)/.exec(txt)?.[1] ?? "0",
      soundsTab: /Sounds · (\d+)/.exec(txt)?.[1] ?? "0",
      lookTab: /Look · (\d+)/.exec(txt)?.[1] ?? "0",
      settleButtons: [...document.querySelectorAll("button")].filter((b) => /Settle/.test(b.textContent ?? "")).length,
    };
  });
  check("the six arrive settled", `Settled · ${look.settled}`, "5 look axes", look.settled === "5");
  check("the open ones can be settled", `${look.settleButtons} Settle buttons`, "one per open strip", look.settleButtons >= 8);
  check("the sound tab counts every option", `Sounds · ${look.soundsTab}`, "98", look.soundsTab === "98");
  // 71 = the 70 that shipped before, plus the new `clean` card face. (Written
  // as 72 on the first run of this probe, from memory rather than from the
  // registry, and duly reported as a failure of the app.)
  check("the look tab counts every option", `Look · ${look.lookTab}`, "71", look.lookTab === "71");
  await ctx.close();
}

await browser.close();

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
if (bad.length) {
  console.log("FAILED: " + bad.map((b) => b.name).join(" | "));
  process.exit(1);
}
