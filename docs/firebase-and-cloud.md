# Firebase, and the cloud backup that talks to it over plain HTTP

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## Firebase — the project is real now, and it must stay free

`.firebaserc` has named `ellaz-games` since long before the project existed, so
that `firebase deploy` line above would simply have failed. The project was
created for real on 2026-08-03 (number `93565492047`): Firebase added, a web app,
Firestore Native in **me-west1 (Tel Aviv)**, and Anonymous sign-in enabled. It
backs the players/boards work, not hosting - the live site stays on Hostinger.

**It has NO billing account, and that is the whole cost guarantee. Never link
one.** A GCP project with no billing account has no payment path at all: every
service either runs inside its free quota or returns an error. It cannot produce
a bill, so no budget alert is needed and none can be set.

The one way to break that is to accept an **"Upgrade to Blaze"** prompt, which
Firebase offers whenever you touch Cloud Storage, Cloud Functions, or extensions.
**Decline it, every time.** Nothing this platform needs requires Blaze:

- **Anonymous auth is free** and has no paid tier here. Note the trap - the
  *console* toggle is free Firebase Auth, while the `identityPlatform:initializeAuth`
  **API** is the paid Identity Platform product and answers `BILLING_NOT_ENABLED`.
  That error means "use the console", never "enable billing".
- **Phone auth bills per SMS even at tiny volume.** It is off. Leave it off - we
  ask a child for nothing, so there is no reason to turn it on.
- **Cloud Storage is not provisioned** and must not be. Original SVG ships in the
  bundle; the World needs no uploads.

**Cloud backup talks to it over plain HTTP — there is no `firebase` dependency
and there must not be one.** The SDK is ~150-200 KB gz, close to three times the
whole first visit, to do three things that are ordinary REST calls: anonymous
sign-in, read one document, write one document. `src/sdk/cloud.ts` is the client
and it lives in a lazy `cloud-*` chunk. **Rules are released through the Firebase
Rules API, not by this repo's CI**, so a `firestore.rules` edit that was never
released is invisible from the source tree — run `npm run probe:cloud` after any
rules change. It drives the live project with a positive control on every
negative, which is how the original "no rules release exists at all" was found.
Cloud backup is a **backup and a transfer, not live sync**; making it live needs
per-device counters on the profile first.

**A transfer carries two things, because progress lives in two places.** The
profile (coins, stars, the room) is one key; every personal best is a separate
key per game per board, written by each game's own `SaveStore`. The first version
carried only the profile, so it restored a room with none of the records that
filled it and said nothing - `src/sdk/records.ts` is the missing half. An incoming
document may **never name its own storage keys**: every key is matched against an
anchored `ellaz:<game>:score:<board>` pattern before it reaches the disk, because
otherwise a crafted document could write `ellaz:cloud:v1` (this device's identity)
or `ellaz:profile:v1`. Adoption **unions** rather than replaces - `ctx.score` has
no `clear()` and a transfer must not become one - and it cannot merge by taking
the better of two values, because only the number is persisted and not the unit.

**Restoring is the only action in this app that destroys progress**, so it carries
two guarantees that no other screen needs and that a future destructive feature
must inherit: the confirm shows a NUMBER for what is lost beside what is gained
(prose describes a risk, a number lets someone notice it is the wrong tablet), and
`adoptRestored()` keeps the replaced profile at `ellaz:profile:undo:v1` so
`undoRestore()` works **after a reload** — the realistic moment anyone notices is a
child opening the app hours later. Its sibling: the backup code is generated
locally, so it exists whether or not anything reached the cloud. It is shown dimmed
and labelled unsaved until an upload confirms, never as a promise the network has
not made. Both rules, and the `void someAsyncSave()` tell that hides the second one:
[`.claude/rules/destructive-actions-show-both-sides.md`](../.claude/rules/destructive-actions-show-both-sides.md).

Firestore's free daily quota is the real design constraint, and running out is
fail-closed - reads are refused until it resets, which costs nothing and shows a
child a stale board rather than a charge. **That makes write VOLUME a correctness
question, not a tuning one**: exhausting the daily allowance stops backups for
every player at once. Three things hold it down, and all three are load-bearing -
the sync debounce is 30s (not 5s, which cost up to 720 pushes an hour of play and
is only safe to lengthen because `visibilitychange` flushes, which is how phone
sessions actually end); the `codes/<code>` index is written **once per page load**
rather than once per push, latched in memory so a fresh load re-verifies it and
quietly repairs a lost index; and a push whose profile is byte-identical to the
last successful one is skipped. The skip compares the profile **without
`updatedAt`** - that stamp moves on every wallet mutation, so comparing the whole
serialised record would never match twice and the check would be dead code that
always passed. Together: ~1,440 writes/hour worst case down to ~121. Confirm the current numbers at
<https://firebase.google.com/pricing> before designing near the edge, and assume a
naive "top 100" board read costs 100 reads. Prefer `count()` aggregations and
cache what you can, which is also why the board design is percentile-first.

---

<!-- CLAUDE.md's original `## Deploy` section, kept verbatim. CLAUDE.md now carries a
     re-authored, longer version of the same runbook; this is the pre-split text. -->

## Deploy

**Normal path: push to `main`.** Both hosts build and publish themselves — see
the Deploy table under Architecture. Nothing needs to be built or uploaded by
hand, and a hand-uploaded `dist/` is how the two hosts drift apart.

Manual escape hatches, for when CI is down:

```bash
npm run build && firebase deploy    # legacy Firebase target (firebase.json)
# Hostinger by hand: npm run build, cp deploy/hostinger.htaccess dist/.htaccess,
# then upload dist/ to public_html via hPanel's File Manager.
```
