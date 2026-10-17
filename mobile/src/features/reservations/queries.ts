import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelReservation,
  createReservation,
  loadReservations,
  type ReservationListResult,
} from "@/features/reservations/use-cases";
import { useAuth } from "@/providers/auth-provider";
import { cancelReminder } from "@/features/reminders/reminders";

export function useReservations() {
  const { accessToken, user } = useAuth();
  return useQuery<ReservationListResult>({
    queryKey: ["reservations", user?.id],
    enabled: Boolean(accessToken && user),
    queryFn: () => {
      if (!user) throw new Error("A signed-in user is required.");
      return loadReservations(user.id, accessToken);
    },
  });
}

export function useCreateReservation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roomId: string; startsAt: string; endsAt: string }) =>
      createReservation(input, accessToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations"] }),
      ]);
    },
  });
}

export function useCancelReservation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) =>
      cancelReservation(reservationId, accessToken),
    onSuccess: async (_result, reservationId) => {
      try { await cancelReminder(reservationId); } catch { /* Server cancellation still succeeded. */ }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations"] }),
      ]);
    },
  });
}
