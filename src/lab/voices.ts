// The gallery - every sound the app makes, beside the alternatives nobody has
// heard yet. Pure data: no WebAudio, no DOM, so it unit-tests in node exactly
// like `@sdk/voice` does.
//
// TWO THINGS THAT ARE NOT DECORATION:
//
// 1. The SHIPPED voice is in every strip, as an ordinary entry. It is the
//    control arm. "The new one is better" has to be a claim that can come back
//    false, and it cannot be if the current sound is not in the running. The
//    old lab got this right and then recorded its verdict as "the control won",
//    which turned out to be ambiguous a week later because nobody had written
//    down WHAT the control was. So every entry here names its own spec, and the
//    shipped ones are marked `shipped: true` rather than called "current".
//
// 2. Candidate IDS ARE PERSISTED in the operator's pick. Never rename one,
//    never reuse one for a different sound - the same rule the shop item ids
//    and the name-pool word ids carry, for the same reason.
//
// ALL NINE WERE PICKED ON 2026-08-13, from these strips, with the names
// showing. Six of them (tap, correct, wrong, win, coin, star) replaced a
// blind-round winner from 2026-08-02; `pop` replaced Cork, itself picked hours
// earlier; `flip` and `streak` had never been judged at all. `VERDICT` and
// `OVERRODE_BLIND` at the bottom of this file record which is which, because a
// blind result and a named preference are different strengths of evidence and
// the earlier one is still real.
//
// Every superseded voice stayed in its strip, and they live in `./previous`
// rather than here - see that file's header for why a control arm must be a
// literal and can never be an import of the shipped constant.

import {
  COIN,
  FAIL,
  FLIP,
  POP,
  STAR,
  STREAK,
  SUCCESS,
  TAP,
  WIN,
  mallet,
  run,
  struck,
  type VoiceSpec,
} from "@sdk/voice";
import {
  PREV_COIN,
  PREV_FAIL,
  PREV_FLIP,
  PREV_POP,
  PREV_STAR,
  PREV_STREAK,
  PREV_SUCCESS,
  PREV_TAP,
  PREV_WIN,
} from "./previous";
import type { SfxName } from "@sdk/types";
import {
  A4,
  B5,
  BAR,
  BELL,
  C4,
  C5,
  C6,
  E5,
  E6,
  G4,
  G5,
  SOFT,
  WOOD,
} from "./modes";

export interface Candidate {
  /** PERSISTED. Never rename, never reuse. */
  id: string;
  name: { he: string; en: string };
  /** One line on what it is meant to feel like. */
  blurb: { he: string; en: string };
  spec: VoiceSpec;
  /** True for the voice the app plays today. Exactly one per event. */
  shipped?: boolean;
}

const c = (
  id: string,
  he: string,
  en: string,
  bhe: string,
  ben: string,
  spec: VoiceSpec,
  shipped = false,
): Candidate => ({
  id,
  name: { he, en },
  blurb: { he: bhe, en: ben },
  spec,
  shipped,
});

// ---------------------------------------------------------------------------
// tap - the most-played sound in the app
// ---------------------------------------------------------------------------

