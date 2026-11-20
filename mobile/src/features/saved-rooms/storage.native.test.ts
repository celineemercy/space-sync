import type { Room } from "@/types/domain";

type Statement = { all: (...params: unknown[]) => unknown[]; get: (...params: unknown[]) => unknown; run: (...params: unknown[]) => { changes: number } };
const { DatabaseSync } = jest.requireActual<{ DatabaseSync: new (path: string) => { exec: (sql: string) => void; prepare: (sql: string) => Statement; close: () => void } }>("node:sqlite");
const mockSqlite = new DatabaseSync(":memory:");
const mockDatabase = {
  execAsync: async (sql: string) => mockSqlite.exec(sql),
  getAllAsync: async (sql: string, ...params: unknown[]) => mockSqlite.prepare(sql).all(...params),
  getFirstAsync: async (sql: string, ...params: unknown[]) => mockSqlite.prepare(sql).get(...params),
  runAsync: async (sql: string, ...params: unknown[]) => mockSqlite.prepare(sql).run(...params),
};
jest.mock("expo-sqlite", () => ({ openDatabaseAsync: async () => mockDatabase }));
const room: Room = { id: "room-native", code: "N-1", name: "Native room", location: "Library", capacity: 6, description: null, facilities: [] };
afterAll(() => mockSqlite.close());

it("persists native SQLite notes through reload, isolates accounts, and removes notes with unsave", async () => {
  const storage = jest.requireActual<typeof import("./storage")>("./storage");
  await storage.insertSavedRoom("a", { room, note: "Original note" });
  await storage.insertSavedRoom("b", { room, note: "B private note" });
  await storage.updateSavedRoom("a", { id: room.id, note: "Edited note" });
  jest.resetModules();
  const reloaded = jest.requireActual<typeof import("./storage")>("./storage");
  expect((await reloaded.readSavedRooms("a"))[0].note).toBe("Edited note");
  expect((await reloaded.readSavedRooms("b"))[0].note).toBe("B private note");
  await reloaded.removeSavedRoom("a", room.id);
  expect(await reloaded.readSavedRooms("a")).toEqual([]);
  expect((await reloaded.readSavedRooms("b"))[0].note).toBe("B private note");
});

it("enforces the note length before writing to native storage", async () => {
  const { changeSavedRoomNote } = jest.requireActual<typeof import("./use-cases")>("./use-cases");
  expect(() => changeSavedRoomNote("b", { id: room.id, note: "x".repeat(201) })).toThrow("200 characters");
  await changeSavedRoomNote("b", { id: room.id, note: "x".repeat(200) });
  const storage = jest.requireActual<typeof import("./storage")>("./storage");
  expect((await storage.readSavedRooms("b"))[0].note).toHaveLength(200);
});
