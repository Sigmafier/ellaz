import { PRINT_CHROME, PRINT_COPY, type PrintPageCopy } from "../content/print/copy";
import {
  COLOR_SHEETS,
  MAZE_SHEETS,
  SUDOKU_SHEETS,
  WORD_SHEETS,
  type MazeSheet,
  type SudokuSheet,
  type WordSheet,
} from "../content/print/sheets";
import { SITE } from "../content/site";
import { escapeHtml, html, raw, toHtml, type RawHtml } from "./html";
import { renderDocument } from "./layout";
import { GAMES } from "../portal/games";
import { gameArt } from "../ui/gameArt";
import { gameName } from "./gameName";
import { artSvgSized } from "./ogCard";
import {
  PRINT_LOCALE,
  canonicalUrl,
  gamePath,
  homePath,
  href,
  printGameId,
  printPath,
  type PrintKind,
} from "./routes";

/**
 * The four printable packs: sudoku, mazes, word searches, colouring.
 *
 * WHAT THIS PAGE IS FOR. It is the only page type on this site a stranger would
 * link to WITHOUT playing a game. A parent searching "דפי עבודה להדפסה" is not
 * looking for a browser game, and a teacher who prints six mazes for a class
 * has a reason to send the URL on. That is the whole lane.
 *
 * HEBREW ONLY, DECLARED IN THE ROUTE TABLE. `locales: ["he"]`, so the hreflang
 * cluster is one entry - itself - and there is no x-default, because x-default
 * answers "we have no page in your language" and this page targets one language
 * on purpose. The gate reads that declaration off `pages.json` rather than
 * assuming every page has a twin in all four languages.
 *
 * IT IS A DOCUMENT, NOT A SCREEN. No `headAssets`, so it boots nothing: the
 * sheets are markup, the pictures are inline SVG, and the only script on the
 * page is the one line behind the print button. `assert-pages.mjs` holds every
 * non-booting page to "fetches nothing eagerly", and that is the right rule
 * here - a page whose job is to reach a printer must not wait on a bundle.
 *
 * THE BOARDS ARE FROZEN, NOT GENERATED HERE. `src/content/print/sheets.ts` says
 * why in full: `vite.config.ts` is bundled by esbuild, which externalises bare
 * specifiers, so a module in this directory that reaches a game's `logic.ts`
 * drags in its `@shared/rng` import and the whole config fails to load. Frozen
 * data is also the stronger promise for a page built to be linked at: sheet 3
 * is the same sheet next year.
 */

/**
 * Everything the sheets style that `DOCUMENT_CSS` does not.
 *
 * HERE RATHER THAN IN `DOCUMENT_CSS`, and it is a byte decision with two arms:
 * `DOCUMENT_CSS` is inlined into all 200 emitted documents, so ~60 rules that
 * only four pages use would ride on 196 pages that never draw a sheet. The
 * embed page's `EMBED_CSS` sits in its own module for exactly this reason and
 * this follows it. It costs a first visit nothing in either arrangement: these
 * pages are not precached and index.html never carries this string.
 *
 * A SHEET IS PAPER, so it is white with black ink in both themes and under both
 * palettes. That is not a theming oversight: the thing being previewed on
 * screen is what will come out of the printer, and a dark-mode sheet would be a
 * preview of something nobody can print.
 */