const TAPS: Candidate[] = [
  c(
    "tap-tick",
    "טיק",
    "Tick",
    "קליק זעיר וחד, 30 מילישניות",
    "A tiny hard click, 30 ms",
    TAP,
    true,
  ),
  c(
    "tap-shutter",
    "תריס (היה)",
    "Shutter (was)",
    "לחיצה כפולה מכנית. ניצח בסבב עיוור, הוחלף ב-13.8",
    "A mechanical double-click. Blind winner, replaced 13 Aug",
    PREV_TAP,
  ),
  c(
    "tap-wood",
    "עץ",
    "Wood tick",
    "טוק יבש וקצר, בלי הד",
    "A dry short tock, no ring",
    struck(G5, 55, WOOD, {
      gain: 0.16,
      damp: 1.1,
      jitter: 0.8,
      space: 0.06,
      tail: 0.25,
      mallet: 0.05,
      malletHz: 2600,
    }),
  ),
  c(
    "tap-glass",
    "זכוכית",
    "Glass tick",
    "נקישה בהירה וקטנטנה",
    "A tiny bright ping",
    struck(C6, 70, "glass", {
      gain: 0.13,
      damp: 1,
      jitter: 0.9,
      space: 0.12,
      tail: 0.4,
      warmth: 11000,
    }),
  ),
  c(
    "tap-soft",
    "רך",
    "Soft thumb",
    "נגיעה עמומה, כמעט בלי גובה",
    "A muted touch, barely pitched",
    struck(A4, 60, SOFT, {
      gain: 0.2,
      damp: 0.9,
      jitter: 0.6,
      space: 0.05,
      tail: 0.2,
      warmth: 4200,
      mallet: 0.04,
      malletHz: 900,
    }),
  ),
  c(
    "tap-click",
    "קליק",
    "Bare click",
    "רק הרעש של המכה, בלי צליל",
    "Only the striker, no note",
    {
      freq: 2000,
      ms: 30,
      jitter: 1.2,
      space: 0.04,
      tail: 0.2,
      warmth: 12000,
      layers: [mallet(0.16, 6, 3400)],
    },
  ),
  c(
    "tap-pad",
    "כרית",
    "Pad",
    "נגיעה עגולה ונמוכה, כמעט בלי קליק",
    "A round low touch, almost no click",
    struck(C4, 90, SOFT, {
      gain: 0.21,
      damp: 0.75,
      jitter: 0.5,
      space: 0.1,
      tail: 0.35,
      warmth: 3200,
    }),
  ),
];

// ---------------------------------------------------------------------------
// pop - PICKED 2026-08-13, not blind-judged. It is the balloon, the bee, the
// block, the brush, the frog, the flag and every shop purchase, and until that
// day it was one 320 Hz square wave that had never been compared to anything.
// ---------------------------------------------------------------------------

