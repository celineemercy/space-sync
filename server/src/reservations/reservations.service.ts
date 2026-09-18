import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { parseTimeRange } from '../common/time-range.js';
import { ReservationStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import { reservationWithRoom, toReservationDto } from './reservation.mapper.js';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateReservationDto) {
    const { startsAt, endsAt } = parseTimeRange(input.startsAt, input.endsAt);

    const reservation = await this.prisma.$transaction(async (transaction) => {
      const lockedRooms = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Room" WHERE "id" = ${input.roomId} FOR UPDATE
      `;
      if (!lockedRooms.length) {
        throw new ApiException(
          404,
          'ROOM_NOT_FOUND',
          'The requested room does not exist.',
        );
      }

      const [scheduleConflict, reservationConflict] = await Promise.all([
        transaction.classSchedule.count({
          where: {
            roomId: input.roomId,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        }),
        transaction.reservation.count({
          where: {
            roomId: input.roomId,
            status: ReservationStatus.CONFIRMED,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        }),
      ]);

      if (scheduleConflict || reservationConflict) {
        throw new ApiException(
          409,
          'RESERVATION_CONFLICT',
          'The room is no longer available for the selected time.',
        );
      }

      return transaction.reservation.create({
        data: {
          userId,
          roomId: input.roomId,
          startsAt,
          endsAt,
          status: ReservationStatus.CONFIRMED,
        },
        include: reservationWithRoom,
      });
    });

    return toReservationDto(reservation);
  }

  async mine(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: reservationWithRoom,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    });
    return reservations.map(toReservationDto);
  }

  async cancel(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new ApiException(
        404,
        'RESERVATION_NOT_FOUND',
        'The reservation does not exist.',
      );
    }
    if (reservation.userId !== userId) {
      throw new ApiException(
        403,
        'RESERVATION_FORBIDDEN',
        'You cannot manage this reservation.',
      );
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new ApiException(
        409,
        'RESERVATION_ALREADY_CANCELLED',
        'The reservation is already cancelled.',
      );
    }

    const result = await this.prisma.reservation.updateMany({
      where: { id: reservationId, userId, status: ReservationStatus.CONFIRMED },
      data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ApiException(
        409,
        'RESERVATION_ALREADY_CANCELLED',
        'The reservation is already cancelled.',
      );
    }

    const updated = await this.prisma.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: reservationWithRoom,
    });
    return toReservationDto(updated);
  }
}
