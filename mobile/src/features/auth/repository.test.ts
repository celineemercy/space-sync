import { authRepository } from "@/features/auth/repository";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.test/api/v1";
});

it("sends login credentials to the auth endpoint and returns the session", async () => {
  const session = {
    accessToken: "test-token",
    user: { id: "student-1", email: "student@example.test" },
  };
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(session),
  });

  await expect(
    authRepository.signIn({ email: "student@example.test", password: "password123" }),
  ).resolves.toEqual(session);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://api.example.test/api/v1/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "student@example.test", password: "password123" }),
    }),
  );
});
