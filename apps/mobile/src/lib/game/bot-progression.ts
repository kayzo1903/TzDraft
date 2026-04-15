/**
 * bot-progression.ts
 *
 * Tracks which AI levels the player has beaten, stored in AsyncStorage.
 * Progress is local (not tied to account). Backend sync is a Phase 3 item.
 *
 * Storage key: "tzdraft-bot-progress"
 * Value shape: { completedLevels: number[] }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "tzdraft-bot-progress";
const MAX_LEVEL = 19;
const GUEST_BASE_MAX = 5;

interface ProgressData {
  completedLevels: number[];
}

async function loadProgress(): Promise<ProgressData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressData;
  } catch {
    // Ignore parse errors — treat as fresh state
  }
  return { completedLevels: [] };
}

async function saveProgress(data: ProgressData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Check whether the given bot level is accessible to the player.
 *
 * Rules:
 *  - Guests default to levels 1-5; can unlock higher by beating each level.
 *  - Registered users can access all 19 levels immediately.
 *  - Anyone can unlock up to maxCompleted + 1 by beating levels sequentially.
 */
export async function isLevelUnlocked(
  level: number,
  isRegistered: boolean,
): Promise<boolean> {
  if (level < 1 || level > MAX_LEVEL) return false;

  const baseMax = isRegistered ? MAX_LEVEL : GUEST_BASE_MAX;
  if (level <= baseMax) return true;

  const { completedLevels } = await loadProgress();
  const maxCompleted = completedLevels.length > 0 ? Math.max(...completedLevels) : 0;
  return level <= maxCompleted + 1;
}

/**
 * Mark a level as completed.
 * Returns true if a new level was just unlocked (level + 1 is now accessible).
 */
export async function markLevelCompleted(
  level: number,
): Promise<{ newUnlock: number | null }> {
  const data = await loadProgress();
  if (!data.completedLevels.includes(level)) {
    data.completedLevels.push(level);
    await saveProgress(data);
  }
  const nextLevel = level + 1;
  const newUnlock = nextLevel <= MAX_LEVEL ? nextLevel : null;
  return { newUnlock };
}

/**
 * Synchronously-style check using a pre-loaded progress object.
 * Use this when you need to call isLevelUnlocked many times without
 * re-reading AsyncStorage on each call (e.g., building the bot list).
 */
export async function loadProgressSnapshot(): Promise<{
  isLevelUnlocked: (level: number, isRegistered: boolean) => boolean;
}> {
  const { completedLevels } = await loadProgress();
  const maxCompleted =
    completedLevels.length > 0 ? Math.max(...completedLevels) : 0;

  return {
    isLevelUnlocked(level: number, isRegistered: boolean): boolean {
      if (level < 1 || level > MAX_LEVEL) return false;
      const baseMax = isRegistered ? MAX_LEVEL : GUEST_BASE_MAX;
      if (level <= baseMax) return true;
      return level <= maxCompleted + 1;
    },
  };
}
