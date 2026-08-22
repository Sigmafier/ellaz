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
 * - `analytics_storage: 'denied'` plus `client_storage: 'none'`. Measured in a
 *   clean browser on the built artifact: ZERO cookies, on every page tried, in
 *   three languages. Flipping consent to `'granted'` sets `_ga` and
 *   `_ga_<id>` regardless of `client_storage`, and an explicit `client_id`
 *   does not prevent it - so the cookie is governed by CONSENT here, not by
 *   that parameter, whatever the documentation implies.
 *
 *   **RE-MEASURED 2026-08-22 on the LIVE site, and this passage is correct.**
 *   On https://ellaz.fun/games/sudoku/, in a real browser: zero `_ga` cookies
 *   in the shipped state; then `gtag('consent','update',{analytics_storage:
 *   'granted'})` with `client_storage:'none'` UNCHANGED, and both `_ga` and
 *   `_ga_E25QBB8420` appeared. A control wrote and read back its own cookie in
 *   the same run, so the empty "before" is a real absence rather than a blind
 *   probe. There is no cookieless-but-counted middle for GA4.
 *
   This was briefly `'granted'` on 2026-08-20, and the round trip is the most
 *   useful thing in this file, because BOTH moves were made on stale readings
 *   from three different instruments in one hour:
 *
 *     - GA4 Realtime, read four times through a hash-route SPA that never
 *       reloaded. It showed a control event for twenty minutes after that
 *       event had stopped being current, and showed no pageviews - which is
 *       what sent the config to `granted`. A genuinely fresh tab showed no
 *       data under EITHER setting.
 *     - `vite preview`, which served a cached `granted` document for several
 *       minutes after the build on disk said `denied` - which produced a
 *       measurement of "denied sets cookies too", contradicting the earlier
 *       correct one and nearly sending the config back again.
 *     - and before either, a compression probe that never sent
 *       `Accept-Encoding` and reported a site serving brotli as uncompressed.
 *
 *   Every one of the three returned a confident, stable, wrong value that
 *   looked exactly like a correct one. The settled measurement, taken after
 *   killing the preview by pid and confirming the SERVED bytes matched the
 *   disk: three pages, three languages, 204 on every collect, zero cookies.
 *
 *   Whether ANY of this reports is still unverified - see the note at the
 *   bottom - and until it is, the setting stays where the operator put it.
 * - `consent default` DENIED for all three AD keys, so no ad identifier is sent.
 * - `analytics_storage: 'denied'`, and it is the reason this property reports
 *   nothing. **The two paragraphs above and below this one contradicted each
 *   other for two days, on the one question that decides the whole trade.**
 *   This bullet used to read `'granted'` and claim that `client_storage:'none'`
 *   "has already taken storage away and wins" - describing a configuration the
 *   file has never shipped, and getting the deciding fact backwards. It does
 *   not win: granting writes `_ga`, measured live 2026-08-22 (see above).
 *
 *   A reader could open this comment and leave with either answer, confidently.
 *   One did, on 2026-08-22, and proposed the impossible middle - cookieless AND
 *   counted - to the operator before reading the whole file. THE FIX IS TO READ
 *   THE CODE, NOT THE PROSE ABOUT IT: the shipped literal on the `consent
 *   default` line is the only thing here that cannot be out of date.
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
    `ad_personalization:'denied',analytics_storage:'denied'});` +
    `gtag('set','ads_data_redaction',true);gtag('js',new Date());` +
    `gtag('config','${id}',{client_storage:'none',allow_google_signals:false,` +
    `allow_ad_personalization_signals:false});</script>`
  );
}

/*
 * THE CHECK THIS NOTE SCHEDULED HAS NOW BEEN RUN - 2026-08-22, live.
 *
 * It used to end "a 204 means Google accepted the packet; it has never meant
 * anybody counted it", and set a check for the next day that nobody closed.
 * Closed now, on https://ellaz.fun/games/snake/ in a real browser:
 *
 *   gcs=G100            ad_storage DENIED, analytics_storage DENIED
 *   gcd=13p3p3p3p7l1    denied by DEFAULT, never updated
 *   204 on every /g/collect · ep.client_storage=none
 *   cid=1546109085… then cid=1358236254… on a SECOND load of the SAME url
 *
 * So the tag is healthy and the property is empty, and both are correct. A
 * consent-denied hit is raw material for behavioural modelling rather than a
 * counted pageview, and modelling wants roughly a thousand events a day for a
 * week. This site gets eight clicks a month. The fresh `cid` per load is the
 * second half: there is no id tying two views together, so nothing could be a
 * returning user even if it were counted.
 *
 * STILL NOT VERIFIABLE FROM HERE: what the GA4 property itself shows. That
 * needs the console, which is the operator's. What CAN be said is that the
 * browser side is doing exactly what it was configured to do.
 *
 * AND THE SECOND FAILURE, WHICH NO CONSENT SETTING FIXES
 *
 * Nothing outside this file ever calls gtag, so GA sees `page_view` and nothing
 * else. Every game event - levelStart, levelComplete, reward_grant - goes
 * through src/sdk/analytics.ts to PostHog, and `VITE_POSTHOG_KEY` has never
 * been set: measured the same day, the LIVE shell chunk has zero occurrences of
 * `posthog`, `person_profiles`, `respect_dnt` and `capture_pageview`. So even a
 * fully-counted GA would say nothing about the games, and the rewards economy
 * has still never been tuned against a single real number.
 */
