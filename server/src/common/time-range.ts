import { ApiException } from './api-exception.js';

export type TimeRange = { startsAt: Date; endsAt: Date };

export function intervalsOverlap(first: TimeRange, second: TimeRange): boolean {
  return first.startsAt < second.endsAt && first.endsAt > second.startsAt;
}

export function parseTimeRange(startsAt: string, endsAt: string): TimeRange {
  const parsedStart = new Date(startsAt);
  const parsedEnd = new Date(endsAt);
  if (
    Number.isNaN(parsedStart.getTime()) ||
    Number.isNaN(parsedEnd.getTime()) ||
    parsedStart >= parsedEnd
  ) {
    throw new ApiException(
      400,
      'INVALID_TIME_RANGE',
      'The end time must be later than the start time.',
    );
  }
  return { startsAt: parsedStart, endsAt: parsedEnd };
}
