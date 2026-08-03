// Juice Lab - the brackets. Six questions, three unlabelled arms each.
//
// Arm 0 of every bracket is ALWAYS the control: what the app does today, exactly
// as it does it. It is in the running unlabelled so "the new one wins" is a
// claim that can come back false, and so a regression has somewhere to show up.

import { haptic } from "@juice/index";
import { flyTo, burst, celebrate } from "@juice/index";
import type { Locale } from "@i18n/index";
import { advanceLadder, ladderSemitones, transpose, winIntensity, type WinTier } from "./specs";
import { CONTROL, LEAN, RICH } from "./voices";
import { PALETTE_SPECS } from "./palette";
import { offlineEngine, realtimeEngine, type JuiceEngine } from "./engines";
import { celebrateTiered, chipBounce, flyToRich, hitStop, ripple, squash } from "./visuals";

export interface ArmContext {
  /** Viewport point the interaction happened at. */
  at: { x: number; y: number };
  /** The pressed element, for squash/pop treatments. */
  el: HTMLElement;
  /** The wallet chip to fly coins at, or null. */
  wallet: HTMLElement | null;
  /** Consecutive successes so far in this bracket - drives the pitch ladder. */
  streak: number;
  /** Which magnitude the win bracket is currently demonstrating. */
  tier: WinTier;
  /** The engine the header currently has selected. */
  engine: JuiceEngine;
}

export interface Arm {
  id: string;
  /** Revealed ONLY after the bracket is ranked. */
  name: string;
  blurb: { he: string; en: string };
  fire(ctx: ArmContext): void;
}

export interface Bracket {
  id: string;
  title: { he: string; en: string };
  question: { he: string; en: string };
  action: { he: string; en: string };
  /** Show the easy/medium/hard selector on this card. */
  tiered?: boolean;
  /** This bracket picks its own engine per arm; the header selector is ignored. */
  ownsEngine?: boolean;
  arms: Arm[];
}

const bilingual = (he: string, en: string) => ({ he, en });

// ---------------------------------------------------------------------------
// 1. Engine - which way of making sound
// ---------------------------------------------------------------------------

