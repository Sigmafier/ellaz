import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRINT_CHROME, PRINT_COPY } from "../content/print/copy";
import { COLOR_SHEETS, MAZE_SHEETS, SUDOKU_SHEETS, WORD_SHEETS } from "../content/print/sheets";
import { GAMES } from "../portal/games";
import { PAGE_LOCALES } from "../i18n/locales";
import {
  OG_ROUTES,
  PRINTABLE_KINDS,
  PRINT_KINDS,
  PRINT_LOCALE,
  ROUTES,
  gamePath,
  printGameId,
  printPath,
  type PrintKind,
} from "./routes";
import { ogCardKey } from "./ogCard";
import {
  SHEETS_CLOSE,
  SHEETS_OPEN,
  fillFacts,
  hasAnswers,
  colorSheets,
  lineArt,
  printFacts,
  printPage,
} from "./printPage";

/* The printable packs, read off the markup the emitter actually produces.
   Everything here is a string check on a rendered page, because that is the
   artifact - a page that composes perfectly and emits the wrong markup is the
   only failure shape this lane can have without a browser. */

const pages = Object.fromEntries(
  PRINT_KINDS.map((k) => [k, printPage({ kind: k, base: "/", indexable: true })]),
) as Record<PrintKind, string>;

const SHEET_COUNT: Record<PrintKind, number> = {
  sudoku: SUDOKU_SHEETS.length,
  maze: MAZE_SHEETS.length,
  wordsearch: WORD_SHEETS.length,
  coloring: COLOR_SHEETS.length,
};

describe("the print routes", () => {
  it("are emitted in a language that has prose", () => {
    expect(PAGE_LOCALES).toContain(PRINT_LOCALE);
  });

  it("prints all six colouring scenes on this roster", () => {
    // The pack DERIVES its scenes from the roster and the art, so a game
    // leaving takes its picture with it. This is what makes that visible.
    expect(colorSheets()).toEqual([...COLOR_SHEETS]);
  });

  it("all four are live on this roster", () => {
    // The route table DERIVES the packs from the roster, so a game leaving it
    // takes its pack quietly. This is the line that makes that a conversation:
    // a removed pack reds here by name, and a published URL that stops existing
    // needs its 301 in the same commit.
    expect(PRINTABLE_KINDS).toEqual([...PRINT_KINDS]);
  });

  it("name games the roster really has", () => {
    // The pack borrows this game's share card and links to its page. A kind
    // naming a game that left the roster is a dead link and a missing preview.
    const ids = new Set(GAMES.map((g) => g.id));
    for (const kind of PRINT_KINDS) {
      expect(ids.has(printGameId(kind)), `no game called "${printGameId(kind)}"`).toBe(true);
    }
  });

  it("are one document each, Hebrew only, indexable, and declare exactly one twin", () => {
    const print = ROUTES.filter((r) => r.kind === "print");
    expect(print).toHaveLength(PRINT_KINDS.length);
    for (const r of print) {
      expect(r.locale).toBe(PRINT_LOCALE);
      expect(r.locales).toEqual([PRINT_LOCALE]);
      expect(r.emit).toBe(true);
      expect(r.indexable).toBe(true);
      expect(r.path).toBe(printPath(r.id as PrintKind));
      expect(r.file).toBe(`${r.path.slice(1)}index.html`);
    }
  });

  it("do NOT multiply by the page locales", () => {
    // The failure this catches is somebody deriving these from LOCALES the way
    // every other route is derived. That emits sixteen documents, twelve of
    // them in languages nobody wrote a word of.
    expect(ROUTES.filter((r) => r.kind === "print")).toHaveLength(4);
    expect(PAGE_LOCALES.length).toBeGreaterThan(1);
  });

  it("borrow their game's share card rather than drawing one", () => {
    for (const kind of PRINT_KINDS) {
      const entry = OG_ROUTES.find((r) => r.path === printPath(kind));
      expect(entry, `${kind} has no card entry, so its preview would have no picture`).toBeTruthy();
      const game = ROUTES.find(
        (r) => r.kind === "game" && r.id === printGameId(kind) && r.locale === PRINT_LOCALE,
      )!;
      expect(ogCardKey(entry!)).toBe(ogCardKey(game));
    }
    // ...and no print route is left in the list under its OWN identity. With
    // no `id` and no `category`, `ogCardKey` collapses all four packs onto one
    // key; handed the game's meta instead it draws a picture byte-identical to
    // the game card. Both are refused by the distinctness gate, correctly.
    const borrowed = OG_ROUTES.filter((r) => r.path.includes("/print/"));
    expect(borrowed).toHaveLength(PRINT_KINDS.length);
    expect(borrowed.every((r) => r.kind === "game")).toBe(true);
    expect(OG_ROUTES.some((r) => ogCardKey(r).startsWith("print-"))).toBe(false);
  });
});

