import type {
  CreateSavedRoomInput,
  SavedRoom,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";

const storageKey = (userId: string) => `space-sync.saved-rooms.v2:${userId}`;

function localStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function read(userId: string): SavedRoom[] {
  // Legacy records have no owner and must not be assigned to the next sign-in.
  localStorage()?.removeItem("space-sync.saved-rooms.v1");
  const value = localStorage()?.getItem(storageKey(userId));
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as SavedRoom[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, savedRooms: SavedRoom[]) {
  localStorage()?.setItem(storageKey(userId), JSON.stringify(savedRooms));
}

export async function readSavedRooms(userId: string): Promise<SavedRoom[]> {
  return read(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function insertSavedRoom(userId: string, {
  room,
  note = "",
}: CreateSavedRoomInput): Promise<SavedRoom> {
  const savedRooms = read(userId);
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
  write(userId, [savedRoom, ...savedRooms]);
  return savedRoom;
}

export async function updateSavedRoom(userId: string, {
  id,
  note,
}: UpdateSavedRoomInput): Promise<SavedRoom> {
  const savedRooms = read(userId);
  const index = savedRooms.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Saved room was not found.");

  const updated = {
    ...savedRooms[index],
    note,
    updatedAt: new Date().toISOString(),
  };
  savedRooms[index] = updated;
  write(userId, savedRooms);
  return updated;
}

export async function removeSavedRoom(userId: string, id: string): Promise<void> {
  const savedRooms = read(userId);
  const remaining = savedRooms.filter((item) => item.id !== id);
  if (remaining.length === savedRooms.length) {
    throw new Error("Saved room was not found.");
  }
  write(userId, remaining);
}
