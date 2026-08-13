/**
 * Hebrew (and English) text-to-speech for kids who cannot read yet.
 *
 * Uses the browser's built-in Web Speech API — no assets, no network request,
 * nothing to precache. Voices ship with the operating system.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HARD RULE — SPEECH IS ALWAYS SUPPLEMENTARY, NEVER THE QUESTION ITSELF.
 *
 * A voice can be present in `getVoices()`, be selected, fire `onend` on time,
 * and still emit NO SOUND (some Android WebViews, some locked-down kiosks).
 * That failure is undetectable from JavaScript — there is no signal to check.
 *
 * So every game MUST work with the sound off. A letter game SHOWS the letter and
 * offers a speaker button that says it; it never asks "tap what you hear" unless
 * `available(locale)` is true, and even then the visible affordance stays. If
 * removing speech would make the game unplayable, the design is wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Five more real-world traps this module absorbs so games don't have to:
 *
 * 1. `getVoices()` returns `[]` until the `voiceschanged` event fires — always on
 *    Chrome, sometimes on Safari. A game that reads `available()` once at mount
 *    concludes "no Hebrew" on a machine that has it. Hence `onAvailabilityChange`,
 *    which is mandatory, not optional.
 * 2. iOS refuses the first `speak()` outside a user gesture → `unlock()` speaks a
 *    silent utterance, exactly like `audioPort.unlock()`.
 * 3. Speech respects `audioPort.muted`. The header mute button is the only sound
 *    control a parent will find; speech that ignored it would make the app
 *    un-mutable.
 * 4. Chrome goes silent after ~15s of continuous synthesis and pauses on tab
 *    hide, and can then never fire `onend` → we cancel before each speak, keep
 *    utterances short (single letters/words is the whole use case), and arm a
 *    watchdog so an awaited `speak()` can never hang a game loop forever.
 * 5. Nothing here throws or rejects. Ever. Speech failing must not be a bug
 *    report — it must be silence.
 */
import { DEFAULT_LOCALE as APP_DEFAULT_LOCALE, type Locale } from "@i18n/index";
import type { SpeakOptions, SpeechPort } from "./types";
import { audioPort } from "./audio";
import { analytics } from "./analytics";

const DEFAULT_RATE = 0.85; // much clearer for a 5-year-old than the 1.0 default
const DEFAULT_PITCH = 1.05;
// Which language a caller that names none is read aloud in. It follows the
// app's own default rather than restating it, so the two can never disagree
// about what "no language given" means - it moved to English on 2026-08-14
// with the root, and nothing here had to be found and edited.
//
// Games that care pass `locale` explicitly, so this is the fallback for a
// call site that genuinely does not know, not a policy every game inherits.
const DEFAULT_LOCALE: Locale = APP_DEFAULT_LOCALE;

/** How long to wait for a `voiceschanged` that may never come, before reporting. */
const SETTLE_MS = 3000;

type LangMatch = (lang: string) => boolean;

/** Exact BCP-47 tag, case-insensitive. */
const exact =
  (tag: string): LangMatch =>
  (lang) =>
    lang === tag;

/**
 * Anchored language-subtag match: "he" matches `he` and `he-IL`, never `hea-XX`.
 * (Bare `startsWith("he")` is the classic over-match — see the anchored-gate rule.)
 */
const subtag =
  (code: string): LangMatch =>
  (lang) =>
    lang === code || lang.startsWith(`${code}-`);

/**
 * Preference chain per locale, most specific first. Hebrew has exactly one
 * region so its chain is short; English needs US → GB → anything.
 */
const CHAINS: Record<Locale, LangMatch[]> = {
  he: [exact("he-il"), subtag("he")],
  en: [exact("en-us"), exact("en-gb"), subtag("en")],
  // Spanish has many regions and no single right answer, so the chain does
  // not prefer one country over another - it asks for Latin American
  // Spanish first only because more of the world's speakers are there,
  // then falls through to any Spanish voice the platform has.
  es: [exact("es-mx"), exact("es-us"), exact("es-es"), subtag("es")],
};

/**
 * Choose the best voice for a locale, or null when the platform has none.
 *
 * PURE on purpose — no `speechSynthesis`, no globals — so the selection logic is
 * unit-testable in the node test environment where no browser exists.
 *
 * Specificity wins first (an en-US remote voice beats an en-GB local one), and
 * `localService` breaks ties WITHIN a tier: local voices work offline, which is
 * the whole promise of a PWA that plays on a tablet in the back of a car.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null {
  const chain = CHAINS[locale] ?? CHAINS[DEFAULT_LOCALE];
  for (const matches of chain) {
    const tier = voices.filter((v) => matches((v?.lang ?? "").toLowerCase()));
    if (tier.length === 0) continue;
    return tier.find((v) => v.localService) ?? tier[0] ?? null;
  }
  return null;
}

/** Rough upper bound on how long an utterance can legitimately take. */
function watchdogMs(text: string): number {
  return Math.min(30_000, Math.max(3_000, text.length * 220 + 2_000));
}

class WebSpeechPort implements SpeechPort {
  private listeners = new Set<(available: boolean) => void>();
  private bound = false;
  private unlocked = false;
  private reported = new Set<Locale>();
  private settling = new Set<Locale>();
  /**
   * The locale of the most recent `available()`/`speak()` call. Callers of
   * `onAvailabilityChange` get the answer for THIS locale — the callback
   * signature carries no locale of its own, so the documented usage is
   * `available(ctx.locale)` first, then subscribe.
   */
  private lastLocale: Locale = DEFAULT_LOCALE;

