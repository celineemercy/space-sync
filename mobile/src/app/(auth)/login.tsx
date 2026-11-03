import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/screen";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>CS</Text>
        </View>
        <Text style={styles.title}>CampusSpace</Text>
        <Text style={styles.subtitle}>
          Find and reserve the right campus room.
        </Text>
      </View>

      <LoginForm onSuccess={() => router.replace("/(app)/(tabs)/search")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    maxWidth: 520,
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  hero: { alignItems: "center", gap: Spacing.sm },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { ...Typography.headline, color: "#FFFFFF" },
  title: { ...Typography.display, color: Colors.text },
  subtitle: {
    color: Colors.textMuted,
    textAlign: "center",
    ...Typography.body,
  },
});
