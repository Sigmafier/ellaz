# The Juice Map — every sound, buzz and effect, and exactly where it fires

> **The lab is at [`https://ellaz.fun/#/lab`](https://ellaz.fun/#/lab)** (locally:
> `npm run dev` → `http://localhost:5180/#/lab`). Every sound, beside the
> alternatives. Tapping one picks it AND plays it through the real audio port,
> so what you hear is what a game will play. Picks live on the device and the
> app reads them on the next tap; "back to shipped" is on every card.
>
> A fragment route on purpose — a fragment never reaches the server, so the lab
> needs no emitted page, is in no sitemap, and no crawler can see it.

Measured off the tree on 2026-08-13, not recalled. Counts come from
`grep -rho 'play("<name>")' src/`, so they go stale the moment a game is added —
re-run the greps at the bottom rather than trusting the numbers here.

Companion: [`juice-lab.md`](juice-lab.md) is the past-tense record of the
tournament that chose six of the eight sounds. This file is the present-tense
inventory of what is actually wired.

---

## Part 1 — The nine sounds

All nine are synthesised at runtime from `src/sdk/voice.ts` (pure data, no
WebAudio) and rendered by `src/sdk/voiceEngine.ts`. Zero audio assets, zero
network. `src/sdk/audio.ts` is the only table mapping a name to a spec.

**All nine were re-picked on 2026-08-13**, from the lab's strips, with the names
showing. Every row below changed that day.

| Sound | What it is, in one line | Call sites | Verdict |
|---|---|---|---|
| **tap** | "Tick" — a 3 ms click above 5.2 kHz over a sine lifting a fourth, 34 ms | 22 (+2 conditional) in 18 files | picked **over** a blind winner |
| **success** | "Wood run" — three rising notes on tuned wood, a major triad, 220 ms | 12 in 11 files | picked **over** a blind winner |
| **win** | "Ladder" — six notes climbing a pentatonic scale to the octave, 420 ms | 1 (`winMoment`) | picked **over** a blind winner |
| **fail** | "Two steps down" — two soft sines, the second a whole tone below and delayed | 8 in 8 files | picked **over** a blind winner |
| **coin** | "Drop in" — a coin landing in a jar: strike, note, fifth, one faint partial | 1 (`winMoment`) | picked **over** a blind winner |
| **star** | "High bar" — three notes of high tuned wood, less glassy, 1.6 s tail | 1 (`winMoment`) | picked **over** a blind winner |
| **pop** | "Pock" — a 4 ms click above 4.2 kHz, a sine gliding up an octave, a Q 6 cavity | 10 in 9 files | picked (replaced Cork, itself a pick) |
| **flip** | "Whoosh" — a noise sweep 700→4200 Hz, then a sine landing 85 ms behind | 2 (memory, tictactoe) | **first verdict it has ever had** |
| **streak** | "Glass" — one bright note, played transposed up the ladder | 0 — nothing calls it yet | first verdict, picked at the **top** rung |

### Two true sentences that sound like they contradict each other

"Shutter won the tournament" and "tap is Tick" are both correct, and somebody
will eventually cite the first one. So the record keeps them apart:

- **A blind round** (2026-08-02) hid the names and asked which sounds better with
  nothing else to go on. Six sounds won one.
- **A named pick** (2026-08-13) showed the names and asked which one belongs in
  this app. All nine got one, and six of them overrode the earlier result.

The second question is the one that ships, and it is allowed to disagree.
`VERDICT` and `OVERRODE_BLIND` in `src/lab/voices.ts` record which is which; the
card badge reads *"picked over a blind winner"* for those six and *"picked, not
a blind round"* for the other three. Collapsing the two is how a preference gets
remembered as a result — the exact mistake `docs/juice-lab.md` documents.

**Nothing was deleted.** All nine superseded specs live verbatim in
`src/lab/previous.ts` and remain playable arms in their own strips.

### The one that had never been compared to anything

`flip` and `pop` were the **pre-tournament** sounds — single oscillators with no
per-partial damping, no inharmonicity and no room, the three things `voice.ts`
calls the difference between "designed" and "synthesised". `pop` is the second
most-played sound in the app (the balloon, the bee, the block, the brush, the
frog, the flag, every shop purchase) and was one 320 Hz square wave.

