const CAMPUS_TIME_ZONE = "Asia/Jakarta";

export function toCampusLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CAMPUS_TIME_ZONE,
  }).format(date);
}

export function combineDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return result;
}

export function defaultSearchRange() {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 1);
  startsAt.setHours(9, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setHours(11, 0, 0, 0);
  return { date: startsAt, startsAt, endsAt };
}

export function isValidRange(startsAt: Date, endsAt: Date): boolean {
  return startsAt.getTime() < endsAt.getTime();
}
