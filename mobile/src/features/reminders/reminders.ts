import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Reservation } from "@/types/domain";

const CHANNEL_ID = "reservation-reminders";
const PREFIX = "reservation-reminder-";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function reminderDate(startsAt: string, now = Date.now()): Date | null {
  const time = Date.parse(startsAt) - 30 * 60_000;
  return Number.isFinite(time) && time > now ? new Date(time) : null;
}

export function reminderId(reservationId: string): string {
  return `${PREFIX}${reservationId}`;
}

export async function isReminderScheduled(reservationId: string): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((item) => item.identifier === reminderId(reservationId));
}

export async function scheduleReminder(reservation: Reservation): Promise<void> {
  const date = reminderDate(reservation.startsAt);
  if (!date) throw new Error("Reminders can be set only more than 30 minutes before a reservation.");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Reservation reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    throw new Error("Notifications are disabled. Enable them in device settings to set a reminder.");
  }

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(reservation.id),
    content: {
      title: "Room reservation in 30 minutes",
      body: `${reservation.room.name} (${reservation.room.code}) at ${reservation.room.location}`,
      data: { reservationId: reservation.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    },
  });
}

export async function cancelReminder(reservationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId(reservationId));
}

export async function clearReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.identifier.startsWith(PREFIX))
    .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}
