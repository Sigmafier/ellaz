# Measurement, analytics, and the payload budget

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## Measurement — there are TWO analytics systems, and NEITHER reports

**Google Analytics is live and has never counted a thing.** `G-E25QBB8420`, one
literal in `src/build/analytics.ts`, emitted into all 164 documents and the app
shell, absent from the 404 and from the whole noindex mirror. Measured live
2026-08-22: `gtag/js` 200, `/g/collect` **204 on every pageview**, no cookie.
Every gate here passes and the property is empty.

The answer is in the collect URL, which nothing here had ever read:
`gcs=G100` — ad_storage **and** analytics_storage DENIED, `gcd=13p3p3p3p7l1`,
denied by default and never updated. A GA4 hit under denied `analytics_storage`
is a cookieless consent-mode ping: raw material for behavioural modelling rather
than a counted pageview, and modelling wants roughly a thousand events a day for
a week. This site gets eight clicks a month. **A 204 means Google accepted the
packet; it has never meant anybody counted it.**

**It is not a bug** — it is exactly the cookieless, ads-off, no-banner setup that
was asked for. What nobody priced is that at this size it also means no data.

**The obvious fix did not exist, so there is a banner now.** "Grant
`analytics_storage`, keep `client_storage:'none'`, stay cookieless" was proposed
and measured on the live site with a control: granting writes `_ga` **and**
`_ga_E25QBB8420` with `client_storage` untouched. Consent governs the cookie, so
the trade was binary — no cookie and no data, or data and a banner. **The
operator chose the banner on 2026-08-22.**

**`src/build/consent.ts` is that bar, and the consent DEFAULT stays `denied`** —
that is the whole design, not an oversight. The first hit of a first visit still
goes out denied, before anybody is asked, and only an explicit Accept flips it
with `consent update`. A bar shown while the tag was already granted would be
theatre. Verified live on `afafd7a`: `gcs=G100` on the page-view hit,
**`gcs=G101` on the next one after the click**, ad_storage denied in both.

It is **emitted, not bundled**, on the `langOffer` rails, so all 160 document
pages carry it with no JavaScript of their own. Four things in it are
load-bearing rather than styling, and each is mutation-proved (5 planted, 5
killed): `position: fixed` so it cannot shift a page — `/world/` went 0.2966 to
0.0032 the same day, and a bar in flow would trade one metric for another;
hidden until script, because a reader with no JS has no `gtag` to consent to
either; **Accept and Decline styled by ONE selector**, so the quiet-decline dark
pattern requires splitting it; and primary-host-only, keyed on the same
`base === "/"` test the tag uses, so the mirror cannot ask for consent to a tag
it never loads.

Measured live: Decline writes **no cookie**, stores `denied` and does not come
back on other pages; Accept writes `_ga`, stores `granted`, and the bar is gone.

**It cost 593 B gz** — two arms on one tree, 90,021 without and 90,614 with, not
subtracted from anything written down earlier — and the ceiling went 90,500 to
**91,000** with the reason in `scripts/assert-payload.mjs` rather than in a
commit message. It was trimmed first, which bought 61 B and was not enough.

**The prose beside the tag was the real trap.** `analytics.ts`'s doc comment
carried BOTH answers, forty lines apart, on the one question that decides it, and
the shipped literal agreed with only one. `analytics.test.ts` now reads its own
source and reds when a doc bullet declares a consent state the tag does not ship
(3 mutations, 3 killed, with a positive control so it cannot pass vacuously).
Full account: [`.claude/rules/a-tag-that-fires-is-not-a-tag-that-counts.md`](../.claude/rules/a-tag-that-fires-is-not-a-tag-that-counts.md).

**Nothing outside that one file ever calls `gtag`**, so GA sees `page_view` and
nothing else. Every game event goes to PostHog instead — see below, and note that
fixing the consent state would still leave the games unmeasured.

**If it ever does report**: every pageview is a new user (measured — two loads of
one URL gave two different `cid`s), so `views`, `pages`, `countries`, `devices`
and `referrers` are real while **`users`, `sessions` and `engagement` are
inflated and must never be quoted.**

Analytics key is `VITE_POSTHOG_KEY` (public); see `.env.example`. Both workflows
pass it through from a repo secret of the same name.

