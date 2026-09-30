import type { User } from "@/types/domain";

const TOKEN_KEY = "campus-space.access-token";
const USER_KEY = "campus-space.user";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export async function saveSession(accessToken: string, user: User) {
  const localStorage = storage();
  localStorage?.setItem(TOKEN_KEY, accessToken);
  localStorage?.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{
  accessToken: string;
  user: User;
} | null> {
  const localStorage = storage();
  const accessToken = localStorage?.getItem(TOKEN_KEY);
  const serializedUser = localStorage?.getItem(USER_KEY);
  if (!accessToken || !serializedUser) return null;

  try {
    return { accessToken, user: JSON.parse(serializedUser) as User };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  const localStorage = storage();
  localStorage?.removeItem(TOKEN_KEY);
  localStorage?.removeItem(USER_KEY);
}
