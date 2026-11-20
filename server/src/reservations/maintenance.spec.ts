import { ReservationsService } from './reservations.service.js';

const admin = { userId: 'admin', email: 'admin@example.test', role: 'ADMIN' as const };

it('admin reads do not issue maintenance writes', async () => {
  const updateMany = vi.fn();
  const service = new ReservationsService({ reservation: {
    updateMany, findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn().mockResolvedValue(null),
  } } as never, {} as never);
  await expect(service.adminList(admin)).resolves.toMatchObject({ items: [], total: 0 });
  await expect(service.adminDetail(admin, 'missing')).rejects.toMatchObject({ response: { code: 'RESERVATION_NOT_FOUND' } });
  expect(updateMany).not.toHaveBeenCalled();
});

it('runs at startup and every minute, recovers after failure, and stops on destruction', async () => {
  vi.useFakeTimers();
  const updateMany = vi.fn().mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValue({ count: 0 });
  const service = new ReservationsService({ reservation: { updateMany, findMany: vi.fn().mockResolvedValue([]) } } as never, {} as never);
  try {
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(0);
    expect(updateMany).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(updateMany).toHaveBeenCalledTimes(3);
    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateMany).toHaveBeenCalledTimes(3);
  } finally { service.onModuleDestroy(); vi.useRealTimers(); }
});

it('skips overlapping background sweeps while a query is still pending', async () => {
  vi.useFakeTimers();
  let finish!: (value: unknown) => void;
  const updateMany = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const service = new ReservationsService({ reservation: { updateMany, findMany: vi.fn().mockResolvedValue([]) } } as never, {} as never);
  try {
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(updateMany).toHaveBeenCalledTimes(1);
    finish({ count: 0 });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateMany).toHaveBeenCalledTimes(2);
  } finally { service.onModuleDestroy(); vi.useRealTimers(); }
});
