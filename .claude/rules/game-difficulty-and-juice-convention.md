# Game Convention — Difficulty Selector + Juice, Side-Effects in Handlers

**Scope**: Every game under `src/games/<id>/`.

## Core Rule

Each game should offer a **difficulty selector and/or endless levels**, and reward
success with **juice**. Follow the established pattern so every game feels consistent:

- **Difficulty selector**: a row of `Button` from `@ui/components` with
  `variant={active ? "primary" : "ghost"}`, bilingual labels via `ctx.locale`
  (`"he"|"en"`). Selecting a level resets the game to a clean run at that level.
  Kids games add `kids` to the Button for the bigger touch target.
- **Levels/stages**: for content games (find-differences, hidden-object) prefer an
  endless auto-advancing "Level N" `Stat` over a dead end.
- **Juice on win**: call `celebrate()` (full-screen confetti) from `@juice`, plus the
  reusable CSS animations in `src/ui/global.css` (`ellaz-pop`, `ellaz-merge`,
  `ellaz-pulse`, `ellaz-flip`) applied via className. Wrong answers in kids games are
  gentle (shake + retry), never punishing.

## Side-effects fire from the event handler, NOT a `setState` updater

`celebrate()` / `burst()` / `shake()` must be called from the event handler flow,
never inside a `setState(prev => …)` updater (React may run updaters twice or defer
them, so the effect misfires). When the value driving the effect (e.g. a streak
count) isn't in the handler's closure, hold it in a `useRef` and read/increment that.
See `src/games/math/MathGame.tsx` (`streakRef`).

## When to Apply

- Adding a new game, or expanding an existing one with difficulty/levels.
- Reviewing a game PR: confirm the difficulty selector + `celebrate()` on win exist
  and that no confetti/juice call sits inside a state updater.
