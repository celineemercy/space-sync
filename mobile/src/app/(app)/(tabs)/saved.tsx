import { useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { AppHeader } from "@/components/ui/app-header";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormField } from "@/components/ui/form-field";
import { Screen } from "@/components/ui/screen";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import {
  SAVED_ROOM_NOTE_MAX_LENGTH,
  type SavedRoom,
} from "@/features/saved-rooms/model";
import {
  useDeleteSavedRoom,
  useSavedRooms,
  useUpdateSavedRoom,
} from "@/features/saved-rooms/queries";
import { useAuth } from "@/providers/auth-provider";
import { logRuntime } from "@/lib/runtime-log";

export default function SavedRoomsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const savedRooms = useSavedRooms();
  const updateSavedRoom = useUpdateSavedRoom();
  const deleteSavedRoom = useDeleteSavedRoom();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [roomToDelete, setRoomToDelete] = useState<SavedRoom | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "code" | "capacity">("recent");
  const filteredRooms = (savedRooms.data ?? []).filter((room) =>
    [room.code, room.name, room.location, room.note].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())),
  ).sort((a, b) => sort === "code" ? a.code.localeCompare(b.code) : sort === "capacity" ? b.capacity - a.capacity : b.updatedAt.localeCompare(a.updatedAt));

  const startEditing = (savedRoom: SavedRoom) => {
    updateSavedRoom.reset();
    setEditingId(savedRoom.id);
    setDraftNote(savedRoom.note);
  };

  const saveNote = async () => {
    if (!editingId) return;
    try {
      await updateSavedRoom.mutateAsync({ id: editingId, note: draftNote });
      setEditingId(null);
      setDraftNote("");
    } catch {
      logRuntime("warn", "saved_room_update_failed");
    }
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      await deleteSavedRoom.mutateAsync(roomToDelete.id);
      if (editingId === roomToDelete.id) setEditingId(null);
      setRoomToDelete(null);
    } catch {
      logRuntime("warn", "saved_room_delete_failed");
    }
  };

  return (
    <View style={styles.page}>
      <AppHeader
        title="Saved rooms"
        description="Keep a personal offline shortlist and add notes for later."
        accountLabel={user?.email}
      />
      <Screen contentContainerStyle={styles.content}>
        <TextInput accessibilityLabel="Search saved rooms" placeholder="Search saved rooms" value={search} onChangeText={setSearch} style={styles.search} />
        <View style={styles.actions}>
          {(["recent", "code", "capacity"] as const).map((option) => <AppButton key={option} label={option === "recent" ? "Recent" : option === "code" ? "Code" : "Capacity"} variant={sort === option ? "primary" : "secondary"} onPress={() => setSort(option)} style={styles.action} />)}
        </View>
        <Text style={styles.location}>{filteredRooms.length} results</Text>
        {deleteSavedRoom.error ? (
          <StatusMessage error={deleteSavedRoom.error} />
        ) : null}

        {savedRooms.isLoading ? (
          <LoadingState label="Loading saved rooms..." />
        ) : savedRooms.error ? (
          <ErrorState
            error={savedRooms.error}
            retrying={savedRooms.isFetching}
            onRetry={() => void savedRooms.refetch()}
          />
        ) : filteredRooms.length ? (
          filteredRooms.map((savedRoom) => (
            <View key={savedRoom.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.flex}>
                  <Text style={styles.code}>{savedRoom.code}</Text>
                  <Text style={styles.title}>{savedRoom.name}</Text>
                </View>
                <Text style={styles.capacity}>{savedRoom.capacity} seats</Text>
              </View>
              <Text style={styles.location}>{savedRoom.location}</Text>
              <AppButton
                label={`View ${savedRoom.name}`}
                onPress={() => router.push({ pathname: "/(app)/room/[id]", params: { id: savedRoom.roomId } })}
              />

              {editingId === savedRoom.id ? (
                <View style={styles.editor}>
                  <FormField
                    label={`Note for ${savedRoom.name}`}
                    maxLength={SAVED_ROOM_NOTE_MAX_LENGTH}
                    multiline
                    onChangeText={setDraftNote}
                    placeholder="For example, best for group work"
                    value={draftNote}
                  />
                  <Text style={styles.counter}>
                    {draftNote.length}/{SAVED_ROOM_NOTE_MAX_LENGTH}
                  </Text>
                  {updateSavedRoom.error ? (
                    <StatusMessage error={updateSavedRoom.error} />
                  ) : null}
                  <View style={styles.actions}>
                    <AppButton
                      disabled={updateSavedRoom.isPending}
                      label="Cancel edit"
                      onPress={() => setEditingId(null)}
                      style={styles.action}
                      variant="secondary"
                    />
                    <AppButton
                      label="Save changes"
                      loading={updateSavedRoom.isPending}
                      onPress={saveNote}
                      style={styles.action}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Personal note</Text>
                    <Text style={styles.note}>
                      {savedRoom.note || "No note yet."}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <AppButton
                      label={savedRoom.note ? "Edit note" : "Add note"}
                      onPress={() => startEditing(savedRoom)}
                      style={styles.action}
                      variant="secondary"
                    />
                    <AppButton
                      label={`Remove ${savedRoom.name}`}
                      onPress={() => {
                        deleteSavedRoom.reset();
                        setRoomToDelete(savedRoom);
                      }}
                      style={styles.action}
                      variant="danger"
                    />
                  </View>
                </>
              )}
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{savedRooms.data?.length ? "No matching saved rooms" : "No saved rooms yet"}</Text>
            <Text style={styles.emptyText}>
              Open a room from Search and choose Save room locally.
            </Text>
          </View>
        )}
      </Screen>

      <ConfirmationDialog
        visible={Boolean(roomToDelete)}
        title="Remove this saved room?"
        description={
          roomToDelete
            ? `${roomToDelete.name} and its personal note will be deleted from this device.`
            : ""
        }
        confirmLabel="Remove saved room"
        cancelLabel="Keep room"
        tone="danger"
        loading={deleteSavedRoom.isPending}
        error={deleteSavedRoom.error}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: Spacing.md },
  search: { backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  cardHeader: { flexDirection: "row", gap: Spacing.md },
  flex: { flex: 1 },
  code: { ...Typography.overline, color: Colors.primary },
  title: { ...Typography.title, color: Colors.text },
  capacity: { ...Typography.label, color: Colors.primary },
  location: { ...Typography.body, color: Colors.textMuted },
  noteBox: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  noteLabel: { ...Typography.label, color: Colors.textMuted },
  note: { ...Typography.body, color: Colors.text },
  editor: { gap: Spacing.sm },
  counter: { ...Typography.caption, color: Colors.textMuted, textAlign: "right" },
  actions: { flexDirection: "row", gap: Spacing.sm },
  action: { flex: 1 },
  empty: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyTitle: { ...Typography.title, color: Colors.text },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: "center" },
});
