/**
 * Lettercross: the symbol on a prize box is a promise about which screen opens.
 *
 *   npx tsx scripts/repro/repro-the-box-opens-its-own-round.mjs  (needs `npm run dev`)
 *
 * `tsx` rather than `node`, and it is not a preference: this reads `boxes.ts`
 * and `bonus.ts` so the mapping under test comes from the source rather than a
 * copy, and those import each other without file extensions. Node's own TS
 * loader wants the extension; tsx resolves it the way Vite does. Its sibling
 * repro runs under plain `node` only because `words.ts` imports nothing.
 *
 * BONUS put five bonus screens behind its boxes and every one was a word game.
 * Three of ours are live, and `ROUND_OF` in `bonus.ts` says which art opens
 * which:
 *
 *   star -> the same letter missing from THREE words   (30s, the original's 100)
 *   bell -> the same letter missing from TWO words     (20s, the original's 40)
 *   gem, leaf, drop -> build a crossword from 16 letters (60s)
 *
 * `shared-letter-is-wired.test.ts` reads the source and proves the table is
 * consulted. It cannot prove the screen a child ends up looking at, which is
 * three files away from that table - a box index, an art, a kind, a component.
 * This lands a real word in a real box and reads what came up.
 *
 * THE THIRD ARM IS THE CONTROL. "The star opens the three-word round" is equally
 * true of a build where EVERY box opens it, and that build is one typo away: the
 * gem must still open the crossword.
 *
 * Same three disciplines as its sibling repro, each of which cost a wrong
 * reading first: one click per `evaluate` with a wait (a tile and a square in
 * one evaluate makes the square read the selection from before React
 * re-rendered), assert each tile LANDED before laying the next, and seed the
 * consent bar away because a fresh context always meets it.
 *
 * The rack is dealt at random, so a run can legitimately find no word it can
 * build. That exits 2 - "could not test" - and never 0.
 */
import { chromium } from "playwright";
import { WORDS } from "../../src/games/lettercross/words.ts";
import { BOXES, boxIndex } from "../../src/games/lettercross/boxes.ts";
import { ROUND_OF } from "../../src/games/lettercross/bonus.ts";
import { SIZE } from "../../src/games/lettercross/grid.ts";

const URL = process.env.LETTERCROSS_URL ?? "http://localhost:5180/games/lettercross/";
const BOXQ = '[aria-label="Prize box"],[aria-label="Locked"]';
const SHOTS = process.env.SHOT_DIR ?? "/tmp";

/** What each round puts on the screen - the thing a player would actually see. */
const LOOKS_LIKE = {
  crossword: { label: "Bonus round", lines: 0 },
  shared2: { label: "Letter round", lines: 2 },
  shared3: { label: "Letter round", lines: 3 },
};

const browser = await chromium.launch();
const click = async (p, fn, arg) => { await p.evaluate(fn, arg); await p.waitForTimeout(150); };

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 940 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  PAGE ERR:", String(e).slice(0, 200)));
  await p.addInitScript(() => { try { localStorage.setItem("ellaz:consent:v1", "denied"); } catch {} });
  // 90s, because this is a WSL dev server on /mnt/c and a cold transform of the
  // game chunk genuinely takes that long when a production build is running
  // beside it. A repro that times out on a healthy page is a repro nobody trusts.
  p.setDefaultNavigationTimeout(90_000);
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForSelector('[aria-label="Prize box"]', { timeout: 60000 });
  return p;
}

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

/**
 * Tap a rack tile by its letter, skipping any already spent this turn.
 * `find` on the letter alone taps the FIRST match, which is disabled once its
 * tile is on the board - so a word with a repeated letter silently laid one
 * letter and then nothing. Caught by the landed-assertion below, which is the
 * whole reason that assertion is there.
 */
const tapRack = (p, ch) => click(p, (c) => [...document.querySelectorAll("button")]
  .find((e) => !e.disabled && /^[A-Z]\d+$/.test(e.textContent.trim()) && e.textContent.trim()[0] === c)?.click(), ch.toUpperCase());
const tapBox = (p, r, c) => click(p, ({ r, c, q }) => [...document.querySelectorAll(q)]
  .find((e) => { const s = getComputedStyle(e); return +s.gridRowStart === r && +s.gridColumnStart === c; })?.click(), { r, c, q: BOXQ });
const tapBoard = (p, r, c) => click(p, ({ r, c, size }) => {
  const g = [...document.querySelectorAll("div")].filter((d) => (d.getAttribute("style") || "").includes(`grid-template-columns: repeat(${size},`));
  g[g.length - 1]?.children[r * size + c]?.click();
}, { r, c, size: SIZE });
const boardText = (p, r, c) => p.evaluate(({ r, c, size }) => {
  const g = [...document.querySelectorAll("div")].filter((d) => (d.getAttribute("style") || "").includes(`grid-template-columns: repeat(${size},`));
  return g[g.length - 1]?.children[r * size + c]?.textContent.trim() ?? "";
}, { r, c, size: SIZE });

/**
 * Lay `word` starting IN `box` and running onto the board. A top box runs
 * downward and a left box runs rightward - either way the box holds the first
 * letter, which is half of BONUS's own rule.
 */
async function layFromBox(p, box, word) {
  const down = box.row < 0;
  for (let k = 0; k < word.length; k++) {
    await tapRack(p, word[k]);
    if (k === 0) { await tapBox(p, box.row + 2, box.col + 2); continue; }
    const r = down ? k - 1 : box.row;
    const c = down ? box.col : k - 1;
    await tapBoard(p, r, c);
    const got = await boardText(p, r, c);
    if (got.toLowerCase() !== word[k]) {
      throw new Error(`"${word[k]}" did not land at ${r},${c} (reads "${got}") - the probe dropped a tile`);
    }
  }
}

