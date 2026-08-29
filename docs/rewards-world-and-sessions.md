# Rewards, the World, speech, and carrying on where you left off

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit bb8c47b, and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## Rewards, the World, and speech

**The economy.** A game reports WHAT HAPPENED and never says what that is worth.
`ctx.rewards.grant({ reason, tier?, level? })` takes one of three reasons
(`level_complete`, `milestone`, `personal_best`) plus an optional tier
(`easy`/`medium`/`hard`), and `src/sdk/economy.ts` alone decides the payout: 3/5/8
coins by tier, a flat 1 coin for a milestone, and one star for every reason that
is not a milestone. Coins are spent. Stars are a trophy count that is never spent
and never lost, and they also gate the premium shop items (`requiresStars`). Full
rule and traps: [`.claude/rules/rewards-economy-convention.md`](../.claude/rules/rewards-economy-convention.md).

**Add-only by design.** `RewardsPort` has no `spend()`. A game can only ever put
coins in. Spending happens in exactly one place, the World screen, against the
`wallet` singleton, so no game (and no bug in a game) can take a player's coins.
The profile persists at `ellaz:profile:v1` behind `migrateProfile()`, which
coerces anything it is handed (missing key, truncated write, hand-edited junk, a
future shape) into a usable profile and must never throw.

**The win moment.** `winMoment(ctx, {...})` from `@shared` is the canonical win:
it grants and persists FIRST, then plays sound, haptics, confetti and the coin
flight to the wallet chip, then fires analytics. The cosmetic half is wrapped in
try/catch, so a thrown animation can never cost a kid a coin. Confetti defaults
ON; endless-game milestones pass `confetti: false`.

**Scores.** Same shape as the economy, one layer over: a game reports a **value
and a unit** (`points`/`ms`/`moves`) and `src/sdk/economy.ts`'s sibling
`src/sdk/score.ts` decides how that ranks — `points` high, `ms` and `moves` low.
**There is no `direction` parameter and there must never be one**, or a game
could report `ms` as "higher is better" and order its own leaderboard backwards.
The record rides the existing win as `winMoment(ctx, { …, score: { value, unit,
board } })`; `ctx.score` is add-only, with no `clear()`, exactly like
`ctx.rewards`. **22 of the 23 games have one**, and **coloring gets none, ever**
— ranking a child's drawing is the opposite of this platform's premise. That is
the whole roster: every other game keeps a record, so a missing one is a bug
rather than a gap. (evolve carries one without a line of its own — it renders
`n2048`'s component under its own game id, so it gets its own storage namespace
and its own board for free.)

**The unit is also declared, in `meta.ts`, because only the VALUE is persisted.**
`ellaz:sudoku:score:easy` holds a bare `12750`, and nothing reading it back can
tell milliseconds from points — which is the difference between fast winning and
slow winning. So `scoreUnit` lives on the DOM-free meta, the one place the
catalog can read without importing a renderer, and
`score-unit-declared.test.ts` reads each game's own source and requires the two
to agree. A unit copied to the wrong game type-checks, renders, and orders that
board backwards for exactly the games using it, so the pin is the whole point;
it was mutation-proved on sudoku and memory. It follows a borrowed renderer
rather than hardcoding one, so evolve resolves through `n2048` with no special
case.

What each game records is the honest answer to "how well did that go", not one
imposed shape: a **time** where a clock exists (sudoku, minesweeper), **moves**
where the game already counted them (memory), **how far up an endless ladder**
a run got (balloons, bubbles, frog, sequence, shadows, sortsize, vanish, hidden,
finddiff), and for tictactoe the **longest run of wins** against that difficulty's
AI. Two of those deserve their traps written down: finddiff records cumulative
scenes cleared rather than the "Level" it displays, because Level only bumps
after a full pass and would leave most players a permanent record of 1; and
tictactoe's hard AI is unbeatable minimax, so its record may honestly stay empty.
`board` scopes a record to a difficulty wherever the scales differ
(6 pairs vs 10, a 4×4 animal sudoku vs an expert 9×9). The six games that kept
their own `best` before this existed are on the default board **on purpose**, so
their players' records survived; a read-through `legacyKey` shim carries those
old keys, and it has a kill date. Full rule, the board table, and the `ms`-is-a-
duration trap: [`.claude/rules/score-contract-convention.md`](../.claude/rules/score-contract-convention.md).

