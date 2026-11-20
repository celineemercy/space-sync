import { loadDailySchedule, SCHEDULE_TTL, upcomingScheduleDates } from "./schedule";
import { ApiClientError } from "@/lib/api";
jest.mock("@/storage/database", () => ({ cacheRoomSchedule: jest.fn(), getCachedRoomSchedule: jest.fn() }));
const schedule = { date: "2030-01-01", timeZone: "Asia/Jakarta", items: [] };
const cached = { schedule, updatedAt: "2030-01-01T00:00:00.000Z" };
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(cached.updatedAt)); });
afterEach(() => jest.useRealTimers());
it("uses fresh persistent cache and refreshes exactly at the five-minute boundary", async () => {
  const source = { read: jest.fn().mockResolvedValue(cached), write: jest.fn(), fetch: jest.fn().mockResolvedValue(schedule) };
  expect((await loadDailySchedule("r", schedule.date, "token", source)).stale).toBe(false);
  expect(source.fetch).not.toHaveBeenCalled();
  jest.setSystemTime(Date.now() + SCHEDULE_TTL);
  await loadDailySchedule("r", schedule.date, "token", source);
  expect(source.fetch).toHaveBeenCalledWith("r", schedule.date, "token");
  expect(source.write).toHaveBeenCalled();
});
it("shows expired empty schedules as stale only on network failure", async () => {
  jest.setSystemTime(Date.now() + SCHEDULE_TTL + 1);
  const source = { read: jest.fn().mockResolvedValue(cached), write: jest.fn(), fetch: jest.fn().mockRejectedValue(new ApiClientError("offline", 0, "NETWORK_ERROR")) };
  await expect(loadDailySchedule("r", schedule.date, "token", source)).resolves.toMatchObject({ stale: true, schedule: { items: [] } });
  source.fetch.mockRejectedValue(new ApiClientError("unauthorized", 401, "UNAUTHORIZED"));
  await expect(loadDailySchedule("r", schedule.date, "token", source)).rejects.toMatchObject({ statusCode: 401 });
});
it("does not lose fresh network results when local cache writing fails", async () => {
  const source = { read: jest.fn().mockResolvedValue(null), write: jest.fn().mockRejectedValue(new Error("storage")), fetch: jest.fn().mockResolvedValue(schedule) };
  await expect(loadDailySchedule("r", schedule.date, "token", source)).resolves.toMatchObject({ schedule, stale: false });
});
it("generates seven campus dates across a UTC date boundary", () => {
  const dates = upcomingScheduleDates(Date.parse("2026-11-19T18:00:00Z"));
  expect(dates).toHaveLength(7);
  expect(dates[0]).toBe("2026-11-20");
  expect(dates[6]).toBe("2026-11-26");
});
