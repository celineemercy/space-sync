import {
  roomsRepository,
  type RoomsRepository,
} from "@/features/rooms/repository";
import type { AvailabilityInput } from "@/types/domain";
import { cacheAvailability, getCachedAvailability } from "@/storage/database";
import { ApiClientError } from "@/lib/api";

export type RoomListResult = {
  rooms: Awaited<ReturnType<RoomsRepository["fetchAll"]>>;
  stale: boolean;
  updatedAt: string | null;
};

export async function loadRooms(
  accessToken?: string | null,
  repository: RoomsRepository = roomsRepository,
): Promise<RoomListResult> {
  try {
    const rooms = await repository.fetchAll(accessToken);
    await repository.replaceCache(rooms);
    return { rooms, stale: false, updatedAt: new Date().toISOString() };
  } catch (error) {
    const cached = await repository.readCache();
    if (cached.rooms.length) {
      return { ...cached, stale: true };
    }
    throw error;
  }
}

export async function loadRoom(
  roomId: string,
  accessToken?: string | null,
  repository: RoomsRepository = roomsRepository,
) {
  try {
    return { room: await repository.fetchById(roomId, accessToken), stale: false, updatedAt: null as string | null };
  } catch (error) {
    const cached = await repository.readCache();
    const room = cached.rooms.find((item) => item.id === roomId);
    if (room) return { room, stale: true, updatedAt: cached.updatedAt };
    throw error;
  }
}

export function availabilityKey(input: AvailabilityInput) {
  return JSON.stringify({ startsAt: input.startsAt, endsAt: input.endsAt, minCapacity: input.minCapacity ?? null, facilityIds: [...(input.facilityIds ?? [])].sort() });
}

export async function searchAvailableRooms(
  input: AvailabilityInput,
  userId: string,
  accessToken?: string | null,
  repository: RoomsRepository = roomsRepository,
) {
  const key = availabilityKey(input);
  try {
    const result = await repository.searchAvailability(input, accessToken);
    await cacheAvailability(userId, key, result);
    return { ...result, stale: false, updatedAt: new Date().toISOString() };
  } catch (error) {
    if (!(error instanceof ApiClientError) || !["NETWORK_ERROR", "NETWORK_TIMEOUT"].includes(error.code)) throw error;
    const cached = await getCachedAvailability(userId, key);
    if (cached) return { ...cached.value, stale: true, updatedAt: cached.updatedAt };
    throw error;
  }
}
