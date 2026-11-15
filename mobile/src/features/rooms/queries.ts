import { useMutation, useQuery } from "@tanstack/react-query";
import {
  loadRoom,
  loadRooms,
  searchAvailableRooms,
  type RoomListResult,
} from "@/features/rooms/use-cases";
import type { AvailabilityInput } from "@/types/domain";
import { useAuth } from "@/providers/auth-provider";

export function useRooms() {
  const { accessToken } = useAuth();
  return useQuery<RoomListResult>({
    queryKey: ["rooms"],
    enabled: Boolean(accessToken),
    queryFn: () => loadRooms(accessToken),
  });
}

export function useRoom(roomId: string) {
  const { accessToken } = useAuth();
  return useQuery<Awaited<ReturnType<typeof loadRoom>>>({
    queryKey: ["room", roomId],
    enabled: Boolean(accessToken && roomId),
    queryFn: () => loadRoom(roomId, accessToken),
  });
}

export function useAvailabilitySearch() {
  const { accessToken, user } = useAuth();
  return useMutation({
    mutationFn: (input: AvailabilityInput) =>
      searchAvailableRooms(input, user!.id, accessToken),
  });
}
