import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function AppButton({
  label,
  loading,
  loadingLabel,
  variant = "primary",
  disabled,
  style,
  accessibilityLabel,
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
          size="small"
          style={styles.spinner}
        />
      ) : null}
      <Text
        accessibilityLiveRegion="polite"
        style={[styles.label, variant !== "primary" && styles.secondaryLabel]}
      >
        {loading ? (loadingLabel ?? `${label}...`) : label}
      </Text>
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
    flexDirection: "row",
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
  spinner: { marginRight: Spacing.sm },
  label: { ...Typography.bodyStrong, color: "#FFFFFF" },
  secondaryLabel: { color: Colors.text },
});
