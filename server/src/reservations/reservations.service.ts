import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ApiException } from '../common/api-exception.js';
import { parseTimeRange } from '../common/time-range.js';
import { activeReservationOverlap } from '../common/active-reservation-overlap.js';
import { ReservationStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { AuthUser } from '../auth/auth-user.js';
import { DocumentsService } from './documents.service.js';
import { reservationWithRoom, toReservationDto } from './reservation.mapper.js';

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReservationsService.name);
  private maintenance?: ReturnType<typeof setInterval>;
  constructor(private readonly prisma: PrismaService, private readonly documents: DocumentsService) {}

  onModuleInit() {
    void this.maintain().catch(() => this.logger.error('Reservation maintenance failed.'));
    this.maintenance = setInterval(() => { void this.maintain().catch(() => this.logger.error('Reservation maintenance failed.')); }, 60_000);
    this.maintenance.unref?.();
  }

  onModuleDestroy() { if (this.maintenance) clearInterval(this.maintenance); }

  private async maintain() {
    await this.expirePending();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.reservation.findMany({
      where: { documentKey: { not: null }, OR: [
        { status: { in: [ReservationStatus.REJECTED, ReservationStatus.EXPIRED] }, decidedAt: { lt: cutoff } },
        { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED] }, endsAt: { lt: cutoff } },
      ] }, select: { id: true, documentKey: true }, take: 100,
    });
    for (const item of expired) {
      if (item.documentKey) await this.documents.remove(item.documentKey);
      await this.prisma.reservation.update({ where: { id: item.id }, data: { documentKey: null } });
    }
  }

  private async expirePending() {
    await this.prisma.reservation.updateMany({
      where: { status: ReservationStatus.PENDING, endsAt: { lte: new Date() } },
      data: { status: ReservationStatus.EXPIRED, decidedAt: new Date() },
    });
  }

  private student(user: AuthUser) {
    if (user.role !== 'STUDENT') throw new ApiException(403, 'STUDENT_REQUIRED', 'Student access required.');
  }
  private admin(user: AuthUser) {
    if (user.role !== 'ADMIN') throw new ApiException(403, 'ADMIN_REQUIRED', 'Admin access required.');
  }

  async create(user: AuthUser, input: CreateReservationDto, file?: Express.Multer.File) {
    this.student(user);
    const { startsAt, endsAt } = parseTimeRange(input.startsAt, input.endsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new ApiException(400, 'RESERVATION_IN_PAST', 'Choose a start time in the future.');
    }

    this.documents.validate(file);
    const document = await this.documents.save(file!);
    try {
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
          where: { roomId: input.roomId, ...activeReservationOverlap(startsAt, endsAt) },
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
          userId: user.userId,
          roomId: input.roomId,
          startsAt,
          endsAt,
          status: ReservationStatus.PENDING,
          ...document,
        },
        include: reservationWithRoom,
      });
    });

    return toReservationDto(reservation);
    } catch (error) {
      await this.documents.remove(document.documentKey);
      throw error;
    }
  }

  async mine(user: AuthUser) {
    this.student(user);
    await this.expirePending();
    const reservations = await this.prisma.reservation.findMany({
      where: { userId: user.userId },
      include: reservationWithRoom,
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    });
    return reservations.map(toReservationDto);
  }

  async cancel(user: AuthUser, reservationId: string) {
    this.student(user);
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
    if (reservation.userId !== user.userId) {
      throw new ApiException(
        403,
        'RESERVATION_FORBIDDEN',
        'You cannot manage this reservation.',
      );
    }
    if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ApiException(
        409,
        'RESERVATION_ALREADY_CANCELLED',
        'The reservation is already cancelled.',
      );
    }

    const result = await this.prisma.reservation.updateMany({
      where: { id: reservationId, userId: user.userId, status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] } },
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

  async adminList(user: AuthUser, status?: string, page?: string) {
    this.admin(user);
    await this.expirePending();
    const parsedPage = Number(page ?? 1);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > 10000) throw new ApiException(400, 'INVALID_PAGE', 'Invalid page.');
    if (status && status !== 'HISTORY' && !Object.values(ReservationStatus).includes(status as ReservationStatus)) throw new ApiException(400, 'INVALID_STATUS', 'Invalid status.');
    const where = status === 'HISTORY' ? { status: { not: ReservationStatus.PENDING } } : status ? { status: status as ReservationStatus } : {};
    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({ where, include: { ...reservationWithRoom, user: { select: { id: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (parsedPage - 1) * 20, take: 20 }),
      this.prisma.reservation.count({ where }),
    ]);
    return { items: items.map((item) => ({ ...toReservationDto(item), student: item.user })), total, page: parsedPage };
  }

  async adminDetail(user: AuthUser, id: string) {
    this.admin(user);
    await this.expirePending();
    const item = await this.prisma.reservation.findUnique({ where: { id }, include: { ...reservationWithRoom, user: { select: { id: true, email: true } } } });
    if (!item) throw new ApiException(404, 'RESERVATION_NOT_FOUND', 'The request does not exist.');
    return { ...toReservationDto(item), student: item.user };
  }

  async decide(user: AuthUser, id: string, status: 'CONFIRMED' | 'REJECTED', reason?: string) {
    this.admin(user);
    const trimmed = reason?.trim();
    if (status === 'REJECTED' && (!trimmed || trimmed.length > 500)) throw new ApiException(400, 'REASON_REQUIRED', 'Enter a rejection reason up to 500 characters.');
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.reservation.findUnique({ where: { id }, select: { roomId: true } });
      if (!request) throw new ApiException(409, 'REQUEST_ALREADY_DECIDED', 'This request is no longer pending.');
      await transaction.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${request.roomId} FOR UPDATE`;
      const now = new Date();
      const result = await transaction.reservation.updateMany({
        where: { id, status: ReservationStatus.PENDING, endsAt: { gt: now } },
        data: { status: status === 'CONFIRMED' ? ReservationStatus.CONFIRMED : ReservationStatus.REJECTED, decidedAt: now, decidedById: user.userId, rejectionReason: status === 'REJECTED' ? trimmed : null },
      });
      if (result.count !== 1) throw new ApiException(409, 'REQUEST_ALREADY_DECIDED', 'This request is no longer pending.');
      const item = await transaction.reservation.findUniqueOrThrow({ where: { id }, include: reservationWithRoom });
      return toReservationDto(item);
    });
  }

  async document(user: AuthUser, id: string) {
    const item = await this.prisma.reservation.findUnique({ where: { id }, select: { userId: true, documentKey: true, documentMime: true } });
    if (!item || (user.role !== 'ADMIN' && item.userId !== user.userId)) throw new ApiException(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
    if (!item.documentKey || !item.documentMime) throw new ApiException(404, 'DOCUMENT_NOT_FOUND', 'Document is no longer available.');
    return { mime: item.documentMime, bytes: await this.documents.read(item.documentKey) };
  }
}
