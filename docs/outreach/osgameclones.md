# osgameclones - eight games listed on the open-source clones site

**Status**: fired 2026-09-03. **PR <https://github.com/opengaming/osgameclones/pull/5052> is OPEN and mergeable.** Nothing below is a proposal any more; it is the record of what was sent. The operator ACKs the PR text below (D9), then the PR is opened from the operator's own GitHub account (`gh` is logged in as `ytrofr`) and the row in `ledger.md` flips to `fired`.

## Why this door, measured 2026-09-02

<https://osgameclones.com> lists open-source remakes and clones of known games. It is
the one door probed in Arc 4 that is **dofollow, self-serve and alive**: 9,871 anchors
on its front page and **0 `nofollow`**, entries are added by pull request against a
published schema, the last merge was 2026-09-01, and it links each clone's `url` AND
`repo`. Re-run: `bash scripts/repro/probe-doors.sh`.

Two things this door is NOT. It is not a person answering a letter - a maintainer
reviews a diff against a schema, which is the class RCH16 (proposed) puts first. And it
is an EARNED link under RCH13 only because the page that renders it is theirs and
dofollow: the same entries in a GitHub README would be `nofollow` and DISCOVERY
(measured 5/5 on our own repo page, 2026-08-23), which is the whole point of D15.

## What the schema wants, and the three choices worth knowing

Read from `schema/games.yaml` on the day. Required: `name`, `originals` (each must exist
in `originals/`), `type`, `status`, `langs`, `licenses`, `updated`. Optional and used:
`repo`, `url`, `development`, `platforms`, `content`, `frameworks`, `ai`, `info`, `added`.

- **`type`**: `clone` where the mechanic is the original's (2048, Snake, Minesweeper,
  Tetris, Simon, Wordle); `similar` where it diverges or the original is a trademark
  (Bejeweled -> Match Three, Picross Series -> Picture Logic).
- **`ai: true`** on every entry. The schema's own description is *"whether this project
  contains LLM-generated outputs"*, and this repository does. Newgrounds asked the same
  question and the answer was left to the operator; here it is a boolean the maintainer
  can check against the commit log, so it is set honestly and flagged for the ACK.
- **No `images`**. Our share cards are content-hashed
  (`/og/game-2048-en-9a7c4905.png`) and the name moves on every content change, so a
  listed image would 404 within weeks. A dead image is worse than none.

`originals/` was checked for all eight names: `'2048'` (quoted, in `0scumm.yaml`),
`Snake`, `Minesweeper`, `Tetris`, `Simon`, `Bejeweled`, `Picross Series`, `Wordle`.

## Validation, 2026-09-02

`scripts/repro/osgc-validate.py` fetched the live schema and every `originals/*.yaml`,
checked the eight entries for required keys, unknown keys, every enum, every
platform and license, every original's existence and both dates, and planted a bad
original plus a bad `type` as the control:

```
population: 8 entries checked against 20 schema keys, 1925 originals
positive control (planted bad original + bad type): FIRED
problems: none
```

## The PR

**Branch**: `add-ellaz-games` on a fork of `opengaming/osgameclones`.
**File**: `games/e.yaml` (entries sort alphabetically by name; all eight start with
"Ellaz", so they land together, inserted in alphabetical order among the existing
`E` entries).

**Title**: `Add Ellaz: eight open-source browser clones (2048, Snake, Minesweeper, Tetris, Simon, Bejeweled, Picross, Wordle)`

**Body**:

> Adds eight games from [Ellaz](https://ellaz.fun), an MIT-licensed, ad-free family
> games site (source: https://github.com/Sigmafier/ellaz). Each entry links the
> playable page and the shared repository; all eight are `Web`, TypeScript, playable,
> under active development. `type: similar` where the mechanic diverges from the
> original or the original is a trademark. `ai: true` on all eight, since the project
> contains LLM-generated code. Validated against `schema/games.yaml`; every original
> exists in `originals/`.

## The eight entries

```yaml
- name: Ellaz 2048
  originals:
  - '2048'
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/2048/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Browser 2048 with three board sizes, one of them built for young children. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French; installs as a PWA and plays offline.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Snake
  originals:
  - Snake
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/snake/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Phaser
  licenses:
  - MIT
  ai: true
  info: Touch-first Snake with an on-screen direction pad, swipe and keyboard. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French; installs as a PWA and plays offline.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Minesweeper
  originals:
  - Minesweeper
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/minesweeper/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Minesweeper for phones and desktops, tap to reveal and long-press to flag, with a first tap that is always safe. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Falling Blocks
  originals:
  - Tetris
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/blocks/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Falling-blocks puzzle with its own shapes and colours, playable by touch, swipe or keyboard. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Follow Me
  originals:
  - Simon
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/echo/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Repeat-the-sequence memory game with four coloured pads and tones, built for young children. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Match Three
  originals:
  - Bejeweled
  type: similar
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/match3/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Swap-and-match-three puzzle with original tiles and no timer, aimed at children. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Picture Logic
  originals:
  - Picross Series
  type: similar
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/nonogram/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Nonogram (picture logic) puzzles with generated pictures and row and column clues, tap to fill or mark. Part of Ellaz, an ad-free family games site in English, Hebrew, Spanish and French.
  added: 2026-09-02
  updated: 2026-09-02

- name: Ellaz Word Guess
  originals:
  - Wordle
  type: clone
  repo: https://github.com/Sigmafier/ellaz
  url: https://ellaz.fun/games/wordguess/
  development: active
  status: playable
  platforms:
  - Web
  content: open
  langs:
  - TypeScript
  frameworks:
  - Preact
  licenses:
  - MIT
  ai: true
  info: Guess-the-word game with its own word lists in English, Hebrew, Spanish and French and unlimited rounds. Part of Ellaz, an ad-free family games site; installs as a PWA and plays offline.
  added: 2026-09-02
  updated: 2026-09-02
```

## After the ACK - what fires, in order

1. Fork, branch `add-ellaz-games`, insert the block into `games/e.yaml` in alphabetical
   position, open the PR with the title and body above. Nothing else in their tree is
   touched.
2. `ledger.md` row -> `fired`, verdict due **2026-12-01** (SEO11).
3. Eight `expected` rows in `backlinks.md`, one per game page, watching
   `https://osgameclones.com/<slug>/` once the site publishes the slugs (their URL is
   derived from the name; read it from the deployed page after the merge, never guessed).
   `WATCHED` in `scripts/reach/backlinks.mjs` gains the key so `coverage()` does not
   report the row UNWATCHED.
4. If the maintainer asks for changes: answer on the PR, same day, from the operator's
   account. If it is closed unmerged: row -> `spent`, reason quoted from the PR.

## Provenance

| claim | measured | how |
|---|---|---|
| 0 nofollow of 9,871 anchors | 2026-09-02 | `scripts/repro/probe-doors.sh` |
| last merge 2026-09-01 | 2026-09-02 | `gh api repos/opengaming/osgameclones/commits` |
| all 8 game URLs serve 200 | 2026-09-02 | `curl -o /dev/null -w %{http_code}` |
| 8 originals exist by exact name | 2026-09-02 | `osgc-validate.py` |
