# How the app FEELS - the sounds, and the lab that chose them

<!-- Extracted VERBATIM from CLAUDE.md on 2026-08-29, when CLAUDE.md was 164,867 chars
     and over Claude Code's 150,000-char per-file limit. Nothing was reworded; the text
     below is byte-identical to what CLAUDE.md held at commit 2218aa0 (only relative
     link targets gained a ../, because this file sits one directory down), and
     `npm run assert:context` proves it. CLAUDE.md now points here instead of
     carrying this on every single turn of every session. -->

## How the app FEELS — the sounds, and the lab that chose them

**The sound lab is at `#/lab`, and it is reachable in production** —
`https://ellaz.fun/#/lab`, or `http://localhost:5180/#/lab` under `npm run dev`.
It is the gallery: every sound the app plays beside the alternatives, the win
moment playable end to end, and every visual effect and haptic on a button.
`docs/juice-map.md` is the written inventory — what each sound is, where it
fires, and the honest list of what was never judged.

**Tapping a candidate PICKS it and plays it through the real `audioPort`**, so
what you hear is what a game will play — not a preview that can disagree.
The pick is a whole `VoiceSpec` in `localStorage` (`ellaz:voice:v1`), because
the candidate specs live in the lab's own chunk that a child's device never
downloads. `src/sdk/voiceOverride.ts` is the gate on the way back in, and it is
the strictest one in this app: every other stored blob decides what a screen
SHOWS, this one decides what a synthesiser DOES next to a child's ear. It
validates rather than coerces — unlike `migrateProfile`, which salvages junk on
purpose — and anything it does not fully like is DROPPED, falling back to the
built-in, which is the same answer as "nothing was ever picked". Gain is the one
exception: it is scaled down as a whole rather than refused, so a slightly-loud
pick stays picked and stays safe.

Measured on the artifact 2026-08-13: the lab is **9,715 B gz in its own
`lab-*` chunk**, referenced 0 times in `index.html` and absent from the precache
manifest, while sibling `.js` chunks are precached — which is the positive
control proving the `globIgnores` entry is doing the work rather than the glob
missing it. First visit **89,164 B gz of 90,000**, 836 spare. Adding it was the
documented three changes: the dynamic import, the named `manualChunks` branch,
the `globIgnores` entry. `src/lab/**` matches none of the other `manualChunks`
rules, so without its own branch it falls to `return undefined` and lands in the
ENTRY chunk, shipped to every child with no `lab-` name for anything to match.

**All nine sounds were re-picked on 2026-08-13, and six of them overrode a
blind-tournament winner.** tap is **Tick**, pop is **Pock**, correct is **Wood
run**, wrong is **Two steps down**, coin is **Drop in**, star is **High bar**,
flip is **Whoosh**, streak is **Glass**. Every one was chosen from its own strip
of 5–8 arms with the names showing.

**win is the exception and it moved by a THIRD route.** It is **Fanfare** since
2026-08-27 — four announced notes on tuned wood, a major triad to the octave —
replacing Ladder on the operator's instruction, *"a faster fanfare"*, with
nothing compared. Its verdict reads **`directed`** rather than `picked`, which
is a fourth state added to `Verdict` that day for exactly this: an instruction
is weaker evidence than a strip, not stronger, and the type's own doc says a
distinction it cannot spell is a distinction that disappears. Ladder is still an
arm, as a literal in `src/lab/previous.ts`.

**The speed was a sequencing fix, not only a taste one.** `winMoment` plays a
phrase — fanfare, then the coins, then the star — and it spaces them off
`voiceBodyMs(WIN)`, so a long win voice pushes everything behind it. Ladder was
six notes 62 ms apart over a 420 ms fundamental: **961 ms of body**, against a
coin chime hardcoded at 620, so the coin fired *inside* the win. Reported as
*"the sound of success after winning and then right away the sound of coins
sounds bad"*, and it had been true of every win in every game since both voices
were wired. **`WIN_PHRASE` in `src/sdk/voice.ts` is derived now** — body + 220
for the coin, + 260 more for the star — and `winMoment` hands the coin time to
`flyTo` as its FLIGHT time, so the picture and the sound are the same number
rather than two numbers that agree today. Measured: body 961 → 520, coin 620 →
740, star 450 → 1000 and now last rather than on top of the chord.

Nothing could have caught it. Every voice was a valid spec, every gain sum
cleared the clipping floor, every duration cleared the jingle ceiling, and the
defect lived in the RELATIONSHIP between two constants in two files — the shape
that has no line number. `src/shared/winPhrase.test.ts` asks the only question
that matters (has the win voice STOPPED before the next sound starts), derived
on both sides so a re-voice moves the answer instead of invalidating it; 7
mutations planted, 7 killed, one of them restoring Ladder.