**The World** (`/world/`) is a room and a character with **11 slots** (wall,
floor, rug, window, light, plant, poster, toy, outfit, hat, pet) holding **82
items** in original inline SVG. Read those two off `CATEGORIES` and the
catalogue rather than off this line. An item the player cannot afford or has
not unlocked answers with a gentle shake and says nothing, because a refusal is
not an error. Every category ships exactly one free `price: 0` default (pinned
by `world/items.test.ts`), so the room is complete before a player has earned
anything. **Item ids are persisted in `profile.owned` forever: never rename
one, never reuse one.**

**A tap PREVIEWS. A button BUYS.** Tapping a shop card used to buy the item on
the spot, which was tolerable at 27 items and wrong at 82: the picture on a
132px card was all a child had to go on, and the only way to see a hat properly
was to own it. A tap now swaps that one slot into the big room above and marks
the card with a dashed ring; a single named button under the room says exactly
what will happen next - **Buy · 30**, **Place**, **✓ Placed**, or the
requirement that is holding it. There is still no confirm dialog: buying places
the thing too, so it is one press and one visible result.

**No disabled buttons, and that is a rule rather than a style.** A locked or
unaffordable item stays pressable and answers with the same gentle wiggle the
cards always gave. `Button`'s `disabled` is reserved for actions that are
genuinely impossible, and "you have not earned this yet" is not one - it would
be the first fail-punishment in the app. The shake lands on the BAR, because
the bar is what was pressed. The bar's height is reserved whether or not it is
showing, or the grid jumps 74px under the finger that just tapped it.

**Three things the expansion could not do naively, all of them payload.**
`items.ts`, `art.tsx` and `Scene.tsx` are pinned to the SHELL - Home draws the
child's real room in its world card - and the first visit had **718 B gz of
headroom**. Measured on two arms of one tree: the 52 new drawings are 6.8 KB gz
and their 52 catalogue ROWS another 2.4 KB. Both now live in one lazy
`world-art` chunk (`artRest.tsx` + `itemsRest.ts`), and the whole change costs
the first visit **+436 B gz**.

The rows are the half that surprises, and the second trap is one further out:
a STATIC import of that chunk from `World.tsx` costs a first visit nothing and
charges every visitor who opens a **game**, because `PageApp` imports `World`
and the shelf lands in `page` - measured 19.3 → 28.5 KB gz on a game page,
**+47%**, to carry pictures of shop items no game will ever draw. So `World`
reads a catalogue that GROWS: `shopItems()` in `roomArt.ts` returns 33 rows
until the chunk lands and 82 after, and the screen re-renders on that one event.
`shop-previews-before-it-buys.test.ts` pins both directions - the shop may not
read the shell half, and it may not import the lazy half statically - because
each fix is the other's regression. Six mutations planted, six killed.

**A missing drawing is a legal state, not an error.** `roomPiece` falls back to
the slot's free default for any art it has not been handed, and `artFor`
resolves an id the shell has never heard of by that id's own prefix - so the
room on the home screen can be briefly INCOMPLETE and is never WRONG. That
leans on `art === id` and `id` starting with `<category>_`, true of all 82 rows
and pinned, so a row that breaks it is a red build rather than a wall that
quietly stops drawing for the one child who bought it.

**Every free default must stay in the SHELL half**, since it is the fallback
everything else falls back TO; in the lazy half it would be a fallback that is
itself missing. Same for every pre-existing row: a returning player has those
equipped already.

