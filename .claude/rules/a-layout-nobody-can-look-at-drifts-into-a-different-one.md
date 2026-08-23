# A Layout Approved as a Picture Drifts, Because Nothing Holds the Numbers

**Scope**: Every chrome decision in this app - the emitted header, the utility row, `GameChrome`, and any control kit added later.
**Origin**: 2026-08-21, the operator: *"we keep trying to wire the new G1 header as we said, you keep showing me other versions, half done work, this is not systematically."*

## Core Rule

**A layout decision is a NAMED VARIANT in `src/lab/design/spec.ts`, rendered over
the real chrome at `?design`, and pinned to the real source by
`variant-is-shipped.test.ts`. An approval that lives only in a chat message, a
screenshot, or a static mock has no way to be compared against what shipped -
so it cannot drift loudly, and a layout that cannot drift loudly drifts
quietly.**

The failure is not that somebody ignores an approval. It is that six weeks
later nobody can answer "is this the thing we approved?" without re-reading a
conversation, and the honest answer to a question nobody can answer is always
"probably".

## What went wrong, measured

`dist-g1/` - the approved-G1 build of 2026-08-20 20:32 - carries these tokens:

```
wide    --hh 60  --uh 52  --tap 44  --hgap 12  --hpad 20  --hbrand 22
narrow  --hh 58  --uh 46            --hgap  8  --hpad 12  --hbrand 20
```

Every one was **byte-identical to what shipped that day**. The emitted half of
G1 had been live since the day it was approved, and the only difference in the
whole document is the breadcrumb, which was plain text then and became a pill
afterwards - an addition, not a deviation.

So "G1 is not wired" was true of a real thing and false of the thing it named.

**Both halves are closed now, and they closed in OPPOSITE directions, which is
the point.** `--uh` moved 52/46 -> 60/56 on 2026-08-22 for the row's clearance,
and shown the two arms the operator kept the change and amended the RECORD
("Keep 56, update G1") - dated, with the reason, in `spec.ts`. The breadcrumb
went the other way: shown the two arms measured, they chose plain, and the CODE
moved back to what `dist-g1` always had. `SHIPPED` and `G1` are now equal in
every field and the pin asserts it.

A record may be CHANGED, by the person whose record it is, with the date and
the reason written down. It may not change by ITSELF because something else
moved - which is what a `{...SHIPPED}` spread would have done silently, and did
until 2026-08-22.
The panel - the level toggle, the stat cards, the footer each game fills
itself - is the half G1 never specified, and no amount of re-reading the
approval could have said so, because the approval was a picture of a header.

## The three parts, and why each one is load-bearing

**A spec, so a decision is data.** `ChromeSpec` holds every number the two
halves are laid out from. `SHIPPED` is what the code does today; `G1` is what
was approved. They are comparable because they are the same type.

**A bench, so a decision can be LOOKED at.** `?design` on any real game page
mounts a drawer that turns the tokens the real chrome already reads - the real
emitted header, the real `GameChrome`, the real board. It draws no
approximation of the chrome, which is the whole difference between this and the
static files in `mockups/`: a drawing can disagree with the app, and a token
cannot. `#/lab/design` puts two arms side by side and MEASURES the difference
out of both documents.

**A pin, so a decision cannot be replaced in silence.**
`variant-is-shipped.test.ts` reads `layout.ts` and `GameChrome.tsx` and fails
if either stops matching `SHIPPED`. Six planted defects, six killed: `--uh`
52 to 53, `--hh` 58 to 57, the pill removed, the panel cell 56 to 52, the level
floor 132 to 128, and a token read reverted to a raw literal.

## A knob that changes nothing answers "yes" to everyone who turns it

The bench's own compare screen caught this in the bench, within an hour of it
existing: `statShape`, `restartAt` and `pauseAt` wrote `data-design-*`
attributes that **no CSS and no component read**. Turning them looked exactly
like turning a knob whose value already happened to be right.

They are labelled `records only` now rather than faked. A preview that cannot
be produced is a finding, not a thing to approximate - and marking it is what
makes the gap visible instead of invisible.
See `~/.claude/rules/quality/an-armed-lever-with-no-caller-reads-as-yes.md`.

## Two measurement traps this cost, both of which read as real numbers

**`getComputedStyle` belongs to a WINDOW.** Calling this window's on an element
inside an iframe's document returns initial values - so the compare table
reported both arms at `99px` while one of them was measurably `0px`. It read as
"the arms agree", which is the answer the table exists to produce and the one
it must never produce by accident. Use `doc.defaultView.getComputedStyle`.

**A knob bound to the wrong arm does nothing.** `--hh` has a wide value and a
narrow one and the viewport picks; a slider bound to the wide one is inert on a
phone, and inert is indistinguishable from correct. The knobs follow the arm
and say which one they are on.

## When to Apply

- Any change to the header, the utility row, `GameChrome`, or a control kit
- Any approval of a layout - it becomes a variant in the same session, or it is
  not an approval, it is a conversation
- Before claiming a layout "is not wired": open `#/lab/design`, pick the
  variant, and read the table
- Adding a knob: if nothing reads what it writes, mark it rather than ship it

## Related

- [`game-controls-and-platform-chrome-never-share-a-bar.md`](game-controls-and-platform-chrome-never-share-a-bar.md)
  - WHICH controls go where. This rule is how that one stops being re-litigated.
- [`a-threshold-tuned-against-todays-tree-goes-stale.md`](a-threshold-tuned-against-todays-tree-goes-stale.md)
  - the same decay for a number in a gate rather than a number in a layout.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - the family both measurement traps above belong to.
- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) -
  why the bench lives in `src/lab/` and costs a first visit nothing.
