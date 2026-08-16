#!/usr/bin/env node
/**
 * Render the pilot game pages to one reviewable HTML file.
 *
 *   node scripts/sim/render-pilots.mjs <out-dir>
 *
 * Not a deliverable - a reading surface for the operator's voice review, which
 * is the one thing the gate in `src/content/voice.ts` can never do. It imports
 * the REAL content modules and the REAL analyser through the alias hooks, so
 * what is on screen is what shipped. A hand-copied mock would drift the moment
 * a word changed, and the drift would be invisible exactly here, where the
 * whole point is reading the words closely.
 */

import { register } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

register("./alias-hooks.mjs", import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: render-pilots.mjs <out-dir>");

const { CONTENT } = await import(join(ROOT, "src/content/index.ts"));
const voice = await import(join(ROOT, "src/content/voice.ts"));

// Read the roster from CONTENT rather than a list here, so a new page shows up
// on the review surface the moment it is registered. A hand-kept list is how a
// page ships unreviewed.
const ORDER = Object.keys(CONTENT);
const LABEL = Object.fromEntries(ORDER.map((id) => [id, id]));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Mark the paragraph carrying a derived statistic, so it is findable by eye. */
function statParagraph(body) {
  let best = -1;
  let most = 0;
  body.forEach((p, i) => {
    const n = (p.match(/\d[\d.,]*/g) ?? []).length;
    if (n > most) {
      most = n;
      best = i;
    }
  });
  return most >= 3 ? best : -1;
}

function sectionList(title, items) {
  if (!items?.length) return "";
  return `<h2>${esc(title)}</h2><div class="cards">${items
    .map((it) => `<div class="card"><b>${esc(it.title)}</b><p>${esc(it.body)}</p></div>`)
    .join("")}</div>`;
}

function renderPage(id, locale, copy, provenance) {
  const r = voice.analyse(copy, locale);
  const fails = voice.violations(r);
  const statAt = statParagraph(copy.body);
  const he = locale === "he";
  const T = he
    ? { how: "איך משחקים", tips: "טיפים", teaches: "מה זה מלמד", ages: "לפי גיל", acc: "נגישות", tog: "לשחק ביחד", faq: "שאלות נפוצות" }
    : { how: "How to play", tips: "Tips", teaches: "What it teaches", ages: "By age", acc: "Accessibility", tog: "Playing together", faq: "Questions" };

  const metric = (label, value, ok) =>
    `<span class="m ${ok ? "ok" : "bad"}"><i>${esc(label)}</i>${esc(value)}</span>`;

  const bar = [
    metric("words", r.words, r.words >= voice.MIN_WORDS && r.words <= voice.MAX_WORDS),
    metric("spread", r.paragraphSpread.toFixed(2), r.paragraphSpread >= voice.MIN_PARAGRAPH_SPREAD),
    metric("fragments", r.shortSentences, r.shortSentences >= voice.MIN_SHORT_SENTENCES),
    metric("digits", r.digitFacts, r.digitFacts >= voice.MIN_DIGIT_FACTS),
    metric("rule-of-3", r.ruleOfThree, r.ruleOfThree <= voice.MAX_RULE_OF_THREE),
    metric("dashes", r.dashes, r.dashes === 0),
    metric("banned", r.bannedPhrases.length, r.bannedPhrases.length === 0),
  ].join("");

  const paras = copy.body
    .map((p, i) => `<p${i === statAt ? ' class="stat"' : ""}>${esc(p)}</p>`)
    .join("");

  const faq = copy.faq
    .map((f) => `<div class="q"><b>${esc(f.q)}</b><p>${esc(f.a)}</p></div>`)
    .join("");

  const prov = provenance
    .map((p) => `<li><code>${esc(p.source)}</code> - ${esc(p.claim)}</li>`)
    .join("");

  return `<section class="page" data-game="${id}" data-loc="${locale}" hidden>
  <div class="bar">${bar}${
    fails.length ? `<span class="m bad"><i>gate</i>${esc(fails.join("; "))}</span>` : `<span class="m ok"><i>gate</i>pass</span>`
  }<span class="m nb"><i>paragraphs</i>${r.paragraphWords.join(" / ")}</span></div>
  <article dir="${he ? "rtl" : "ltr"}" lang="${locale}">
    <div class="crumb">${he ? "בית / משחקים /" : "Home / Games /"} <b>${esc(LABEL[id])}</b></div>
    <div class="frame">${he ? "כאן המשחק עצמו" : "the game itself sits here"}</div>
    <h1>${esc(copy.metaTitle.split("|")[0].trim())}</h1>
    <p class="lede">${esc(copy.lede)}</p>
    ${paras}
    ${sectionList(T.how, copy.howToPlay)}
    ${sectionList(T.tips, copy.tips)}
    ${sectionList(T.teaches, copy.teaches)}
    ${sectionList(T.ages, copy.ages)}
    <h2>${esc(T.acc)}</h2><p>${esc(copy.accessibility)}</p>
    ${sectionList(T.tog, copy.together)}
    <h2>${esc(T.faq)}</h2>${faq}
  </article>
  <details class="prov"><summary>Where every number came from (${provenance.length})</summary><ul>${prov}</ul></details>
</section>`;
}

const pages = ORDER.flatMap((id) => {
  const c = CONTENT[id];
  if (!c) throw new Error(`${id} missing from CONTENT - the roster moved.`);
  // `c.copy[loc]`, and the LOCALES read off the object itself.
  //
  // Two bugs in one line, both silent in their own way. It read `c[loc]`, which
  // has been `undefined` since the prose moved under `copy` - so this script
  // crashed rather than rendering, and nobody noticed because it is run by hand.
  // And the locales were the literal `["he", "en"]`, so even working it would
  // have rendered two thirds of the site: Spanish pages were never once put in
  // front of a reader by the tool whose entire job is putting pages in front of
  // a reader.
  //
  // Derived from the content object, so a promoted language joins the review
  // surface the moment its prose exists. That matters more than it looks - a
  // human reading the rendered page is the ONLY check that can see whether the
  // prose sounds like a person, and it is the whole safety net for a language
  // nobody on the team reads.
  return Object.keys(c.copy).map((loc) => renderPage(id, loc, c.copy[loc], c.provenance));
}).join("\n");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ellaz - every game page, for the voice review</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0e1018;color:#e8e9f0;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
header{padding:22px 20px 16px;background:#151827;border-bottom:1px solid #262b40}
h1.top{margin:0 0 8px;font-size:21px}
.ask{max-width:760px;color:#b9bdd0;font-size:14.5px;margin:0 0 4px}
.ask b{color:#ffd36b}
nav{display:flex;flex-wrap:wrap;gap:8px;padding:14px 20px;background:#11142099;position:sticky;top:0;z-index:5;border-bottom:1px solid #262b40;backdrop-filter:blur(6px)}
button{font:inherit;font-size:14px;padding:8px 15px;border-radius:999px;border:1px solid #333a55;background:#1b2033;color:#cfd3e6;cursor:pointer}
button.on{background:#ff4d8d;border-color:#ff4d8d;color:#fff;font-weight:700}
nav .sep{width:1px;background:#333a55;margin:2px 6px}
.wrap{max-width:820px;margin:0 auto;padding:22px 18px 80px}
.bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}
.m{font-size:11.5px;padding:4px 9px;border-radius:7px;background:#1b2033;border:1px solid #2c3350;color:#cfd3e6}
.m i{font-style:normal;opacity:.6;margin-inline-end:6px;text-transform:uppercase;letter-spacing:.04em}
.m.ok{border-color:#2e6b46;background:#13251c}
.m.bad{border-color:#7a3550;background:#2a1520;color:#ffc9d8}
.m.nb{opacity:.75}
article{background:#fffdf8;color:#20222e;border-radius:16px;padding:30px 28px 34px}
article h1{font-size:26px;margin:6px 0 12px;line-height:1.25}
article h2{font-size:18px;margin:26px 0 10px;color:#b3245c}
article p{margin:0 0 14px}
.crumb{font-size:12.5px;color:#8b8f9e;margin-bottom:12px}
.frame{height:150px;border-radius:12px;background:repeating-linear-gradient(135deg,#f0eee8,#f0eee8 10px,#e8e5dd 10px,#e8e5dd 20px);display:flex;align-items:center;justify-content:center;color:#9a9daa;font-size:13px;margin-bottom:18px}
.lede{font-size:18px;font-weight:600;line-height:1.5}
p.stat{background:#fff6da;border-inline-start:4px solid #ffb020;padding:12px 14px;border-radius:0 8px 8px 0}
.cards{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.card{background:#f4f2ec;border-radius:10px;padding:12px 14px}
.card b{display:block;margin-bottom:4px;font-size:14.5px}
.card p{margin:0;font-size:14px;color:#4a4d5c}
.q{border-top:1px solid #eae7df;padding:12px 0}
.q b{display:block;margin-bottom:5px}
.q p{margin:0;color:#4a4d5c;font-size:15px}
.prov{margin-top:16px;font-size:13px;color:#a6abc2}
.prov code{color:#ffd36b}
.prov ul{margin:8px 0 0;padding-inline-start:20px}
.prov li{margin-bottom:5px}
.legend{font-size:12.5px;color:#8b8f9e;margin-top:14px}
</style></head><body>
<header>
  <h1 class="top">Three pilot pages. Read them, then tell me if this is the voice.</h1>
  <p class="ask">The gate already checked what a machine can check - length, rhythm, banned words, no dashes. <b>It cannot check the three things that decide this</b>: is the admission true, was the highlighted statistic really derived, and does it sound like us. That is your read, and it is the only thing between three pages and twenty-one.</p>
</header>
<nav>
  ${ORDER.map((id, i) => `<button data-g="${id}"${i === 0 ? ' class="on"' : ""}>${esc(id)}</button>`).join("\n  ")}
  <span class="sep"></span>
  <button data-l="he" class="on">עברית</button>
  <button data-l="en">English</button>
</nav>
<div class="wrap">
${pages}
<p class="legend">The amber paragraph is the derived statistic - the part no other kids-games site has. Green chips passed the gate, red failed. "paragraphs" is the word count of each body paragraph: the failing first draft ran 57/53/50/56/54.</p>
</div>
<script>
var g="${ORDER[0]}",l="he";
function show(){
  document.querySelectorAll(".page").forEach(function(p){
    p.hidden=!(p.dataset.game===g&&p.dataset.loc===l);
  });
  document.querySelectorAll("nav button").forEach(function(b){
    b.classList.toggle("on", b.dataset.g===g||b.dataset.l===l);
  });
  window.scrollTo(0,0);
}
document.querySelectorAll("nav button").forEach(function(b){
  b.addEventListener("click",function(){
    if(b.dataset.g)g=b.dataset.g; else l=b.dataset.l;
    show();
  });
});
show();
</script>
</body></html>`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), html, "utf8");
// Counted from what was actually rendered, not asserted from a literal. The
// "2" here outlived Spanish by four days and would have reported a confident
// wrong number about the very output the reader is holding.
const langCount = new Set(ORDER.flatMap((id) => Object.keys(CONTENT[id].copy))).size;
console.log(
  `wrote ${join(OUT, "index.html")} - ${ORDER.length} games x ${langCount} languages`,
);
