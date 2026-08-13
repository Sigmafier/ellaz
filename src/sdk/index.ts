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
  SessionPort,
  SessionSpec,
  DailyPort,
  DailySummary,
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
// "Carry on where you left off". One file owns every rule for when a stored
// position is still safe to load, so 22 games cannot each answer it differently
// — and a wrong answer here renders a plausible board, not an error.
export {
  SESSION_KEY,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_BYTES,
  createSessionPort,
} from "./session";
// The daily puzzle and the streak. `daily.ts` is the pure policy (which game,
// which day, what a day does to the streak) plus the one key that remembers it.
// Games only ever see `ctx.daily`, whose `complete()` takes no arguments — so a
// game cannot tell it that today counts, any more than it can name a payout.
// `dailyStreak` is the singleton the portal chrome subscribes to.
export {
  DAILY_KEY,
  advance,
  createDailyPort,
  createDailyStore,
  dailyPick,
  dailyRng,
  dailySeed,
  dailyStreak,
  dayDiff,
  emptyDaily,
  isDateKey,
  localDateKey,
  migrateDaily,
  shiftDateKey,
  type DailyStateV1,
  type DailyStore,
  type DailyWrite,
} from "./daily";

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

// Cloud backup. Only the THIN half is exported here — `cloud.ts` itself is
// dynamically imported by cloudSync so it stays out of the shell chunk. Adding
// a re-export of `./cloud` to this barrel would silently undo that.
export {
  startCloudSync,
  pushNow,
  cloudIdentity,
  cloudRestore,
  publishScore,
  boardStanding,
} from "./cloudSync";
export { boardId, windowsFor, isSafeId, type BoardWindows } from "./board";
export type { CloudIdentity, DeviceState, BoardStanding, BoardWindow, BoardRow } from "./cloud";
// The no-last-place rule, and the only place it is decided.
export {
  standingView,
  ownBest,
  youLine,
  RANK_CUTOFF,
  SHOW_PERCENTILE_UPTO,
  type StandingView,
  type YouLine,
  type Standing,
} from "./standing";
// Personal bests are the half of a transfer that does NOT live in the profile.
export {
  readRecords,
  adoptRecords,
  canUndoRecords,
  undoRecords,
  parseRecordKey,
  recordKey,
  type Records,
} from "./records";
