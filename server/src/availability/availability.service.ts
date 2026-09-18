import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '../generated/prisma/client.js';
import { parseTimeRange } from '../common/time-range.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { roomWithFacilities, toRoomDto } from '../rooms/room.mapper.js';
import type { AvailabilityQueryDto } from './dto/availability-query.dto.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: AvailabilityQueryDto) {
    const { startsAt, endsAt } = parseTimeRange(query.startsAt, query.endsAt);
    const facilityIds = [...new Set(query.facilityIds ?? [])];
    const rooms = await this.prisma.room.findMany({
      where: {
        ...(query.minCapacity ? { capacity: { gte: query.minCapacity } } : {}),
        ...(facilityIds.length
          ? {
              AND: facilityIds.map((facilityId) => ({
                roomFacilities: { some: { facilityId } },
              })),
            }
          : {}),
        classSchedules: {
          none: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        },
        reservations: {
          none: {
            status: ReservationStatus.CONFIRMED,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        },
      },
      include: roomWithFacilities,
      orderBy: { code: 'asc' },
    });

    return {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      rooms: rooms.map(toRoomDto),
    };
  }
}
