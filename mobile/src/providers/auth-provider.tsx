import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { setUnauthorizedHandler } from "@/lib/api";
import { logRuntime } from "@/lib/runtime-log";
import { authRepository } from "@/features/auth/repository";
import { clearReminders } from "@/features/reminders/reminders";
import { registerDecisionPush, removeDecisionPush, watchDecisionPushTokens } from "@/features/notifications/decision-push";
import {
  clearCachedReservations,
  clearCachedAvailability,
  initializeDatabase,
} from "@/storage/database";
import { clearSession, loadSession, saveSession } from "@/storage/session";
import type { User } from "@/types/domain";

type AuthContextValue = {
  accessToken: string | null;
  user: User | null;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const pushRegistration = useRef<{ token: string; session: string } | null>(null);
  const sessionGeneration = useRef(0);

  const signOut = useCallback(async () => {
    sessionGeneration.current += 1;
    const userId = user?.id;
    const registration = pushRegistration.current;
    pushRegistration.current = null;
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
    const cleanup = [
      { name: "session", run: () => clearSession() },
      { name: "reminders", run: () => clearReminders() },
      ...(registration ? [{ name: "push", run: () => removeDecisionPush(registration.session, registration.token) }] : []),
      ...(userId ? [
        { name: "reservations", run: () => clearCachedReservations(userId) },
        { name: "availability", run: () => clearCachedAvailability(userId) },
      ] : []),
    ];
    await Promise.all(cleanup.map(async ({ name, run }) => {
      try { await run(); }
      catch { logRuntime("warn", "signout_cleanup_failed", { resource: name }); }
    }));
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!accessToken || !user || user.role === "ADMIN") return;
    let active = true;
    const generation = sessionGeneration.current;
    const isCurrent = () => active && generation === sessionGeneration.current;
    let pending = false;
    const register = async () => {
      if (pending) return;
      pending = true;
      try {
        const token = await registerDecisionPush(accessToken, isCurrent);
        if (token && isCurrent()) pushRegistration.current = { token, session: accessToken };
        else if (token) await removeDecisionPush(accessToken, token);
      } catch { logRuntime("warn", "push_registration_failed"); }
      finally { pending = false; }
    };
    void register();
    const unsubscribe = watchDecisionPushTokens(() => void register());
    return () => { active = false; unsubscribe(); };
  }, [accessToken, user]);

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
    const session = await authRepository.signIn({ email, password });
    await saveSession(session.accessToken, session.user);
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
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
