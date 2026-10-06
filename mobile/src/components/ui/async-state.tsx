import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { StatusMessage } from "@/components/ui/status-message";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.loading}
      testID="loading-state"
    >
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
  retrying = false,
}: {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.error} testID="error-state">
      <StatusMessage error={error} />
      <AppButton
        label="Try again"
        loading={retrying}
        onPress={onRetry}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  loadingText: { ...Typography.body, color: Colors.textMuted },
  error: { gap: Spacing.md },
});
