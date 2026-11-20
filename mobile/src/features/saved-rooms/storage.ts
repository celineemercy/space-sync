import * as SQLite from "expo-sqlite";
import type {
  CreateSavedRoomInput,
  SavedRoom,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";

const databasePromise = SQLite.openDatabaseAsync("space-sync.db");
let initializationPromise: Promise<void> | null = null;

type SavedRoomRow = {
  user_id: string;
  id: string;
  room_id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  note: string;
  created_at: string;
  updated_at: string;
};

function toModel(row: SavedRoomRow): SavedRoom {
  return {
    id: row.id,
    roomId: row.room_id,
    code: row.code,
    name: row.name,
    location: row.location,
    capacity: row.capacity,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureTable() {
  initializationPromise ??= (async () => {
    const database = await databasePromise;
    const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(saved_rooms)");
    if (columns.length && !columns.some((column) => column.name === "user_id")) {
      // Legacy rows have no owner; discard them rather than expose notes to another account.
      await database.execAsync("DROP TABLE saved_rooms");
    }
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS saved_rooms (
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, room_id)
      );
    `);
  })();
  return initializationPromise;
}

export async function readSavedRooms(userId: string): Promise<SavedRoom[]> {
  await ensureTable();
  const database = await databasePromise;
  const rows = await database.getAllAsync<SavedRoomRow>(
    "SELECT * FROM saved_rooms WHERE user_id = ? ORDER BY updated_at DESC", userId,
  );
  return rows.map(toModel);
}

export async function insertSavedRoom(userId: string, {
  room,
  note = "",
}: CreateSavedRoomInput): Promise<SavedRoom> {
  await ensureTable();
  const database = await databasePromise;
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

  const existing = await database.getFirstAsync<SavedRoomRow>(
    "SELECT * FROM saved_rooms WHERE user_id = ? AND room_id = ?", userId, room.id,
  );
  if (existing) throw new Error("Room is already saved.");

  try { await database.runAsync(
    `INSERT INTO saved_rooms
      (user_id, id, room_id, code, name, location, capacity, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    savedRoom.id,
    savedRoom.roomId,
    savedRoom.code,
    savedRoom.name,
    savedRoom.location,
    savedRoom.capacity,
    savedRoom.note,
    savedRoom.createdAt,
    savedRoom.updatedAt,
  ); } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
      throw new Error("Room is already saved.");
    }
    throw error;
  }
  return savedRoom;
}

export async function updateSavedRoom(userId: string, {
  id,
  note,
}: UpdateSavedRoomInput): Promise<SavedRoom> {
  await ensureTable();
  const database = await databasePromise;
  const updatedAt = new Date().toISOString();
  const result = await database.runAsync(
    "UPDATE saved_rooms SET note = ?, updated_at = ? WHERE user_id = ? AND id = ?",
    note,
    updatedAt,
    userId,
    id,
  );
  if (!result.changes) throw new Error("Saved room was not found.");

  const row = await database.getFirstAsync<SavedRoomRow>(
    "SELECT * FROM saved_rooms WHERE user_id = ? AND id = ?", userId, id,
  );
  if (!row) throw new Error("Saved room was not found.");
  return toModel(row);
}

export async function removeSavedRoom(userId: string, id: string): Promise<void> {
  await ensureTable();
  const database = await databasePromise;
  const result = await database.runAsync(
    "DELETE FROM saved_rooms WHERE user_id = ? AND id = ?", userId, id,
  );
  if (!result.changes) throw new Error("Saved room was not found.");
}
