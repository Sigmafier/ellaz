# Deploy Runbook

How Ellaz gets from a `git push` to a player's screen, what can go wrong, and how
to check. Written 2026-08-02, when ellaz.fun was wired up.

## The short version

**Push to `main`. That's it.** Two workflows run in parallel and publish to two
hosts. Nothing needs to be built or uploaded by hand.

| URL | Host | Workflow | Vite `base` |
|---|---|---|---|
| **`https://ellaz.fun/`** — the live site | Hostinger, FTPS | `deploy-hostinger.yml` | `/` |
| `https://sigmafier.github.io/ellaz/` | GitHub Pages | `deploy-pages.yml` | `/ellaz/` |

Same source, two base paths, two independent lanes. An FTP hiccup cannot hold up
the Pages deploy or vice versa — they have separate `concurrency` groups.

## Why two hosts instead of pointing ellaz.fun at Pages

Pages would be simpler: one workflow, no credentials, free TLS. It was rejected
because **a Pages custom domain 301-redirects the `github.io` path onto it** — a
project site gets exactly one hostname, so adopting ellaz.fun on Pages would take
`sigmafier.github.io/ellaz/` offline as an independent URL. Keeping both live
costs one extra build, which is cheap.

Switching later is small: add `public/CNAME` containing `ellaz.fun`, set
`BASE_PATH=/` in `deploy-pages.yml`, set the custom domain in the repo's Pages
settings, and repoint DNS at GitHub's four A records
(`185.199.108–111.153`). Then delete `deploy-hostinger.yml`.

## History — how ellaz.fun started

The domain was bought at Hostinger and the site was **hand-uploaded**: the bytes
on the server were byte-identical to a local `npm run build`. Nothing connected
the repo to the host. `dist/` is gitignored and Hostinger runs no build step, so
Hostinger's own "deploy from GitHub" feature would have published an empty site.
A push updated only the Pages URL while the real domain stayed frozen at whenever
someone last dragged `dist/` into hPanel.

## The Hostinger pipeline

`.github/workflows/deploy-hostinger.yml`:

1. **Credential guard** — if `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` are
   unset, emit a warning and skip every remaining step. It fails **soft** on
   purpose: a workflow that reds on every push is a workflow nobody reads.
2. `npm ci`, then `npm run build` with **no `BASE_PATH`**, so `base` is `/`.
   This is also the type-check gate (`tsc --noEmit` runs first).
3. `cp deploy/hostinger.htaccess dist/.htaccess`.
4. **`lftp mirror`** uploads `dist/` over FTPS, in **two passes**.
5. **`node scripts/assert-live.mjs`** fetches the live site and fails the run
   unless it is serving this build.

**The two passes are ordered by who references whom**: hashed assets first, then
HTML and `sw.js`, which are the only files naming those hashes. A run that dies
between the passes leaves old HTML pointing at assets that are all still present
- stale, recoverable, invisible to a child - instead of new HTML pointing at
chunks that never arrived, which is a blank page. Nothing is deleted, which is
also why an orphaned old hash is left on the server.

**`mirror` is used for `assets/` and nowhere else.** Every name there carries a
content hash, so a changed file is a *new file* and "does the remote have this
name" cannot be wrong. Everything else is transferred **unconditionally**: mirror
compares size and time, and Vite hashes are fixed length, so an `index.html`
differing only in a hash is byte-identical in size - it skipped all 49 pages once,
exactly that way.

**Uploads do not go through a hidden temp file.** lftp's default `.in.*` is a
dotfile and this host refuses to rename hidden files (`550`), which silently drops
files out of an otherwise successful pass. `xfer:temp-file-name` is a visible
pattern instead - not `xfer:use-temp-file false`, which would trade an intermittent
failure for a torn file.

**This used to be `SamKirkland/FTP-Deploy-Action@v4.4.0`, and it is not any more
because it took the site down.** That action kept a `.ftp-deploy-sync-state.json`
on the server and transferred only the diff against it. On 2026-08-08 a transfer
died mid-sync *after* the ledger was written, so from then on every run compared
against a file claiming the missing chunks were present and skipped them.
ellaz.fun served `index.html` referencing two 404 chunks - a blank page - while
re-deploys reported success in 90 seconds and changed nothing. An incremental
sync whose ledger can disagree with the disk **cannot self-heal by retrying**,
which is the one thing everybody tries. `lftp` holds no state, so it compares
against what is actually on the server and the next run repairs a partial
transfer. The old ledger is deleted on every deploy - it was world-readable and
published the whole file tree - so reverting this step cannot quietly re-arm it.
Full account: `.claude/rules/a-deploy-ledger-that-can-disagree-with-the-disk.md`.

### Three facts about this FTP account

Each was verified against the live server on 2026-08-02, and **each would have
produced a green workflow beside an unchanged website**:

