import { describe, expect, it, vi } from 'vitest';
import { ReservationsService } from './reservations.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('reservation time validation', () => {
  it('rejects a past reservation before opening a database transaction', async () => {
    const transaction = vi.fn();
    const service = new ReservationsService({ $transaction: transaction } as unknown as PrismaService);
    await expect(service.create('user-1', {
      roomId: 'room-1',
      startsAt: '2020-01-01T09:00:00.000Z',
      endsAt: '2020-01-01T10:00:00.000Z',
    })).rejects.toMatchObject({ response: { code: 'RESERVATION_IN_PAST' } });
    expect(transaction).not.toHaveBeenCalled();
  });
});
