import * as SecureStore from "expo-secure-store";
import { clearSession, loadSession, saveSession } from "./session";

const secureStore = jest.mocked(SecureStore);

describe("secure session storage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores the token and user separately in SecureStore", async () => {
    await saveSession("token", { id: "user-1", email: "student@example.test" });
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "campus-space.access-token",
      "token",
    );
  });

  it("restores a valid session", async () => {
    secureStore.getItemAsync
      .mockResolvedValueOnce("token")
      .mockResolvedValueOnce(
        JSON.stringify({ id: "user-1", email: "student@example.test" }),
      );
    await expect(loadSession()).resolves.toEqual({
      accessToken: "token",
      user: { id: "user-1", email: "student@example.test" },
    });
  });

  it("clears both secure values", async () => {
    await clearSession();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
