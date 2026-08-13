# A Bot Challenge at the Edge Answers You 200 and Answers Google 403

**Scope**: Anything served through Hostinger's CDN, and any future edge, WAF or proxy in front of ellaz.fun.
**Origin**: 2026-08-08. Google Search Console reported "Sitemap could not be read" with 0 discovered pages, while the site loaded perfectly in a browser.

## Core Rule

**An edge bot-challenge is a proof-of-work in JavaScript. A browser solves it in a
few seconds and the visitor never notices. A crawler cannot solve it at all and
receives HTTP 403 with an HTML body forever. The two happen at the same instant,
to the same URL, from the same server - so every check performed in a browser
reports a healthy site while the site is invisible to search. Never diagnose a
crawling problem from a browser, and never conclude "the site is up" from a page
that rendered for you.**

The cause here was Hostinger's CDN **"I'm Under Attack!"** mode, at
`hPanel -> Websites -> ellaz.fun -> Dashboard -> Performance -> CDN -> Manage -> Security`.
Hostinger's own documentation says the mode *"temporarily blocks search engine
bots, which may result in your site not being indexed during this period."* It is
built to be switched on during an attack and switched off after. On ellaz.fun it
was simply on, and nothing in the repo, the build, the deploy or the browser could
see it.

## Why every check we own reported green

This is the same shape as the service-worker navigation fallback and the precache
glob: correct everywhere you look, wrong for a population you are not in.

| Check | Result while the site was uncrawlable |
|---|---|
| Opening ellaz.fun in a browser | perfect, every page |
| `npm run build` | green |
| `build:check`, `assert-pages.mjs` | green - they read `dist/`, not the edge |
| `build.test.ts` sitemap tests | green - the generator was always correct |
| The sitemap file itself | valid XML, 48 URLs, no BOM, correct hreflang |
| Google Search Console | **"Sitemap could not be read", 0 pages** |

Every gate in this repo asserts against the artifact on disk. Not one of them
asserts against the artifact **a crawler receives over the network**, and that gap
is exactly the size of this bug.

## The three things that found it

**1. Fetch as a crawler, not as yourself.** The first `curl` returned `403` with
`content-type: text/html` where XML belonged. That single request contained the
whole answer and no browser could ever have produced it.

**2. Compare verbs.** `HEAD` returned `200 application/xml` while `GET` returned
`403`, six times each. That split proves the origin and the file are healthy and
isolates the fault to the challenge layer, before knowing anything about the vendor.

**3. Match the interstitial against the vendor's own docs.** The served page title
was byte-identical to Hostinger's documented Under Attack interstitial:

```
served   : Checking your browser before accessing. Just a moment...
their doc: Checking your browser before accessing. Just a moment…
```

That match turned "some bot protection somewhere" into a named toggle with a known
location. **Read the block page instead of discarding it** - a challenge page
identifies its vendor and usually its exact mode.

## The measurement trap this cost, twice

**A single sample per cell is not evidence.** An early matrix showed 403 with
`Accept-Encoding` and 200 without it, across seven user agents, and produced a
confident and completely wrong conclusion that content negotiation was the trigger.
Repeating the same matrix ten times per cell showed 403 everywhere. Nothing about
the header mattered; the IP had crossed the challenge threshold midway through the
first matrix, and the cells ran in an order that made the flip look like a variable.

**The probe was the trigger.** Roughly 40 requests in two minutes from an ordinary
home IP moved it permanently into the challenged state. That is not an aside - it
is the mechanism. **A crawler reading a sitemap and then its 48 URLs makes exactly
that shape**, which is why a sitemap is the first thing such a rule blocks and why
Hostinger's default Medium level ("challenges moderately threatening visitors") is
already enough to do it.

**Once your IP is flagged, it is a poisoned instrument.** Every subsequent
measurement from it reports the flag rather than the site. Confirm from a vantage
point that has not been probing - a different network, or a fetch issued by
something else entirely.

## How to check, and what green looks like

Run this from a network that has not been hammering the site, and never from a
browser:

```bash
GB="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

# 1. The file, as a crawler sees it. Body must start "<?xml", not "<!DOCTYPE html".
curl -s https://ellaz.fun/sitemap.xml -A "$GB" | head -c 40

# 2. The burst. This is the test that matters - a single 200 proves nothing,
#    because the challenge only arms after a crawl-shaped run of requests.
for i in $(seq 1 50); do
  curl -s -o /dev/null -w '%{http_code}\n' https://ellaz.fun/ -A "$GB"
done | sort | uniq -c        # want: 50 200

# 3. Every URL the sitemap advertises.
curl -s https://ellaz.fun/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' \
  | while read -r u; do echo "$(curl -s -o /dev/null -w '%{http_code}' "$u" -A "$GB") $u"; done \
  | grep -v '^200 ' || echo "all 200"
```

Measured after the fix on 2026-08-08: 50/50 `200` on the burst, 48/48 `200` across
the sitemap, `content-type: application/xml`, `server: LiteSpeed`.

**`server: LiteSpeed` instead of `server: hcdn` means the CDN is off entirely**,
not merely de-armed. That is a valid state and it is what ellaz.fun runs now. The
`.htaccess` cache headers then apply directly, which was verified: `/`, `/sw.js`,
`/manifest.webmanifest` and a game page all still return `no-cache,
must-revalidate`, so the PWA autoUpdate path survives. If the CDN is ever turned
back on, set Security Level to **Essentially off** and re-run the burst above.
There is nothing on this site for a WAF to protect - no login, no forms, no
backend, no database.

