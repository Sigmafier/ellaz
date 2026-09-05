# Places — where the operator could post about the site, before anyone drafts a word

**Status**: draft (a measurement, not a sent surface — see its one ledger row)

**This is neither a draft nor a decision.** [`places-posts.md`](places-posts.md) is
the draft, for the survivors only. [`ledger.md`](ledger.md) says what was actually
sent. This says which destinations are even worth a draft — read with
`node scripts/reach/places.mjs`.

**The operator posts. Claude drafts.** Nothing here is an account, a login, or a
click on a "submit" button — every surviving row still needs a person, in every
case where the door needs one.

## The four facts, every candidate

1. **Rules** — does the destination's own rules/terms/guidelines page carry an
   advertising or self-promotion clause, quoted rather than summarised.
2. **Freshness** — the SECTION's own newest date, not the platform's homepage.
3. **Rel** — dofollow/nofollow on the section's real outbound anchors.
4. **Door** — what account posting there needs: `form` / `account` / `email` /
   `channel` (post-only, video) / `login-wall` (cannot be read logged out) / `none`.

The script's `suggested` verdict flags a negation word within 60 characters of an
advertising/spam mention and calls that `dropped`. **It is a suggestion, not a
verdict** — it cannot tell "self-promotion is forbidden" from "post your game in
the Show-and-Tell thread, that is what it is for, just don't spam it" apart, and
Armor Games' own help page says something close to the second inside a sentence
that also contains the word "spam". Every row below states the actual call and
the actual reason, which is sometimes the suggestion and sometimes not.

## `unchecked` is not `dropped`

Measured 2026-09-02: every one of the five target subreddits now redirects
`old.reddit.com/r/<sub>/about/rules` to a login page — a change from what this
repo's own `prospects.mjs` docstring says about `old.reddit.com` rendering
logged out, which is exactly `reach-doctrine` (a machine-level skill at
`~/.claude/skills/reach-doctrine`, not a file in this repo) RCH5's point: read the destination on the day, never from a note. Facebook
groups and most Telegram/forum searches for "Israeli parents" and "Israeli
homeschooling" surfaced no real, individually-verifiable, currently-postable
destination from this environment — not a login wall in every case, sometimes
simply nothing a script (or a search) could confirm exists without a person
inside the platform. Both are recorded `unchecked`, never `dropped` — a
destination nobody could read is not a destination that said no.

## Candidates already covered elsewhere — not duplicated here

Show HN and Product Hunt already carry ledger rows via `launch.md` (one-shot,
fires last per `reach-doctrine` RCH2/RCH7). Reddit as a category already has a
`reddit.md` draft and a ledger row; the five specific subreddits below are a
narrower, freshly-measured probe of the same platform, not a second copy of
that row.

<!-- places:rows -->