const POPS: Candidate[] = [
  c(
    "pop-pock",
    "פוֹק",
    "Pock",
    "קליק גבוה וחד, וגוף מהדהד קטן",
    "A high hard click over a small ringing cavity",
    POP,
    true,
  ),
  c(
    "pop-cork",
    "פקק (היה)",
    "Cork (was)",
    "פוֹק חד עם קפיצה כלפי מעלה. נבחר בבוקר 13.8, הוחלף באותו יום",
    "A sharp pock that jumps upward. Picked and replaced on 13 Aug",
    PREV_POP,
  ),
  // THE CONTROL ARM IS A LITERAL, NEVER AN IMPORT OF THE SHIPPED SPEC. This one
  // has proved the rule twice: it was written out longhand when Cork was
  // promoted, and it was still correct when Pock replaced Cork hours later,
  // while every OTHER strip's control arm silently became a duplicate of its
  // own replacement and had to be moved into `./previous`. Full reasoning
  // lives in that file's header.
  c(
    "pop-square",
    "ריבוע",
    "Square (was)",
    "גל ריבועי בודד, בלי חדר. מה שהיה עד 13.8",
    "One square wave, no room. What shipped until 13 Aug",
    {
      freq: 320,
      ms: 90,
      layers: [
        {
          wave: "square",
          gain: 0.15,
          env: { a: 0.008, d: 0.065, s: 0.01, r: 0.017 },
        },
      ],
    },
  ),
  c(
    "pop-drop",
    "טיפה",
    "Water drop",
    "טיפה שנופלת לתוך כד",
    "A droplet landing in a jar",
    {
      freq: 560,
      ms: 150,
      jitter: 1.6,
      space: 0.22,
      tail: 0.6,
      warmth: 6200,
      layers: [
        {
          wave: "noise",
          gain: 0.05,
          ms: 5,
          env: { a: 0.0005, d: 0.003, s: 0, r: 0.004 },
          filter: { type: "highpass", cutoff: 3000 },
        },
        {
          wave: "sine",
          gain: 0.22,
          ms: 95,
          glide: 16,
          env: { a: 0.001, d: 0.05, s: 0, r: 0.045 },
        },
        {
          wave: "sine",
          ratio: 2.4,
          gain: 0.04,
          ms: 55,
          glide: 16,
          env: { a: 0.002, d: 0.03, s: 0, r: 0.025 },
        },
      ],
    },
  ),
  c(
    "pop-bubble",
    "בועה",
    "Bubble",
    "בלופ רטוב שנופל מטה",
    "A wet bloop falling away",
    {
      freq: 420,
      ms: 130,
      jitter: 1.4,
      space: 0.14,
      tail: 0.4,
      warmth: 5200,
      layers: [
        mallet(0.06, 5, 1100),
        {
          wave: "sine",
          gain: 0.22,
          ms: 110,
          glide: -7,
          env: { a: 0.002, d: 0.06, s: 0.04, r: 0.05 },
        },
        {
          wave: "triangle",
          ratio: 2.01,
          gain: 0.05,
          ms: 70,
          glide: -7,
          env: { a: 0.002, d: 0.05, s: 0, r: 0.03 },
        },
      ],
    },
  ),
  c(
    "pop-marimba",
    "מרימבה",
    "Marimba",
    "נקישת עץ מכוונת, חמימה",
    "A tuned wooden note, warm",
    struck(C5, 190, BAR, {
      gain: 0.2,
      damp: 0.9,
      jitter: 0.7,
      space: 0.2,
      tail: 0.7,
      mallet: 0.05,
      malletHz: 1800,
    }),
  ),
  c(
    "pop-glass",
    "זכוכית",
    "Glass pop",
    "טיפה בהירה עם חדר קטן",
    "A bright droplet in a small room",
    struck(B5, 150, "glass", {
      gain: 0.17,
      damp: 0.95,
      jitter: 1,
      space: 0.24,
      tail: 0.8,
      mallet: 0.03,
      malletHz: 5200,
    }),
  ),
  c(
    "pop-bell",
    "פעמון",
    "Little bell",
    "פעמון זעיר, מצלצל קצת",
    "A tiny bell with a short ring",
    struck(E6, 220, BELL, {
      gain: 0.15,
      damp: 0.95,
      jitter: 0.8,
      space: 0.28,
      tail: 1.1,
      mallet: 0.03,
      malletHz: 6000,
    }),
  ),
];

// ---------------------------------------------------------------------------
// flip - judged for the FIRST time on 2026-08-13, after years as one 600 Hz
// triangle. Memory turns a card with it; tictactoe uses it too.
// ---------------------------------------------------------------------------

const FLIPS: Candidate[] = [
  c(
    "flip-whoosh",
    "סיבוב",
    "Whoosh",
    "סיבוב קצר ואז נחיתה רכה",
    "A short spin, then a soft landing",
    FLIP,
    true,
  ),
  c(
    "flip-triangle",
    "משולש (היה)",
    "Triangle (was)",
    "גל משולש בודד, מלפני הטורניר. מעולם לא נשפט",
    "One triangle wave, from before the tournament. Never judged",
    PREV_FLIP,
  ),
  c(
    "flip-card",
    "קלף",
    "Card turn",
    "שריקת נייר ואז נחיתה",
    "A paper swish, then a landing",
    {
      freq: 520,
      ms: 150,
      jitter: 0.6,
      space: 0.12,
      tail: 0.4,
      warmth: 8000,
      layers: [
        {
          wave: "noise",
          gain: 0.07,
          ms: 90,
          env: { a: 0.01, d: 0.05, s: 0.1, r: 0.04 },
          filter: { type: "bandpass", cutoff: 1200, cutoffEnd: 3800, q: 0.9 },
        },
        ...struck(G4, 90, WOOD, { gain: 0.13, damp: 1, space: 0 }).layers.map(
          (l) => ({
            ...l,
            delay: (l.delay ?? 0) + 0.055,
          }),
        ),
      ],
    },
  ),
  c(
    "flip-page",
    "דף",
    "Page",
    "רק רשרוש, בלי גובה צליל",
    "Only a rustle, no pitch",
    {
      freq: 1,
      ms: 110,
      space: 0.1,
      tail: 0.3,
      warmth: 9000,
      layers: [
        {
          wave: "noise",
          gain: 0.09,
          ms: 100,
          env: { a: 0.014, d: 0.05, s: 0.06, r: 0.05 },
          filter: { type: "bandpass", cutoff: 900, cutoffEnd: 4600, q: 0.7 },
        },
      ],
    },
  ),
  c(
    "flip-tine",
    "לשונית",
    "Tine",
    "צליל מתכת חמים וקצר",
    "A short warm metal note",
    struck(E5, 160, "tine", {
      gain: 0.17,
      damp: 0.9,
      jitter: 0.5,
      space: 0.18,
      tail: 0.6,
      mallet: 0.04,
      malletHz: 2400,
    }),
  ),
  c(
    "flip-clack",
    "קלאק",
    "Clack",
    "פלסטיק דק שנוחת על שולחן",
    "Thin plastic landing on a table",
    struck(C5, 80, WOOD, {
      gain: 0.18,
      damp: 1.15,
      jitter: 0.9,
      space: 0.09,
      tail: 0.3,
      mallet: 0.07,
      malletHz: 3600,
    }),
  ),
];