**`scripts/repro/repro-win-phrase-has-air.mjs` is the half no source test can
reach**, because `voiceEngine` schedules every partial itself, drops any that
lives above Nyquist, level-matches in an offline render and adds reverb — a
phrase correct on paper can still come out smeared. It hooks every scheduled
source in a real browser and reads where they cluster: **win −20..519 ms, coin
729, star 990, 209 ms of air**. Its `--control` puts 450/620 back in the same
build and the run reports **two events instead of three** — the coin and the
star merging at 430 ms while the fanfare rings to 510, which is the complaint
measured rather than described.

**Its instrument was wrong twice first, and both readings looked like answers.**
Clustering ONSETS reported 498 ms of air with the defect forced on, because the
fanfare's four notes start within 132 ms and then ring for another 390 — so it
hooks `stop()` as well and the audible end is measured, not inferred. And the
CONTROL's own star was still ringing when the measurement began, adding eight
partials to the win event and reading 45 ms of air on a correct build. Both were
caught by the positive control rather than by reading the probe:
[`a-diagnostic-that-truncates-what-it-compares.md`](../.claude/rules/a-diagnostic-that-truncates-what-it-compares.md).

**The lab held a SECOND copy of the tempo** — `450` and `620`, typed again in
`Lab.tsx`'s win-moment demo — on the one screen whose whole job is to say what a
game will play. Both read `WIN_PHRASE` now, and the pin scans both sources for a
`setTimeout` scheduled off a bare number, with a control that reds if the
matcher stops finding timers at all.

**`flyDurationMs` is why reduced motion is not quietly wrong.** `flyTo` refuses
to travel under `prefers-reduced-motion` and the coins simply appear, in 260 ms,
so `winMoment` holds the LAUNCH back by the difference and the picture still
meets the sound. The old hardcoded 620 was right for most players and off by a
third of a second for the ones most likely to be leaning on the sound.

**"Shutter won the tournament" and "tap is Tick" are both true**, and somebody
will eventually cite the first. A blind round (2026-08-02) asked which sounds
better with nothing else to go on; a named pick asks which belongs in this app,
and the second question is the one that ships. `VERDICT` and **`OVERRODE_BLIND`**
in `src/lab/voices.ts` record which is which, and the card badge says *"picked
over a blind winner"* for those six. Collapsing the two is how a preference gets
remembered as a result — the exact mistake `docs/juice-lab.md` records.

**Nothing was deleted: all nine predecessors live in `src/lab/previous.ts`** and
remain playable arms. That file exists because of a trap this repo had already
documented once and still nearly shipped: every "was" arm was written as the
shipped CONSTANT (`TAP`, `SUCCESS`, `WIN`…), which is correct exactly until the
constant moves. When all nine moved at once, each of those arms would have
silently become a second copy of its own replacement — two buttons per strip
playing an identical sound, one labelled with the old name, and every test still
green because a duplicate spec is a valid spec. `pop-square` was the only arm
holding its own literal (written out longhand when Cork was promoted) and so the
only one that survived. **A control arm must be a literal, never an import.**
`voices.test.ts` now fails on any two arms in a strip that are byte-identical;
mutation-proven by restoring the pre-fix line.

**A partial nobody can hear was making the browser complain.** `star` on tuned
wood asks for 26,634 Hz on its top note, above Nyquist at any sample rate, so
WebAudio clamped it and logged `value outside nominal range` on every star.
`voiceEngine` now skips any layer that spends its whole life above `sampleRate/2`
— measured on the artifact: **8 oscillators instead of 9, zero warnings**, and
nothing audible changed because nothing up there was audible.

**The streak ladder exists, is playable, and nothing calls it.**
`src/sdk/streak.ts` is the third policy port after `economy.ts` and `score.ts` —
a game reports how many correct in a row and never picks a pitch. First rung on
the **3rd**, C major pentatonic (`0 2 4 7 9 12 14 16 19 21`), and it **caps** at
the top rather than resetting, because dropping a long run back to the bottom
tells a child who is doing well that they are suddenly a beginner again.
Pentatonic and not diatonic on purpose: a leading tone makes an ascending line
*beg* for the next step, and building that pull deliberately for five-year-olds
is not something this platform does. `streakStep` returns **`undefined`, never
0**, for "too short to count" — 0 is a real rung, so the two must not be
spellable the same way or the ladder fires on every correct answer. Measured at
the audio layer after the timbre moved to Glass: 523 Hz on the first two taps,
then 519 → 1756, and 1773 on the thirteenth — the same rung, jittered, the cap
holding. **The partial COUNT is the better evidence than the pitch**: taps 1–2
draw nine oscillators (Wood run, three bar partials across three notes — the
ordinary `success` sound below the floor) and every tap after draws four, which
is glass. `streakTier()` returns `good`/`great`/`amazing` and **nothing speaks
them**.

**Confetti and burst spread are now 140 and 190 px** (`ellaz:juice:v1`,
`src/juice/tuning.ts`), both picked in the lab on 2026-08-13; shake was
re-chosen and came back unchanged at 6 px / 240 ms, which is worth recording
rather than reading as "that one was skipped". The honest limit: **burst COUNT
is not tunable**, because 20 sites pass their own hand-authored 5–16 and an
explicit argument beats a default. Unlike `voiceOverride` this store **clamps
rather than drops** — the worst a bad number here does is draw odd confetti.
Measured in a fresh browser context with nothing stored: a win draws **140**
pieces and the lab marks 140 / 6 / 240 / 190 as shipped.

