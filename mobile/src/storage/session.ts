import * as SecureStore from "expo-secure-store";
import type { User } from "@/types/domain";

const TOKEN_KEY = "campus-space.access-token";
const USER_KEY = "campus-space.user";

export async function saveSession(accessToken: string, user: User) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

export async function loadSession(): Promise<{
  accessToken: string;
  user: User;
} | null> {
  const [accessToken, serializedUser] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
  ]);
  if (!accessToken || !serializedUser) return null;

  try {
    return { accessToken, user: JSON.parse(serializedUser) as User };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
