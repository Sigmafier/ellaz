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
  `<button>`s and the stick is `aria-hidden` — **in an `ageBand: "kids"` game,
  never ship the stick alone**, or the game stops being tap-completable.

  **NARROWED 2026-09-13, by operator ruling, in the change that first broke it.**
  It used to read "never ship the stick alone" of every game. `survivors` now
  puts its steering ON the arena — a stick born where the thumb lands, a
  fixed-corner alternative toggled from the game's own chrome, the pad gone, and
  arrows/WASD still live on desktop. The conflict was surfaced BEFORE the code
  was written rather than discovered after, because a law edited quietly to fit
  the code it was meant to constrain is worse than no law at all.

  Measured at the time of narrowing, so the exemption is not an empty one: three
  games import the pad — `maze` (`ageBand: "kids"`), `snake` and `survivors`
  (both `"all"`). The kids band the rule still binds therefore has a real member,
  and `src/ui/DirectionPad.tsx` is NOT deleted. The remaining question this does
  not answer: `snake` is `"all"` and keeps its pad, which is fine, but nothing
  yet says whether an `"all"` game SHOULD have one - that is a judgement per
  game, not a rule.

  **A CONTROLS SETTING, 2026-09-14, by operator ruling**: *"the joystick should
  be a setting in every game with movement"*. Snake and maze render
  `ControlModePicker` above their controls: **Arrows** (the pad, the DEFAULT),
  **Joystick** (`DirectionPad variant="stick"`, one big stick) or **On the
  board** (`BoardStick` - a stick born under the thumb, no pad). The choice is
  remembered per game by `useControlMode` under the forever key `controlMode`,
  and anything unrecognised in storage reads as Arrows. The kids band is still
  bound: Arrows ships as the default and stays one tap away, so the game is
  tap-completable out of the box. A new steering game adds the picker rather
  than choosing a control for the player.
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