  private synth(): SpeechSynthesis | null {
    try {
      if (typeof window === "undefined") return null;
      return "speechSynthesis" in window ? window.speechSynthesis : null;
    } catch {
      return null;
    }
  }

  private voices(): SpeechSynthesisVoice[] {
    const s = this.synth();
    if (!s) return [];
    try {
      return s.getVoices() ?? [];
    } catch {
      return [];
    }
  }

  /** Wire the async voice list and the mute link, once, on first real use. */
  private ensureBound(): void {
    if (this.bound) return;
    this.bound = true;
    const s = this.synth();
    try {
      s?.addEventListener?.("voiceschanged", () => this.onVoicesChanged());
    } catch {
      /* older Safari: no addEventListener on speechSynthesis — availability is
         then whatever the first getVoices() returned, which Safari populates. */
    }
    // Trap 3: the header mute button must silence speech too, mid-utterance.
    audioPort.onMuteChange((muted) => {
      if (muted) this.cancel();
    });
  }

  private onVoicesChanged(): void {
    const now = this.compute(this.lastLocale);
    this.reportOnce(this.lastLocale, now, true);
    this.listeners.forEach((cb) => {
      try {
        cb(now);
      } catch {
        /* a subscriber's error is not our problem */
      }
    });
  }

  private compute(locale: Locale): boolean {
    return pickVoice(this.voices(), locale) !== null;
  }

  /**
   * Anonymous reach measurement: how many real devices actually have a Hebrew
   * voice? Fires once per locale per session, and ONLY on a definitive reading —
   * reporting the empty pre-`voiceschanged` list would record `false` on every
   * Chrome in the world (see trap 1).
   */
  private reportOnce(locale: Locale, available: boolean, definitive: boolean): void {
    if (this.reported.has(locale)) return;
    if (!definitive) {
      this.scheduleSettle(locale);
      return;
    }
    this.reported.add(locale);
    // Anonymous + COPPA-safe: a locale and a boolean, no PII. `track` already
    // swallows its own failures, so this can never break gameplay.
    analytics.track("speech_available", { locale, available });
  }

  /** No voices yet: give the platform SETTLE_MS, then report whatever we have. */
  private scheduleSettle(locale: Locale): void {
    if (this.settling.has(locale)) return;
    this.settling.add(locale);
    setTimeout(() => {
      if (this.reported.has(locale)) return;
      this.reported.add(locale);
      analytics.track("speech_available", { locale, available: this.compute(locale) });
    }, SETTLE_MS);
  }

  available(locale: Locale): boolean {
    this.ensureBound();
    this.lastLocale = locale;
    const s = this.synth();
    if (!s) {
      // No API at all is a definitive answer — nothing will ever load.
      this.reportOnce(locale, false, true);
      return false;
    }
    const voices = this.voices();
    const ok = pickVoice(voices, locale) !== null;
    this.reportOnce(locale, ok, voices.length > 0);
    return ok;
  }

  onAvailabilityChange(cb: (available: boolean) => void): () => void {
    this.ensureBound();
    this.listeners.add(cb);
    // Fire immediately so a game can subscribe and never poll. The value is for
    // `lastLocale` — call `available(ctx.locale)` before subscribing.
    try {
      cb(this.compute(this.lastLocale));
    } catch {
      /* ignore */
    }
    return () => this.listeners.delete(cb);
  }

  unlock(): void {
    this.ensureBound();
    const s = this.synth();
    if (!s || this.unlocked) return;
    this.unlocked = true;
    try {
      // A silent utterance inside the gesture is what actually opens iOS's gate.
      // Deliberately NOT mute-gated: it makes no sound, and skipping it would
      // leave speech locked forever if the parent unmutes later.
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      s.speak(u);
    } catch {
      /* ignore */
    }
  }

  cancel(): void {
    try {
      this.synth()?.cancel();
    } catch {
      /* ignore */
    }
  }

  speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    this.ensureBound();
    const locale = opts.locale ?? DEFAULT_LOCALE;
    this.lastLocale = locale;

    if (audioPort.muted) return Promise.resolve();
    if (!text) return Promise.resolve();

    const s = this.synth();
    if (!s) return Promise.resolve();
    const voice = pickVoice(this.voices(), locale);
    if (!voice) return Promise.resolve();

    // Trap 4: Chrome's synthesis queue wedges if you stack utterances on it.
    if (opts.interrupt ?? true) this.cancel();

    return new Promise<void>((resolve) => {
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (done) return;
        done = true;
        if (timer !== undefined) clearTimeout(timer);
        resolve();
      };
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = opts.rate ?? DEFAULT_RATE;
        u.pitch = opts.pitch ?? DEFAULT_PITCH;
        u.onend = finish;
        // Resolve (never reject) on error — a caller awaiting speech must not
        // need a try/catch to keep the game running.
        u.onerror = finish;
        // Watchdog: Chrome can drop an utterance without ever firing onend.
        timer = setTimeout(finish, watchdogMs(text));
        s.speak(u);
      } catch {
        finish();
      }
    });
  }
}

/** One shared speech port for the whole app (mute + voice state are global). */
export const speechPort: SpeechPort = new WebSpeechPort();
