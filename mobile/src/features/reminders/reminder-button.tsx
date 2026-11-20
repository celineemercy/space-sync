import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { cancelReminder, isReminderScheduled, reminderDate, scheduleReminder } from "@/features/reminders/reminders";
import type { Reservation } from "@/types/domain";

export function ReminderButton({ reservation }: { reservation: Reservation }) {
  const [scheduled, setScheduled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void isReminderScheduled(reservation.id).then((value) => {
      if (active) setScheduled(value);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason : new Error("Unable to check reminder."));
    });
    return () => { active = false; };
  }, [reservation.id]);

  if (Platform.OS === "web" || (!scheduled && !reminderDate(reservation.startsAt))) return null;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (scheduled) await cancelReminder(reservation.id);
      else await scheduleReminder(reservation);
      setScheduled(!scheduled);
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error("Unable to update reminder."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Optional: get a notification 30 minutes before this reservation.</Text>
      {error ? <StatusMessage error={error} /> : null}
      <AppButton label={scheduled ? "Turn off reminder" : "Remind me 30 min before"} variant="secondary" loading={busy} onPress={() => void toggle()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  hint: { ...Typography.caption, color: Colors.textMuted },
});
