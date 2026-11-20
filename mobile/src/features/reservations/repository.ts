import { apiRequest } from "@/lib/api";
import { reservationDocumentMime } from "./document";
import {
  cacheReservations,
  getCachedReservations,
} from "@/storage/database";
import type { Reservation } from "@/types/domain";

export type CreateReservationInput = {
  roomId: string;
  startsAt: string;
  endsAt: string;
  document: { uri: string; name: string; mimeType: string; size?: number; file?: File };
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
  create: (input, accessToken) => {
    const mimeType = reservationDocumentMime(input.document);
    const body = new FormData();
    body.append("roomId", input.roomId);
    body.append("startsAt", input.startsAt);
    body.append("endsAt", input.endsAt);
    body.append("document", input.document.file ?? ({ uri: input.document.uri, name: input.document.name, type: mimeType } as unknown as Blob));
    return apiRequest<Reservation>("/reservations", { method: "POST", body }, accessToken);
  },
  cancel: (reservationId, accessToken) =>
    apiRequest<Reservation>(
      `/reservations/${encodeURIComponent(reservationId)}/cancel`,
      { method: "PATCH" },
      accessToken,
    ),
  readCache: getCachedReservations,
  replaceCache: cacheReservations,
};
