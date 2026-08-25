import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { gamePage } from "./gamePage";
import { DOCUMENT_CSS } from "./layout";
import { GAMES } from "../portal/games";
import { PAGE_LOCALES } from "../i18n/locales";
import { SITE } from "../content/site";
import { CONTENT } from "../content/index";

/**
 * A GAME IS UNFINISHED IN EXACTLY ONE PLACE - `meta.beta` - and two surfaces
 * that cannot see each other have to agree about it.
 *
 * The home card is React in the shell. The game page is a string written by
 * `src/build`, which may never import the app. So "which games are beta" could
 * easily become two lists, and the day they disagree a player taps an unmarked
 * card and lands on a page that says beta, or - worse, because it is the silent
 * direction - taps a badged card and lands on a page that says nothing.
 *
 * Nothing else here can catch that. Both surfaces render, both type-check, and
 * a badge that is simply absent looks exactly like a game that is finished.
 */
const BETA = GAMES.filter((g) => g.beta);
const DONE = GAMES.filter((g) => !g.beta);

const HOME = readFileSync(new URL("../portal/Home.tsx", import.meta.url), "utf8");
const TOKENS = readFileSync(new URL("../ui/tokens.css", import.meta.url), "utf8");
const GLOBAL = readFileSync(new URL("../ui/global.css", import.meta.url), "utf8");

/**
 * Any game's page, in any written language, read off the SAME two registries
 * the build reads. Naming the content module per game would have meant editing
 * this file the day a second game goes beta - which is the day it most needs
 * to already work.
 */
const page = (id: string, locale: (typeof PAGE_LOCALES)[number] = "en") =>
  gamePage({
    meta: GAMES.find((g) => g.id === id)!,
    copy: CONTENT[id].copy[locale],
    locale,
    base: "/",
    all: GAMES,
    indexable: true,
  });

