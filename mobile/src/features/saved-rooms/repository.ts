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
  list(userId: string): Promise<SavedRoom[]>;
  create(userId: string, input: CreateSavedRoomInput): Promise<SavedRoom>;
  update(userId: string, input: UpdateSavedRoomInput): Promise<SavedRoom>;
  delete(userId: string, id: string): Promise<void>;
}

export const savedRoomsRepository: SavedRoomsRepository = {
  list: readSavedRooms,
  create: insertSavedRoom,
  update: updateSavedRoom,
  delete: removeSavedRoom,
};
