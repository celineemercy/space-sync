import type { Room } from "@/types/domain";

export function findScannedRoom(data: string, rooms: Room[]): Room | null {
  const code = data.trim().replace(/^campusspace:room:/i, "").toUpperCase();
  if (!/^[A-Z0-9-]{2,24}$/.test(code)) return null;
  return rooms.find((room) => room.code.toUpperCase() === code) ?? null;
}
