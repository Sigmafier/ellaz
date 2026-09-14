---
paths: "**/ui/**,**/build/**,**/games/**"
---

# A Control Belongs to the GAME or to the PLATFORM, and the Two Never Share a Bar

**Scope**: Every screen in this app with chrome of its own — the emitted header
on a game, the room and the boards, `GameChrome`, and anything any of them
grows later.
**Origin**: 2026-08-20, the operator, on the mobile header: *"we differ between
controls of game, and platform general."* Extended the same day, from *"fix the
gaps and normalize the header across all screens and games."*

## Core Rule

**Before placing any control, decide which family it is in, and put it with its
family. A bar that mixes the two teaches a player nothing about where to look,
and it is how this app ended up with four ways home and two things called
"Level" eight pixels apart.**

| | **Platform** | **Game** |
|---|---|---|
| means | true on every screen | only meaningful inside this game |
| today | home, wallet, sound, full screen | pause, restart, difficulty, the game's own numbers |
| lives in | home, wallet and sound in the ONE screen header; full screen on the utility row, on all three screens | below it — the utility row, then `GameChrome` |

**Full screen is platform chrome that sits on the utility row, and that is not
a contradiction.** The operator acked that arrangement on 2026-08-21 — it is
what `mockups/mobile-header.html` draws, and what they were looking for while
the header carried it. What the rule protects is that a control is in ONE
place, the same place on every screen, so a player learns it once. Which ROW
that place is was never the load-bearing part. `utilityRow` emits it for the
game, the room and the boards, so the guarantee is intact; the pin in
`screen-header-is-platform-only.test.ts` asserts both halves at once — absent
from all three headers AND present on all three utility rows — because either
assertion alone passes on a build that simply lost the button.

**Inside the game family there is a second split, and it is about WIDTH rather
than meaning: the BUTTONS go in the utility row, the difficulty and the NUMBERS
go in the game panel.** Both are game controls either way. The panel's row is
350 px inside on a 390 px phone and difficulty plus two stats plus gaps already
spends 344, so every button added to it costs 64 px it does not have — measured
on the built artifact, restart alone wrapped 25 of 33 games onto two lines, and
with restart out but pause still in, blocks was the last one wrapping. With both
out it is 0 of 33.

**NARROWED 2026-09-13, by operator ruling, in the change that first needed it.**
A SHOWCASE game has a third place, and it is neither bar: an ENTRANCE SCREEN
drawn over its own arena, holding the title, the difficulty, the action button
and whatever else that game's chrome owns. The operator's words were *"maybe the
buttons instead of being down should be on some kind of load screen or entrance
to the game"*, and they picked it off four arms rendered over the live game.

It does not weaken the law, because it does not put a game control anywhere a
platform control lives. It is the game's own surface, it exists only inside the
game, and it costs both bars nothing. What it buys is the thing the width split
above was rationing in the first place:

```
                   BEFORE (three rows under the arena)   AFTER (entrance)
  arena @1536x639            234px                            359px   +53%
  chrome reserved            183px                             16px
  frame fills its box         87%                               95%
  rows under the arena          3                                 0
  arena @390x844            359px                            359px   unchanged
```

The phone number is the one worth reading twice: it does NOT move, and that is
correct rather than disappointing. A phone board is `min(92vw, ...)` and the vw
term binds, so the chrome term is never consulted there - only the desktop
branch reads it. The phone gains a cleaner screen and loses no board.

**Two things this is NOT.** It is not a loading screen - the taste ledger
already rules out a difficulty picker on a poster before the game exists, and a
spinner in an empty box while the chunk downloads; this is drawn by the game
after it has mounted. And it is not a licence for the other 42: it is selected
by `meta.tier === "showcase"`, the same band the arcade HUD uses, and
`arcade-entrance-covers-the-arena.test.ts` pins the four ways it can regress
without looking broken.

**NARROWED AGAIN 2026-09-14, by operator ruling, in the change that needed it.**
On a PHONE, a GAME page's header and utility row are ONE 52px bar: home, the
game's name, pause, restart, sound, and a "more" button holding language, share,
full screen, tell us and the coins. The operator asked for *"a full height
experience"*, was shown the two rows collapsed with pause and restart kept
beside sound (hall `20260914-021853`), and picked it over keeping both rows.

What survives is the part that was always load-bearing - **a control is in ONE
place, the same place on every game**, and the families stay in order within the
row: platform at the start (home), the game's own buttons, platform at the end
(sound, more). What it costs is stated rather than hidden:

```
                         BEFORE (two rows)     AFTER (one bar)
  chrome above the game       114px                 52px
  Survivors' arena @390x844   359x478               359x756
  Snake @390x844              shrunk 0.88, cut      0.90, nothing cut
  rows that mix families        0                     1 (phone only)
```