describe("the facts the copy is allowed to quote", () => {
  it("throws on a placeholder nothing derives, rather than shipping a curly brace", () => {
    expect(() => fillFacts("a {nonesuch} b", { sheets: "6" })).toThrow(/nonesuch/);
  });

  it("fills one that does", () => {
    expect(fillFacts("{sheets} דפים", { sheets: "6" })).toBe("6 דפים");
  });

  it("counts the sheets the page really prints", () => {
    for (const kind of PRINT_KINDS) {
      expect(printFacts(kind).sheets).toBe(String(SHEET_COUNT[kind]));
    }
  });

  it("leaves no placeholder anywhere in a rendered page", () => {
    for (const kind of PRINT_KINDS) {
      expect(pages[kind], `${kind}`).not.toMatch(/\{[a-z]+\}/);
    }
  });
});

describe("the rendered page", () => {
  it("prints every sheet in the pack, once", () => {
    for (const kind of PRINT_KINDS) {
      const sheets = pages[kind].match(/class="pk-sheet"/g) ?? [];
      const want = SHEET_COUNT[kind] * (hasAnswers(kind) ? 2 : 1);
      expect(sheets.length, `${kind}`).toBe(want);
    }
  });

  it("fences its boards so the gate measures prose and not digits", () => {
    for (const kind of PRINT_KINDS) {
      const open = pages[kind].split(SHEETS_OPEN).length - 1;
      const close = pages[kind].split(SHEETS_CLOSE).length - 1;
      expect(open, `${kind} open fences`).toBe(hasAnswers(kind) ? 2 : 1);
      expect(close, `${kind} close fences`).toBe(open);
    }
  });

  it("puts the address and a name line on every sheet", () => {
    for (const kind of PRINT_KINDS) {
      // SCOPED TO THE SHEET FOOTER. The same string is in the canonical, the
      // og:url, the self-alternate and twice in the JSON-LD, so an unscoped
      // count answers a question about the head - which is how a green test
      // ends up measuring the wrong element.
      const urls = pages[kind].split(`<span class="pk-url">ellaz.fun${printPath(kind)}</span>`)
        .length - 1;
      expect(urls, `${kind}`).toBe(SHEET_COUNT[kind] * (hasAnswers(kind) ? 2 : 1));
      // The name line is on the PUZZLE sheets only. A key nobody writes on
      // does not need one, and printing it there reads as a second worksheet.
      const names = pages[kind].split(PRINT_CHROME.nameLine).length - 1;
      expect(names, `${kind}`).toBe(SHEET_COUNT[kind]);
    }
  });

  it("carries a print button that is a real control", () => {
    for (const kind of PRINT_KINDS) {
      expect(pages[kind]).toContain('<button type="button" class="pk-btn" onclick="window.print()"');
      expect(pages[kind]).toContain(PRINT_CHROME.printLabel);
    }
  });

  it("links to the game it is printed from", () => {
    for (const kind of PRINT_KINDS) {
      expect(pages[kind]).toContain(`href="/${gamePath(printGameId(kind), PRINT_LOCALE).slice(1)}"`);
    }
  });

  it("is a document: it mounts nothing and fetches no bundle", () => {
    for (const kind of PRINT_KINDS) {
      expect(pages[kind], `${kind}`).not.toContain('id="root"');
      expect(pages[kind], `${kind}`).not.toContain("modulepreload");
    }
  });

  it("declares itself, and only itself, as an alternate", () => {
    for (const kind of PRINT_KINDS) {
      const alts = [...pages[kind].matchAll(/rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
      expect(alts, `${kind}`).toEqual([PRINT_LOCALE]);
      expect(pages[kind], `${kind} must not claim an x-default`).not.toContain('hreflang="x-default"');
    }
  });

  it("keeps its answer key in its own section, and colouring has none", () => {
    expect(pages.sudoku).toContain('class="pk-answers"');
    expect(pages.maze).toContain('class="pk-answers"');
    expect(pages.wordsearch).toContain('class="pk-answers"');
    // There is no right way to colour a picture. A key here would be a claim
    // this platform deliberately never makes about a child's drawing.
    expect(pages.coloring).not.toContain('class="pk-answers"');
    expect(hasAnswers("coloring")).toBe(false);
  });

  it("breaks a sheet onto its own printed page and the key onto its own", () => {
    // The stylesheet is the whole print behaviour, and it ships inline on the
    // page rather than in a linked file, so this is where it can be checked.
    for (const kind of PRINT_KINDS) {
      expect(pages[kind], `${kind}`).toContain("page-break-inside:avoid");
      expect(pages[kind], `${kind}`).toContain("page-break-after:always");
      expect(pages[kind], `${kind}`).toContain("@page{margin:12mm}");
    }
    expect(pages.sudoku).toContain(".pk-answers{break-before:page;page-break-before:always}");
  });

  it("hides the reader-only block when printing, and that block really exists", () => {
    // MEASURED 2026-09-03 on real Chrome PDFs, before this existed: the title
    // and the lede took a whole page of their own on Letter, because the first
    // sheet cannot break and moved down - 13 printed pages where 12 were
    // wanted. On A4 the colouring pack printed its first picture underneath a
    // heading instead. Nothing that reads bytes could see either.
    //
    // BOTH HALVES, because the classic failure here is a rule naming a class
    // no element carries: the stylesheet looks right and hides nothing.
    for (const kind of PRINT_KINDS) {
      expect(pages[kind], `${kind}`).toContain('<div class="pk-intro">');
      expect(pages[kind], `${kind}`).toContain(
        "header,footer,.bc,.pk-intro,.pk-prose,#lang-offer,#consent{display:none!important}",
      );
      // ...and the h1 is INSIDE it, which is the part that actually moved.
      expect(pages[kind], `${kind}`).toMatch(/<div class="pk-intro">\s*<h1>/);
    }
  });

  it("pins its boards left-to-right inside an RTL document", () => {
    // The cells are addressed by a flat row-major index and the word search's
    // Hebrew words are planted leftwards on an LTR grid, so an RTL container
    // mirrors every board on the page. See rtl-spatial-grid-dir-ltr.md.
    for (const kind of PRINT_KINDS) {
      expect(pages[kind], `${kind}`).toContain(".pk-board{direction:ltr}");
    }
    expect(pages.sudoku).toContain('<html lang="he" dir="rtl">');
  });
});

describe("the copy", () => {
  it("fits the search result it will appear in", () => {
    for (const kind of PRINT_KINDS) {
      const facts = printFacts(kind);
      const title = fillFacts(PRINT_COPY[kind].metaTitle, facts);
      const desc = fillFacts(PRINT_COPY[kind].metaDescription, facts);
      expect(title.length, `${kind} title: ${title}`).toBeLessThanOrEqual(70);
      expect(desc.length, `${kind} description`).toBeLessThanOrEqual(160);
    }
  });

  it("gives every pack its own title and its own snippet", () => {
    const titles = PRINT_KINDS.map((k) => fillFacts(PRINT_COPY[k].metaTitle, printFacts(k)));
    const descs = PRINT_KINDS.map((k) => fillFacts(PRINT_COPY[k].metaDescription, printFacts(k)));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("carries no em dash - it is customer-facing copy", () => {
    // The operator reads U+2014 as the tell that a machine wrote the text.
    const source = readFileSync(new URL("../content/print/copy.ts", import.meta.url), "utf8");
    expect(source).not.toContain("—");
    expect(source).not.toContain("–");
  });

  it("prints an instruction on the sheet itself, because the prose is not printed", () => {
    for (const kind of PRINT_KINDS) {
      expect(PRINT_COPY[kind].sheetNote.length).toBeGreaterThan(10);
      expect(pages[kind]).toContain(PRINT_COPY[kind].sheetNote);
    }
  });
});

describe("turning a scene into line art", () => {
  const scene =
    '<svg viewBox="0 0 2 2"><rect width="2" height="2" fill="#FF8A3D"/>' +
    '<path d="M0 0h1" fill="none" stroke="#241C3B" stroke-width="5"/>' +
    '<circle cx="1" cy="1" r="1" fill="#26B0E6"/></svg>';

  it("knocks every fill out to white", () => {
    const out = lineArt(scene);
    expect(out).not.toContain("#FF8A3D");
    expect(out).not.toContain("#26B0E6");
    expect(out.match(/fill="#ffffff"/g)).toHaveLength(2);
  });

  it("leaves the line work alone", () => {
    expect(lineArt(scene)).toContain('fill="none" stroke="#241C3B"');
  });

  it("gives an unstroked shape an outline, or it would vanish", () => {
    expect(lineArt(scene)).toMatch(/<rect[^>]*stroke="#111111"/);
  });

  it("KEEPS the self-closing slash", () => {
    // Appending an attribute after the slash emits `<rect fill="#fff"/ stroke="…">`,
    // which is not a self-closing tag at all: the parser reads a stray `/`
    // attribute, leaves the element open, and every later shape nests inside
    // it. The scene still renders, wrongly, and only in a browser.
    const out = lineArt(scene);
    expect(out).toContain('stroke-width="1.6"/>');
    expect(out).not.toMatch(/\/\s+stroke=/);
  });

  it("refuses a scene with nothing to knock out, rather than printing a blank sheet", () => {
    expect(() => lineArt('<svg><path d="M0 0h1" fill="none" stroke="#000"/></svg>')).toThrow(
      /no filled shape/,
    );
  });
});
