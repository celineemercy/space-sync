import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { Screen } from "@/components/ui/screen";
import { OfflineBanner, StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  useCancelReservation,
  useReservations,
} from "@/features/reservations/queries";
import { toCampusLabel } from "@/lib/date-time";
import type { Reservation } from "@/types/domain";

export default function ReservationsScreen() {
  const reservationsQuery = useReservations();
  const cancellation = useCancelReservation();
  const reservations = reservationsQuery.data?.reservations ?? [];
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED");
  const cancelled = reservations.filter((item) => item.status === "CANCELLED");

  const confirmCancellation = (reservation: Reservation) => {
    if (reservationsQuery.data?.stale) {
      Alert.alert(
        "Connection required",
        "Reconnect before cancelling a reservation.",
      );
      return;
    }
    Alert.alert(
      "Cancel reservation?",
      `${reservation.room.name}\n${toCampusLabel(reservation.startsAt)}`,
      [
        { text: "Keep reservation", style: "cancel" },
        {
          text: "Cancel reservation",
          style: "destructive",
          onPress: () => cancellation.mutate(reservation.id),
        },
      ],
    );
  };

  return (
    <Screen>
      {reservationsQuery.data?.stale ? (
        <OfflineBanner updatedAt={reservationsQuery.data.updatedAt} />
      ) : null}
      {reservationsQuery.error && !reservationsQuery.data ? (
        <StatusMessage error={reservationsQuery.error} />
      ) : null}
      {cancellation.error ? <StatusMessage error={cancellation.error} /> : null}

      <ReservationSection
        title="Upcoming"
        reservations={confirmed}
        empty="You do not have an active reservation yet."
        onCancel={confirmCancellation}
        cancellingId={
          cancellation.isPending ? cancellation.variables : undefined
        }
      />
      <ReservationSection
        title="Cancelled"
        reservations={cancelled}
        empty="Cancelled reservations will appear here."
      />
    </Screen>
  );
}

function ReservationSection({
  title,
  reservations,
  empty,
  onCancel,
  cancellingId,
}: {
  title: string;
  reservations: Reservation[];
  empty: string;
  onCancel?: (reservation: Reservation) => void;
  cancellingId?: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!reservations.length ? <Text style={styles.empty}>{empty}</Text> : null}
      {reservations.map((reservation) => (
        <View key={reservation.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.code}>{reservation.room.code}</Text>
              <Text style={styles.title}>{reservation.room.name}</Text>
            </View>
            <Text
              style={[
                styles.status,
                reservation.status === "CANCELLED" && styles.cancelled,
              ]}
            >
              {reservation.status}
            </Text>
          </View>
          <Text style={styles.location}>{reservation.room.location}</Text>
          <Text style={styles.time}>{toCampusLabel(reservation.startsAt)}</Text>
          <Text style={styles.time}>
            Until {toCampusLabel(reservation.endsAt)}
          </Text>
          {onCancel ? (
            <AppButton
              label="Cancel reservation"
              variant="danger"
              loading={cancellingId === reservation.id}
              onPress={() => onCancel(reservation)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  sectionTitle: { color: Colors.text, fontWeight: "900", fontSize: 21 },
  empty: {
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  row: { flexDirection: "row", gap: Spacing.md },
  flex: { flex: 1 },
  code: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  location: { color: Colors.textMuted },
  time: { color: Colors.text, fontWeight: "600" },
  status: { color: Colors.accent, fontSize: 11, fontWeight: "900" },
  cancelled: { color: Colors.textMuted },
});