// ---------------------------------------------------------------------------
// success
// ---------------------------------------------------------------------------

const SUCCESSES: Candidate[] = [
  // The id stays `success-marimba` though the label reads "Wood run" - ids are
  // persisted in the operator's pick and are never renamed, exactly like the
  // shop item ids and the name-pool word ids.
  c(
    "success-marimba",
    "מרימבה",
    "Wood run",
    "שלושה צלילי עץ עולים",
    "Three rising wooden notes",
    SUCCESS,
    true,
  ),
  c(
    "success-harp",
    "נבל (היה)",
    "Harp gliss (was)",
    "חמישה צלילים עולים על מתכת. ניצח בסבב עיוור, הוחלף ב-13.8",
    "Five rising notes on metal. Blind winner, replaced 13 Aug",
    PREV_SUCCESS,
  ),
  c(
    "success-bell",
    "פעמונים",
    "Bell triad",
    "אקורד פעמון בחדר",
    "A bell chord in a room",
    run(
      struck(C5, 320, BELL, { gain: 0.16, damp: 0.9, space: 0.3, tail: 1.3 }),
      [0, 4, 7],
      0.04,
    ),
  ),
  c(
    "success-two",
    "שניים",
    "Two notes",
    "קפיצה קצרה כלפי מעלה, בלי דרמה",
    "One short step up, no drama",
    run(
      struck(G5, 200, "tine", {
        gain: 0.2,
        damp: 0.85,
        space: 0.18,
        tail: 0.7,
      }),
      [0, 5],
      0.07,
    ),
  ),
  c(
    "success-glass",
    "זכוכית",
    "Glass sparkle",
    "ארבעה צלילים בהירים ומהירים",
    "Four quick bright notes",
    run(
      struck(C6, 240, "glass", {
        gain: 0.15,
        damp: 0.95,
        space: 0.3,
        tail: 1.1,
      }),
      [0, 2, 7, 9],
      0.038,
    ),
  ),
  // A rising THIRD rather than a gliss - the shape the streak ladder uses, so
  // an ordinary correct answer and the bottom of a streak sound like relatives.
  c(
    "success-lift",
    "הרמה",
    "Lift",
    "שני צלילים שעולים, קרובים",
    "Two close notes stepping up",
    run(
      struck(A4, 240, BAR, {
        gain: 0.2,
        damp: 0.85,
        space: 0.22,
        tail: 0.9,
        mallet: 0.04,
        malletHz: 2000,
      }),
      [0, 4],
      0.055,
    ),
  ),
];

// ---------------------------------------------------------------------------
// win
// ---------------------------------------------------------------------------

