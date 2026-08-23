# First-visit payload - the superseded readings

Every reading below was correct on the tree it was measured on and is wrong
about every other tree. They live here rather than in `CLAUDE.md` because the
whole lesson they teach is that **you re-run the gate, you never quote one of
these numbers** - so a stack of them in the file everybody reads was working
against itself, and it cost about 9 KB of always-on context to say so.

**The live number is one command**: `npm run assert:payload`. Read `CEILING` in
`scripts/assert-payload.mjs` for the budget, and note that CI builds on a
different Node than this box, so a local reading is a DELTA instrument and not
an absolute one - [`a-number-belongs-to-the-toolchain-that-ships-it.md`](../.claude/rules/a-number-belongs-to-the-toolchain-that-ships-it.md).

Kept verbatim, newest first, exactly as they were written.

---

(90,096 B gz of 90,500, 404 spare — 2026-08-19, 33 games, 4
page locales, on the tree that merges the pause control with match3's swipe
work. **Read on the MERGED tree, and it is 14 B off the one measured before the
merge** — the pause branch alone read 90,082 / 418, match3 landed on `main` in
between, and neither number describes what actually ships. 14 B is nothing and
that is the point: the two lanes each held a correct figure for a tree that no
longer existed, which is the whole of
[`a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md)
happening again on a day with 404 B of room. Re-run the gate; do not add the
deltas.

The pause control's own share is **66 B gz**, and that figure is two arms from
one tree rather than a subtraction: the same tree without it measured
**90,016**, which is itself 11 B off the 90,027 the reading below records — a
difference of nothing, on a branch whose only other content was this work, and
exactly the run-to-run drift that makes subtracting from a written number the
wrong method. Only two of the six changed places are shell-side: the
`pause`/`play` glyphs in `icons.tsx`, and two strings in each of the two STATIC
dictionaries. `GameChrome` is pinned to `page`, both games are lazy `game-*`
chunks, and the other nine dictionaries are `locale-*`, so none of them reaches
a first visit. The slope gate reads **120.5 B gz per game against its 140
budget**, unmoved — this adds no per-game term.

Supersedes the reading below.)


(90,027 B gz of 90,500, 473 spare — 2026-08-18, 33 games, 4
page locales, after `match3` and `jigsaw` landed together. **The ceiling moved, by 500 B
where both previous raises were 4 KB** (82,000 to 86,000 to 90,000). The two games
measured 90,027 against the old 90,000, 27 B over, and there was nothing in
them to make smaller: the 289 B they cost between them is entirely their
`meta.ts` in the statically-imported roster plus their links in the emitted
home, with the shell chunk checked for leakage and holding only ids, titles,
colours and emoji. Every line of rules and rendering is in a lazy `game-*`
chunk and both card scenes are in `gameArtRest.ts`. The slope gate reads
**122.0 B gz per game against its 140 budget**, so the O(1) property is intact
and it is only the absolute budget that moved. 90,500 rather than a roomier
number on purpose: it buys about three games, and step 3 of
`docs/scaling-the-first-visit.md` is what turns 122 into 40. A comfortable
ceiling would remove the only pressure that gets step 3 done.)

Supersedes the reading below.)

(89,738 B gz, 262 spare — 2026-08-18, 31 games, 4 page
locales, after `bubbleshooter` landed. It cost **134 B gz** against a 89,604
baseline measured on this branch before it, and the slope gate reads
**118.3 B gz per game against a 140 budget**, down from 120.1, because the
game's card art went into `gameArtRest.ts` where a new scene costs the first
visit nothing and its whole 8 KB renderer is a lazy `game-*` chunk - so it
joins the divisor without adding to the delta. **262 B is under two
games' worth of headroom**, so the next game to land will very likely have to do
step 3 of `docs/scaling-the-first-visit.md` rather than find room.

An earlier run of the same gate on the same branch read **89,753 / 247**, 15 B
heavier, and the only change between the two was a fix inside the game's own
LAZY chunk, which cannot reach the shell. So do not read a 15 B move here as
anything: at this ceiling the gate's own run-to-run floor is the same order as
a game's whole cost, which is one more reason the rule below says re-run rather
than subtract. Supersedes the 2026-08-17 reading below.)

(89,595 B gz, 405 spare — 2026-08-17, 30 games, 4 page
locales, after `spell` landed. It cost **134 B gz** — its `meta.ts` in the
statically-imported roster and its `gameArt` scene in the grid, which is the
per-game slope `assert-slope` measures at 120.1 B/game, plus its link in the
emitted home. That figure IS attributable: nothing else in the change is
shipped, since 4 more content pages and a provenance script are build-time
only. **405 B is under four games' worth of headroom**, so the next one to
land should run `assert:payload` FIRST and expect to do step 3 of
`docs/scaling-the-first-visit.md` rather than to find room.

This number was RE-MEASURED after merging with `main`, and the reason is the
one this file keeps writing down: the same build read **89,603 / 397** an
hour earlier on a tree without the D-pad and math-category commits, so the
two lanes each had a correct figure for a tree that no longer existed. The
difference is 8 B and it did not matter this time. It is 8 B of margin at a
ceiling with 405 left, which is exactly when it starts to. Re-run the gate
on the MERGED tree; do not add the deltas. See
[`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`](.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md).
Supersedes the 2026-08-16 reading below, which is kept because it is the
record of a different tree.)

(89,469 B gz, 531 spare — 2026-08-16, 29 games, **4 page
locales**. French moved this by 29 B, which is noise rather than a cost: page
content is build-time only, so a fourth language buys 32 more documents for
nothing a child downloads. Supersedes 89,440 / 560 from earlier the same day, after the SHIPPED/PAGE locale split — +65 B for the two narrowing funnels, which buys removing a 9,120 B wall. Supersedes 89,375 / 625 from earlier the same day, after the
title/meta work below — net +53 B for a per-language title on `/`,
`og:locale:alternate` on every page and the runtime tab title. It was briefly
+278 B: an explanatory comment added to `index.html` cost ~225 B gz on its own,
because **comments in that file ship to every visitor** — the same property that
made `/` score 96 words of pinch-zoom comment over a 29-byte body. Rationale
belongs in `pages.ts`, which is build-time.) (supersedes 89,322 / 678 of 2026-08-14; supersedes
the 89,164 below) (2026-08-13, after the nine voices
were re-picked). That is **tight**, and the tree it was measured on is not the
one the previous line describes: `daily` and `share` are now static in the shell
(15 and 17 occurrences in the shell chunk), and a peer has all eleven locale
dictionaries, `Home.tsx`, `PageApp.tsx` and `gameArt.ts` modified in flight. So
the +2,701 since 86,463 is **not attributable to the sound work** — the voice
data itself moved by a few hundred bytes at most, and `src/lab/previous.ts` was
verified to land in the lab chunk with **zero** references in `index.html` and
zero in the precache manifest.

Whoever lands next should re-run the gate first: 836 B is roughly one more game's
worth of `gameArt` scene, and the honest reading is that this ceiling is now the
binding constraint again rather than a formality. The 84,974 further up is the
correct record of the `manualChunks` change against the tree IT was measured on;
all three are true of different trees, which is the whole point of the rule below.
