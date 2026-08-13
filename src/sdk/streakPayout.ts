// Where a streak becomes a reward — the one place the schedule meets the price.
//
// Three modules, three jobs, and none of them knows the other two's:
//
//   • `daily.ts`   decides WHEN. It owns the milestone ladder and the on-disk
//                  latch that makes each rung payable exactly once, ever.
//   • `economy.ts` decides HOW MUCH. It prices `reason: "streak"` the same way
//                  it prices a hard level, and a caller cannot ask for more.
//   • `wallet.ts`  decides WHETHER IT STUCK. It banks the coins and the star,
//                  and rolls back if the device refused to keep them.
//
// This file is the composition, and it exists as its own module rather than as
// a line inside either of them because of the import graph: `daily.ts` sits
// below the wallet (it is policy, like `economy.ts` and `score.ts`), and the
// wallet must not reach down into the streak. A module above both can hold the
// arrow in one direction without inverting anything.
//
// WHY NOT INSIDE `winMoment`. That is where it belongs and it is where this
// should move: a win already grants, scores, and reports the day, so a claim
// there would put the coin flight on the same frame as the flame. `winMoment`
// lives in `src/shared/` and is owned by another lane at the time of writing.
// Until then the claim is pulled by the chip that shows the streak, which is
// mounted on every screen a child can be on when a day advances. The latch is
// what makes that safe: pulling from the wrong place, twice, or never, cannot
// pay twice.
import { dailyStreak, type DailyStore } from "./daily";
import { wallet, type Wallet } from "./wallet";
import type { RewardResult } from "./types";

/** What a claim did. `milestone` is 0 when nothing was owed. */
export interface StreakPayout {
  /** The milestone length just rewarded, or 0 for none. */
  milestone: number;
  /** Coins actually banked. 0 whenever `milestone` is 0. */
  coins: number;
  /** Stars actually banked. 0 whenever `milestone` is 0. */
  stars: number;
}

const NOTHING: StreakPayout = { milestone: 0, coins: 0, stars: 0 };

/**
 * Pay the streak whatever it is owed. Idempotent, cheap, and NEVER THROWS.
 *
 * Safe to call on every render, from every screen, on a timer, or not at all:
 * `store.claim()` writes its latch to the disk BEFORE it admits a milestone is
 * owed, so the second caller in the same millisecond is told nothing is due.
 * That is why this function needs no guard of its own and why no caller needs
 * to remember to hold one.
 *
 * The reverse ordering is worth stating because it is the tempting one: paying
 * first and latching after would, on a device whose storage refuses writes,
 * re-pay the same milestone on every reload forever. Latching first costs that
 * device one milestone instead. See `DailyStore.claim`.
 *
 * The arguments are injected for tests, exactly as the store's backend is —
 * production always uses the two singletons.
 */
export function claimStreakReward(
  store: DailyStore = dailyStreak,
  purse: Wallet = wallet,
): StreakPayout {
  try {
    const { milestone } = store.claim();
    if (milestone === 0) return NOTHING;

    const result: RewardResult = purse.grantStreak(milestone);
    // The latch is already down, so a refused wallet write costs this milestone
    // rather than re-arming it. That is the fail-closed half of the ordering
    // above, and it is the same trade the whole app makes: a device that cannot
    // store anything loses rewards, and never mints them.
    return { milestone, coins: result.coins, stars: result.stars };
  } catch {
    // A screen calls this. A screen must never break because a reward could not
    // be worked out — same discipline as every other best-effort path here.
    return NOTHING;
  }
}