const WINS: Candidate[] = [
  c(
    "win-ladder",
    "סולם",
    "Ladder",
    "שישה צלילים מטפסים",
    "Six notes climbing",
    WIN,
    true,
  ),
  c(
    "win-sweep",
    "סחיפה (היה)",
    "Sweep and land (was)",
    "עלייה שנוחתת על אקורד. ניצח בסבב עיוור, הוחלף ב-13.8",
    "A rise landing on a chord. Blind winner, replaced 13 Aug",
    PREV_WIN,
  ),
  c(
    "win-bells",
    "פעמונים",
    "Bell fanfare",
    "שלושה פעמונים באולם גדול",
    "Three bells in a big hall",
    run(
      struck(C5, 620, BELL, { gain: 0.18, damp: 0.85, space: 0.4, tail: 2.2 }),
      [0, 7, 12],
      0.11,
    ),
  ),
  c(
    "win-warm",
    "חם",
    "Warm chord",
    "אקורד אחד רחב, בלי ריצה",
    "One wide chord, no run",
    run(
      struck(C4, 700, "tine", { gain: 0.16, damp: 0.7, space: 0.36, tail: 2 }),
      [0, 7, 16, 19],
      0.012,
    ),
  ),
  c(
    "win-fanfare",
    "תרועה",
    "Fanfare",
    "שלושה צלילים מוכרזים ואז אקורד",
    "Three announced notes, then the chord",
    run(
      struck(C5, 520, BELL, {
        gain: 0.17,
        damp: 0.8,
        space: 0.32,
        tail: 1.9,
        mallet: 0.04,
        malletHz: 4200,
      }),
      [0, 4, 7, 12],
      0.085,
    ),
  ),
  c(
    "win-bloom",
    "פריחה",
    "Bloom",
    "אקורד שנפתח לאט, בלי מכה",
    "A chord that opens slowly, no strike",
    run(
      struck(C5, 900, SOFT, {
        gain: 0.15,
        damp: 0.6,
        space: 0.42,
        tail: 2.2,
        warmth: 6000,
      }),
      [0, 7, 12, 16],
      0.13,
    ),
  ),
];

// ---------------------------------------------------------------------------
// fail - gentle by rule. "Not that one", never "you failed".
// ---------------------------------------------------------------------------

const FAILS: Candidate[] = [
  c(
    "fail-two",
    "שניים",
    "Two steps down",
    "שני צלילים יורדים, רכים",
    "Two soft notes stepping down",
    FAIL,
    true,
  ),
  c(
    "fail-thud",
    "נפילה (היה)",
    "Soft thud (was)",
    "צליל שנופל טון וחצי. ניצח בסבב עיוור, הוחלף ב-13.8",
    "A note falling a tone and a half. Blind winner, replaced 13 Aug",
    PREV_FAIL,
  ),
  c(
    "fail-wood",
    "עץ",
    "Wood knock",
    "דפיקת עץ עמומה, בלי עצב",
    "A muted wooden knock, no sadness",
    struck(C4, 170, WOOD, {
      gain: 0.18,
      damp: 1,
      jitter: 0.4,
      space: 0.1,
      tail: 0.4,
      warmth: 3000,
      mallet: 0.05,
      malletHz: 700,
    }),
  ),
  c(
    "fail-puff",
    "נשיפה",
    "Puff",
    "רק אוויר. שום צליל של טעות",
    "Just air. Nothing that says wrong",
    {
      freq: 1,
      ms: 160,
      space: 0.12,
      tail: 0.35,
      warmth: 2600,
      layers: [
        {
          wave: "noise",
          gain: 0.1,
          ms: 150,
          env: { a: 0.006, d: 0.09, s: 0.05, r: 0.06 },
          filter: { cutoff: 1400, cutoffEnd: 280 },
        },
      ],
    },
  ),
  // The gentlest arm in the strip: no pitch fall at all, just a soft muted
  // knock. A falling interval is the sound of disappointment in every musical
  // culture that has one, and a four-year-old getting a shape wrong has not
  // disappointed anybody.
  c(
    "fail-knock",
    "נקישה",
    "Soft knock",
    "נקישה עמומה, בלי ירידה",
    "A muted knock, nothing falling",
    struck(C4, 150, SOFT, {
      gain: 0.2,
      damp: 0.95,
      jitter: 0.4,
      space: 0.1,
      tail: 0.4,
      warmth: 2600,
      mallet: 0.05,
      malletHz: 700,
    }),
  ),
  c(
    "fail-boing",
    "בוינג",
    "Boing",
    "קפיצה משועשעת כלפי מטה",
    "A playful bounce downward",
    {
      freq: 260,
      ms: 220,
      jitter: 0.8,
      space: 0.14,
      tail: 0.5,
      warmth: 4600,
      layers: [
        {
          wave: "triangle",
          gain: 0.17,
          ms: 180,
          glide: -5,
          env: { a: 0.003, d: 0.1, s: 0.08, r: 0.09 },
        },
        {
          wave: "sine",
          ratio: 1.99,
          gain: 0.05,
          ms: 120,
          glide: -5,
          env: { a: 0.004, d: 0.07, s: 0.04, r: 0.06 },
        },
      ],
    },
  ),
];

