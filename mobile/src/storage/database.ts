import * as SQLite from "expo-sqlite";
import type { Facility, Reservation, Room } from "@/types/domain";

const databasePromise = SQLite.openDatabaseAsync("campus-space.db");

export async function initializeDatabase() {
  const database = await databasePromise;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS cached_rooms (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_facilities (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cached_room_facilities (
      room_id TEXT NOT NULL,
      facility_id TEXT NOT NULL,
      PRIMARY KEY (room_id, facility_id),
      FOREIGN KEY (room_id) REFERENCES cached_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (facility_id) REFERENCES cached_facilities(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS cached_reservations (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id)
    );
    CREATE TABLE IF NOT EXISTS cache_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    PRAGMA user_version = 1;
  `);
}

export async function cacheRooms(rooms: Room[]) {
  const database = await databasePromise;
  const updatedAt = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM cached_room_facilities");
    await database.runAsync("DELETE FROM cached_facilities");
    await database.runAsync("DELETE FROM cached_rooms");

    const facilities = new Map<string, Facility>();
    for (const room of rooms) {
      await database.runAsync(
        `INSERT INTO cached_rooms (id, code, name, location, capacity, description, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        room.id,
        room.code,
        room.name,
        room.location,
        room.capacity,
        room.description,
        updatedAt,
      );
      for (const facility of room.facilities)
        facilities.set(facility.id, facility);
    }

    for (const facility of facilities.values()) {
      await database.runAsync(
        "INSERT INTO cached_facilities (id, name) VALUES (?, ?)",
        facility.id,
        facility.name,
      );
    }
    for (const room of rooms) {
      for (const facility of room.facilities) {
        await database.runAsync(
          "INSERT INTO cached_room_facilities (room_id, facility_id) VALUES (?, ?)",
          room.id,
          facility.id,
        );
      }
    }
    await database.runAsync(
      `INSERT OR REPLACE INTO cache_metadata (key, value) VALUES ('rooms_updated_at', ?)`,
      updatedAt,
    );
  });
}

type CachedRoomRow = Omit<Room, "facilities"> & { updated_at: string };
type CachedFacilityRow = Facility & { room_id: string };

export async function getCachedRooms(): Promise<{
  rooms: Room[];
  updatedAt: string | null;
}> {
  const database = await databasePromise;
  const [roomRows, facilityRows, metadata] = await Promise.all([
    database.getAllAsync<CachedRoomRow>(
      "SELECT * FROM cached_rooms ORDER BY code",
    ),
    database.getAllAsync<CachedFacilityRow>(
      `SELECT rf.room_id, f.id, f.name
       FROM cached_room_facilities rf
       JOIN cached_facilities f ON f.id = rf.facility_id
       ORDER BY f.name`,
    ),
    database.getFirstAsync<{ value: string }>(
      `SELECT value FROM cache_metadata WHERE key = 'rooms_updated_at'`,
    ),
  ]);

  const facilitiesByRoom = new Map<string, Facility[]>();
  for (const row of facilityRows) {
    const current = facilitiesByRoom.get(row.room_id) ?? [];
    current.push({ id: row.id, name: row.name });
    facilitiesByRoom.set(row.room_id, current);
  }

  return {
    rooms: roomRows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      location: row.location,
      capacity: row.capacity,
      description: row.description,
      facilities: facilitiesByRoom.get(row.id) ?? [],
    })),
    updatedAt: metadata?.value ?? null,
  };
}

export async function cacheReservations(
  userId: string,
  reservations: Reservation[],
) {
  const database = await databasePromise;
  const updatedAt = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM cached_reservations WHERE user_id = ?",
      userId,
    );
    for (const reservation of reservations) {
      await database.runAsync(
        `INSERT INTO cached_reservations (id, user_id, payload, updated_at) VALUES (?, ?, ?, ?)`,
        reservation.id,
        userId,
        JSON.stringify(reservation),
        updatedAt,
      );
    }
    await database.runAsync(
      "INSERT OR REPLACE INTO cache_metadata (key, value) VALUES (?, ?)",
      `reservations_updated_at:${userId}`,
      updatedAt,
    );
  });
}

export async function getCachedReservations(
  userId: string,
): Promise<{ reservations: Reservation[]; updatedAt: string | null }> {
  const database = await databasePromise;
  const [rows, metadata] = await Promise.all([
    database.getAllAsync<{ payload: string }>(
      "SELECT payload FROM cached_reservations WHERE user_id = ? ORDER BY updated_at DESC",
      userId,
    ),
    database.getFirstAsync<{ value: string }>(
      "SELECT value FROM cache_metadata WHERE key = ?",
      `reservations_updated_at:${userId}`,
    ),
  ]);
  return {
    reservations: rows.flatMap((row) => {
      try {
        return [JSON.parse(row.payload) as Reservation];
      } catch {
        return [];
      }
    }),
    updatedAt: metadata?.value ?? null,
  };
}

export async function clearCachedReservations(userId: string) {
  const database = await databasePromise;
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "DELETE FROM cached_reservations WHERE user_id = ?",
      userId,
    );
    await database.runAsync(
      "DELETE FROM cache_metadata WHERE key = ?",
      `reservations_updated_at:${userId}`,
    );
  });
}
