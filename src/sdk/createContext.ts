import type { Locale } from "@i18n/index";
import { makeT, DIR } from "@i18n/index";
import type { GameContext } from "./types";
import { createSaveStore } from "./storage";
import { createAnalyticsPort } from "./analytics";
import { audioPort } from "./audio";
import { speechPort } from "./speech";
import { createRewardsPort } from "./wallet";

// Assembles the GameContext the portal hands to a game on mount. Owns the
// pause/resume/resize/exit wiring; a game only subscribes to what it needs.
export interface HostControls {
  context: GameContext;
  /** Portal calls these; they fan out to the game's subscribers. */
  emitPause(): void;
  emitResume(): void;
  emitResize(w: number, h: number): void;
  /** Resolves the exit callback the game registered (undefined if none). */
  getExitHandler(): (() => void) | undefined;
}

export function createHostControls(gameId: string, locale: Locale, mount: HTMLElement): HostControls {
  const pauseCbs = new Set<() => void>();
  const resumeCbs = new Set<() => void>();
  const resizeCbs = new Set<(w: number, h: number) => void>();
  let exitHandler: (() => void) | undefined;
  let requestExit: () => void = () => {};

  const context: GameContext = {
    mount,
    locale,
    dir: DIR[locale],
    t: makeT(locale),
    storage: createSaveStore(gameId),
    analytics: createAnalyticsPort(gameId),
    audio: audioPort,
    // Shared like audio: voice availability and the mute link are app-global.
    speech: speechPort,
    // One port per MOUNT — the session coin cap is a budget for this sitting,
    // so it belongs here rather than on the shared wallet.
    rewards: createRewardsPort(gameId),
    lifecycle: {
      loadingStart: () => context.analytics.track("game_loading_start"),
      loadingFinished: () => context.analytics.track("game_loading_finished"),
      gameplayStart: () => context.analytics.track("gameplay_start"),
      gameplayStop: () => context.analytics.track("gameplay_stop"),
    },
    ads: {
      // v1 no-op stubs (see AdsPort docs).
      interstitial: () => Promise.resolve(),
      rewarded: () => Promise.resolve(false),
    },
    onRequestExit: (cb) => {
      exitHandler = cb;
    },
    requestExit: () => requestExit(),
    onPause: (cb) => {
      pauseCbs.add(cb);
      return () => pauseCbs.delete(cb);
    },
    onResume: (cb) => {
      resumeCbs.add(cb);
      return () => resumeCbs.delete(cb);
    },
    onResize: (cb) => {
      resizeCbs.add(cb);
      return () => resizeCbs.delete(cb);
    },
  };

  // Let the portal override requestExit target after construction.
  Object.defineProperty(context, "__setRequestExit", {
    value: (fn: () => void) => {
      requestExit = fn;
    },
    enumerable: false,
  });

  return {
    context,
    emitPause: () => pauseCbs.forEach((cb) => cb()),
    emitResume: () => resumeCbs.forEach((cb) => cb()),
    emitResize: (w, h) => resizeCbs.forEach((cb) => cb(w, h)),
    getExitHandler: () => exitHandler,
  };
}