// ---------------------------------------------------------------------------
// coin
// ---------------------------------------------------------------------------

const COINS: Candidate[] = [
  c(
    "coin-drop",
    "נפילה",
    "Drop in",
    "מטבע שנופל לתוך צנצנת",
    "A coin dropping into a jar",
    COIN,
    true,
  ),
  c(
    "coin-triangles",
    "משולשים (היה)",
    "Two triangles (was)",
    "שני צלילים במרווח חמישית. ניצח בסבב עיוור, הוחלף ב-13.8",
    "Two notes a fifth apart. Blind winner, replaced 13 Aug",
    PREV_COIN,
  ),
  c(
    "coin-glass",
    "זכוכית",
    "Glass clink",
    "נקישה בהירה עם זנב קצר",
    "A bright clink with a short tail",
    run(
      struck(C6, 130, "glass", {
        gain: 0.16,
        damp: 1,
        jitter: 1,
        space: 0.24,
        tail: 0.7,
      }),
      [0, 7],
      0.05,
    ),
  ),
  c(
    "coin-bell",
    "פעמון",
    "Coin bell",
    "פעמון קטן ומתכתי",
    "A small metallic bell",
    struck(B5, 200, BELL, {
      gain: 0.15,
      damp: 0.95,
      jitter: 1.1,
      space: 0.26,
      tail: 1,
      mallet: 0.04,
      malletHz: 6800,
    }),
  ),
  c(
    "coin-tine",
    "מתכת",
    "Tine clink",
    "מתכת חמימה, פחות חדה",
    "Warm metal, less sharp",
    run(
      struck(G5, 150, "tine", {
        gain: 0.18,
        damp: 0.95,
        jitter: 1,
        space: 0.2,
        tail: 0.6,
      }),
      [0, 12],
      0.045,
    ),
  ),
];

// ---------------------------------------------------------------------------
// star
// ---------------------------------------------------------------------------

const STARS: Candidate[] = [
  c(
    "star-bar",
    "עץ גבוה",
    "High bar",
    "עץ מכוון גבוה, פחות זכוכיתי",
    "High tuned wood, less glassy",
    STAR,
    true,
  ),
  c(
    "star-crystal",
    "קריסטל (היה)",
    "Crystal sparkle (was)",
    "שלושה צלילים גבוהים בחדר גדול. ניצח בסבב עיוור, הוחלף ב-13.8",
    "Three high notes in a big room. Blind winner, replaced 13 Aug",
    PREV_STAR,
  ),
  c(
    "star-shimmer",
    "נצנוץ",
    "Shimmer",
    "חמישה צלילים זעירים שמתפזרים",
    "Five tiny notes scattering",
    run(
      struck(E6, 340, BELL, {
        gain: 0.13,
        damp: 1,
        jitter: 0.6,
        space: 0.42,
        tail: 2.2,
      }),
      [0, 5, 9, 12, 16],
      0.05,
    ),
  ),
  c(
    "star-single",
    "אחד",
    "One chime",
    "צליל אחד ארוך. בלי ריצה",
    "One long chime. No run",
    struck(E6, 520, BELL, {
      gain: 0.17,
      damp: 0.8,
      space: 0.44,
      tail: 2.4,
      mallet: 0.03,
      malletHz: 7800,
    }),
  ),
  c(
    "star-rise",
    "עלייה",
    "Rise",
    "חמישה צלילים מטפסים אל השקט",
    "Five notes climbing into silence",
    run(
      struck(C5, 380, "glass", {
        gain: 0.15,
        damp: 0.95,
        space: 0.42,
        tail: 2.2,
      }),
      [0, 4, 7, 12, 16],
      0.055,
    ),
  ),
];

