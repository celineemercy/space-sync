import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { AppButton } from "@/components/ui/app-button";

type Props = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = "Not now",
  tone = "default",
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const danger = tone === "danger";

  return (
    <Modal
      animationType="fade"
      onRequestClose={loading ? undefined : onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close confirmation"
          accessibilityRole="button"
          disabled={loading}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.card}>
          <View
            style={[
              styles.iconContainer,
              danger && styles.dangerIconContainer,
            ]}
          >
            <Ionicons
              color={danger ? Colors.danger : Colors.primary}
              name={danger ? "alert-circle" : "checkmark-circle"}
              size={30}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          <View style={styles.actions}>
            <AppButton
              disabled={loading}
              label={cancelLabel}
              onPress={onClose}
              style={styles.action}
              variant="secondary"
            />
            <AppButton
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              style={styles.action}
              variant={danger ? "danger" : "primary"}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: "rgba(12, 24, 17, 0.58)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    gap: Spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    backgroundColor: Colors.successSurface,
  },
  dangerIconContainer: { backgroundColor: Colors.dangerSurface },
  copy: { gap: Spacing.sm },
  title: { ...Typography.headline, color: Colors.text },
  description: { ...Typography.body, color: Colors.textMuted },
  actions: { flexDirection: "row", gap: Spacing.md },
  action: { flex: 1 },
});
