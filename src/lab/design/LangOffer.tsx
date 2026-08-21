import { useEffect, useState } from "react";
import { localePrefix, PAGE_LOCALES, type PageLocale } from "../../i18n/locales";

/**
 * The language OFFER - a mock, reached at `?offer`, for the operator to look at.
 *
 * The measured problem (GSC Performance export, 2026-08-21): 76% of the queries
 * reaching this site are Hebrew and 65% of its impressions are Israel, but only
 * 11% of those impressions land on a `/he/` URL. Six Hebrew minesweeper queries
 * earn 19 impressions and `/he/games/minesweeper/` earns ZERO of them - Google
 * serves the ENGLISH page, which has 33. The Hebrew page exists, is titled with
 * the exact words being typed, and ranks top-10 wherever Google does serve a
 * Hebrew page. The person never learns it is there.
 *
 * This offers it to them. It is NOT a redirect, and that is not a preference: a
 * crawler follows a redirect too, so redirecting on an inferred language hides
 * every other version of the page and drops them out of the index. Google says
 * so in writing, and it is clause SEO3.
 *
 * HONEST LIMIT, so nobody sells this as something it is not: it moves no
 * ranking. It catches a person after they arrive. The only second-order search
 * argument is that SEO11's decay mechanism is "de-index if not recrawled within
 * 75-140 days WITHOUT ENGAGEMENT", and a reader handed their own language
 * engages.
 *
 * It lives under `src/lab/` so it lands in the `lab-*` chunk, which carries a
 * `globIgnores` entry and is referenced 0 times in `index.html`. The mock costs
 * a first visit NOTHING, which matters with ~141 bytes of headroom. Promoting
 * it to production is a separate decision with its own payload measurement.
 */

/** Row height. `--tap` is 44, so a 44px control fits with nothing to spare. */
export const OFFER_H = 46;

const CSS = `
.lang-offer{
  position:relative;z-index:8;display:flex;justify-content:center;
  height:${OFFER_H}px;box-sizing:border-box;
  background:var(--doc-card,#fff);
  border-bottom:1px solid var(--doc-line,#e4e2ef);
  font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--doc-ink,#1b1b2b)}
/* The inner cap, and it is a fix rather than a flourish. At 1440 the sentence
   and its button flew to opposite edges of the screen with ~1,200px of white
   between them - the eye has to cross the whole window to connect the offer to
   the thing that accepts it. 700px is the number the game panel already caps
   at, so the bar lines up with the panel it sits above rather than inventing a
   second width. */
.lang-offer .in{
  flex:1 1 auto;max-width:700px;display:flex;align-items:center;gap:10px;
  padding:0 12px;box-sizing:border-box}
.lang-offer .txt{
  flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font-weight:500;color:var(--doc-soft,#5a5a72)}
.lang-offer a.go{
  flex:0 0 auto;display:inline-flex;align-items:center;height:32px;padding:0 14px;
  border-radius:999px;text-decoration:none;font-weight:700;
  background:var(--g,var(--doc-ink,#1b1b2b));color:#fff}
.lang-offer button.x{
  flex:0 0 auto;width:32px;height:32px;display:grid;place-items:center;
  border:0;border-radius:999px;background:none;cursor:pointer;
  color:var(--doc-soft,#5a5a72);font-size:17px;line-height:1}
.lang-offer button.x:hover{background:var(--doc-line,#e4e2ef)}

/* The bar is IN FLOW, so it takes real height off the stage rather than
   floating over the board. That cost is part of what is being judged - a mock
   that hid it would be answering a question nobody asked. */
body[data-page="game"] .stage .box,body[data-page="world"] .stage .box{
  height:calc(100dvh - var(--hh) - var(--uh) - ${OFFER_H}px)}
`;

/**
 * What the bar says, per language it OFFERS. Authored per language, never
 * translated - the same discipline the page prose is held to.
 */
const COPY: Record<PageLocale, { line: string; cta: string; close: string; dir: "rtl" | "ltr" }> = {
  he: { line: "העמוד הזה קיים גם בעברית", cta: "עברית", close: "סגירה", dir: "rtl" },
  en: { line: "This page is also in English", cta: "English", close: "Close", dir: "ltr" },
  es: { line: "Esta página también está en español", cta: "Español", close: "Cerrar", dir: "ltr" },
  fr: { line: "Cette page existe aussi en français", cta: "Français", close: "Fermer", dir: "ltr" },
};

/**
 * The same page in another PAGE_LOCALE, derived from the path alone.
 *
 * `src/portal/paths.ts` builds a URL from a game id and a locale; nothing there
 * goes the other way, from the path in front of you. Strip whichever locale
 * prefix this path carries, then apply the target's. The canonical locale's
 * prefix is "", so a bare path is already stripped and English is a no-op.
 */
export function samePageIn(path: string, target: PageLocale): string {
  let bare = path;
  for (const l of PAGE_LOCALES) {
    const p = localePrefix(l);
    if (p && (bare === p || bare.startsWith(`${p}/`))) {
      bare = bare.slice(p.length) || "/";
      break;
    }
  }
  return `${localePrefix(target)}${bare}`;
}

export function LangOffer({ target = "he" as PageLocale }: { target?: PageLocale }) {
  const [gone, setGone] = useState(false);
  const copy = COPY[target];

  useEffect(() => {
    const el = document.createElement("style");
    el.dataset.offerCss = "";
    el.textContent = CSS;
    document.head.append(el);
    return () => el.remove();
  }, []);

  if (gone) return null;
  return (
    <div className="lang-offer" dir={copy.dir} lang={target}>
      <div className="in">
        <span className="txt">{copy.line}</span>
        <a className="go" href={samePageIn(location.pathname, target)}>
          {copy.cta}
        </a>
        <button className="x" type="button" aria-label={copy.close} onClick={() => setGone(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}
