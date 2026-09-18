import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimeControls } from "@/components/date-time-controls";
import { RoomCard } from "@/components/room-card";
import { AppButton } from "@/components/ui/app-button";
import { FormField } from "@/components/ui/form-field";
import { Screen } from "@/components/ui/screen";
import { OfflineBanner, StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { useAvailabilitySearch, useRooms } from "@/features/rooms/queries";
import {
  combineDateAndTime,
  defaultSearchRange,
  isValidRange,
} from "@/lib/date-time";
import { useAuth } from "@/providers/auth-provider";
import type { Room } from "@/types/domain";

export default function SearchScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [initial] = useState(defaultSearchRange);
  const [date, setDate] = useState(initial.date);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [capacity, setCapacity] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const roomsQuery = useRooms();
  const availability = useAvailabilitySearch();

  const allRooms = useMemo(
    () => roomsQuery.data?.rooms ?? [],
    [roomsQuery.data?.rooms],
  );
  const facilities = useMemo(() => {
    const values = new Map<string, string>();
    for (const room of allRooms) {
      for (const facility of room.facilities)
        values.set(facility.id, facility.name);
    }
    return [...values]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allRooms]);

  const applyDate = (nextDate: Date) => {
    setDate(nextDate);
    setStartsAt(combineDateAndTime(nextDate, startsAt));
    setEndsAt(combineDateAndTime(nextDate, endsAt));
  };

  const search = () => {
    const start = combineDateAndTime(date, startsAt);
    const end = combineDateAndTime(date, endsAt);
    if (!isValidRange(start, end)) {
      setValidationError("End time must be later than start time.");
      return;
    }
    const parsedCapacity = capacity ? Number(capacity) : undefined;
    if (
      parsedCapacity !== undefined &&
      (!Number.isInteger(parsedCapacity) || parsedCapacity < 1)
    ) {
      setValidationError("Capacity must be a positive whole number.");
      return;
    }
    setValidationError(null);
    availability.mutate({
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      minCapacity: parsedCapacity,
      facilityIds: selectedFacilities,
    });
  };

  const openRoom = (room: Room) => {
    const params: Record<string, string> = { id: room.id };
    if (availability.data) {
      params.startsAt = availability.data.startsAt;
      params.endsAt = availability.data.endsAt;
    }
    router.push({ pathname: "/(app)/room/[id]", params });
  };

  const visibleRooms = availability.data?.rooms ?? allRooms;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>SIGNED IN AS</Text>
          <Text numberOfLines={1} style={styles.email}>
            {user?.email}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {roomsQuery.data?.stale ? (
        <OfflineBanner updatedAt={roomsQuery.data.updatedAt} />
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>When do you need a room?</Text>
        <DateTimeControls
          date={date}
          startsAt={startsAt}
          endsAt={endsAt}
          onDateChange={applyDate}
          onStartChange={setStartsAt}
          onEndChange={setEndsAt}
        />
        <FormField
          label="Minimum capacity (optional)"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
          placeholder="For example, 8"
        />
        {facilities.length ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Facilities (optional)</Text>
            <View style={styles.chips}>
              {facilities.map((facility) => {
                const selected = selectedFacilities.includes(facility.id);
                return (
                  <Pressable
                    key={facility.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() =>
                      setSelectedFacilities((current) =>
                        selected
                          ? current.filter((id) => id !== facility.id)
                          : [...current, facility.id],
                      )
                    }
                    style={[styles.chip, selected && styles.selectedChip]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.selectedChipText,
                      ]}
                    >
                      {facility.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {validationError ? (
          <StatusMessage error={new Error(validationError)} />
        ) : null}
        {availability.error ? (
          <StatusMessage error={availability.error} />
        ) : null}
        <AppButton
          label="Search availability"
          loading={availability.isPending}
          onPress={search}
        />
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>
          {availability.data ? "Available rooms" : "Campus rooms"}
        </Text>
        <Text style={styles.count}>{visibleRooms.length}</Text>
      </View>

      {roomsQuery.error && !roomsQuery.data ? (
        <StatusMessage error={roomsQuery.error} />
      ) : null}
      {!roomsQuery.isLoading && visibleRooms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No rooms found</Text>
          <Text style={styles.emptyText}>
            Try another time, a smaller capacity, or fewer facilities.
          </Text>
        </View>
      ) : null}
      {visibleRooms.map((room) => (
        <RoomCard key={room.id} room={room} onPress={() => openRoom(room)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  flex: { flex: 1 },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  email: { color: Colors.text, fontWeight: "700", marginTop: 2 },
  signOut: { padding: Spacing.sm },
  signOutText: { color: Colors.primary, fontWeight: "700" },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  filterGroup: { gap: Spacing.sm },
  filterLabel: { color: Colors.text, fontWeight: "600", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectedChip: { borderColor: Colors.primary, backgroundColor: "#E7EEFF" },
  chipText: { color: Colors.textMuted, fontWeight: "600" },
  selectedChipText: { color: Colors.primary },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: {
    minWidth: 30,
    textAlign: "center",
    color: Colors.primary,
    backgroundColor: "#E7EEFF",
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    fontWeight: "800",
  },
  empty: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 18,
  },
  emptyText: { color: Colors.textMuted, textAlign: "center", lineHeight: 21 },
});
