# Reach ledger — what was fired, when, and when we judge it

**This is the record. The drafts beside it are proposals.** Every draft describes
its surface as still available, because that is how a draft is written — so the
only thing that can answer *have we already used this* is a row here.

`npm run assert:outreach` reads this file. Every draft in this folder must have a
row, every row's status must match the `**Status**:` line in its draft, and a row
that is `fired` or `spent` must carry both dates. A disagreement fails the gate.

**Write the row before the post goes out, not after.** Written afterwards it is a
memory; written before, it is the thing that stops the same submission going out
twice — and the thing that makes the ninety-day wait a scheduled step rather than
patience. (`reach-doctrine` RCH2.)

## Status vocabulary

| Status | Meaning |
|---|---|
| `draft` | written, not sent. Nobody outside this repository has seen it. |
| `fired` | sent, and the surface can be used again if it is worth it. |
| `spent` | sent, and this surface cannot be re-run. Never fire it again. |
| `dropped` | decided against. The reason is in the notes column, so it is not re-derived next quarter. |

A verdict is due **90 days** after firing, never earlier: new pages get a
freshness boost, then decay, so an earlier reading measures the boost and
reverses a correct strategy (`seo-doctrine` SEO11).

## The ledger

| Surface | Draft | Status | Fired | Verdict due | Notes |
|---|---|---|---|---|---|
| awesome-pwa (list PR) | `dev.md` | fired | 2026-08-12 | 2026-11-10 | **PR [#465](https://github.com/hemanth/awesome-pwa/pull/465), open, mergeable.** Found already open on 2026-08-20 while preparing to open it — the draft said "nothing is opened" for eight days. Entry corrected the same day: it advertised 23 games in Hebrew and English. List batches merges; last batch 2026-08-10, 10 PRs queued |
| awesome-phaser (list PR) | `dev.md` | dropped | — | — | dormant 16 months, every open PR unanswered. Ranked by merge recency, not stars |
| dev.to article | `dev.md` | draft | — | — | operator's to publish or discard |
| Hebrew communities ×3 | `hebrew.md` | draft | — | — | rules must be re-read on the day of posting |
| Reddit ×3 | `reddit.md` | draft | — | — | destinations returned an identical generic shell to an automated fetch; not yet actually read |
| itch.io | `itch.md` | draft | — | — | needs an account and the three standalone bundles |
| Newgrounds | `newgrounds.md` | draft | — | — | same bundles |
| Poki / CrazyGames enquiry | `portals.md` | draft | — | — | approved 2026-08-20: their ads on their domain, our site stays ad-free (RCH1) |
| Israeli tech press | `press.md` | draft | — | — | contacts verified 2026-08-11; re-verify before sending |
| Show HN | `launch.md` | draft | — | — | **one shot.** Fires last, after every lane above is green |
| Product Hunt | `launch.md` | draft | — | — | **one shot.** Same gate |

## What has actually reached the outside world

Nothing from this folder. The two things that HAVE been public the whole time are
the repository's own metadata and the site itself — which is exactly why the
first lane of the backlinks routine is auditing what we already own, and why the
repository description was wrong for weeks while every check of the link passed.
