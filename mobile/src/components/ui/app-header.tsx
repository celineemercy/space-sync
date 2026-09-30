import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";

type Props = {
  title: string;
  description: string;
  accountLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AppHeader({
  title,
  description,
  accountLabel,
  actionLabel,
  onAction,
}: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="business" color={Colors.primary} size={18} />
            </View>
            <Text style={styles.brandName}>CampusSpace</Text>
          </View>
          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              onPress={onAction}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
            >
              <Ionicons name="log-out-outline" color="#FFFFFF" size={18} />
              <Text style={styles.actionLabel}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {accountLabel ? (
          <View style={styles.account}>
            <Ionicons name="person-circle-outline" color="#D8EADF" size={18} />
            <Text numberOfLines={1} style={styles.accountLabel}>
              {accountLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  brandName: { ...Typography.bodyStrong, color: "#FFFFFF" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  actionPressed: { opacity: 0.72 },
  actionLabel: { ...Typography.label, color: "#FFFFFF" },
  copy: { gap: Spacing.xs },
  title: { ...Typography.display, color: "#FFFFFF" },
  description: { ...Typography.body, color: "#D8EADF", maxWidth: 340 },
  account: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  accountLabel: { ...Typography.caption, color: "#FFFFFF", flexShrink: 1 },
});