// ---------------------------------------------------------------------------
// streak - ONE RUNG. The ladder is not here.
//
// Every candidate below is a single note. `src/sdk/streak.ts` decides which
// SEMITONE it plays at for a run of N correct answers, so picking a timbre here
// re-voices the whole ladder at once and cannot change its shape. That split is
// the same one `economy.ts` and `score.ts` already carry, and it is why a game
// will never be able to invent its own escalation.
//
// The timbre matters more here than anywhere else in this file, because this is
// the only voice in the app that is heard TRANSPOSED, up to 21 semitones above
// its own base. A voice that sounds fine at C5 and shrill at A6 is the wrong
// pick however good the bottom rung is - play the ladder to the top before
// choosing, which is exactly what the lab's streak row is for.
// ---------------------------------------------------------------------------

const STREAKS: Candidate[] = [
  c(
    "streak-glass",
    "זכוכית",
    "Glass",
    "הכי בהיר. נבחר אחרי האזנה עד הדרגה העליונה",
    "The brightest. Picked after listening at the top rung",
    STREAK,
    true,
  ),
  c(
    "streak-tine",
    "לשונית (היה)",
    "Tine (was)",
    "מתכת חמימה. מעולם לא הגיעה לשחקן",
    "Warm metal. Never reached a player",
    PREV_STREAK,
  ),
  c(
    "streak-marimba",
    "מרימבה",
    "Marimba",
    "עץ מכוון, עגול ורך",
    "Tuned wood, round and soft",
    struck(C5, 260, BAR, {
      gain: 0.19,
      damp: 0.85,
      jitter: 0.2,
      space: 0.22,
      tail: 0.9,
      mallet: 0.05,
      malletHz: 1800,
    }),
  ),
  c(
    "streak-bell",
    "פעמון",
    "Bell",
    "בהיר ומצלצל. בודקי אותו עד הדרגה העליונה",
    "Bright and ringing. Try it at the top rung",
    struck(C5, 300, BELL, {
      gain: 0.16,
      damp: 0.9,
      jitter: 0.2,
      space: 0.3,
      tail: 1.3,
      mallet: 0.03,
      malletHz: 5000,
    }),
  ),
  c(
    "streak-soft",
    "רך",
    "Soft",
    "עגול ועמום. כמעט לחישה",
    "Round and muted. Almost a whisper",
    struck(C5, 280, SOFT, {
      gain: 0.21,
      damp: 0.8,
      jitter: 0.2,
      space: 0.2,
      tail: 0.8,
      warmth: 5000,
    }),
  ),
];

// ---------------------------------------------------------------------------

export const GALLERY: Record<SfxName, Candidate[]> = {
  tap: TAPS,
  pop: POPS,
  flip: FLIPS,
  success: SUCCESSES,
  win: WINS,
  fail: FAILS,
  coin: COINS,
  star: STARS,
  streak: STREAKS,
};

/**
 * How much of a verdict each sound carries, so the lab can say so on the card.
 *
 * Three states and not two, because "picked" and "blind" are genuinely
 * different strengths of evidence and collapsing them is how a preference gets
 * remembered as a result. As of 2026-08-13 every sound reads `picked` - each
 * was chosen from its own strip with the names showing.
 *
 * `blind` and `never` are kept in the type on purpose rather than deleted. The
 * next sound added to this app starts at `never`, and the next blind round run
 * moves something to `blind`; a type that could only say "picked" would quietly
 * make the distinction unsayable, which is the whole failure this table exists
 * to prevent.
 */
export type Verdict = "blind" | "picked" | "never";

