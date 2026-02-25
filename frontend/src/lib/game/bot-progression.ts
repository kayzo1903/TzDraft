const LEGACY_STORAGE_KEY = "tzdraft:bot-max-unlocked";
const UNLOCKED_TIER_KEY = "tzdraft:bot-unlocked-tier";
const COMPLETED_LEVELS_KEY = "tzdraft:bot-completed-levels";

export const BOT_TIERS: ReadonlyArray<readonly [number, number]> = [
  [1, 5],
  [6, 9],
  [10, 13],
  [14, 16],
  [17, 19],
];

export const TOTAL_BOT_LEVELS = 19;

const clampLevel = (level: number) => Math.min(Math.max(level, 1), TOTAL_BOT_LEVELS);

const getTierIndexByLevel = (level: number): number => {
  const normalized = clampLevel(level);
  const found = BOT_TIERS.findIndex(
    ([start, end]) => normalized >= start && normalized <= end,
  );
  return found >= 0 ? found : 0;
};

const getDefaultTierIndexFromLegacy = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed)) return 0;
  return getTierIndexByLevel(parsed);
};

const getUnlockedTierIndex = (): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(UNLOCKED_TIER_KEY);
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed)) {
    const fallback = getDefaultTierIndexFromLegacy();
    window.localStorage.setItem(UNLOCKED_TIER_KEY, String(fallback));
    return fallback;
  }
  return Math.min(Math.max(parsed, 0), BOT_TIERS.length - 1);
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

const isTierComplete = (tierIndex: number, completed: Set<number>): boolean => {
  const [start, end] = BOT_TIERS[tierIndex];
  for (let level = start; level <= end; level += 1) {
    if (!completed.has(level)) return false;
  }
  return true;
};

export const getMaxUnlockedBotLevel = (): number => {
  const tierIndex = getUnlockedTierIndex();
  return BOT_TIERS[tierIndex][1];
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

export const unlockNextBotLevel = (currentBotLevel: number) => {
  if (typeof window === "undefined") return;
  const level = clampLevel(currentBotLevel);
  const completed = getCompletedLevelsSet();
  completed.add(level);
  saveCompletedLevelsSet(completed);

  const tierIndex = getUnlockedTierIndex();
  if (tierIndex >= BOT_TIERS.length - 1) return;

  const [tierStart, tierEnd] = BOT_TIERS[tierIndex];
  if (level < tierStart || level > tierEnd) return;

  if (isTierComplete(tierIndex, completed)) {
    setUnlockedTierIndex(tierIndex + 1);
  }
};