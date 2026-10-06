import type {
  CreateSavedRoomInput,
  SavedRoom,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";

const STORAGE_KEY = "campus-space.saved-rooms.v1";

function localStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function read(): SavedRoom[] {
  const value = localStorage()?.getItem(STORAGE_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as SavedRoom[]) : [];
  } catch {
    return [];
  }
}

function write(savedRooms: SavedRoom[]) {
  localStorage()?.setItem(STORAGE_KEY, JSON.stringify(savedRooms));
}

export async function readSavedRooms(): Promise<SavedRoom[]> {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function insertSavedRoom({
  room,
  note = "",
}: CreateSavedRoomInput): Promise<SavedRoom> {
  const savedRooms = read();
  if (savedRooms.some((item) => item.roomId === room.id)) {
    throw new Error("Room is already saved.");
  }
  const timestamp = new Date().toISOString();
  const savedRoom: SavedRoom = {
    id: room.id,
    roomId: room.id,
    code: room.code,
    name: room.name,
    location: room.location,
    capacity: room.capacity,
    note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  write([savedRoom, ...savedRooms]);
  return savedRoom;
}

export async function updateSavedRoom({
  id,
  note,
}: UpdateSavedRoomInput): Promise<SavedRoom> {
  const savedRooms = read();
  const index = savedRooms.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Saved room was not found.");

  const updated = {
    ...savedRooms[index],
    note,
    updatedAt: new Date().toISOString(),
  };
  savedRooms[index] = updated;
  write(savedRooms);
  return updated;
}

export async function removeSavedRoom(id: string): Promise<void> {
  const savedRooms = read();
  const remaining = savedRooms.filter((item) => item.id !== id);
  if (remaining.length === savedRooms.length) {
    throw new Error("Saved room was not found.");
  }
  write(remaining);
}
