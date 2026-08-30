# The standalone bundles, and the numbers we tell strangers

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## One game, on a host we cannot watch

`STANDALONE_GAME=sudoku npm run build:standalone` writes `dist-standalone/sudoku/` —
one game, one page, `index.html` at the root, ready to zip for itch.io. It has its
own config (`vite.standalone.config.ts`) and its own entry (`src/standalone.tsx`),
and **neither may ever be folded into the main build**: a branch inside
`vite.config.ts` puts both one typo apart, while a separate file means the site a
child loads cannot regress from this work at all. It never writes `dist/`.

Reusing `bootContentPage` is the tempting move and it is wrong — `PageApp.tsx`
calls `analytics.init()`, `analytics.track()` and `startCloudSync()`
**unconditionally**, and those are static imports, so no `manualChunks` branch and
no `globIgnores` entry can remove them. Only a different entry can. Other games and
`src/sdk/cloud.ts` are stubbed at **resolution**, each stub throwing if reached; a
sudoku bundle went 2.1 MB → 224 KB once they were.

`npm run assert:standalone` is the gate, written before the target and carrying 14
planted controls. It found three defects on the first real bundle, and a browser
found a fourth the gate could not see: a `fonts.googleapis.com` import, which is an
external request from a game — the rule that lets this SDK be listed on a portal at
all. **That fix is scoped to this build**; `src/ui/global.css:5` still fetches the
same font on the live site, and changing that is a payload decision with a budget
attached. Full rule, including the case-sensitivity trap that passes on `/mnt/c` and
404s on their CDN:
[`.claude/rules/a-second-published-artifact-needs-its-own-gate.md`](../.claude/rules/a-second-published-artifact-needs-its-own-gate.md).

**The gate's own stamp message was wrong for a day, and the shape is worth keeping.**
It compared the build stamp in full and printed `.slice(0, 16)` of each side, while
`buildStamp()` marks a dirty tree by appending `-dirty` at character 41 — so the only
thing that differed was the only thing 16 characters could not show. It read
*"stamped 13840666dff557ae but the tree is 13840666dff557ae; rebuild"*: a correct
refusal wearing a self-contradicting sentence, triggered by **build, then edit any
file**. Fixed to print both in full. It matters because a gate that reads as broken
gets bypassed, and a bypassed stamp check is how a stale bundle reaches itch — the
exact outcome the stamp exists to prevent. Two more instruments in this repo failed the
same way in two days, one of them the check verifying this very fix:
[`.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`](../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).

Two things the gate is known to do that are easy to forget: it refuses a **torn** bundle
(`1 html, 0 js` — the shape a killed upload leaves), and the standalone build **requires
a git repository**. Outside one it fails with a message about *webfonts*, because the
commit-stamp step shells out to git and a later step reports the CSS that was never
written. Both deploy workflows always have git, so this is a trap for a source unpack
rather than a live defect.

## The numbers we tell strangers

`docs/outreach/` holds eight drafts meant to leave this repository - Show HN,
Product Hunt, dev.to, three Reddit posts, itch.io, Newgrounds, a Hebrew press
letter, two pull requests into other people's lists. **Nothing is published.**

It is also **the only place here where a number about this site is written by
hand.** The sitemap, `llms.txt` and the emitted home read the roster, so they
cannot be wrong about how many games there are; a draft cannot read anything.
Measured 2026-08-18, six days after they were written: **57 wrong figures**,
two of them wrong when written rather than stale.

**`npm run assert:outreach`** derives the facts and scans every draft; `--fix`
rewrites the numeric drift in one command and `--control` runs six controls. It
is **not in `build:check`, on purpose** - the same placement as
`assert:standalone`, a gate for an artifact published by hand. Three things in
it earn their place, each found by the gate failing rather than by reasoning:
**`minHits` per claim**, so a matcher finding fewer occurrences than the corpus
holds reports BLIND rather than clean; **Hebrew is in the population**, because
`press.md` quotes the counts and an English-only matcher reports the folder
clean; and **`--fix` cannot tell a claim from a history**, so historical
passages are wrapped in `<!-- outreach-facts:off -->` and the count of exempted
regions prints every run.

**One claim flips rather than drifting, and no numeric matcher can see that
class**: "under 90 KB" was true at 88,234 and false at 90,027, while the number
in the sentence - the THRESHOLD - never changed. It is carried as a PREDICATE
in the gate, and the copy says *about 90 KB*.

