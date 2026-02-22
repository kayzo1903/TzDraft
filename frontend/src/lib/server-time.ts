import axiosInstance from "@/lib/axios";

let offsetMs = 0;
let syncedAtMs = 0;

const SYNC_TTL_MS = 60_000;

export async function syncServerTime(force = false): Promise<void> {
  const localNow = Date.now();
  if (!force && localNow - syncedAtMs < SYNC_TTL_MS) {
    return;
  }

  const response = await axiosInstance.get("/system/time");
  const serverTimeMs = Number(response.data?.serverTimeMs);
  if (Number.isFinite(serverTimeMs)) {
    offsetMs = serverTimeMs - localNow;
    syncedAtMs = localNow;
  }
}

export function nowFromServer(): number {
  return Date.now() + offsetMs;
}
