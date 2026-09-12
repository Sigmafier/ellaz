---
paths:
  - "studio/toybox/sim/**"
  - "studio/toybox/cells/**"
  - "studio/games/**"
---

# A New Engine Rule Enters Behind a Data Key the Existing Games Lack, and Their Goldens Print Identical

**Scope**: Every change to `studio/toybox/sim/` or `studio/toybox/cells/` made
for the sake of ONE game - a new rule, a new art kind, a new field.
**Origin**: 2026-09-12, the crypt's door. The second game on the engine needed the
camera to CUT between rooms where the fight's scrolls; the rule landed in
`stage.ts` gated on `stage.door`, a block the fight's stage file does not carry,
and `write-golden` printed the fight's two triples unchanged - twice.

## Core Rule

**A game may teach the engine something, but only in a shape the games already on it
cannot see: the rule reads a data key those games' files lack, and the proof that they
cannot see it is their goldens printed whole and identical by `write-golden` in the
same commit. A rule that changes the existing games' behaviour is a retune, and a retune
says which goldens moved and why. The two are never mixed in one commit.**

The engine exists so that the next game is data. Every rule that reaches the sim
ungated is a step back toward one game with a fork in it.

## What it looked like

```
BEFORE (the fight)                AFTER (the crypt, same engine)
followCamera:                     followCamera:
  want = clamp(hero.x - lead,       if (stage.door && wphase === go)
               lo, hi)                camX = hero past lo + door.x ? hi : lo
  camX += gap / divisor            else  (the line above, untouched)

fight/stage-600.golden.json       38c4cb3c / eaa3c2af / 442ceea2   identical
fight/versus-600.golden.json      b231a537 / 3a784cd1 / e8dd20be   identical
crypt/crypt-600.golden.json       d960cba7 / cca09ed7 / 6e98cddd   new
```

The same shape held for the painter: `stone`, `flagstones` and `door` are new
`kind` values; an arena file that names none of them draws exactly as before.

## What to do

- **Put the switch in the data, never in the game's name.** `stage.door`, a
  `kind`, a fighter flag - something a schema can describe and any game can set.
  `boundary.test.ts` already refuses an engine file that imports a game; this rule
  is the same boundary one level up, for behaviour.
- **Run `write-golden` in the task's own gate and paste the old and new triples of
  EVERY game into the commit.** Identical is the claim; the printed lines are the
  evidence. A golden that moved for a game that did not name the key is the leak,
  caught at the commit and not at the next play.
- **Refuse the unreachable at compile.** The door past `view.w - heroPad` fails
  naming the stage, because a rule armed by data can be armed by wrong data.
- **Widen the population pins, never loosen them.** `data.test.ts`,
  `golden-tape.test.ts` and `stage-completes.test.ts` each name the games they walk;
  a new game reds them on purpose. The fix is the new name in the line, so a walk
  that finds one game when there are two can never pass.

## The tell

An `if (game === "crypt")`, a constant in `sim/` that only one game wants, or a
commit touching `sim/` whose message does not mention the goldens at all.

## Related

- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - why the triples are printed whole, never as a prefix.
- [`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`](a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md)
  - the population pins are the same shape, checked in both directions.
- `studio/toybox/README.md` § The rules the gates hold - "any sim change moves a
  golden" is the rule this one sharpens: a change FOR one game must move only that
  game's.

---

**Last Updated**: 2026-09-13 (origin - the crypt's door)