export const PRINT_CSS = `
.pk-cta{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:26px 0 6px}
.pk-btn{display:inline-flex;align-items:center;justify-content:center;min-height:64px;
  padding:0 30px;border:none;border-radius:20px;background:var(--doc-sun);color:var(--doc-ink);
  text-decoration:none;font:inherit;font-family:Fredoka,Heebo,system-ui,sans-serif;
  font-size:1.15rem;font-weight:600;box-shadow:0 4px 0 var(--doc-line);cursor:pointer}
.pk-btn.alt{background:var(--doc-card);border:1px solid var(--doc-line)}
.pk-note{color:var(--doc-soft);font-size:.85rem;margin:0 0 8px}
.pk-sheets{display:grid;grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));gap:20px;
  margin:18px 0 0;list-style:none;padding:0}
.pk-sheet{background:#fff;color:#111;border:1px solid #d9d6e4;border-radius:14px;padding:14px}
.pk-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  font-size:.85rem;font-weight:600;color:#333}
.pk-inst{font-size:.8rem;color:#444;margin:6px 0 12px}
.pk-foot{display:flex;justify-content:space-between;gap:10px;margin-top:12px;padding-top:8px;
  border-top:1px solid #ddd;font-size:.7rem;color:#555}
/* The domain is Latin inside an RTL line. Isolated, or the punctuation in it
   reorders and the page prints a URL nobody can type back in. */
.pk-url{direction:ltr;unicode-bidi:isolate}
/* THE BOARDS ARE PINNED LTR. Their cells are addressed by a flat row-major
   index, so an RTL container would mirror every one of them - and the word
   search would mirror INTO its own generator's assumption, which plants Hebrew
   words leftwards on an LTR grid (see readingSense in wordsearch/logic.ts).
   The game's own board carries dir="ltr" for the same reason. */
.pk-board{direction:ltr}
table.pk-grid{border-collapse:collapse;width:100%;table-layout:fixed;margin:0}
table.pk-grid td{border:1px solid #9b97ad;padding:0;text-align:center;vertical-align:middle;
  font-size:1.05rem;line-height:1;font-weight:600;color:#111}
table.pk-grid td::before{content:"";display:block;padding-top:100%}
table.pk-grid td span{position:absolute;inset:0;display:flex;align-items:center;
  justify-content:center}
table.pk-grid td{position:relative}
table.pk-grid td.bx{border-inline-end-width:3px}
table.pk-grid td.by{border-bottom-width:3px}
table.pk-grid td.blank{color:transparent}
table.pk-grid td.key{font-weight:800}
table.pk-grid td.dim{color:#8a86a0;font-weight:400}
.pk-words{margin:10px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px 12px;
  font-size:.9rem;color:#111}
.pk-words li{white-space:nowrap}
svg.pk-svg{display:block;width:100%;height:auto}
.pk-answers{margin-top:34px}
@media (max-width:34rem){.pk-sheets{grid-template-columns:1fr}}
@media print{
  /* WHAT IS ON THE PAPER: the sheets, and nothing else. The prose is for a
     reader and for a search engine; printing it would put four pages of
     paragraphs between the boards and the answer key. */
  header,footer,.bc,.pk-intro,.pk-prose,#lang-offer,#consent{display:none!important}
  html,body{background:#fff!important;color:#000!important}
  main{max-width:none!important;margin:0!important;padding:0!important}
  .pk-sheets{display:block!important;margin:0!important}
  .pk-sheet{border:0!important;border-radius:0!important;padding:0!important;margin:0!important;
    break-inside:avoid;page-break-inside:avoid;break-after:page;page-break-after:always}
  .pk-sheet:last-child{break-after:auto;page-break-after:auto}
  .pk-answers{break-before:page;page-break-before:always}
  .pk-answers h2{margin-top:0}
  table.pk-grid td{border-color:#000}
  @page{margin:12mm}
}
`;

/* ------------------------------------------------------------------- facts */

/**
 * The numbers the copy is allowed to quote, DERIVED from the sheets themselves.
 *
 * An author writes prose and never a fact about a board. Every `{placeholder}`
 * in `copy.ts` is filled from here, so the page cannot claim a grid size, a
 * sheet count or a word count that the printed sheets do not have - the same
 * split `.claude/rules/game-content-template.md` describes for the game pages,
 * and the reason a re-tuned pack cannot leave a stale number in the prose.
 */
export function printFacts(kind: PrintKind): Record<string, string> {
  const n = (v: number) => String(v);
  if (kind === "sudoku") {
    const first = SUDOKU_SHEETS[0];
    const last = SUDOKU_SHEETS[SUDOKU_SHEETS.length - 1];
    return {
      sheets: n(SUDOKU_SHEETS.length),
      first: `${first.n}x${first.n}`,
      last: `${last.n}x${last.n}`,
      givens: n([...first.puzzle].filter((c) => c !== "0").length),
    };
  }
  if (kind === "maze") {
    const first = MAZE_SHEETS[0];
    const last = MAZE_SHEETS[MAZE_SHEETS.length - 1];
    return {
      sheets: n(MAZE_SHEETS.length),
      first: `${first.size}x${first.size}`,
      last: `${last.size}x${last.size}`,
      par: n(last.par),
      crumbs: n(last.cheese.length),
    };
  }
  if (kind === "wordsearch") {
    const first = WORD_SHEETS[0];
    const last = WORD_SHEETS[WORD_SHEETS.length - 1];
    return {
      sheets: n(WORD_SHEETS.length),
      first: `${first.size}x${first.size}`,
      last: `${last.size}x${last.size}`,
      words: n(WORD_SHEETS.reduce((t, s) => t + s.words.length, 0)),
    };
  }
  return { sheets: n(COLOR_SHEETS.length) };
}

