# A Deploy Ledger That Can Disagree With the Disk Never Self-Heals

**Scope**: The upload step of any deploy in this repo, and any future incremental sync.
**Origin**: 2026-08-08. ellaz.fun served a blank page for roughly an hour while every deploy reported success in 90 seconds.

## Core Rule

**An incremental sync that decides what to transfer by consulting a LEDGER rather
than the destination will, the first time a transfer dies after the ledger is
written, skip forever exactly the files it failed to send. Every subsequent run
reports success and changes nothing. Never deploy through a stateful diff you do
not control, and never let a run go green without asserting the live site is
serving the build you just made.**

The dangerous property is not that a transfer can fail. Transfers fail. It is that
the failure is recorded as a success and then **believed by every future run**, so
the system cannot recover by retrying - which is the one thing everybody tries.

## What it looked like

`SamKirkland/FTP-Deploy-Action` keeps `.ftp-deploy-sync-state.json` on the server
and uploads only the diff against it. A transfer died mid-sync. The ledger had
already been written. From then on:

| | |
|---|---|
| The ledger says | `index.html` present (true), `assets/index-DD5Sx_ZF.js` present (false) |
| The server has | `index.html`, and no such asset |
| Every re-deploy | diffs against the ledger, concludes both are done, transfers neither |
| The run reports | **success**, in 90 seconds |
| A browser gets | 200 on the document, 404 on its JS - **a blank page** |

The ledger was not lying uniformly. It was **right about one file and wrong about
another**, which is why nothing looked corrupt: the served `index.html` hash matched
the ledger exactly, so any check that sampled it agreed.

## Why every check we had reported green

This is the same shape as the bot challenge and the precache glob: correct
everywhere you look, wrong for a population you are not in.

| Check | Result while the site was blank |
|---|---|
| `npm run build`, `build:check`, `assert-pages.mjs` | green - they read `dist/`, which was perfect |
| `assert-crawlable.mjs` | green - it reads the network, but asks for DOCUMENTS |
| The deploy workflow | **success**, twice, after the site was already blank |
| `curl` of `/`, `/games/snake/`, `/world/`, `/boards/` | **200, all of them** |
| A browser | blank screen |

**A document returning 200 whose JS returns 404 is a blank page, and a status-code
sweep over routes cannot see it.** That sweep was run, it reported a healthy site,
and it was wrong. Checking a document proves the document arrived; it says nothing
about the six files that document depends on.

## The fix has three parts, and the second matters most

**1. No ledger.** `lftp mirror` compares against what is ACTUALLY on the server
every time, so a partial transfer is repaired by the next run instead of remembered
as done. The old state file is deleted on every deploy, so reverting the step cannot
quietly re-arm this. (It was also world-readable, publishing the whole file tree.)

**2. Order the passes by who references whom.** Hashed assets go first, HTML and
`sw.js` second, because those two are the only files that NAME the hashes:

- die between the passes → old HTML pointing at assets that are all still present.
  The site is **stale**. Recoverable, and invisible to a child.
- die in the other order → new HTML pointing at chunks that never arrived. The site
  is **blank**.

Nothing is deleted, deliberately - an orphaned old hash costs a few KB and is what
keeps stale HTML working.

**3. `scripts/assert-live.mjs`, in the same job, failing the run.** It asserts the
live HTML references the same hashed assets as the `dist/` just built, AND that every
one is fetchable. **Both halves are load-bearing and neither is sufficient:**

- "every asset 200s" passes on a site that is entirely, consistently stale - the old
  HTML and old assets agree with each other and nothing of this deploy arrived.
- "the HTML matches the build" passes on a site whose chunks never landed.

Only the conjunction distinguishes *the site works* from *my build is live*, and a
deploy gate that cannot tell those apart is not a deploy gate.

## It happened again inside the fix, and the gate caught it

The first version of the replacement used `lftp mirror` for both passes. `mirror`
decides what to send by comparing **size and time** - and an `index.html` differing
from the remote one only in a content hash is **byte-identical in length**. So it
uploaded all the new chunks and skipped all 49 pages, leaving the server with new
assets and old HTML still naming the old ones: the outage's exact signature, from
the opposite direction.

