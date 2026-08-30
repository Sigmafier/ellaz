# A Thing That Tells the Player to Tap It Must Answer a Tap

**Scope**: Every label, strip, card, banner or badge in this repo whose text asks the
player to do something - "Tap to start", "tap to play again", "הקישו כדי להתחיל", and
their siblings in every locale.
**Origin**: 2026-08-30. Snake's footer strip read **"Tap to start"** in bold on a white
card directly under the board, and two taps on it did nothing. Only the CANVAS answered.
Found by playing the bundle we had just published to itch.io.

## Core Rule

**If the words are an instruction, the thing carrying them is a control. Either it
answers the tap it is asking for, or it stops looking and reading like something that
would. A card with a shadow, a rounded corner, bold centred text and an imperative is a
button in every way a five-year-old can perceive - and this platform's whole premise is
that a five-year-old can perceive it.**

The failure is silent in all four directions. It renders perfectly. The game is
completely playable, because the control that *does* work is right above it. Every test
passes, because no test asks "is this tappable". And nobody who wrote it ever taps it,
because they know where the real control is.

## What was actually there

```
BEFORE                              AFTER
------                              -----
phase: ready                        phase: ready
  [   Tap to start   ]  <div>         [   Tap to start   ]  <button>
  card, shadow, bold, INERT           card, shadow, bold, starts the game

phase: playing                      phase: playing
  [ Buttons, swipe or arrow keys ]    Buttons, swipe or arrow keys
  same card, same bold, INERT         plain dim text. not a button,
                                      because it is not asking

phase: over
  [ Game over - tap to play again ]  a button too. it asks, so it answers.
```

Three phases, two of them instructions, one description - all three rendered
identically, and none of the three was tappable.

## The three parts of the fix, and the second is the one people skip

1. **The asking phases become a real `<button>`.** Not a `div` with `onClick`: a button
   is focusable, keyboard-operable and announced as a control, and a child on assistive
   input is exactly who this platform is for.
2. **The telling phase stops looking like one.** Half a fix is worse than none here - a
   button that is present but does nothing while playing is the same defect wearing the
   opposite face. And it is **not `disabled`**: `disabled` is reserved for the genuinely
   impossible (`CLAUDE.md` § What a child touches). A hint is not a disabled button. It
   is not a button.
3. **The handler is the EXISTING one, never a second copy.** Snake's canvas is its single
   owner of input, so the strip calls `scene.startFromChrome()`, which unlocks audio and
   speech, restarts when the run is over and otherwise starts - the same path a canvas tap
   walks. Two implementations of "start" drift, and the one nobody plays drifts first.

## Sweep the class, and READ the hits

47 game components, 40 with a footer, 8 whose footer contained an imperative. Two of
those eight - `blocks` and `maze` - were **false positives: the word was in their
comments**, not in anything rendered. A grep over source cannot tell a string from the
prose explaining it, so every hit gets opened. Snake was the only real one.

## When to Apply

- Adding or editing any player-facing string containing tap / press / click / touch, or
  their Hebrew, Spanish and French equivalents
- Reviewing a footer, banner, strip or badge that renders a phase-dependent message
- Any component whose text changes between an instruction and a description - that
  component almost certainly needs two shapes, not one
- Playing a build before it ships: tap the thing that tells you to tap

## The tell

A rendered string in the imperative mood, inside an element with no `onClick`, no
`<button>` and no `role`. Or the reverse: one element whose text is sometimes an order
and sometimes a note, styled the same either way.

## Related

- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - the same lesson one layer out, and the reason this was found at all: nothing but
  loading the artifact and using it could have shown either.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the test written for THIS rule joined that family twice before it worked:
  `restartFromChrome` contains `startFromChrome`, so an unanchored substring check let a
  forked-handler mutation survive; and a `not.toContain("disabled")` scan read its own
  explanatory comment as the violation.
- [`game-controls-and-platform-chrome-never-share-a-bar.md`](game-controls-and-platform-chrome-never-share-a-bar.md)
  - which bar a control belongs in, once it is established that it IS one.
