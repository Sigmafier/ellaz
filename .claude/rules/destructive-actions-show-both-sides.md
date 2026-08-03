# A Destructive Action Must Show What Is LOST, Not Only What Is Gained — And Be Undoable

**Scope**: Any action in Ellaz that replaces, overwrites, or clears a child's saved progress.
**Origin**: 2026-08-03, hardening cloud restore the day after it shipped.

## Core Rule

**A confirm screen that names only what is ARRIVING is not a confirm screen. Show both
sides, in the same units, before the button. Then keep what you replaced, on disk, so the
action can be taken back.**

Restore was shipped behind a three-step flow — look up the code, see what is in it,
confirm — and that reads as careful. It named the incoming coins, stars and items in bold.
It never once named the coins, stars and items about to be destroyed. The one quantity a
parent could actually lose was the one quantity the screen did not show, and the sentence
covering it was prose ("restoring replaces what is on this device now") rather than a
number.

Prose describes the risk. A number lets someone notice it is the wrong tablet.

## Why in-memory undo is not undo

The realistic moment anyone discovers a wrong restore is **not** the moment they tap the
button. It is a child opening the app hours later and finding their room empty. An undo
held in a React state variable is gone by then; an undo held in `localStorage` is not.

So `adoptRestored()` writes the replaced profile to `ellaz:profile:undo:v1` before
overwriting, and `undoRestore()` puts it back. It survives a reload, which is the entire
point.

Three properties that are easy to get wrong:

- **A failed undo-write must not block the restore.** The player asked for the restore. If
  the device refuses the extra copy, the restore still happens and `canUndoRestore()`
  returns false — a screen must not offer a button that does nothing.
- **One step, not a stack.** A second restore overwrites the copy. Undo always returns to
  the state immediately before the most recent restore, which is the state the person is
  thinking of. A deeper history is a promise this cannot keep across a cleared browser.
- **Spent once.** Clear the copy when it is used, or a second tap moves the player back
  from a state they had already returned to.

Nothing may ever adopt the undo copy automatically. It is written by a restore, read only
when someone asks, and cleared the moment it is used.

## The sibling rule: never present a promise the network has not made

The same card generated a backup **code** locally and displayed it the instant it existed,
discarding the result of the upload that was supposed to put a document behind it. The code
looked identical whether the save had landed, silently failed, or never been attempted —
and a code with nothing behind it restores nothing.

**Anything a player is told to write down, or rely on later, must reflect a confirmed
result, not a locally-generated value.** The card now shows the code dimmed and says it
only works once it saves, upgrades it when the upload confirms, and offers a retry when it
does not. It shows the code immediately in the unsaved state rather than holding it back,
because two request timeouts of blank card is its own failure — the honest move is to show
the value and be clear about its status, not to hide it.

Watch for `void someAsyncSave()` next to a confident piece of UI. That discarded promise is
the bug.

## A transfer must carry everything a player would mourn, and nothing that can name its own keys

A player's progress is not in one place. The profile — coins, stars, the room — is a
single key. Every personal best is somewhere else entirely, one key per game per board,
written by each game's own `SaveStore`. The first version of cloud backup carried the
profile, so it restored a room with **none of the records that filled it**, and said
nothing about it. No error, no empty state: just a save file that looked complete.

So when adding anything persisted, ask where it lives relative to what a transfer copies.
The answer is not obvious, because the two stores are both "localStorage" and look alike.

**But an incoming document may never name its own storage keys.** It arrived over the
network, behind a code, and if it could choose keys it would choose `ellaz:cloud:v1` —
this device's anonymous identity — or `ellaz:profile:v1`, the balance. Every key from a
restored document is matched against an anchored pattern (`ellaz:<game>:score:<board>`)
before it reaches the disk, the count is bounded, and every value must be a finite number.
That validation is the security boundary, not a tidiness check.

Two deliberate limits worth not re-deriving:

- **Adoption unions, it does not replace.** A board this device holds and the incoming set
  does not is left alone, because `ctx.score` has no `clear()` and a transfer must not
  become one by the back door.
- **It cannot merge by taking the better of the two.** Only the number is persisted, not
  the unit, so nothing can tell whether 12,750 beats 9,100 or loses to it. Fixing that is
  a change to the score contract, not to the transfer.

And the line on *what* travels is drawn at records on purpose: `ctx.storage` lets a game
persist anything, including a coloring drawing as a data URL, and the document has a 1 MiB
ceiling. Records are small, bounded, and the thing a child would actually miss.

## When to Apply

- Any new action that overwrites profile state (a future account merge, a device transfer,
  a "start over" button).
- Reviewing a confirm dialog: does it show a number for what is lost, or only for what is
  gained?
- Any UI element a player is asked to record, screenshot, or trust across devices.

## Related

- [`rewards-economy-convention.md`](rewards-economy-convention.md) — the wallet rolls back a
  reward storage refused, for the same reason: never show a child something they will not keep.
- [`score-contract-convention.md`](score-contract-convention.md) — `ctx.score` and
  `ctx.rewards` are both add-only, with no `clear()`. Restore is the one exception in the
  whole app, which is why it carries all of this.
