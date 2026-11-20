import { ReservationStatus, type Prisma } from '../generated/prisma/client.js';

export function activeReservationOverlap(startsAt: Date, endsAt: Date): Prisma.ReservationWhereInput {
  return {
    status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
    startsAt: { lt: endsAt },
    endsAt: { gt: startsAt },
  };
}
