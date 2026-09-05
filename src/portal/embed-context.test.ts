// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { readPageContext, type PageKind } from "./pageContext";
// From `PageApp`, not `pageContext`, and that is the point being tested as
// much as the behaviour: `main.tsx` imports `pageContext` statically, so a
// helper placed there rides in the shell every child downloads. These two
// live in the lazy page chunk - 89 B gz of first visit, measured.
import { mayReachOut, requestedLocale, wireEmbedPreview } from "./PageApp";
import { hostChrome } from "./GameHost";
import { APP_LOCALES, CANONICAL_LOCALE } from "@i18n/locales";
import { embedSnippet } from "../build/gamePage";
import { metaFor } from "./games";

/**
 * The runtime half of the embed lane: what the page context says about a
 * framed document, the one decision that keeps it off the network, and the
 * language it answers in.
 *
 * `mayReachOut` is tested rather than `bootContentPage`: the three calls it
 * guards are module-level ports with real side effects, and the DECISION is
 * the thing that must stay true - a test that mocks all three to watch them
 * not be called is a test of the mocks.
 */

describe("the embed page context", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.body.removeAttribute("data-page");
    document.body.removeAttribute("data-game");
    document.body.innerHTML = "";
  });

  it("is recognised off the document, with its game and no wallet slot", () => {
    document.body.dataset.page = "embed";
    document.body.dataset.game = "2048";
    document.body.innerHTML = '<div id="game-frame"></div><p><a id="embed-home" href="/games/2048/">x</a></p>';
    const ctx = readPageContext();
    expect(ctx.kind).toBe("embed");
    expect(ctx.gameId).toBe("2048");
    expect(ctx.locale).toBe("en");
    expect(ctx.frame).toBeTruthy();
    expect(ctx.walletSlot).toBeUndefined();
  });

  it("still boots the app when the frame is missing, like every other kind", () => {
    document.body.dataset.page = "embed";
    document.body.innerHTML = "<p>nothing to mount into</p>";
    expect(readPageContext().kind).toBe("app");
  });
});

describe("what may leave the machine", () => {
  it("is nothing, from inside a stranger's page", () => {
    expect(mayReachOut("embed")).toBe(false);
  });

  it("and everything, from our own pages - the positive control", () => {
    const ours: PageKind[] = ["app", "game", "world", "boards"];
    for (const kind of ours) expect(mayReachOut(kind), kind).toBe(true);
  });
});

describe("the language a frame was asked for", () => {
  it("is whatever ?lang= says, when the app speaks it", () => {
    for (const l of APP_LOCALES) expect(requestedLocale(`?lang=${l}`)).toBe(l);
    expect(requestedLocale(`?x=1&lang=he&y=2`)).toBe("he");
  });

  it("falls back to the canonical locale for anything else, including hostile input", () => {
    for (const bad of ["", "?lang=", "?lang=klingon", "?lang=EN", "?lang=<script>", "?lang=he-IL", "?other=he"]) {
      expect(requestedLocale(bad), bad).toBe(CANONICAL_LOCALE);
    }
  });
});

describe("the copy path reads the raw snippet back out of the page", () => {
  it("textContent of the emitted <pre> is the snippet, not its escaped display", () => {
    // The emitter escapes the snippet into the document; the browser decodes
    // it into the DOM; the copy handler reads `textContent`. This is that
    // round trip in a real DOM, planted with the one name that carries a
    // character the escaper touches.
    const snippet = embedSnippet(metaFor("snake")!, "en");
    const escaped = snippet
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    document.body.innerHTML = `<pre data-embed-code>${escaped}</pre>`;
    const pre = document.querySelector<HTMLElement>("[data-embed-code]")!;
    expect(pre.textContent).toBe(snippet);
    // And the wrong path - what the reach board once shipped - is visibly wrong.
    expect(pre.innerHTML).not.toBe(snippet);
    expect(pre.innerHTML).toContain("&lt;iframe");
  });
});

describe("which platform controls the host's own bar draws", () => {
  it("draws mute alone inside a stranger's frame - no back, no wallet", () => {
    // Measured on a real bundle in a real iframe on a mock host page: back
    // navigates the HOST's page and traps the visitor, and the wallet renders
    // a stranger's coins to a visitor they do not belong to. Sound stays.
    expect(hostChrome("embed")).toEqual({ bar: true, back: false, wallet: false, mute: true });
  });

  it("leaves the standalone bundle exactly as it was - the positive control", () => {
    expect(hostChrome("app")).toEqual({ bar: true, back: true, wallet: true, mute: true });
  });

  it("draws nothing on a page, where the emitted header holds every platform control", () => {
    expect(hostChrome("page")).toEqual({ bar: false, back: false, wallet: false, mute: false });
  });
});

describe("the embed preview builds its frame only when asked", () => {
  // The measurement behind the whole shape: until 2026-09-05 the iframe was in
  // the emitted markup with `loading="lazy"`, and on the built /games/match3/
  // it had ALREADY booted on load - two live 64-cell boards in one document,
  // sharing `ellaz:match3:session`, the frame reloading to the player's own
  // Score 30 / Moves 24. Lazy says WHEN, never WHETHER.
  const slotHtml = `
    <div data-embed-preview data-src="/embed/snake/?lang=en"
         data-height="940" data-title="Snake - ellaz.fun"><img src="/art.svg"></div>
    <button data-embed-play hidden>Show the game here</button>`;

  beforeEach(() => {
    document.body.innerHTML = slotHtml;
  });

  it("shows the button, and no frame exists until it is pressed", () => {
    wireEmbedPreview();
    const button = document.querySelector<HTMLButtonElement>("[data-embed-play]")!;
    expect(button.hidden).toBe(false);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("builds the frame the emitter described, and takes the button away", () => {
    wireEmbedPreview();
    document.querySelector<HTMLButtonElement>("[data-embed-play]")!.click();
    const frame = document.querySelector("iframe")!;
    expect(frame, "no iframe after the button was pressed").not.toBeNull();
    expect(frame.getAttribute("src")).toBe("/embed/snake/?lang=en");
    expect(frame.getAttribute("height")).toBe("940");
    expect(frame.getAttribute("title")).toBe("Snake - ellaz.fun");
    expect(frame.getAttribute("allow")).toBe("fullscreen");
    expect(document.querySelector<HTMLButtonElement>("[data-embed-play]")!.hidden).toBe(true);
    // The poster is replaced, not stacked on top of - one game, one picture.
    expect(document.querySelector("[data-embed-preview] img")).toBeNull();
  });

  it("answers a tap on the picture with the SAME frame, not a second one", () => {
    wireEmbedPreview();
    document.querySelector<HTMLElement>("[data-embed-preview]")!.click();
    expect(document.querySelectorAll("iframe").length).toBe(1);
    expect(document.querySelector("iframe")!.getAttribute("src")).toBe("/embed/snake/?lang=en");
  });

  it("does nothing at all on a page with no preview slot - the positive control", () => {
    document.body.innerHTML = "<p>no embed section here</p>";
    expect(() => wireEmbedPreview()).not.toThrow();
    expect(document.querySelector("iframe")).toBeNull();
  });
});