| Fact | Wrong guess | What happens |
|---|---|---|
| Account is chrooted to its docroot; `server-dir` is `./` | `public_html/` | Site lands one level down, nothing serves it |
| Username is `u210394724.ellaz` | `u210394724.ellaz.fun` | `530 Access denied` |
| Cert is `CN=*.hstgr.io` | strict verification | TLS handshake fails |

`u210394724.ellaz.fun` appears in hPanel right beside the working name. It is a
different account. The docroot is `/home/u210394724/domains/ellaz.fun/public_html`
but the FTP login is chrooted there, so from FTP's point of view it is `/`.

Overrides, if any of this changes, are repo **variables** (not secrets), so no
code edit is needed: `FTP_SERVER_DIR`, `FTP_PROTOCOL`.

## Cache headers (`deploy/hostinger.htaccess`)

Ships to Hostinger only — Pages runs nginx and ignores `.htaccess`. It sets:

- **Hashed build output** (`/assets/*.js|css|woff2`) → `max-age=31536000, immutable`.
  Safe because the filename changes whenever the content does.
- **`index.html`, `sw.js`, `manifest.webmanifest`** → `no-cache, must-revalidate`.
  These three ARE the update mechanism; caching them strands returning players.
- **The nested content pages** inherit the `no-cache` rule: the `FilesMatch` is
  basename-scoped, so `games/2048/index.html` matches `^index\.html$` exactly as
  the shell does. They carry no content hash, so revalidating each visit is right.
- **`robots.txt`, `sitemap.xml`, `llms.txt`** → `max-age=3600`.
- **`ErrorDocument 404 /404.html`**, and no SPA catch-all. Every route is a real
  document now; the only thing the catch-all still caught was a typo, and
  answering a typo with 200 plus the home page is a soft 404, which search
  engines treat worse than the missing page. `Options -MultiViews` stops Apache
  guessing a filename before `DirectorySlash` can redirect.
- gzip, plus correct MIME for `.webmanifest`.

Order matters: the immutable rule is broad and the `no-cache` block below it
narrows back the three files. A later `Header set` replaces an earlier one.

**Hostinger's default was `max-age=604800` on everything**, including `sw.js`.
That is a real misconfiguration and worth having fixed — though note the impact
is narrower than it first looks, because browsers special-case service-worker
script fetches (`updateViaCache` defaults to `imports`, so the SW script itself
bypasses the HTTP cache on update checks). The header still affects the CDN edge
and any intermediary.

### The edge-cache caveat

**The Hostinger CDN is OFF since 2026-08-08** - responses now carry
`server: LiteSpeed` rather than `server: hcdn`, and the caveat below does not
currently apply. It is kept because the CDN can be re-enabled in one click, and
because the fix it describes is not obvious.

Confirm which state you are in before trusting either:

```bash
curl -sI https://ellaz.fun/ | grep -i '^server'
# LiteSpeed = CDN off, headers apply directly, no edge cache
# hcdn      = CDN on, everything below applies
```

With the CDN on, an object cached *before* a header change keeps the old header
until its TTL expires - so right after a fix you can see the stale value on a
`HIT` and the correct one on a cache-buster `MISS`. That is the fix working, not
failing. To clear it now: hPanel → Performance → Purge cache.

