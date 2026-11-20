import { AvailabilityService } from './availability.service.js';
import { activeReservationOverlap } from '../common/active-reservation-overlap.js';

describe('pending slot blocking', () => {
  it.each(['2026-11-20T02:59:59Z', '2026-11-20T03:00:00Z', '2026-11-20T03:30:00Z'])(
    'keeps the same blocking predicate before, at and after start (%s)', async (now) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));
      try {
        const startsAt = new Date('2026-11-20T03:00:00Z');
        const endsAt = new Date('2026-11-20T04:00:00Z');
        const findMany = vi.fn().mockResolvedValue([]);
        const service = new AvailabilityService({ room: { findMany } } as never);
        await service.search({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
        expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
          reservations: { none: { status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } },
        }) }));
        expect(activeReservationOverlap(startsAt, endsAt)).toEqual({
          status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
        });
      } finally { vi.useRealTimers(); }
    },
  );
});
