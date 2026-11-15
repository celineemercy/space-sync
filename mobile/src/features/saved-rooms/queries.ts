import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSavedRoomInput,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";
import {
  changeSavedRoomNote,
  deleteSavedRoom,
  listSavedRooms,
  saveRoom,
} from "@/features/saved-rooms/use-cases";
import { useAuth } from "@/providers/auth-provider";

export const savedRoomsQueryKey = ["saved-rooms"] as const;

export function useSavedRooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...savedRoomsQueryKey, user?.id],
    enabled: Boolean(user),
    queryFn: () => listSavedRooms(user!.id),
  });
}

export function useSaveRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedRoomInput) => saveRoom(user!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}

export function useUpdateSavedRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSavedRoomInput) => changeSavedRoomNote(user!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}

export function useDeleteSavedRoom() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedRoom(user!.id, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}
