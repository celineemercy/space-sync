import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DateTimeControls } from "@/components/date-time-controls";
import { RoomCard } from "@/components/room-card";
import { AppHeader } from "@/components/ui/app-header";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormField } from "@/components/ui/form-field";
import { Screen } from "@/components/ui/screen";
import { OfflineBanner, StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { useAvailabilitySearch, useRooms } from "@/features/rooms/queries";
import {
  combineDateAndTime,
  toCampusInstant,
  defaultSearchRange,
  isFutureStart,
  isValidRange,
} from "@/lib/date-time";
import { useAuth } from "@/providers/auth-provider";
import type { AvailabilityInput, Room } from "@/types/domain";

export default function SearchScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [initial] = useState(defaultSearchRange);
  const [date, setDate] = useState(initial.date);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [capacity, setCapacity] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchedInput, setSearchedInput] = useState<AvailabilityInput | null>(null);
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const roomsQuery = useRooms();
  const availability = useAvailabilitySearch();

  const clearSearch = () => {
    setSearchedInput(null);
    setValidationError(null);
    availability.reset();
  };

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
    clearSearch();
    setDate(nextDate);
    setStartsAt(combineDateAndTime(nextDate, startsAt));
    setEndsAt(combineDateAndTime(nextDate, endsAt));
  };

  const search = () => {
    const start = toCampusInstant(combineDateAndTime(date, startsAt));
    const end = toCampusInstant(combineDateAndTime(date, endsAt));
    if (!isValidRange(start, end)) {
      setValidationError("End time must be later than start time.");
      return;
    }
    if (!isFutureStart(start)) {
      setValidationError("Choose a start time in the future.");
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
    const input: AvailabilityInput = {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      minCapacity: parsedCapacity,
      facilityIds: selectedFacilities,
    };
    setSearchedInput(input);
    availability.mutate(input);
  };

  const openRoom = (room: Room) => {
    const params: Record<string, string> = { id: room.id };
    if (searchedInput && availability.data && !availability.data.stale) {
      params.startsAt = searchedInput.startsAt;
      params.endsAt = searchedInput.endsAt;
    }
    router.push({ pathname: "/(app)/room/[id]", params });
  };

  const searchResult =
    searchedInput && !availability.isPending && !availability.error
      ? availability.data
      : null;
  const visibleRooms = searchedInput ? (searchResult?.rooms ?? []) : allRooms;

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setShowSignOutConfirmation(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={styles.page}>
      <AppHeader
        title="Find a room"
        description="Choose a time, compare spaces, and book."
        accountLabel={user?.email}
        actionLabel="Sign out"
        onAction={() => setShowSignOutConfirmation(true)}
      />
      <Screen contentContainerStyle={styles.content}>
        {roomsQuery.data?.stale ? (
          <OfflineBanner updatedAt={roomsQuery.data.updatedAt} />
        ) : null}
        {searchResult?.stale ? (
          <><OfflineBanner updatedAt={searchResult.updatedAt} /><Text style={styles.offlineNotice}>Availability may have changed. Reconnect and search again before booking.</Text></>
        ) : null}

        <View style={styles.panel}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>When do you need it?</Text>
          </View>
          <DateTimeControls
            date={date}
            startsAt={startsAt}
            endsAt={endsAt}
            onDateChange={applyDate}
            onStartChange={(value) => {
              clearSearch();
              setStartsAt(value);
            }}
            onEndChange={(value) => {
              clearSearch();
              setEndsAt(value);
            }}
          />
          <AppButton
            label={showFilters ? "Hide filters" : `Filters${capacity || selectedFacilities.length ? ` (${Number(Boolean(capacity)) + selectedFacilities.length})` : ""}`}
            variant="secondary"
            onPress={() => setShowFilters((current) => !current)}
          />
          {showFilters ? (
            <>
              <FormField
                label="Minimum capacity (optional)"
                value={capacity}
                onChangeText={(value) => {
                  clearSearch();
                  setCapacity(value);
                }}
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
                          accessibilityLabel={facility.name}
                          accessibilityState={{ checked: selected }}
                          onPress={() => {
                            clearSearch();
                            setSelectedFacilities((current) =>
                              selected
                                ? current.filter((id) => id !== facility.id)
                                : [...current, facility.id],
                            );
                          }}
                          style={[styles.chip, selected && styles.selectedChip]}
                        >
                          <Text style={[styles.chipText, selected && styles.selectedChipText]}>
                            {facility.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
          {validationError ? (
            <StatusMessage error={new Error(validationError)} />
          ) : null}
          {availability.error ? (
            <ErrorState
              error={availability.error}
              retrying={availability.isPending}
              onRetry={() => {
                if (searchedInput) availability.mutate(searchedInput);
              }}
            />
          ) : null}
          <AppButton
            label="Search availability"
            loading={availability.isPending}
            loadingLabel="Searching rooms..."
            onPress={search}
          />
        </View>

        <AppButton
          label="Scan room QR code"
          variant="secondary"
          onPress={() => router.push("/(app)/scan")}
        />

        {capacity || selectedFacilities.length ? (
          <View style={styles.appliedFilters}>
            <Text style={styles.filterLabel}>Applied filters</Text>
            <View style={styles.chips}>
              {capacity ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove capacity filter, ${capacity} seats`}
                  onPress={() => { clearSearch(); setCapacity(""); }}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{capacity}+ seats  ×</Text>
                </Pressable>
              ) : null}
              {selectedFacilities.map((id) => {
                const facility = facilities.find((item) => item.id === id);
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${facility?.name ?? id} filter`}
                    onPress={() => {
                      clearSearch();
                      setSelectedFacilities((current) => current.filter((value) => value !== id));
                    }}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{facility?.name ?? id}  ×</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>
            {searchedInput ? "Available rooms" : "Campus rooms"}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.count}>
            {roomsQuery.isLoading || availability.isPending ? "…" : visibleRooms.length}
          </Text>
        </View>

        {roomsQuery.isLoading ? (
          <LoadingState label="Loading campus rooms..." />
        ) : roomsQuery.error && !roomsQuery.data ? (
          <ErrorState
            error={roomsQuery.error}
            retrying={roomsQuery.isFetching}
            onRetry={() => void roomsQuery.refetch()}
          />
        ) : searchedInput && availability.isPending ? (
          <LoadingState label="Searching available rooms..." />
        ) : searchedInput && availability.error ? null : visibleRooms.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No rooms found</Text>
            <Text style={styles.emptyText}>
              Try another time, a smaller capacity, or fewer facilities.
            </Text>
          </View>
        ) : (
          visibleRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              interval={searchedInput && searchResult
                ? `${startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–${endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : undefined}
              onPress={() => openRoom(room)}
            />
          ))
        )}
      </Screen>
      <ConfirmationDialog
        visible={showSignOutConfirmation}
        title="Sign out of space-sync?"
        description="You will need to enter your credentials again to manage reservations."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        loading={isSigningOut}
        onClose={() => setShowSignOutConfirmation(false)}
        onConfirm={confirmSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  offlineNotice: { ...Typography.body, color: Colors.warning },
  page: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: Spacing.md },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionHeading: { gap: Spacing.xs },
  sectionTitle: { ...Typography.headline, color: Colors.text },
  appliedFilters: { gap: Spacing.sm },
  filterGroup: { gap: Spacing.sm },
  filterLabel: { ...Typography.label, color: Colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectedChip: {
    borderColor: Colors.primary,
    backgroundColor: Colors.successSurface,
  },
  chipText: { ...Typography.label, color: Colors.textMuted },
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
    backgroundColor: Colors.successSurface,
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    ...Typography.title,
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
    ...Typography.title,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: "center",
    ...Typography.body,
  },
});
