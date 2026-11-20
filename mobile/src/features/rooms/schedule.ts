import { apiRequest, ApiClientError } from "@/lib/api";
import { logRuntime } from "@/lib/runtime-log";
import { cacheRoomSchedule, getCachedRoomSchedule } from "@/storage/database";
import type { CachedRoomSchedule, RoomSchedule } from "@/types/domain";

export const SCHEDULE_TTL = 5 * 60_000;
export function upcomingScheduleDates(now = Date.now()) {
  const date = new Date(now + 7 * 3_600_000);
  date.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => new Date(date.getTime() + index * 86_400_000).toISOString().slice(0, 10));
}
type ScheduleRepository = {
  fetch: (roomId: string, date: string, token?: string | null) => Promise<RoomSchedule>;
  read: (roomId: string, date: string) => Promise<CachedRoomSchedule | null>;
  write: typeof cacheRoomSchedule;
};
const repository: ScheduleRepository = {
  fetch: (roomId, date, token) => apiRequest<RoomSchedule>(`/rooms/${encodeURIComponent(roomId)}/schedule?date=${encodeURIComponent(date)}`, {}, token),
  read: getCachedRoomSchedule, write: cacheRoomSchedule,
};
export async function loadDailySchedule(roomId: string, date: string, token?: string | null, source: ScheduleRepository = repository) {
  let cached: CachedRoomSchedule | null = null;
  try { cached = await source.read(roomId, date); }
  catch { logRuntime("warn", "schedule_cache_read_failed"); }
  const age = cached ? Date.now() - Date.parse(cached.updatedAt) : Infinity;
  if (cached && age >= 0 && age < SCHEDULE_TTL) return { ...cached, stale: false };
  try {
    const schedule = await source.fetch(roomId, date, token);
    const updatedAt = new Date().toISOString();
    try { await source.write(roomId, date, schedule, updatedAt); }
    catch { logRuntime("warn", "schedule_cache_write_failed"); }
    return { schedule, updatedAt, stale: false };
  } catch (error) {
    if (cached && error instanceof ApiClientError && ["NETWORK_ERROR", "NETWORK_TIMEOUT"].includes(error.code)) return { ...cached, stale: true };
    throw error;
  }
}
