# A "Wait Your Turn" Rule Deadlocks When Everybody Is Waiting

**Scope**: Any rule in this repo that makes a participant WAIT for an event, where that event can only be produced by participants who are not waiting.
**Origin**: 2026-08-15 — the Hold'em practice table stopped dealing entirely, with five funded players sitting at it.

## Core Rule

**When a rule says "you must wait for X", ask what produces X. If X is produced
only by the participants the rule is not currently excluding, then the rule
deadlocks the moment it excludes all of them — permanently, silently, and with
every individual component behaving exactly as designed.**

The fix is never to delete the wait. It is to make the wait YIELD when it would
leave nobody to produce X, and to charge the waiters whatever the wait was
protecting against.

## What it looked like

```
five seats, all active, holding 1963 / 2334 / 55 / 200 / 200 chips
phase pinned at "waiting"
the inter-hand alarm firing every 6.5 s
...committing an EMPTY event list, forever
```

Two correct rules, in a cycle:

1. a **joiner** (`owesBB`) inside the button..big-blind zone must WAIT, or they
   buy a late position without paying a blind;
2. a joiner stops owing only by being **DEALT IN**.

Every eligible seat owed a blind, so rule 1 excluded all of them but the big
blind, `dealtSeats` came back with one member, `computePositions` returned
null, and `doStartHand` set `phase = "waiting"` and returned **with no events**.
The blind never advanced, so the zone never moved, so nobody ever stopped
owing.

## The three things that made it hard to see

- **Nothing errored.** The refusal was a `return null` on the way to a silent
  early return. No throw, no log, no failed request.
- **Every part was right.** The joiner rule is correct poker. `doSitIn` setting
  `owesBB` is correct. The alarm firing every 6.5 s is correct. There is no
  single line you can point at and call wrong.
- **It was the NORMAL path, not an edge case.** `sleepBots()` sits every bot out
  when the last human leaves — the line that keeps that table on the free plan
  — and `wakeBots()` sits them all back in on the next visit. So *every visit
  after the first* made the whole table owe a blind at the same instant.
  Whether it wedged then came down to where the button happened to be: the zone
  spans the previous small blind to the new big blind, two seats wide on a
  lucky day and five on an unlucky one.

## How to find one

**A commit with an empty event list is the signature.** A system that
periodically wakes, decides, and produces nothing — on a schedule — is not
idle; it is refusing, repeatedly, and throwing the reason away. Measure the
event stream before reading any code:

```bash
# 75 s of the live table, every phase change and event batch printed
node scripts/repro/practice-state.mjs
```

If the answer is `phase=waiting` plus `ev []` on a fixed period, look for a
predicate that returns a "cannot" and a caller that treats it as "not yet".

## The fix shape

```ts
let { dealtSeats, livePostSeats } = deal(zone);
if (dealtSeats.length < 2) {
  ({ dealtSeats, livePostSeats } = deal(new Set()));  // the zone yields
}
```

Three properties, and the middle one is the one people skip:

1. **The wait yields only when it would starve the system** — never always, or
   the rule is deleted rather than fixed.
2. **The waiters still PAY.** Every joiner dealt in by the fallback lands in
   `livePostSeats` and posts a live blind. Yielding must not become a way to
   get the thing the wait was protecting against for free.
3. **A control test proves an ordinary case is untouched.** Without it, a
   deletion and a fix look identical in the diff and in the suite.

## Testing it

Reproduce **before** fixing, and anchor the fixture to the geometry rather than
to the symptom. `joiner-deadlock.test.ts` builds `owesBB` by driving real
commands (`sit` → hand → `sitOut` ×5 → `sitIn` ×5) rather than writing the flag
by hand, then asserts **the zone is five seats wide** — because the identical
table with a two-seat zone deals perfectly and always did, so a fixture that
quietly drifted would pass every assertion while testing nothing.

## When to Apply

- Any `owes*` / `pending*` / `mustWait*` flag cleared only by the action it gates
- Rate limiters, queue admission, quorum rules, "new members wait one cycle"
- Reviewing any predicate that can return "no" for a state the system cannot
  leave on its own
- **Any periodic job that commits nothing on a schedule** — that is this bug's
  fingerprint whatever the domain

## Related

- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  — the other "every component reports success while the system is broken",
  and the same lesson that a green signal is not a working one.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  — a verdict derived from an ABSENCE (no events, no error) cannot tell "fine"
  from "never ran".
- `~/.claude/rules/debugging/no-band-aids.md` — the fix belongs at the layer
  that owns the rule. This one is in the engine, not in the bot plumbing that
  happened to trigger it, because any real table reaches it too.
