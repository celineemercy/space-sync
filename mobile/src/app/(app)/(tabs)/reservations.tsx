import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "@/components/ui/app-header";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Screen } from "@/components/ui/screen";
import { OfflineBanner, StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { ReminderButton } from "@/features/reminders/reminder-button";
import {
  useCancelReservation,
  useReservations,
} from "@/features/reservations/queries";
import { toCampusLabel } from "@/lib/date-time";
import { useAuth } from "@/providers/auth-provider";
import type { Reservation } from "@/types/domain";

function statusLabel(reservation: Reservation, now: number) {
  if (reservation.status === "PENDING") return "Awaiting approval";
  if (reservation.status === "CONFIRMED") return new Date(reservation.endsAt).getTime() <= now ? "Completed" : "Approved";
  if (reservation.status === "EXPIRED") return "Expired";
  if (reservation.status === "REJECTED") return "Rejected";
  return "Cancelled";
}

export default function ReservationsScreen() {
  const { user } = useAuth();
  const reservationsQuery = useReservations();
  const cancellation = useCancelReservation();
  const [reservationToCancel, setReservationToCancel] =
    useState<Reservation | null>(null);
  const [now] = useState(() => Date.now());
  const reservations = reservationsQuery.data?.reservations ?? [];
  const pending = reservations.filter((item) => item.status === "PENDING").sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED" && new Date(item.endsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const rejected = reservations.filter((item) => item.status === "REJECTED").sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const completed = reservations.filter((item) => ["CANCELLED", "EXPIRED"].includes(item.status) || (item.status === "CONFIRMED" && new Date(item.endsAt).getTime() <= now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const confirmCancellation = (reservation: Reservation) => {
    if (reservationsQuery.data?.stale) {
      if (Platform.OS === "web") {
        window.alert("Reconnect before cancelling a reservation.");
        return;
      }
      Alert.alert(
        "Connection required",
        "Reconnect before cancelling a reservation.",
      );
      return;
    }

    cancellation.reset();
    setReservationToCancel(reservation);
  };

  const cancelReservation = async () => {
    if (!reservationToCancel) return;
    try {
      await cancellation.mutateAsync(reservationToCancel.id);
      setReservationToCancel(null);
    } catch {
      // The mutation error remains visible beneath the dialog.
    }
  };

  return (
    <View style={styles.page}>
      <AppHeader
        title="Your reservations"
        description="Keep track of upcoming bookings and manage changes in one place."
        accountLabel={user?.email}
      />
      <Screen contentContainerStyle={styles.content}>
        {reservationsQuery.data?.stale ? (
          <OfflineBanner updatedAt={reservationsQuery.data.updatedAt} />
        ) : null}
        {cancellation.error ? (
          <StatusMessage error={cancellation.error} />
        ) : null}

        {reservationsQuery.isLoading ? (
          <LoadingState label="Loading your reservations..." />
        ) : reservationsQuery.error && !reservationsQuery.data ? (
          <ErrorState
            error={reservationsQuery.error}
            retrying={reservationsQuery.isFetching}
            onRetry={() => void reservationsQuery.refetch()}
          />
        ) : (
          <>
            <ReservationSection
              title="Awaiting approval"
              reservations={pending}
              now={now}
              empty="No requests are awaiting approval."
              onCancel={confirmCancellation}
              cancellingId={cancellation.isPending ? cancellation.variables : undefined}
            />
            <ReservationSection
              title="Upcoming"
              reservations={confirmed}
              now={now}
              empty="You do not have an active reservation yet."
              onCancel={confirmCancellation}
              cancellingId={
                cancellation.isPending ? cancellation.variables : undefined
              }
            />
            <ReservationSection
              title="Rejected"
              reservations={rejected}
              now={now}
              empty="Rejected requests will appear here."
            />
            <ReservationSection
              title="Completed and cancelled"
              reservations={completed}
              now={now}
              empty="Completed and cancelled reservations will appear here."
            />
          </>
        )}
      </Screen>
      <ConfirmationDialog
        visible={Boolean(reservationToCancel)}
        title="Cancel this reservation?"
        description={
          reservationToCancel
            ? `${reservationToCancel.room.name} on ${toCampusLabel(reservationToCancel.startsAt)} will become available to other students.`
            : ""
        }
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        tone="danger"
        loading={cancellation.isPending}
        onClose={() => setReservationToCancel(null)}
        onConfirm={cancelReservation}
      />
    </View>
  );
}

function ReservationSection({
  title,
  reservations,
  now,
  empty,
  onCancel,
  cancellingId,
}: {
  title: string;
  reservations: Reservation[];
  now: number;
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
                ["CANCELLED", "EXPIRED"].includes(reservation.status) && styles.cancelled,
                reservation.status === "REJECTED" && styles.rejected,
                reservation.status === "PENDING" && styles.pending,
              ]}
            >
              {statusLabel(reservation, now)}
            </Text>
          </View>
          {onCancel ? <Text style={styles.location}>{reservation.room.location}</Text> : null}
          <Text style={styles.time}>{toCampusLabel(reservation.startsAt)}</Text>
          {reservation.rejectionReason ? <Text style={styles.reason}>Reason: {reservation.rejectionReason}</Text> : null}
          {onCancel ? <Text style={styles.time}>
            Until {toCampusLabel(reservation.endsAt)}
          </Text> : null}
          {onCancel ? (
            <>{reservation.status === "CONFIRMED" ? <ReminderButton reservation={reservation} /> : null}<AppButton
              label="Cancel reservation"
              variant="danger"
              loading={cancellingId === reservation.id}
              onPress={() => onCancel(reservation)}
            /></>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: Spacing.md },
  section: { gap: Spacing.md },
  sectionTitle: { ...Typography.headline, color: Colors.text },
  empty: {
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    ...Typography.body,
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
    ...Typography.overline,
    letterSpacing: 0.8,
  },
  title: { ...Typography.title, color: Colors.text },
  location: { ...Typography.body, color: Colors.textMuted },
  time: { ...Typography.bodyStrong, color: Colors.text },
  reason: { ...Typography.body, color: Colors.danger },
  status: { ...Typography.overline, color: Colors.accent },
  cancelled: { color: Colors.textMuted },
  rejected: { color: Colors.danger },
  pending: { color: Colors.primary },
});
