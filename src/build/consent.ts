import { html, raw, type RawHtml } from "./html";
import type { PageLocale } from "../i18n/locales";

/**
 * The consent bar, emitted rather than bundled.
 *
 * ## Why this exists at all
 *
 * Google Analytics shipped on 2026-08-20 with `analytics_storage: 'denied'` as
 * a consent DEFAULT that nothing ever updated, and the property was empty for
 * two days while the tag returned 204 on every hit. A denied hit is raw
 * material for behavioural modelling, not a counted pageview, and modelling
 * wants roughly a thousand events a day for a week. Full account:
 * `.claude/rules/a-tag-that-fires-is-not-a-tag-that-counts.md`.
 *
 * The operator ruled on 2026-08-22, having been shown the measurement: grant
 * it, and accept the banner. **The obvious alternative does not exist** -
 * granting writes `_ga` even with `client_storage:'none'` left in place,
 * verified live with a control that wrote and read back its own cookie in the
 * same run. So there is no cookieless-and-counted middle, and a cookie in the
 * EU needs consent.
 *
 * ## The default stays DENIED, and that is the whole design
 *
 * `analyticsTag()` is UNCHANGED: it still declares
 * `analytics_storage:'denied'` on the `consent default` line, before anything
 * is sent. That is correct Consent Mode v2 and it is what makes this bar
 * lawful rather than decorative - the first hit of a first visit goes out
 * denied, and only an explicit Accept flips it with `consent update`. A bar
 * that appeared while the tag was already granted would be theatre.
 *
 * ## Four things here are load-bearing rather than styling
 *
 * 1. **`position: fixed`, out of flow.** A bar in flow pushes the document and
 *    is a layout shift on every page on the site - and this repo spent
 *    2026-08-22 taking `/world/` from CLS 0.2966 to 0.0032. A banner that
 *    reintroduced that would be a straight trade of one metric for another.
 * 2. **Hidden until script says otherwise.** A reader with no JavaScript has no
 *    `gtag` either, so there is nothing to consent to and nothing to dismiss.
 *    Emitting a visible bar they cannot dismiss would be the worst of both.
 * 3. **Accept and Decline are the SAME button.** Same size, same weight, same
 *    shape - a "decline" made quieter than "accept" is the dark pattern the
 *    regulation exists about, and it is one CSS rule away at all times.
 * 4. **Primary host only**, keyed on the same `base === "/"` test the tag uses,
 *    so the noindex mirror cannot show a consent bar for a tag it never loads.
 */

/** Where the answer lives. Never renamed - a rename re-asks everybody. */
export const CONSENT_KEY = "ellaz:consent:v1";

type Copy = { line: string; yes: string; no: string };

/**
 * One entry per PAGE locale, and the other seven interface languages fall back
 * to English - the same rule every other emitted string follows. A reader who
 * gets English here is reading a language they may know; the alternative is a
 * bar in a script they cannot read, about a cookie.
 */
export const CONSENT_COPY: Record<PageLocale, Copy> = {
  he: {
    line: "אנחנו סופרים כניסות בעזרת עוגייה קטנה של גוגל. אין פרסומות ואין מעקב אישי.",
    yes: "אישור",
    no: "לא תודה",
  },
  en: {
    line: "We count visits with a small Google cookie. No ads, no personal tracking.",
    yes: "Allow",
    no: "No thanks",
  },
  es: {
    line: "Contamos visitas con una cookie pequeña de Google. Sin anuncios ni seguimiento personal.",
    yes: "Aceptar",
    no: "No, gracias",
  },
  fr: {
    line: "Nous comptons les visites avec un petit cookie Google. Sans publicité ni suivi personnel.",
    yes: "Accepter",
    no: "Non merci",
  },
};

/**
 * Read the stored answer, act on it, and only show the bar when there isn't one.
 *
 * Everything is inside try/catch: `localStorage` throws outright in some
 * private-browsing modes, and an uncaught error here is a script tag failing on
 * every document on the site.
 *
 * It VALIDATES rather than coerces. Anything that is not exactly `granted` or
 * `denied` is treated as no answer at all, which re-asks - the safe direction,
 * since the unsafe one is granting consent nobody gave.
 */
export function consentBootScript(): string {
  const K = JSON.stringify(CONSENT_KEY);
  return (
    `(function(){try{` +
      `var d=document.documentElement,b=document.getElementById("consent");` +
      `if(!b||!window.gtag)return;` +
      `var v=null;try{v=localStorage.getItem(${K})}catch(e){}` +
      `if(v==="granted"){gtag("consent","update",{analytics_storage:"granted"});return}` +
      `if(v==="denied")return;` +
      `d.setAttribute("data-consent","1");` +
      `function done(a){try{localStorage.setItem(${K},a)}catch(e){}` +
        `if(a==="granted")gtag("consent","update",{analytics_storage:"granted"});` +
        `d.removeAttribute("data-consent")}` +
      `var y=b.querySelector("[data-yes]"),n=b.querySelector("[data-no]");` +
      `if(y)y.addEventListener("click",function(){done("granted")});` +
      `if(n)n.addEventListener("click",function(){done("denied")});` +
    `}catch(e){}})()`
  );
}

/** The bar. Empty string on any base that is not the primary host. */
export function consentBar(base: string, locale: PageLocale): RawHtml | "" {
  if (base !== "/") return "";
  const c = CONSENT_COPY[locale] ?? CONSENT_COPY.en;
  return html`<div id="consent" class="consent" role="dialog" aria-live="polite" lang="${locale}" dir="${locale === "he" ? "rtl" : "ltr"}"><p>${c.line}</p><button type="button" data-yes>${c.yes}</button><button type="button" data-no>${c.no}</button></div>
    <style>
      ${raw(CONSENT_CSS)}
    </style>
    <script>
      ${raw(consentBootScript())}
    </script>`;
}

/**
 * Emitted inline rather than added to `DOCUMENT_CSS` and `global.css`, which
 * are two different stylesheets serving two different page kinds. One
 * definition cannot drift; two would, and the drift would be invisible on
 * whichever half nobody looked at.
 */
export const CONSENT_CSS =
  `.consent{display:none;position:fixed;inset-inline:0;bottom:0;z-index:60;` +
  `padding:12px;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;` +
  `background:#1d1b2e;color:#fff;font-size:14px}` +
  `[data-consent] .consent{display:flex}` +
  `.consent p{margin:0;max-width:48ch}` +
  `.consent button{font:inherit;font-weight:600;padding:8px 18px;min-height:40px;` +
  `border:0;border-radius:8px;background:#fff;color:#1d1b2e}`;