**It is not set yet, and until it is, analytics does nothing.** `import.meta.env.VITE_*`
is substituted at BUILD time, so with the secret absent Vite writes `undefined`,
`if (!key) return` becomes always-true, and the whole init is dead-code-eliminated.
Verified against the live bundle on 2026-08-02: `person_profiles:"never"`,
`capture_pageview:!1` and `respect_dnt:!0` all had zero occurrences. Every event
since launch has been discarded — which is why economy tuning from `reward_grant`
has never had data to tune against.

Setting the secret is safe at any time: `build:check` fails the deploy if the
PostHog chunk would land in the precache, rather than shipping it behind a green
checkmark. **First visit is 89,164 B gz of the 90,000 ceiling** in
`scripts/assert-payload.mjs` — **836 B spare**, measured on the artifact
2026-08-13 on a tree carrying a peer's in-flight `daily` and `share` work; see
the attribution note further down before reading that delta as anyone's. (It was 69,624 on 2026-08-02, down from 143,234; the ceiling has
moved more than once since, so read `CEILING` in the script rather than trusting
this line.) **Adding a game costs the SHELL about 300 B gz** even though its code
is lazy: its `meta.ts` is in the statically-imported roster and its `gameArt`
scene is in the grid. Falling Blocks cost 306 B, measured against a clean `main`
build.

**The real number is 192 B gz per game, and both figures this file carried
before were wrong.** It said ~300 B from Falling Blocks; I raised that to ~745 B
on 2026-08-13 from Colour Sort and Merge. Each was measured across a window that
contained other changes, which is the same mistake twice — a delta is only a
per-game cost if the game is the only variable.

Isolated properly (two build arms from one tree, 25 games versus 6 with the
other 19 stubbed): **163 B is the card art and 29 B is the game's link in the
emitted home document.** The art dominates because `src/ui/gameArt.ts` is one
object literal — every scene is reachable, so every scene ships, on a screen
showing about eight cards. Dropping games from the roster *alone* saves only
**24 B each**, because the art never leaves with them; that number is the trap,
not the answer.

**So do not quote a per-game cost from a payload diff taken across a working
session.** Build two arms, change one thing.
[`docs/scaling-the-first-visit.md`](../docs/scaling-the-first-visit.md) carries the
measurement, the O(1) rule that replaces the fixed ceiling, and the three steps.

**The ceiling stopped binding on 2026-08-13**, and how it stopped matters more
than the number, because the fix written down here was wrong about its own size
by a factor of eight and wrong about what was blocking it.

This file used to say the carve was worth ~546 B and needed 20 games to move off
the `@shared` barrel onto direct module paths first. Neither held. **The barrel
was never the blocker** — `manualChunks` assigns by module PATH, so who imports
what changes nothing; `src/shared/` was pinned to the shell wholesale by the
`src/{sdk,ui,juice,i18n,shared}` catch-all. And the only module in there the
shell genuinely reaches is **`rng.ts`**, via `sdk/names.ts` and
`sdk/backupCode.ts`, both of which already import the direct path for exactly
this reason. Everything else — `winMoment`, the spawner, the cast, the shapes,
the sequence brain, the game clock, the `Prompt` chip, both session hooks, and
the barrel itself — was downloaded by every child before they had chosen a game.

**One ordering rule in `manualChunks` moved all of it: 89,561 → 84,974 B gz,
4,587 B saved, headroom 439 B → 5,026 B**, which is roughly sixteen more games
rather than one. `rng.ts` is matched FIRST and returned to the shell, and that
ordering IS the guard: move it and the shell imports from the page chunk, which
is the failure `assert-first-visit.mjs` exists to catch and has now caught three
times. It passed with its negative control rejecting 9 of 9 planted entries, so
that green is a real one rather than a vacuous one.

**Latest reading: 53,132 B gz of 56,000, 2,868 spare** (2026-08-26, 42 games,
4 page locales, local Node 24 - read the CI figure before quoting it anywhere a
reader will act on). **The ceiling came DOWN, 91,600 -> 56,000, and it is the
first cut in that comment block rather than another raise.** Two things did it,
both measured as two arms of one tree:

- **The lazy loaders left the shell.** `catalog.ts` held an `import()` per game
  for every game; 15 stay and the other 23 live in `gamesRest.ts` beside their
  metas. First visit 91,319 -> 90,519, and the per-game SLOPE 69.9 -> 32.5,
  which is under the 40 `docs/scaling-the-first-visit.md` has asked for since it
  was written. `PER_GAME_BUDGET` came down 140 -> 45 in the same commit.
