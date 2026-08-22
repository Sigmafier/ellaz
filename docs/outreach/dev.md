# Developer surfaces - two list PRs and one article

**Status**: fired. **PR #465 is OPEN** (awesome-pwa, since 2026-08-12; entry corrected 2026-08-20). The phaser PR and the article are still drafts. Both pull requests go
out under the operator's GitHub account, so each one waits for an explicit ACK naming that
list. The article is the operator's to publish or to discard.

---

## The plan ranked these by stars. That was the wrong measurement.

The plan picked both lists by star count - `awesome-pwa` 4,889 and `awesome-phaser` 517 -
and ranked them in that order. Stars measure how many people once found a list useful.
They say nothing about whether anyone still **merges** into it, which is the only property
that decides whether an afternoon of work becomes a link.

Measured 2026-08-12, `gh pr list --state merged` and `--state open` on both:

| | awesome-pwa | awesome-phaser |
|---|---|---|
| Stars | 4,889 | 517 |
| Last push | 2026-08-10 (2 days) | 2025-04-14 (**16 months**) |
| Last 5 merges | **all on 2026-08-10** | 2025-04-14, 2024-07-10, then 2019 |
| Open PRs | 5, oldest 2026-07-08 | 2, open **14 and 44 days** |
| Section that fits | `### Games and Entertainment`, 26 entries | `Open Source Games`, **1 entry** |

So the two are not two instances of the same task. One is a live list merging batches
within the day; the other has merged twice since 2019 and currently has every open PR
unanswered. **Sort candidate lists by merge recency before spending time on any of them.**

That is the same shape as the topic-population finding in
`~/.claude/skills/seo-aeo-geo/references/backlinks.md`: the number that is easy to read
(stars, topic popularity) is not the number that predicts the outcome.

---

## PR 1 - hemanth/awesome-pwa (recommended)

### Their CI runs against the live site, and ours passes

This list ships `scripts/check-pwa.mjs` and a CI workflow that **fetches every URL in the
README and checks the raw HTML for a web app manifest**. A submission whose site fails is
rejected by a robot before a human reads it.

That gate was run here first, using their own script unmodified, against a README holding
only our entry:

```
🔍 Checking 1 app entries for PWA quality...
  ✅ [Games and Entertainment] Ellaz — https://ellaz.fun/ (no SW)
🎉 All entries pass PWA quality checks!
```

Verdict `isPwa` is `hasManifest` alone, so `(no SW)` does not fail it. But the flag is a
real finding and it is worth keeping:

```
rel="manifest"          1     <- found
manifest.webmanifest    1     <- found
sw.js                   0
workbox                 0
serviceWorker           0
registerSW              0
```

**Every service-worker string is absent from the raw HTML of ellaz.fun**, because
`vite-plugin-pwa` puts the registration inside a hashed JS chunk. We ship a full
`autoUpdate` service worker; anything that reads HTML without running it cannot see it.
Same class as
[`a-spa-shell-is-invisible-to-ai-crawlers.md`](../../.claude/rules/a-spa-shell-is-invisible-to-ai-crawlers.md)
- a capability that only exists after JavaScript runs is invisible to every scanner that
does not run JavaScript. No action needed for this PR. Worth knowing the next time a
third-party checker reports something about this site that contradicts what a browser shows.

### The change

One line, `README.md`, inserted after `Cybercar` (line 168) and before `Falling Nikochan`
(line 169), which is where `Ellaz` falls alphabetically in that section:

```diff
  * [Cybercar](https://cybercar.pages.dev): Free neon arcade survival game with power-ups, unlockable themes, boss battles, and global leaderboard.
+ * [Ellaz](https://ellaz.fun/): 33 free browser games for kids and adults in Hebrew, English, Spanish and French, works offline, no account and no ads.
  * [Falling Nikochan](https://nikochan.utcode.net): Simple and cute rhythm game, where anyone can create and share charts.
```

Format copied from the neighbouring entries: `* [Name](url): Description.` The list's own
entries use an em dash in two places; ours uses a plain hyphen, per the house rule for
anything a reader sees.

Nothing else changes. The table of contents lists sections, not entries, so it needs no edit.

### The PR