It went square → **Cork** → **Pock** inside a single day. Cork was the first
thing clearly better than a square; Pock is the same idea built from the measured
recipe rather than dialled in by ear. Both are still in the strip, and
`pop-square` is the reason the control-arm rule got written down — it was the
only "was" arm holding its own literal when all nine voices moved, so it was the
only one that did not silently become a duplicate of its own replacement.

### A partial nobody can hear was making the browser complain

`star` on tuned wood asks for **26,634 Hz** on its top note (E6 × 10.1 × the
octave), which no sample rate can represent. WebAudio clamped it and logged
`value outside nominal range` on every star. `voiceEngine` now skips any layer
that spends its whole life above Nyquist — measured: **8 oscillators instead of
9, and zero warnings**. Nothing audible changed, because nothing up there was
audible. The predecessor had the same wart at 22,151 Hz.

### Where each one fires

**tap** — balloons (miss), bees (butterfly, the neutral one), blocks (drop),
bubbles, coloring (palette), hidden (miss), minesweeper (reveal), reaction (×3),
sequence (wrong pad), shadows (wrong), sortsize (×2), tictactoe (place), vanish,
wordguess (×2), sudoku (clearing a cell), **Home** (every card), **Boards** (×2).

**pop** — balloons (hit), bees (hit), blocks (line clear), bubbles (pop),
coloring (fill), frog (jump), minesweeper (flag), tictactoe, sudoku (entering a
digit), **World** (buy, and equip).

**success** — blocks, finddiff, hidden, math, memory (pair), n2048 (merge),
reaction, sequence, shadows, snake, sortsize (×2), wordguess (any hit).

**fail** — blocks, finddiff, math, minesweeper (mine), n2048, snake, tictactoe,
wordguess.

**flip** — memory (card turn), tictactoe.

**win / star / coin** — `src/shared/winMoment.ts` only. No game plays these
directly, by design.

### The streak ladder — built, playable, wired to nothing

`streak` is the only voice here that is **heard transposed**. `src/sdk/streak.ts`
alone decides which rung a run of correct answers has reached; a game reports how
many in a row and never picks a pitch. Third policy port of the same shape as
`economy.ts` (a reason in, coins out) and `score.ts` (a unit in, a direction out).

| | |
|---|---|
| First rung | the **3rd** consecutive correct answer. Below that, the ordinary `success` sound |
| The ladder | C major pentatonic, ten rungs: `0 2 4 7 9 12 14 16 19 21` semitones |
| At the top | it **holds**. It never drops back to the bottom |
| On a miss | the game resets its own count; the ladder is stateless |

Three decisions worth not re-deriving. **Pentatonic, not diatonic**: a leading
tone makes an ascending line *beg* for the next step, and building that pull
deliberately for five-year-olds is not something this platform does. Every rung
is consonant with every other, so a child who stops at four hears something
finished. **It caps rather than resets**, because dropping a long run back to the
first rung tells a child who is doing well that they are suddenly a beginner
again. **`streakStep` returns `undefined`, never 0**, for "too short to count" —
0 is a real rung, so the two answers must not be spellable the same way, or the
ladder fires on every single correct answer.

Measured in a browser at the audio layer on **2026-08-13, after the timbre moved
to Glass** — the earlier reading of this table was taken on Tine and is no longer
what plays. Thirteen taps:

| Tap | 1–2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hz | 523 | 519 | 583 | 657 | 788 | 877 | 1042 | 1178 | 1322 | 1553 | 1756 | 1773 |
| Partials | **9** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |

The **partial count is the better evidence than the pitch**. Taps 1 and 2 draw
nine oscillators — that is Wood run, three bar partials across three notes, the
ordinary `success` sound firing because the run is below the floor. From the
third tap on it is four, which is glass's partial count. Two different voices,
distinguishable without hearing either.

Taps 12 and 13 are the same rung (21 semitones, 1760 Hz) with different jitter:
the cap holding, not wrapping. The card agrees in words — *"21 semitones up — the
ladder holds here, it never drops back"* — and the tier reads **Amazing**.

**Nothing calls it.** Wiring it into a game is a separate change: the game owns
the run count, and `math` (which already tracks a streak in `streakRef`) is the
obvious first one.

