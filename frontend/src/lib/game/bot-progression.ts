const LEGACY_STORAGE_KEY = "tzdraft:bot-max-unlocked";
const UNLOCKED_TIER_KEY = "tzdraft:bot-unlocked-tier";
const COMPLETED_LEVELS_KEY = "tzdraft:bot-completed-levels";
const MAX_UNLOCKED_LEVEL_KEY = "tzdraft:bot-max-level";

export const BOT_TIERS: ReadonlyArray<readonly [number, number]> = [
  [1, 5],
  [6, 9],
  [10, 13],
  [14, 16],
  [17, 19],
];

export const TOTAL_BOT_LEVELS = 19;
export const INITIAL_FREE_LEVELS = 5;

const clampLevel = (level: number) => Math.min(Math.max(level, 1), TOTAL_BOT_LEVELS);

const getTierIndexByLevel = (level: number): number => {
  const normalized = clampLevel(level);
  const found = BOT_TIERS.findIndex(
    ([start, end]) => normalized >= start && normalized <= end,
  );
  return found >= 0 ? found : 0;
};

const setUnlockedTierIndex = (tierIndex: number) => {
  if (typeof window === "undefined") return;
  const normalized = Math.min(Math.max(tierIndex, 0), BOT_TIERS.length - 1);
  window.localStorage.setItem(UNLOCKED_TIER_KEY, String(normalized));
};

const getCompletedLevelsSet = (): Set<number> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COMPLETED_LEVELS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    const valid = parsed
      .map((value) => Number(value))
      .filter(
        (value) => Number.isInteger(value) && value >= 1 && value <= TOTAL_BOT_LEVELS,
      );
    return new Set(valid);
  } catch {
    return new Set();
  }
};

const saveCompletedLevelsSet = (completed: Set<number>) => {
  if (typeof window === "undefined") return;
  const ordered = Array.from(completed.values()).sort((a, b) => a - b);
  window.localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(ordered));
};

export const getMaxUnlockedBotLevel = (): number => {
  if (typeof window === "undefined") return INITIAL_FREE_LEVELS;

  const raw = window.localStorage.getItem(MAX_UNLOCKED_LEVEL_KEY);
  const parsed = Number(raw);
  if (raw && !Number.isNaN(parsed) && parsed >= 1) {
    return Math.min(Math.max(parsed, INITIAL_FREE_LEVELS), TOTAL_BOT_LEVELS);
  }

  // Migrate from legacy tier-based storage
  const tierRaw = window.localStorage.getItem(UNLOCKED_TIER_KEY);
  const tierParsed = Number(tierRaw);
  if (!tierRaw && typeof window !== "undefined") {
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacyLevel = Number(legacyRaw);
    if (legacyRaw && !Number.isNaN(legacyLevel)) {
      const tierIdx = getTierIndexByLevel(legacyLevel);
      const migratedMax = BOT_TIERS[tierIdx][1];
      window.localStorage.setItem(MAX_UNLOCKED_LEVEL_KEY, String(migratedMax));
      return migratedMax;
    }
  }
  if (tierRaw && !Number.isNaN(tierParsed)) {
    const tierIdx = Math.min(Math.max(tierParsed, 0), BOT_TIERS.length - 1);
    const migratedMax = BOT_TIERS[tierIdx][1];
    window.localStorage.setItem(MAX_UNLOCKED_LEVEL_KEY, String(migratedMax));
    return migratedMax;
  }

  return INITIAL_FREE_LEVELS;
};

export const getCompletedBotLevels = (): number[] => {
  return Array.from(getCompletedLevelsSet().values()).sort((a, b) => a - b);
};

export const isBotLevelCompleted = (level: number): boolean => {
  return getCompletedLevelsSet().has(clampLevel(level));
};

export const isBotLevelUnlocked = (level: number): boolean => {
  return clampLevel(level) <= getMaxUnlockedBotLevel();
};

export const unlockAllBotLevels = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MAX_UNLOCKED_LEVEL_KEY, String(TOTAL_BOT_LEVELS));
  setUnlockedTierIndex(BOT_TIERS.length - 1);
  const completed = new Set<number>();
  for (let level = 1; level <= TOTAL_BOT_LEVELS; level++) completed.add(level);
  saveCompletedLevelsSet(completed);
};

export const unlockNextBotLevel = (currentBotLevel: number) => {
  if (typeof window === "undefined") return;
  const level = clampLevel(currentBotLevel);
  const completed = getCompletedLevelsSet();
  completed.add(level);
  saveCompletedLevelsSet(completed);

  if (level >= TOTAL_BOT_LEVELS) return;

  const currentMax = getMaxUnlockedBotLevel();
  const nextLevel = level + 1;
  if (nextLevel > currentMax) {
    window.localStorage.setItem(MAX_UNLOCKED_LEVEL_KEY, String(nextLevel));
    // Keep tier index in sync for compatibility
    setUnlockedTierIndex(getTierIndexByLevel(nextLevel));
  }
};
