---
name: studio-workspace
description: Work inside studio/ - the art bible, sprite pipeline and gallery that share this repo with the games platform and the poker table but import nothing from either. Use before touching anything under studio/, because root npm test runs none of its tests and its renderers only run in a browser.
---

# The `studio/` workspace

The studio art bible: 13 style renderers with recipes, four rigged or
frame-authored characters with five clips each, a technique library, an
engine-neutral sprite export, adapters, and a one-file gallery. **Its own
`package.json`, lockfile, tests, six gates and workflow.** Nothing in `src/`
or `holdem/` imports from it and nothing in it imports from them;
`scripts/assert-boundary.mjs` refuses both directions from source.

## The trap that costs a whole CI run

**`npm test` at the repository root runs ellaz's suite and NOT ONE of the
studio's.** Anything touching `studio/` runs its checks from inside:

```bash
cd studio && npm ci && npm run build:check
```

`build:check` is typecheck, tests, the gallery build, the export, the six
gates, and every gate's `--control`. `.github/workflows/studio.yml` runs the
same list, scoped with `paths: studio/**`; both ellaz deploys carry the
matching `paths-ignore`.

## Standing constraints

- **Renderers run in a browser.** `art/` never touches `document`; the canvas
  comes from `art/canvas.ts`'s factory. Headless jobs bundle `art/` into
  `dist-runner/studio.iife.js` and inject it into a blank Playwright page -
  **no dev server, no port**. Never add one; a port is the operator's to
  authorise.
- **The bundle goes stale silently.** `scripts/lib/browser.mjs` rebuilds it
  when anything under `art/`, `runner/`, `export/` or `adapters/` is newer;
  `STUDIO_REBUILD=1` forces it. A function "missing" from `window.studio`
  that the source plainly has is a stale bundle.
- **The gallery is ONE html file** (`dist-gallery/index.html`), opened from
  `file://` and from the Visual Hall. The vite plugin inlines the chunk and
  CSS and refuses a build where an external asset reference survives.
- **Frame names are the contract**: `<character>_<clip>_<nnnn>`, four digits
  from 0000, contiguous, in clip order. The five clip ids are fixed.
- **The pivot is the feet, at body-space (0, 0), on every frame.** A rig
  cannot move it; frames are laid out symmetric about it so a flip keeps the
  pivot column.
- **Recipes have nine headings, identical, in order** - see
  `art/styles/recipe-contract.json`. A new style is three files and one
  registry row; `assert:recipes` reds on any mismatch.
- **Adapters carry no studio import.** `adapters/manifest.ts` re-declares
  the types so an adapter is copied into a game beside its engine untouched.
- **Palettes are JSON; `.gpl` and `.hex` are exports**, never edited by hand.
- **Exports are stamped** with the commit and `dirty`; the flag was once
  reading clean on a dirty tree because of a pathspec, and is proven now.

## Where the picks live

The operator's style picks are in the taste ledger
(`python3 ~/.claude/skills/design-shotgun/bin/taste.py show ellaz`) and in
`art/games/<id>.json`. Record a new pick in both. Never re-ask a pick the
ledger already holds.

Runbook and the map of the tree: [`studio/README.md`](../../../studio/README.md).
The rules every style agrees with: [`studio/docs/art-bible.md`](../../../studio/docs/art-bible.md).
