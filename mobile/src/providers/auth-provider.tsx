import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest, setUnauthorizedHandler } from "@/lib/api";
import {
  clearCachedReservations,
  initializeDatabase,
} from "@/storage/database";
import { clearSession, loadSession, saveSession } from "@/storage/session";
import type { LoginResponse, User } from "@/types/domain";

type AuthContextValue = {
  accessToken: string | null;
  user: User | null;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const signOut = useCallback(async () => {
    const userId = user?.id;
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
    await clearSession();
    if (userId) await clearCachedReservations(userId);
  }, [queryClient, user?.id]);

  useEffect(() => {
    let active = true;
    Promise.all([initializeDatabase(), loadSession()])
      .then(([, session]) => {
        if (!active || !session) return;
        setAccessToken(session.accessToken);
        setUser(session.user);
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(accessToken ? signOut : undefined);
    return () => setUnauthorizedHandler(undefined);
  }, [accessToken, signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await saveSession(session.accessToken, session.user);
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const value = useMemo(
    () => ({ accessToken, user, isRestoring, signIn, signOut }),
    [accessToken, user, isRestoring, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
