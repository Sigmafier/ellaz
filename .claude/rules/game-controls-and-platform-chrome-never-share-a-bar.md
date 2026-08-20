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
| lives in | the ONE screen header, on all three screens | below it — the utility row, then `GameChrome` |

**Inside the game family there is a second split, and it is about WIDTH rather
than meaning: the BUTTONS go in the utility row, the difficulty and the NUMBERS
go in the game panel.** Both are game controls either way. The panel's row is
350 px inside on a 390 px phone and difficulty plus two stats plus gaps already
spends 344, so every button added to it costs 64 px it does not have — measured
on the built artifact, restart alone wrapped 25 of 33 games onto two lines, and
with restart out but pause still in, blocks was the last one wrapping. With both
out it is 0 of 33.

**The test, and it is one question:** *would this control still make sense on
the World screen or the Boards?* Yes → platform. No → game. Then, for a game
control: *is it a button or a number?* Button → the utility row. Number, or the
difficulty toggle → the panel.

Sound and full screen pass that test — muting is global and the API is the
browser's, so both are platform even though a player reaches for them while
playing. Difficulty and restart fail it: neither means anything with no game
mounted, so neither belongs in the site header, however much room is going
spare there.

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
