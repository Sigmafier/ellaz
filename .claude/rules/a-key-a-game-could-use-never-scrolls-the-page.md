# A Key a Game Could Use Never Scrolls the Page While the Game Is On Screen

**Scope**: Every game page, every game's keyboard handling, and any control whose content
changes with the game's state.
**Origin**: 2026-09-14. The operator, on snake: *"the keyboard changes the entire game
screen size which is bad!!!"*. Measured on live ellaz.fun the same hour: all 43 games moved.

## Core Rule

**A game page is a DOCUMENT - the game on its first screen, the article under it - so the
browser scrolls it on ArrowUp/Down, Space, PageUp/Down, Home and End unless something says
not to. That something is the page, once, for every game (`src/portal/keyGuard.ts`), not
each game: a per-game `preventDefault` covered the arrows in the four games that steer and
nothing at all in the other 39. And a key must not RESIZE the game either - a control
whose height changes with the game's state moves the frame, and fitStage rescales the
whole game on a phone.**

## What it measured

```
live ellaz.fun, 2026-09-14         focus on the page              focus on a game button
snake @1536x639                    ArrowDown 40px, Space 559px,   ArrowDown 40px, PageDown
                                   PageDown 559px, End 6225px     559px, End 6225px
2048 / blocks / maze / evolve      arrows held; Space, PageDown   same
                                   still scrolled
the other 38 games                 ArrowDown, Space, PageDown     same
snake @390x844                     first key: frame 861 -> 858px, scale 0.9012 -> 0.9048
```

The button column matters. After a player clicks the difficulty toggle, focus is ON that
button, and that is exactly when a snake player reaches for the arrows.

## The guard, and the three things it must not take

`guardGameKeys(frame)` is armed by `PageApp` on every game page. It calls `preventDefault`
on the scrolling keys, which stops the browser and never the event - every game still gets
every key. It holds nothing:

- **while typing** - an input, a textarea, anything editable, or anything inside a dialog
  (the report sheet must take a space);
- **when Space would press something** - a focused button or link;
- **once the game is out of view** - under half the game (or half the window) on screen,
  and a reader scrolling the article has their keyboard back.

`scripts/repro/repro-keys-do-not-move-the-game.mjs` controls all three from the browser:
PageUp still scrolls with the game out of view, and a space typed into a text field arrives.

## The resize half: one height in every state

Snake's start strip was a bold 17px button (49px) before the first key and a 15px hint
(46px) after it. The fix is a shared `minHeight` equal to the taller state, so the ready
screen - and the phone frame baseline - do not move. Any strip that swaps between an
instruction and a description (see
[`a-control-that-carries-an-imperative-must-be-a-control.md`](a-control-that-carries-an-imperative-must-be-a-control.md))
has two shapes, and both shapes need the same height.

Blocks had the same defect with a random trigger: its next-piece preview was drawn at
12px a cell from the piece's own 2x2, 3x3 or 4x4 matrix, so the game was 483, 495 or
507px tall on a PC depending on which piece came next (and fitStage shrank it at 507).
**The key gate passed the unfixed build**, because seven key presses may never deal a
different-sized piece. Proven instead by dropping 30 pieces and counting distinct heights:
3 before, 1 after. The box is 36px, not 48: the board's `chrome: 159` was measured at 36,
and a 48px box held one height at the shrunk 507px while the board gate went red. A size
that depends on game STATE needs a probe that walks the states, not one that presses keys.

## It cost bytes, so it lives where bytes are cheap

As its own module under `src/portal/`, the guard was swept into the first-visit SHELL by
the catch-all in `vite.config.ts`: +363 B gz. It is pinned to the `page` chunk beside
`selectionDismiss.ts`. Check `assert:payload` whenever a new `src/portal/` file is imported
only by `PageApp` or `GameHost`.

## When to Apply

- A game that handles keys - do not add your own scroll blocking; the page already does
- Any control whose text or shape changes with the game's phase
- A new `src/portal/` module imported only by a game page
- A report of a game that "jumps", "moves" or "changes size" when a key is pressed

## The tell

A game page with content below the game, and a keydown listener that decides what the key
means without anyone deciding what the BROWSER does with it.

## Related

- [`a-gate-that-measures-the-board-cannot-see-the-controls.md`](a-gate-that-measures-the-board-cannot-see-the-controls.md)
  - the same session's other lesson: every layout gate measured an untouched page.
- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) - the other way
  a small module lands on the first visit behind a green build.
- [`a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md`](a-fixed-shell-cannot-chain-a-gesture-to-a-sibling.md)
  - the gesture sibling: what an input does to the page's scroll, decided on purpose.

---

**Last Updated**: 2026-09-14 (origin)
