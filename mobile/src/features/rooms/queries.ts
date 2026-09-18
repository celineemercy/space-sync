import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { cacheRooms, getCachedRooms } from "@/storage/database";
import type {
  AvailabilityInput,
  AvailabilityResponse,
  Room,
} from "@/types/domain";
import { useAuth } from "@/providers/auth-provider";

type RoomListResult = {
  rooms: Room[];
  stale: boolean;
  updatedAt: string | null;
};

export function useRooms() {
  const { accessToken } = useAuth();
  return useQuery<RoomListResult>({
    queryKey: ["rooms"],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      try {
        const rooms = await apiRequest<Room[]>("/rooms", {}, accessToken);
        await cacheRooms(rooms);
        return { rooms, stale: false, updatedAt: new Date().toISOString() };
      } catch (error) {
        const cached = await getCachedRooms();
        if (cached.rooms.length)
          return {
            rooms: cached.rooms,
            stale: true,
            updatedAt: cached.updatedAt,
          };
        throw error;
      }
    },
  });
}

export function useRoom(roomId: string) {
  const { accessToken } = useAuth();
  return useQuery<Room>({
    queryKey: ["room", roomId],
    enabled: Boolean(accessToken && roomId),
    queryFn: async () => {
      try {
        return await apiRequest<Room>(
          `/rooms/${encodeURIComponent(roomId)}`,
          {},
          accessToken,
        );
      } catch (error) {
        const cached = await getCachedRooms();
        const room = cached.rooms.find((item) => item.id === roomId);
        if (room) return room;
        throw error;
      }
    },
  });
}

export function useAvailabilitySearch() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: async (input: AvailabilityInput) => {
      const query = new URLSearchParams({
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      });
      if (input.minCapacity)
        query.set("minCapacity", String(input.minCapacity));
      if (input.facilityIds?.length)
        query.set("facilityIds", input.facilityIds.join(","));
      return apiRequest<AvailabilityResponse>(
        `/rooms/availability?${query}`,
        {},
        accessToken,
      );
    },
  });
}