const engineBracket: Bracket = {
  id: "engine",
  ownsEngine: true,
  title: bilingual("מנוע הצליל", "Sound engine"),
  question: bilingual(
    "אותו רגע בדיוק, שלוש דרכים לייצר אותו. איזה נשמע הכי טוב?",
    "The same moment, three ways of producing it. Which sounds best?",
  ),
  action: bilingual("נגן", "Play"),
  arms: [
    {
      id: "engine-control",
      name: "Control - today's audio.ts",
      blurb: bilingual(
        "אוסילטור בודד, גובה צליל קבוע, בדיוק מה שהאפליקציה מנגנת היום.",
        "One oscillator, fixed pitch - exactly what the app plays today.",
      ),
      fire: (c) => realtimeEngine.play(CONTROL.correct, { at: c.engine.now() }),
    },
    {
      id: "engine-lean",
      name: "Arm A - realtime layered synth",
      blurb: bilingual(
        "רעש קצר + גוף + הרמוניה, מעטפת ADSR, וסטייה אקראית בגובה בכל נגינה. 0 קילובייט, בלי המתנה.",
        "Noise transient + body + harmonic, ADSR, random pitch jitter per play. 0 KB, no warmup.",
      ),
      fire: () => realtimeEngine.play(LEAN.correct),
    },
    {
      id: "engine-rich",
      name: "Arm B - offline-rendered buffers",
      blurb: bilingual(
        "אותם צלילים בדיוק, אבל עם הד ועם ערימת קולות מפוזרים - מרונדר פעם אחת מראש.",
        "The same voices plus reverb tail and a detuned unison stack - rendered once, up front.",
      ),
      fire: () => offlineEngine.play(RICH.correct),
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Tap - the highest-frequency event in the whole app
// ---------------------------------------------------------------------------

const tapBracket: Bracket = {
  id: "tap",
  title: bilingual("נגיעה", "Tap"),
  question: bilingual(
    "הדבר שילד עושה מאות פעמים. לחצו הרבה - הבדיקה היא אם זה מתעייף.",
    "The thing a child does hundreds of times. Tap a lot - the test is whether it tires.",
  ),
  action: bilingual("לחצו כאן", "Tap here"),
  arms: [
    {
      id: "tap-control",
      name: "Control - bare tap sound, no visual",
      blurb: bilingual(
        "מה שקורה היום: צליל אחד, זהה בכל פעם, בלי תגובה חזותית.",
        "What happens today: one sound, identical every time, no visual response.",
      ),
      fire: (c) => c.engine.play(CONTROL.tap),
    },
    {
      id: "tap-squash",
      name: "Layered click + pitch jitter + squash",
      blurb: bilingual(
        "קליק מרובד עם סטייה קלה בגובה, והאלמנט נדחס וקופץ חזרה.",
        "Layered click with slight pitch drift, and the element squashes then springs back.",
      ),
      fire: (c) => {
        c.engine.play(LEAN.tap);
        squash(c.el, { scale: 1.12, ms: 300, stretch: true });
        haptic.tap();
      },
    },
    {
      id: "tap-ripple",
      name: "...plus a ripple at the touch point",
      blurb: bilingual(
        "כמו הקודם, ובנוסף טבעת שמתפשטת בדיוק מהנקודה שנגעו בה.",
        "As above, plus a ring expanding from exactly where the finger landed.",
      ),
      fire: (c) => {
        c.engine.play(LEAN.tap);
        squash(c.el, { scale: 1.12, ms: 300, stretch: true });
        ripple(c.at.x, c.at.y);
        haptic.tap();
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Streak - does escalation read?
// ---------------------------------------------------------------------------

const streakBracket: Bracket = {
  id: "streak",
  title: bilingual("רצף תשובות נכונות", "Correct-answer streak"),
  question: bilingual(
    "לחצו חמש-שש פעמים ברצף. האם מרגישים שהרצף נבנה?",
    "Tap five or six times in a row. Does the run feel like it is building?",
  ),
  action: bilingual("נכון!", "Correct!"),
  arms: [
    {
      id: "streak-control",
      name: "Control - flat, identical every time",
      blurb: bilingual(
        "אותו צליל הצלחה בכל תשובה. תשובה עשירית נשמעת כמו הראשונה.",
        "The same success sound every answer. The tenth sounds like the first.",
      ),
      fire: (c) => c.engine.play(CONTROL.correct),
    },
    {
      id: "streak-ladder",
      name: "Pentatonic pitch ladder",
      blurb: bilingual(
        "כל תשובה נכונה עולה דרגה בסולם פנטטוני; טעות מחזירה לתחתית.",
        "Each correct answer climbs a pentatonic rung; a miss drops straight to the bottom.",
      ),
      fire: (c) => {
        c.engine.play(LEAN.correct, { semitones: ladderSemitones(c.streak) });
        haptic.success();
      },
    },
    {
      id: "streak-ladder-stop",
      name: "...plus hit-stop and squash",
      blurb: bilingual(
        "כמו הקודם, ובנוסף עצירת פריים של 90 מילישניות ודחיסה - משקל, לא רק גובה.",
        "As above, plus a 90ms freeze-frame and a squash - weight, not just pitch.",
      ),
      fire: (c) => {
        c.engine.play(LEAN.correct, { semitones: ladderSemitones(c.streak) });
        haptic.success();
        void hitStop(90, false).then(() => {
          squash(c.el, { scale: 1.22, ms: 340 });
          burst(c.at.x, c.at.y, { count: 8, spread: 50 });
        });
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Win - the big one
// ---------------------------------------------------------------------------

function playChord(c: ArmContext, semitones: number[], spec = LEAN.win): void {
  const t0 = c.engine.now();
  semitones.forEach((s, i) => {
    c.engine.play(transpose(spec, s), { at: t0 + i * 0.055, rate: 1 });
  });
}

const winBracket: Bracket = {
  id: "win",
  tiered: true,
  title: bilingual("רגע הניצחון", "The win moment"),
  question: bilingual(
    "החליפו בין קל/בינוני/קשה ולחצו. האם ניצחון קשה מרגיש גדול יותר?",
    "Switch between easy/medium/hard and fire. Does a hard win feel bigger?",
  ),
  action: bilingual("ניצחון!", "Win!"),
  arms: [
    {
      id: "win-control",
      name: "Control - today's winMoment, identical for every win",
      blurb: bilingual(
        "צליל, רטט, קונפטי, מטבעות - אותו דבר בדיוק בין אם זכיתם ב-3 מטבעות או ב-8.",
        "Sound, haptic, confetti, coins - byte-identical whether the win paid 3 coins or 8.",
      ),
      fire: (c) => {
        c.engine.play(CONTROL.win);
        haptic.win();
        celebrate();
        flyTo(c.at, c.wallet, { count: 5 });
      },
    },
    {
      id: "win-anticipate",
      name: "Anticipation + hit-stop, still one size",
      blurb: bilingual(
        "רגע של השהיה לפני הפיצוץ, ואז עצירת פריים. אותה עוצמה לכל ניצחון.",
        "A held beat before the payoff, then a freeze-frame. Same size for every win.",
      ),
      fire: (c) => {
        const i = winIntensity("medium");
        squash(c.el, { scale: 0.92, ms: i.anticipateMs });
        window.setTimeout(() => {
          playChord(c, i.chord);
          haptic.win();
          void hitStop(i.hitStopMs).then(() => {
            celebrateTiered(c.at, i);
            flyToRich(c.at, c.wallet, { count: 5, trail: true });
          });
        }, i.anticipateMs);
      },
    },
    {
      id: "win-tiered",
      name: "Magnitude-tiered - easy, medium and hard differ",
      blurb: bilingual(
        "העוצמה נגזרת מהדרגה: קל = הנהון, קשה = מצעד. גם כוכב מקבל רגע נפרד.",
        "Intensity comes from the tier: easy is a nod, hard is a parade. A star gets its own beat.",
      ),
      fire: (c) => {
        const i = winIntensity(c.tier);
        const coins = c.tier === "hard" ? 8 : c.tier === "medium" ? 5 : 3;
        squash(c.el, { scale: 0.92, ms: i.anticipateMs });
        window.setTimeout(() => {
          playChord(c, i.chord);
          haptic.win();
          void hitStop(i.hitStopMs).then(() => {
            celebrateTiered(c.at, i);
            flyToRich(c.at, c.wallet, {
              count: coins,
              trail: true,
              onLand: () => chipBounce(c.wallet),
            });
            // The star lands AFTER the coins have settled, so it reads as a
            // separate, rarer thing rather than more of the same.
            if (c.tier === "hard") {
              window.setTimeout(() => {
                c.engine.play(LEAN.star);
                flyToRich(c.at, c.wallet, { emoji: "⭐", count: 1, ms: 760 });
              }, 520);
            }
          });
        }, i.anticipateMs);
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Coin flight - "where did my reward go?"
// ---------------------------------------------------------------------------

const coinBracket: Bracket = {
  id: "coin",
  title: bilingual("מעוף המטבעות", "The coin flight"),
  question: bilingual(
    "המטבעות עפים לארנק. איזה מהם באמת נוחת?",
    "Coins fly to the wallet. Which of them actually lands?",
  ),
  action: bilingual("שלחו מטבעות", "Send coins"),
  arms: [
    {
      id: "coin-control",
      name: "Control - today's flyTo, silent arrival",
      blurb: bilingual(
        "המטבעות עפים ונעלמים. אין צליל נחיתה ואין תגובה מהארנק.",
        "The coins fly and vanish. No landing sound, no response from the chip.",
      ),
      fire: (c) => flyTo(c.at, c.wallet, { count: 5 }),
    },
    {
      id: "coin-trail",
      name: "Trail + a landing sound per coin",
      blurb: bilingual(
        "שובל דוהה מאחורי כל מטבע, וצליל קצר בכל נחיתה.",
        "A fading trail behind each coin, and a short sound as each one lands.",
      ),
      fire: (c) =>
        flyToRich(c.at, c.wallet, {
          count: 5,
          trail: true,
          onLand: () => c.engine.play(LEAN.coin),
        }),
    },
    {
      id: "coin-bounce",
      name: "...plus the wallet chip bouncing on each arrival",
      blurb: bilingual(
        "כמו הקודם, והארנק עצמו קופץ בכל מטבע שנוחת - היעד מגיב.",
        "As above, and the chip itself bounces per arriving coin - the destination answers back.",
      ),
      fire: (c) =>
        flyToRich(c.at, c.wallet, {
          count: 5,
          trail: true,
          onLand: () => {
            c.engine.play(LEAN.coin);
            chipBounce(c.wallet);
          },
        }),
    },
  ],
};

// ---------------------------------------------------------------------------
// 6. Wrong - the one that must NOT feel like punishment
// ---------------------------------------------------------------------------

const wrongBracket: Bracket = {
  id: "wrong",
  title: bilingual("תשובה שגויה", "Wrong answer"),
  question: bilingual(
    "אף אחד מאלה לא אמור להרגיש כמו עונש. איזה הכי מזמין לנסות שוב?",
    "None of these should feel like punishment. Which most invites another try?",
  ),
  action: bilingual("טעות", "Miss"),
  arms: [
    {
      id: "wrong-control",
      name: "Control - today's sawtooth buzz",
      blurb: bilingual(
        "מסור ב-180 הרץ למשך 180 מילישניות. חד יחסית לקהל של בני חמש.",
        "A 180Hz sawtooth for 180ms. Fairly harsh for an audience of five-year-olds.",
      ),
      fire: (c) => {
        c.engine.play(CONTROL.wrong);
        haptic.fail();
      },
    },
    {
      id: "wrong-thud",
      name: "Soft filtered thud, falling slightly",
      blurb: bilingual(
        "מכה עמומה שיורדת טון וחצי. אומרת 'לא זה', לא 'נכשלת'.",
        "A muted thud falling a tone and a half. It says 'not that one', not 'you failed'.",
      ),
      fire: (c) => {
        c.engine.play(LEAN.wrong);
        haptic.tap();
      },
    },
    {
      id: "wrong-lilt",
      name: "...with an upward lilt after it",
      blurb: bilingual(
        "אותה מכה, ואז נימה קטנה שעולה - קריאה מפורשת לנסות שוב.",
        "The same thud, then a small rising note - an explicit invitation to try again.",
      ),
      fire: (c) => {
        const t0 = c.engine.now();
        c.engine.play(LEAN.wrong, { at: t0 });
        c.engine.play(transpose(LEAN.wrong, 7), { at: t0 + 0.16, gain: 0.7 });
        haptic.tap();
      },
    },
  ],
};

export const BRACKETS: Bracket[] = [
  engineBracket,
  tapBracket,
  streakBracket,
  winBracket,
  coinBracket,
  wrongBracket,
];

/**
 * Every voice the lab can play - handed to `engine.warm()` before judging.
 * Duplicates are harmless: both engines key their caches on the spec OBJECT, and
 * the palette deliberately reuses the LEAN specs as its control characters.
 */
export const ALL_SPECS = [
  ...Object.values(CONTROL),
  ...Object.values(LEAN),
  ...Object.values(RICH),
  ...PALETTE_SPECS,
];

export const label = (t: { he: string; en: string }, locale: Locale) => t[locale];

/** Re-exported so the UI can drive a streak without importing specs directly. */
export { advanceLadder };
