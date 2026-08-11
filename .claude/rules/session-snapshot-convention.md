# Saved Positions — A Game Reports Where It Is, `session.ts` Decides If That Is Still Usable

**Scope**: Every game under `src/games/<id>/` that stores a position, and anything that adds one.
**Origin**: 2026-08-09, "carry on where you left off". Two of the traps below were live in the first working version and neither one crashed.

## Core Rule

A game reports **where it is**. It never decides whether a stored position is safe to load.

```ts
const restored = useMemo(() => ctx.session.load(SESSION), [ctx]);
const resume = restored && restored.level === level && !isSolved(restored.state) ? restored : undefined;
const [state, setState] = useState(() => resume?.state ?? generate(level));

useGameSession(ctx, SESSION, () => ({ level, state, elapsedMs: timer.elapsedMs }), { live: !won });
```

`src/sdk/session.ts` alone owns the version check, the age cap, the byte cap and
the call into the game's own validator, and every one of them fails to
`undefined` — the **same answer as "never played"**, so a game needs one code
path for both. Third of the ports built this way, after `economy.ts` (reasons in,
coins out) and `score.ts` (a unit in, a direction out).

It is a port rather than a `ctx.storage.get("state")` per renderer because of how
this fails. A restored snapshot is the only input to a game that this app did not
generate fresh: a previous build wrote it, a browser may have truncated it, and a
person can hand-edit it. **A wrong answer does not throw — it renders a plausible
board that the game's own rules can no longer explain.**

> **A saved position is a position, not a receipt.** It must carry everything the
> run has already been PAID for, and it must never carry a state that only a
> TIMER could leave.

Those two sentences are the whole rule, and each cost a real bug.

## A snapshot must carry every latch, or leaving the game is a way to be paid twice

`Game2048` stores `won` and `bestFired`. `BlocksGame` stores its milestone step.
None of them are the board. All three are records of **a reward this run has
already collected**, and each one gates a `winMoment` further down.

Drop them and the arithmetic is brutal:

| | |
|---|---|
| Player reaches 2048 | `level_complete` granted, `won = true` |
| They tap home | snapshot written — **without `won`** |
| They come back | board restored, `won` back to `false` |
| Their next merge | `hasWon()` is true again → **the win grants again** |
| Repeat | once per resume, forever |

The same shape pays a `personal_best` on the next merge of every resumed run
above the old record, and a milestone coin on the next clear of every resumed
blocks run. Nothing errors. Nothing looks wrong. The coin count simply climbs for
a player who learned that leaving and returning is worth money.

**So when adding resume to a game, do not ask "what does the board look like".
Ask what this run has already been paid for, and store that too.** Grep the
renderer for every `winMoment` and every `…Ref.current` guarding one.

`over` / `dead` are the deliberate exception: they are not latches, they are the
end of the run, and the run is CLEARED rather than stored (see `live` below).

## A state only a timer can leave must never reach the disk

Memory's `flip()` sets `lock: true` on a mismatch, and the RENDERER clears it 850
ms later with a `setTimeout`. That is fine while the game is on screen and fatal
the moment a position is stored: a snapshot caught inside those 850 ms is
restored with no timer behind it, and `flip()` refuses **every** card while the
lock is held.

The board comes back looking completely normal and is permanently unplayable.

The fix is `settle()` in `memory/logic.ts` — the same board with nothing pending
— and **it runs at SAVE time, not at load time**:

- settling on save means the snapshot can never *hold* an impossible state;
- settling on load leaves the impossible state on disk, one build away from being
  read by something that forgets to settle it.

It belongs in the pure `logic.ts` because it is a game rule, which is also what
makes it testable — the trap is pinned as `expect(flip(stuck, 4).outcome.kind).toBe("ignored")`
before the fix and not-ignored after.

**Look for this in any game where a `setTimeout` in the renderer is the only exit
from a state.** A pending animation, a lockout, a "showing the answer" beat.

## Store the level by ID, never by index

An index means "whichever level is third". Insert a difficulty and every
returning player is silently moved to a different board — and to a different
record, since `ScorePort` boards are scoped by id. `memory` and `coloring` both
resolve an id to an index at render time rather than storing the index.

Same reason `useRememberedLevel` validates the stored id against the game's own
option list instead of trusting it: `GameChrome` finds the current level with
`findIndex`, so an id no longer in the list resolves to `-1` and **the toggle
disappears** — a game that plays perfectly with no way to change difficulty.

## Guard the restore on the level, and clear it when the run ends

Every resuming game re-checks the level the snapshot claims against the level the
mount actually opened on, and discards on disagreement. They cannot disagree in
practice, since both are written together — the guard makes the case where they
somehow do a *discarded snapshot* rather than a 14×14 minesweeper grid rendered
under chrome that says "Easy".

`live: false` CLEARS rather than freezes. A solved sudoku, a dead 2048, a
stacked-out well: restoring any of them shows a child a game with nothing left to
do and no obvious way to understand why. **Coloring is the deliberate exception
and never clears** — a finished drawing is not a solved puzzle, it is the point.

## Sessions are device-local, by construction and not by convention

The key is `ellaz:<gameId>:session`, which **cannot match** the anchored
`ellaz:<game>:score:<board>` pattern `records.ts` validates against. So a
restored cloud document cannot write one and a backup code cannot carry one. A
half-finished sudoku is a fact about THIS tablet in the way a personal best is a
fact about the player. Do not "fix" this by adding sessions to the transfer.

## Verifying a resume: the control must be a fresh browser context

The obvious control — clear `localStorage`, reload, confirm you get a new board —
**is undone by the feature itself.** Navigating away fires `visibilitychange`,
`useGameSession` flushes on pause, and the snapshot is written straight back
between the clear and the reload. Measured here: the control reported "identical
board" and it had nothing to do with whether resume worked.

Use a separate browser context, which is storage the first player never touched.
And note the sibling measurement trap from the same session: in dev, `networkidle`
lands ~13 s AFTER the game has mounted and its clock has been running the whole
time, so every timing assertion reads 13 s on a clock that genuinely started at
zero. Wait for the board, not for the network.

> Same lesson as the deploy gate's cold-load probe: when a check depends on WHEN
> you sample, the control has to produce the OPPOSITE reading, not merely a
> passing one.

## When to Apply

- Adding resume to a game, or adding any new state to a game that already resumes.
- Reviewing one: does the snapshot carry every reward latch? Can any stored state
  only be escaped by a timer? Is the level stored as an id? Does `live` go false
  when the run ends?
- Changing a snapshot's SHAPE — bump `SESSION.version`. Snapshots are discarded
  rather than migrated on purpose: a half-finished board is worth a few minutes
  of play, and migration code for it is a second copy of the game's rules that
  nothing keeps in sync.
- Any report of "my coins went up on their own".

## Related

- [`rewards-economy-convention.md`](rewards-economy-convention.md) — the latches
  this rule tells you to store are the ones that rule tells you to keep. Read
  both before touching a win path.
- [`score-contract-convention.md`](score-contract-convention.md) — the same
  report-what-happened shape, and the source of the per-board scoping that makes
  storing a level INDEX quietly wrong.
- [`destructive-actions-show-both-sides.md`](destructive-actions-show-both-sides.md)
  — the other place a stored blob arrives from outside and is validated rather
  than trusted, for the same reason.
- [`game-difficulty-and-juice-convention.md`](game-difficulty-and-juice-convention.md)
  — side effects fire from the handler, never a `setState` updater.
