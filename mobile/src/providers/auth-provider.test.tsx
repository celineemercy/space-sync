import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { AuthProvider, useAuth } from "./auth-provider";
import { apiRequest } from "@/lib/api";
import { clearSession } from "@/storage/session";
import { clearReminders } from "@/features/reminders/reminders";
import { clearCachedAvailability, clearCachedReservations } from "@/storage/database";
import { registerDecisionPush, removeDecisionPush } from "@/features/notifications/decision-push";

const mockClear = jest.fn();
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: mockClear }) }));
jest.mock("@/storage/session", () => ({
  loadSession: jest.fn().mockResolvedValue({ accessToken: "expired", user: { id: "a", email: "a@example.test" } }),
  saveSession: jest.fn(), clearSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/features/reminders/reminders", () => ({ clearReminders: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/features/notifications/decision-push", () => ({ registerDecisionPush: jest.fn().mockResolvedValue(null), removeDecisionPush: jest.fn(), watchDecisionPushTokens: () => () => {} }));
jest.mock("@/storage/database", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  clearCachedAvailability: jest.fn().mockResolvedValue(undefined), clearCachedReservations: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/features/auth/repository", () => ({ authRepository: { signIn: jest.fn().mockResolvedValue({ accessToken: "b-token", user: { id: "b", email: "b@example.test" } }) } }));

function Session() {
  const auth = useAuth();
  return <><Text>{auth.user?.email ?? "signed out"}</Text><Pressable accessibilityLabel="logout" onPress={() => void auth.signOut()} /><Pressable accessibilityLabel="login B" onPress={() => void auth.signIn("b@example.test", "password")} /></>;
}
const originalFetch = globalThis.fetch;
beforeEach(() => { jest.clearAllMocks(); process.env.EXPO_PUBLIC_API_URL = "http://localhost/api/v1"; });
afterEach(() => { globalThis.fetch = originalFetch; });

it("clears reminders during HTTP 401 auto-logout even if session deletion fails", async () => {
  jest.mocked(clearSession).mockRejectedValueOnce(new Error("storage failed"));
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ code: "UNAUTHORIZED" }) });
  const screen = await render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("a@example.test")).toBeTruthy());
  await act(async () => { await expect(apiRequest("/rooms", {}, "expired")).rejects.toMatchObject({ statusCode: 401 }); });
  expect(screen.getByText("signed out")).toBeTruthy();
  expect(clearReminders).toHaveBeenCalledTimes(1);
  expect(clearCachedReservations).toHaveBeenCalledWith("a");
  expect(clearCachedAvailability).toHaveBeenCalledWith("a");
});

it("cleans up manual logout before switching accounts", async () => {
  const screen = await render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("a@example.test")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("logout"));
  await waitFor(() => expect(clearReminders).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByLabelText("login B"));
  await waitFor(() => expect(screen.getByText("b@example.test")).toBeTruthy());
  expect(mockClear).toHaveBeenCalledTimes(1);
});

it("deregisters the current device token on logout", async () => {
  jest.mocked(registerDecisionPush).mockResolvedValueOnce("ExponentPushToken[test]");
  const screen = await render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("a@example.test")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("logout"));
  await waitFor(() => expect(removeDecisionPush).toHaveBeenCalledWith("expired", "ExponentPushToken[test]"));
});

it("removes a registration that finishes after logout", async () => {
  let finish!: (token: string) => void;
  jest.mocked(registerDecisionPush).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const screen = await render(<AuthProvider><Session /></AuthProvider>);
  await waitFor(() => expect(screen.getByText("a@example.test")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("logout"));
  await act(async () => finish("ExponentPushToken[late]"));
  await waitFor(() => expect(removeDecisionPush).toHaveBeenCalledWith("expired", "ExponentPushToken[late]"));
});

