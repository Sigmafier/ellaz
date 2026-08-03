// WIN, COIN and STAR characters.
//
// These are the only places in the app where a longer, more expensive sound is
// affordable, because they happen rarely. The constraint that governs them is
// the opposite of the tap constraint: a win must be DISTINCT from the constant
// chatter of taps and correct answers, or the reward stops registering as one.
//
// The coin sound has its own trap. Five coins land in a row, so whatever plays
// there is heard five times in under a second - it is closer to a tap than to a
// win, and every candidate below is sized accordingly.

import { LEAN } from "../voices";
import {
  A5,
  B5,
  C5,
  C6,
  E6,
  G5,
  G6,
  bloom,
  ch,
  run,
  struck,
  sweep,
  type Character,
} from "./builders";

export const WIN: Character[] = [
  ch(
    "win-current",
    "Control - chord swell",
    "מה שהמעבדה מנגנת עכשיו.",
    "What the lab plays right now.",
    LEAN.win,
  ),

  ch(
    "win-chime-arp",
    "Glass arpeggio",
    "ארפג'יו מזכוכית שמטפס אוקטבה. נקי ומודרני - לא פנפרה של משחק ישן.",
    "A glass arpeggio climbing an octave. Clean and modern - not an old-game fanfare.",
    run(struck(C5, 420, "glass", { gain: 0.22, damp: 0.85, mallet: 0.035, malletHz: 5600, space: 0.3, tail: 1.6 }), [0, 4, 7, 12], 0.075),
  ),

  ch(
    "win-bloom",
    "Bloom chord",
    "אקורד מז'ורי שנפתח לאט מתוך מסנן. חגיגי בלי אף מכה - הכי 'רך' מבין האפשרויות.",
    "A major chord opening slowly through a filter. Celebratory with no strike at all - the softest option.",
    bloom(C5, 900, { gain: 0.13, semitones: [0, 4, 7, 12], openTo: 7000, space: 0.36, tail: 2 }),
  ),

  ch(
    "win-bells-down",
    "Bell cascade",
    "פעמונים יורדים. חגיגי בלי להיות רועש.",
    "Descending bells. Celebratory without being loud.",
    run(struck(C6, 480, "bell", { gain: 0.2, damp: 0.75, mallet: 0.035, malletHz: 5200, space: 0.32, tail: 1.7 }), [12, 9, 7, 4, 0], 0.08),
  ),

  ch(
    "win-harp",
    "Harp cascade",
    "מפל בן שמונה צלילים. קסום ורך יותר מפנפרה.",
    "An eight-note cascade. More magical and softer than a fanfare.",
    run(struck(C5, 420, "tine", { gain: 0.2, damp: 0.8, space: 0.3, tail: 1.6 }), [0, 2, 4, 7, 9, 12, 14, 16], 0.05),
  ),

  ch(
    "win-marimba-run",
    "Marimba run",
    "ריצת עץ חמימה כלפי מעלה. הכי פחות מתכתי - טוב אם הפעמונים מרגישים חדים.",
    "A warm wooden run upward. The least metallic option - good if the bells feel sharp.",
    run(struck(C5, 380, "bar", { gain: 0.22, mallet: 0.04, malletHz: 2800, space: 0.26, tail: 1.3 }), [0, 4, 7, 12, 16], 0.065),
  ),

  ch(
    "win-rise",
    "Sweep and land",
    "טאטוא שעולה ואז נוחת על אקורד. הכי 'קולנועי'.",
    "A rising sweep that lands on a chord. The most cinematic option.",
    {
      freq: C5,
      ms: 700,
      space: 0.34,
      tail: 1.8,
      warmth: 9000,
      layers: [
        {
          wave: "noise",
          gain: 0.06,
          ms: 340,
          env: { a: 0.2, d: 0.12, s: 0.1, r: 0.12 },
          filter: { type: "bandpass", cutoff: 600, cutoffEnd: 6500, q: 1.6 },
        },
        ...run(struck(C5, 460, "glass", { gain: 0.19, damp: 0.85, space: 0 }), [0, 7, 12], 0.05).layers.map(
          (l) => ({ ...l, delay: (l.delay ?? 0) + 0.3 }),
        ),
      ],
    },
  ),
];

