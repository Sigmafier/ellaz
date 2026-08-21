import { describe, expect, it } from "vitest";
import { PAGE_LOCALES, SCRIPT, type PageLocale } from "../i18n/locales";
import { toHtml } from "./html";
import { DOCUMENT_CSS } from "./layout";
import { OFFER_COPY, OFFER_CSS, OFFER_H, offerBar, offerBootScript } from "./langOffer";

/**
 * The language offer.
 *
 * What is easy to get wrong here is not whether the bar renders - it is which
 * language it renders, on whose page, pointing where. Every assertion below is
 * about that, and every one was planted-and-killed against the real emitted
 * document before it was written down.
 */

const bar = (locale: PageLocale, alts: PageLocale[], base = "/") => {
  const out = offerBar(
    locale,
    alts.map((l) => ({ locale: l, path: l === "en" ? "/games/snake/" : `/${l}/games/snake/` })),
    (p) => `${base}${p.replace(/^\//, "")}`,
  );
  return out === "" ? "" : toHtml(out);
};

describe("the language offer", () => {
  it("offers every language the PAGE has, and only those", () => {
    // Derived from the page's own hreflang cluster, never from PAGE_LOCALES.
    // A row for a language this page does not have is a link to a document
    // nobody wrote - the same rule the footer's language links follow.
    const two = bar("en", ["en", "he"]);
    expect(two).toContain('data-for="he"');
    expect(two).not.toContain('data-for="es"');
    expect(two).not.toContain('data-for="en"'); // never offer the page you are on

    const all = bar("he", ["en", "he", "es", "fr"]);
    for (const l of PAGE_LOCALES.filter((l) => l !== "he")) {
      expect(all).toContain(`data-for="${l}"`);
    }
    expect(all).not.toContain('data-for="he"');
  });

  it("emits nothing at all when the page has no siblings", () => {
    // The 404 is the one document with no per-language twin. It falls out of
    // the alternates being empty rather than being special-cased, which is
    // what stops a fifth page kind having to remember this.
    expect(bar("en", [])).toBe("");
    expect(bar("en", ["en"])).toBe("");
  });

  it("gives each row the OFFERED language's direction, not the page's", () => {
    // A Hebrew offer inside an English document is right-to-left text in a
    // left-to-right page. Get this wrong and the sentence renders with its
    // punctuation migrated to the wrong end - a page that looks fine to
    // everyone who cannot read it.
    const en = bar("en", ["en", "he", "fr"]);
    expect(en).toContain('data-for="he" lang="he" dir="rtl"');
    expect(en).toContain('data-for="fr" lang="fr" dir="ltr"');
    // and the same row is still rtl when the PAGE is French
    expect(bar("fr", ["fr", "he"])).toContain('data-for="he" lang="he" dir="rtl"');
  });

  it("writes each line in its own language's script", () => {
    // The realistic mistake is a row copied to start a language and never
    // rewritten - which renders perfectly, links correctly, and offers a
    // reader a button that promises their language and delivers ours.
    const all = bar("en", [...PAGE_LOCALES]);
    const rows = all.split('class="in"').slice(1);
    const hebrew = rows.find((r) => r.includes('data-for="he"'))!;
    expect(hebrew).toMatch(/[֐-׿]/);
    expect(SCRIPT.he).toBe("hebrew");
    for (const l of PAGE_LOCALES.filter((x) => SCRIPT[x] === "latin" && x !== "en")) {
      const row = rows.find((r) => r.includes(`data-for="${l}"`))!;
      expect(row, `${l} row must not be written in Hebrew`).not.toMatch(/[֐-׿]/);
    }
    // Distinctness is asserted over the whole TABLE, never over one page's
    // rendered rows. A page never offers its own language, so a row copied
    // from the page's language is absent from that page's markup and a
    // rendered-row check reports every remaining line distinct - green, over
    // the one mistake it exists to catch. Measured: that control SURVIVED.
    const lines = PAGE_LOCALES.map((l) => OFFER_COPY[l].line);
    expect(new Set(lines).size).toBe(PAGE_LOCALES.length);
    const closes = PAGE_LOCALES.map((l) => OFFER_COPY[l].close);
    expect(new Set(closes).size).toBe(PAGE_LOCALES.length);
    // and the Hebrew entry is the only one written in Hebrew letters
    for (const l of PAGE_LOCALES) {
      expect(/[\u0590-\u05FF]/.test(OFFER_COPY[l].line), `${l} line`).toBe(l === "he");
    }
  });

  it("links to the alternate's own path, through the base", () => {
    // Base-relative, because this site ships under "/" and "/ellaz/" and a
    // hardcoded root is a 404 on one of them.
    expect(bar("en", ["en", "he"])).toContain('href="/he/games/snake/"');
    expect(bar("en", ["en", "he"], "/ellaz/")).toContain('href="/ellaz/he/games/snake/"');
  });

  it("styles exactly one show-rule per page locale, derived", () => {
    // Hardcoding the list here would be right today and silently one row short
    // the day a locale is promoted: the row would be emitted, matched by the
    // script, and styled by nothing - an invisible offer, no error anywhere.
    for (const l of PAGE_LOCALES) {
      expect(OFFER_CSS).toContain(`html[data-offer="${l}"] .lang-offer .in[data-for="${l}"]`);
    }
    const rules = OFFER_CSS.match(/html\[data-offer="[a-z]{2}"\]/g) ?? [];
    expect(rules.length).toBe(PAGE_LOCALES.length);
    // and nothing is visible until the script has chosen
    expect(OFFER_CSS).toContain(".lang-offer{display:none}");
  });

  it("names THIS page's language as the leave case", () => {
    // The script's one job is "is their language different from this page's".
    // A hardcoded locale here offers Hebrew to a Hebrew reader already on the
    // Hebrew page - which is the single most confusing thing it could do.
    expect(offerBootScript("he")).toContain('if(t==="he")return');
    expect(offerBootScript("es")).toContain('if(t==="es")return');
    expect(offerBootScript("he")).not.toContain('if(t==="en")return');
  });

  it("puts its script immediately after the bar, with nothing between", () => {
    // The whole CLS argument. A synchronous script here blocks parsing, so the
    // attribute is set before anything below is parsed and the row appears WITH
    // the page. Move it to the head and the element does not exist yet; defer
    // it and the page jumps 46px on every visit.
    const out = bar("en", ["en", "he"]);
    const end = out.indexOf("</div>", out.indexOf("</div>") + 1);
    expect(out.slice(end).replace(/\s+/g, " ").trim()).toMatch(/^<\/div> <script>/);
  });

  it("makes the stage pay for the bar, and pay nothing when there is none", () => {
    // The bar is a real element in flow above a screen sized to the viewport.
    // Without both halves the board is 46px taller than the space it has and
    // its last row is under the fold - on a page that otherwise looks perfect.
    expect(DOCUMENT_CSS).toContain("--oh:0px");
    expect(DOCUMENT_CSS).toContain(`html[data-offer] body.screen{--oh:${OFFER_H}px}`);
    expect(DOCUMENT_CSS).toContain("calc(100dvh - var(--hh) - var(--uh) - var(--oh))");
  });

  it("dismisses through one key, and reads it before deciding anything", () => {
    const s = offerBootScript("en");
    const key = 'ellaz:offer:v1';
    expect(s.indexOf(`getItem("${key}")`)).toBeGreaterThan(-1);
    expect(s.indexOf(`setItem("${key}"`)).toBeGreaterThan(s.indexOf(`getItem("${key}")`));
    // localStorage throws outright in some private modes, and an uncaught
    // throw here is a failing script tag on every document on the site.
    expect(s.startsWith("(function(){try{")).toBe(true);
    expect(s.endsWith("}catch(e){}})()")).toBe(true);
  });
});
