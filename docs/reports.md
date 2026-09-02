# Player reports — what arrives, what never does, and how it becomes an issue

Since 2026-09-02 a player can tell us a game is broken, and a game that crashes
offers to report itself. This is the runbook.

## The shape, in one line each

| Part | File | What it is |
|---|---|---|
| Capture | `src/report/context.ts` | pure, over an injected env. An ALLOWLIST of named keys — it cannot see anything it was not asked for |
| Screenshot | `src/report/shot.ts` | canvas games only, and it refuses a blank frame |
| Transport | `src/report/send.ts` | plain `fetch` to Firestore, its own anonymous identity, fail-soft |
| The sheet | `src/report/ReportSheet.tsx` | the lazy `report-*` chunk |
| The opener | `src/portal/openReport.tsx` | ONE implementation, called from Home, the utility row and the crash card |
| Crash card | `src/games/GameBoundary.tsx` | inside the game's own React root — see below |
| Handoff | `src/ui/crashTools.ts` | game tree → platform, so `src/games/**` imports no portal code |
| Rules | `firestore.rules` § reports | write-only from outside, server-checked throttle |
| Triage | `scripts/reports/pull.mjs` | reads with an owner token, files GitHub issues |

## Where the button is, and why it is not in the header

It rides the **utility row** on the three playable screens (a game, the room,
the boards) beside full screen, and sits as one line in **Home's trailing
shelf**. It is platform chrome, so by
[`game-controls-and-platform-chrome-never-share-a-bar.md`](../.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md)
it appears on every screen in the same place.

It is deliberately **not** a fifth pill in Home's header. That header belongs to
a child — coins, trophies, language, theme — and the person who reports a bug is
an adult. Adults read the bottom of a page.

## What a report carries

```
kind      bug | idea        reason  broke | hard | picture | sound | idea
message   optional, <= 300 chars. The chips mean nothing must ever be typed
game      id, level, the verbatim `ellaz:<id>:session` envelope (the exact
          board, <= 64 KB, replays through that game's own SessionSpec), and
          how long they had been on it
view      w, h, dpr, orientation      <- the 40 DOM games' evidence
app       locale, theme, muted, base, buildStamp
client    userAgent (bounded), language, online
errors    the last 3 throws, if a crash armed the report
shot      a data URL, canvas games only, only when the frame is not blank
```

**Never sent, and pinned by a test that plants a real-shaped one:** the backup
code from `ellaz:cloud:v1` — it restores a whole profile onto another device —
plus the uid, the refresh token, the profile, and any key not on the allowlist.
`context.test.ts` serialises the payload and searches it for the VALUE, not the
field name, because a field nobody has thought of yet is still sent.

**The player sees all of it before it goes.** Step 3 of the sheet lists it in
words, with the screenshot as a thumbnail and its own switch.

## Where it lands

`reports/{uid}/items/{minute}` in `ellaz-games`, under a **dedicated anonymous
identity** at `ellaz:report:v1` — deliberately not the backup uid, so a report
can never be joined to a child's profile.

`allow read: if false` for everybody. We read with an owner credential, which
bypasses rules; nothing that ships in a browser can. That gap IS the triage
step: a report becomes public only after a person has read it.

## The throttle, and its honest limit

The document id is the minute, and the rule compares it to `request.time`.
Without that comparison the limit would be a comment — the create rule only ever
fires for a document that does not exist, so the only thing bounding how many
documents a caller can write is how many ids it may name.

| Guard | Enforced by |
|---|---|
| anonymous auth required | rules; Google rate-limits sign-up per IP |
| a few per uid per minute | server-checked minute id + create-only |
| field set and sizes | `hasOnly` + `.size()` |
| **kill switch** | deny `create`, `bash scripts/deploy-rules.sh` — seconds, no rebuild |

Clearing localStorage mints a fresh uid, so this is spam-**resistant**, not
spam-proof. What does hold is structural: **the project has no billing account,
so the worst case is the free daily quota exhausting for that day. It can never
produce a bill.**

## Reading the inbox

```bash
npm run reports:pull              # list what is waiting, file nothing
npm run reports:pull -- --file    # open an issue for each unfiled report
npm run reports:pull:control      # prove the script can see one AND skip a filed one
```

Listing is the default and filing is the flag, deliberately: an issue on a
public repo cannot be unpublished, so the safe verb is the one you get by typing
nothing.

## After any rules edit

```bash
bash scripts/deploy-rules.sh   # a rules file enforces nothing until it is released
npm run probe:report           # 12 cells against the LIVE database
npm run probe:cloud            # 23 cells, proving the other collections still work
```

`probe-report.mjs` opens and closes with a **positive control** — a rule that
refused everybody would pass every negative cell in it and read as a hardened
collection.

## Three things worth not re-deriving

**The crash boundary is inside the game's own React root, not around
`GameHost`.** An error does not cross a React root boundary, and every DOM game
mounts its own root in `games/reactHost.tsx`. A boundary in the portal would be
armed and unreachable for 40 of the 42 games — and it would read as protection
in every search.

**The screenshot covers two games.** `snake` (Phaser) and `bubbleshooter` are
the only canvases in the catalogue. Phaser renders on WebGL, where reading the
canvas after the frame is presented gives a blank image unless
`preserveDrawingBuffer` is set — it does not throw, it returns a well-formed
black rectangle. `isBlank` samples the pixels and refuses it, because evidence
pointing the wrong way is worse than none.

**The reporter is stubbed out of standalone bundles** in
`vite.standalone.config.ts`, exactly as the cloud client is. A game bundle runs
on somebody else's domain and may fetch nothing off-site; that rule is why this
SDK is listable on a portal at all. The crash card still appears there — it just
offers no report button, because `canTellAboutCrash()` is false with no handler
registered.
