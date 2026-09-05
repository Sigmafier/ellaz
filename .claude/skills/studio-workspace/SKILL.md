---
name: studio-workspace
description: Work inside studio/ - the art bible, sprite pipeline and gallery that share this repo with the games platform and the poker table but import nothing from either. Use before touching anything under studio/, because root npm test runs none of its tests, its renderers only run in a browser, and its gallery is shadcn on a copy of the ellaz tokens with one authorised port.
---

# The `studio/` workspace

The studio art bible: 12 style renderers with recipes, four rigged or
frame-authored characters with five clips each, a technique library, an
engine-neutral sprite export, adapters, and a gallery. **Its own
`package.json`, lockfile, tests, seven gates and workflow.** Nothing in `src/`
or `holdem/` imports from it and nothing in it imports from them;
`scripts/assert-boundary.mjs` refuses both directions from source.

## The trap that costs a whole CI run

**`npm test` at the repository root runs ellaz's suite and NOT ONE of the
studio's.** Anything touching `studio/` runs its checks from inside:

```bash
cd studio && npm ci && npm run build:check
```

`build:check` is typecheck, tests, the gallery build, the export, the seven
gates, and every gate's `--control`. `.github/workflows/studio.yml` runs the
same list, scoped with `paths: studio/**`; both ellaz deploys carry the
matching `paths-ignore`.

## The gallery is a TOOL: shadcn + Radix on the ellaz tokens, port 5188

The products-vs-tools rule
([`.claude/rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md`](../../rules/a-tool-ships-on-the-shared-kit-a-product-on-the-lightest.md)):
the app ships on the lightest kit that meets its byte budget; a tool ships on
the one shared kit. The gallery is the first tool.

- **It carries the beetle.** `gallery/src/beetle.ts` injects the hall's widget at runtime on a
  loopback http origin (never on `file://`, never in a build that leaves the machine), as
  surface `studio-gallery`. Before touching the gallery:
  `python3 ~/.claude/scripts/hall-server.py notes studio-gallery`; before handing it over:
  `node ~/.claude/scripts/beetle-check.mjs http://localhost:5188/ --surface studio-gallery`.
  The operator follows up at `http://localhost:8772/_notes/#studio-gallery`.
- **`npm run gallery` serves it on `http://localhost:5188` and ONLY 5188**
  (`strictPort` in `gallery/vite.config.ts`). The port is the operator's to
  authorise; if the dev-port gate refuses it, the operator adds it - never
  pick another. **`npm run gallery:build` still emits ONE html file**
  (`dist-gallery/index.html`) that opens from `file://` and from the Visual
  Hall; the shots script and CI read that file.
- **Need a primitive? `cd studio && npx shadcn add <name>`.** `components.json`
  at the studio root points at `gallery/src`. Never hand-roll a button, a
  rail, a dialog. `gallery/src/components/ui/*` is vendor code: re-add, do not
  edit, do not hold it to the 500-line law.
- **The tokens are a COPY**: `gallery/src/tokens.css` is byte-equal to
  `src/ui/tokens.css`, held by `npm run assert:tokens`. When it reds, run the
  `cp` it prints. Never edit the copy. `gallery/src/index.css` maps every
  shadcn role onto a token; no page names a colour.
- **The sidebar holds the page list AND the page's own pickers** (character,
  style, scene). A page is a `{ Side, Main }` pair in `gallery/src/pages/`,
  both pure functions of the route, so the rail and the page cannot disagree.
- **Routes are the address**: `#/sprites?char=slime&style=crayon`. The shots
  script names pages by these strings; `router.test.ts` pins the parser.
- **A page that throws must say so twice**: on the page, and on
  `window.__galleryError` for the shots script. `__galleryReady` is the id.

## Standing constraints

- **Renderers run in a browser.** `art/` never touches `document`; the canvas
  comes from `art/canvas.ts`'s factory. Headless jobs bundle `art/` into
  `dist-runner/studio.iife.js` and inject it into a blank Playwright page -
  **no dev server, no port for the RUNNER**. The gallery's 5188 is the
  studio's only port.
- **The bundle goes stale silently.** `scripts/lib/browser.mjs` rebuilds it
  when anything under `art/`, `runner/`, `export/` or `adapters/` is newer;
  `STUDIO_REBUILD=1` forces it. A function "missing" from `window.studio`
  that the source plainly has is a stale bundle.
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
ledger already holds. Gallery batches go to the Visual Hall with each card's
`--link` pointing at the served gallery route, so the operator judges the
real page and not only the capture.

Runbook and the map of the tree: [`studio/README.md`](../../../studio/README.md).
The rules every style agrees with: [`studio/docs/art-bible.md`](../../../studio/docs/art-bible.md).
