import * as Notifications from "expo-notifications";
import { apiRequest } from "@/lib/api";
import { registerDecisionPush, removeDecisionPush } from "./decision-push";
let mockEnvironment = "standalone";
jest.mock("expo-constants", () => ({ __esModule: true, default: { get executionEnvironment() { return mockEnvironment; }, expoConfig: { extra: { eas: { projectId: "project" } } } }, ExecutionEnvironment: { StoreClient: "storeClient" } }));
jest.mock("expo-notifications", () => ({ getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn(), setNotificationChannelAsync: jest.fn(), AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 }, addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })) }));
jest.mock("@/lib/api", () => ({ apiRequest: jest.fn().mockResolvedValue({ registered: true }) }));
const originalFetch = globalThis.fetch;
beforeEach(() => { jest.clearAllMocks(); mockEnvironment = "standalone"; jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never); jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ data: "ExponentPushToken[test]" } as never); });
afterEach(() => { globalThis.fetch = originalFetch; });
it("registers the Expo token against the current authenticated session", async () => {
  await expect(registerDecisionPush("session")).resolves.toBe("ExponentPushToken[test]");
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "project" });
  expect(apiRequest).toHaveBeenCalledWith("/auth/push-token", { method: "POST", body: JSON.stringify({ token: "ExponentPushToken[test]" }) }, "session");
});
it("does not register after denied permission or inside Expo Go", async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never);
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await expect(registerDecisionPush("session")).resolves.toBeNull();
  mockEnvironment = "storeClient";
  await expect(registerDecisionPush("session")).resolves.toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("does not post a token if logout occurs while obtaining it", async () => {
  let active = true;
  jest.mocked(Notifications.getExpoPushTokenAsync).mockImplementationOnce(async () => { active = false; return { data: "ExponentPushToken[test]" } as never; });
  await expect(registerDecisionPush("session", () => active)).resolves.toBeNull();
  expect(apiRequest).not.toHaveBeenCalled();
});
it("deregisters without invoking the global HTTP 401 sign-out handler again", async () => {
  process.env.EXPO_PUBLIC_API_URL = "http://localhost/api/v1";
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  await expect(removeDecisionPush("expired", "ExponentPushToken[test]")).resolves.toBeUndefined();
  expect(globalThis.fetch).toHaveBeenCalledWith("http://localhost/api/v1/auth/push-token", expect.objectContaining({ method: "DELETE" }));
  expect(apiRequest).not.toHaveBeenCalled();
});
