/**
 * bot-progression.ts
 *
 * Local AI level progress — AsyncStorage layer.
 * Matches the web version's key names and logic so local state can be synced
 * to the backend via aiChallengeService.syncLocalProgress() after login.
 *
 * Keys (aligned with web localStorage keys):
 *   tzdraft:bot-completed-levels  → number[]
 *   tzdraft:bot-max-level         → number
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_COMPLETED = "tzdraft:bot-completed-levels";
const KEY_MAX       = "tzdraft:bot-max-level";

export const INITIAL_FREE_LEVELS = 3; // matches backend default
export const MAX_LEVEL = 19;

// ─── In-memory cache ─────────────────────────────────────────────────────────
// Populated on the first AsyncStorage read so subsequent synchronous reads
// (e.g. useState initial value in setup-ai) return instantly without a flash.

let _cachedMax: number = INITIAL_FREE_LEVELS;
let _cacheReady = false; // true once we've done at least one real read

/**
 * Synchronous read from the in-memory cache.
 * Returns INITIAL_FREE_LEVELS until the first async read has completed.
 * Use this as the useState initial value so the screen renders correctly
 * on revisits without waiting for AsyncStorage.
 */
export function getCachedMaxUnlockedLevel(): number {
  return _cachedMax;
}

// ─── Local read / write ───────────────────────────────────────────────────────

async function getCompletedLevels(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_COMPLETED);
    if (raw) return JSON.parse(raw) as number[];
  } catch {}
  return [];
}

async function getMaxUnlockedLevel(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MAX);
    if (raw) {
      const parsed = parseInt(raw, 10);
      _cachedMax = parsed;
      _cacheReady = true;
      return parsed;
    }
  } catch {}
  _cacheReady = true;
  return INITIAL_FREE_LEVELS;
}

async function setCompletedLevels(levels: number[]): Promise<void> {
  await AsyncStorage.setItem(KEY_COMPLETED, JSON.stringify(levels));
}

async function setMaxUnlockedLevel(level: number): Promise<void> {
  _cachedMax = level; // update cache immediately so next sync read is correct
  await AsyncStorage.setItem(KEY_MAX, String(level));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the locally-stored progress snapshot — used when the backend
 * is unavailable or the user is a guest.
 */
export async function getLocalBotProgressSnapshot(): Promise<{
  completedLevels: number[];
  maxUnlockedAiLevel: number;
}> {
  const [completedLevels, maxUnlockedAiLevel] = await Promise.all([
    getCompletedLevels(),
    getMaxUnlockedLevel(),
  ]);
  return { completedLevels, maxUnlockedAiLevel };
}

/**
 * True if the player has beaten any levels beyond the initial 3 free ones —
 * i.e. there is meaningful offline progress worth syncing to the server.
 */
export async function hasLocalBotProgressToSync(): Promise<boolean> {
  const { completedLevels, maxUnlockedAiLevel } = await getLocalBotProgressSnapshot();
  return completedLevels.length > 0 || maxUnlockedAiLevel > INITIAL_FREE_LEVELS;
}

/**
 * Check whether the given bot level is accessible locally.
 * The authoritative unlock state comes from the backend for registered users;
 * use this only for guests or as an offline fallback.
 */
export async function isLevelUnlocked(level: number): Promise<boolean> {
  if (level < 1 || level > MAX_LEVEL) return false;
  const max = await getMaxUnlockedLevel();
  return level <= max;
}

/**
 * Mark a level as completed locally.
 * Also advances maxUnlockedLevel if this beats the current ceiling.
 * Returns the new maxUnlockedLevel so the caller can detect a tier crossing.
 */
export async function markLevelCompletedLocally(
  level: number,
): Promise<{ newMaxUnlocked: number }> {
  const [completed, currentMax] = await Promise.all([
    getCompletedLevels(),
    getMaxUnlockedLevel(),
  ]);

  if (!completed.includes(level)) {
    completed.push(level);
    await setCompletedLevels(completed);
  }

  const newMax = Math.min(MAX_LEVEL, Math.max(currentMax, level + 1));
  if (newMax > currentMax) {
    await setMaxUnlockedLevel(newMax);
  }

  return { newMaxUnlocked: newMax };
}

/**
 * Overwrite local progress with data received from the server.
 * Called after a successful completeSession() or syncLocalProgress() response.
 */
export async function applyServerProgression(progression: {
  completedLevels: number[];
  highestUnlockedAiLevel: number;
}): Promise<void> {
  await Promise.all([
    setCompletedLevels(progression.completedLevels),
    setMaxUnlockedLevel(progression.highestUnlockedAiLevel),
  ]);
}

/**
 * Clears local AI progress entirely. Used during logout to prevent
 * the next user from inheriting the previous user's local state.
 */
export async function clearLocalBotProgress(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEY_COMPLETED),
    AsyncStorage.removeItem(KEY_MAX),
  ]);
  _cachedMax = INITIAL_FREE_LEVELS;
}

/**
 * Returns a sync snapshot of progress from a pre-loaded object — avoids
 * repeated AsyncStorage reads when building the full bot list.
 */
export function makeProgressChecker(maxUnlockedAiLevel: number) {
  return function isUnlocked(level: number): boolean {
    if (level < 1 || level > MAX_LEVEL) return false;
    return level <= maxUnlockedAiLevel;
  };
}
