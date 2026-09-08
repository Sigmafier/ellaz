# The Styles a Document Needs Ship INSIDE It, Because a Separate File Can Be Missing at Paint Time

**Scope**: Every emitted document in this repo, and any future page whose appearance
depends on an artifact fetched separately from the HTML.
**Origin**: 2026-09-08. The operator loaded ellaz.fun and saw the home page render
completely unstyled - serif headings, default blue underlined links - and then snap into
shape a moment later. Every gate was green and the stylesheet was correct.

## Core Rule

**A `<link rel="stylesheet">` is a second artifact with its own cache entry, its own
version and its own chance to be absent. When it is absent the document does not
degrade - it renders naked, and every check that reads the HTML, the CSS, or the
network still passes. If a page's appearance is not optional, its styles belong inside
the document.**

Inlining does not fix any one cause. It removes the class: a document cannot be missing
part of itself.

## The screenshot WAS the proof, and this is the part worth keeping

```
WHAT WAS ON SCREEN                     WHAT THAT MEANS
------------------                     ---------------
h1 in a serif face                     body.app-shell{font-family:var(--font)}  not applied
links default blue + underlined        #home-doc a{color:var(--brand-ink,...)}  not applied
bullets, no layout                     #home-doc{max-width:44rem;padding:...}   not applied

the consent bar, correctly styled      .consent{...}  IS applied
dark navy, white text, two buttons     <- and its CSS is the one block that ships
                                          INLINE, in the body (src/build/consent.ts)
```

One element on the page was styled and it was the one element whose styles were part of
the document. That is not a font swap, not a slow mount and not a theme flash: it is a
stylesheet that was not there. **Before theorising about a paint, ask which rules DID
apply and where those rules live.**

## Why no gate could see it

- `assert:pages` read the emitted HTML - the `<link>` was present and correct.
- `assert:live` fetched every asset - the CSS was 200 and byte-identical to the build.
- `assert:fast` read the served head - the stylesheet was first-party and blocking.
- Lighthouse clears storage before every run, so it never loads the way a returning
  visitor does, and it reported the stylesheet as correctly render-blocking.

Every instrument was pointed at a moment when the file was present. The failure needs a
moment when it is not, and that moment belongs to one browser, once, in the field.

## What can make it absent - none of which is exotic

- A service-worker update that activates mid-navigation: `cleanupOutdatedCaches()` drops
  the old precache while the document from it is still parsing, and this host DELETES
  hashed assets on deploy - measured the same morning, every pre-deploy asset name 404s
  within the hour.
- A `NetworkFirst` runtime cache of documents (ours holds 60 for 30 days) handing back
  HTML older than the assets on the server.
- One failed request, on one flaky connection.

## What it costs, stated rather than waved away

Every emitted document that boots the app carries the stylesheet's bytes: `dist/` grew
21 MB -> 23 MB, HTML 8.6 MB -> 11 MB, and each deploy uploads that.

The first visit got **smaller**: 56,076 -> 56,001 B gz, because the CSS now gzips against
the HTML instead of alone and one request disappears. PageSpeed's own estimate for the
render-blocking request it removes was **150 ms** on mobile, and it took the last two
hops off an 883 ms critical chain, because Fredoka's `@font-face` was declared inside the
file that had to arrive first.

## The gates that hold it

- `assert-pages.mjs` reds if any emitted document LINKS a local stylesheet, and reds if
  an app-booting page carries neither a link nor an inline block containing
  `body.app-shell` - the discriminator, because every content page already inlines
  `SERVED_CSS` and a bare "has a `<style>`" test would pass on a page that had lost the
  app's styles entirely. Four controls, and a planted mutation kills exactly two of them.
- `assert-fast.mjs` now scans inline `<style>` blocks for a third-party `@import`, not
  only linked sheets. Without that its population went to zero the moment the CSS moved
  inside the document - a gate whose scope narrows in silence, which is the failure
  `a-diagnostic-that-truncates-what-it-compares.md` collects.
- `inlineStylesheets` THROWS when the linked file is not in the bundle. The two
  survivable-looking outcomes are both worse than a red build: keeping the link restores
  the bug, dropping it ships a site with no styles.

## When to Apply

- Adding any `<link rel="stylesheet">`, icon font, or theme file to an emitted document
- A report of a page that "loads wrong then fixes itself" - find out which rules applied
- Any artifact the page cannot render correctly without, fetched separately from the page
- Writing a gate over styles: name the population, and check it is not zero

## The tell

The page's appearance depends on a file whose name is not the page's name, and nothing
in the system can tell you what happens when that file does not arrive.

## Related

- [`a-font-behind-an-import-is-invisible-to-every-preload.md`](a-font-behind-an-import-is-invisible-to-every-preload.md)
  - the same file, one layer down: what the stylesheet itself reaches for.
- [`a-diagnostic-that-truncates-what-it-compares.md`](a-diagnostic-that-truncates-what-it-compares.md)
  - why `assert-fast` had to learn about inline blocks in the same change.
- [`precache-glob-sweeps-new-chunks.md`](precache-glob-sweeps-new-chunks.md)
  - the `globIgnores` entry that keeps the now-unreferenced file out of the precache.
- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - every gate here was green; only a browser, once, disagreed.

---

**Last Updated**: 2026-09-08 (origin)
