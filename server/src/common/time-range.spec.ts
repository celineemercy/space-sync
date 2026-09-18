import { ApiException } from './api-exception.js';
import { intervalsOverlap, parseTimeRange } from './time-range.js';

describe('time range rules', () => {
  const range = (startHour: number, endHour: number) => ({
    startsAt: new Date(
      `2026-09-21T${String(startHour).padStart(2, '0')}:00:00.000Z`,
    ),
    endsAt: new Date(
      `2026-09-21T${String(endHour).padStart(2, '0')}:00:00.000Z`,
    ),
  });

  it.each([
    [range(8, 10), range(9, 11)],
    [range(9, 10), range(8, 11)],
    [range(8, 12), range(9, 10)],
  ])('detects overlapping intervals', (first, second) => {
    expect(intervalsOverlap(first, second)).toBe(true);
  });

  it('allows adjacent intervals', () => {
    expect(intervalsOverlap(range(8, 10), range(10, 12))).toBe(false);
  });

  it('parses a valid ISO range', () => {
    const parsed = parseTimeRange(
      '2026-09-21T08:00:00.000Z',
      '2026-09-21T10:00:00.000Z',
    );
    expect(parsed.startsAt.toISOString()).toBe('2026-09-21T08:00:00.000Z');
  });

  it.each([
    ['invalid', '2026-09-21T10:00:00.000Z'],
    ['2026-09-21T10:00:00.000Z', '2026-09-21T10:00:00.000Z'],
    ['2026-09-21T11:00:00.000Z', '2026-09-21T10:00:00.000Z'],
  ])('rejects invalid ranges', (startsAt, endsAt) => {
    expect(() => parseTimeRange(startsAt, endsAt)).toThrow(ApiException);
  });
});
