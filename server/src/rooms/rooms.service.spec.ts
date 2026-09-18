import { RoomsService } from './rooms.service.js';

describe('RoomsService', () => {
  it('requires every selected facility and the requested capacity', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new RoomsService({ room: { findMany } } as never);

    await service.list({
      minCapacity: 8,
      facilityIds: ['projector', 'whiteboard', 'projector'],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          capacity: { gte: 8 },
          AND: [
            { roomFacilities: { some: { facilityId: 'projector' } } },
            { roomFacilities: { some: { facilityId: 'whiteboard' } } },
          ],
        },
      }),
    );
  });
});
