import { useId } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = TextInputProps & { label: string; error?: string };

export function FormField({ label, error, style, ...props }: Props) {
  const errorId = `${useId()}-error`;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    ...Typography.body,
  },
  inputError: { borderColor: Colors.danger },
  error: { ...Typography.caption, color: Colors.danger },
});