**That is the same defect, wearing a heuristic instead of a JSON file.** Deleting
the ledger was not enough, because the property that mattered was never "is there a
state file" - it was **"can the thing deciding what to send be wrong about what is
already there".** A size comparison can. A timestamp over FTP can.

So the rule is narrower and more useful than "no ledgers":

- **`mirror` is used for `assets/` and nowhere else**, because every name there
  contains a content hash. A changed file is a *new file*, so "does the remote have
  this name" is the entire question and cannot be wrong.
- **Everything else is transferred unconditionally** with `put`. 106 files, ordered
  so the 50 that name hashes go last. A forced transfer cannot be skipped by a
  wrong guess.
- The generator asserts its own output shape (`>= 50` put commands) before lftp
  sees it, because a file walk that silently produces nothing uploads nothing and
  exits 0.

This was found **by the gate, on the very commit that added the gate** - the deploy
went red naming the four stale chunks. Without it the run would have been green, the
site would have been broken in a new way, and the commit message would have claimed
the outage was fixed.

## And a third time, one hop further out

The gate walked HTML to assets, and **that stops exactly one hop short of the
games.** A game chunk is never named in a document - it is named inside the shell
chunk's own dependency map. So `game-bubbles-*.js` and `game-coloring-*.js` were
404 while every page, and every asset any page named, was 200:

| Checked | Result |
|---|---|
| 6 documents | 200 |
| 26 assets those documents name | **all 200** |
| 25 lazy chunks the shell names | **2 were 404** |
| A child tapping bubbles or coloring | the error card |

`assert-live.mjs` was green over it. Same shape as the outage it was written for,
moved one level down: everything you check is 200, and it is broken for the
population you did not check.

**The fix is not to follow the dependency map.** That closes those two hops and
leaves the next one. The gate now asserts **every artifact in `dist/` is
fetchable** - it cannot miss a hop because it does not count hops. Documents are
excluded (the reference walk and `assert-crawlable.mjs` already fetch all 48) and
so are dotfiles, because `.htaccess` returning 200 would be a finding in the
opposite direction.

The cause was the `550 Rename of hidden file` above: lftp's default temp name is a
dotfile, Hostinger refused the rename, and two chunks were dropped from a pass that
otherwise succeeded.

**It was found by driving the live site in a browser** and watching a game fail to
load - not by fetching URLs. Every URL-level check available, including this one,
reported health. That is worth remembering the next time a sweep comes back clean.

## The lesson that was already written down

`verify-the-deploy-target-not-just-the-run.md` has said "verify the artifact, not the
run" since 2026-08-02, and it was read during this incident. It did not help, because
**nothing mechanised it.** A rule that depends on a person remembering to run a
command competes with a green checkmark, and the checkmark wins.

If a rule here is worth writing, ask in the same breath what asserts it.

## When to Apply

- Any change to the upload step, or any proposal to make a deploy "incremental" or
  "faster by only sending what changed"
- A deploy that reports success while the site does not change - suspect the ledger
  before the credentials, the path, or the build
- Any report of a blank page: fetch the document, extract its `assets/` references,
  and fetch **those**. Do not conclude health from the document's status code
- Writing any gate: ask what the check is blind to, and give it a positive control

## Related

- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  - the rule this incident proved needed teeth.
- [`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md)
  - the other "every gate reads `dist/`, none reads what the user receives" outage,
  from the same week.
- [`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
  - correct for one population, broken for another.
- [`pwa-stale-bundle-qa.md`](pwa-stale-bundle-qa.md) - the third way a working site
  looks broken, or a broken one looks working.

## Credit

The ledger mechanism was isolated in parallel by a second session working the same
outage, which fetched the state file off the server and compared its recorded hashes
against what was actually served - proving it honest about `index.html` and wrong
about the asset. Two independent paths to the same mechanism is why it is written
here as fact rather than as the best available theory.
