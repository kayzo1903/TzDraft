const STORAGE_KEY = "tzdraft:bot-max-unlocked";

export const getMaxUnlockedBotLevel = (): number => {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 7);
  } catch {
    return 1;
  }
};

export const setMaxUnlockedBotLevel = (level: number) => {
  if (typeof window === "undefined") return;
  const normalized = Math.min(Math.max(level, 1), 7);
  window.localStorage.setItem(STORAGE_KEY, String(normalized));
};

export const unlockNextBotLevel = (currentBotLevel: number) => {
  if (typeof window === "undefined") return;
  const next = Math.min(Math.max(currentBotLevel + 1, 1), 7);
  const existing = getMaxUnlockedBotLevel();
  if (next > existing) {
    setMaxUnlockedBotLevel(next);
  }
};