describe("a beta game says so, on the card and on its page", () => {
  it("has at least one beta game and at least one finished one", () => {
    // The POSITIVE CONTROL for everything below. With no beta game the
    // presence assertions pass vacuously; with no finished game the absence
    // assertions do.
    //
    // SO THIS FILE REDS THE DAY THE LAST BETA FLAG COMES OFF, and that is the
    // intended behaviour rather than an accident to work around. Everything
    // here is of the form "a beta game carries the badge"; with no beta game
    // there is nothing to carry it, and a green run would be a green run over
    // nothing. Delete the file in the same change that clears the last flag -
    // do not soften this into a skip, which is the same vacuum wearing a
    // reassuring colour.
    expect(BETA.length, "no game declares beta - the presence checks below cannot fail").toBeGreaterThan(0);
    expect(DONE.length, "every game is beta - the absence checks below cannot fail").toBeGreaterThan(0);
  });

  it("puts the badge on the page of a game that declares it", () => {
    for (const g of BETA) {
      const html = page(g.id);
      expect(html, `${g.id} declares beta and its page carries no badge`).toMatch(/class="beta"/);
    }
  });

  it("puts NO badge on the page of a game that does not", () => {
    for (const g of DONE) {
      const html = page(g.id);
      expect(html, `${g.id} is not beta and its page carries a badge`).not.toMatch(/class="beta"/);
    }
  });

  it("says it in every page locale, never in English on a French page", () => {
    for (const locale of PAGE_LOCALES) {
      const word = SITE[locale].chrome.beta;
      const note = SITE[locale].chrome.betaNote;
      expect(word.length, `${locale} has no word for beta`).toBeGreaterThan(0);
      expect(note.length, `${locale} has no note for beta`).toBeGreaterThan(0);
      const html = page(BETA[0].id, locale);
      // In the VISUALLY-HIDDEN span, not merely somewhere on the page. The
      // `title` attribute carries the same string, so a looser check passes
      // over a badge that announces nothing but the word "Beta" - and `title`
      // is announced inconsistently across screen readers and not at all on a
      // touch device, which is most of this platform's traffic.
      expect(html, `the ${locale} page does not announce its beta note`)
        .toContain(`<span class="vh">${note}</span>`);
    }
    // The note is the half that must really differ - "Beta" is the same token
    // in three of the four, so asserting the WORD differs would fail on a
    // correct translation.
    const notes = new Set(PAGE_LOCALES.map((l) => SITE[l].chrome.betaNote));
    expect(notes.size, "two locales share a beta note - one was never translated").toBe(PAGE_LOCALES.length);
  });

  it("keeps the badge OUT of the breadcrumb, where it would be ellipsised away", () => {
    // `.bc` is overflow:hidden + text-overflow:ellipsis, so a badge inside it
    // is cut from the END first - and the end is exactly where a badge after
    // the game's name sits. It would vanish on a narrow phone with nothing
    // overflowing and every width check reading clean.
    // See .claude/rules/a-row-that-grows-with-the-catalog-must-wrap.md
    const html = page(BETA[0].id);
    const nav = html.slice(html.indexOf('<nav class="bc"'), html.indexOf("</nav>"));
    expect(nav.length, "could not find the breadcrumb - re-read this assertion").toBeGreaterThan(20);
    expect(nav, "the beta badge is INSIDE the breadcrumb and will be ellipsised").not.toContain('class="beta"');
    expect(html, "the badge is not in the utility row at all").toMatch(/<\/nav>\s*<span class="beta"/);
  });

  it("hides the note from the eye WITHOUT hiding it from a screen reader", () => {
    const vh = DOCUMENT_CSS.slice(DOCUMENT_CSS.indexOf(".vh{"), DOCUMENT_CSS.indexOf(".vh{") + 200);
    expect(vh, "could not find the .vh rule").toContain("clip-path");
    // The loud failure: the note becomes ordinary text and the sentence is
    // printed beside the badge.
    expect(vh, ".vh no longer takes the note out of the flow").toContain("position:absolute");
    // The SILENT one, and the reason this assertion is worth its line. Both of
    // these remove a node from the accessibility tree as well as from the
    // page, so the badge would go on looking exactly right while announcing
    // nothing but the word "Beta" - which is the jargon the note exists to
    // translate.
    expect(vh, ".vh uses display:none, which is not announced").not.toContain("display:none");
    expect(vh, ".vh uses visibility:hidden, which is not announced").not.toContain("visibility:hidden");
  });

  it("pins the two CSS properties that decide whether it survives a narrow row", () => {
    const rule = DOCUMENT_CSS.slice(DOCUMENT_CSS.indexOf(".beta{"), DOCUMENT_CSS.indexOf(".beta{") + 400);
    expect(rule, "could not find the .beta rule").toContain("padding");
    // 0 0 auto: the trail shrinks, the badge never does.
    expect(rule, ".beta may shrink - the trail is what should give way").toContain("flex:0 0 auto");
    // Without this the badge drifts to the far edge and parks a label among
    // the pause/restart/expand buttons.
    expect(DOCUMENT_CSS, "the badge does not take the auto margin off the crumb")
      .toContain("body.screen .urow:has(.beta) .bc{margin-inline-end:0}");
  });

  it("reads the same field on the home card", () => {
    expect(HOME, "the grid card does not gate the pill on meta.beta").toContain("meta.beta ?");
    expect(HOME, "the grid card has no beta pill").toContain("function BetaPill(");
    expect(HOME, "the pill lost its class, so global.css no longer styles it").toContain('className="ellaz-beta"');
    // A second list is the failure this whole file exists for: a hardcoded id
    // in the app would render a badge for a game whose meta says nothing.
    expect(HOME, "the home grid names a game by id instead of reading meta.beta")
      .not.toMatch(/id === "lettercross"/);
  });

  it("keeps the two renderers' colours in step, without a second list of hexes", () => {
    // The card reads TOKENS; the emitted page cannot, because it is a string
    // written before the bundle exists. So the two copies are held together
    // HERE rather than by either of them - and by reading tokens.css rather
    // than by naming a hex in this file, which would be a third copy and would
    // go stale the same way.
    const read = (name: string) => {
      const m = TOKENS.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{3,8})`));
      expect(m, `${name} is not declared in tokens.css`).not.toBeNull();
      return m![1];
    };
    const fill = read("--beta-fill");
    const ink = read("--beta-ink");
    expect(fill.toLowerCase(), "the badge's two colours are the same colour").not.toBe(ink.toLowerCase());

    const card = GLOBAL.slice(GLOBAL.indexOf(".ellaz-beta {"), GLOBAL.indexOf(".ellaz-beta {") + 400);
    expect(card, "could not find the .ellaz-beta rule").toContain("top: 7px");
    // PHYSICAL `right`, and the one place in this app where that is the
    // correct choice rather than the lazy one. The star badge sharing the card
    // carries `dir="ltr"` for its digit, and logical insets resolve against an
    // element's OWN direction - so that badge is pinned physically left in
    // every locale, and a logical inset here flips under Hebrew and lands both
    // in the same corner. Measured: star [270,290], beta [270,305].
    // `scripts/repro/repro-beta-badge.mjs` re-measures it on the artifact.
    expect(card, "the card badge uses a logical inset - in Hebrew it lands on the star")
      .not.toContain("inset-inline-end");
    expect(card, "the card badge is not pinned to a corner at all").toContain("right: 7px");
    expect(card, "the card badge does not read --beta-fill").toContain("var(--beta-fill)");
    expect(card, "the card badge does not read --beta-ink").toContain("var(--beta-ink)");

    const rule = DOCUMENT_CSS.slice(DOCUMENT_CSS.indexOf(".beta{"), DOCUMENT_CSS.indexOf(".beta{") + 400);
    expect(rule.toLowerCase(), `the emitted badge's fill is not ${fill}`).toContain(fill.toLowerCase());
    expect(rule.toLowerCase(), `the emitted badge's ink is not ${ink}`).toContain(ink.toLowerCase());
  });
});
