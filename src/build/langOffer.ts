import { AUTONYM, PAGE_LOCALES, type PageLocale } from "../i18n/locales";
import { html, raw, type RawHtml } from "./html";

// Relative, never the `@i18n` alias: `src/build/**` is loaded by NODE from
// vite.config.ts at config time, where no Vite alias exists yet. An aliased
// import here fails the whole config to load, which reads as a broken build
// rather than as a wrong import.

/**
 * The language OFFER - one line at the very top of an emitted document, telling
 * a reader that this page exists in the language their browser asked for.
 *
 * WHY IT EXISTS, measured. Search Console, 2026-08-04 to 08-18: 76% of the
 * queries reaching this site are Hebrew and 65% of the impressions are Israel,
 * and 11% of those impressions land on a `/he/` URL. Six Hebrew minesweeper
 * queries earn 19 impressions while `/he/games/minesweeper/` earns zero of
 * them - Google serves the ENGLISH page, which has 33. The Hebrew page exists,
 * is titled with the exact words being typed, and ranks around 6 wherever
 * Google does serve a Hebrew page against a mean of 27 for the English twins.
 * The reader simply never learns it is there.
 *
 * It is NOT a redirect, and that is a hard rule rather than a preference: a
 * crawler follows a redirect too, so redirecting on an inferred language hides
 * every other version of the page and drops them out of the index. Google says
 * so in writing. Clause SEO3.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EMITTED RATHER THAN RENDERED
 *
 * The obvious build is a React component. It would have cost the first visit
 * real bytes on a ceiling with 66 to spare, it would have appeared only after
 * the bundle arrived - which is the wrong moment for somebody who just landed
 * from a search result - and it would have had to be written once for the
 * content pages and again for the app.
 *
 * Emitted, it costs a first visit EXACTLY NOTHING (`src/build/**` ships to
 * nobody), it is on screen in the first paint, and it covers every language
 * automatically: the rows are derived from the page's own hreflang cluster, so
 * promoting a fifth locale gives every page a fifth row with no edit here.
 *
 * ---------------------------------------------------------------------------
 * THE ONE PLACE IT IS NOT
 *
 * The four home shells (`/`, `/he/`, `/es/`, `/fr/`). They render no
 * `DOCUMENT_CSS` and no emitted chrome - the app draws all of it - so the bar
 * would have to live in the bundle, which is the cost this design exists to
 * avoid. They are 4 of 164 documents and 11% of the impressions; the 160 that
 * carry it are where the arrivals actually land. Stated rather than left to be
 * discovered.
 */

/** Dismissal. Global and permanent: a reader who says "no" is not asked again. */
export const OFFER_KEY = "ellaz:offer:v1";

/** The bar's height, and the token the stage subtracts. Zero when no offer shows. */
export const OFFER_H = 46;

/**
 * What the bar says, per language it OFFERS.
 *
 * Authored per language, never translated - the same discipline the page prose
 * is held to, and for the same reason: this sentence is read by somebody who
 * has just decided whether this site is for them.
 *
 * The line is deliberately a STATEMENT and not a question. "Would you like
 * Hebrew?" invites a decision; "this page is also in Hebrew" is information,
 * and the button beside it is the decision. `cta` is the autonym, which is the
 * one word the reader is certain to recognise.
 */
export const OFFER_COPY: Record<PageLocale, { line: string; close: string }> = {
  he: { line: "העמוד הזה קיים גם בעברית", close: "סגירה" },
  en: { line: "This page is also in English", close: "Close" },
  es: { line: "Esta página también está en español", close: "Cerrar" },
  fr: { line: "Cette page existe aussi en français", close: "Fermer" },
};

/**
 * The CSS, folded into `DOCUMENT_CSS`.
 *
 * Every row is hidden until the script picks one, and the picking is done by
 * ONE attribute on `<html>` against a per-locale rule - so no script ever
 * writes text, a href or a direction. The markup for every language is already
 * correct on the page; the attribute only chooses which of them is visible.
 * That is what makes a wrong-language bar impossible rather than unlikely.
 *
 * The rules are DERIVED from PAGE_LOCALES. A hardcoded list here would be right
 * today and silently short one row the day a locale is promoted - the row would
 * be emitted, matched by the script, and styled by nothing.
 */
