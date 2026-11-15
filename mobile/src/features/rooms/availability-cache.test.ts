import { availabilityKey, searchAvailableRooms } from "./use-cases";
import type { AvailabilityResponse } from "@/types/domain";
import { ApiClientError } from "@/lib/api";

const mockCache = new Map<string, { value: AvailabilityResponse; updatedAt: string }>();
jest.mock("@/storage/database", () => ({
  cacheAvailability: async (userId: string, key: string, value: AvailabilityResponse) => {
    mockCache.set(`${userId}:${key}`, { value, updatedAt: "2030-01-01T00:00:00.000Z" });
  },
  getCachedAvailability: async (userId: string, key: string) => mockCache.get(`${userId}:${key}`) ?? null,
}));

const input = { startsAt: "2030-01-01T02:00:00.000Z", endsAt: "2030-01-01T03:00:00.000Z", facilityIds: ["b", "a"] };
const result = { startsAt: input.startsAt, endsAt: input.endsAt, rooms: [] };

beforeEach(() => mockCache.clear());

it("serves only the same user's exact query, including an empty result", async () => {
  const online = { searchAvailability: jest.fn().mockResolvedValue(result) } as never;
  const offline = { searchAvailability: jest.fn().mockRejectedValue(new ApiClientError("offline", 0, "NETWORK_ERROR")) } as never;
  expect((await searchAvailableRooms(input, "a", null, online)).stale).toBe(false);
  expect((await searchAvailableRooms({ ...input, facilityIds: ["a", "b"] }, "a", null, offline)).stale).toBe(true);
  await expect(searchAvailableRooms(input, "b", null, offline)).rejects.toThrow("offline");
  await expect(searchAvailableRooms({ ...input, minCapacity: 8 }, "a", null, offline)).rejects.toThrow("offline");
  expect(availabilityKey(input)).toBe(availabilityKey({ ...input, facilityIds: ["a", "b"] }));
});
