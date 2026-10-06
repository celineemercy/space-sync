import type {
  CreateSavedRoomInput,
  SavedRoom,
  UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";
import {
  insertSavedRoom,
  readSavedRooms,
  removeSavedRoom,
  updateSavedRoom,
} from "@/features/saved-rooms/storage";

export interface SavedRoomsRepository {
  list(): Promise<SavedRoom[]>;
  create(input: CreateSavedRoomInput): Promise<SavedRoom>;
  update(input: UpdateSavedRoomInput): Promise<SavedRoom>;
  delete(id: string): Promise<void>;
}

export const savedRoomsRepository: SavedRoomsRepository = {
  list: readSavedRooms,
  create: insertSavedRoom,
  update: updateSavedRoom,
  delete: removeSavedRoom,
};
