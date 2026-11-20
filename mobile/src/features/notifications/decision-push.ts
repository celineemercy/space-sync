import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/api";

export async function registerDecisionPush(accessToken: string, isCurrent = () => true): Promise<string | null> {
  if (Platform.OS === "web" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("reservation-decisions", { name: "Reservation decisions", importance: Notifications.AndroidImportance.HIGH });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) permission = await Notifications.requestPermissionsAsync();
  if ((!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) || !isCurrent()) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Expo project ID is required for push notifications.");
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!isCurrent()) return null;
  await apiRequest("/auth/push-token", { method: "POST", body: JSON.stringify({ token }) }, accessToken);
  return token;
}

export async function removeDecisionPush(accessToken: string, token: string): Promise<void> {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) return;
  // Do not use the global 401 handler while already signing out.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${base}/auth/push-token`, { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ token }), signal: controller.signal });
    if (!response.ok && response.status !== 401) throw new Error("Push deregistration failed.");
  } finally { clearTimeout(timeout); }
}

export function watchDecisionPushTokens(listener: () => void) {
  if (Platform.OS === "web" || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return () => {};
  const subscription = Notifications.addPushTokenListener(listener);
  return () => subscription.remove();
}
