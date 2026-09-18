import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

type Picker = "date" | "start" | "end" | null;

export function DateTimeControls({
  date,
  startsAt,
  endsAt,
  onDateChange,
  onStartChange,
  onEndChange,
}: {
  date: Date;
  startsAt: Date;
  endsAt: Date;
  onDateChange: (value: Date) => void;
  onStartChange: (value: Date) => void;
  onEndChange: (value: Date) => void;
}) {
  const [picker, setPicker] = useState<Picker>(null);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    const current = picker;
    setPicker(null);
    if (event.type === "dismissed" || !selected || !current) return;
    if (current === "date") onDateChange(selected);
    if (current === "start") onStartChange(selected);
    if (current === "end") onEndChange(selected);
  };

  return (
    <View style={styles.group}>
      <PickerButton
        label="Date"
        value={date.toLocaleDateString()}
        onPress={() => setPicker("date")}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <PickerButton
            label="Start time"
            value={startsAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            onPress={() => setPicker("start")}
          />
        </View>
        <View style={styles.flex}>
          <PickerButton
            label="End time"
            value={endsAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            onPress={() => setPicker("end")}
          />
        </View>
      </View>
      {picker ? (
        <DateTimePicker
          value={
            picker === "date" ? date : picker === "start" ? startsAt : endsAt
          }
          mode={picker === "date" ? "date" : "time"}
          display="default"
          minimumDate={picker === "date" ? new Date() : undefined}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

function PickerButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.button}
      >
        <Text style={styles.value}>{value}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.md },
  row: { flexDirection: "row", gap: Spacing.md },
  flex: { flex: 1 },
  field: { gap: Spacing.xs },
  label: { color: Colors.text, fontWeight: "600", fontSize: 14 },
  button: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  value: { color: Colors.text, fontSize: 16 },
});