| Name | Section URL | Rules URL | Door | Note |
|---|---|---|---|---|
| Hebrew Facebook groups — parents/teachers | - | - | login-wall | No specific real group URL could be verified from this environment without a logged-in search; Facebook's own pages 302 to a login wall for group content. The operator's own search inside Facebook is the only way to find a real one — see `places-posts.md` note. |
| Hebrew Telegram channels — parents/teachers | - | - | login-wall | Search surfaced only one-way broadcast news channels (the Ministry of Education's own, a teacher-advocacy channel) — not a two-way community a post could land in. No real, postable channel handle could be confirmed. |
| Israeli parenting/family forum (kipa.co.il) | https://www.kipa.co.il/community/41/ | https://www.kipa.co.il/תנאי-שימוש/ | account | Closest real destination found for "Israeli homeschooling forums" — a general parenting/family forum rather than homeschooling-specific; no distinct homeschooling-specific Israeli forum with its own rules surfaced in search. |
| Geektime (Hebrew tech) | https://www.geektime.co.il/contact/ | https://www.geektime.co.il/terms-of-use/ | form | Israel's largest tech-news site — an editorial pitch/contact page, not a community board. |
| LinkedIn | - | https://www.linkedin.com/legal/professional-community-policies | account | The operator's own profile. No "section" to measure — a personal post has no freshness or `rel` of its own. |
| GameJolt | https://gamejolt.com/about | https://gamejolt.com/community-guidelines | account | Developer game-hosting portal, upload requires an account. |
| itch.io community boards | https://itch.io/community | https://itch.io/docs/creators/quality-guidelines | account | The community index page — checking whether it still lists live boards to post in. |
| Armor Games | https://armorgames.com/community/thread/6089508/how-to-upload-games | https://armorgames.com/page/help/ | email | Door is a real, named one: email tasselfoot@armorgames.com, per the community's own pinned answer to "how do you submit a game to armorgames?". |
| Y8 (developer portal + forum) | https://forum.y8.com/t/how-to-upload-html5-games/26969 | https://developer.y8.com/ | account | Y8's own docs: "The Y8 SDK supports advertisements, cloud saves, leaderboards..." — full portal integration, not a text post. |
| Lagged | https://lagged.dev/signup | https://lagged.com/faq | account | `lagged.dev` developer dashboard — invite code by email, a full onboarding, not a lightweight community post. |
| "Made with Phaser" showcase / community | https://phaser.io/community | https://phaser.io/community | account | Phaser's own community hub — checking for a rules clause and how current it reads. |
| r/WebGames | https://old.reddit.com/r/WebGames/ | https://old.reddit.com/r/WebGames/about/rules | login-wall | Measured 2026-09-02: `old.reddit.com` now redirects every URL to `/login/` from this environment. |
| r/playmygame | https://old.reddit.com/r/playmygame/ | https://old.reddit.com/r/playmygame/about/rules | login-wall | Same measured login wall. |
| r/kidsgames | https://old.reddit.com/r/kidsgames/ | https://old.reddit.com/r/kidsgames/about/rules | login-wall | Same measured login wall. |
| r/Parenting | https://old.reddit.com/r/Parenting/ | https://old.reddit.com/r/Parenting/about/rules | login-wall | Same measured login wall. |
| r/phaser | https://old.reddit.com/r/phaser/ | https://old.reddit.com/r/phaser/about/rules | login-wall | Same measured login wall. |
| Quora | https://www.quora.com/topic/Web-Games | https://www.quora.com/about/tos | account | Cloudflare challenge ("Just a moment...") answers every request from this environment. |
| Pinterest | https://www.pinterest.com/search/pins/?q=kids%20games | https://www.pinterest.com/policy/community-guidelines/ | account | Client-rendered — the fetched body carries a handful of chrome words and no real prose. |
| Teachers Pay Teachers (free listings) | https://www.teacherspayteachers.com/Browse/Price-Range/Free | https://www.teacherspayteachers.com/Terms-of-Service | account | Cloudflare challenge answers every request from this environment. |
| Teacher Facebook groups | - | - | login-wall | Same measured absence as the Hebrew Facebook row — no real group URL confirmable from this environment. |
| dev.to | https://dev.to/t/webdev | https://dev.to/code-of-conduct | account | Their own editor docs (`dev.to/p/editor_guide`) document a `canonical_url` front-matter field — a cross-post is explicitly supported, not merely tolerated. |
| Hashnode | https://hashnode.com/n/game-development | https://hashnode.com/terms | account | A game-development tag/community exists on the platform. |
| Mastodon (gamedev.place) | https://mastodon.gamedev.place/about | https://mastodon.gamedev.place/about | account | A gamedev-focused Mastodon instance; the `/about` page reads thin from this environment. |
| Bluesky | - | https://bsky.social/about/support/community-guidelines | account | No public, unauthenticated feed/search surface to fetch as a "section" from this environment — a post is a single item, not a page with its own freshness. |
| Indie Hackers | https://www.indiehackers.com/post/any-requirements-for-posting-a108d65954 | https://www.indiehackers.com/post/any-requirements-for-posting-a108d65954 | account | A real, current community thread about posting requirements — used as both rules and section, since it IS the rules discussion. |
| YouTube | - | https://www.youtube.com/howyoutubeworks/policies/community-guidelines/ | channel | Video, nofollow, reach-only — RCH13: a channel/profile we run is discovery, never authority. |
| Instagram | - | https://help.instagram.com/477434105621119 | channel | Video, nofollow, reach-only, same as YouTube. |
| TikTok | - | https://www.tiktok.com/community-guidelines | channel | Video, nofollow, reach-only, same as YouTube. |

<!-- /places:rows -->

## The suggested verdict, read and overridden by hand

The script's `suggested` field (in `places-checked.json`) is a starting point,
never the final call — same relationship `prospects.mjs`'s `verdict()` has to
the hand-written notes in `prospects.md`. Five of the nine survivors below
disagree with what the script printed, each for a fact read from the actual
quote rather than from the presence of an ad-related word.

**So the script and this file print DIFFERENT counts, on purpose.** A run today says
`6 TAKE, 7 dropped, 15 unchecked` and the table below lists **9 survivors**: the
difference is five rows whose clause was read and turned out not to forbid us. Neither
number is wrong and neither replaces the other - the script's is what a matcher can
tell from a word, this file's is what a person got from the sentence. If they ever
agree exactly, suspect the reading rather than the luck.

### Survivors (9) — a post is drafted in `places-posts.md`

| Destination | Script said | Actual call and why |
|---|---|---|
| dev.to | TAKE | **TAKE**, confirmed. `canonical_url` is documented as a supported field, not merely tolerated. |
| Y8 (developer portal + forum) | TAKE | **TAKE**, confirmed, with a caveat: the SDK requirement is real and unresolved, so the drafted post is a QUESTION about a no-SDK submission, not an announcement. |
| "Made with Phaser" community | TAKE | **TAKE**, confirmed — no rules clause found at all, and a Phaser-built showcase is the page's stated purpose. |
| YouTube | TAKE | **TAKE**, confirmed — `channel`, reach-only, never counted toward the 2026-11-27 backlink verdict (RCH13). No channel exists yet; the text is ready, the video is not. |
| LinkedIn | dropped | **Overridden to TAKE.** The matched clause forbids undisclosed *political* advertising and paid endorsements — irrelevant to a personal post about a hobby project, from the operator's own profile. |
| Bluesky | dropped | **Overridden to TAKE.** The matched clause forbids advertising that *targets minors* — not an adult account sharing their own project. Kept to Bluesky's real ~300-character post limit. |
| Hashnode | dropped | **Overridden to TAKE.** The matched clause is the platform's standard anti-spam/minimum-age boilerplate, present on every Hashnode account — not a ban on writing about your own project, which is the platform's purpose. |
| Armor Games | dropped | **Overridden to TAKE**, with the door corrected: the matched clause is general forum courtesy ("not... spam and hatred"), not a submission ban. The real door, read off the community's own pinned answer, is an EMAIL to `tasselfoot@armorgames.com` — drafted as an email, not a forum post. |
| Indie Hackers | dropped | **Overridden to TAKE, conditionally.** The matched text is another USER's forum comment, not platform policy — reading the thread itself: posting access is gated on an established, "authentically contributing" account, not on the content. Pre-drafted for whenever that gate clears; not postable today. |

### Dropped (4) — real fact, read past the first match where the script's first match was not the relevant one

| Destination | Real reason |
|---|---|
| Geektime | Confirmed. `geektime.co.il/terms-of-use` states, in its own words, that the site's user agreement "ואוסר על שימוש באתר למטרות פרסומיות" — forbids use of the site for advertising purposes. |
| Israeli parenting/family forum (kipa.co.il) | **The script's matcher found a different, non-forbidding mention first** (an informational-content disclaimer). Reading further down the same document surfaces the real clause: *"תוכן פרסומי. תוכן המשתמשים אינו פרסומי, מקדם עסקים בתשלום או נועד להוביל את יתר המשתמשים לביצוע רכישות של מוצר או שירות. ספאם. תוכן המשתמשים אינו ספאם..."* — user content may not be advertising, paid business promotion, or aimed at leading other users to a purchase. Dropped on that clause, hand-read; the script's printed quote for this row is the wrong one. |
| itch.io community boards | The script matched a clause from itch's QUALITY GUIDELINES (about ads *inside a submitted game*, not about forum posting) — a false trigger. The real reason is measured separately: the community index at `itch.io/community` returned **zero external anchors** — it is nav chrome for the main site, not a board or thread listing. There is nothing to post in. |
| Lagged | The script's matched "spam" mention was about an email-verification spam FOLDER, not a rule — a false trigger either way. The real reason: no reachable public door was found. `lagged.com/contact` answers a Cloudflare challenge from this environment, and the developer dashboard (`lagged.dev/signup`) asks for an invite code obtained by email, with no publicly listed address beyond the blocked contact page. |

### Unchecked (15) — never sent, never a decision either way

Hebrew Facebook groups, Hebrew Telegram channels, Teacher Facebook groups (no
real, individually-verifiable destination found from this environment) ·
GameJolt, Pinterest, Mastodon (gamedev.place) (client-rendered shells here —
real destinations, unreadable from this environment) · r/WebGames,
r/playmygame, r/kidsgames, r/Parenting, r/phaser (measured login wall,
2026-09-02) · Quora, Teachers Pay Teachers (Cloudflare challenge) · Instagram,
TikTok (rules page unreadable — 400 and a JS shell respectively). None of these
are dropped; a destination nobody could read said nothing at all.

## What a `TAKE` does not tell you

Same limit as `prospects.md`'s: it says the destination did not, on the day it
was read, forbid this kind of post. It does not say a moderator will welcome it,
that our games fit the audience, or that a post is due. Everything after that is
a person's call — read the destination's rules again on the day of posting
(RCH3), write one post per destination with no shared sentences, and put the
ledger row in before it goes.
