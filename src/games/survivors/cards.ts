// The level-up cards: upgrades, and - while a slot is free - one new weapon.
//
// Operator ruling 2026-09-14, picked off a mock drawn on the real level-up
// screen: a new weapon arrives as a card beside the upgrades, and it takes a
// slot. With four slots full the cards are upgrades only, exactly as before.
//
// `logic.ts` does not import this file, so importing values from it is one-way.

import { POOL, SLOTS_MAX, holds } from "./arsenal";
import { applyUpgrade, offerUpgrades, type RunState, type UpgradeId, type WeaponId } from "./logic";

export type Card = { kind: "weapon"; id: WeaponId } | { kind: "upgrade"; id: UpgradeId };

/**
 * Three cards. While a slot is free and a weapon remains that the run does not
 * carry, the FIRST card is one such weapon, chosen at random, and the other two
 * are upgrades - so a new weapon is always on offer but never forced, and a
 * player who wants to keep their loadout small simply takes an upgrade.
 *
 * Built on `offerUpgrades`, so everything it promises still holds for the
 * upgrade cards: never a maxed one, never the same one twice, and an empty list
 * when there is nothing left, which the scene reads as "carry on".
 */
export function offerCards(s: RunState, rng: () => number = Math.random): Card[] {
  const unheld = s.slots.length < SLOTS_MAX ? POOL.filter((id) => !holds(s, id)) : [];
  const weapon: Card[] = unheld.length > 0 ? [{ kind: "weapon", id: unheld[Math.floor(rng() * unheld.length)] }] : [];
  const ups = offerUpgrades(s, rng, 3 - weapon.length).map((id): Card => ({ kind: "upgrade", id }));
  return [...weapon, ...ups];
}

/** Take one. A weapon lands in the next free slot, ready to fire on this frame. */
export function applyCard(s: RunState, card: Card): RunState {
  if (card.kind === "upgrade") return applyUpgrade(s, card.id);
  s.choosing = false;
  if (s.slots.length < SLOTS_MAX && !holds(s, card.id)) s.slots.push({ id: card.id, cd: 0 });
  return s;
}