## This can come back silently, so a gate watches for it

The toggle lives in a vendor panel outside the repo. No commit, no build and no
deploy touches it, so **the entire git history is blind to the single setting that
decides whether the site is indexable**. Hostinger has also been reported to enable
protection at the system level without notice.

**`npm run assert:crawlable`** (`scripts/assert-crawlable.mjs`) is the answer, and it
is the only check here that reads the NETWORK rather than `dist/`. It fetches
robots.txt and the sitemap as Googlebot, then walks every URL the sitemap lists.
`.github/workflows/crawlable.yml` runs it daily; a red scheduled run emails the repo
owner, which is the whole alerting mechanism and costs nothing.

Three decisions in it are load-bearing:

- **The sitemap walk IS the burst test.** The challenge arms on a run of requests
  from one IP, which is exactly the shape of reading a sitemap and fetching what it
  lists. A separate hammer would be extra load for no extra signal.
- **The BODY is checked, not just the status.** This outage used 403, but nothing
  stops a vendor serving a challenge with 200 - and a status-only check would report
  green over an interstitial.
- **A challenge is reported before a bad status**, because only that wording sends
  the reader to the CDN panel. "HTTP 403" sends them into the code, which has never
  once been the problem.

It uses node built-ins only, so the workflow needs no `npm ci` - a check that must
install 400 packages before it can tell you the site is down fails for its own
reasons. Mutation-proven against the **verbatim** challenge page captured during this
incident: sitemap challenged, a page challenged, robots blocking everything, plus a
positive control that must still pass.

## The same shape one level down: crawler vs CRAWLER (2026-08-13)

Everything above is browser-vs-crawler. **It happens between two crawlers too, and
the gate written for the first case was blind to the second** — because it walked
as Googlebot only, and walking as one agent cannot express a block keyed on
another.

Measured live, 11 agents x 5 targets x 3 samples:

```
BLOCKED  GPTBot               / 429   /es/games/snake/ 429   /en/games/snake/ 429
BLOCKED  meta-externalagent   / 429   (same)
ok       Googlebot · Bingbot · OAI-SearchBot · ChatGPT-User · ClaudeBot
         Claude-SearchBot · PerplexityBot · Perplexity-User · Applebot-Extended
```

`server: LiteSpeed`, nothing about user agents in `deploy/hostinger.htaccess`, CDN
off. **Hostinger's own infrastructure refuses two agents by name**, while our
emitted `robots.txt` grants GPTBot `Allow: /`. The file promises what the host
will not serve, and nothing in git can see it.

Four things worth keeping, each measured rather than reasoned:

- **The control is what makes it evidence.** The agents ran INTERLEAVED, so an IP
  rate limit would have failed everything after Googlebot's 15 requests.
  OAI-SearchBot ran immediately after GPTBot and returned 200. It is the NAME.
- **The bare token is not a probe.** UA `GPTBot` returns **200** from the same
  server that 429s `Mozilla/5.0 (compatible; GPTBot/1.0; +…)`. A gate built on the
  token alone reports green over the defect it exists for. Send a crawler SHAPE.
- **Pick an HTML target.** `sitemap.xml` and `llms.txt` returned 200 for both
  blocked agents throughout — a check pointed at either is green during the block.
- **Scope it before alarming anyone.** Both refused agents are *training*
  crawlers; every *citation* crawler is served, so ChatGPT, Claude and Perplexity
  citations were never affected. The alarming reading is the wrong one.

**It is not fixable from this repo.** Hostinger's bot protection sits above the
site, the CDN and any plugin; support has confirmed to other customers that the
opt-out exists only on VPS plans. **Do not turn the CDN on to reach its AI Audit
panel** — that is what caused the outage this rule is named after. `robots.txt` is
already correct; the honest options are to leave it, make the file agree with the
host, or change hosting.

`assert-crawlable.mjs` now walks as every crawler `robots.txt` NAMES, parsing the
list out of the SERVED file so there is exactly one list. Advisory until
`CRAWL_BOT_ACCESS=1`, for the reason the content floor is.

## When to Apply

- Search Console says "could not be read", "couldn't fetch", or a 403 on any URL
- **Any gate that fetches as a client identity** — a user agent, an API key, a role,
  a tenant. It samples ONE identity and is blind to every other by construction
- Traffic or indexed-page count falls with no deploy to explain it
- Any report of "Google cannot see the site" while it loads fine for you
- Before enabling any CDN, WAF, DDoS or bot-protection feature on any host
- Any measurement whose cells were sampled once each - repeat before concluding

## Related

- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  - the closest sibling. That one is a green run beside a frozen site; this is a
  green site beside an unreachable one. Both are "the thing you checked is not the
  thing the user gets".
- [`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
  - correct for crawlers and broken for returning visitors. This rule is its exact
  mirror image, which is worth noticing: the two populations are each invisible
  from the other's vantage point.
- [`pwa-stale-bundle-qa.md`](pwa-stale-bundle-qa.md) - the third way a working site
  looks broken, or a broken one looks working.
- [`docs/deploy.md`](../../docs/deploy.md) § Troubleshooting.
