import { NotificationsService } from './notifications.service.js';
import { ReservationsService } from '../reservations/reservations.service.js';

const now = new Date('2030-01-01T00:00:00Z');
const expiresAt = new Date('2030-01-01T01:00:00Z');
const token = 'ExponentPushToken[test-token]';
const auth = { userId: 'student', email: 'student@example.test', role: 'STUDENT' as const, expiresAt: expiresAt.getTime() / 1000 };
const services: NotificationsService[] = [];
function fixture(status = 'CONFIRMED') {
  const user = { findUnique: vi.fn().mockResolvedValue({ pushToken: token, pushTokenExpiresAt: expiresAt }), updateMany: vi.fn().mockResolvedValue({ count: 1 }), update: vi.fn().mockResolvedValue({}) };
  const tx = { user, $queryRaw: vi.fn().mockResolvedValue([]) };
  const prisma = { user, $transaction: vi.fn(async (work) => work(tx)), reservation: { findUnique: vi.fn().mockResolvedValue({ userId: auth.userId, startsAt: new Date('2030-01-01T02:00:00Z'), endsAt: new Date('2030-01-01T03:00:00Z'), status, room: { code: 'A1', name: 'Study Room' }, user: { pushToken: token, pushTokenExpiresAt: expiresAt } }) } };
  const service = new NotificationsService(prisma as never); services.push(service);
  return { service, prisma, user, tx };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ok', id: 'ticket' } }) })); });
afterEach(() => { services.forEach((service) => service.onModuleDestroy()); services.length = 0; vi.useRealTimers(); vi.unstubAllGlobals(); });

it('moves a device token between users under a transaction and binds it to JWT expiry', async () => {
  const { service, user, tx } = fixture();
  await service.register(auth, token);
  expect(tx.$queryRaw).toHaveBeenCalledOnce();
  expect(user.updateMany).toHaveBeenCalledWith({ where: { pushToken: token, id: { not: 'student' } }, data: { pushToken: null, pushTokenExpiresAt: null } });
  expect(user.update).toHaveBeenCalledWith({ where: { id: 'student' }, data: { pushToken: token, pushTokenExpiresAt: expiresAt } });
  await service.remove(auth, token);
  expect(user.updateMany).toHaveBeenLastCalledWith({ where: { id: 'student', pushToken: token, pushTokenExpiresAt: expiresAt }, data: { pushToken: null, pushTokenExpiresAt: null } });
  await expect(service.register({ ...auth, expiresAt: 1 }, token)).rejects.toMatchObject({ response: { code: 'UNAUTHORIZED' } });
});

it('does not expose push tokens through database errors', async () => {
  const { service, prisma, user } = fixture();
  prisma.$transaction.mockRejectedValueOnce(new Error(`Database failed for ${token}`));
  await expect(service.register(auth, token)).rejects.toMatchObject({ response: { code: 'PUSH_REGISTRATION_FAILED', message: 'Unable to register notifications. Try again.' } });
  user.updateMany.mockRejectedValueOnce(new Error(`Database failed for ${token}`));
  await expect(service.remove(auth, token)).rejects.toMatchObject({ response: { code: 'PUSH_REGISTRATION_FAILED', message: 'Unable to update notifications. Try again.' } });
});

it.each(['CONFIRMED', 'REJECTED'])('sends room, time and decision status for %s and checks delivery receipts', async (status) => {
  const { service, user } = fixture(status);
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: 'ok', id: 'ticket' } }) } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ticket: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }) } as Response);
  await service.decision('reservation');
  const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(payload).toMatchObject({ to: token, data: { reservationId: 'reservation', status } });
  expect(payload.body).toContain('Study Room'); expect(payload.body).toContain('09:00'); expect(payload.body).toContain(status);
  await vi.advanceTimersByTimeAsync(15 * 60_000);
  expect(vi.mocked(fetch).mock.calls[1][0]).toContain('getReceipts');
  expect(user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'student', pushToken: token, pushTokenExpiresAt: expiresAt } }));
});

it('does not send to expired or superseded registrations', async () => {
  const { service, user } = fixture();
  user.findUnique.mockResolvedValueOnce(null);
  await service.decision('reservation');
  expect(fetch).not.toHaveBeenCalled();
  vi.setSystemTime(new Date(expiresAt.getTime() + 1));
  await service.decision('reservation');
  expect(fetch).not.toHaveBeenCalled();
});

it('retries transient failures and clears a token rejected at ticket submission', async () => {
  const { service, user } = fixture();
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }) } as Response);
  const sending = service.decision('reservation');
  await vi.advanceTimersByTimeAsync(1100); await sending;
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(user.updateMany).toHaveBeenCalledOnce();
});

it('stops retries if logout or account switching invalidates the registration', async () => {
  const { service, user } = fixture();
  user.findUnique.mockResolvedValueOnce({ pushToken: token, pushTokenExpiresAt: expiresAt }).mockResolvedValueOnce(null);
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
  const sending = service.decision('reservation');
  await vi.advanceTimersByTimeAsync(1100); await sending;
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([[503, 3], [400, 1]])('bounds delivery retries for HTTP %i to %i attempts', async (status, attempts) => {
  const { service } = fixture();
  vi.mocked(fetch).mockResolvedValue({ ok: false, status } as Response);
  const sending = service.decision('reservation');
  await vi.advanceTimersByTimeAsync(3100); await sending;
  expect(fetch).toHaveBeenCalledTimes(attempts);
  service.onModuleDestroy();
  expect(vi.getTimerCount()).toBe(0);
});

it('checks a missing receipt at most twice and clears its timers', async () => {
  const { service } = fixture();
  vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { status: 'ok', id: 'ticket' } }) } as Response).mockResolvedValue({ ok: true, json: async () => ({ data: {} }) } as Response);
  await service.decision('reservation');
  await vi.advanceTimersByTimeAsync(20 * 60_000);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(vi.getTimerCount()).toBe(0);
});

it('returns the committed decision despite push failure and never notifies a rolled-back decision', async () => {
  let committed = false;
  const transaction = vi.fn(async () => { committed = true; return { id: 'reservation', status: 'CONFIRMED' }; });
  const decision = vi.fn(async () => { expect(committed).toBe(true); throw new Error('push outage'); });
  const service = new ReservationsService({ $transaction: transaction } as never, {} as never, { decision } as never);
  const admin = { ...auth, role: 'ADMIN' as const };
  await expect(service.decide(admin, 'reservation', 'CONFIRMED')).resolves.toMatchObject({ status: 'CONFIRMED' });
  expect(decision).toHaveBeenCalledOnce();
  transaction.mockRejectedValueOnce(new Error('rollback'));
  await expect(service.decide(admin, 'reservation', 'CONFIRMED')).rejects.toThrow('rollback');
  expect(decision).toHaveBeenCalledOnce();
});