export const OFFER_CSS = `
.lang-offer{display:none}
html[data-offer] .lang-offer{position:relative;z-index:8;display:flex;
  justify-content:center;height:${OFFER_H}px;box-sizing:border-box;
  background:var(--doc-card);border-bottom:1px solid var(--doc-line)}
.lang-offer .in{flex:1 1 auto;max-width:700px;display:none;align-items:center;
  gap:10px;padding:0 12px;box-sizing:border-box}
${PAGE_LOCALES.map(
  (l) => `html[data-offer="${l}"] .lang-offer .in[data-for="${l}"]{display:flex}`,
).join("\n")}
.lang-offer .txt{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font-weight:500;font-size:14px;color:var(--doc-soft)}
.lang-offer a{flex:0 0 auto;display:inline-flex;align-items:center;height:32px;
  padding:0 14px;border-radius:999px;text-decoration:none;font-weight:700;
  font-size:14px;background:var(--doc-ink);color:var(--doc-card)}
.lang-offer button{flex:0 0 auto;width:32px;height:32px;display:grid;
  place-items:center;border:0;border-radius:999px;background:none;cursor:pointer;
  color:var(--doc-soft);font-size:17px;line-height:1}
html[data-offer] body.screen{--oh:${OFFER_H}px}
`;

/**
 * The decision, and the only script this feature has.
 *
 * It sits immediately AFTER the bar rather than in `<head>`, and both halves of
 * that are load-bearing. After, because the element has to exist for the
 * dismiss handler to attach. Immediately, because a synchronous script blocks
 * parsing - so the attribute is set before anything below is parsed and before
 * the first paint, and the row appears with the page rather than jumping into
 * it. A deferred script here is a 46px layout shift on every page.
 *
 * It reads `navigator.languages` in order and stops at the first entry that is
 * either this page's language (nothing to offer, leave) or a language this page
 * has a row for (offer it). Entries for languages the site does not publish are
 * skipped, so a reader whose list is `de, en` on a Hebrew page is offered
 * English rather than nothing.
 *
 * Everything is inside one try/catch. `localStorage` throws outright in some
 * private-browsing modes, and a thrown error here would be a script tag failing
 * on every document on the site.
 */
export function offerBootScript(locale: PageLocale): string {
  return (
    `(function(){try{` +
      `var d=document.documentElement,b=document.getElementById("lang-offer");` +
      `if(!b)return;` +
      `try{if(localStorage.getItem(${JSON.stringify(OFFER_KEY)}))return}catch(e){}` +
      `var r=b.querySelectorAll("[data-for]"),h={},i;` +
      `for(i=0;i<r.length;i++)h[r[i].getAttribute("data-for")]=1;` +
      `var L=navigator.languages||[navigator.language||""],w="";` +
      `for(i=0;i<L.length;i++){var t=String(L[i]).toLowerCase().split("-")[0];` +
        `if(t===${JSON.stringify(locale)})return;` +
        `if(h[t]){w=t;break}}` +
      `if(!w)return;` +
      `d.setAttribute("data-offer",w);` +
      `var x=b.querySelector("button");` +
      `if(x)x.addEventListener("click",function(){` +
        `try{localStorage.setItem(${JSON.stringify(OFFER_KEY)},"1")}catch(e){}` +
        `d.removeAttribute("data-offer")});` +
    `}catch(e){}})()`
  );
}

/**
 * The bar itself: one row per language this page actually has, all hidden.
 *
 * Derived from the page's own alternates rather than from PAGE_LOCALES, so a
 * row can never promise a document nobody wrote - the same rule the footer's
 * language links follow. A page with no alternates (the 404) gets no bar at
 * all, which falls out of this rather than being special-cased.
 *
 * Each row carries its OWN `lang` and `dir`. A Hebrew offer inside an English
 * document is right-to-left text in a left-to-right page, and getting that
 * wrong renders a sentence whose punctuation has migrated to the wrong end.
 */
export function offerBar(
  locale: PageLocale,
  alternates: Array<{ locale: PageLocale; path: string }>,
  href: (path: string) => string,
): RawHtml | "" {
  const rows = alternates.filter((a) => a.locale !== locale);
  if (rows.length === 0) return "";
  return html`<div id="lang-offer" class="lang-offer">
      ${rows.map(
        (a) =>
          html`<div class="in" data-for="${a.locale}" lang="${a.locale}" dir="${a.locale === "he" ? "rtl" : "ltr"}"><span class="txt">${OFFER_COPY[a.locale].line}</span><a href="${href(a.path)}" hreflang="${a.locale}">${AUTONYM[a.locale]}</a><button type="button" aria-label="${OFFER_COPY[a.locale].close}">✕</button></div>`,
      )}
    </div>
    <script>
      ${raw(offerBootScript(locale))}
    </script>`;
}
