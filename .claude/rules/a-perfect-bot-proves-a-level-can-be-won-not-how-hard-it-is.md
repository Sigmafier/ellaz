---
paths: "studio/games/**,studio/toybox/**,src/games/**"
---

# A Perfect Bot Proves a Level Can Be Won, Not How Hard It Is

**Scope**: Every game in this repo whose completability is proven by a scripted
player: `stage-completes`, `battle-completes`, `room-completes`, and any bot a
game under `src/games/` adds later.
**Origin**: 2026-09-13, the Teddy King. A 600 hp boss, built to be "much tougher",
was beaten in eleven seconds by the scripted hero without taking a single hit.

## Core Rule

**A scripted player that acts on the first tick it is allowed to answers one
question: can this level be won? It cannot answer how hard the level is, and a
number it prints must never be read as difficulty. Before calling a level easy or
hard, measure a deliberately sloppy player beside it, report both numbers, and
let the operator's play set the tuning.**

## What it looked like

```
BEFORE - one player measured             AFTER - two players, both reported
the scripted hero, level 9, 180 hp       the scripted hero: King down in 11 s, hero untouched
King 600 -> 0 in 11 s, hero 180 -> 180   a sloppy hero (swings every 20 ticks, never dodges):
                                         hero 180 -> 92 in 45 s, King 600 -> 340
"the boss is too easy, raise its hp"     "a thumb sits between these; play it and rule"
```

The scripted hero swings on the first tick of every recovery window. The likely
reason it was never hit is that each swing lands while the boss is still in its hurt
state from the last one; that is an inference from the numbers, not a frame-by-frame
measurement. Either way, raising the hp would only lengthen a fight the bot still
wins untouched, while a real child's fight would get much longer.

## Why the bot's number is still worth having

Completability is a real property and the bot measures it exactly: if the scripted
player cannot clear a level inside the budget, the level is broken, and no amount
of play would make that a tuning question. Keep the bot. Stop reading its clear
tick or its damage taken as a difficulty reading.

## How to measure the second player

- **Make it worse in ways a thumb is worse**: a fixed swing rhythm instead of
  frame-perfect timing, no dodging, no lane changes. It does not need to be
  realistic, only clearly below the bot.
- **Start it where the level starts**, with the carry the earlier levels really
  hand over (`toybox/harness/record-tape.ts --after` chains them).
- **Report both numbers with the population**: which level, which carry, how many
  ticks, the hero's hp and the boss's hp at the end.
- **Do not tune from the pair.** The pair brackets the answer; the operator's play
  in the hall is the reading.

## When to Apply

- Adding or tuning a boss, a wave, a battle or a room
- Reading any completes test's printed tick or hp as evidence of difficulty
- Writing "too easy" or "too hard" in a plan, a commit or a hand-over
- Choosing a boss's hp, damage or AI numbers

## The tell

A difficulty sentence whose only evidence is a scripted player's clear tick.

## Related

- [`a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md`](a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md)
  - the same shape: a measurement that answers a question one step away from the
  one being asked.
- [`game-difficulty-and-juice-convention.md`](game-difficulty-and-juice-convention.md)
  - what difficulty a game should offer; this rule is about how not to measure it.
- [`a-generator-of-committed-literals-lives-beside-them.md`](a-generator-of-committed-literals-lives-beside-them.md)
  - the boss tape is recorded from the same bot, by a committed script.

---

**Last Updated**: 2026-09-14 (origin)
