import { apiRequest } from "@/lib/api";
import {
  cacheReservations,
  getCachedReservations,
} from "@/storage/database";
import type { Reservation } from "@/types/domain";

export type CreateReservationInput = {
  roomId: string;
  startsAt: string;
  endsAt: string;
};

export type CachedReservations = {
  reservations: Reservation[];
  updatedAt: string | null;
};

export interface ReservationsRepository {
  fetchMine(
    accessToken?: string | null,
  ): Promise<Reservation[]>;
  create(
    input: CreateReservationInput,
    accessToken?: string | null,
  ): Promise<Reservation>;
  cancel(
    reservationId: string,
    accessToken?: string | null,
  ): Promise<Reservation>;
  readCache(userId: string): Promise<CachedReservations>;
  replaceCache(userId: string, reservations: Reservation[]): Promise<void>;
}

export const reservationsRepository: ReservationsRepository = {
  fetchMine: (accessToken) =>
    apiRequest<Reservation[]>("/reservations/mine", {}, accessToken),
  create: (input, accessToken) =>
    apiRequest<Reservation>(
      "/reservations",
      { method: "POST", body: JSON.stringify(input) },
      accessToken,
    ),
  cancel: (reservationId, accessToken) =>
    apiRequest<Reservation>(
      `/reservations/${encodeURIComponent(reservationId)}/cancel`,
      { method: "PATCH" },
      accessToken,
    ),
  readCache: getCachedReservations,
  replaceCache: cacheReservations,
};
