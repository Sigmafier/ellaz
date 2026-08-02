export type {
  GameModule,
  GameContext,
  GameMeta,
  SaveStore,
  AnalyticsPort,
  AudioPort,
  AdsPort,
  LifecyclePort,
  SfxName,
  ToneOptions,
  SpeechPort,
  SpeakOptions,
  AgeBand,
  Renderer,
  Category,
  RewardsPort,
  RewardGrant,
  RewardResult,
  RewardReason,
  RewardTier,
} from "./types";
export { createSaveStore } from "./storage";
export { createAnalyticsPort, analytics } from "./analytics";
export { audioPort } from "./audio";
export { speechPort, pickVoice } from "./speech";
export { createHostControls, type HostControls } from "./createContext";

// Rewards economy — earn rates, the persisted profile, and the wallet.
// Games only ever see ctx.rewards (add-only); the World screen imports `wallet`.
export { TIER_COINS, SESSION_COIN_CAP, coinsFor, starsFor } from "./economy";
export {
  PROFILE_KEY,
  emptyProfile,
  migrateProfile,
  localStorageBackend,
  memoryBackend,
  type ProfileV1,
  type GameRecord,
  type KeyValueBackend,
} from "./profile";
export { wallet, createWallet, createRewardsPort, type Wallet, type BuyResult } from "./wallet";