const play = (p) => p.evaluate(() => [...document.querySelectorAll("button")]
  .find((e) => ["Play", "לשחק", "Jugar"].includes(e.textContent.trim()))?.click());

/** Press the round's own START. Every BONUS screen had one, so every one waits. */
const pressStart = (p) => click(p, () => {
  const round = document.querySelector('[role="group"][aria-label]');
  [...(round?.querySelectorAll("button") ?? [])]
    .find((e) => ["Start", "התחל", "Empezar"].includes(e.textContent.trim()))?.click();
});

/**
 * What is on the screen once the round is running.
 *
 * The word lines are counted off their own `aria-label`, which is the PATTERN -
 * so a line still carrying its blank contains "_" and nothing else on either
 * screen does. Counting styled `<div>`s instead looked right and was not: the
 * crossword round's letter tray is also a flex row with the same gap, so it
 * scored as a word line.
 */
const onScreen = (p) => p.evaluate(() => {
  const round = document.querySelector('[role="group"][aria-label]');
  if (!round) return { label: null, lines: 0, hint: "" };
  return {
    label: round.getAttribute("aria-label"),
    hint: round.innerText.replace(/\n/g, " ").slice(0, 90),
    lines: [...round.querySelectorAll("[aria-label]")]
      .filter((e) => (e.getAttribute("aria-label") ?? "").includes("_")).length,
  };
});

let bad = 0, skipped = 0;

// One box per ROUND KIND, so the third arm is the control on the other two.
const perKind = new Map();
for (const b of BOXES) {
  const kind = ROUND_OF[b.art];
  if (!kind || perKind.has(kind)) continue;
  // Only a top or left box, so one lay-direction covers it.
  if (b.row >= SIZE || b.col >= SIZE) continue;
  perKind.set(kind, b);
}

for (const [kind, box] of perKind) {
  const want = LOOKS_LIKE[kind];
  const p = await open();
  const letters = await rackLetters(p);
  // Two letters is a real word here - `words.ts` ships an authored 2-letter set -
  // and a rack with no vowels can offer nothing longer, which is a bad reason to
  // report "could not test".
  const word = wordFrom(letters, 3, 4) ?? wordFrom(letters, 2, 2);
  if (!word) {
    console.log(`${kind.padEnd(9)} SKIPPED - no word buildable from "${letters.join("")}"`);
    skipped++; await p.context().close(); continue;
  }
  await layFromBox(p, box, word);
  await play(p);
  await p.waitForTimeout(900);
  await pressStart(p);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SHOTS}/round-${kind}.png` });
  const got = await onScreen(p);
  const okLabel = got.label === want.label;
  const okLines = kind === "crossword" ? true : got.lines === want.lines;
  console.log(`${kind.padEnd(9)} ${box.art.padEnd(5)} "${word}" -> ${okLabel && okLines ? "PASS" : "FAIL"}  label ${JSON.stringify(got.label)} lines ${got.lines}`);
  console.log(`          ${got.hint}`);
  if (!okLabel || !okLines) bad++;

  /**
   * AND IT MUST BE SOLVABLE. "The right screen opened" is not "the round works":
   * the letters on offer are generated too, and a row that does not contain the
   * answer renders perfectly and cannot be won.
   *
   * The answer is worked out HERE from the patterns the page is showing, against
   * the dictionary - not read out of the generator - so this arm would catch a
   * generator whose puzzle and whose offered letters disagree.
   */
  if (kind !== "crossword") {
    const patterns = await p.evaluate(() => [...document.querySelectorAll("[aria-label]")]
      .map((e) => e.getAttribute("aria-label")).filter((a) => a && a.includes("_")));
    const AZ = "abcdefghijklmnopqrstuvwxyz".split("");
    const answer = AZ.filter((c) => patterns.every((pat) => WORDS.has(pat.replace("_", c))));
    if (answer.length !== 1) {
      console.log(`          FAIL the page is showing ${patterns.join(" + ")} with ${answer.length} answers`);
      bad++;
    } else {
      const offered = await p.evaluate(() => [...document.querySelectorAll("button[aria-label]")]
        .map((e) => e.getAttribute("aria-label")).filter((a) => /^[a-z]$/.test(a ?? "")));
      if (!offered.includes(answer[0])) {
        console.log(`          FAIL the answer "${answer[0]}" is not among the letters offered (${offered.join("")})`);
        bad++;
      } else {
        await click(p, (c) => [...document.querySelectorAll("button[aria-label]")]
          .find((e) => e.getAttribute("aria-label") === c)?.click(), answer[0]);
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${SHOTS}/round-${kind}-solved.png` });
        const end = await p.evaluate(() => {
          const round = document.querySelector('[role="group"][aria-label]');
          return {
            text: (round?.innerText ?? "").replace(/\n/g, " ").slice(0, 60),
            blanksLeft: [...(round?.querySelectorAll("[aria-label]") ?? [])]
              .filter((e) => (e.getAttribute("aria-label") ?? "").includes("_")).length,
          };
        });
        const won = end.blanksLeft === 0;
        console.log(`          ${won ? "PASS" : "FAIL"} solved with "${answer[0]}" -> ${JSON.stringify(end.text)}`);
        if (!won) bad++;
      }
    }
  }
  await p.context().close();
}

await browser.close();
if (skipped) process.exitCode = 2;
console.log(bad ? `\n${bad} box(es) opened the wrong round` : "\nevery box opened the round its symbol promises");
if (bad) process.exit(1);