**Branch**: `add-ellaz`
**Title**: `Add Ellaz to Games and Entertainment`
**Body**:

```
Adds Ellaz to Games and Entertainment.

https://ellaz.fun/ - 33 browser games, in Hebrew, English, Spanish and French,
installable, works
offline. No account, no ads, no analytics identity. Open source, MIT.

I ran scripts/check-pwa.mjs against the entry before opening this: it passes
(manifest found). Entry is alphabetical within the section and follows the
existing format.
```

Three things that body deliberately does **not** do: it does not describe the project
beyond what the entry says, it does not argue for inclusion, and it does not mention the
author. A list PR that reads as a pitch is the one that gets closed.

---

## PR 2 - Raiper34/awesome-phaser (prepared, and I would hold it)

Two reasons, and the second is the one that matters:

**The list looks dormant.** Last merge 2025-04-14. Two PRs open, 14 and 44 days, both
unanswered. A PR here is likely to sit rather than to be rejected, which costs nothing but
also earns nothing.

**The fit is thin and we should say so rather than dress it up.** `Open Source Games` holds
exactly one entry, a single game whose link points at its GitHub repository. Ellaz is a
platform of 33 games of which **one** - snake - is built with Phaser
(`grep -rln 'from "phaser"' src/` returns one file). An entry implying otherwise would be
inaccurate, and an accurate one is honest about being a small part of a larger project.

If the operator wants it anyway, the honest version, matching that section's format of
pointing at the repository:

```diff
  - [Air Combat](https://github.com/kaluabentes/aircombat-client) - A jet fighter combat game.
+ - [Ellaz](https://github.com/Sigmafier/ellaz) - A browser games platform; its snake game is built with Phaser 4. MIT.
```

**Title**: `Add Ellaz to Open Source Games`
**Body**:

```
Adds Ellaz to Open Source Games.

https://github.com/Sigmafier/ellaz - MIT, TypeScript. It is a games platform
rather than a single game; snake is the Phaser scene. Live at https://ellaz.fun/.
```

**Recommendation: skip it.** The star count is what made this list look worth an afternoon,
and the merge history says it is not.

---

## The article

**Where**: dev.to, cross-posted to Hashnode with a canonical pointing at the dev.to copy.
Not to both as originals - two copies of one article competing is the duplicate problem
this project already documented once.

**Title**: `33 browser games in 90 KB: what a no-backend PWA actually costs`

Every number below was measured on clean `HEAD` **1e219fe** on 2026-08-18 and each one
names the file that produces it. Nothing is rounded up and nothing is estimated.

---

### Draft

I build a games site for kids. Hebrew first, English second, no accounts, no ads, no
backend. Thirty-three games. The whole thing is a static site.

The number I care about most is the first visit: **90,008 bytes gzipped**, of a ceiling of
90,500 that fails the build. 492 bytes of room left. That figure is measured on the built
artifact by a script in the repo, not counted by hand, and it is the reason for most of the
decisions below.

Here is what I learned paying for those bytes.

**A lazy import is three changes, not one.** Making an import dynamic moves bytes between
requests. It does not remove them from the first visit unless the chunk is also excluded
from the service worker's precache glob, and unless it has a stable name to exclude it by.
The precache sweeps `**/*.js`. Miss the third step and the build is green, the bundle
report looks smaller, the chunk really is lazy, and the first visit is exactly as heavy as
before. There is no signal at all - the only place it shows is the precache manifest, which
nobody reads by default.

Worse, `lazy(() => import(...))` at module scope keeps a chunk in the production module
graph even when the branch that renders it is compiled away. Vite then writes a
`<link rel="modulepreload">` for it into the HTML. A modulepreload is not a hint. It is a
download. A dev-only tool shipped 27 KB to every visitor of my site for a week behind three
correct-looking defences, because the fourth one was missing.

**One game pays for Phaser, not all of them.** The vendor chunk is 379,855 bytes gzipped.
For a long time I described it as shared across the canvas games. It is imported by exactly
one file. It is lazy and precache-excluded so it costs a first visit nothing, but "shared"
was a story rather than a measurement, and one `grep -rln` ended it.

