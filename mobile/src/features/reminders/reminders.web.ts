import type { Reservation } from "@/types/domain";

export function reminderDate(startsAt: string, now = Date.now()): Date | null {
  const time = Date.parse(startsAt) - 30 * 60_000;
  return Number.isFinite(time) && time > now ? new Date(time) : null;
}

export function reminderId(reservationId: string): string { return `reservation-reminder-${reservationId}`; }
export async function isReminderScheduled(): Promise<boolean> { return false; }
export async function scheduleReminder(_reservation: Reservation): Promise<void> {
  throw new Error("Reservation reminders are available in the Android app.");
}
export async function cancelReminder(): Promise<void> {}
export async function clearReminders(): Promise<void> {}