Scoped to `body[data-page="game"]` under 720px. The room and the boards keep both
rows, and a PC keeps both rows. The controls are MOVED into the bar by
`src/portal/phoneBar.ts` - the same nodes, never copies - so nothing is wired
twice. Pinned by `phone-bar.test.ts` and `scripts/repro/repro-phone-fills-the-screen.mjs`.

**The test, and it is one question:** *would this control still make sense on
the World screen or the Boards?* Yes → platform. No → game. Then, for a game
control: *is it a button or a number?* Button → the utility row. Number, or the
difficulty toggle → the panel. And for a showcase game: *is there a moment when
nothing is being steered?* If so, that is where its own controls belong.

Sound and full screen pass that test — muting is global and the API is the
browser's, so both are platform even though a player reaches for them while
playing. Difficulty and restart fail it: neither means anything with no game
mounted, so neither belongs in the site header, however much room is going
spare there.

Full screen answering "platform" is what decides it is emitted once, in one
shared function, on every screen. It does not decide which row — that was the
operator's call, and the two questions are worth keeping apart, because
answering the first one settles the thing that actually goes wrong.

**The breadcrumb is neither, and that is why it kept moving.** It is a
navigation aid for the DOCUMENT, so it belongs with the document — under the
stage, above the h1 it introduces. Floating it over the stage as a badge is
what let a 44px row of buttons be parked up there beside it.

## The corollary the operator asked for next: one bar, every screen

**If a control is platform, it is on EVERY screen, in the same place, looking
the same. A platform control that only appears on one screen is not platform
chrome — it is a game control wearing a badge.**

Measured 2026-08-20, before: three screens, three headers, and no two of them
offering the same thing.

| | game | the room | the boards |
|---|---|---|---|
| the bar | 58px, tinted with the game's ground | 55px, transparent, floating | 56px, white document row |
| a way home | back+house pill | drawn inside the SCENE | drawn inside the SCREEN |
| the wallet | in the header | inside the scene | **nowhere** |
| mute | in the header | — | — |
| full screen | on a floating row | — | — |

So "where are my coins" had three answers, one of which was "you cannot see
them here". They are one bar now — `screenChrome` in `src/build/layout.ts`,
tinted per screen from `--g` — and `screen-header-is-platform-only.test.ts`
reduces all three headers to a SHAPE and requires the three to be equal, with
the home page as the positive control that proves the shape can disagree.

## Why the mixed bar is worse than a full one

The failure is not crowding. It is that a mixed bar has **no rule a player can
learn**, so every control has to be found by reading rather than by knowing
where things are. Measured on the 2026-08-20 phone header: the site bar carried
identity, wallet and full screen while the row 12 px below it carried home,
restart, sound and level — split by *which file owns the code*, not by what a
player is reaching for. Home appeared in both, three times over.

## Two corollaries that fall out of it

**One family, one word.** Snake renders a difficulty toggle reading `Level:
Normal` beside a stat reading `Level 1` — the same `ctx.t("level")` string,
twice, on adjacent rows, meaning two different things. The convention that
fixes it already exists and snake is the only game outside it: **ten games call
an endless ladder's position `stage`** (balloons, bubbles, echo, finddiff,
frog, hidden, letters, sequence, shadows, spell), and only snake calls it
`level`. If two controls share a word they must share a meaning.

**A number and its record are one fact.** `Score 0` and `Best 0` in separate
cards spend two thirds of a row saying one thing. They belong in one card, the
record subordinate to the live value — which also frees the third cell for
something a game actually wants to say.

## When to Apply

- Adding any control to the game page header or to `GameChrome`
- Any change that moves a control between the two
- Reviewing a game that renders its own chrome instead of using `GameChrome`
- Any time a bar is "running out of room" — the answer is usually that
  something in it is in the wrong family, not that the bar is too small

## Related

- [`game-difficulty-and-juice-convention.md`](game-difficulty-and-juice-convention.md)
  — the difficulty toggle is `GameChrome`'s, and that is exactly because it is a
  game control.
- [`a-row-that-grows-with-the-catalog-must-wrap.md`](a-row-that-grows-with-the-catalog-must-wrap.md)
  — what happens to a row that keeps accepting controls.
- `src/build/layout.ts` § the SCREEN header · `src/ui/GameChrome.tsx` ·
  `src/build/screen-header-is-platform-only.test.ts` (the gate)

---

**Last Updated**: 2026-08-21 — full screen moved out of the screen header and
onto the utility row, on the operator's explicit YES. It is still platform
chrome and still in one place on all three screens; only the row changed. The
pin moved with it rather than being deleted: 7 mutations planted and all 7
killed, including the two that matter most — the button back in the header, and
the button gone from one screen out of three.
