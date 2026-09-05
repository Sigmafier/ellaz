---
paths: "studio/**,src/ui/**,src/portal/**,.claude/skills/**"
---

# A Tool Ships on the Shared Kit; a Product Ships on the Lightest Kit That Meets Its Budget

**Scope**: Every screen built in this repository, and the question "which UI kit" every
time one is started - the ellaz app and its games, the studio gallery, any editor,
board, inspector or dashboard that comes after it.
**Origin**: 2026-09-05. Two sidebars for the studio gallery were built from the same
robot and the same ellaz tokens, one hand-rolled and one shadcn, measured side by side,
and the operator picked shadcn and asked for the reasoning to become the standing rule.

## Core Rule

**Decide by what the screen is FOR, not by what is cheapest to write today.**

- **A product** - ellaz.fun and every game a child downloads - ships on the lightest
  kit that meets its byte budget: Preact through the alias, `src/ui` tokens and
  components, a 56 KB first-visit ceiling that `assert:payload` holds. Bytes, kids and
  offline win here, and no primitive is worth a child's download.
- **A tool** - the studio gallery, an editor, a board, a dashboard, anything only we open
  - ships on shadcn + Radix wearing the product's own tokens. Speed of building the NEXT
  screen wins here, and nobody pays the bytes.

One kit for every tool, so the sixth primitive (a dialog, a combobox, a tooltip, a
sheet) is `npx shadcn add <name>` with keyboard, focus and aria already inside it, rather
than the sixth hand-written one. That is the whole argument: the vanilla path is cheaper
on tool one and re-pays every primitive on tool two.

## The pair that decided it

Both candidates were REAL: built from the same tree, driven by the runner bundle, rendered
headlessly with zero page errors, contrast read from the computed colours of real elements
at 1400 x 900. Same six pages, same market tokens, same canvas player.

```
                         A  vanilla + tokens          B  shadcn + tokens
built single file        91.5 KB                      496 KB (155 KB gzip)
who downloads it         nobody but us                nobody but us
active rail item         5.87:1 (brand-strong/on-brand) 15.28:1 (upstream accent tint)
h1 / lede / group label  15.65 / 5.99 / 6.31          15.65 / 5.99 / 16.48
the next primitive       written by hand, again       npx shadcn add
RTL for Hebrew, mobile   to be written                comes with the Sidebar
```

Both clear every floor. The bytes are five times larger on B and nobody pays them; the
argument was never about tool one.

## What the rule fixes in place

- **Tokens reach a tool as a COPY with a parity gate**, never an import across a workspace
  boundary. `studio/gallery/src/tokens.css` is a byte copy of `src/ui/tokens.css`;
  `npm run assert:tokens` holds them equal and prints the one-line fix when they drift.
- **shadcn's roles are mapped onto the tokens once**, in the tool's `index.css`
  (`--primary: var(--brand-strong)`, `--sidebar: var(--surface)`, ...). No page names a
  colour; the app's two themes re-skin the tool by switching `data-theme`.
- **Generated `components/ui/*` is vendor code.** Re-`add` it, do not hand-edit it, and do
  not hold it to the 500-line file law that governs what we write.
- **A tool gets its own port, authorised by the operator, with `strictPort`.** The gallery
  is 5188. A taken port is an error, never a silently different origin that cannot be
  logged into.
- **Zero bytes of any tool reach the product.** `assert:boundary` refuses the import;
  `assert:payload` would catch the bytes.

## The tell

You are about to write a `<button>` with its own focus ring, or a rail with its own
collapse, for a screen only we will open. Or you are about to add React to a game.

## When to Apply

- Starting any screen: name which side of the line it is on, in the first sentence
- Reviewing a diff that adds a UI dependency to `src/` - that is the product side, and the
  budget decides, not this rule
- Reviewing a diff that hand-rolls a primitive under `studio/` or any future tool
- Updating the UI/UX skills: they prescribe exactly this split, nothing softer

## Related

- [`a-comment-that-explains-a-cost-must-name-its-measurement.md`](a-comment-that-explains-a-cost-must-name-its-measurement.md)
  - the pair above is two real builds with a date, for that reason.
- [`a-contrast-floor-is-a-floor-not-a-target.md`](a-contrast-floor-is-a-floor-not-a-target.md)
  - clearing 4.5:1 was necessary for both candidates and decided nothing between them.
- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) - why the
  product side's budget is a gate and not a preference.
- `~/.claude/skills/ui-ux-playbook/SKILL.md` tier 3 - the operator's standing doctrine
  this rule sits under; this is its product exception, measured.

---

**Last Updated**: 2026-09-05 (origin)
