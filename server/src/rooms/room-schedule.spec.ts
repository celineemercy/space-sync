import { RoomsService } from './rooms.service.js';

it('combines classes and confirmed reservations by campus day without exposing borrower data', async () => {
  const reservationQuery = vi.fn().mockResolvedValue([{ id: 'r', startsAt: new Date('2026-11-20T02:00:00Z'), endsAt: new Date('2026-11-20T03:00:00Z'), userId: 'private', rejectionReason: 'private' }]);
  const service = new RoomsService({ room: { findUnique: vi.fn().mockResolvedValue({ id: 'room' }) }, classSchedule: { findMany: vi.fn().mockResolvedValue([{ id: 'c', startsAt: new Date('2026-11-19T16:00:00Z'), endsAt: new Date('2026-11-19T18:00:00Z'), title: 'Private lecture' }]) }, reservation: { findMany: reservationQuery } } as never);
  const result = await service.schedule('room', '2026-11-20');
  expect(result.items.map((item) => item.kind)).toEqual(['class', 'reservation']);
  expect(result.items[0]).toEqual({ id: 'c', kind: 'class', startsAt: '2026-11-19T16:00:00.000Z', endsAt: '2026-11-19T18:00:00.000Z' });
  expect(JSON.stringify(result)).not.toContain('private');
  expect(JSON.stringify(result)).not.toContain('Private lecture');
  expect(reservationQuery).toHaveBeenCalledWith({ where: { roomId: 'room', status: 'CONFIRMED', startsAt: { lt: new Date('2026-11-20T17:00:00Z') }, endsAt: { gt: new Date('2026-11-19T17:00:00Z') } }, select: { id: true, startsAt: true, endsAt: true } });
});
it('returns empty schedules and handles invalid dates and missing rooms', async () => {
  const room = { findUnique: vi.fn().mockResolvedValue({ id: 'room' }) };
  const service = new RoomsService({ room, classSchedule: { findMany: vi.fn().mockResolvedValue([]) }, reservation: { findMany: vi.fn().mockResolvedValue([]) } } as never);
  await expect(service.schedule('room', '2026-11-20')).resolves.toMatchObject({ items: [] });
  await expect(service.schedule('room', '2026-02-30')).rejects.toMatchObject({ response: { code: 'INVALID_DATE' } });
  room.findUnique.mockResolvedValueOnce(null);
  await expect(service.schedule('missing', '2026-11-20')).rejects.toMatchObject({ response: { code: 'ROOM_NOT_FOUND' } });
});
