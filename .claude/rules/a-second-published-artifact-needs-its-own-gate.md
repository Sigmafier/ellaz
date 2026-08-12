# A Second Published Artifact Needs Its Own Gate, Written Before It Exists

**Scope**: Any artifact this repo publishes that is not `dist/` on our own two hosts - the standalone single-game bundles today, and anything uploaded to a third party tomorrow.
**Origin**: 2026-08-11, building `dist-standalone/` for itch.io. The gate caught three defects on the first real bundle; a browser caught a fourth; fixing that exposed a false negative in the gate itself.

## Core Rule

**Every gate in this repo reads `dist/`. A second artifact is invisible to all of
them, and it is published to a host where nothing here can ever look. So the
gate for it is written BEFORE the artifact, it asserts the properties the new
host cares about rather than the ones ours does, and the artifact carries the
commit it was built from - because a stale upload renders perfectly and is
simply months old.**

The danger is not that the second artifact might be wrong. It is that it can be
wrong in ways the whole existing apparatus is structurally unable to see, while
every check reports green and the live site really is fine.

## Why nothing we already own can cover it

| Gate | What it reads | Blind to |
|---|---|---|
| `assert-payload.mjs` | `dist/index.html` | a different output directory |
| `assert-first-visit.mjs` | `dist/` chunk graph | a different entry point |
| `assert-pages.mjs` | `dist/**` emitted pages | a bundle with no pages |
| `assert-live.mjs` | ellaz.fun over the network | a host we do not control |
| `assert-crawlable.mjs` | our sitemap as Googlebot | an artifact with no sitemap |

Five gates, four of them network-aware or artifact-aware, and the intersection of
their coverage with the new artifact is **empty**. That is the whole argument for
writing a sixth rather than extending a fifth.

## What the new host cares about, which our host does not

Each of these is correct on ellaz.fun and fatal on a third-party CDN:

- **Absolute paths.** `src="/assets/…"` is right on both our hosts and wrong on
  theirs, because they serve from a subdirectory whose path we never see. The
  failure is a blank frame, not an error.
- **A service worker.** Ours is load-bearing here. On someone else's origin it
  caches *their* site and its navigation fallback hijacks *their* routes - the
  exact bug `sw-navigation-fallback-hijacks-real-pages.md` documents, pointed at
  a stranger.
- **Anything that phones home.** Analytics, cloud sync, a webfont. On our own
  page a `fonts.googleapis.com` import is a design choice; inside a game embedded
  on a third-party page it is an external request from a game, which is the rule
  that lets this SDK be listed on a portal at all, and it hands a child's IP to
  Google from a page we do not own.
- **Filename case.** `/mnt/c` is case-insensitive and their CDN is not, so a
  reference to `GameArt.svg` that resolves here 404s there. `existsSync` cannot
  see this: you have to `readdirSync` the parent and compare the basename
  byte-for-byte.
- **The entry point itself.** itch wants `index.html` at the zip root, and Vite
  names its output after the input file, which cannot be `index.html` because the
  real app already owns that name.

**Three of those five were live in the first real bundle**, and the third one
shipped `firestore.googleapis.com`, `identitytoolkit.googleapis.com` and
`securetoken.googleapis.com` inside an artifact labelled "Sudoku". Not because
anything called them - the chunk was dead - but because a portal reviewer opening
a public zip does not care whether the code path is reachable.

## Exclusion happens at RESOLUTION, not after the fact

A chunk that is never emitted cannot be forgotten later. Stub the modules the
bundle must not contain at `resolveId`, and make each stub **throw** if it is
ever reached, so a wrong assumption is loud rather than silently empty.

Two traps, both of which produce something that looks like success:

- **`resolveId` receives the RAW specifier.** `import("../games/snake/index")`
  contains no `src/` at all, so a hook matching on the specifier fires on nothing
  and emits a **byte-identical bundle**. Resolve first, then match the resolved
  id.
- **`closeBundle` runs via `hookParallel`.** Two plugins mutating the same output
  directory race, and the error surfaces on the innocent one. One plugin, one
  sequence of statements.

## Write the matcher against the ARTIFACT, never the source

This is the transferable half and it cost three attempts. `global.css` contains:

```css
@import url("https://fonts.googleapis.com/css2?family=Heebo…");
```

The built file contains:

```css
@import"https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&…";
```

No whitespace after `@import`, and semicolons **inside** the query string. A
pattern requiring the space and stopping at the first `;` matches nothing - and
reports that as "no webfont found", which is indistinguishable from success. The
identical defect sat in the gate's own external-origin matcher, so it had gone
quietly false-negative over the exact request it existed to catch.

> A check that can silently not-run reports confidently about something it never
> observed. Both halves failed the same way at the same time, and neither could
> reveal the other.

Prove the pattern against the real bytes, in both directions: it must fire on the
artifact as built, and must not fire once the fix lands.

## The artifact must say what it was built from

Nothing in this repo can fetch an itch upload back. So the bundle stamps its
commit into its own `<head>`, which makes a stale upload visible from the outside
- on the hosting page itself, by anyone, without access to anything. Append
`-dirty` when the tree is not clean: a bundle built from uncommitted work is not
described by its HEAD sha, and saying so is what separates a stamp from a sticker.

## And a browser still finds things the gate cannot

The webfont was found by loading the built bundle in a real browser and reading
the network panel. Every static check had passed, because one `@import` line
looks nothing like a phone-home. Serve the bundle from a **nested subdirectory**
standing in for the CDN path, open it, and read the request list - four requests,
all local, is a measurement; "no absolute paths found" is an argument.

## When to Apply

- Adding any build target that writes outside `dist/`
- Publishing to a host this repo cannot fetch back from
- Reviewing a gate: ask what it reads, then ask what it therefore cannot see
- Any "we can just reuse the existing entry point" - read what that entry
  imports unconditionally first, because static imports are not removable by
  chunking config

## Related

- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md) - the
  allowlist-not-denylist argument, and the same class of green-build failure.
- [`sw-navigation-fallback-hijacks-real-pages.md`](sw-navigation-fallback-hijacks-real-pages.md)
  - what our service worker does to a host that is not ours.
- [`a-deploy-ledger-that-can-disagree-with-the-disk.md`](a-deploy-ledger-that-can-disagree-with-the-disk.md)
  - "verify the artifact, not the run", and why a rule nobody mechanised loses to
  a green checkmark.
- [`a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md`](a-bot-challenge-at-the-edge-is-invisible-from-your-browser.md)
  - the other outage where every gate read `dist/` and none read what the user
  received.
