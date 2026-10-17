import * as Notifications from "expo-notifications";
import { cancelReminder, isReminderScheduled, reminderDate, reminderId, scheduleReminder } from "@/features/reminders/reminders";
import type { Reservation } from "@/types/domain";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue({}),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  scheduleNotificationAsync: jest.fn().mockResolvedValue("reservation-reminder-r1"),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

const reservation: Reservation = {
  id: "r1", startsAt: "2030-01-01T03:00:00.000Z", endsAt: "2030-01-01T04:00:00.000Z",
  status: "CONFIRMED", cancelledAt: null, createdAt: "2029-01-01T00:00:00.000Z",
  room: { id: "room-1", code: "A-101", name: "Discussion Room", location: "Building A", capacity: 6 },
};

beforeEach(() => jest.clearAllMocks());

it("calculates a reminder 30 minutes before a future reservation", () => {
  expect(reminderDate(reservation.startsAt, Date.parse("2030-01-01T00:00:00Z"))?.toISOString())
    .toBe("2030-01-01T02:30:00.000Z");
  expect(reminderDate(reservation.startsAt, Date.parse("2030-01-01T02:31:00Z"))).toBeNull();
});

it("schedules and cancels the reservation-specific notification", async () => {
  await scheduleReminder(reservation);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    identifier: reminderId("r1"),
    trigger: expect.objectContaining({ date: new Date("2030-01-01T02:30:00Z") }),
  }));
  await cancelReminder("r1");
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(reminderId("r1"));
});

it("reports denied permission without scheduling", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
  await expect(scheduleReminder(reservation)).rejects.toThrow("Notifications are disabled");
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it("reads the scheduled state from the device", async () => {
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
    { identifier: reminderId("r1") },
  ] as never);
  await expect(isReminderScheduled("r1")).resolves.toBe(true);
});