export const VERDICT: Record<SfxName, Verdict> = {
  tap: "picked",
  success: "picked",
  win: "picked",
  fail: "picked",
  coin: "picked",
  star: "picked",
  pop: "picked",
  flip: "picked",
  streak: "picked",
};

/**
 * The sounds whose current voice REPLACED a blind-round winner.
 *
 * Recorded separately because the earlier result is real and somebody will
 * eventually cite it - "but Shutter won the tournament" is a true sentence, and
 * the honest answer is that a blind round and a named pick ask different
 * questions. Losing this list would make the override look like it had never
 * happened, which is the same class of amnesia as recording a verdict as "the
 * control won" without saying what the control was.
 *
 * `pop`, `flip` and `streak` are absent: pop replaced Cork (itself a pick, not
 * a blind winner), and the other two had never been judged at all.
 */
export const OVERRODE_BLIND: readonly SfxName[] = [
  "tap",
  "success",
  "fail",
  "win",
  "coin",
  "star",
];

/**
 * Display order. It used to lead with whatever was least decided, and that
 * rationale died on 2026-08-13 when the last unjudged sound got a verdict.
 *
 * It now leads with BLAST RADIUS - how many places the sound is actually heard
 * - so a re-listen starts where a mistake is most expensive. `tap` fires on the
 * home screen, the boards and 16 games; `streak` is last because it currently
 * plays nowhere at all.
 */
export const GALLERY_ORDER: SfxName[] = [
  "tap",
  "pop",
  "success",
  "fail",
  "win",
  "coin",
  "star",
  "flip",
  "streak",
];

export const EVENT_TITLES: Record<SfxName, { he: string; en: string }> = {
  tap: { he: "נגיעה", en: "Tap" },
  pop: { he: "פּוֹפּ", en: "Pop" },
  flip: { he: "היפוך", en: "Flip" },
  success: { he: "נכון", en: "Correct" },
  fail: { he: "לא נכון", en: "Wrong" },
  win: { he: "ניצחון", en: "Win" },
  coin: { he: "מטבע", en: "Coin" },
  star: { he: "כוכב", en: "Star" },
  streak: { he: "רצף", en: "Streak" },
};

/** Where each sound is actually heard, so a pick is made knowing the blast radius. */
export const EVENT_WHERE: Record<SfxName, { he: string; en: string }> = {
  tap: {
    he: "מסך הבית, הלוחות, ו-16 משחקים",
    en: "The home screen, the boards, and 16 games",
  },
  pop: {
    he: "בלון, דבורה, שורה, מכחול, קפיצה, דגל, וקנייה בחנות",
    en: "A balloon, a bee, a line, the brush, a jump, a flag, and every shop purchase",
  },
  flip: {
    he: "היפוך קלף בזיכרון, ו-איקס עיגול",
    en: "Turning a card in Memory, and tictactoe",
  },
  success: {
    he: "תשובה נכונה ב-11 משחקים",
    en: "A correct answer in 11 games",
  },
  fail: { he: "טעות ב-8 משחקים", en: "A mistake in 8 games" },
  win: { he: "כל ניצחון בכל משחק", en: "Every win in every game" },
  coin: {
    he: "כשהמטבעות נוחתים בארנק",
    en: "When the coins land in the wallet",
  },
  star: { he: "כשמרוויחים כוכב", en: "When a star is earned" },
  streak: {
    he: "עדיין שום מקום - שלוש נכונות ברצף ומעלה, כשמשחק יבקש את זה",
    en: "Nowhere yet - three correct in a row and up, once a game asks for it",
  },
};

export function candidate(name: SfxName, id: string): Candidate | undefined {
  return GALLERY[name].find((x) => x.id === id);
}

export function shippedCandidate(name: SfxName): Candidate {
  const found = GALLERY[name].find((x) => x.shipped);
  // Every strip declares exactly one shipped arm; `voices.test.ts` pins it.
  // Falling back to the first entry keeps the lab usable rather than blank if
  // that ever stops being true.
  return found ?? GALLERY[name][0];
}
