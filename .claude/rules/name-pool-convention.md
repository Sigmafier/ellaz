# Names — Picked From a List, Stored as Ids, and Hebrew Has Genders

**Scope**: `src/sdk/names.ts` and anything that shows or stores a player's name.
**Origin**: 2026-08-03 Wave C step 1.

## Core Rule

**No child ever types a name.** A name is one adjective id plus one noun id,
drawn from a fixed pool, and rendered per locale at display time.

This is not a shortcut around building a text field. A free-text name on a kids'
platform is a moderation problem: someone types something, it appears on a
leaderboard, and now this project needs a review queue and a reporting flow. A
fixed list removes all of that — there is nothing to review because there is
nothing a child can type. It is also kinder to the actual user, who is five and
cannot spell.

If a future feature wants "let them personalise it", the answer is **more
words**, not a keyboard.

## Store ids, never a rendered string — EXCEPT in an archive

`profile.name` is `{ adj, noun }`. A stored `"נמר זריז"` would still say
נמר זריז after the child switches the app to English. One player has one name in
two languages, and the language is decided at render time by `renderName()`.

**The exception is a record of something that already happened.** Ids are right
for LIVE state, which must follow the player's current language and survive the
pool being edited. They are wrong for an ARCHIVE, which must not.

A finished hand, a completed game, a receipt: those say who was there at the
time, and that answer must not change afterwards. Store ids in one and the row
re-renders in whatever language is current — so a Hebrew player reading their
own history sees names that were English when they played. Worse, a word id
retired later resolves to `undefined` and the archive loses a participant, in a
record whose entire job is to remember them.

So `HandSummary.names` in `holdem/shared/src/protocol.ts` is deliberately
`Record<number, string>` — rendered at send time — while the live `room` message
beside it carries `names: Record<number, PlayerName>` as ids. Two shapes, one
file, and the comment above the archive one says why, because the natural
instinct on reading it is to "fix" the inconsistency.

The test to apply: **can this row's meaning change after it is written?** If no,
it is an archive and it takes the rendered string.

## There are two implementations of this pool now

`src/sdk/names.ts` (ellaz, he+en, gendered) and `holdem/shared/src/names.ts`
(poker, English only, 16 × 20, one distinct emoji per animal). They are separate
on purpose — poker is a different site with a different word list — and they
share every rule in this file. A change to the invariants belongs in both.

## Hebrew adjectives agree with their noun, and follow it

An English-shaped adjective+noun pool breaks Hebrew twice over: `זריז נמר` is
the wrong **order** and `לטאה זריז` is the wrong **gender**. So:

- every noun declares `gender: "m" | "f"`,
- every adjective carries `he: { m, f }`,
- `renderName` emits `<noun> <adjective[noun.gender]>` in Hebrew and
  `<Adjective> <Noun>` in English.

`names.test.ts` asserts the two Hebrew forms **differ** for every adjective. A
copy-pasted row is the realistic way this breaks, and it breaks silently: half
the pool then reads as wrong-gender Hebrew with every other test still green.

## Never remove or rename a word id

Ids are persisted in `profile.name` forever, exactly like the shop item ids in
`portal/world/items.ts`. Removing one silently un-names every player who had it.
**Words are added.** The ratchet in `names.test.ts` fails on a shrink.

For the same reason `migrateProfile` shape-checks a stored name **without**
checking the words exist: a profile written by a newer build carries words this
one has never heard of, and a stale tab deleting the child's name over that is a
worse bug than briefly rendering a placeholder. Unknown words resolve to
`undefined`, the screen shows `—`, and the reroll button is right there.

## A reroll must always change something

`rerollName` draws from the pool with the current name **removed**, rather than
drawing and retrying until it differs. Retrying is unbounded on a degenerate
rng, so it would hang the button instead of failing it — and at 1-in-320 a
"reroll gave me the same name" bug would never show up in manual testing.

## Collisions are fine and must stay fine

Two children can both be Swift Tiger. The name is what a player is **called**;
identity is the anonymous uid. Appending a discriminator number would buy
uniqueness nobody asked for and make the name read like a username, which is the
opposite of the point.

## Names are lazy

`wallet.ensureName()` is called by the first screen that shows a name, not at
app boot. A child who only plays games needs no name, and naming them at boot
writes to storage on a first visit for nothing.

A refused write is **not** rolled back the way a purchase is — `ensureName`
still returns the picked name. A name is not a balance: showing a child a name
that broken storage will forget costs them nothing, while showing them nothing
costs them the screen.

## Related

- [`rewards-economy-convention.md`](rewards-economy-convention.md) and
  [`score-contract-convention.md`](score-contract-convention.md) — the same
  shape, one file owning a decision no caller may override.
- The shop item ids in `src/portal/world/items.ts` carry the identical
  never-rename-an-id rule.
