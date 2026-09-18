import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";
import type { Room } from "@/types/domain";

export function RoomCard({
  room,
  onPress,
}: {
  room: Room;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, capacity ${room.capacity}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text style={styles.code}>{room.code}</Text>
          <Text style={styles.title}>{room.name}</Text>
        </View>
        <Text style={styles.capacity}>{room.capacity} seats</Text>
      </View>
      <Text style={styles.location}>{room.location}</Text>
      <View style={styles.facilities}>
        {room.facilities.map((facility) => (
          <Text key={facility.id} style={styles.chip}>
            {facility.name}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.78 },
  titleRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  code: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  title: { color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 2 },
  capacity: { color: Colors.accent, fontWeight: "700" },
  location: { color: Colors.textMuted },
  facilities: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    color: Colors.text,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    fontSize: 12,
  },
});
