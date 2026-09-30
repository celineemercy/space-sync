import type { ChangeEvent, CSSProperties } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";

type Props = {
  date: Date;
  startsAt: Date;
  endsAt: Date;
  onDateChange: (value: Date) => void;
  onStartChange: (value: Date) => void;
  onEndChange: (value: Date) => void;
};

function dateValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeValue(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function withDate(current: Date, value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(current);
  next.setFullYear(year, month - 1, day);
  return next;
}

function withTime(current: Date, value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const next = new Date(current);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function DateTimeControls({
  date,
  startsAt,
  endsAt,
  onDateChange,
  onStartChange,
  onEndChange,
}: Props) {
  return (
    <View style={styles.group}>
      <WebPicker
        label="Date"
        type="date"
        value={dateValue(date)}
        min={dateValue(new Date())}
        onChange={(event) => onDateChange(withDate(date, event.target.value))}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <WebPicker
            label="Start time"
            type="time"
            value={timeValue(startsAt)}
            onChange={(event) =>
              onStartChange(withTime(startsAt, event.target.value))
            }
          />
        </View>
        <View style={styles.flex}>
          <WebPicker
            label="End time"
            type="time"
            value={timeValue(endsAt)}
            onChange={(event) => onEndChange(withTime(endsAt, event.target.value))}
          />
        </View>
      </View>
    </View>
  );
}

function WebPicker({
  label,
  type,
  value,
  min,
  onChange,
}: {
  label: string;
  type: "date" | "time";
  value: string;
  min?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <input
        aria-label={label}
        type={type}
        value={value}
        min={min}
        onChange={onChange}
        style={inputStyle}
      />
    </View>
  );
}

const inputStyle: CSSProperties = {
  minHeight: 48,
  boxSizing: "border-box",
  width: "100%",
  padding: `0 ${Spacing.md}px`,
  border: `1px solid ${Colors.border}`,
  borderRadius: 12,
  background: Colors.surface,
  color: Colors.text,
  fontSize: 16,
  fontFamily: Fonts.regular,
};

const styles = StyleSheet.create({
  group: { gap: Spacing.md },
  row: { flexDirection: "row", gap: Spacing.md },
  flex: { flex: 1 },
  field: { gap: Spacing.xs },
  label: { color: Colors.text, fontFamily: Fonts.semiBold, fontSize: 14 },
});
