import { toReservationDto } from './reservation.mapper.js';

it.each(['Missing signature', null])('preserves rejectionReason in the API payload (%s)', (rejectionReason) => {
  const result = toReservationDto({
    id: 'r', startsAt: new Date('2030-01-01T09:00:00Z'), endsAt: new Date('2030-01-01T10:00:00Z'), createdAt: new Date(),
    status: 'REJECTED', rejectionReason, cancelledAt: null, decidedAt: new Date(), decidedById: 'admin',
    documentKey: null, documentName: null, documentMime: null, documentSize: null,
    room: { id: 'room', code: 'A1', name: 'Room A1', location: 'A', capacity: 8 },
  });
  expect(result.rejectionReason).toBe(rejectionReason);
});
