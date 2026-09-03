// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { PrintablePacks } from "./Home";
import { PRINT_KINDS, printHref } from "./paths";
import { ROSTER_IDS } from "./shellRoster";
import { homeShellBody } from "../build/sitePages";
import { GAMES } from "./games";
import { PRINTABLE_KINDS, PRINT_LOCALE, printPath } from "../build/routes";
import { PRINT_CHROME, PRINT_COPY } from "../content/print/copy";
import { gameName } from "../build/gameName";
import { PAGE_LOCALES, type PageLocale } from "@i18n/locales";

/**
 * THE DEFECT THIS FILE EXISTS FOR, measured on the live site 2026-09-03:
 * `/he/print/{sudoku,maze,wordsearch,coloring}/` all returned 200, and the
 * number of anchors pointing at any of them was ZERO - 0 of 47 on `/he/`, 0 of
 * 23 on `/he/games/kids/`, and `printPath` was called nowhere outside the
 * emitter and the route table. Four pages nobody could reach except through
 * the sitemap.
 *
 * It takes BOTH halves to fix, which is the thing worth pinning. The emitted
 * `#home-doc` block is the only inbound link a crawler or a no-JavaScript
 * visitor can follow, and the runtime DELETES it once React mounts - so the app
 * needs its own row, or a Hebrew visitor with JavaScript is back where we
 * started. Either half alone reads like a fix and orphans half the audience.
 */
async function renderPacks(locale: PageLocale): Promise<HTMLElement> {
  const { createRoot } = await import("react-dom/client");
  const { createElement } = await import("react");
  const { flushSync } = await import("react-dom");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement(PrintablePacks, { locale, onTap: () => {} }));
  });
  return host;
}

const anchors = (host: HTMLElement) => [...host.querySelectorAll("a")];

describe("the app's half - the trailing shelf on the Hebrew home", () => {
  it("links every printable pack, and nothing else", async () => {
    const host = await renderPacks(PRINT_LOCALE);
    const hrefs = anchors(host).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(PRINTABLE_KINDS.map((k) => printHref(k)));
  });

  it("every label is the game's own Hebrew name, so a literal cannot drift", async () => {
    const host = await renderPacks(PRINT_LOCALE);
    const labels = anchors(host).map((a) => a.textContent?.trim());
    expect(labels).toEqual(PRINTABLE_KINDS.map((k) => gameName(k, PRINT_LOCALE)));
  });

  it("says what the row is, in the packs' own words", async () => {
    const host = await renderPacks(PRINT_LOCALE);
    expect(host.textContent).toContain(PRINT_CHROME.section);
  });

  it("renders NOTHING in a language the packs were not written in", async () => {
    // The population is every OTHER page locale, and the last line is the
    // control - without it this passes by rendering nothing anywhere.
    for (const locale of PAGE_LOCALES.filter((l) => l !== PRINT_LOCALE)) {
      const host = await renderPacks(locale);
      expect(host.innerHTML, `rendered something in ${locale}`).toBe("");
    }
    const he = await renderPacks(PRINT_LOCALE);
    expect(he.innerHTML).not.toBe("");
  });

  it("never links a pack whose game has left the shell roster", async () => {
    // `assert-slope.mjs` builds an arm with the last eight games cut, and the
    // wordsearch pack has already killed that arm once by being hard-listed.
    const host = await renderPacks(PRINT_LOCALE);
    const hrefs = new Set(anchors(host).map((a) => a.getAttribute("href")));
    for (const kind of PRINT_KINDS) {
      if (hrefs.has(printHref(kind))) expect(ROSTER_IDS).toContain(kind);
    }
  });
});

describe("the crawler's half - the emitted #home-doc", () => {
  it("carries a link to every printable pack on the Hebrew home", () => {
    const body = homeShellBody(PRINT_LOCALE, GAMES, "/");
    for (const kind of PRINTABLE_KINDS) expect(body).toContain(`href="${printPath(kind)}"`);
  });

  it("carries none of them on the home pages of the other languages", () => {
    for (const locale of PAGE_LOCALES.filter((l) => l !== PRINT_LOCALE)) {
      const body = homeShellBody(locale, GAMES, "/");
      for (const kind of PRINTABLE_KINDS) expect(body).not.toContain(printPath(kind));
    }
  });

  it("uses the pack's own H1 as the anchor text, not the game's name", () => {
    // Anchor text is the one part of a link a crawler reads as a description of
    // its target, and these pages exist to be found by somebody typing
    // "סודוקו להדפסה". A bare game name throws that away.
    //
    // THE FIRST VERSION OF THIS ASSERTION WAS WRONG, and wrong in the way this
    // repo keeps a file about: it read the WHOLE body for `>סודוקו</a>` and
    // failed, because the flat list of GAME links on the same page carries
    // exactly that anchor. A true statement about the wrong population. So the
    // anchor is now located by its href and only its own text is read.
    const body = homeShellBody(PRINT_LOCALE, GAMES, "/");
    for (const kind of PRINTABLE_KINDS) {
      const m = body.match(
        new RegExp(`<a href="${printPath(kind).replace(/\//g, "\\/")}"\\s*>([^<]*)</a>`),
      );
      expect(m, `no anchor found for ${printPath(kind)}`).toBeTruthy();
      expect(m?.[1].trim()).toBe(PRINT_COPY[kind].h1);
      expect(m?.[1].trim()).not.toBe(gameName(kind, PRINT_LOCALE));
    }
  });
});
