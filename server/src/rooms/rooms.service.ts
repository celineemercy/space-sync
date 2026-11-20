import { Injectable } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListRoomsDto } from './dto/list-rooms.dto.js';
import { roomWithFacilities, toRoomDto } from './room.mapper.js';

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
}
