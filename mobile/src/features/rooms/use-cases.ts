import {
  roomsRepository,
  type RoomsRepository,
} from "@/features/rooms/repository";
import type { AvailabilityInput } from "@/types/domain";

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
    return await repository.fetchById(roomId, accessToken);
  } catch (error) {
    const cached = await repository.readCache();
    const room = cached.rooms.find((item) => item.id === roomId);
    if (room) return room;
    throw error;
  }
}

export function searchAvailableRooms(
  input: AvailabilityInput,
  accessToken?: string | null,
  repository: RoomsRepository = roomsRepository,
) {
  return repository.searchAvailability(input, accessToken);
}
