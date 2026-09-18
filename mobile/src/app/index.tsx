import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function IndexRoute() {
  const { accessToken, isRestoring } = useAuth();
  if (isRestoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }
  return (
    <Redirect href={accessToken ? "/(app)/(tabs)/search" : "/(auth)/login"} />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