/**
 * `{sheets}` -> `6`, and an unknown placeholder THROWS.
 *
 * Fail-closed on purpose. The alternative - leaving `{par}` in the page - is a
 * document that ships a curly brace to a reader while every gate here stays
 * green, because no assertion in this repo reads prose for punctuation.
 */
export function fillFacts(text: string, facts: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = facts[key];
    if (value === undefined) {
      throw new Error(
        `print page: the copy asks for {${key}}, which nothing derives. ` +
          `Known facts: ${Object.keys(facts).join(", ")}.`,
      );
    }
    return value;
  });
}

/* ------------------------------------------------------------------ boards */

/** One square grid of characters, as a table. `mark` styles a cell. */
function gridTable(
  cells: string[],
  size: number,
  boxR: number,
  boxC: number,
  mark: (index: number) => string,
): RawHtml {
  const rows = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const i = r * size + c;
      const cls = [
        c + 1 < size && (c + 1) % boxC === 0 ? "bx" : "",
        r + 1 < size && (r + 1) % boxR === 0 ? "by" : "",
        mark(i),
      ]
        .filter(Boolean)
        .join(" ");
      return html`<td${cls ? raw(` class="${cls}"`) : ""}><span>${cells[i] ?? ""}</span></td>`;
    }),
  );
  return html`<table class="pk-grid">
    <tbody>
      ${rows.map((cols) => html`<tr>${cols}</tr>`)}
    </tbody>
  </table>`;
}

function sudokuBoard(sheet: SudokuSheet, answers: boolean): RawHtml {
  const source = answers ? sheet.solution : sheet.puzzle;
  const cells = [...source].map((d) => (d === "0" ? "" : d));
  return gridTable(cells, sheet.n, sheet.boxR, sheet.boxC, (i) =>
    // On the key, the clues that were already printed stay grey so a parent can
    // see at a glance what the child actually filled in.
    answers && sheet.puzzle[i] === "0" ? "key" : answers ? "dim" : "",
  );
}

/** A maze, as one SVG. 100 units per cell, so every number below is a cell. */
function mazeBoard(sheet: MazeSheet, answers: boolean): RawHtml {
  const u = 100;
  const side = sheet.size * u;
  const x = (i: number) => (i % sheet.size) * u;
  const y = (i: number) => Math.floor(i / sheet.size) * u;
  const walls: string[] = [];
  for (let i = 0; i < sheet.size * sheet.size; i += 1) {
    const c = i % sheet.size;
    const r = Math.floor(i / sheet.size);
    if (c + 1 < sheet.size && sheet.right[i] === "1") {
      walls.push(`M${x(i) + u} ${y(i)}v${u}`);
    }
    if (r + 1 < sheet.size && sheet.down[i] === "1") {
      walls.push(`M${x(i)} ${y(i) + u}h${u}`);
    }
  }
  const centre = (i: number) => `${x(i) + u / 2} ${y(i) + u / 2}`;
  const route = answers
    ? `M${sheet.route.map((i) => centre(i)).join("L")}`
    : "";
  return html`<svg
    class="pk-svg"
    viewBox="-6 -6 ${String(side + 12)} ${String(side + 12)}"
    role="img"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="0" y="0" width="${String(side)}" height="${String(side)}" fill="#fff" stroke="#111" stroke-width="9" />
    <path d="${raw(walls.join(""))}" stroke="#111" stroke-width="7" stroke-linecap="square" fill="none" />
    ${answers &&
    html`<path d="${route}" stroke="#111" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="18 14" fill="none" opacity="0.75" />`}
    ${sheet.cheese.map(
      (i) =>
        html`<circle cx="${String(x(i) + u / 2)}" cy="${String(y(i) + u / 2)}" r="${String(u * 0.17)}" fill="none" stroke="#111" stroke-width="6" />`,
    )}
    <circle cx="${String(x(sheet.at) + u / 2)}" cy="${String(y(sheet.at) + u / 2)}" r="${String(u * 0.2)}" fill="#111" />
    <rect
      x="${String(x(sheet.home) + u * 0.24)}"
      y="${String(y(sheet.home) + u * 0.24)}"
      width="${String(u * 0.52)}"
      height="${String(u * 0.52)}"
      fill="none"
      stroke="#111"
      stroke-width="8"
    />
  </svg>`;
}

