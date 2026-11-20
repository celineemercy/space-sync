import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function AuthLayout() {
  const { accessToken, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (accessToken) return <Redirect href="/(app)/(tabs)/search" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
