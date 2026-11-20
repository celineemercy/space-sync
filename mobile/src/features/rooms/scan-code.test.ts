import { findScannedRoom, resolveScannedRoom } from "@/features/rooms/scan-code";
import type { Room } from "@/types/domain";

const room: Room = {
  id: "room-a101", code: "A-101", name: "Discussion Room", location: "Building A",
  capacity: 6, description: null, facilities: [],
};

describe("room QR lookup", () => {
  it("finds a room from its label code or space-sync QR payload", () => {
    expect(findScannedRoom("a-101", [room])).toBe(room);
    expect(findScannedRoom("space-sync:room:A-101", [room])).toBe(room);
  });

  it("rejects unknown and unrelated QR payloads", () => {
    expect(findScannedRoom("space-sync:room:B-999", [room])).toBeNull();
    expect(findScannedRoom("https://unrelated.example/a-101", [room])).toBeNull();
  });

  it("refreshes once on a cache miss and discovers a newly added room", async () => {
    const refresh = jest.fn().mockResolvedValue([room]);
    await expect(resolveScannedRoom("A-101", [], refresh)).resolves.toBe(room);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh cached matches or malformed codes", async () => {
    const refresh = jest.fn();
    await expect(resolveScannedRoom("A-101", [room], refresh)).resolves.toBe(room);
    await expect(resolveScannedRoom("https://example.com", [], refresh)).resolves.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("distinguishes fresh unknown codes from failed network refreshes", async () => {
    await expect(resolveScannedRoom("B-999", [], async () => [room])).resolves.toBeNull();
    await expect(resolveScannedRoom("A-101", [], async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  });
});
