import {
  reservationsRepository,
  type CreateReservationInput,
  type ReservationsRepository,
} from "@/features/reservations/repository";

export type ReservationListResult = {
  reservations: Awaited<ReturnType<ReservationsRepository["fetchMine"]>>;
  stale: boolean;
  updatedAt: string | null;
};

export async function loadReservations(
  userId: string,
  accessToken?: string | null,
  repository: ReservationsRepository = reservationsRepository,
): Promise<ReservationListResult> {
  try {
    const reservations = await repository.fetchMine(accessToken);
    await repository.replaceCache(userId, reservations);
    return {
      reservations,
      stale: false,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const cached = await repository.readCache(userId);
    if (cached.reservations.length) {
      return { ...cached, stale: true };
    }
    throw error;
  }
}

export function createReservation(
  input: CreateReservationInput,
  accessToken?: string | null,
  repository: ReservationsRepository = reservationsRepository,
) {
  return repository.create(input, accessToken);
}

export function cancelReservation(
  reservationId: string,
  accessToken?: string | null,
  repository: ReservationsRepository = reservationsRepository,
) {
  return repository.cancel(reservationId, accessToken);
}