**Praise words exist as a tier and say nothing yet.** `streakTier()` returns
`good` / `great` / `amazing` — three tiers and not ten, because this is the half
that has to be translated into eleven languages and still sound natural to a
child. The ladder carries the escalation on its own in every language on earth.
Nothing speaks them, and speech in this app is supplementary by hard rule.

### One game makes its own sound

`echo` uses `ctx.audio.tone()` rather than the named palette — it plays actual
pitches, because the game *is* the pitches. `src/shared/notes.ts` holds them.
It is the only such game.

---

## Part 2 — The win moment, as a timeline

`winMoment()` is the canonical win. Order is load-bearing: it grants and
persists first, and everything below is wrapped in try/catch so a thrown
animation can never cost a child a coin.

```
   0 ms   grant coins + stars, persist, record the score      (NOT cosmetic)
   0 ms   ▶ win        the sweep-and-land chord
   0 ms   ⌇ haptic.win  [20, 40, 20, 40, 60]
   0 ms   ✦ celebrate() 60 confetti pieces, 1.6-2.8 s fall     (unless confetti:false)
   0 ms   ✦ flyTo()     up to 12 coins arc to the wallet chip, 620 ms
 450 ms   ▶ star       — only if the win earned a star
 620 ms   ▶ coin       — only if it paid coins; ONE coin, not one per coin
```

Two things about this that are **decisions nobody ever judged**, written down so
they are not mistaken for tournament results:

- **The 450/620 stagger.** Chosen so a level completion reads as a short phrase
  rather than three sounds in a pile. Never ranked.
- **One coin sound per win.** The guided round that would have chosen the
  coin-flight behaviour (silent arrival / a sound per landing coin / that plus
  the wallet chip bouncing) was **never run** — 0 of 6 guided brackets were. One
  sound is the conservative reading, because a per-coin variant at 12 coins is a
  machine-gun nobody has heard.

`COIN_LAND_MS = 620` deliberately tracks `flyTo`'s own flight time. If one moves
the other must follow, or the coins land silently and chime a quarter-second
later.

---

## Part 3 — The four haptics

`src/juice/haptics.ts`. `navigator.vibrate` is Android-Chrome only (~77%);
silent no-op on iOS and Firefox. Progressive enhancement, never load-bearing.

| Name | Pattern | Fires on |
|---|---|---|
| `haptic.tap()` | `10` | 22 sites — every tap, and several *successes* (see below) |
| `haptic.success()` | `[12, 30, 12]` | 10 sites |
| `haptic.win()` | `[20, 40, 20, 40, 60]` | `winMoment` only |
| `haptic.fail()` | `90` | **2 sites only** — math, minesweeper |

**The inconsistency**: `fail` plays in 8 games; `haptic.fail()` in 2. And
several games buzz `haptic.tap()` on a *success* — bees on a hit, blocks on a
line clear, reaction on a correct hit. Neither is a bug that breaks anything;
both mean the buzz and the sound disagree about what just happened.

---

## Part 4 — The five visual effects

`src/juice/effects.ts`, framework-neutral so any renderer can call them.

| Effect | Default | Where |
|---|---|---|
| `burst(x, y)` | 14 particles, **190 px** spread, colours read off `--spark-colors` | 20 sites, counts hand-authored 5–16 |
| `celebrate()` | **140** confetti, falls 1.6–2.8 s, colours from `--confetti-colors` | `winMoment` only |
| `shake(el)` | 6 px, 240 ms, decaying | 18 sites — the universal "no" |
| `flyTo(from, target)` | up to 12 coins, 620 ms arc, staggered 55 ms | `winMoment` only |
| `popEl(el)` | one-shot CSS class, default `ellaz-pop` | wallet chip, World scene, World plate |

Plus `src/juice/shell.ts` — `attachShellJuice()`, delegated from one listener,
giving the Home grid press-depth (scale 0.94, 90 ms), a ripple at the finger,
and a haptic. Home plays its tap sound through its own handler, **deliberately
not** through `attachShellJuice`, because passing both fires on `pointerdown`
and again on `click`.

Every effect except sound no-ops under `prefers-reduced-motion`. `flyTo` degrades
to coins appearing at the wallet and fading, rather than to nothing.

**Three of these are tunable from the lab**, stored at `ellaz:juice:v1` and read
by `src/juice/tuning.ts`. Picking a value saves it and previews it, the same
contract the sound strips have.

