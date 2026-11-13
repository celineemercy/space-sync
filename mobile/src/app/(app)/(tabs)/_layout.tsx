import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function TabsLayout() {
  const { user } = useAuth();
  if (user?.role === "ADMIN") return <Redirect href="/(app)/admin" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { ...Typography.caption, lineHeight: 18 },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          minHeight: 64,
          paddingTop: Spacing.xs,
          paddingBottom: Spacing.sm,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: "Find a room",
          tabBarLabel: "Search",
          tabBarAccessibilityLabel: "Search rooms",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved Rooms",
          tabBarLabel: "Saved",
          tabBarAccessibilityLabel: "Saved rooms",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "My Reservations",
          tabBarLabel: "Reservations",
          tabBarAccessibilityLabel: "My reservations",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
