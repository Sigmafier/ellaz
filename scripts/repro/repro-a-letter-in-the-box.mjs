/**
 * Lettercross: a letter IN a prize box collects it, a letter BESIDE one does not.
 *
 *   node scripts/repro/repro-a-letter-in-the-box.mjs        (needs `npm run dev`)
 *
 * The operator, 2026-08-25, on playing the first bonus round: "the mini game
 * only apply if you put a letter in the outside boxes not near them." That is
 * BONUS's own rule, read out of its own executable - the FIRST OR LAST letter of
 * a word placed ON a bonus square is what wins the prize. Until that day this
 * game collected a box by filling the board square NEXT to it.
 *
 * `reaching-a-box-collects-it.test.ts` pins the rule and cannot see the page.
 * This drives the real one, both arms, and exits 1 if either is wrong:
 *
 *   arm IN      a word laid into a prize square  -> prize taken, bonus round opens
 *   arm BESIDE  the same word laid up against one -> scores, and NOTHING opens
 *
 * The second arm is the control and it is the one that matters. Without it, an
 * "IN works" pass is equally consistent with a build where EVERYTHING opens a
 * round - which is exactly the build being fixed.
 *
 * THREE THINGS IT DOES DELIBERATELY, each of which cost a wrong reading first:
 *
 * - ONE CLICK PER `evaluate`, with a wait. Tapping a rack tile and a square in
 *   one evaluate makes the square's handler read the selection from before React
 *   re-rendered, and the tile silently does not land.
 * - IT ASSERTS EACH TILE LANDED before laying the next. A run that reports "No
 *   gaps" because the probe itself dropped a letter is a probe reporting its own
 *   mistake as a finding.
 * - IT SEEDS CONSENT. A fresh context always meets the consent bar, which covers
 *   the bottom of the page; the operator dismissed it once and never sees it.
 *
 * The rack is dealt at random, so a run can legitimately find no word it can
 * build. That exits 2 - "could not test" - and never 0.
 */
import { chromium } from "playwright";
import { WORDS } from "../../src/games/lettercross/words.ts";

const URL = process.env.LETTERCROSS_URL ?? "http://localhost:5180/games/lettercross/";
const BOXQ = '[aria-label="Prize box"],[aria-label="Locked"]';
const SHOTS = process.env.SHOT_DIR ?? "/tmp";

const browser = await chromium.launch();

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  PAGE ERR:", String(e).slice(0, 200)));
  await p.addInitScript(() => { try { localStorage.setItem("ellaz:consent:v1", "denied"); } catch {} });
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForSelector('[aria-label="Prize box"]', { timeout: 60000 });
  return p;
}

const click = async (p, fn, arg) => { await p.evaluate(fn, arg); await p.waitForTimeout(150); };
/**
 * Tap a rack tile by its letter, skipping any already spent this turn. `find` on
 * the letter alone taps the FIRST match, which is disabled once its tile is on
 * the board - so a word with a repeated letter lays one letter and then nothing.
 */
const rackTile = (p, ch) => click(p, (c) => [...document.querySelectorAll("button")]
  .find((e) => !e.disabled && /^[A-Z]\d+$/.test(e.textContent.trim()) && e.textContent.trim()[0] === c)?.click(), ch.toUpperCase());
const boxSquare = (p, r, c) => click(p, ({ r, c, q }) => [...document.querySelectorAll(q)]
  .find((e) => { const s = getComputedStyle(e); return +s.gridRowStart === r && +s.gridColumnStart === c; })?.click(), { r, c, q: BOXQ });
const boardGrid = (r, c) => {
  const g = [...document.querySelectorAll("div")].filter((d) => (d.getAttribute("style") || "").includes("grid-template-columns: repeat(9,"));
  return g[g.length - 1]?.children[r * 9 + c];
};
const boardSquare = (p, r, c) => click(p, ({ r, c }) => {
  const g = [...document.querySelectorAll("div")].filter((d) => (d.getAttribute("style") || "").includes("grid-template-columns: repeat(9,"));
  g[g.length - 1]?.children[r * 9 + c]?.click();
}, { r, c });
const boardText = (p, r, c) => p.evaluate(({ r, c }) => {
  const g = [...document.querySelectorAll("div")].filter((d) => (d.getAttribute("style") || "").includes("grid-template-columns: repeat(9,"));
  return g[g.length - 1]?.children[r * 9 + c]?.textContent.trim() ?? "";
}, { r, c });

