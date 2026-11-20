import { ReservationsService } from './reservations.service.js';
import { campusDay, campusWeek } from '../common/campus-date.js';
const admin = { userId: 'admin', email: 'admin@example.test', role: 'ADMIN' as const };

afterEach(() => vi.useRealTimers());
it('counts campus days/weeks and resolves busiest-room ties by room code', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-19T18:00:00Z'));
  const count = vi.fn().mockResolvedValue(2);
  const service = new ReservationsService({ reservation: { count, groupBy: vi.fn().mockResolvedValue([{ roomId: 'b', _count: { _all: 3 } }, { roomId: 'a', _count: { _all: 3 } }]) }, room: { findMany: vi.fn().mockResolvedValue([{ id: 'b', code: 'B1', name: 'B' }, { id: 'a', code: 'A1', name: 'A' }]) } } as never, {} as never);
  await expect(service.adminStats(admin)).resolves.toMatchObject({ date: '2026-11-20', weekStart: '2026-11-16', pendingToday: 2, confirmedThisWeek: 6, busiestRoom: { code: 'A1', bookings: 3 } });
  expect(count).toHaveBeenCalledWith({ where: { status: 'PENDING', startsAt: { gte: new Date('2026-11-19T17:00:00Z'), lt: new Date('2026-11-20T17:00:00Z') }, endsAt: { gt: new Date() } } });
});
it('returns zero statistics without bookings and rejects student access', async () => {
  const service = new ReservationsService({ reservation: { count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) } } as never, {} as never);
  await expect(service.adminStats(admin)).resolves.toMatchObject({ pendingToday: 0, confirmedThisWeek: 0, busiestRoom: null });
  await expect(service.adminStats({ ...admin, role: 'STUDENT' })).rejects.toMatchObject({ response: { code: 'ADMIN_REQUIRED' } });
});
it('validates dates and supports an inclusive-start/exclusive-end campus date filter', async () => {
  const findMany = vi.fn().mockResolvedValue([]);
  const service = new ReservationsService({ reservation: { findMany, count: vi.fn().mockResolvedValue(0) } } as never, {} as never);
  await service.adminList(admin, 'CONFIRMED', '1', '2026-11-20');
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'CONFIRMED', startsAt: { gte: new Date('2026-11-19T17:00:00Z'), lt: new Date('2026-11-20T17:00:00Z') } } }));
  await expect(service.adminList(admin, undefined, '1', '2026-02-30')).rejects.toMatchObject({ response: { code: 'INVALID_DATE' } });
  expect(() => campusDay('not-a-date')).toThrow();
  expect(campusWeek(new Date('2026-11-22T18:00:00Z')).date).toBe('2026-11-23');
});
