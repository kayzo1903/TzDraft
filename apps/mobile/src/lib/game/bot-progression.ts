/**
 * bot-progression.ts
 *
 * Local AI level progress — AsyncStorage layer.
 *
 * Keys are scoped by userId so progress from one user can never bleed into
 * another user's session (registered or guest).  Guest sessions share the
 * "guest" scope because they are ephemeral and device-local.
 *
 *   tzdraft:bot-completed-levels:<scope>  → number[]
 *   tzdraft:bot-max-level:<scope>         → number
 *
 * Call initBotProgression(userId) immediately after login / on guest start,
 * and initBotProgression(null) at the very beginning of logout so the
 * in-memory cache is reset synchronously before any UI re-render.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Scope that is active for the current session.  null → "guest" scope.
let _activeUserId: string | null = null;

const KEY_COMPLETED = (uid: string | null) =>
  `tzdraft:bot-completed-levels:${uid ?? "guest"}`;
const KEY_MAX = (uid: string | null) =>
  `tzdraft:bot-max-level:${uid ?? "guest"}`;

export const INITIAL_FREE_LEVELS = 3; // matches backend default
export const MAX_LEVEL = 19;

// ─── In-memory cache ─────────────────────────────────────────────────────────

let _cachedMax: number = INITIAL_FREE_LEVELS;

/**
 * Must be called immediately after login (with the real userId) and
 * immediately before logout (with null).  The synchronous cache reset
 * prevents any UI flash of the previous user's unlock state.
 */
export function initBotProgression(userId: string | null): void {
  // Normalise guest-* ids to the shared guest scope.
  _activeUserId = userId && !userId.startsWith("guest-") ? userId : null;
  _cachedMax = INITIAL_FREE_LEVELS;
}

/**
 * Synchronous read from the in-memory cache.
 * Returns INITIAL_FREE_LEVELS until the first async read has completed.
 */
export function getCachedMaxUnlockedLevel(): number {
  return _cachedMax;
}

// ─── Local read / write ───────────────────────────────────────────────────────

async function getCompletedLevels(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_COMPLETED(_activeUserId));
    if (raw) return JSON.parse(raw) as number[];
  } catch {}
  return [];
}

async function getMaxUnlockedLevel(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MAX(_activeUserId));
    if (raw) {
      const parsed = parseInt(raw, 10);
      _cachedMax = parsed;
      return parsed;
    }
  } catch {}
  return INITIAL_FREE_LEVELS;
}

async function setCompletedLevels(levels: number[]): Promise<void> {
  await AsyncStorage.setItem(KEY_COMPLETED(_activeUserId), JSON.stringify(levels));
}

async function setMaxUnlockedLevel(level: number): Promise<void> {
  _cachedMax = level;
  await AsyncStorage.setItem(KEY_MAX(_activeUserId), String(level));
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

export async function hasLocalBotProgressToSync(): Promise<boolean> {
  const { completedLevels, maxUnlockedAiLevel } = await getLocalBotProgressSnapshot();
  return completedLevels.length > 0 || maxUnlockedAiLevel > INITIAL_FREE_LEVELS;
}

export async function isLevelUnlocked(level: number): Promise<boolean> {
  if (level < 1 || level > MAX_LEVEL) return false;
  const max = await getMaxUnlockedLevel();
  return level <= max;
}

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
 * Clears bot progress for a specific user (pass the userId captured before
 * calling initBotProgression(null) during logout) or for the active scope
 * if no userId is provided.  Also wipes the legacy unscoped keys so old
 * installs are cleaned up on the first logout.
 */
export async function clearLocalBotProgress(userId?: string): Promise<void> {
  const scope = userId && !userId.startsWith("guest-") ? userId : _activeUserId;
  await Promise.all([
    AsyncStorage.removeItem(KEY_COMPLETED(scope)),
    AsyncStorage.removeItem(KEY_MAX(scope)),
    // Clean up legacy unscoped keys from before per-user scoping was added.
    AsyncStorage.removeItem("tzdraft:bot-completed-levels"),
    AsyncStorage.removeItem("tzdraft:bot-max-level"),
  ]);
  _cachedMax = INITIAL_FREE_LEVELS;
}

export function makeProgressChecker(maxUnlockedAiLevel: number) {
  return function isUnlocked(level: number): boolean {
    if (level < 1 || level > MAX_LEVEL) return false;
    return level <= maxUnlockedAiLevel;
  };
}
