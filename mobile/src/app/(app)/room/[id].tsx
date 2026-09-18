import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { Screen } from "@/components/ui/screen";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useCreateReservation } from "@/features/reservations/queries";
import { useRoom } from "@/features/rooms/queries";
import { toCampusLabel } from "@/lib/date-time";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function RoomDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    startsAt?: string;
    endsAt?: string;
  }>();
  const router = useRouter();
  const roomId = first(params.id);
  const startsAt = first(params.startsAt);
  const endsAt = first(params.endsAt);
  const roomQuery = useRoom(roomId);
  const reservation = useCreateReservation();

  const reserve = async () => {
    if (!startsAt || !endsAt) return;
    try {
      await reservation.mutateAsync({ roomId, startsAt, endsAt });
      Alert.alert(
        "Reservation confirmed",
        "The room has been added to My Reservations.",
        [
          {
            text: "View reservations",
            onPress: () => router.replace("/(app)/(tabs)/reservations"),
          },
        ],
      );
    } catch {
      // The mutation error is rendered below so the selected interval remains visible.
    }
  };

  if (roomQuery.isLoading) {
    return (
      <Screen scroll={false} style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </Screen>
    );
  }
  if (roomQuery.error || !roomQuery.data) {
    return (
      <Screen>
        {roomQuery.error ? <StatusMessage error={roomQuery.error} /> : null}
      </Screen>
    );
  }

  const room = roomQuery.data;
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.code}>{room.code}</Text>
        <Text style={styles.title}>{room.name}</Text>
        <Text style={styles.location}>{room.location}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Capacity</Text>
        <Text style={styles.value}>{room.capacity} people</Text>
        <Text style={styles.label}>About this room</Text>
        <Text style={styles.description}>
          {room.description ?? "No description is available."}
        </Text>
        <Text style={styles.label}>Facilities</Text>
        <View style={styles.chips}>
          {room.facilities.map((facility) => (
            <Text key={facility.id} style={styles.chip}>
              {facility.name}
            </Text>
          ))}
        </View>
      </View>

      {startsAt && endsAt ? (
        <View style={styles.bookingCard}>
          <Text style={styles.bookingTitle}>Selected time</Text>
          <Text style={styles.value}>{toCampusLabel(startsAt)}</Text>
          <Text style={styles.to}>to</Text>
          <Text style={styles.value}>{toCampusLabel(endsAt)}</Text>
          {reservation.error ? (
            <StatusMessage error={reservation.error} />
          ) : null}
          <AppButton
            label="Confirm reservation"
            loading={reservation.isPending}
            onPress={reserve}
          />
        </View>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Choose a date and time from Search before reserving this room.
          </Text>
          <AppButton
            label="Back to search"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  hero: { gap: Spacing.xs },
  code: { color: Colors.primary, fontWeight: "900", letterSpacing: 1 },
  title: { color: Colors.text, fontWeight: "900", fontSize: 28 },
  location: { color: Colors.textMuted, fontSize: 16 },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  label: { color: Colors.textMuted, fontWeight: "700", marginTop: Spacing.sm },
  value: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  description: { color: Colors.text, lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.surfaceMuted,
    color: Colors.text,
    padding: Spacing.sm,
    borderRadius: Radius.pill,
  },
  bookingCard: {
    backgroundColor: "#E7EEFF",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  bookingTitle: { color: Colors.primary, fontSize: 18, fontWeight: "800" },
  to: { color: Colors.textMuted },
  notice: {
    backgroundColor: Colors.warningSurface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  noticeText: { color: Colors.warning, lineHeight: 21 },
});
