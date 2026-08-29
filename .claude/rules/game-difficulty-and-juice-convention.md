---
paths: "**/games/**,**/ui/**,**/juice/**,**/shared/**"
---

# Game Convention - Difficulty Selector + Juice, Side-Effects in Handlers

**Scope**: Every game under `src/games/<id>/`.

## Core Rule

Each game should offer a **difficulty selector and/or endless levels**, and reward
success with **juice**. Follow the established pattern so every game feels consistent:

- **Difficulty selector**: render `<DifficultySelector>` from `@ui` - do NOT
  hand-roll another `Button` row. It takes `options` (`{ id, label: { he, en } }[]`),
  `value`, `onChange`, `ctx.locale`, and `kids` for the bigger touch target on kids
  games. It is the extracted copy of the row seven games were each writing out, so
  adopting it shifts nothing visually. Selecting a level resets the game to a clean
  run at that level (and clears any per-run reward latch - see the rewards rule).
- **Levels/stages**: for content games (find-differences, hidden-object) prefer an
  endless auto-advancing "Level N" `Stat` over a dead end.
- **Steering**: render `<DirectionPad>` from `@ui/DirectionPad` — do NOT hand-roll
  another four-arrow grid. It is the CROSS (down below left/right, never beside
  them) plus a draggable joystick in the middle cell, and it exists because snake
  and maze each carried their own byte-identical `dpadBtn` and drifted on cell
  size. Import it by its own path, never through the `@ui` barrel: it lives in the
  `page` chunk, so a re-export would make the shell import from it. Pass `repeatMs`
  only where a direction is a STEP and holding should walk (maze, 260 ms); a game
  that steers once and keeps going (snake) passes nothing. The four arrows are
  `<button>`s and the stick is `aria-hidden` — **never ship the stick alone**, or
  the game stops being tap-completable.
- **Juice on win**: call **`winMoment(ctx, {...})`** from `@shared`. It owns the
  confetti now, along with the reward grant, the sound, the haptic and the coin
  flight to the wallet chip, in that order. **Do not call `celebrate()` directly
  from a game** - there are zero such calls left in `src/games/`, and a
  hand-rolled celebrate block means the win is not being banked. What a win FEELS
  like is deliberately a one-file change.
  Everything else in `@juice` stays available for non-win feedback (`burst`,
  `shake`, `popEl`, `flyTo`), as do the reusable CSS animations in
  `src/ui/global.css` (`ellaz-pop`, `ellaz-merge`, `ellaz-pulse`, `ellaz-flip`)
  applied via className. Wrong answers in kids games are gentle (shake + retry),
  never punishing.

The reward half of the win - which reason to report, why an endless game must not
grant completion stars, and why a personal best has to be latched once per run -
lives in [`rewards-economy-convention.md`](rewards-economy-convention.md).

## Side-effects fire from the event handler, NOT a `setState` updater

`winMoment()` / `celebrate()` / `burst()` / `shake()` must be called from the event
handler flow, never inside a `setState(prev => …)` updater (React may run updaters
twice or defer them, so the effect misfires - and for `winMoment` that means a
double grant, not just a stray animation). When the value driving the effect (e.g.
a streak count) isn't in the handler's closure, hold it in a `useRef` and
read/increment that. See `src/games/math/MathGame.tsx` (`streakRef`) and the
comment above `doMove` in `src/games/n2048/Game2048.tsx`.

## When to Apply

- Adding a new game, or expanding an existing one with difficulty/levels.
- Reviewing a game PR: confirm the level row is `<DifficultySelector>` and the win
  path is `winMoment()`, and that no juice or grant call sits inside a state updater.
