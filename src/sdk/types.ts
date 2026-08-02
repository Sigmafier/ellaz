// Ellaz Game SDK — the single contract every game implements.
// Framework-neutral on purpose: a game receives a mount element and plain
// services, so DOM (React) and canvas (Phaser) games share one interface, and
// the lifecycle/ads shape matches the Poki + CrazyGames union for later portability.
import type { Locale } from "@i18n/index";
import type { RewardReason, RewardTier } from "./economy";

export type { RewardReason, RewardTier };

export interface SaveStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

export interface AnalyticsPort {
  track(event: string, props?: Record<string, unknown>): void;
  levelStart(level: string): void;
  levelComplete(level: string, ms: number): void;
  levelFail(level: string, why?: string): void;
}

export interface ToneOptions {
  freq: number;
  /** Length in milliseconds. Default 120. */
  ms?: number;
  /** Oscillator waveform. Default "sine". */
  type?: OscillatorType;
  /** Peak gain 0..1. Default 0.2 — the same peak the named SFX use. */
  gain?: number;
  /**
   * ABSOLUTE AudioContext time to start at (see `time()`), for scheduling ahead
   * of the clock. Omitted = play now.
   */
  at?: number;
}

export interface AudioPort {
  readonly muted: boolean;
  toggleMute(): void;
  onMuteChange(cb: (muted: boolean) => void): () => void;
  /** Play a named short SFX. No-ops if muted or asset missing (best-effort). */
  play(name: SfxName): void;
  /**
   * Play a single pitched tone. For games that own their own scale — a
   * repeat-the-sequence game picking from `PENTATONIC` (`@shared`), or a rhythm
   * game scheduling beats against `time()`. Respects `muted`; safe before
   * `unlock()` (silently no-ops rather than throwing).
   */
  tone(opts: ToneOptions): void;
  /**
   * `AudioContext.currentTime`, or 0 when audio is unavailable. The master clock
   * for rhythm games: schedule with `at: time() + offsetSeconds`. Note this is a
   * SECONDS-based clock, unrelated to `performance.now()` — never mix the two.
   */
  time(): number;
  /** Must be called inside a user gesture to unlock audio on iOS. */
  unlock(): void;
}

export type SfxName = "tap" | "success" | "win" | "fail" | "flip" | "pop";

export interface SpeakOptions {
  /** Which language to speak in. Default "he" (the app's default locale). */
  locale?: Locale;
  /** Default 0.85 — measurably clearer for a 5-year-old than the 1.0 default. */
  rate?: number;
  /** Default 1.05. */
  pitch?: number;
  /** Cancel anything still speaking first. Default true. */
  interrupt?: boolean;
}

/**
 * Text-to-speech for pre-readers, via the browser's built-in Web Speech API.
 * Zero assets, zero network. See `speech.ts` for the HARD RULE governing use.
 */
export interface SpeechPort {
  /** Is there a usable voice for this locale RIGHT NOW? See `onAvailabilityChange`. */
  available(locale: Locale): boolean;
  /** Resolves when the utterance ends, or immediately when unavailable. NEVER rejects. */
  speak(text: string, opts?: SpeakOptions): Promise<void>;
  cancel(): void;
  /** Call inside a user gesture — same contract as audioPort.unlock(). */
  unlock(): void;
  /** Voices load ASYNC. Games MUST subscribe, not read once. Returns an unsubscribe fn. */
  onAvailabilityChange(cb: (available: boolean) => void): () => void;
}

export interface LifecyclePort {
  loadingStart(): void;
  loadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
}

export interface AdsPort {
  // No-op stubs in v1. Present so games written now list on Poki/CrazyGames later
  // with zero rewrites. interstitial() resolves when the (non-existent) ad ends;
  // rewarded() resolves true if the reward was granted.
  interstitial(): Promise<void>;
  rewarded(): Promise<boolean>;
}

/** What a game reports happened. It never says what that is WORTH. */
export interface RewardGrant {
  reason: RewardReason;
  tier?: RewardTier;
  /** Optional label for analytics ("level-7", "hard-3"). Never affects payout. */
  level?: string;
}

export interface RewardResult {
  /** Coins actually credited — 0 once the session cap is exhausted. */
  coins: number;
  stars: number;
  totalCoins: number;
  totalStars: number;
  /** True when the session cap swallowed some or all of the coin payout. */
  capped: boolean;
}

/**
 * The rewards surface a game gets. There is DELIBERATELY NO `spend()` here.
 *
 * Games can only ever ADD to the wallet. Spending happens in exactly one place
 * — the portal's World screen, against the wallet singleton directly — so no
 * game, present or future, can take a player's coins, and no bug in a game can
 * either. That asymmetry is the whole safety story of this port; if you find
 * yourself wanting `spend()` here, the feature belongs in the World screen.
 *
 * The payout is likewise not the game's to choose: `grant()` takes a REASON and
 * derives coins and stars from economy.ts. A game cannot ask for 500 coins.
 */
export interface RewardsPort {
  readonly coins: number;
  readonly stars: number;
  grant(g: RewardGrant): RewardResult;
}

export interface GameContext {
  mount: HTMLElement;
  locale: Locale;
  dir: "rtl" | "ltr";
  t(key: string): string;
  storage: SaveStore;
  analytics: AnalyticsPort;
  audio: AudioPort;
  /** Speak Hebrew/English aloud for pre-readers. ALWAYS supplementary — see speech.ts. */
  speech: SpeechPort;
  lifecycle: LifecyclePort;
  ads: AdsPort;
  /** Earn coins/stars. Add-only by design — see RewardsPort. */
  rewards: RewardsPort;
  /** Portal asks the game to exit back to the home grid. */
  onRequestExit(cb: () => void): void;
  requestExit(): void;
  onPause(cb: () => void): () => void;
  onResume(cb: () => void): () => void;
  onResize(cb: (w: number, h: number) => void): () => void;
}

export type AgeBand = "kids" | "all";
export type Renderer = "dom" | "phaser";
/**
 * Home-grid sections, in render order. Adding a value here is half the job — the
 * other half is a matching i18n key and an entry in `CATEGORY_ORDER` (Home.tsx),
 * which is what actually decides order and skips empty sections.
 */
export type Category = "kids" | "learn" | "think" | "speed" | "create" | "classics";

export interface GameMeta {
  id: string;
  title: Record<Locale, string>;
  emoji: string; // simple icon for the home grid (icon-first, kid-friendly)
  color: string; // card accent
  ageBand: AgeBand;
  category: Category;
  orientation: "portrait" | "landscape" | "any";
  renderer: Renderer;
}

export interface GameModule {
  meta: GameMeta;
  /** Mount the game into ctx.mount. Resolve once interactive. */
  mount(ctx: GameContext): Promise<void>;
  /** Tear down: stop loops, remove listeners, free the mount element's children. */
  unmount(): void;
}
