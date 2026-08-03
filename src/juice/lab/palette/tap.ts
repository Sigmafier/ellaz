// TAP characters - the hardest category in the palette.
//
// A tap is heard several hundred times per session, so the bar is not "lovely
// the first time", it is "invisible by the two hundredth". Three properties
// decide that, and all three pull toward restraint:
//
//   - SHORT. Nothing here runs past ~350ms including its tail.
//   - QUIET, and dark at the top. Glare is what turns pleasant into nagging.
//   - WEAK PITCH CENTRE. The more clearly a tap sings a NOTE, the more it starts
//     to feel like it is telling you something. The best UI taps are almost
//     pitchless; that is why a keyboard click never gets old.
//
// Rated hardest-to-tire-of first, roughly: click, felt, tock, glass, drop.

import { LEAN } from "../voices";
import { C6, E6, G5, MODES, ch, mallet, struck, sweep, tick, type Character } from "./builders";

export const TAP: Character[] = [
  ch(
    "tap-current",
    "Control - today's layered click",
    "מה שהמעבדה מנגנת עכשיו, בלי חדר ובלי דעיכה מדורגת.",
    "What the lab plays right now - no room, no staggered decay.",
    LEAN.tap,
  ),

  ch(
    "tap-glass",
    "Glass tap",
    "נגיעה בזכוכית דקה. השותפים הגבוהים מתים ראשונים, וזה מה שנותן את הצליל הנקי.",
    "A tap on thin glass. The high partials die first, and that is what makes it read as clean.",
    struck(E6, 190, "glass", { gain: 0.2, damp: 0.95, mallet: 0.04, malletHz: 5200, jitter: 1, space: 0.2, tail: 0.7 }),
  ),

  ch(
    "tap-click",
    "Keyboard click",
    "קליק יבש וכמעט חסר גובה. הכי עמיד לשחיקה מבין כל האפשרויות - אין תו שאפשר להימאס ממנו.",
    "A dry, almost pitchless click. The most fatigue-proof option here: no note to get sick of.",
    tick(2600, 22, { gain: 0.15, body: 0.07, bodyHz: 780, highpass: 2400, space: 0.05 }),
  ),

  ch(
    "tap-felt",
    "Felt tap",
    "מקל רך על משהו צפוף. חמים, אטום, כמעט לא נשמע - ובדיוק לכן נעים.",
    "A soft mallet on something dense. Warm, muted, barely there - which is exactly why it wears well.",
    struck(G5 / 2, 150, "soft", { gain: 0.24, damp: 1.1, mallet: 0.05, malletHz: 900, jitter: 1.2, space: 0.1, tail: 0.5, warmth: 4200 }),
  ),

  ch(
    "tap-tock",
    "Picker tock",
    "הנקישה של גלגל בורר. קצרה, עמומה, מכנית.",
    "The detent of a picker wheel. Short, dull, mechanical.",
    struck(760, 90, "wood", { gain: 0.24, damp: 1.2, mallet: 0.055, malletHz: 2100, jitter: 1.4, space: 0.09, tail: 0.4, warmth: 6000 }),
  ),

  ch(
    "tap-drop",
    "Water drop",
    "טיפה. תהודה גבוהה במסנן היא מה שהופך את זה לרטוב במקום סתם שקט.",
    "A droplet. High filter resonance is what makes it wet rather than merely quiet.",
    sweep(1250, -13, 110, { gain: 0.2, q: 7, jitter: 1.6, space: 0.22, tail: 0.7 }),
  ),

  ch(
    "tap-bubble",
    "Bubble",
    "בועה שעולה. הקליל והילדותי ביותר כאן.",
    "A rising bubble. The lightest and most childlike option here.",
    sweep(400, 15, 95, { gain: 0.2, harmonic: 0.18, jitter: 2, space: 0.16 }),
  ),

  ch(
    "tap-marimba",
    "Marimba",
    "מוט עץ מוכה - יחס 1 ל-3.9, כמו מרימבה אמיתית.",
    "A struck wooden bar - a real 1 : 3.9 marimba ratio.",
    struck(C6 / 2, 230, "bar", { gain: 0.22, mallet: 0.045, malletHz: 2600, jitter: 1, space: 0.18 }),
  ),

  ch(
    "tap-kalimba",
    "Kalimba tine",
    "לשונית מתכת. חמה, עם דעיכה ארוכה יותר - שווה לבדוק אם זה מתחיל להצטבר בלחיצות מהירות.",
    "A metal tine. Warm, with a longer decay - worth checking whether it piles up on fast taps.",
    struck(E6 / 2, 300, "tine", { gain: 0.21, damp: 0.75, mallet: 0.03, malletHz: 2000, jitter: 0.9, space: 0.2 }),
  ),

  ch(
    "tap-crystal",
    "Crystal ping",
    "צליל גבוה מאוד וקצר מאוד, עם חדר קטן. הכי 'יקר', אולי חד מדי לילדים.",
    "Very high, very short, with a small room. The most expensive-sounding, perhaps sharp for kids.",
    struck(G5 * 2, 160, "glass", { gain: 0.16, damp: 1.05, mallet: 0.03, malletHz: 7000, jitter: 0.8, space: 0.26, tail: 0.8, warmth: 12000 }),
  ),

  ch(
    "tap-shutter",
    "Shutter",
    "נקישה כפולה מכנית, כמו תריס מצלמה. מספקת מאוד, אבל יש בה אישיות חזקה.",
    "A mechanical double-click, like a camera shutter. Very satisfying, but a strong personality.",
    {
      freq: 2400,
      ms: 60,
      jitter: 0.7,
      space: 0.07,
      tail: 0.35,
      warmth: 10000,
      layers: [
        mallet(0.13, 5, 2800),
        { ...mallet(0.1, 6, 1900), delay: 0.032 },
        { wave: "sine", ratio: 0.3, gain: 0.07, ms: 45, env: { a: 0.001, d: 0.03, s: 0, r: 0.02 } },
      ],
    },
  ),

  ch(
    "tap-pebble",
    "Pebble",
    "נקישה נמוכה ואטומה. כמעט בלי גובה צליל, מרגיש 'כבד'.",
    "A low muted knock. Almost no pitch at all, and it feels weighty.",
    struck(280, 110, "wood", { gain: 0.24, damp: 1.3, mallet: 0.07, malletHz: 1100, jitter: 1.5, glide: -3, space: 0.1, tail: 0.45, warmth: 3600 }),
  ),
];

// Re-exported so the mode table is reachable from a single import in tests.
export { MODES };
