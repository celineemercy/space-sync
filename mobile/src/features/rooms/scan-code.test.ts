import { findScannedRoom } from "@/features/rooms/scan-code";
import type { Room } from "@/types/domain";

const room: Room = {
  id: "room-a101", code: "A-101", name: "Discussion Room", location: "Building A",
  capacity: 6, description: null, facilities: [],
};

describe("room QR lookup", () => {
  it("finds a room from its label code or CampusSpace QR payload", () => {
    expect(findScannedRoom("a-101", [room])).toBe(room);
    expect(findScannedRoom("campusspace:room:A-101", [room])).toBe(room);
  });

  it("rejects unknown and unrelated QR payloads", () => {
    expect(findScannedRoom("campusspace:room:B-999", [room])).toBeNull();
    expect(findScannedRoom("https://unrelated.example/a-101", [room])).toBeNull();
  });
});
