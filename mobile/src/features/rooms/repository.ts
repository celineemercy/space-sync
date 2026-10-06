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
  fetchAll: (accessToken) => apiRequest<Room[]>("/rooms", {}, accessToken),
  fetchById: (roomId, accessToken) =>
    apiRequest<Room>(
      `/rooms/${encodeURIComponent(roomId)}`,
      {},
      accessToken,
    ),
  searchAvailability: (input, accessToken) => {
    const query = new URLSearchParams({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    if (input.minCapacity) query.set("minCapacity", String(input.minCapacity));
    if (input.facilityIds?.length)
      query.set("facilityIds", input.facilityIds.join(","));

    return apiRequest<AvailabilityResponse>(
      `/rooms/availability?${query}`,
      {},
      accessToken,
    );
  },
  readCache: getCachedRooms,
  replaceCache: cacheRooms,
};
