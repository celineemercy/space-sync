import type { Reservation, Room } from "@/types/domain";

const ROOMS_KEY = "campus-space.cached-rooms";
const ROOMS_UPDATED_AT_KEY = "campus-space.cached-rooms-updated-at";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function reservationsKey(userId: string) {
  return `campus-space.cached-reservations:${userId}`;
}

function reservationsUpdatedAtKey(userId: string) {
  return `campus-space.cached-reservations-updated-at:${userId}`;
}

function parseArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function initializeDatabase() {}

export async function cacheRooms(rooms: Room[]) {
  const localStorage = storage();
  localStorage?.setItem(ROOMS_KEY, JSON.stringify(rooms));
  localStorage?.setItem(ROOMS_UPDATED_AT_KEY, new Date().toISOString());
}

export async function getCachedRooms(): Promise<{
  rooms: Room[];
  updatedAt: string | null;
}> {
  const localStorage = storage();
  return {
    rooms: parseArray<Room>(localStorage?.getItem(ROOMS_KEY)),
    updatedAt: localStorage?.getItem(ROOMS_UPDATED_AT_KEY) ?? null,
  };
}

export async function cacheReservations(
  userId: string,
  reservations: Reservation[],
) {
  const localStorage = storage();
  localStorage?.setItem(reservationsKey(userId), JSON.stringify(reservations));
  localStorage?.setItem(
    reservationsUpdatedAtKey(userId),
    new Date().toISOString(),
  );
}

export async function getCachedReservations(
  userId: string,
): Promise<{ reservations: Reservation[]; updatedAt: string | null }> {
  const localStorage = storage();
  return {
    reservations: parseArray<Reservation>(
      localStorage?.getItem(reservationsKey(userId)),
    ),
    updatedAt:
      localStorage?.getItem(reservationsUpdatedAtKey(userId)) ?? null,
  };
}

export async function clearCachedReservations(userId: string) {
  const localStorage = storage();
  localStorage?.removeItem(reservationsKey(userId));
  localStorage?.removeItem(reservationsUpdatedAtKey(userId));
}