export const COIN: Character[] = [
  ch(
    "coin-current",
    "Control - two triangles up a fifth",
    "מה שהמעבדה מנגנת עכשיו.",
    "What the lab plays right now.",
    LEAN.coin,
  ),

  ch(
    "coin-plink",
    "Tiny glass plink",
    "נקישת זכוכית קטנטנה. הכי פחות מפריעה כשחמישה מטבעות נוחתים ברצף.",
    "A tiny glass plink. Least intrusive when five coins land in a row.",
    struck(G6, 130, "glass", { gain: 0.17, damp: 1.1, jitter: 2, space: 0.18, tail: 0.6 }),
  ),

  ch(
    "coin-bell",
    "Small bell",
    "פעמון זעיר. עגול יותר מהנקישה, וקצת יותר נוכח.",
    "A miniature bell. Rounder than the plink, and a little more present.",
    struck(B5 * 1.5, 180, "bell", { gain: 0.17, damp: 1, jitter: 1.6, space: 0.2, tail: 0.7 }),
  ),

  ch(
    "coin-blip",
    "Rising blip",
    "בליפ קצר שעולה. הכי קרוב למטבע של משחק קלאסי.",
    "A short rising blip. The closest to a classic arcade coin.",
    sweep(A5, 9, 80, { gain: 0.18, harmonic: 0.2, jitter: 2.2, space: 0.14, tail: 0.5 }),
  ),

  ch(
    "coin-tine",
    "Warm tine",
    "לשונית מתכת חמה. הכי פחות חדה כשהיא חוזרת חמש פעמים.",
    "A warm metal tine. The least piercing option when it repeats five times.",
    struck(E6, 200, "tine", { gain: 0.18, damp: 0.95, jitter: 1.8, space: 0.18, tail: 0.6, warmth: 7000 }),
  ),
];

export const STAR: Character[] = [
  ch(
    "star-current",
    "Control - staggered shimmer",
    "מה שהמעבדה מנגנת עכשיו.",
    "What the lab plays right now.",
    LEAN.star,
  ),

  ch(
    "star-magic",
    "Magic rise",
    "מסנן שנפתח כלפי מעלה מעל אקורד. 'משהו נדיר בדיוק קרה'.",
    "A filter opening upward over a chord. 'Something rare just happened'.",
    bloom(C5, 1000, { gain: 0.12, semitones: [0, 7, 12], openTo: 9000, space: 0.4, tail: 2.2 }),
  ),

  ch(
    "star-crystal",
    "Crystal sparkle",
    "שלושה צלילי גביש גבוהים בזה אחר זה, עם חדר גדול.",
    "Three high crystal notes in succession, in a big room.",
    run(struck(E6, 420, "glass", { gain: 0.19, damp: 0.9, mallet: 0.03, malletHz: 7500, space: 0.38, tail: 2 }), [0, 7, 12], 0.075),
  ),

  ch(
    "star-harp-up",
    "Harp up",
    "מפל עולה בסולם פנטטוני. קלאסי לרגע של 'קיבלת כוכב'.",
    "A rising pentatonic cascade. The classic 'you earned a star' moment.",
    run(struck(G5, 400, "tine", { gain: 0.19, damp: 0.8, space: 0.34, tail: 1.9 }), [0, 2, 4, 7, 9, 12], 0.05),
  ),

  ch(
    "star-bell-swell",
    "Bell swell",
    "פעמון אחד גדול עם זנב ארוך מאוד. פחות הוא יותר.",
    "One large bell with a very long tail. Less is more.",
    struck(C6, 900, "bell", { gain: 0.21, damp: 0.65, mallet: 0.04, malletHz: 5400, space: 0.42, tail: 2.4 }),
  ),
];
