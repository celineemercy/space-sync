import { combineDateAndTime, isFutureStart, isValidRange, toCampusInstant } from "./date-time";

describe("date and time helpers", () => {
  it("interprets picker wall time as Jakarta time", () => {
    const picked = new Date(2026, 8, 21, 9, 0);
    expect(toCampusInstant(picked).toISOString()).toBe("2026-09-21T02:00:00.000Z");
  });
  it("combines the selected date with the selected local time", () => {
    const date = new Date(2026, 8, 21, 0, 0);
    const time = new Date(2026, 0, 1, 13, 45);
    const result = combineDateAndTime(date, time);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(21);
    expect(result.getHours()).toBe(13);
    expect(result.getMinutes()).toBe(45);
  });

  it("accepts increasing ranges and rejects equal or reversed ranges", () => {
    const first = new Date("2026-09-21T08:00:00.000Z");
    const second = new Date("2026-09-21T10:00:00.000Z");
    expect(isValidRange(first, second)).toBe(true);
    expect(isValidRange(second, first)).toBe(false);
    expect(isValidRange(first, first)).toBe(false);
  });

  it("requires a future start time", () => {
    const now = Date.parse("2030-01-01T09:00:00Z");
    expect(isFutureStart(new Date("2030-01-01T10:00:00Z"), now)).toBe(true);
    expect(isFutureStart(new Date("2030-01-01T08:00:00Z"), now)).toBe(false);
  });
});
