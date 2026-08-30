# A Step Placed Between a Handover and the Button Someone Came to Press Will Be Skipped

**Scope**: Every checklist in this repo whose middle step is ours and whose next step is a
person's - publishing a listing, uploading a bundle, filling a form nobody can automate.
**Origin**: 2026-08-30. 2048 went live on Newgrounds in their default 640 x 480 with the
board clipped - the same fault, on the same day, that the itch listing had already taught
us, with the rule that prevents it written down, committed, and read.

## Core Rule

**When a procedure hands control to a person in the middle, every step after the handover
and before the thing they came to do will eventually be skipped - not through carelessness,
but because the button is right there and they have just finished the hard part. Do not
answer this with a louder instruction. Move the step to before the handover, or make the
default correct so the step is unnecessary.**

The procedure was right. It was followed for Snake by the same person on the same
afternoon. It still failed, because a step's survival depends on where it sits, not on how
clearly it is written.

## What the order actually is

```
D14 says      fill  ->  upload  ->  SHAPE  ->  publish LAST
what happens  fill  ->  upload  ->  publish
                        ^^^^^^      ^^^^^^^
                        the one step that CANNOT be automated - a native
                        file picker cannot be driven - so it hands over
                                    |
                                    and the publish button is the next
                                    thing that person sees
```

The shaping step is not merely between two others. It is between **a handover** and **the
irreversible action the whole session was for**. That is the weakest position a step can
occupy, and it is where a procedure naturally puts it, because shaping genuinely does need
the file to exist first.

## Why "be more careful" is the wrong fix, twice over

It failed once already. Newgrounds' own default is 640 x 480 and itch's is 640 x 360, so
**both platforms ship a wrong answer as the default** and the only thing standing between
that default and a live clipped listing is a person remembering one step while looking at
the button. A procedure that only works when nobody is pleased to be finished is not a
procedure.

## The two fixes that actually move the step

1. **Set it before the handover, if the field will hold a value.** On Newgrounds
   `option[filewidth_2]` and `option[fileheight_2]` are **present in the creation form's
   DOM before any file exists**, merely hidden. If a pre-upload value persists, the listing
   is already shaped when the person arrives and the fragile step is gone.
   **UNVERIFIED** - nobody has tested whether it survives a reload, and the only honest
   test is the next listing. It is written down as a test to run, not as a fact.
2. **If it cannot move, put the recovery in the same breath as the handover.** Not "then
   tell me and I will check" - a specific, cheap, after-the-fact repair, said before they
   go: *publish if you like, and I will fix the frame and republish.* Which is exactly what
   happened here, and it cost one republish rather than a bad listing.

## The repair is not the same as the prevention

The frame was corrected to 800 x 900, touchscreen ticked, republished, and **verified on
the live iframe rather than the form** - 800 x 900, with the bundle measured at that exact
size reporting `scrollHeight 900, clientHeight 900, overflow 0`. That closes the instance.
It says nothing about the next listing, which is why this file exists.

## When to Apply

- Writing any handover checklist where a person does step N and the payoff is step N+1
- Reviewing a procedure that failed while being followed - ask where the step SAT, before
  asking whether it was read
- Any platform whose default for a presentation field is wrong for us
- Before saying "I told them to wait"

## The tell

A checklist step that begins "then, before you publish..." addressed to someone who is
already looking at the publish button.

## Related

- [`a-build-gate-that-never-runs-the-artifact.md`](a-build-gate-that-never-runs-the-artifact.md)
  - the sibling that says load it before it leaves; this one says the loading step has to
  survive being scheduled.
- [`verify-the-deploy-target-not-just-the-run.md`](verify-the-deploy-target-not-just-the-run.md)
  - verify the artifact, not the intent. The frame size was verified on the live iframe for
  exactly that reason.
- [`a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md`](a-survey-of-their-artifacts-is-not-a-prediction-about-yours.md)
  - the other trap from the same session.
