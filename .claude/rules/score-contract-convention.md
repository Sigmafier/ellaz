# Scores - Games Report a Value and a Unit, `score.ts` Decides How It Ranks

**Scope**: Every game under `src/games/<id>/` that has a record worth keeping.
**Origin**: 2026-08-03 Wave B - built so ~22 more games cannot each invent their own
ranking, the way six of them had already each invented their own `best`.

## Core Rule

A game reports **what it measured**. It never says which direction wins.

```ts
winMoment(ctx, {
  reason: "level_complete",
  tier: "hard",
  level,
  ms: solvedMs,
  score: { value: solvedMs, unit: "ms", board: level },
});
```

`unit` is one of `points` / `ms` / `moves`, and `src/sdk/score.ts` alone maps it to a
direction: `points` ranks high, `ms` and `moves` rank low. **There is no `direction`
parameter and there must never be one** - it would let a game report `unit: "ms"` with
`direction: "high"` and rank its slowest run first, with nothing but code review between
that and a leaderboard ordered backwards. Same reason `grant()` takes a reason instead of
a coin amount.

The sentence to hold every future game to:

> **A record is a fact about the player. One number, one owner, one rule for ranking it.**

## A game must NOT keep its own best

`ctx.score.best(board)` reads it and `ctx.score.report({...})` writes it. Nothing else.

Six games used to read, compare and write a bare `best` themselves. Reporting to the port
*and* keeping that is the trap, because it is not a crash: it is two records of one number
that drift apart the first time one write succeeds and the other does not, with every test
green and every screen plausible. `src/games/score-is-single-sourced.test.ts` scans the
whole tree for `storage.get("best"` / `storage.set("best"` and fails the build.

**`ctx.score` is add-only in the same way `ctx.rewards` is.** There is no `clear()`. A
record can be beaten; it cannot be taken away.

## Scope the board to the difficulty when the scales differ

`board` defaults to `"default"`. Pass a real one whenever two difficulties produce numbers
that are not comparable, which is most of the time:

| Game | Unit | Board | Why |
|---|---|---|---|
| memory | `moves` | level id | 6 pairs and 10 pairs are different achievements |
| sudoku | `ms` | level | a 4x4 animal board is not an expert 9x9 |
| minesweeper | `ms` | difficulty | nine mines and forty are different games |
| hidden | `points` | difficulty | the round counter resets on a difficulty change |
| bees, echo, math, n2048, reaction, snake | - | `default` | see below |

Those last six are on `default` **deliberately, not by oversight**: their pre-Wave-B `best`
was a single number across difficulties, so a per-difficulty board would have orphaned every
existing player's record. Moving them is a separate, deliberate migration - not a tidy-up.

## `ms` on `winMoment` is a DURATION, not a spare field

`ms` feeds `ctx.analytics.levelComplete(level, ms)`. Memory once passed `ns.moves` there and
finddiff passed `ns.misses`, so a 14-move game would have been logged as a 14-millisecond
one. Both were dormant only because analytics has never actually run in production.

If the game keeps no clock, **omit `ms`**. "Not measured" is honest; a count wearing a
duration's name is not. The count goes in `score`, where it means something.

## Endless games record how far you got

An endless game has no completion, so its record is progress. Report the number the player
is actually climbing - and check that it moves often enough to mean anything. finddiff shows
a "Level" that only bumps after a full pass through every scene, so recording *that* would
leave most players with a permanent record of 1; it records cumulative scenes cleared
instead. hidden's round counter already increments per win, so it records that.

## Returning players keep their records

`createScorePort(storage, { legacyKey: "best" })` in `createContext.ts` reads a pre-Wave-B
`best` through as a fallback. It is read-only - never written, never deleted, never consulted
once a namespaced best exists.

A stored `0` reads as **no record**, not a record of zero: all six initialised to 0 meaning
"none yet", and taking that literally would be harmless noise in a points game and fatal in a
timed one, where a best of 0 ms could never be beaten.

**This shim has a kill date.** Remove it once those six have shipped the port long enough
that no returning player still has an old key.

## When to Apply

- Adding a game with any record worth keeping, or adding one to an existing game.
- Reviewing a game PR: the score rides the existing `winMoment` call, no game passes a
  direction, no game writes its own `best`, and `ms` is a duration or absent.
- Tuning how a score is displayed: edit `formatScore` in `src/sdk/score.ts` and nothing else.

## Related

- [`rewards-economy-convention.md`](rewards-economy-convention.md) - the same shape for
  coins and stars, and the reason `winMoment` banks before it celebrates.
- [`game-difficulty-and-juice-convention.md`](game-difficulty-and-juice-convention.md) -
  side effects fire from the handler, never a `setState` updater. That applies to the score
  report too, since it rides `winMoment`.
