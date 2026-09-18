import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function AppButton({
  label,
  loading,
  variant = "primary",
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#FFFFFF" : Colors.primary}
        />
      ) : (
        <Text
          style={[styles.label, variant !== "primary" && styles.secondaryLabel]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderColor: Colors.border },
  danger: {
    backgroundColor: Colors.dangerSurface,
    borderColor: Colors.dangerSurface,
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryLabel: { color: Colors.text },
});