**The interface speaks eleven languages; the pages exist in four.** Those are different
lists on purpose. Google's documentation says localised versions count as duplicates when
the main content stays untranslated, so a German header over an English article is not a
smaller German page - it is the named anti-pattern, once per game. The list of languages
with prose is a TypeScript type, which means promoting a language before writing its prose
does not fail review, it fails the build. Nine of the eleven interface dictionaries are lazy
chunks of about 1.5 KB gzipped each, fetched only by someone who picks that language.

**Those nine chunks first shipped empty.** Correctly named, correctly excluded from the
precache, all sharing one content hash, zero bytes each, because the dictionaries landed
before the picker that imports them and the bundler removed the lot. Every check passed.
A build gate now fails on an empty locale chunk, on two sharing a hash, and on none
existing - three assertions I would not have thought to write if the failure had not looked
so exactly like success.

**The most expensive outage had nothing to do with any of that.** The site served a blank
page for an hour while deploys reported success in ninety seconds. The uploader kept a sync
ledger on the server and skipped what it believed was already there; a transfer died after
the ledger was written, so every run afterwards diffed against a file claiming the missing
chunks were present. Retrying could not help, because retrying was the broken part.

A status sweep during the outage reported four healthy pages. A 200 document whose
JavaScript 404s is a blank page, and nothing that checks status codes can see it. The
replacement gate compares the live HTML against the build that just ran, and fetches every
artifact, and compares SHA-256 rather than length - an 80 percent truncated chunk returns
200 with a plausible size and a syntax error on import.

If there is one transferable thing here: **ask what each check is structurally unable to
see.** Every gate I owned read the build output. Not one read what a visitor receives. That
gap was the size of every serious bug this project has had.

The code is MIT: https://github.com/Sigmafier/ellaz

---

### What that draft deliberately leaves out

- Any claim about traffic, rankings or growth. Nothing has been measured for 90 days and
  the doctrine forbids a verdict before then.
- Any number without a script behind it.
- Any tutorial framing. The article is a report on measurements, which is the only thing
  here nobody else can write.

---

## Provenance

| Claim | Where it comes from |
|---|---|
| 33 games | `src/portal/catalog.ts` lazy loaders and `src/portal/games.ts` roster, both 33, counted on the artifact 2026-08-18 |
| 90,008 B gz first visit, 492 spare | the `Build for the root domain` step of the deploy for `1b8f2b9`, 2026-08-22. **Read off CI, not off a workstation**: the same commit measures ~50 B differently on Node 24, and CI is the toolchain that builds the live site |
| Phaser 379,855 B gz | `gzip -c dist/assets/vendor-phaser-*.js \| wc -c` on that build. Unchanged since 2026-08-12 |
| one game imports Phaser | `grep -rln 'from "phaser"' src/` returns `src/games/snake/SnakeScene.ts` only |
| 11 app locales, 4 page locales | `dist/pages.json` `locales.app` and `locales.page`, 2026-08-18 |
| 9 locale chunks, ~1.5 KB gz each | `gzip -c dist/assets/locale-*.js \| wc -c` on the built artifact, 2026-08-18 |
| 27 KB dev-only chunk shipped | `.claude/rules/precache-glob-sweeps-new-chunks.md`, measured 2026-08-03 |
| the deploy ledger outage | `.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md` |
| empty locale chunks | `scripts/assert-first-visit.mjs`, and the peer's account on the bus 2026-08-11 |
| Google's duplicate-locale wording | quoted verbatim in `.claude/rules/a-locale-page-without-a-translated-body-is-a-duplicate.md` |
| awesome-pwa passes their CI | their `scripts/check-pwa.mjs` run unmodified here, 2026-08-12 |
| merge recency of both lists | `gh pr list -R <repo> --state merged --limit 5`, 2026-08-12 |

## What was NOT verified

- **Whether dev.to or Hashnode will keep the canonical tag** the way their docs describe.
  Neither was fetched; both are behind a login for anything useful.
- **Whether `hemanth/awesome-pwa` merges game entries at the same rate as others.** PR #441,
  a Games and Entertainment addition, has been open since 2026-07-14 while five later PRs in
  other sections merged. One data point, not a pattern, but the operator should not read
  "merges within the day" as a promise.
