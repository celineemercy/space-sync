import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListRoomsDto } from './dto/list-rooms.dto.js';
import { roomWithFacilities, toRoomDto } from './room.mapper.js';
import { campusDay, CAMPUS_TIME_ZONE } from '../common/campus-date.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListRoomsDto) {
    const facilityIds = [...new Set(filters.facilityIds ?? [])];
    const rooms = await this.prisma.room.findMany({
      where: {
        ...(filters.minCapacity
          ? { capacity: { gte: filters.minCapacity } }
          : {}),
        ...(facilityIds.length
          ? {
              AND: facilityIds.map((facilityId) => ({
                roomFacilities: { some: { facilityId } },
              })),
            }
          : {}),
      },
      include: roomWithFacilities,
      orderBy: { code: 'asc' },
    });
    return rooms.map(toRoomDto);
  }

  async detail(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: roomWithFacilities,
    });
    if (!room) {
      throw new ApiException(
        404,
        'ROOM_NOT_FOUND',
        'The requested room does not exist.',
      );
    }
    return toRoomDto(room);
  }

  async schedule(roomId: string, date?: string) {
    const day = campusDay(date);
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
    if (!room) throw new ApiException(404, 'ROOM_NOT_FOUND', 'The requested room does not exist.');
    const overlap = { roomId, startsAt: { lt: day.endsAt }, endsAt: { gt: day.startsAt } };
    const select = { id: true, startsAt: true, endsAt: true } as const;
    const [classes, reservations] = await Promise.all([
      this.prisma.classSchedule.findMany({ where: overlap, select }),
      this.prisma.reservation.findMany({ where: { ...overlap, status: 'CONFIRMED' }, select }),
    ]);
    const entry = (item: { id: string; startsAt: Date; endsAt: Date }, kind: 'class' | 'reservation') => ({ id: item.id, kind, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() });
    return { date: day.date, timeZone: CAMPUS_TIME_ZONE, items: [...classes.map((item) => entry(item, 'class')), ...reservations.map((item) => entry(item, 'reservation'))].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)) };
  }
}