All four rows were re-picked on **2026-08-13**. Two moved and two came back
unchanged, which is worth recording rather than reading as "those were skipped":

| Tunable | Reaches | Was | Shipped |
|---|---|---|---|
| `confetti` | **everything** — `winMoment` calls `celebrate()` with no count | 60 | **140** |
| `burstSpread` | everything | 90 px | **190 px** |
| `shakePx` / `shakeMs` | **everything** — all 18 sites take the defaults | 6 px / 240 ms | 6 px / 240 ms — re-chosen, unchanged |
| ~~burst count~~ | **nothing.** 20 sites pass their own count (5–16), and an explicit argument beats a default, as it must | per game | per game |

Measured in a fresh browser context with nothing stored: a win draws **140**
pieces, and all four lab rows mark 140 / 6 / 240 / 190 as shipped. Earlier, with
24 picked, the same button drew **24** and after "back to shipped" **60** — the
control both ways, on the version where 60 was the default.

That last row is the honest limit rather than an oversight: tuning burst counts
globally would mean deleting twenty deliberate per-game decisions. The store
**clamps** rather than dropping — unlike `voiceOverride`, which refuses what it
does not like — because the worst a bad number here can do is draw odd confetti,
where the worst a bad voice can do is play something loud next to a child's ear.

Colours are read off CSS custom properties at call time, with a hardcoded
fallback — so confetti follows the theme without `@juice` importing React or a
palette module, and never renders invisible.

---

## Part 5 — Where there is NO feedback at all

Not bugs. Gaps, listed so a choice about them is deliberate.

| Moment | Today |
|---|---|
| Opening a game | silent |
| Changing difficulty | silent |
| Starting a level / new round | silent |
| Resuming a saved board | silent, **by design** — no dialog, no reading |
| Refusing a purchase (can't afford / locked) | shake only, **by design** — a refusal is not an error |
| Earning a star with no coins | star at 450 ms, nothing at 0 |
| A streak building | silent until the milestone |
| Backup code confirmed / restore complete | shake on failure only |
| Leaderboard record beaten mid-run | silent until `personal_best` fires |
| Level *failed* in a non-endless game | `fail` in 8 of 23 games |

---

## Part 6 — The honest list of what was never judged

**Every sound now has a verdict** — that line was the top of this list until
2026-08-13 and is no longer true. What remains:

1. **No sound has been blind-judged since 2026-08-02.** All nine current voices
   were picked with the names showing, which is the weaker kind of verdict. Six
   of them overrode a blind winner; if any of those needs re-litigating, the
   predecessor is still a playable arm in its own strip.
2. **The streak ladder** — the shape (pentatonic, 10 rungs, first on the 3rd,
   capped at the top) is argued from research, not judged. Only the **timbre**
   was picked. And nobody has heard it in a real game, because nothing calls it.
3. **The praise words** — `good` / `great` / `amazing` exist as a tier and are
   spoken by nothing.
4. **The coin-flight behaviour** — one sound vs one per coin vs chip bounce.
5. **The 450/620 stagger** in the win moment.
6. **Every `burst` count and colour** — hand-authored per game, 5 to 16, and the
   one thing the lab cannot retune.
7. **Every haptic pattern** — the four arrays have never been compared to
   anything, and they are the only thing in the lab that is still play-only.

Items 4–7 are *comparable* rather than merely listed: confetti, shake and burst
spread have strips. The haptics still only play.

And one measured defect nobody has fixed: **the first tap of a session plays
about 5 dB quiet.** The gesture that unlocks audio is the same gesture that
plays the sound, so the level-match trim does not exist yet when it fires. Once
per session, quieter rather than louder.

---

## Re-deriving these numbers

```bash
# call sites per sound
for s in tap pop success fail flip win star coin streak; do
  printf "%-8s %2d\n" "$s" "$(grep -rho "play(\"$s\")" src/ | wc -l)"
done

# non-literal call sites the loop above misses
grep -rn 'audio\.play(' src/ --include=*.ts --include=*.tsx | grep -v 'play("'

# haptics and visuals
grep -rn 'haptic\.' src/games src/portal src/shared
grep -rn 'burst(\|shake(\|popEl(\|celebrate(\|flyTo(' src/games src/portal src/shared
```
