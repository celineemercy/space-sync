type ReservationRecord = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  cancelledAt: Date | null;
  createdAt: Date;
  decidedAt: Date | null;
  decidedById: string | null;
  rejectionReason: string | null;
  documentKey: string | null;
  documentName: string | null;
  documentMime: string | null;
  documentSize: number | null;
  room: {
    id: string;
    code: string;
    name: string;
    location: string;
    capacity: number;
  };
};

export function toReservationDto(reservation: ReservationRecord) {
  return {
    id: reservation.id,
    startsAt: reservation.startsAt.toISOString(),
    endsAt: reservation.endsAt.toISOString(),
    status: reservation.status,
    cancelledAt: reservation.cancelledAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    decidedAt: reservation.decidedAt?.toISOString() ?? null,
    decidedById: reservation.decidedById,
    rejectionReason: reservation.rejectionReason,
    document: reservation.documentKey ? { name: reservation.documentName, mime: reservation.documentMime, size: reservation.documentSize } : null,
    room: reservation.room,
  };
}

export const reservationWithRoom = {
  room: {
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      capacity: true,
    },
  },
} as const;
