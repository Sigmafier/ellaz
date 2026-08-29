---
paths: "**/games/**,**/ui/**"
---

# A Restart That Does Not Clear the Input Gate Hands Back a Board That Answers Nothing

**Scope**: Every game's `onRestart`, and any control offered as "start again".
**Origin**: 2026-08-26, reported as *"some games now are not restarting when finished or won"*. One game, `onestroke`, and it had shipped that way the same day.

## Core Rule

**Seventeen games refuse a tap while the run is over - `if (won) return`,
`if (solved) return`, `if (lockRef.current) return`. A restart is not "deal a
new board", it is "clear everything the handlers are gated on". Miss the gate
and the board comes back looking perfect, showing a fresh line count, and
answering no finger at all.**

## The measurement

`onRestart={() => apply(clear(live.current))}` rubs the drawn line out on the
same board. It never calls `setWon(false)`. Driven in a real browser, on a
board solved for real:

```
                          BEFORE the fix          AFTER
  squares                 1/23   (line cleared)   1/23
  clock                   11.9s  (the WINNING     1.2s   (a new run)
                                  time, frozen)
  banner                  You win! 🎉             Begin on the marked square
  does a tap do anything  no                      yes
```

Three separate consequences of one missing line: `useGameTimer(ctx, { running:
!won })` stays stopped, all three pointer handlers plus the undo return early,
and `useGameSession(..., { live: !won })` stops saving - so the board is not
even restored on the way back in.

## Why every cheaper check passed

This is the shape that survives review, because nothing about it looks broken:

| what was checked | what it said |
|---|---|
| the restart button exists, is visible, is wired | yes, in all 42 games |
| clicking it throws | no - no page error anywhere |
| the markup changes after the click | **yes** - the line really is rubbed out |
| `logic.test.ts` | 1,665 green; the rules were never wrong |
| the level toggle | works - it routes through `reset()` |

A sweep that asked "does restart do something" got a **yes**. The board changed.
It just changed into a board that cannot be played. So the question a probe has
to ask is not whether the restart CHANGED anything - it is whether the game
**answers a finger afterwards**.

## The two shapes, and why the name cannot tell them apart

A ref read as `if (x.current) return` is one of two opposite things:

- an **input gate** the run sets and clears - `lockRef`, `solvedRef`. Restart
  MUST clear it.
- a **run-once latch** - `mounted`, `started`, `firedRef`. Restart must NOT
  clear it, or `gameplayStart` fires again on every press.

Keying on the name flagged ten correct games. The discriminator is the game's
own code: **a gate is something it sets back to `false` somewhere; a latch never
is.** A flag DERIVED from the board (`const solved = isSolved(state)`) needs no
clearing at all - dealing a new board is what clears it.

## The pin

`src/games/restart-clears-the-input-gate.test.ts` reads every game's source and
asks that one question. Both arms mutation-proven: the state arm by restoring
the original `clear` line, the ref arm by moving `shadows`' `lockRef.current =
false` off the restart path.

**The ref mutation has to MOVE the clear, not delete it** - deleting the only
`x.current = false` drops that game out of the population instead of failing it,
and a control that erases itself reads exactly like a control that passed. That
cost a run, and it is written into the test beside the filter.

`scripts/repro/repro-onestroke-restart-after-win.mjs` is the browser evidence.
It reads the board out of the SESSION SNAPSHOT rather than off the screen -
`size`, `blocked` and `start` are exactly enough to solve the stroke offline
with the game's own adjacency rule, so nothing is inferred from a pixel - and it
**taps** the route rather than dragging it, because a synthetic drag is not
tracked past the first square. Its own inertness assertion lied twice while it
was being written, both times reporting a correct game broken: once by dragging,
once by aiming at the `start` of the board that the restart had just replaced.

## When to Apply

- Adding `onRestart` to a game, or changing what one does
- Any handler that early-returns on a flag - ask what clears it, and whether
  restart reaches that
- Any report of "it does not restart": check whether the board ANSWERS, not
  whether it changed
- Writing a probe for this class: the assertion is a tap that moves something

## Related

- [`game-difficulty-and-juice-convention.md`](game-difficulty-and-juice-convention.md)
  - the win path this is the other end of.
- [`session-snapshot-convention.md`](session-snapshot-convention.md) - a snapshot
  must carry every latch, and must never hold a state only a timer can leave.
  Same family: a flag nobody clears.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the population-erasing mutation belongs to that running table.
- `~/.claude/rules/quality/an-armed-lever-with-no-caller-reads-as-yes.md` - a
  button that is visible and clickable is not a button that works.

---

**Last Updated**: 2026-08-26 (origin)