**If you re-enable the CDN, set Security Level to "Essentially off" in the same
visit.** Leaving it at the Medium default is what made the site uncrawlable for
Google, and nothing in this repo can detect that state. See
[`.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](../.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md).

## Verifying a deploy

**A green run is not proof.** The credential guard makes the whole job succeed
while skipping everything, which is by design. Check the step, not the run:

```bash
gh run list --limit 2
gh run view <run-id> --json jobs \
  --jq '.jobs[].steps[] | "\(.conclusion)\t\(.name)"'
# "Upload to Hostinger" must say success, not skipped.
```

**The deploy now checks this itself** - `assert-live.mjs` runs in the same job and
reds the run - so the manual sweep below is for diagnosing, not for gating:

```bash
npm run build            # or BASE_PATH=/ellaz/ for the Pages copy
npm run assert:live      # SITE_URL / BASE_PATH override the defaults
```

**Never conclude health from a document's status code.** A 200 document whose JS
returns 404 is a blank page, and a status sweep over `/`, `/games/snake/`,
`/world/` and `/boards/` reported a perfectly healthy site on 2026-08-08 while
ellaz.fun was blank. Fetch what the document *references*:

```bash
curl -s https://ellaz.fun/ | grep -oE 'assets/[A-Za-z0-9_.-]+\.(js|css)' | sort -u |
  while read -r a; do printf '%s %s\n' \
    "$(curl -s -o /dev/null -w '%{http_code}' "https://ellaz.fun/$a")" "$a"; done
# every line must start 200

curl -sI https://ellaz.fun/ | grep -i cache-control
# expect: no-cache, must-revalidate

curl -sI "https://ellaz.fun/sw.js?cb=$(date +%s)" | grep -i cache-control
# expect: no-cache, must-revalidate   (cache-buster dodges the edge)
```

### The content pages (since 2026-08-04)

The build emits 46 real documents. Four checks, and the last one is the only one
that can catch the failure that matters most.

```bash
# 1. A game page is a real document with its own words, JavaScript or not.
curl -s https://ellaz.fun/games/2048/ | grep -c '<h1'          # 1
curl -s https://ellaz.fun/games/2048/ | wc -w                   # ~900+

# 2. The slug is meta.id, not the directory name.
curl -sI https://ellaz.fun/games/n2048/ | head -1               # 404, on purpose

# 3. Each host asks for what it should.
curl -s https://ellaz.fun/robots.txt | head -5                  # Allow: / + Sitemap:
curl -s https://sigmafier.github.io/ellaz/robots.txt            # Disallow: /
curl -s https://sigmafier.github.io/ellaz/games/2048/ | grep -c noindex   # 1

# 4. A trailing-slash-less URL redirects rather than answering twice.
curl -sI https://ellaz.fun/games/2048 | head -1                 # 301
```

**The last two checks cannot be curled**, and they are the two that matter.

*The service worker.* One with a navigation fallback answers every URL with the
app shell — for returning visitors only. `curl`, incognito and every crawler see
the correct page, so the bug is invisible to all four checks above. Load
`https://ellaz.fun/` in a normal browser, wait for
`navigator.serviceWorker.controller` to be non-null, and only THEN navigate to
`/games/2048/`. You must land on the game's own `<h1>`, not the home grid. Why the
config says `navigateFallback: undefined`:
[`.claude/rules/sw-navigation-fallback-hijacks-real-pages.md`](../.claude/rules/sw-navigation-fallback-hijacks-real-pages.md).

*The game actually mounting.* A page can carry the prose, the schema, the
canonical and the right head tags and still never start the game — and that
failure reads as perfect in every check that only reads HTML. In the same
browser, on `/games/2048/`:

```js
// after ~2s on the page
document.getElementById("game-poster").hasAttribute("hidden")   // true
document.getElementById("game-frame").children.length            // > 0
document.getElementById("wallet-slot").innerText                 // the coins
getComputedStyle(document.body).overflow                         // "visible"
```

That last one is the prose check: `body { overflow: hidden }` is scoped to
`body.app-shell`, and if it ever leaks back onto a content page every word below
the fold becomes unreachable by scroll while a crawler still reads it perfectly.

Both were verified this way against a local production build on 2026-08-04,
with the service worker in control.

## Troubleshooting

| Symptom | Cause to check first |
|---|---|
| Run green, site unchanged | `Upload to Hostinger` was **skipped** (missing secrets), or `server-dir` is wrong |
| Run green, site **blank** | Documents 200, their JS 404. `npm run assert:live` names the missing chunks. Suspect a stateful sync before credentials or paths |
| Runs sit **queued** with zero jobs | Actions is **disabled on the repo**: `gh api repos/Sigmafier/ellaz/actions/permissions`. A *blocked action* fails at "Prepare all required actions"; it does not queue |
| `not allowed in Sigmafier/ellaz because all actions must be...` | Org/repo action allowlist. `gh api -X PUT repos/Sigmafier/ellaz/actions/permissions -f allowed_actions=all -F enabled=true` (needs repo admin) |
| `530 Access denied` | Username — use `u210394724.ellaz` |
| TLS handshake failure | `security: loose` was removed; cert is `*.hstgr.io` |
| Old header on a file you just fixed | Edge cache `HIT`; retry with a cache-buster, then purge |
| Both deploys red | `tsc --noEmit` — `npm run build` type-checks before bundling |
| Stale bundle while eyeballing | Service worker; see `.claude/rules/pwa-stale-bundle-qa.md` |
| GSC "sitemap could not be read" / 403, but the site loads fine for you | CDN bot challenge. `curl` it as Googlebot — a browser cannot see this. See `.claude/rules/a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md` |
| Indexed pages falling with no deploy to explain it | Same — check `Performance → CDN → Manage → Security` before touching any code |

## Rotating the FTP password

hPanel → Files → FTP Accounts → change password, then:

```bash
gh secret set FTP_PASSWORD -R Sigmafier/ellaz
```

Secrets live only in GitHub; nothing credential-shaped belongs in the repo.

## Manual fallback (CI down)

```bash
npm run build
cp deploy/hostinger.htaccess dist/.htaccess
# upload dist/ to public_html via hPanel's File Manager
```

Upload the **whole** `dist/`, never a few files: `index.html` and its hashed
assets must come from one build or they cannot agree, and a mismatch is exactly
the blank page described above.

A hand-upload is how the two hosts drift apart, so treat it as an emergency
measure and push afterwards to resync.

The legacy Firebase target (`firebase.json`, `firebase deploy`) is still in the
repo but is **not** part of any pipeline and does not serve ellaz.fun.