function wordBoard(sheet: WordSheet, answers: boolean): RawHtml {
  const found = new Set(answers ? sheet.answers.flatMap((a) => a.cells) : []);
  const grid = gridTable([...sheet.grid], sheet.size, sheet.size, sheet.size, (i) =>
    answers ? (found.has(i) ? "key" : "dim") : "",
  );
  return html`${grid}
    <ul class="pk-words">
      ${sheet.words.map((w) => html`<li>${w}</li>`)}
    </ul>`;
}

/**
 * A game's scene with every fill knocked out to white and an outline put back.
 *
 * The art is flat filled shapes drawn on a 200x150 stage. Printed as-is it is a
 * page of solid colour, which is a picture OF something rather than something
 * to colour in - and a wall of toner. Stripping the fills leaves exactly the
 * outlines, which is what a colouring sheet is.
 *
 * Shapes that already declare `fill="none"` keep it (they are the line work),
 * and any shape that has no stroke of its own gets one, or it would vanish.
 * THROWS on a scene that came back with no fills at all, because that is the
 * shape of a silently empty sheet.
 */
export function lineArt(svg: string): string {
  let painted = 0;
  // The trailing slash is captured SEPARATELY and put back last. Appending an
  // attribute after it emits `<rect fill="#fff"/ stroke="#111">`, which is not
  // a self-closing tag at all: the parser reads a stray `/` attribute, leaves
  // the element OPEN, and every later shape nests inside it. The scene still
  // renders - wrongly, and only in a browser. Caught by reading the emitted
  // markup rather than by any assertion.
  const out = svg.replace(
    /<(rect|path|circle|ellipse|polygon|polyline|line|g)\b([^>]*?)(\/?)>/g,
    (_tag, name: string, attrs: string, close: string) => {
      let a = attrs;
      if (/\bfill="(?!none)[^"]*"/.test(a)) {
        a = a.replace(/\bfill="(?!none)[^"]*"/g, 'fill="#ffffff"');
        painted += 1;
      }
      if (!/\bstroke="/.test(a)) a = `${a} stroke="#111111" stroke-width="1.6"`;
      return `<${name}${a}${close}>`;
    },
  );
  if (painted === 0) {
    throw new Error(
      "print page: a colouring scene had no filled shape to knock out - it would print blank.",
    );
  }
  return out;
}

/**
 * The colouring scenes this build can actually draw.
 *
 * FILTERED, not asserted, and for the same reason `PRINTABLE_KINDS` is derived:
 * a scene belongs to a game, and a build whose roster does not carry that game
 * has no picture to print. `assert-slope.mjs` builds an arm with the last eight
 * games cut, and `fruit` is one of them - measured 2026-09-03, the hard list
 * killed that arm and the slope gate reported nothing at all.
 *
 * It THROWS when nothing survives, because a colouring pack with no pictures is
 * a page of empty frames rather than a smaller pack. `print.test.ts` asserts all
 * six survive on the real roster, so losing one is a red test and a decision
 * rather than a page that quietly got shorter.
 */
export function colorSheets(): string[] {
  const ids = new Set(GAMES.map((g) => g.id));
  const live = COLOR_SHEETS.filter((id) => ids.has(id) && Boolean(gameArt(id)));
  if (live.length === 0) {
    throw new Error(
      "print page: not one colouring scene has art in this build - the pack would print blank frames.",
    );
  }
  return live;
}

function colorBoard(id: string): RawHtml {
  // `meet` rather than the art's own `slice`: a colouring sheet shows the WHOLE
  // composition. Sliced, the scene is cropped and the child colours a detail.
  //
  // The class is REPLACED, never prepended. Two `class` attributes on one
  // element is a parse error the browser papers over by keeping the first, so a
  // prepended one silently drops the scene's own class - and a page that looks
  // right today breaks the day that class means something.
  //
  // `aria-hidden` goes with it. On a game card the scene is decoration beside a
  // name; here the picture IS the page, and a screen reader that is told there
  // is nothing on it is being told something false.
  const svg = lineArt(artSvgSized(id, 800, 600, "meet"))
    .replace(/\bclass="[^"]*"/, 'class="ellaz-art pk-svg"')
    .replace(
      /\baria-hidden="true"/,
      `role="img" aria-label="${escapeHtml(`${PRINT_CHROME.artAlt} ${gameName(id, PRINT_LOCALE)}`)}"`,
    );
  return raw(svg);
}

