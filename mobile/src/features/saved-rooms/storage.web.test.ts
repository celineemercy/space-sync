import type { Room } from "@/types/domain";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const room: Room = {
  id: "room-local-1",
  code: "LOCAL-1",
  name: "Persistent Room",
  location: "Library",
  capacity: 8,
  description: null,
  facilities: [],
};

const memoryStorage = new MemoryStorage();
const originalWindow = globalThis.window;

beforeEach(() => {
  memoryStorage.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: memoryStorage },
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

it("keeps CRUD data after the storage module is reloaded", async () => {
  const storage = jest.requireActual<
    typeof import("@/features/saved-rooms/storage.web")
  >("@/features/saved-rooms/storage.web");

  const created = await storage.insertSavedRoom({
    room,
    note: "Near the reference desk",
  });
  expect(created.roomId).toBe(room.id);
  expect(await storage.readSavedRooms()).toEqual([created]);

  jest.resetModules();
  const storageAfterRefresh = jest.requireActual<
    typeof import("@/features/saved-rooms/storage.web")
  >("@/features/saved-rooms/storage.web");
  expect(await storageAfterRefresh.readSavedRooms()).toEqual([created]);

  const updated = await storageAfterRefresh.updateSavedRoom({
    id: created.id,
    note: "Bring a display adapter",
  });
  expect(updated.note).toBe("Bring a display adapter");
  expect((await storageAfterRefresh.readSavedRooms())[0].note).toBe(
    "Bring a display adapter",
  );

  await storageAfterRefresh.removeSavedRoom(created.id);
  expect(await storageAfterRefresh.readSavedRooms()).toEqual([]);
});
