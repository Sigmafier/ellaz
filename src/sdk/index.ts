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
  ScorePort,
  ScoreReport,
  ScoreResult,
  ScoreUnit,
  ScoreDirection,
} from "./types";
export { createSaveStore } from "./storage";
export { createAnalyticsPort, analytics } from "./analytics";
export { audioPort } from "./audio";
export { speechPort, pickVoice } from "./speech";
export { createHostControls, type HostControls } from "./createContext";

// Rewards economy — earn rates, the persisted profile, and the wallet.
// Games only ever see ctx.rewards (add-only); the World screen imports `wallet`.
export { TIER_COINS, SESSION_COIN_CAP, coinsFor, starsFor } from "./economy";

// The score contract — the ranking sibling of the economy. score.ts is the pure
// policy (which way a unit sorts); scoreboard.ts persists the personal best.
// Games only ever see ctx.score, which cannot say which direction it ranks.
export { UNIT_DIRECTION, bestOf, directionFor, formatScore, isBetter, isRankable } from "./score";
export { SCORE_KEY_PREFIX, createScorePort } from "./scoreboard";
// The name pool — the player's display name, held as word ids so it renders in
// whichever language the app is in. No child ever types a name.
export {
  ADJECTIVES,
  NOUNS,
  NAME_COMBINATIONS,
  isPlayerName,
  nameEmoji,
  pickName,
  renderName,
  rerollName,
  resolveName,
  type PlayerName,
  type Adjective,
  type Noun,
  type Gender,
} from "./names";

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
