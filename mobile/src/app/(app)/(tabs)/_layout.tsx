import { Tabs } from "expo-router";
import { Colors, Fonts } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: Fonts.semiBold },
        headerShadowVisible: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: Fonts.medium },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{ title: "Find a room", tabBarLabel: "Search" }}
      />
      <Tabs.Screen
        name="reservations"
        options={{ title: "My Reservations", tabBarLabel: "Reservations" }}
      />
    </Tabs>
  );
}
