/**
 * The Google Analytics tag, in ONE place, for the app shell and all 144 emitted
 * documents.
 *
 * BUILD-TIME ONLY, like everything else under `src/build/`. This emits a string
 * into a `<head>`; nothing in `src/` may import it (`no-app-imports.test.ts`).
 *
 * ## Why it is not the snippet Google hands you
 *
 * The pasted snippet is four lines. It turns on Google Signals, ad
 * personalisation and demographics by default, and it writes a `_ga` cookie on
 * the first paint. Three reasons that is the wrong default HERE, none of them a
 * preference:
 *
 * 1. **This site carries no advertising at all** (`reach-doctrine` RCH1 - a
 *    portal may run its ads on its own domain; ellaz.fun never does). Ad signals
 *    feed an ad product we do not have, so switching them off costs nothing we
 *    want and removes the whole category from the conversation.
 * 2. **Most of the catalogue is for children.** 24 of 33 games declare
 *    `ageBand: "kids"`. Google's own guidance for child-directed traffic is to
 *    disable advertising features; doing it unconditionally means nobody has to
 *    decide, per page, which audience that page has.
 * 3. **A cookie needs consent in the EU, and we publish in French and Spanish.**
 *    A cookie banner in four languages, in front of a five-year-old, to collect
 *    data nobody is reading yet, is a bad trade. Cookieless is the honest
 *    version of "we do not gather anything".
 *
 * ## What it therefore does
 *
 * - `client_storage: 'none'` is PRESENT and is NOT load-bearing, and this
 *   comment said the opposite for about ten minutes. Measured in a clean
 *   browser on the built artifact: with `analytics_storage: 'denied'` it sets
 *   zero cookies; with `'granted'` it sets `_ga` and `_ga_<id>` anyway, on
 *   every one of three pages, and supplying an explicit `client_id` does not
 *   change that. So the cookie is governed by CONSENT here, not by this
 *   parameter. It is kept because it costs nothing and is correct in the denied
 *   arm, and the claim about it is now what was observed rather than what the
 *   documentation implies.
 * - `consent default` DENIED for all three AD keys, so no ad identifier is sent.
 * - `analytics_storage: 'granted'`, and that word is doing something specific.
 *   It does NOT grant storage - `client_storage: 'none'` has already taken that
 *   away and wins - it tells GA the pageview may be COUNTED.
 *
 *   This was `denied` first, and it did not work. Measured 2026-08-20: four
 *   pageviews from a clean browser, every one a `204` from
 *   `google-analytics.com/g/collect` with a correct payload, and GA4 Realtime
 *   showed **zero views and zero users**. A consent-denied ping is not a
 *   pageview; it is raw material for behavioural modelling, and modelling needs
 *   roughly a thousand events a day for a week before it produces anything. This
 *   property gets eight clicks a month. So the honest reading of `denied` here
 *   was: send Google the traffic and see none of it ourselves.
 *
 *   The tell was that a hand-made control event DID appear in the same Realtime
 *   screen while the real pageviews did not - which is the only reason the
 *   difference was visible at all, rather than looking like a tag that had not
 *   propagated yet.
 * - `allow_google_signals` and `allow_ad_personalization_signals` off.
 * - `ads_data_redaction` on, so even a denied ping carries no ad data.
 *
 * ## The honest limit, written here rather than discovered in a month
 *
 * With no cookie there is no client id tying two pageviews together, so every
 * view looks like a NEW user. `views`, `pages`, `countries`, `devices` and
 * `referrers` are real; `users` and `sessions` are inflated and `engagement
 * time` is meaningless. That is the trade for having no banner, and it is the
 * right one while the question is "did anyone arrive" rather than "what did
 * they do".
 *
 * Turning that around later is one edit - drop `client_storage` - plus a consent
 * banner in four languages. That is a decision, not a fix.
 *
 * ## Primary host only
 *
 * The GitHub Pages mirror serves `noindex` and `Disallow: /` on every page. Its
 * traffic is not the product, and counting it would pollute the one measurement
 * this project has. Same `base === "/"` test the indexable flag already uses.
 */

/** The property. One literal, so a second copy cannot drift. */
export const GA_MEASUREMENT_ID = "G-E25QBB8420";

/**
 * The tag as raw HTML for a `<head>`, or the empty string on a non-primary host.
 *
 * Both call sites emit it verbatim rather than escaping it, and
 * `analytics.test.ts` asserts it reaches the rendered documents rather than
 * trusting either of them.
 */
export function analyticsTag(base: string): string {
  if (base !== "/") return "";
  const id = GA_MEASUREMENT_ID;
  // Written compact on purpose: this ships in 145 documents, and the app shell
  // is a few hundred bytes from a hard payload ceiling. The reasoning lives in
  // the doc comment above, which ships to nobody.
  return (
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>` +
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}` +
    `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',` +
    `ad_personalization:'denied',analytics_storage:'granted'});` +
    `gtag('set','ads_data_redaction',true);gtag('js',new Date());` +
    `gtag('config','${id}',{client_storage:'none',allow_google_signals:false,` +
    `allow_ad_personalization_signals:false});</script>`
  );
}
