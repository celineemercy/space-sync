import { StyleSheet, Text, View } from "react-native";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { OfflineBanner } from "@/components/ui/status-message";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { toCampusLabel } from "@/lib/date-time";
import { useRoomSchedule } from "./schedule-queries";

export function RoomScheduleSection({ roomId }: { roomId: string }) {
  const query = useRoomSchedule(roomId);
  return <View style={styles.section}>
    <Text style={styles.title}>Upcoming Schedule</Text>
    <Text style={styles.caption}>Next seven days · Asia/Jakarta</Text>
    {query.isLoading ? <LoadingState label="Loading room schedule..." /> : query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} /> : query.data?.map(({ schedule, stale, updatedAt }) => {
      const items = schedule.items.filter((item) => Date.parse(item.endsAt) > Date.now());
      return <View key={schedule.date} style={styles.day}>
        <Text style={styles.date}>{schedule.date}</Text>
        {stale ? <OfflineBanner updatedAt={updatedAt} /> : null}
        {items.length ? items.map((item) => <Text key={`${item.kind}:${item.id}`} style={styles.caption}>{item.kind === "class" ? "Class schedule" : "Confirmed reservation"} · {toCampusLabel(item.startsAt)} – {toCampusLabel(item.endsAt)}</Text>) : <Text style={styles.caption}>No upcoming bookings or classes.</Text>}
      </View>;
    })}
    <Text style={styles.caption}>Schedules refresh every five minutes. Availability is checked when you book.</Text>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: Spacing.md, marginVertical: Spacing.md },
  title: { ...Typography.title, color: Colors.text },
  caption: { ...Typography.body, color: Colors.textMuted },
  date: { ...Typography.label, color: Colors.text },
  day: { gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: 12 },
});
