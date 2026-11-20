import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiException } from '../common/api-exception.js';
import type { AuthUser } from '../auth/auth-user.js';

type Receipt = { status?: string; id?: string; details?: { error?: string } };
type Registration = { userId: string; token: string; expiresAt: Date };

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private stopped = false;
  constructor(private readonly prisma: PrismaService) {}

  private expiration(user: AuthUser) {
    if (!user.expiresAt || user.expiresAt * 1000 <= Date.now()) throw new ApiException(401, 'UNAUTHORIZED', 'Sign in again to register notifications.');
    return new Date(user.expiresAt * 1000);
  }

  async register(user: AuthUser, token: string) {
    const expiresAt = this.expiration(user);
    await this.prisma.$transaction(async (tx) => {
      // Serialize claims for the same device token across accounts.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${token}, 0))`;
      await tx.user.updateMany({ where: { pushToken: token, id: { not: user.userId } }, data: { pushToken: null, pushTokenExpiresAt: null } });
      await tx.user.update({ where: { id: user.userId }, data: { pushToken: token, pushTokenExpiresAt: expiresAt } });
    });
    return { registered: true };
  }

  async remove(user: AuthUser, token: string) {
    await this.prisma.user.updateMany({ where: { id: user.userId, pushToken: token, pushTokenExpiresAt: this.expiration(user) }, data: { pushToken: null, pushTokenExpiresAt: null } });
    return { registered: false };
  }

  private async current(registration: Registration) {
    const user = await this.prisma.user.findUnique({ where: { id: registration.userId }, select: { pushToken: true, pushTokenExpiresAt: true } });
    return user?.pushToken === registration.token && user.pushTokenExpiresAt?.getTime() === registration.expiresAt.getTime() && user.pushTokenExpiresAt.getTime() > Date.now();
  }

  private async clear(registration: Registration) {
    await this.prisma.user.updateMany({ where: { id: registration.userId, pushToken: registration.token, pushTokenExpiresAt: registration.expiresAt }, data: { pushToken: null, pushTokenExpiresAt: null } });
  }

  private later(work: () => void, delay: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); if (!this.stopped) work(); }, delay);
    timer.unref?.();
    this.timers.add(timer);
  }

  private async request(path: 'send' | 'getReceipts', body: unknown) {
    const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw Object.assign(new Error('Expo request failed'), { retryable: response.status === 429 || response.status >= 500 });
    return response.json() as Promise<{ data?: Receipt | Receipt[] | Record<string, Receipt> }>;
  }

  private async checkReceipt(id: string, registration: Registration, attempt = 0) {
    try {
      const result = await this.request('getReceipts', { ids: [id] });
      const receipt = (result.data as Record<string, Receipt> | undefined)?.[id];
      if (receipt?.details?.error === 'DeviceNotRegistered') await this.clear(registration);
      else if (receipt?.status !== 'ok') {
        this.logger.warn('Decision push receipt unavailable or rejected.');
        if (!receipt && attempt === 0) this.later(() => { void this.checkReceipt(id, registration, 1); }, 5 * 60_000);
      }
    } catch {
      this.logger.warn('Decision push receipt request failed.');
      if (attempt === 0) this.later(() => { void this.checkReceipt(id, registration, 1); }, 5 * 60_000);
    }
  }

  async decision(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId }, select: {
      userId: true, startsAt: true, endsAt: true, status: true,
      room: { select: { code: true, name: true } }, user: { select: { pushToken: true, pushTokenExpiresAt: true } },
    } });
    if (!reservation || !['CONFIRMED', 'REJECTED'].includes(reservation.status) || !reservation.user.pushToken || !reservation.user.pushTokenExpiresAt || reservation.user.pushTokenExpiresAt.getTime() <= Date.now()) return;
    const registration = { userId: reservation.userId, token: reservation.user.pushToken, expiresAt: reservation.user.pushTokenExpiresAt };
    const format = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const payload = {
      to: registration.token, sound: 'default', channelId: 'reservation-decisions',
      title: `${reservation.status === 'CONFIRMED' ? 'Approved' : 'Rejected'}: ${reservation.room.code}`,
      body: `${reservation.room.name.slice(0, 160)} · ${format.format(reservation.startsAt)}–${format.format(reservation.endsAt)} WIB · ${reservation.status}`,
      data: { reservationId, status: reservation.status },
    };
    for (let attempt = 0; attempt < 3 && !this.stopped; attempt++) {
      if (!await this.current(registration)) return;
      try {
        const response = await this.request('send', payload);
        const ticket = (Array.isArray(response.data) ? response.data[0] : response.data) as Receipt | undefined;
        if (ticket?.details?.error === 'DeviceNotRegistered') { await this.clear(registration); return; }
        if (ticket?.status === 'ok' && ticket.id) {
          this.later(() => { void this.checkReceipt(ticket.id!, registration); }, 15 * 60_000);
          return;
        }
        if (ticket?.details?.error !== 'MessageRateExceeded') { this.logger.warn('Decision push ticket rejected.'); return; }
      } catch (error) {
        if ((error as { retryable?: boolean }).retryable === false) { this.logger.warn('Decision push request rejected.'); return; }
      }
      if (attempt < 2) await new Promise<void>((resolve) => this.later(resolve, 1000 * 2 ** attempt));
    }
    this.logger.warn('Decision push delivery attempts exhausted.');
  }

  onModuleDestroy() {
    this.stopped = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
