# Rewards - Games Report Reasons, `economy.ts` Decides Amounts

**Scope**: Every game under `src/games/<id>/`, and anything that grants coins or stars.
**Origin**: 2026-08-01 foundation layer - one earn table built so ~22 more games cannot each invent their own economics.

## Core Rule

A game reports **what happened**. It never says what that is worth.

```ts
import { winMoment } from "@shared/index";

winMoment(ctx, { reason: "level_complete", tier: "hard", level: "reach-2048", at });
```

`ctx.rewards.grant({ reason, tier?, level? })` accepts three reasons
(`level_complete`, `milestone`, `personal_best`) and an optional tier
(`easy`/`medium`/`hard`). `src/sdk/economy.ts` alone converts that into coins and
stars: `TIER_COINS` = 3/5/8, a milestone is a flat 1 coin, and `starsFor()`
returns one star for everything except a milestone. A missing tier is treated as
`easy`, so a game that forgets to declare difficulty under-pays rather than
over-pays.

The whole economy in one sentence, and the sentence to hold every future game to:

> **A star is for finishing something. Coins are for progress. Losing gives
> nothing, and never takes anything away.**

Two structural guarantees back it up, both in `src/sdk/types.ts` and
`src/sdk/wallet.ts`, and both worth preserving:

- **`RewardsPort` has no `spend()`.** Games can only ADD. Spending lives in
  exactly one place, the World screen, against the `wallet` singleton. No game,
  and no bug in a game, can take a player's coins.
- **A game cannot ask for an amount.** `grant()` reads its payout from
  `economy.ts` and ignores anything the caller might wish for. Tuning the economy
  is a one-file change, never a sweep across 30 call sites.

## The trap: `analytics.levelComplete()` is NOT a win signal

Do not wire rewards to the lifecycle or analytics ports. `src/games/math/MathGame.tsx`
calls `ctx.analytics.levelComplete("addsub10", 0)` on **every correct answer**
(line 86 at the time of writing, with a comment saying exactly this). A reward
listener sitting on that event would mint coins on every tap, forever. Analytics
is a firehose of anonymous counters; rewards are money.

**Rewards flow only through the explicit port**: `winMoment()` -> `ctx.rewards.grant()`.
Nothing else may credit a player. If you find yourself wanting a reward to fall
out of an existing event, that is the signal to add an explicit `grant()` call at
the exact moment you mean, not to listen harder.

## Endless games: drip milestones, star only on a personal best

Snake, 2048 and math have no natural end, so they must not hand out completion
stars. The shape all three use:

- **`milestone`** every N points or N in a row: 1 coin, no star, and pass
  `confetti: false` - `winMoment` defaults confetti ON, so a mid-run ping that
  forgets this flag throws a full-screen celebration every five moves.
- **`personal_best`** when the run beats the stored record: a coin payout by tier
  and one star. Snake fires it at game over, with confetti, so a run that beat the
  record ends on a high note.
- **`SESSION_COIN_CAP = 40`** in `economy.ts` bounds the whole thing. It is a
  budget per game MOUNT (the counter lives in the closure `createRewardsPort()`
  returns), so remounting the game resets it. It is a brake on one long sitting,
  not an anti-cheat measure, and the file says so. `RewardResult.capped` tells the
  caller when the cap swallowed a payout; `winMoment` reads it and skips the coin
  flight rather than animating zero coins.

Stars are never reduced by the cap: the cap throttles currency only.

## `personal_best` must be latched once per run

Without a latch, a first-time player whose record is 0 beats it on literally
every move (1 > 0, then 2 > 1, ...) and mints a reward each time. Both DOM
endless games hold two refs and check the latch before granting:

```ts
// src/games/math/MathGame.tsx and src/games/n2048/Game2048.tsx
const bestRef = useRef(best);         // the record at the START of this run
const bestFiredRef = useRef(false);   // one personal-best moment per run

if (ns > bestRef.current) {
  bestRef.current = ns;
  ctx.storage.set("best", ns);
  setBest(ns);
  if (!bestFiredRef.current) {
    bestFiredRef.current = true;
    winMoment(ctx, { reason: "personal_best", level: `streak-${ns}`, at, confetti: false });
  }
}
```

The latch resets where a new run begins - `chooseLevel()` in math, `resetLevel()`
in 2048. Snake needs no explicit latch because its check runs once, at death.

## `winMoment` fires from the event handler, never from a `setState` updater

React may run an updater twice or defer it, so a grant placed inside
`setState(prev => ...)` can double-credit or misfire the confetti. Call it from
the handler flow, and when the driving value is not in the handler's closure,
hold it in a `useRef` and read that (`streakRef` in `MathGame.tsx`; the comment
above `doMove` in `Game2048.tsx` says the same). Same discipline as every other
side effect, see `game-difficulty-and-juice-convention.md`.

`winMoment` itself is ordered deliberately: it grants and PERSISTS first, then
runs sound, haptics, confetti and the coin flight inside a try/catch, then fires
analytics. A thrown animation can never cost a kid a coin. Do not reorder it.

## When to Apply

- Adding any game, or adding a win/level/streak moment to an existing one.
- Reviewing a game PR: confirm the win path is `winMoment()`, that no reward is
  derived from an analytics or lifecycle event, that endless games use
  `milestone` + a latched `personal_best`, and that no call site passes a coin
  amount.
- Tuning the economy: edit `src/sdk/economy.ts` and nothing else.
- Touching the shop: item ids in `src/portal/world/items.ts` are persisted in
  `profile.owned` forever. Never rename one, never reuse one for a different item.
