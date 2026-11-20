import { describe, expect, it, vi } from 'vitest';
import { ReservationsService } from './reservations.service.js';
import { DocumentsService } from './documents.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const student = { userId: 'student-1', email: 'student@example.test', role: 'STUDENT' as const };
const admin = { userId: 'admin-1', email: 'admin@example.test', role: 'ADMIN' as const };

describe('approval access and decisions', () => {
  it('blocks students from the admin queue', async () => {
    const service = new ReservationsService({} as PrismaService, {} as DocumentsService);
    await expect(service.adminList(student)).rejects.toMatchObject({ response: { code: 'ADMIN_REQUIRED' } });
  });

  it('requires a reason for rejection', async () => {
    const service = new ReservationsService({} as PrismaService, {} as DocumentsService);
    await expect(service.decide(admin, 'request-1', 'REJECTED', ' ')).rejects.toMatchObject({ response: { code: 'REASON_REQUIRED' } });
  });

  it('returns a conflict if another admin already decided', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const transaction = { reservation: { findUnique: vi.fn().mockResolvedValue({ roomId: 'room-1' }), updateMany }, $queryRaw: vi.fn().mockResolvedValue([{ id: 'room-1' }]) };
    const prisma = { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) };
    const service = new ReservationsService(prisma as unknown as PrismaService, {} as DocumentsService);
    await expect(service.decide(admin, 'request-1', 'CONFIRMED')).rejects.toMatchObject({ response: { code: 'REQUEST_ALREADY_DECIDED' } });
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }));
  });

  it('records a rejection and its admin within the room-locked transaction', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      reservation: {
        findUnique: vi.fn().mockResolvedValue({ roomId: 'room-1' }), updateMany,
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'request-1', startsAt: new Date('2030-01-01T09:00:00.000Z'), endsAt: new Date('2030-01-01T10:00:00.000Z'),
          createdAt: new Date(), status: 'REJECTED', cancelledAt: null, decidedAt: new Date(), decidedById: 'admin-1',
          rejectionReason: 'Missing signature', documentKey: 'key', documentName: 'permit.pdf', documentMime: 'application/pdf', documentSize: 100,
          room: { id: 'room-1', code: 'A1', name: 'Room A1', location: 'A', capacity: 8 },
        }),
      }, $queryRaw: vi.fn().mockResolvedValue([{ id: 'room-1' }]),
    };
    const prisma = { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) };
    const service = new ReservationsService(prisma as unknown as PrismaService, {} as DocumentsService);
    const result = await service.decide(admin, 'request-1', 'REJECTED', ' Missing signature ');
    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', decidedById: 'admin-1', rejectionReason: 'Missing signature' }) }));
    expect(result).toMatchObject({ status: 'REJECTED', rejectionReason: 'Missing signature', decidedById: 'admin-1' });
  });

  it('does not expose another student document', async () => {
    const findUnique = vi.fn().mockResolvedValue({ userId: 'another-student', documentKey: 'key', documentMime: 'application/pdf' });
    const read = vi.fn();
    const service = new ReservationsService({ reservation: { findUnique } } as unknown as PrismaService, { read } as unknown as DocumentsService);
    await expect(service.document(student, 'request-1')).rejects.toMatchObject({ response: { code: 'DOCUMENT_NOT_FOUND' } });
    expect(read).not.toHaveBeenCalled();
  });

  it('holds a successful request as pending', async () => {
    const save = vi.fn().mockResolvedValue({ documentKey: 'document-key', documentName: 'permit.pdf', documentMime: 'application/pdf', documentSize: 8 });
    const validate = vi.fn();
    const create = vi.fn().mockImplementation(({ data }) => ({
      id: 'request-1', startsAt: data.startsAt, endsAt: data.endsAt,
      status: data.status, cancelledAt: null, createdAt: new Date(),
      decidedAt: null, rejectionReason: null, documentKey: data.documentKey,
      documentName: data.documentName, documentMime: data.documentMime, documentSize: data.documentSize,
      room: { id: 'room-1', code: 'A1', name: 'Room A1', location: 'A', capacity: 8 },
    }));
    const transaction = { $queryRaw: vi.fn().mockResolvedValue([{ id: 'room-1' }]), classSchedule: { count: vi.fn().mockResolvedValue(0) }, reservation: { count: vi.fn().mockResolvedValue(0), create } };
    const prisma = { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) };
    const service = new ReservationsService(prisma as unknown as PrismaService, { save, validate } as unknown as DocumentsService);
    const result = await service.create(student, { roomId: 'room-1', startsAt: '2030-01-01T09:00:00.000Z', endsAt: '2030-01-01T10:00:00.000Z' }, { buffer: Buffer.from('%PDF-1.7'), size: 8 } as Express.Multer.File);
    expect(result.status).toBe('PENDING');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ documentKey: 'document-key', status: 'PENDING' }) }));
  });

  it('releases a saved file after a conflicting request', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const transaction = { $queryRaw: vi.fn().mockResolvedValue([{ id: 'room-1' }]), classSchedule: { count: vi.fn().mockResolvedValue(0) }, reservation: { count: vi.fn().mockResolvedValue(1) } };
    const prisma = { $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction) };
    const service = new ReservationsService(prisma as unknown as PrismaService, { validate: vi.fn(), save: vi.fn().mockResolvedValue({ documentKey: 'key' }), remove } as unknown as DocumentsService);
    await expect(service.create(student, { roomId: 'room-1', startsAt: '2030-01-01T09:00:00.000Z', endsAt: '2030-01-01T10:00:00.000Z' }, {} as Express.Multer.File)).rejects.toMatchObject({ response: { code: 'RESERVATION_CONFLICT' } });
    expect(remove).toHaveBeenCalledWith('key');
  });

  it('expires pending requests at their end time', async () => {
    const start = new Date('2030-01-01T09:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(start);
    try {
      const updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const findMany = vi.fn().mockResolvedValue([]);
      const service = new ReservationsService({ reservation: { updateMany, findMany } } as unknown as PrismaService, {} as DocumentsService);
      await service.mine(student);
      expect(updateMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', endsAt: { lte: start } },
        data: { status: 'EXPIRED', decidedAt: start },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes old private files and clears their database keys', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([{ id: 'request-1', documentKey: 'stored-key' }]);
    const prisma = { reservation: { updateMany: vi.fn(), findMany, update } };
    const service = new ReservationsService(prisma as unknown as PrismaService, { remove } as unknown as DocumentsService);
    await (service as unknown as { maintain: () => Promise<void> }).maintain();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ documentKey: { not: null } }) }));
    expect(remove).toHaveBeenCalledWith('stored-key');
    expect(update).toHaveBeenCalledWith({ where: { id: 'request-1' }, data: { documentKey: null } });
  });
});