/**
 * The two comment markers that fence the boards off from the prose.
 *
 * WHY A PAGE CARRIES A MARKER FOR A GATE. `assert-pages.mjs` measures a page's
 * prose by stripping tags and counting words, which is right for every other
 * page here and wrong for this one: a sudoku pack is 972 printed digits and a
 * word search is 1,432 loose Hebrew letters, so the count would read ~2,100
 * words on a page whose prose is 600. The number would pass the floor and mean
 * nothing, which is worse than failing it - an instrument that reports a
 * confident wrong number is the failure this repo keeps writing rules about.
 *
 * COMMENTS RATHER THAN A CONTAINER CLASS, because the gate is a regex over
 * bytes and a `<div>` cannot be matched to its own closing tag through six
 * levels of nesting. These two cannot nest and cannot be mistaken for anything
 * else. They cost 34 bytes on four pages that are not precached.
 *
 * The gate REFUSES a print page carrying no pair rather than falling back to
 * the whole body: a silent fallback would measure the wrong thing on the day
 * somebody renames the markers.
 */
export const SHEETS_OPEN = "<!--sheets-->";
export const SHEETS_CLOSE = "<!--/sheets-->";

/* ------------------------------------------------------------------- sheet */

interface SheetOpts {
  kind: PrintKind;
  index: number;
  copy: PrintPageCopy;
  board: RawHtml;
  answers: boolean;
}

function sheet({ kind, index, copy, board, answers }: SheetOpts): RawHtml {
  const label = fillFacts(PRINT_CHROME.sheetLabel, { n: String(index + 1) });
  return html`<li class="pk-sheet">
    <div class="pk-head">
      <span>${label}</span>
      <span>${answers ? copy.answersTitle : ""}</span>
    </div>
    ${!answers && html`<p class="pk-inst">${copy.sheetNote}</p>`}
    <div class="pk-board">${board}</div>
    <div class="pk-foot">
      <span class="pk-url">ellaz.fun${printPath(kind)}</span>
      <span>${answers ? "" : PRINT_CHROME.nameLine}</span>
    </div>
  </li>`;
}

/** Every sheet of a pack, in order. `answers` picks the key rather than the puzzle. */
function pack(kind: PrintKind, copy: PrintPageCopy, answers: boolean): RawHtml[] {
  const of = (board: (i: number) => RawHtml, count: number) =>
    Array.from({ length: count }, (_, i) =>
      sheet({ kind, index: i, copy, board: board(i), answers }),
    );
  if (kind === "sudoku") return of((i) => sudokuBoard(SUDOKU_SHEETS[i], answers), SUDOKU_SHEETS.length);
  if (kind === "maze") return of((i) => mazeBoard(MAZE_SHEETS[i], answers), MAZE_SHEETS.length);
  if (kind === "wordsearch") return of((i) => wordBoard(WORD_SHEETS[i], answers), WORD_SHEETS.length);
  const scenes = colorSheets();
  return of((i) => colorBoard(scenes[i]), scenes.length);
}

/** True for the three packs that have a key. Colouring has no right answer. */
export function hasAnswers(kind: PrintKind): boolean {
  return PRINT_COPY[kind].answersTitle !== "";
}

/* -------------------------------------------------------------------- page */

export interface PrintPageOptions {
  kind: PrintKind;
  base: string;
  indexable: boolean;
}