**A control that stops controlling is worse than no control.** `tuning.test.ts`
proved `clearTuning` by saving `confetti: 140` and asserting the result equalled
shipped — fine until 140 *became* shipped, at which point the save was a no-op
and the assertion passed whether or not `clearTuning` did anything, with nothing
in either diff to show it. It now derives a value that cannot collide and
asserts the setup changed something before asserting the teardown undid it.

**Level-matching now keys on CONTENT, not object identity.** `voiceEngine`'s
trim cache was a `WeakMap<VoiceSpec, number>`, which is right for eight module
constants and wrong for a voice read from storage: every parse mints a fresh
object, so the trim was missed on every re-read and the picked voice played
unmatched against the palette it was being compared to — ruining the one
comparison the lab exists to make.

**The Juice Lab that came before it is gone.** It was a dev-only `#/lab`
tournament — 45 physics-synthesised sound characters, six blind ranking rounds —
and it always carried a kill date: the winners land, `src/juice/lab/` is deleted
in that same commit. That happened on 2026-08-08 in `ae4df64`. Its four unused
partial tables (bell, bar, wood, soft) were recovered into `src/lab/modes.ts`
rather than into `@sdk/voice`, since a mode nothing plays yet must not be paid
for by a first visit; `struck()` takes a partial set directly so the lab reaches
the SAME damping law instead of keeping a second copy of the physics.

**`src/sdk/voice.ts` holds the eight voices it chose**, as pure data (no
WebAudio, so it unit-tests in node), and `voiceEngine.ts` is the only place that
touches audio nodes. `sdk/audio.ts` is unchanged as an interface — all 41
`play()` call sites were untouched by the swap.

**All eight are NEW. The recorded verdict said otherwise and it was wrong.** A
memory note claimed coin and wrong "were won by the sounds already shipped", with
a warning not to change them. `brackets.ts` said the opposite outright — *"the
palette deliberately reuses the LEAN specs as its control characters"* — every
`*-current` character referenced `LEAN.*` and none referenced `CONTROL.*`, so the
control arm was the lab's own unshipped design and `coin-current`'s blurb "what
the lab plays right now" meant the **lab**. Following the note would have wired a
320 Hz square for coin and left a sawtooth buzz for wrong. `voice.test.ts` pins
the correction so nobody restores the old sounds on a note's authority.

The transferable half: **a verdict recorded as "the control won" is ambiguous
unless the record also says WHAT THE CONTROL WAS.** Record the spec identifier,
never the word "control".

**coin and star had no wiring at all** before this — no `SfxName` member, a
silent coin flight, nothing on a star. Both now fire from `winMoment` staggered
behind the win fanfare — read the numbers off `WIN_PHRASE`, not off this line,
which carried 450/620 for as long as those were hardcoded — so a level
completion is a short phrase rather than three sounds in a pile. **That
sequencing is not a tournament result**: the guided round that would have chosen
the coin-flight behaviour was never ranked, so one coin plays per win — the
conservative reading of a question nobody answered.

**Level-matching ships with the engine.** Each voice is rendered offline once and
trimmed to a common peak, because the operator judged all six AT matched
loudness; untrimmed, a reverbed star against a 60 ms tap is roughly a 4× peak
difference. Measured on the live artifact: every voice lands within 6% of target.
**Except the first tap of a session**, which plays ~5 dB quiet — the gesture that
unlocks audio is the same gesture that plays the sound, so the trim does not
exist yet. Once per session, quieter not louder.

**`Home.tsx` had zero juice and zero sound** when the lab was built; it now
attaches `attachShellJuice` for press depth, a ripple and a haptic —
deliberately **without** `playTap`, because Home already plays tap through its
own handler and passing both fires on `pointerdown` and again on `click`.

**The modulepreload trap the lab cost us is still live for any lazy chunk**, and
it is the reason `build:check` exists in this shape. Keeping a dev-only chunk off
a child's device needs **four** things: the route branch behind
`import.meta.env.DEV`, the chunk carved out with a named `manualChunks` prefix,
that prefix in the PWA `globIgnores` — and the `lazy(() => import(...))` **at
module scope itself behind `import.meta.env.DEV`**. Without the fourth, the first
three are all true and Vite still writes a `<link rel="modulepreload">` into
`index.html`, so every child eagerly downloads it on first paint. It was live on
ellaz.fun until 2026-08-03. Verify with `npm run build:check`, never by reading
the code — the greps that missed it were each individually correct.

The blind protocols, the ethical line the lab declined to cross, the damping law
that made the sounds stop reading as synthetic, and what the tournament cost:
[`docs/juice-lab.md`](../docs/juice-lab.md), now a past-tense record.
