import { ApiException } from './api-exception.js';

export const CAMPUS_TIME_ZONE = 'Asia/Jakarta';
const DAY = 86_400_000;
export function campusDate(now = new Date()) { return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10); }
export function campusDay(date = campusDate()) {
  const calendar = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date) {
    throw new ApiException(400, 'INVALID_DATE', 'Use a valid date in YYYY-MM-DD format.');
  }
  const startsAt = new Date(`${date}T00:00:00+07:00`);
  return { date, startsAt, endsAt: new Date(startsAt.getTime() + DAY) };
}
export function campusWeek(now = new Date()) {
  const calendar = new Date(`${campusDate(now)}T00:00:00Z`);
  calendar.setUTCDate(calendar.getUTCDate() - (calendar.getUTCDay() + 6) % 7);
  const start = campusDay(calendar.toISOString().slice(0, 10));
  return { ...start, endsAt: new Date(start.startsAt.getTime() + 7 * DAY) };
}
