import { parseRoom, roomSchema } from "@/features/rooms/model";
import { roomsRepository } from "@/features/rooms/repository";
import { ApiClientError } from "@/lib/api";
import type { Room } from "@/types/domain";

jest.mock("@/storage/database", () => ({
  cacheRooms: jest.fn(),
  getCachedRooms: jest.fn(),
}));

const room: Room = {
  id: "room-1",
  code: "A1",
  name: "Study Room",
  location: "Main building",
  capacity: 8,
  description: null,
  facilities: [{ id: "projector", name: "Projector" }],
};

const searchInput = {
  startsAt: "2030-01-01T09:00:00.000Z",
  endsAt: "2030-01-01T10:00:00.000Z",
  minCapacity: 4,
  facilityIds: ["projector"],
};

const fetchMock = jest.fn();

function mockResponse(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.test/api/v1";
});

describe("room model and API repository", () => {
  it("accepts a valid room model", () => {
    expect(parseRoom(room)).toEqual(room);
  });

  it("rejects an invalid room model", () => {
    expect(roomSchema.safeParse({ ...room, capacity: -1 }).success).toBe(false);
    expect(() => parseRoom({ ...room, capacity: -1 })).toThrow(ApiClientError);
  });

  it("loads rooms successfully from the API with the access token", async () => {
    mockResponse(200, [room]);

    await expect(roomsRepository.fetchAll("test-token")).resolves.toEqual([room]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/rooms",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("accepts an empty availability result from the API", async () => {
    mockResponse(200, { ...searchInput, rooms: [] });

    await expect(roomsRepository.searchAvailability(searchInput)).resolves.toEqual({
      startsAt: searchInput.startsAt,
      endsAt: searchInput.endsAt,
      rooms: [],
    });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/rooms/availability?startsAt=",
    );
    expect(fetchMock.mock.calls[0][0]).toContain("minCapacity=4");
    expect(fetchMock.mock.calls[0][0]).toContain("facilityIds=projector");
  });

  it("surfaces HTTP failure from the API", async () => {
    mockResponse(503, { code: "SERVICE_UNAVAILABLE", message: "Try later." });

    await expect(roomsRepository.fetchAll()).rejects.toMatchObject({
      statusCode: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Try later.",
    });
  });

  it("rejects broken JSON from a successful API response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    });

    await expect(roomsRepository.fetchAll()).rejects.toMatchObject({
      code: "INVALID_JSON",
      statusCode: 200,
    });
  });
});