export function printPage(opts: PrintPageOptions): string {
  const { kind, base } = opts;
  const locale = PRINT_LOCALE;
  const site = SITE[locale];
  const raw0 = PRINT_COPY[kind];
  if (!raw0) throw new Error(`print page: no copy for "${kind}" in src/content/print/copy.ts`);
  const facts = printFacts(kind);
  const f = (s: string) => fillFacts(s, facts);
  const copy: PrintPageCopy = {
    ...raw0,
    metaTitle: f(raw0.metaTitle),
    metaDescription: f(raw0.metaDescription),
    h1: f(raw0.h1),
    lede: f(raw0.lede),
    sheetNote: f(raw0.sheetNote),
    answersNote: f(raw0.answersNote),
    sections: raw0.sections.map((s) => ({ title: f(s.title), body: s.body.map(f) })),
    faq: raw0.faq.map((q) => ({ q: f(q.q), a: f(q.a) })),
  };

  const gameHref = href(gamePath(printGameId(kind), locale), base);

  const body = html`
    <style>${raw(PRINT_CSS)}</style>
    <nav class="bc">
      <a href="${href(homePath(locale), base)}">${site.home}</a> › ${PRINT_CHROME.section}
    </nav>
    <!-- EVERYTHING A READER NEEDS AND A PRINTER DOES NOT, in one block, so the
         print rule that hides it is one selector rather than five. Measured
         2026-09-03 on real Chrome PDFs: without this, the title and the lede
         took a page of their own on Letter (the first sheet cannot break, so it
         moved down) and on A4 the colouring pack printed its first picture
         underneath a heading. 13 pages where 12 were wanted, and no gate that
         reads bytes could see either. -->
    <div class="pk-intro">
      <h1>${copy.h1}</h1>
      <p class="lede">${copy.lede}</p>
      <div class="pk-cta">
      <!-- A REAL BUTTON, and the only script on the page. The words on it are an
           instruction, so the thing carrying them has to answer a tap - see
           .claude/rules/a-control-that-carries-an-imperative-must-be-a-control.md.
           It is inline rather than a module because this page deliberately
           fetches nothing: a print button that waits on a bundle is a button
           that does nothing on a slow connection. -->
      <button type="button" class="pk-btn" onclick="window.print()">${PRINT_CHROME.printLabel}</button>
      <a class="pk-btn alt" href="${gameHref}">${copy.playLabel}</a>
      </div>
      <p class="pk-note">${PRINT_CHROME.printNote}</p>
      <h2>${copy.sheetsTitle}</h2>
    </div>
    ${raw(SHEETS_OPEN)}
    <ul class="pk-sheets">${pack(kind, copy, false)}</ul>
    ${raw(SHEETS_CLOSE)}

    <div class="pk-prose">
      ${copy.sections.map(
        (s) => html`<h2>${s.title}</h2>
          ${s.body.map((p) => html`<p>${p}</p>`)}`,
      )}
      <h2>${PRINT_CHROME.faqTitle}</h2>
      ${copy.faq.map(
        (q) => html`<h3>${q.q}</h3>
          <p>${q.a}</p>`,
      )}
      <p><a href="${href(homePath(locale), base)}">${PRINT_CHROME.backLabel}</a></p>
    </div>

    ${hasAnswers(kind) &&
    html`<section class="pk-answers">
      <h2>${copy.answersTitle}</h2>
      <p class="pk-note">${copy.answersNote}</p>
      ${raw(SHEETS_OPEN)}
      <ul class="pk-sheets">${pack(kind, copy, true)}</ul>
      ${raw(SHEETS_CLOSE)}
    </section>`}
  `;

  return renderDocument({
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    path: printPath(kind),
    // ONE ALTERNATE: ITSELF. The route declares `locales: ["he"]`, so this is
    // the whole cluster, and there is deliberately no x-default - `x-default`
    // answers "we have no page in your language", and a Hebrew worksheet pack
    // is not that page. `hreflangFaults` in assert-pages.mjs demands exactly
    // this shape from the declared set, in both directions.
    alternates: [{ locale, path: printPath(kind) }],
    schema: printGraph(kind, copy),
    body,
    base,
    indexable: opts.indexable,
  });
}

/**
 * A small graph: the page, and the trail to it.
 *
 * Deliberately NOT `FAQPage`. Google restricted that rich result to
 * government and health sites in 2023, so marking it up buys nothing and
 * misrepresents what the page is. `WebPage` + `BreadcrumbList` is what this
 * page actually is, and both are still read.
 */
function printGraph(kind: PrintKind, copy: PrintPageCopy): unknown {
  const url = canonicalUrl(printPath(kind));
  const site = SITE[PRINT_LOCALE];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: copy.metaTitle,
        description: copy.metaDescription,
        inLanguage: PRINT_LOCALE,
        isPartOf: { "@type": "WebSite", name: site.brand, url: canonicalUrl(homePath(PRINT_LOCALE)) },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: site.home,
            item: canonicalUrl(homePath(PRINT_LOCALE)),
          },
          { "@type": "ListItem", position: 2, name: copy.h1, item: url },
        ],
      },
    ],
  };
}

/** Exported for the emitter's tests, which read the markup rather than a DOM. */
export { toHtml };
