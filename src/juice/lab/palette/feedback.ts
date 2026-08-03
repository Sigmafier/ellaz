// CORRECT and WRONG characters.
//
// The correct sound is the one a child chases, so it gets the most options.
// The wrong sound is the one that decides whether a five-year-old tries again,
// and every candidate here is built to be un-punishing: soft attacks, falling
// but never harsh, and nothing with a sharp transient. There is deliberately no
// buzzer in this list. A buzzer is a judgement, and we do not judge children.

import { LEAN } from "../voices";
import {
  A5,
  C5,
  C6,
  E5,
  G5,
  bloom,
  ch,
  run,
  struck,
  sweep,
  type Character,
} from "./builders";

export const CORRECT: Character[] = [
  ch(
    "ok-current",
    "Control - two rising sines",
    "מה שהמעבדה מנגנת עכשיו.",
    "What the lab plays right now.",
    LEAN.correct,
  ),

  ch(
    "ok-tritone",
    "Glass tri-tone",
    "שלושה צלילי זכוכית: מטה ואז מעלה. התבנית הקלאסית של התראה - נשמעת כמו הודעה, לא כמו ניקוד.",
    "Three glass notes: down, then up. The classic alert shape - it reads as a message, not a score.",
    run(struck(C6, 300, "glass", { gain: 0.2, damp: 0.95, mallet: 0.03, malletHz: 5600, space: 0.24, tail: 1 }), [0, -5, 4], 0.085),
  ),

  ch(
    "ok-payup",
    "Two-note confirm",
    "שני פעמונים נקיים עולים בקווינטה. קצר, בטוח, סופי - 'זה נרשם'.",
    "Two clean bells rising a fifth. Short, confident, final - 'that registered'.",
    run(struck(G5, 260, "bell", { gain: 0.21, damp: 0.9, mallet: 0.03, malletHz: 4800, space: 0.22, tail: 0.9 }), [0, 7], 0.075),
  ),

  ch(
    "ok-sparkle",
    "Sparkle - three notes up",
    "שלושה צלילים מטפסים. קורא 'התקדמת', לא רק 'נכון'.",
    "Three notes climbing. Reads as 'you advanced', not merely 'correct'.",
    run(struck(G5, 220, "glass", { gain: 0.2, damp: 1, mallet: 0.025, malletHz: 6000, space: 0.2 }), [0, 4, 7], 0.055),
  ),

  ch(
    "ok-glocken",
    "Glockenspiel",
    "פעמון מתכתי בהיר. היחסים הלא-הרמוניים הם מה שעושה פעמון.",
    "A bright metallic bell. The inharmonic ratios are what make a bell a bell.",
    struck(C6, 420, "bell", { gain: 0.22, damp: 0.8, mallet: 0.04, malletHz: 6000, space: 0.24, tail: 1.2 }),
  ),

  ch(
    "ok-marimba2",
    "Marimba pair",
    "שני צלילי עץ במרווח שלישית. חמים ולא נוצץ - טוב לרצף ארוך.",
    "Two wooden notes a third apart. Warm rather than glittery - good for a long streak.",
    run(struck(E5, 240, "bar", { gain: 0.22, mallet: 0.04, malletHz: 2600, space: 0.18 }), [0, 4], 0.07),
  ),

  ch(
    "ok-harp",
    "Harp gliss",
    "חמישה צלילים בסולם פנטטוני. הכי נדיב - ובדקו אותו דווקא ברצף מהיר, שם האורך מתחיל להפריע.",
    "Five pentatonic notes. The most generous - test it on a FAST streak, where the length starts to bite.",
    run(struck(C5, 280, "tine", { gain: 0.2, damp: 0.8, space: 0.24, tail: 1.1 }), [0, 2, 4, 7, 9], 0.045),
  ),

  ch(
    "ok-bloom",
    "Soft bloom",
    "נפיחה רכה שנפתחת כלפי מעלה. אין בה 'מכה' בכלל - עדין מאוד.",
    "A soft swell opening upward. No strike at all - very gentle.",
    bloom(C5, 420, { gain: 0.11, semitones: [0, 4, 7], openTo: 5200, space: 0.3 }),
  ),

  ch(
    "ok-pop",
    "Bubble pop up",
    "פופ שעולה. שובב וילדותי, בלי שום מתכתיות.",
    "A rising pop. Playful and childlike, with no metallic edge at all.",
    sweep(520, 12, 130, { gain: 0.2, harmonic: 0.22, jitter: 0.8, space: 0.18 }),
  ),

  ch(
    "ok-bell-ding",
    "Service bell",
    "דינג עם זנב ארוך. ברור מאוד, אולי חד מדי כשהוא חוזר מהר.",
    "A ding with a long tail. Very clear, perhaps sharp when it repeats quickly.",
    struck(A5, 500, "bell", { gain: 0.2, damp: 0.7, mallet: 0.045, malletHz: 5000, space: 0.28, tail: 1.4 }),
  ),
];

export const WRONG: Character[] = [
  ch(
    "wrong-current",
    "Control - soft falling thud",
    "מה שהמעבדה מנגנת עכשיו.",
    "What the lab plays right now.",
    LEAN.wrong,
  ),

  ch(
    "wrong-boop",
    "Two soft descending notes",
    "שני צלילים רכים יורדים. 'לא זה' בנימה ידידותית.",
    "Two soft descending notes. A friendly 'not that one'.",
    run(struck(330, 200, "soft", { gain: 0.2, damp: 1, space: 0.14, tail: 0.6, warmth: 4000 }), [0, -3], 0.11),
  ),

  ch(
    "wrong-knock",
    "Dull wood knock",
    "נקישת עץ עמומה. כמעט חסרת גובה, ולכן לא נשמעת כמו שיפוט.",
    "A dull wooden knock. Almost pitchless, so it can never sound like a judgement.",
    struck(250, 130, "wood", { gain: 0.22, damp: 1.3, mallet: 0.06, malletHz: 1000, jitter: 0.8, glide: -3, space: 0.1, tail: 0.4, warmth: 3200 }),
  ),

  ch(
    "wrong-glass-down",
    "Glass, falling",
    "אותו צליל זכוכית של ההצלחה, אבל יורד. עקבי עם שאר השפה.",
    "The same glass timbre as the success sound, but falling. Consistent with the rest of the language.",
    run(struck(G5, 240, "glass", { gain: 0.17, damp: 1, space: 0.2, tail: 0.8, warmth: 7000 }), [0, -4], 0.1),
  ),

  ch(
    "wrong-breath",
    "Breath",
    "נשיפה מסוננת, בלי גובה צליל כלל. הכי רחוק שאפשר מ'זמזם טעות'.",
    "A filtered breath with no pitch whatsoever. As far from a buzzer as it is possible to get.",
    {
      freq: 400,
      ms: 190,
      space: 0.16,
      tail: 0.5,
      warmth: 3400,
      layers: [
        {
          wave: "noise",
          gain: 0.15,
          ms: 190,
          env: { a: 0.02, d: 0.11, s: 0.08, r: 0.1 },
          filter: { type: "bandpass", cutoff: 900, cutoffEnd: 320, q: 1.4 },
        },
      ],
    },
  ),

  ch(
    "wrong-muted-pop",
    "Muted pop",
    "פופ נמוך ואטום. קצר מאוד - נגמר לפני שהילד הספיק להרגיש רע.",
    "A low muted pop. Very short - over before a child has time to feel bad about it.",
    sweep(300, -7, 110, { gain: 0.2, wave: "triangle", jitter: 0.7, space: 0.12, tail: 0.4 }),
  ),
];