- **`react` and `react-dom` are aliased onto `preact/compat`.** The reconciler
  went 45,374 -> 7,936 B gz and the first visit 90,519 -> 52,956. Half of what a
  child downloaded before choosing anything was a rendering library and none of
  it was a game.

**Nothing in the test suite can see the second one, and for a day the suite was
lying about which runtime it tested.** `vitest.config.ts` resolves aliases from
ITS OWN config and carried the five path aliases and not those two, so all 4,303
tests exercised React 18 - still installed, still a dependency - while the site
shipped preact. They passed before the swap, after it, and would have passed had
it been broken. The two aliases are in `vitest.config.ts` now, so a future
component test tests what ships; nothing renders a component TODAY, so this buys
honesty rather than coverage. **The obvious control does not work**: measured,
`preact/compat` reports `version: "18.3.1"`, the same
`$$typeof: Symbol(react.element)` and even React's
`__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`, so each of those passes
under React. A vnode's `constructor` is `undefined` in preact and `Object` in
React, and that is the whole discriminator;
`nested-root-teardown.test.ts` asserts it and has been watched failing with the
aliases removed. Full account:
[`.claude/rules/a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md`](../.claude/rules/a-runtime-swapped-by-an-alias-is-invisible-to-the-suite.md).

The environment is `node` and the include is `*.test.ts`, so the suite still
renders nothing, and the two ways the swap breaks do not throw. `useSyncExternalStore` is what re-renders the grid when the
lazy metadata and card art land, so a subtle difference leaves every card below
the fold blank forever with a clean console; and `reactHost.tsx` tears down a
nested root inside the portal's tree, which is a different code path in preact.
`scripts/repro/repro-preact-swap.mjs` is the evidence: 42 of 42 games mount in a
real browser, both lazy-arrival controls fire (`art-rest` blocked reads 15 of 39
cards, `meta-rest` blocked reads 15 labelled), and the home, the room and the
boards render BYTE-IDENTICAL to the React arm at 390x844.

**A second harness compares the two builds head to head.**
`scripts/repro/repro-arm-parity.mjs` runs both arms over all 42 games and judges
pixels and behaviour separately, because a game can render identically and be
dead. Most games here are RANDOM, so a cross-arm pixel difference is the
EXPECTED reading and not a finding: a second pass re-shoots ONE build for exactly
the games that differed, and where a build differs from itself as much as the two
builds differ there is nothing left for the engine to explain. Measured
2026-08-26 on one tree with only the alias reverted: **42 games, 0 behaviour
differences, 0 unexplained pixel differences, 0 console errors in either arm, 11
screens byte-identical and the other 31 explained by their own deal.** Three
games were flagged and re-run three times each before that was said out loud.
`--control` drives its verdict red with no setup, because a harness nobody has
watched fail is not a harness - and this one had two verdict defects of its own
when `/deep-test` went looking (its header carries them).

**Reverting is four lines and a build**: drop the two aliases from
`vite.config.ts` and the two from `vitest.config.ts`. `react` and `react-dom` are
deliberately still installed and still dependencies - they cost the bundle
nothing, they carry the types, and they are what makes that revert a config edit
rather than an install.

**That probe was wrong twice before it was right, and the React arm is why I
know.** Its first card-art counter read 1 of 39 and its node floor called snake,
bubbleshooter and fruit broken - and running it against the React build reported
the identical three failures. `card.querySelector("svg")` returns the STAR
BADGE, and a canvas game draws almost no DOM. Never read a single arm.

The slope at 42 games is **29.0 B gz per game**. Run `npm run assert:slope` and
`npm run assert:payload` on the tree in front of you rather than trusting either
number here.)

(**The superseded readings live in [`docs/payload-history.md`](../docs/payload-history.md)** -
about a dozen of them, newest first, verbatim. They are kept out of this file on
purpose: every one was correct on its own tree and wrong about every other, so a
stack of them here was teaching the opposite of what it says. Run
`npm run assert:payload` for the live figure.)
**The transferable half is the measurement, not the bytes.** Two numbers in this
file were confidently wrong at the same moment: a ceiling of 86,000 that the live
gate had read `90_000` since a parallel lane raised it, and a 546 B estimate for
work nobody had ever measured. Both were written by someone who had measured
something true at the time. **Re-measure before quoting any payload figure here**
— the gate is one command, and this prose has now gone stale twice. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](../.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