**The player's name.** Every player is called something — one adjective plus one
animal, drawn from a pool of 16 × 20 in `src/sdk/names.ts` and shown on the World
screen with a reroll button. **No child ever types a name**, which removes
moderation from this platform entirely: there is nothing to review because there
is nothing anyone can type. The profile stores the two **word ids**, never a
rendered string, so one player has one name in both languages. Hebrew adjectives
agree with their noun and follow it, so every noun declares a gender and every
adjective carries both forms — `זריז נמר` is the wrong order and `לטאה זריז` is
the wrong gender, and an English-shaped pool makes both mistakes at once. **Word
ids are persisted forever: never rename one, never remove one**, exactly like the
shop item ids. Full rule and the rest of the traps:
[`.claude/rules/name-pool-convention.md`](../.claude/rules/name-pool-convention.md).

**Speech** (`ctx.speech`) is Web Speech TTS for Hebrew and English letters and
words. Zero assets, zero network. Voices load ASYNCHRONOUSLY, so subscribe with
`onAvailabilityChange()` rather than reading `available()` once; call `unlock()`
inside a user gesture for iOS; it follows the global mute; and nothing it does
ever throws or rejects. It is ALWAYS supplementary, never the question itself:
see the hard rule at the top of `src/sdk/speech.ts`.

## Carrying on where you left off

**Two layers, deliberately separate, because they have different lifetimes.**

**The level, in all 20 games with a level toggle.** `useRememberedLevel` from
`@shared` returns a `useState`-shaped pair whose setter persists, and it
VALIDATES the stored id against the game's own option list rather than trusting
it — `GameChrome` finds the current level with `findIndex`, so an id no longer in
the list resolves to `-1` and **the toggle disappears**, leaving a game that
plays perfectly with no way to change difficulty. vanish shipped this by hand
first; it now uses the hook, under the same key with the same values.

**The board, in the six games with a position worth returning to** — sudoku,
minesweeper, 2048, blocks, memory, coloring. evolve inherits it through 2048's
renderer under its own game id, so it gets its own namespace free. The reflex and
endless games get level memory only: resuming a reaction test is meaningless.
**Resume is silent** — no dialog, no reading required — and the restart button
already in `GameChrome` is the way to a fresh board.

**`ctx.session` is the third policy port**, after economy and score. A game
reports WHERE IT IS; `src/sdk/session.ts` alone decides whether a stored position
is still usable — version, age, a 64 KB cap and the game's own shape check, all
failing to `undefined`, the same answer as "never played", so a game needs one
code path for both. A wrong answer here does not throw: it renders a plausible
board the rules can no longer explain.

**A snapshot carries more than the board, and both extras are load-bearing.**
Every **latch recording a reward the run already collected** — 2048's `won` and
`bestFired`, blocks' milestone step — because without them leaving the game is a
way to be **paid twice**: reach 2048, walk out, come back, and the next merge
grants the win again, once per resume, forever. And for a timed game, the
**clock** (`useGameTimer({ initialMs })`), or every abandoned board becomes a
personal best nobody earned. `reset()` still goes to zero; a restart is a new run.

**A state only a TIMER can leave must never reach the disk.** Memory's mismatch
sets `lock: true` and the renderer clears it 850 ms later; a snapshot caught in
that window restores with no timer behind it and `flip()` then refuses every
card — a board that looks completely normal and is permanently unplayable.
`settle()` in `memory/logic.ts` runs at SAVE time, not load time, so the disk can
never hold that state.

**Sessions are device-local by construction.** `ellaz:<gameId>:session` cannot
match the anchored `ellaz:<game>:score:<board>` pattern `records.ts` validates,
so a backup code moves coins and records and never a board mid-play.

Full rule, including why the level is stored as an ID and never an index, and why
the obvious verification control is undone by the feature itself:
[`.claude/rules/session-snapshot-convention.md`](../.claude/rules/session-snapshot-convention.md).
