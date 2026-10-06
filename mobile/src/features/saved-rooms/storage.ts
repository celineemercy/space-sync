import * as SQLite from "expo-sqlite";
import type {
  CreateSavedRoomInput,
  SavedRoom,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";

const databasePromise = SQLite.openDatabaseAsync("campus-space.db");
let initializationPromise: Promise<void> | null = null;

type SavedRoomRow = {
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
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS saved_rooms (
        id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT UNIQUE NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        note TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  })();
  return initializationPromise;
}

export async function readSavedRooms(): Promise<SavedRoom[]> {
  await ensureTable();
  const database = await databasePromise;
  const rows = await database.getAllAsync<SavedRoomRow>(
    "SELECT * FROM saved_rooms ORDER BY updated_at DESC",
  );
  return rows.map(toModel);
}

export async function insertSavedRoom({
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

  await database.runAsync(
    `INSERT INTO saved_rooms
      (id, room_id, code, name, location, capacity, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    savedRoom.id,
    savedRoom.roomId,
    savedRoom.code,
    savedRoom.name,
    savedRoom.location,
    savedRoom.capacity,
    savedRoom.note,
    savedRoom.createdAt,
    savedRoom.updatedAt,
  );
  return savedRoom;
}

export async function updateSavedRoom({
  id,
  note,
}: UpdateSavedRoomInput): Promise<SavedRoom> {
  await ensureTable();
  const database = await databasePromise;
  const updatedAt = new Date().toISOString();
  const result = await database.runAsync(
    "UPDATE saved_rooms SET note = ?, updated_at = ? WHERE id = ?",
    note,
    updatedAt,
    id,
  );
  if (!result.changes) throw new Error("Saved room was not found.");

  const row = await database.getFirstAsync<SavedRoomRow>(
    "SELECT * FROM saved_rooms WHERE id = ?",
    id,
  );
  if (!row) throw new Error("Saved room was not found.");
  return toModel(row);
}

export async function removeSavedRoom(id: string): Promise<void> {
  await ensureTable();
  const database = await databasePromise;
  const result = await database.runAsync(
    "DELETE FROM saved_rooms WHERE id = ?",
    id,
  );
  if (!result.changes) throw new Error("Saved room was not found.");
}
