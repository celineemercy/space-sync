import { reservationsRepository } from "./repository";

jest.mock("@/storage/database", () => ({
  cacheReservations: jest.fn(),
  getCachedReservations: jest.fn(),
}));

it("submits a permission document with the reservation request", async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.test/api/v1";
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "request-1", status: "PENDING" }) });
  globalThis.fetch = fetchMock;
  await reservationsRepository.create({
    roomId: "room-1",
    startsAt: "2030-01-01T09:00:00.000Z",
    endsAt: "2030-01-01T10:00:00.000Z",
    document: { uri: "file:///permission.pdf", name: "permission.pdf", mimeType: "application/pdf" },
  }, "test-token");
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.example.test/api/v1/reservations");
  expect(options.body).toBeInstanceOf(FormData);
  expect(options.headers["Content-Type"]).toBeUndefined();
  expect(options.headers.Authorization).toBe("Bearer test-token");
});