const rackLetters = (p) => p.evaluate(() => [...document.querySelectorAll("button")]
  .map((e) => e.textContent.trim()).filter((t) => /^[A-Z]\d+$/.test(t)).map((t) => t[0].toLowerCase()));

function wordFrom(letters, min, max) {
  for (const w of WORDS) {
    if (w.length < min || w.length > max) continue;
    const pool = [...letters];
    if ([...w].every((ch) => { const k = pool.indexOf(ch); if (k < 0) return false; pool.splice(k, 1); return true; })) return w;
  }
  return null;
}

async function topOpenBox(p) {
  const ring = await p.evaluate((q) => [...document.querySelectorAll(q)].map((el) => {
    const s = getComputedStyle(el);
    return { r: +s.gridRowStart, c: +s.gridColumnStart, label: el.getAttribute("aria-label"), tag: el.tagName };
  }), BOXQ);
  if (ring.length !== 12) throw new Error(`expected 12 prize squares, found ${ring.length}`);
  const notButtons = ring.filter((o) => o.tag !== "BUTTON");
  if (notButtons.length) throw new Error(`${notButtons.length} prize squares are not tappable - a box you cannot tap is a box you cannot play into`);
  return ring.find((o) => o.r === 1 && o.label === "Prize box");
}

const played = (p) => p.evaluate(() => [...document.querySelectorAll("button")]
  .find((e) => ["Play", "לשחק", "Jugar"].includes(e.textContent.trim()))?.click());

const outcome = (p) => p.evaluate(() => ({
  bonus: !!document.querySelector('[aria-label="Bonus round"]'),
  frame: (document.querySelector("#game-frame")?.innerText || "").replace(/\n/g, " ").slice(0, 140),
}));

/** Lay `word` downward from `startRow` of `col`, asserting each tile landed. */
async function layDown(p, word, col, box) {
  for (let k = 0; k < word.length; k++) {
    await rackTile(p, word[k]);
    if (box && k === 0) { await boxSquare(p, box.r, box.c); continue; }
    const row = box ? k - 1 : k;
    await boardSquare(p, row, col);
    const got = await boardText(p, row, col);
    if (got.toLowerCase() !== word[k]) {
      throw new Error(`"${word[k]}" did not land at row ${row} (square reads "${got}") - the probe dropped a tile`);
    }
  }
}

let bad = 0;

// ---------------------------------------------------------------- arm IN
{
  const p = await open();
  const box = await topOpenBox(p);
  const letters = await rackLetters(p);
  const word = wordFrom(letters, 3, 4);
  if (!word) { console.log(`IN     SKIPPED - no word buildable from "${letters.join("")}"`); process.exitCode = 2; }
  else {
    await layDown(p, word, box.c - 2, box);
    await p.screenshot({ path: `${SHOTS}/box-in-laid.png` });
    await played(p); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${SHOTS}/box-in-played.png` });
    const o = await outcome(p);
    console.log(`IN     "${word}" laid into the box at ring ${box.r},${box.c}`);
    console.log(`       ${o.bonus ? "PASS" : "FAIL"} bonus round ${o.bonus ? "opened" : "did NOT open"} | ${o.frame}`);
    if (!o.bonus) bad++;
  }
  await p.context().close();
}

// ------------------------------------------------------------ arm BESIDE
{
  const p = await open();
  const box = await topOpenBox(p);
  const letters = await rackLetters(p);
  const word = wordFrom(letters, 2, 4);
  if (!word) { console.log(`BESIDE SKIPPED - no word buildable from "${letters.join("")}"`); process.exitCode = 2; }
  else {
    await layDown(p, word, box.c - 2, null);
    await p.screenshot({ path: `${SHOTS}/box-beside-laid.png` });
    await played(p); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${SHOTS}/box-beside-played.png` });
    const o = await outcome(p);
    const scored = /Score\s+[1-9]/.test(o.frame);
    console.log(`BESIDE "${word}" laid up against the box, board rows 0..${word.length - 1} of column ${box.c - 2}`);
    console.log(`       ${scored ? "ok" : "INCONCLUSIVE"} the word was ${scored ? "accepted" : "REFUSED - rerun"} | ${o.frame}`);
    console.log(`       ${!o.bonus ? "PASS" : "FAIL"} bonus round ${o.bonus ? "OPENED - a letter near a box is collecting it again" : "did not open"}`);
    if (o.bonus) bad++;
    if (!scored) process.exitCode = 2;
  }
  await p.context().close();
}

await browser.close();
console.log(bad ? `\n${bad} arm(s) wrong` : "\nboth arms behaved");
if (bad) process.exit(1);