**And a draft cannot be its own record.** Every file there says "Status:
drafts, nothing is posted", because that is how a draft is written - and it
keeps saying it after somebody posts.
[`docs/outreach/ledger.md`](../docs/outreach/ledger.md) is the record;
`scripts/outreach-ledger.mjs` fails when the two disagree, when a surface has
no row, or when a fired row carries no verdict date.

**Two things no gate here can reach.** There is **no inbound-link data in this
project at all** - `npm run reach:links` prints UNMEASURED and exits 2 until a
Search Console export is dropped in `docs/outreach/exports/`, never `0`,
because zero is a finding and unmeasured is a gap. And the **GitHub repository
description** lives in a vendor panel; `npm run reach:about` compares it against
one DERIVED from the roster and `PAGE_LOCALES`.

Full audit: [`docs/outreach/audit.md`](../docs/outreach/audit.md). Rule:
[`a-hand-authored-number-that-leaves-the-repo.md`](../.claude/rules/a-hand-authored-number-that-leaves-the-repo.md).
The law lives in `/reach-doctrine` and `/reach-playbook`, with `/reach` as the
map over them.

## Publishing one: four traps, none of which any gate here can see

Three bundles went from a gated zip to a public listing on 2026-08-30, and every
one of these cost real time. Full narrative:
[`docs/outreach/itch.md`](outreach/itch.md).

- **Saving is not publishing.** Visibility is its own control and Save does not
  move it. Sudoku sat at 404 for everyone for fifteen minutes while every field
  read back correct.
- **The fields that shape a listing may not exist until the artifact does.**
  itch's embed block appears on the edit page only after a playable file is
  attached, so a project published straight from the creation form goes live in
  the host's default frame. 2048 went out at 640x360 with its board clipped.
- **A file is identified by its content, not by its name.** Two `ellaz-doors`
  folders existed and the one being rebuilt was not the one being opened, so
  Snake's first upload was the previous night's build. Hand over a byte count
  and the entry chunk name beside the path.
- **Verify the listing by what it SERVES.** Vite derives
  `standalone-<hash>.js` from the bytes, so the served `index.html` naming a
  chunk is the build, and a form that is wrong cannot agree with it. Snake took
  four attempts and the form was green on all four.

The last two are proposed as reach-doctrine `RCH14`; the second is
`seo-playbook` step D14.

## The same day, on the second platform, with all four written down

Two Newgrounds listings went out on 2026-08-30 - Snake at
`portal/view/1049495` and 2048 at `portal/view/1049504`. Both are Under
Judgment, which is the normal state for a new submission there and means
votes can remove one. RCH14 was read on both from the served `index.html`
rather than the form: `standalone-tBBZWxFJ.js` and
`standalone-oRz9Jrap.js`, the two chunks handed over.

**And 2048 still went live in the host's default 640x480 with the board
clipped** - trap two above, on the second platform, hours after it was
written. It is fixed: 800x900, touchscreen ticked, republished, verified
on the live iframe at 800x900 with the bundle reporting zero overflow at
that exact size.

The reason it repeated is worth more than the fix. The shaping step sits
between a handover and a publish button, because the upload cannot be
automated - a native file picker cannot be driven - and the button is the
next thing that person sees. A step in that position is skipped whatever
it says, so the answer is to move it or to make the default right:
`option[filewidth_2]` is in the creation form's DOM before any file
exists, and if a pre-upload value persists the trap disappears. Untested,
and written down as a test rather than a fact.
→ [`a-step-between-a-handover-and-the-button-is-skipped.md`](../.claude/rules/a-step-between-a-handover-and-the-button-is-skipped.md)

**A fifth trap, and it decided which platform to use.** Newgrounds was
picked over the alternatives partly because an author's description links
are dofollow - measured across six live pages with a control that fired.
Both of our own listings publish `rel="nofollow"`. Re-measured the same
hour: 36 external author-comment anchors across 16 other submissions,
zero nofollow, including 8 on submissions also under judgment. Judgment,
domain and anchor shape were each ruled out by their own population; the
account, created that day, is what is left, and that is a hypothesis with
a cheap future test rather than a finding.
→ [`a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md`](../.claude/rules/a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md)

Neither changes the bookkeeping: a link we place ourselves is DISCOVERY
under `RCH13` and never entered the backlink verdict.
