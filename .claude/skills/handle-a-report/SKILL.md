---
name: handle-a-report
description: Turn a player's flag report into a fixed, closed issue - reading the inbox, splitting a report carrying several asks, finding the code that actually owns it, and closing on live bytes. Use when the report inbox has anything in it, or before acting on any issue that came from one.
---

# Handling a player report

A report is a sentence typed on a phone about whatever screen the player was on. Every
step here exists because one of those was read too quickly once.

```
inbox -> read it WHOLE -> split the asks -> whose code is it? -> is a peer there?
      -> replay their board -> fix -> gates -> deploy -> read the live bytes -> close
```

## Listing is the safe verb, and filing is one-way

```bash
npm run reports:pull              # lists. files nothing.
npm run reports:pull -- --file    # opens public issues. ASK FIRST.
npm run reports:pull -- --control # proves the puller can see AND skip
```

An issue on a public repo cannot be unpublished, which is why the safe verb is the one you
get by typing nothing. **An empty inbox and a broken query print the same sentence** — run
`--control` before believing "nothing waiting"; it plants a report, proves it is seen, then
proves a filed one is skipped, and cleans up after itself.

## The title is a 60-character slice of what they wrote

The issue title is `message.slice(0, 60)`, so a longer report is cut off in the listing.
On 2026-09-05 one read *"Super powers should do an effect when they go to animate the"* and
carried **three** separate asks, the last two invisible.

**Read the full `message` from the inbox, never triage from the title.** A report carrying
several asks is several pieces of work — say so on the issue, and do not let one of them
close it.

## The game it was filed against is a guess

The flag button stamps whatever screen they were on. In `907800c` three reports arrived
tagged `match3` and only one was — the others were shared page CSS and the report throttle
itself. The precedent is deliberate: **do not retag and do not reroute.** Leave it filed
where it arrived, fix the code that really owns it, and name that code in the close.

Then `git status -s src/games/<id>/`. Another session may already be in there, and two
sessions in one folder is how a commit takes a peer's half-finished work.

## Their board is in the report, so do not guess at a repro

Every report carries `ctx.game.session` — the exact snapshot, in the shape that game's own
`SessionSpec.validate` accepts — plus the viewport, locale, theme, build stamp and the last
three throws. Reproduce at **their** viewport, from the **built** page, not from
`npm run dev`, which has no service worker and emits no page.

Grep open and closed issues for the footer signature
`ellaz-report:<game>:<kind>:<reason>` — that is the dedupe key, coarse on purpose, because
two people describe one bug in two different sentences.

## Close on live bytes, never on a green run

A green workflow, an HTTP 200 and a page that rendered in your browser have each lied here
once, and there is a rule file for each. The closing comment quotes something measured off
the live site — the hashed chunk it served and a string inside it, a colour read back off
the page, a count. Never "CI is green".

Say thank you, and disclose anything verifying turned up that nobody asked about — closing
a report has twice found a second defect.

Gates and the deploy loop: skill `ship-ellaz`. The pipeline in full:
[`docs/reports.md`](../../../docs/reports.md). The outages behind that paragraph:
`.claude/rules/verify-the-deploy-target-not-just-the-run.md`,
`a-deploy-ledger-that-can-disagree-with-the-disk.md`,
`a-diagnostic-that-truncates-what-it-compares.md`.
