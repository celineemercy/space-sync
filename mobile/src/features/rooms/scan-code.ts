import type { Room } from "@/types/domain";

export function scannedRoomCode(data: string): string | null {
  const code = data.trim().replace(/^space-sync:room:/i, "").toUpperCase();
  return /^[A-Z0-9-]{2,24}$/.test(code) ? code : null;
}

export function findScannedRoom(data: string, rooms: Room[]): Room | null {
  const code = scannedRoomCode(data);
  if (!code) return null;
  return rooms.find((room) => room.code.toUpperCase() === code) ?? null;
}

export async function resolveScannedRoom(data: string, rooms: Room[], refresh: () => Promise<Room[]>): Promise<Room | null> {
  if (!scannedRoomCode(data)) return null;
  const cached = findScannedRoom(data, rooms);
  if (cached) return cached;
  return findScannedRoom(data, await refresh());
}
