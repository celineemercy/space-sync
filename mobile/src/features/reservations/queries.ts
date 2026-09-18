import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { cacheReservations, getCachedReservations } from "@/storage/database";
import type { Reservation } from "@/types/domain";

type ReservationListResult = {
  reservations: Reservation[];
  stale: boolean;
  updatedAt: string | null;
};

export function useReservations() {
  const { accessToken, user } = useAuth();
  return useQuery<ReservationListResult>({
    queryKey: ["reservations", user?.id],
    enabled: Boolean(accessToken && user),
    queryFn: async () => {
      if (!user) throw new Error("A signed-in user is required.");
      try {
        const reservations = await apiRequest<Reservation[]>(
          "/reservations/mine",
          {},
          accessToken,
        );
        await cacheReservations(user.id, reservations);
        return {
          reservations,
          stale: false,
          updatedAt: new Date().toISOString(),
        };
      } catch (error) {
        const cached = await getCachedReservations(user.id);
        if (cached.reservations.length) {
          return {
            reservations: cached.reservations,
            stale: true,
            updatedAt: cached.updatedAt,
          };
        }
        throw error;
      }
    },
  });
}

export function useCreateReservation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { roomId: string; startsAt: string; endsAt: string }) =>
      apiRequest<Reservation>(
        "/reservations",
        { method: "POST", body: JSON.stringify(input) },
        accessToken,
      ),
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
      apiRequest<Reservation>(
        `/reservations/${encodeURIComponent(reservationId)}/cancel`,
        { method: "PATCH" },
        accessToken,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations"] }),
      ]);
    },
  });
}
