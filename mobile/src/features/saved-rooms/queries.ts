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

export const savedRoomsQueryKey = ["saved-rooms"] as const;

export function useSavedRooms() {
  return useQuery({
    queryKey: savedRoomsQueryKey,
    queryFn: () => listSavedRooms(),
  });
}

export function useSaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedRoomInput) => saveRoom(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}

export function useUpdateSavedRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSavedRoomInput) => changeSavedRoomNote(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}

export function useDeleteSavedRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedRoom(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedRoomsQueryKey });
    },
  });
}
