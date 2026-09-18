import { StyleSheet, Text, View } from "react-native";
import { ApiClientError } from "@/lib/api";
import { Colors, Radius, Spacing } from "@/constants/theme";

export function StatusMessage({ error }: { error: unknown }) {
  const message =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

export function OfflineBanner({ updatedAt }: { updatedAt?: string | null }) {
  return (
    <View style={styles.offline}>
      <Text style={styles.offlineText}>
        Offline data
        {updatedAt
          ? ` · last updated ${new Date(updatedAt).toLocaleString()}`
          : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dangerSurface,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  text: { color: Colors.danger, lineHeight: 20 },
  offline: {
    backgroundColor: Colors.warningSurface,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  offlineText: { color: Colors.warning, fontWeight: "600" },
});
