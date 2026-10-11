import { parseAvailability, parseRoom, parseRooms } from "@/features/rooms/model";
import { apiRequest } from "@/lib/api";
import { cacheRooms, getCachedRooms } from "@/storage/database";
import type {
  AvailabilityInput,
  AvailabilityResponse,
  Room,
} from "@/types/domain";

export type CachedRooms = {
  rooms: Room[];
  updatedAt: string | null;
};

export interface RoomsRepository {
  fetchAll(accessToken?: string | null): Promise<Room[]>;
  fetchById(roomId: string, accessToken?: string | null): Promise<Room>;
  searchAvailability(
    input: AvailabilityInput,
    accessToken?: string | null,
  ): Promise<AvailabilityResponse>;
  readCache(): Promise<CachedRooms>;
  replaceCache(rooms: Room[]): Promise<void>;
}

export const roomsRepository: RoomsRepository = {
  fetchAll: async (accessToken) =>
    parseRooms(await apiRequest<unknown>("/rooms", {}, accessToken)),
  fetchById: async (roomId, accessToken) =>
    parseRoom(
      await apiRequest<unknown>(
        `/rooms/${encodeURIComponent(roomId)}`,
        {},
        accessToken,
      ),
    ),
  searchAvailability: async (input, accessToken) => {
    const query = new URLSearchParams({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    if (input.minCapacity) query.set("minCapacity", String(input.minCapacity));
    if (input.facilityIds?.length)
      query.set("facilityIds", input.facilityIds.join(","));

    return parseAvailability(
      await apiRequest<unknown>(
        `/rooms/availability?${query}`,
        {},
        accessToken,
      ),
    );
  },
  readCache: getCachedRooms,
  replaceCache: cacheRooms,
};
